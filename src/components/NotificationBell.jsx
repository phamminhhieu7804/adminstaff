import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useUI } from '../contexts/UIContext';
import { db } from '../lib/firebase';
import { Bell, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useStore } from '../StoreContext';

export default function NotificationBell({ setActiveTab, isMobile = false, onCountChange }) {
  const { storeId } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const { showToast } = useUI();
  const dropdownRef = useRef(null);
  
  // Track initial load to avoid toasting existing photos on mount
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (onCountChange) {
      onCountChange(requests.length);
    }
  }, [requests.length, onCountChange]);

  useEffect(() => {
    // Fetch pending leave_requests
    const qLeave = query(
      collection(db, 'stores', storeId, 'leave_requests'),
      where('status', '==', 'pending')
    );
    const unsubLeave = onSnapshot(qLeave, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, reqType: 'leave_requests', label: 'Xin nghỉ phép', ...d.data() }));
      setRequests(prev => {
        const filtered = prev.filter(r => r.reqType !== 'leave_requests');
        return [...filtered, ...docs].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      });
    });

    // Fetch pending advance_requests
    const qAdvance = query(
      collection(db, 'stores', storeId, 'advance_requests'),
      where('status', '==', 'pending')
    );
    const unsubAdvance = onSnapshot(qAdvance, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, reqType: 'advance_requests', label: 'Xin ứng tiền', ...d.data() }));
      setRequests(prev => {
        const filtered = prev.filter(r => r.reqType !== 'advance_requests');
        return [...filtered, ...docs].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      });
    });

    // Fetch locked employees who submitted an appeal
    const qLocked = query(
      collection(db, 'stores', storeId, 'employees'),
      where('unlockRequested', '==', true)
    );
    const unsubLocked = onSnapshot(qLocked, (snap) => {
      const docs = snap.docs.map(d => ({
        id: d.id,
        reqType: 'unlock_request',
        label: 'Yêu cầu mở khóa',
        employeeCode: d.id, // employeeCode is doc id
        fullName: d.data().fullName,
        appealNote: d.data().appealNote,
        createdAt: new Date().toISOString() // employees might not have createdAt, so use current for sorting
      }));
      setRequests(prev => {
        const filtered = prev.filter(r => r.reqType !== 'unlock_request');
        return [...filtered, ...docs].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      });
    });

    // Fetch pending checkout photos
    const qPhotos = query(
      collection(db, 'stores', storeId, 'checkout_photos'),
      where('status', '==', 'pending')
    );
    const unsubPhotos = onSnapshot(qPhotos, (snap) => {
      // Find new photos to show toast
      if (!isInitialLoad.current) {
        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
             const data = change.doc.data();
             showToast(`📸 Nhân viên ${data.employeeName} vừa gửi ảnh Check-out mới!`);
          }
        });
      }

      const docs = snap.docs.map(d => ({
        id: d.id,
        reqType: 'checkout_photo',
        label: 'Ảnh Check-out',
        employeeCode: d.data().employeeCode,
        fullName: d.data().employeeName,
        createdAt: d.data().createdAt || new Date().toISOString()
      }));
      setRequests(prev => {
        const filtered = prev.filter(r => r.reqType !== 'checkout_photo');
        return [...filtered, ...docs].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      });
      
      // Mark initial load as done after first run
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
      }
    });

    return () => {
      unsubLeave();
      unsubAdvance();
      unsubLocked();
      unsubPhotos();
    };
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = async (e, req, type) => {
    e.stopPropagation(); // Prevent navigating to requests tab
    try {
      if (req.reqType === 'unlock_request') {
        if (type === 'approved') {
          await updateDoc(doc(db, 'stores', storeId, 'employees', req.id), { isLocked: false });
          // Optional: Add notification
          await addDoc(collection(db, 'stores', storeId, 'notifications'), {
            employeeCode: req.employeeCode,
            type: 'unlock_approved',
            title: `Mở khóa tài khoản`,
            message: `Tài khoản của bạn đã được mở khóa.`,
            read: false,
            createdAt: new Date().toISOString(),
            timestamp: serverTimestamp()
          });
        }
        return; // Rejecting unlock request might just do nothing, or we just don't show the reject button
      }

      await updateDoc(doc(db, 'stores', storeId, req.reqType, req.id), { status: type });
      
      const reqName = req.reqType === 'leave_requests' ? 'Xin Nghỉ Phép' : 'Xin Ứng Tiền';
      const statusName = type === 'approved' ? 'được duyệt' : 'bị từ chối';
      
      await addDoc(collection(db, 'stores', storeId, 'notifications'), {
        employeeCode: req.employeeCode,
        type: type === 'approved' ? 'request_approved' : 'request_rejected',
        title: `Đơn ${reqName} ${statusName}`,
        message: `Đơn ${reqName} của bạn đã ${statusName}.`,
        read: false,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      });
      showToast('Cập nhật trạng thái thành công!');
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("Cập nhật trạng thái thất bại.", "error");
    }
  };

  const handleNavigate = (reqType) => {
    if (reqType === 'unlock_request') {
       setActiveTab('employees');
    } else {
       setActiveTab('requests');
    }
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", isMobile ? "mr-2" : "fixed top-5 right-8 z-50")} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2.5 rounded-full transition-all flex items-center justify-center",
          isMobile 
            ? "text-gray-600 hover:bg-gray-100" 
            : "bg-white text-gray-700 shadow-md border border-gray-200 hover:bg-gray-50 hover:shadow-lg"
        )}
      >
        <Bell className={cn("w-5 h-5", requests.length > 0 && !isMobile ? "animate-pulse text-blue-600" : "")} />
        {requests.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
            {requests.length > 99 ? '99+' : requests.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={cn(
          "absolute mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col z-50",
          isMobile ? "right-0 w-80 origin-top-right" : "right-0 w-96 origin-top-right"
        )}>
          <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              Thông báo <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{requests.length}</span>
            </h3>
            <button onClick={() => handleNavigate('requests')} className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">
              Xem tất cả
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {requests.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm">Không có thông báo nào.</p>
              </div>
            ) : (
                <div className="max-h-96 overflow-y-auto">
                  {requests.map(req => (
                    <div 
                      key={req.id + req.reqType} 
                      className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        setIsOpen(false);
                        if (req.reqType === 'unlock_request') {
                          setActiveTab('employees');
                        } else if (req.reqType === 'checkout_photo') {
                          setActiveTab('photos');
                        } else {
                          setActiveTab('requests');
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-blue-600">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm font-semibold">{req.label}</span>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(req.createdAt || new Date()), { addSuffix: true, locale: vi })}
                        </span>
                      </div>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                           {req.reqType === 'leave_requests' 
                             ? `Xin nghỉ ${req.days} ngày. Lý do: ${req.reason}`
                             : req.reqType === 'advance_requests'
                             ? `Xin ứng ${new Intl.NumberFormat('vi-VN').format(req.amount)}đ. Lý do: ${req.reason}`
                             : req.reqType === 'unlock_request'
                             ? `Lý do khiếu nại: ${req.appealNote || 'Không có ghi chú'}`
                             : `Nhân viên ${req.fullName} vừa check-out.`
                           }
                        </p>
                      
                      {/* Action buttons (only for non-photo requests in bell, photos handled in PhotosTab) */}
                      {req.reqType !== 'checkout_photo' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => handleAction(e, req, 'approved')}
                            className="flex-1 flex items-center justify-center gap-1 bg-green-50 text-green-700 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-100 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" /> {req.reqType === 'unlock_request' ? 'Mở khóa ngay' : 'Duyệt'}
                          </button>
                          {req.reqType !== 'unlock_request' && (
                            <button
                              onClick={(e) => handleAction(e, req, 'rejected')}
                              className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-700 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors"
                            >
                              <XCircle className="w-4 h-4" /> Từ chối
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

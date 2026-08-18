import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { useUI } from '../contexts/UIContext';
import { db } from '../lib/firebase';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '../StoreContext';

export default function RequestsTab() {
  const { storeId } = useStore();
  const [activeSubTab, setActiveSubTab] = useState('leave'); // 'leave' or 'advance'
  const [leaveReqs, setLeaveReqs] = useState([]);
  const [advanceReqs, setAdvanceReqs] = useState([]);
  const [unlockReqs, setUnlockReqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionModal, setActionModal] = useState({ show: false, type: '', req: null, reqType: '' });
  const [adminNote, setAdminNote] = useState('');
  
  const { showToast } = useUI();
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const leaveSnap = await getDocs(query(collection(db, 'stores', storeId, 'leave_requests'), orderBy('createdAt', 'desc')));
      setLeaveReqs(leaveSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const advanceSnap = await getDocs(query(collection(db, 'stores', storeId, 'advance_requests'), orderBy('createdAt', 'desc')));
      setAdvanceReqs(advanceSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const unlockSnap = await getDocs(query(collection(db, 'stores', storeId, 'employees'), where('unlockRequested', '==', true)));
      setUnlockReqs(unlockSnap.docs.map(d => ({ id: d.id, ...d.data(), reqType: 'employees' })));
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const openActionModal = (collectionName, req, type) => {
    setActionModal({ show: true, type, req: req, reqType: collectionName });
    setAdminNote('');
  };

  const confirmAction = async () => {
    try {
      if (actionModal.reqType === 'employees') {
        if (actionModal.type === 'approved') {
          await updateDoc(doc(db, 'stores', storeId, 'employees', actionModal.req.id), { isLocked: false, unlockRequested: false, adminReply: null });
          await addDoc(collection(db, 'stores', storeId, 'notifications'), {
            employeeCode: actionModal.req.employeeCode,
            type: 'unlock_approved',
            title: `Mở khóa tài khoản`,
            message: `Tài khoản của bạn đã được mở khóa. ${adminNote ? `Quản lý nhắn: "${adminNote}"` : ''}`,
            read: false,
            createdAt: new Date().toISOString(),
            timestamp: serverTimestamp()
          });
        } else if (actionModal.type === 'rejected') {
          await updateDoc(doc(db, 'stores', storeId, 'employees', actionModal.req.id), { unlockRequested: false, adminReply: adminNote });
        }
      } else {
        await updateDoc(doc(db, actionModal.reqType, actionModal.req.id), { 
          status: actionModal.type,
          adminNote: adminNote 
        });
        
        const reqName = actionModal.reqType === 'leave_requests' ? 'Xin Nghỉ Phép' : 'Xin Ứng Tiền';
        const statusName = actionModal.type === 'approved' ? 'được duyệt' : 'bị từ chối';
        
        await addDoc(collection(db, 'stores', storeId, 'notifications'), {
          employeeCode: actionModal.req.employeeCode,
          type: actionModal.type === 'approved' ? 'request_approved' : 'request_rejected',
          title: `Đơn ${reqName} ${statusName}`,
          message: `Đơn ${reqName} của bạn đã ${statusName}. ${adminNote ? `Quản lý nhắn: "${adminNote}"` : ''}`,
          read: false,
          createdAt: new Date().toISOString(),
          timestamp: serverTimestamp()
        });
      }

      fetchRequests();
      setActionModal({ show: false, type: '', req: null, reqType: '' });
      showToast('Cập nhật trạng thái thành công!');
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("Cập nhật trạng thái thất bại.", "error");
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'approved') return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Đã duyệt</span>;
    if (status === 'rejected') return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Từ chối</span>;
    return <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">Chờ duyệt</span>;
  };

  const filteredLeave = leaveReqs.filter(r => !dateFilter || (r.createdAt && r.createdAt.startsWith(dateFilter)));
  const filteredAdvance = advanceReqs.filter(r => !dateFilter || (r.createdAt && r.createdAt.startsWith(dateFilter)));

  const pendingLeave = filteredLeave.filter(r => r.status === 'pending').length;
  const pendingAdvance = filteredAdvance.filter(r => r.status === 'pending').length;

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Quản Lý Yêu Cầu</h2>
        <p className="text-gray-500 mt-1">Duyệt đơn xin nghỉ phép và ứng tiền của nhân viên.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="w-full md:w-64 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="date"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        
        {dateFilter && (
          <button 
            onClick={() => setDateFilter('')}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

        <div className="flex bg-white rounded-xl border border-gray-200 p-1 mb-6 max-w-xl">
          <button
            onClick={() => setActiveSubTab('leave')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
              activeSubTab === 'leave' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4" /> Nghỉ phép
            {pendingLeave > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeSubTab === 'leave' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                {pendingLeave}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('advance')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
              activeSubTab === 'advance' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4" /> Ứng tiền
            {pendingAdvance > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeSubTab === 'advance' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                {pendingAdvance}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('unlock')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
              activeSubTab === 'unlock' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4" /> Mở khóa
            {unlockReqs.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeSubTab === 'unlock' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                {unlockReqs.length}
              </span>
            )}
          </button>
        </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-auto h-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thông tin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lý do</th>
                  {activeSubTab !== 'unlock' && <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={activeSubTab === 'unlock' ? "4" : "5"} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : (activeSubTab === 'leave' ? filteredLeave : activeSubTab === 'advance' ? filteredAdvance : unlockReqs).length === 0 ? (
                  <tr>
                    <td colSpan={activeSubTab === 'unlock' ? "4" : "5"} className="px-6 py-12 text-center text-gray-500">
                      Không tìm thấy dữ liệu phù hợp.
                    </td>
                  </tr>
                ) : (activeSubTab === 'leave' ? filteredLeave : activeSubTab === 'advance' ? filteredAdvance : unlockReqs).map(req => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs mr-3">
                          {req.employeeName ? req.employeeName.charAt(0) : req.fullName?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{req.employeeName || req.fullName}</div>
                          <div className="text-xs text-gray-500">{req.employeeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">
                        {activeSubTab === 'leave' ? `${req.days} ngày` : 
                         activeSubTab === 'advance' ? `${new Intl.NumberFormat('vi-VN').format(req.amount)} ₫` : 
                         'Yêu cầu mở khóa'}
                      </div>
                      {req.createdAt && <div className="text-xs text-gray-500 mt-1">{format(new Date(req.createdAt), 'dd/MM/yyyy HH:mm')}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 line-clamp-2 max-w-xs">{req.reason || req.appealNote}</p>
                    </td>
                    {activeSubTab !== 'unlock' && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(req.status)}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {(req.status === 'pending' || activeSubTab === 'unlock') && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openActionModal(activeSubTab === 'leave' ? 'leave_requests' : activeSubTab === 'advance' ? 'advance_requests' : 'employees', req, 'approved')}
                            className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-1"
                            title="Duyệt"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-xs font-medium">{activeSubTab === 'unlock' ? 'Mở khóa' : 'Duyệt'}</span>
                          </button>
                          
                          <button
                            onClick={() => openActionModal(activeSubTab === 'leave' ? 'leave_requests' : activeSubTab === 'advance' ? 'advance_requests' : 'employees', req, 'rejected')}
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                            title="Từ chối"
                          >
                            <XCircle className="w-4 h-4" />
                            <span className="text-xs font-medium">Từ chối</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {actionModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Xác nhận {actionModal.type === 'approved' ? 'duyệt' : 'từ chối'} yêu cầu?
              </h3>
              <p className="text-sm text-gray-500 mb-4">Hành động này sẽ thông báo đến nhân viên.</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (Không bắt buộc)</label>
                <textarea 
                  value={adminNote} 
                  onChange={e => setAdminNote(e.target.value)} 
                  rows="3" 
                  placeholder="VD: Cố gắng sắp xếp công việc..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setActionModal({ show: false, type: '', req: null, reqType: '' })}
                  className="px-4 py-2 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmAction}
                  className={`px-4 py-2 text-white font-medium rounded-lg transition-colors ${actionModal.type === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useUI } from '../contexts/UIContext';
import { db } from '../lib/firebase';
import { Camera, CheckCircle2, XCircle, Search, Clock, Image as ImageIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { useStore } from '../StoreContext';

export default function PhotosTab() {
  const { storeId } = useStore();
  const { showToast, showConfirm } = useUI();
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected
  const [actionModal, setActionModal] = useState({ show: false, type: '', photo: null });
  const [adminNote, setAdminNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [galleryModal, setGalleryModal] = useState({ show: false, photos: [], currentIndex: 0 });

  useEffect(() => {
    if (!storeId) return;

    const q = query(
      collection(db, 'stores', storeId, 'checkout_photos')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allPhotos = [];
      const now = new Date();
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Auto-cleanup photos older than 7 days
        const createdAt = data.createdAt ? new Date(data.createdAt) : now;
        if (differenceInDays(now, createdAt) > 7) {
          // Delete old records in the background
          deleteDoc(doc(db, 'stores', storeId, 'checkout_photos', docSnap.id)).catch(console.error);
        } else {
          allPhotos.push({ id: docSnap.id, ...data, createdAt });
        }
      });
      
      allPhotos.sort((a, b) => b.createdAt - a.createdAt);
      setPhotos(allPhotos);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [storeId]);

  const handleAction = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { type, photo } = actionModal;
      const statusName = type === 'approved' ? 'đã được Duyệt' : 'đã bị Từ chối';

      // 1. Update photo status
      await updateDoc(doc(db, 'stores', storeId, 'checkout_photos', photo.id), {
        status: type,
        adminNote: adminNote || '',
        updatedAt: new Date().toISOString()
      });

      // 2. Send notification to staff
      await addDoc(collection(db, 'stores', storeId, 'notifications'), {
        employeeCode: photo.employeeCode,
        type: type === 'approved' ? 'photo_approved' : 'photo_rejected',
        title: `Ảnh Checkout ${statusName}`,
        message: `Ảnh checkout ca ${photo.shiftName || ''} của bạn ${statusName}.${adminNote ? ` Quản lý nhắn: "${adminNote}"` : ''}`,
        read: false,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
        storeId
      });

      showToast(`Đã ${type === 'approved' ? 'duyệt' : 'từ chối'} ảnh checkout!`);
      setActionModal({ show: false, type: '', photo: null });
      setAdminNote('');
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi xử lý.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPhotos = photos.filter(p => p.status === filter);

  const pendingCount = photos.filter(p => p.status === 'pending').length;

  const openGallery = (photoUrls, startIndex = 0) => {
    setGalleryModal({ show: true, photos: photoUrls, currentIndex: startIndex });
  };

  const closeGallery = () => {
    setGalleryModal({ show: false, photos: [], currentIndex: 0 });
  };

  const nextPhoto = () => {
    setGalleryModal(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.photos.length
    }));
  };

  const prevPhoto = () => {
    setGalleryModal(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.photos.length) % prev.photos.length
    }));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Camera className="w-6 h-6 text-blue-600" />
            Duyệt ảnh Check-out
          </h2>
          <p className="text-sm text-gray-500 mt-1">Ảnh tự động xóa sau 7 ngày lưu trữ.</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setFilter('pending')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all relative",
            filter === 'pending' ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          )}
        >
          Đang chờ duyệt
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all",
            filter === 'approved' ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          )}
        >
          Đã duyệt
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all",
            filter === 'rejected' ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          )}
        >
          Đã từ chối
        </button>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center flex flex-col items-center justify-center">
          <ImageIcon className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Không có ảnh nào</h3>
          <p className="text-gray-500 mt-1">
            {filter === 'pending' ? 'Chưa có hình ảnh checkout nào cần duyệt.' : 'Không có dữ liệu cho trạng thái này.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPhotos.map((photo) => {
            const urls = photo.photoUrls || [photo.photoUrl];
            const photoCount = urls.length;
            
            return (
              <div key={photo.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                <div 
                  className="relative h-64 bg-gray-100 group cursor-pointer"
                  onClick={() => openGallery(urls, 0)}
                >
                  <img 
                    src={photo.photoUrl} 
                    alt="Checkout" 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Photo count badge */}
                  {photoCount > 1 && (
                    <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 backdrop-blur-sm">
                      <ImageIcon className="w-4 h-4" />
                      {photoCount} ảnh
                    </div>
                  )}
                  {/* Thumbnail strip for multiple photos */}
                  {photoCount > 1 && (
                    <div className="absolute bottom-3 right-3 flex gap-1">
                      {urls.slice(1, 4).map((url, idx) => (
                        <div key={idx} className="w-10 h-10 rounded-md overflow-hidden border-2 border-white/80 shadow-sm">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {photoCount > 4 && (
                        <div className="w-10 h-10 rounded-md bg-black/60 border-2 border-white/80 flex items-center justify-center text-white text-xs font-bold">
                          +{photoCount - 4}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    {photo.status === 'pending' && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-lg shadow-sm">Chờ duyệt</span>}
                    {photo.status === 'approved' && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-lg shadow-sm">Đã duyệt</span>}
                    {photo.status === 'rejected' && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-lg shadow-sm">Từ chối</span>}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">{photo.employeeName}</h3>
                  <div className="text-sm text-gray-500 space-y-1 mb-4 flex-1">
                    <p>Mã NV: {photo.employeeCode}</p>
                    <p>Ca làm: {photo.shiftName || 'Không xác định'}</p>
                    <p className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {format(photo.createdAt, 'HH:mm dd/MM', { locale: vi })}</p>
                    {photo.adminNote && (
                      <p className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-700 italic">
                        " {photo.adminNote} "
                      </p>
                    )}
                  </div>
                  
                  {filter === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button
                        onClick={() => {
                          setActionModal({ show: true, type: 'rejected', photo });
                          setAdminNote('');
                        }}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Từ chối
                      </button>
                      <button
                        onClick={() => {
                          setActionModal({ show: true, type: 'approved', photo });
                          setAdminNote('');
                        }}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg font-medium transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Duyệt ảnh
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Modal */}
      {actionModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className={cn(
              "flex justify-between items-center p-4 border-b border-gray-200",
              actionModal.type === 'approved' ? "bg-green-50" : "bg-red-50"
            )}>
              <h3 className={cn(
                "text-lg font-bold flex items-center gap-2",
                actionModal.type === 'approved' ? "text-green-700" : "text-red-700"
              )}>
                {actionModal.type === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                {actionModal.type === 'approved' ? 'Duyệt Ảnh' : 'Từ Chối Ảnh'}
              </h3>
              <button 
                onClick={() => setActionModal({ show: false, type: '', photo: null })}
                className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded border shadow-sm"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAction} className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Bạn đang {actionModal.type === 'approved' ? 'duyệt' : 'từ chối'} ảnh check-out của nhân viên <span className="font-bold text-gray-900">{actionModal.photo?.employeeName}</span>.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú cho nhân viên {actionModal.type === 'rejected' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  required={actionModal.type === 'rejected'}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder={actionModal.type === 'approved' ? "Tốt lắm..." : "Ảnh mờ quá, chụp lại nhé..."}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActionModal({ show: false, type: '', photo: null })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (actionModal.type === 'rejected' && !adminNote.trim())}
                  className={cn(
                    "px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center justify-center min-w-[100px] disabled:opacity-50",
                    actionModal.type === 'approved' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                  )}
                >
                  {isSubmitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Gallery Modal */}
      {galleryModal.show && galleryModal.photos.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <button
            onClick={closeGallery}
            className="absolute top-4 right-4 z-10 text-white/80 hover:text-white p-2 bg-black/40 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
            {galleryModal.currentIndex + 1} / {galleryModal.photos.length}
          </div>

          {galleryModal.photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 z-10 text-white/80 hover:text-white p-3 bg-black/40 rounded-full"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 z-10 text-white/80 hover:text-white p-3 bg-black/40 rounded-full"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <img 
            src={galleryModal.photos[galleryModal.currentIndex]} 
            alt={`Ảnh ${galleryModal.currentIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />

          {/* Thumbnail strip */}
          {galleryModal.photos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-2 rounded-xl backdrop-blur-sm">
              {galleryModal.photos.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setGalleryModal(prev => ({ ...prev, currentIndex: idx }))}
                  className={cn(
                    "w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0",
                    idx === galleryModal.currentIndex ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

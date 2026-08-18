import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../StoreContext';
import { useUI } from '../contexts/UIContext';
import { Plus, Edit2, Trash2, Loader2, QrCode, Receipt } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import TableReceiptModal from './TableReceiptModal';

export default function TablesTab() {
  const { storeId } = useStore();
  const { showToast, showConfirm } = useUI();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '' });
  const [qrModal, setQrModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);

  useEffect(() => {
    if (!storeId) return;
    const q = query(collection(db, 'stores', storeId, 'tables'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      setTables(data);
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await updateDoc(doc(db, 'stores', storeId, 'tables', formData.id), { name: formData.name });
        showToast('Cập nhật bàn thành công!');
      } else {
        await addDoc(collection(db, 'stores', storeId, 'tables'), {
          name: formData.name,
          status: 'empty',
          orders: []
        });
        showToast('Thêm bàn mới thành công!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu thông tin!', 'error');
    }
  };

  const handleDelete = (id) => {
    showConfirm('Xóa bàn', 'Bạn có chắc chắn muốn xóa bàn này không?', async () => {
      try {
        await deleteDoc(doc(db, 'stores', storeId, 'tables', id));
        showToast('Xóa thành công!');
      } catch (err) {
        showToast('Lỗi khi xóa!', 'error');
      }
    });
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Bàn</h2>
        <button
          onClick={() => { setFormData({ id: '', name: '' }); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" /> Thêm bàn
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map(table => (
          <div key={table.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center gap-3 shadow-sm hover:border-blue-300 transition-colors">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-xl font-black ${table.status === 'empty' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700 ring-4 ring-green-50'}`}>
              {table.name}
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${table.status === 'empty' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
              {table.status === 'empty' ? 'Trống' : 'Đang phục vụ'}
            </span>
            <div className="flex gap-2 mt-2 w-full">
              {table.status !== 'empty' && (
                <button onClick={() => setReceiptModal(table)} className="p-2 text-green-600 hover:bg-green-50 hover:text-green-700 rounded-lg flex-1 flex justify-center transition-colors" title="Chi tiết Hóa đơn & Giảm giá">
                  <Receipt className="w-5 h-5" />
                </button>
              )}
              <button onClick={() => setQrModal(table)} className="p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg flex-1 flex justify-center transition-colors" title="Mã QR gọi món">
                <QrCode className="w-5 h-5" />
              </button>
              <button onClick={() => { setFormData(table); setIsModalOpen(true); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg flex-1 flex justify-center transition-colors" title="Chỉnh sửa">
                <Edit2 className="w-5 h-5" />
              </button>
              <button onClick={() => handleDelete(table.id)} className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg flex-1 flex justify-center transition-colors" title="Xóa bàn">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {tables.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 bg-gray-50 border border-gray-200 border-dashed rounded-xl">
            <p>Chưa có bàn nào. Hãy thêm bàn mới.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4 text-gray-900">{formData.id ? 'Đổi tên bàn' : 'Thêm bàn mới'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên bàn</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: Bàn 1" />
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Hủy</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-gray-900 mb-6">{qrModal.name}</h3>
            <div className="bg-white p-4 rounded-2xl border-4 border-blue-50 shadow-md mb-6 inline-block">
              <QRCodeSVG value={`${window.location.origin.replace(window.location.port, '5175')}/${storeId}/${qrModal.id}`} size={220} level="H" includeMargin={true} />
            </div>
            <p className="text-xs text-center text-gray-500 font-medium break-all w-full mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
              Nhấn vào link bên dưới để test thử: <br />
              <a href={`http://localhost:5176/${storeId}/${qrModal.id}`} target="_blank" rel="noreferrer" className="text-blue-600 font-mono mt-1 block hover:underline">
                http://localhost:5176/{storeId}/{qrModal.id}
              </a>
            </p>
            <button onClick={() => setQrModal(null)} className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors">Đóng lại</button>
          </div>
        </div>
      )}
      {receiptModal && (
        <TableReceiptModal
          table={receiptModal}
          storeId={storeId}
          db={db}
          onClose={() => setReceiptModal(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

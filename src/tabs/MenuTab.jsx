import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../StoreContext';
import { useUI } from '../contexts/UIContext';
import { cn } from '../lib/utils';
import { Plus, Edit2, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function MenuTab() {
  const { storeId } = useStore();
  const { showToast, showConfirm } = useUI();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', price: '', category: '', photoUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const existingCategories = Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)));

  useEffect(() => {
    if (!storeId) return;
    const q = query(collection(db, 'stores', storeId, 'menu_items'));
    const unsub = onSnapshot(q, (snap) => {
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      // Demo unsigned Cloudinary upload
      const formData = new FormData();
      formData.append('file', file);
      // NOTE: Using a public test preset, normally replace this with real ones
      formData.append('upload_preset', 'ml_default'); 
      const res = await fetch(`https://api.cloudinary.com/v1_1/demo/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, photoUrl: data.secure_url }));
        showToast('Tải ảnh lên thành công!');
      } else {
        // Fallback for demo preset failing
        setFormData(prev => ({ ...prev, photoUrl: 'https://via.placeholder.com/300?text=Uploaded+Image' }));
        showToast('Đã dùng ảnh mẫu (Cloudinary demo có thể bị lỗi CORS/giới hạn).', 'info');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tải ảnh lên!', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        price: Number(formData.price),
        category: formData.category,
        photoUrl: formData.photoUrl
      };
      
      if (formData.id) {
        await updateDoc(doc(db, 'stores', storeId, 'menu_items', formData.id), data);
        showToast('Cập nhật món thành công!');
      } else {
        await addDoc(collection(db, 'stores', storeId, 'menu_items'), data);
        showToast('Thêm món mới thành công!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu thông tin!', 'error');
    }
  };

  const handleDelete = (id) => {
    showConfirm('Xóa món', 'Bạn có chắc chắn muốn xóa món này không?', async () => {
      try {
        await deleteDoc(doc(db, 'stores', storeId, 'menu_items', id));
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
        <h2 className="text-2xl font-bold text-gray-800">Quản lý Thực đơn</h2>
        <button
          onClick={() => { setFormData({ id: '', name: '', price: '', category: existingCategories[0] || '', photoUrl: '' }); setShowNewCategory(existingCategories.length === 0); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" /> Thêm món
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
        {menuItems.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col group">
            {item.photoUrl ? (
              <img src={item.photoUrl} alt={item.name} className="w-full h-32 md:h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="w-full h-32 md:h-48 bg-gray-50 flex items-center justify-center text-gray-300 group-hover:scale-105 transition-transform duration-300">
                <ImageIcon className="w-8 h-8 md:w-12 md:h-12" />
              </div>
            )}
            <div className="p-3 md:p-4 flex flex-col flex-1 bg-white relative z-10">
              <h3 className="font-bold text-sm md:text-lg text-gray-900 line-clamp-2 leading-tight mb-1">{item.name}</h3>
              <p className="text-blue-600 font-black text-sm md:text-lg mb-1">{new Intl.NumberFormat('vi-VN').format(item.price)}đ</p>
              <p className="text-[10px] md:text-sm text-gray-500 bg-gray-100 px-1.5 py-0.5 md:px-2 md:py-1 rounded w-fit mb-3 truncate max-w-full">{item.category}</p>
              <div className="flex justify-between md:justify-end gap-1 md:gap-2 mt-auto pt-2 md:pt-4 border-t border-gray-100">
                <button
                  onClick={() => { setFormData(item); setShowNewCategory(false); setIsModalOpen(true); }}
                  className="flex-1 md:flex-none justify-center px-2 md:px-3 py-1.5 md:py-1.5 text-[11px] md:text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Sửa</span>
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-1 md:flex-none justify-center px-2 md:px-3 py-1.5 md:py-1.5 text-[11px] md:text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> <span className="hidden sm:inline">Xóa</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        {menuItems.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 bg-gray-50 border border-gray-200 border-dashed rounded-xl">
            <ImageIcon className="w-12 h-12 text-gray-300 mb-3" />
            <p>Chưa có món nào trong thực đơn.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4 text-gray-900">{formData.id ? 'Sửa món ăn' : 'Thêm món mới'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên món</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: Trà đào cam sả" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá (VNĐ)</label>
                  <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: 35000" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {existingCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => { setFormData({...formData, category: cat}); setShowNewCategory(false); }}
                        className={cn("px-3 py-1.5 text-xs md:text-sm font-medium rounded-full border transition-colors", formData.category === cat && !showNewCategory ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50")}
                      >
                        {cat}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => { setShowNewCategory(true); setFormData({...formData, category: ''}); }}
                      className={cn("px-3 py-1.5 text-xs md:text-sm font-medium rounded-full border transition-colors flex items-center gap-1", showNewCategory ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100")}
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm mới
                    </button>
                  </div>
                  {(showNewCategory || existingCategories.length === 0) && (
                    <input 
                      required 
                      type="text" 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none animate-in fade-in slide-in-from-top-2 text-sm" 
                      placeholder="Nhập tên danh mục mới..." 
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh minh họa</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer" />
                {uploading && <div className="flex items-center gap-2 mt-2 text-sm text-blue-600 font-medium"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải ảnh...</div>}
                {formData.photoUrl && !uploading && <img src={formData.photoUrl} alt="Preview" className="h-32 mt-3 rounded-lg object-cover border border-gray-200 shadow-sm" />}
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Hủy</button>
                <button type="submit" disabled={uploading} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">Xác nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

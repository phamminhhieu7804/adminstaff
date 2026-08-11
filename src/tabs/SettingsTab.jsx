import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Store, MapPin, Save, AlertCircle, CheckCircle2, Navigation, Wallet, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../StoreContext';

export default function SettingsTab() {
  const { storeId, storeData } = useStore();
  const isPro = storeData?.packageType === 'Pro';
  const [settings, setSettings] = useState({
    storeName: '',
    targetLat: '',
    targetLng: '',
    allowedRadiusMeters: 50,
    allowCheckInBeforeMinutes: 10,
    payday: 5,
    maxAdvancePercent: 40,
    minAdvanceDays: 5,
    requireCheckoutPhoto: false,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!storeId) return;
      try {
        const docRef = doc(db, 'store_settings', storeId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        } else {
          // Initialize if not exists
          await setDoc(docRef, settings);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        setMessage({ type: 'error', text: 'Không thể tải cấu hình cửa hàng. Vui lòng kiểm tra lại kết nối.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value === '' ? '' : Number(value)) : value)
    }));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Trình duyệt của bạn không hỗ trợ định vị GPS.' });
      return;
    }
    
    setMessage({ type: '', text: '' }); // Clear old messages
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSettings(prev => ({
          ...prev,
          targetLat: position.coords.latitude.toString(),
          targetLng: position.coords.longitude.toString(),
          allowedRadiusMeters: 20
        }));
        setMessage({ type: 'success', text: 'Đã cập nhật vị trí hiện tại và sai số thành 20m.' });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      },
      (error) => {
        console.error("Lỗi GPS:", error);
        if (error.code === 1) {
          setMessage({ type: 'error', text: 'Vui lòng cấp quyền truy cập vị trí cho trình duyệt.' });
        } else {
          setMessage({ type: 'error', text: 'Không thể lấy vị trí hiện tại. Vui lòng thử lại.' });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!storeId) return;
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const docRef = doc(db, 'store_settings', storeId);
      await setDoc(docRef, settings, { merge: true });
      setMessage({ type: 'success', text: 'Lưu cấu hình thành công!' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: 'error', text: 'Đã xảy ra lỗi khi lưu cấu hình.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Cấu Hình Cửa Hàng</h2>
        <p className="text-gray-500 mt-1">Cập nhật thông tin cửa hàng, Wi-Fi và tọa độ định vị để nhân viên chấm công.</p>
      </div>

      {message.text && (
        <div className={cn(
          "p-4 mb-6 rounded-lg flex items-center gap-3",
          message.type === 'success' ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-medium">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Settings */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <div className="flex items-center gap-2 mb-4 text-blue-700">
            <Store className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Thông tin chung</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên cửa hàng / Quán</label>
              <input
                type="text"
                name="storeName"
                value={settings.storeName}
                onChange={handleChange}
                placeholder="VD: Cà Phê Mộc"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>


        {/* GPS Settings */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 text-blue-700">
              <MapPin className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Cấu hình Vị trí GPS</h3>
            </div>
            
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Lấy vị trí hiện tại
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vĩ độ (Latitude)</label>
              <input
                type="text"
                name="targetLat"
                value={settings.targetLat}
                onChange={handleChange}
                placeholder="VD: 10.762622"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kinh độ (Longitude)</label>
              <input
                type="text"
                name="targetLng"
                value={settings.targetLng}
                onChange={handleChange}
                placeholder="VD: 106.660172"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bán kính cho phép (m)</label>
              <input
                type="number"
                name="allowedRadiusMeters"
                value={settings.allowedRadiusMeters}
                onChange={handleChange}
                min="10"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mở khóa điểm danh trước ca làm (phút)</label>
              <input
                type="number"
                name="allowCheckInBeforeMinutes"
                value={settings.allowCheckInBeforeMinutes}
                onChange={handleChange}
                min="0"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-900">Cho phép nhân viên chụp ảnh quán khi checkout</label>
                <p className="text-xs text-gray-500 mt-1">Bắt buộc nhân viên gửi ảnh xác nhận trước khi check-out.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  name="requireCheckoutPhoto"
                  checked={!!settings.requireCheckoutPhoto} 
                  onChange={handleChange}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Payroll & Requests Settings */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 relative">
          {!isPro && (
            <div className="absolute inset-0 bg-gray-100/70 backdrop-blur-[1px] z-10 rounded-xl flex flex-col items-center justify-center gap-2 cursor-not-allowed">
              <Lock className="w-8 h-8 text-gray-400" />
              <p className="text-sm font-bold text-gray-500">Tính năng Pro</p>
              <p className="text-xs text-gray-400">Nâng cấp gói Pro để sử dụng</p>
            </div>
          )}
          <div className="flex items-center gap-2 mb-4 text-blue-700">
            <Wallet className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Cấu hình Lương & Ứng tiền</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày nhận lương hàng tháng (Payday)</label>
              <input
                type="number"
                name="payday"
                value={settings.payday}
                onChange={handleChange}
                min="1"
                max="31"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">Giao diện chốt lương sẽ xuất hiện vào ngày này.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phần trăm lương được phép ứng (%)</label>
              <div className="relative">
                <input
                  type="number"
                  name="maxAdvancePercent"
                  value={settings.maxAdvancePercent}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-12"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 font-medium">
                  %
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Hạn mức ứng = (Tổng lương đã làm) x (%)</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Số ngày làm tối thiểu để được ứng tiền</label>
              <input
                type="number"
                name="minAdvanceDays"
                value={settings.minAdvanceDays}
                onChange={handleChange}
                min="0"
                max="31"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">Nếu nhân viên chưa làm đủ số ngày này trong tháng, họ sẽ không thể gửi yêu cầu ứng tiền.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
          </button>
        </div>
      </form>
    </div>
  );
}

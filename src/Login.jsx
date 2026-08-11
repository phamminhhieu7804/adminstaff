import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Store, ArrowRight, Lock, Phone, Mail, PackageSearch, MessageCircle } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [packages, setPackages] = useState([]);
  const [contactInfo, setContactInfo] = useState(null);
  const [showPackages, setShowPackages] = useState(false);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const pSnap = await getDocs(collection(db, 'subscription_packages'));
        setPackages(pSnap.docs.map(d => ({id: d.id, ...d.data()})));
        const cSnap = await getDoc(doc(db, 'system_settings', 'contact_info'));
        if (cSnap.exists()) setContactInfo(cSnap.data());
      } catch (e) {}
    };
    fetchInfo();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const q = query(
        collection(db, 'stores'), 
        where('username', '==', username),
        where('password', '==', password)
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setError('Tài khoản hoặc mật khẩu không chính xác.');
      } else {
        const storeDoc = snap.docs[0];
        const storeData = { id: storeDoc.id, ...storeDoc.data() };
        onLogin(storeData);
      }
    } catch (err) {
      setError('Đã xảy ra lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <Store className="w-8 h-8 text-white" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Đăng nhập Quản lý
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Dành cho chủ cửa hàng
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tên đăng nhập</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Nhập tên đăng nhập..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl text-center font-medium border border-red-100">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Đang xử lý...' : (
                   <>Đăng Nhập <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 pb-6 border-b border-gray-100">
            <Lock className="w-4 h-4" /> Bảo mật thông tin an toàn
          </div>
          
          {/* Contact and Pricing info */}
          <div className="mt-6">
             <button 
                type="button"
                onClick={() => setShowPackages(!showPackages)}
                className="w-full text-sm font-bold text-gray-900 mb-4 text-center hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
             >
                Bảng giá Gói cước Phần mềm
                <svg className={`w-4 h-4 transition-transform ${showPackages ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
             </button>
             
             {showPackages && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                   {packages.map(pkg => (
                      <div key={pkg.id} className="border border-blue-100 bg-blue-50/50 rounded-xl p-3 text-center">
                         <p className="font-bold text-gray-900 text-sm mb-1">{pkg.name}</p>
                         <p className="text-xs text-gray-500 mb-1">
                            {pkg.durationValue || pkg.durationDays} {(pkg.durationUnit || 'days') === 'days' ? 'ngày' : pkg.durationUnit === 'hours' ? 'giờ' : 'phút'}
                         </p>
                         <p className="font-black text-blue-600 text-sm">{new Intl.NumberFormat('vi-VN').format(pkg.price)}đ</p>
                      </div>
                   ))}
                </div>
             )}
             
             {contactInfo && (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                   <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Liên hệ Hỗ trợ & Gia hạn</p>
                   <div className="flex flex-col gap-2 text-sm">
                      {contactInfo.phone && <a href={`tel:${contactInfo.phone}`} className="flex items-center justify-center gap-2 text-gray-700 hover:text-blue-600 font-bold"><Phone className="w-4 h-4"/> {contactInfo.phone}</a>}
                      {contactInfo.email && <a href={`mailto:${contactInfo.email}`} className="flex items-center justify-center gap-2 text-gray-700 hover:text-blue-600 font-bold"><Mail className="w-4 h-4"/> {contactInfo.email}</a>}
                      {contactInfo.zalo && <a href={contactInfo.zalo} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-gray-700 hover:text-blue-600 font-bold"><MessageCircle className="w-4 h-4"/> Zalo / Fanpage</a>}
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

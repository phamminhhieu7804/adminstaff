import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import { createOrder } from './lib/api';
import { Store, ArrowRight, Lock, Phone, Mail, MessageCircle, UserPlus, PackageSearch, Loader2, QrCode, CheckCircle2, ChevronLeft, Crown } from 'lucide-react';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'packages' | 'payment'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [packages, setPackages] = useState([]);
  const [contactInfo, setContactInfo] = useState(null);
  const [showPackages, setShowPackages] = useState(false); // Dành cho trang đăng nhập/đăng ký

  // Trạng thái cho Đăng ký & Thanh toán
  const [createdStore, setCreatedStore] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [orderCode, setOrderCode] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [orderAmount, setOrderAmount] = useState(0);
  const [paymentState, setPaymentState] = useState('idle'); // 'idle' | 'success'
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');
  const [timeLeftStr, setTimeLeftStr] = useState('');

  // 1. Tải thông tin gói cước và liên hệ khi mở trang
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const pSnap = await getDocs(collection(db, 'subscription_packages'));
        const list = pSnap.docs.map(d => ({id: d.id, ...d.data()}));
        // Sắp xếp gói cước từ thấp đến cao (nếu cần)
        list.sort((a,b) => (a.price || 0) - (b.price || 0));
        setPackages(list);
        
        const cSnap = await getDoc(doc(db, 'system_settings', 'contact_info'));
        if (cSnap.exists()) setContactInfo(cSnap.data());
      } catch (e) {}
    };
    fetchInfo();
  }, []);

  // 2. Lắng nghe Webhook SePay khi ở màn hình Payment
  useEffect(() => {
    if (mode !== 'payment' || !orderCode || paymentState === 'success') return;
    
    const unsubscribe = onSnapshot(doc(db, 'orders', orderCode), (snap) => {
      if (snap.exists()) {
         const data = snap.data();
         if (data.status === 'SUCCESS') {
            setPaymentState('success');
            setPaymentSuccessMsg(`Thanh toán thành công! Đang tự động chuyển vào phần mềm...`);
            
            // Chờ 3 giây rồi tự động login
            setTimeout(() => {
               // Truyền thẳng storeData mới đăng ký, App.jsx sẽ tải lại data chi tiết sau
               onLogin(createdStore);
            }, 3000);
         }
      }
    });
    return () => unsubscribe();
  }, [mode, orderCode, paymentState, createdStore, onLogin]);

  // 3. Bộ đếm ngược thời gian thanh toán (15 phút)
  useEffect(() => {
    if (mode === 'payment' && paymentState === 'idle') {
      let timeLeft = 15 * 60;
      
      const calculate = () => {
        if (timeLeft <= 0) {
          clearInterval(timer);
          setError('Mã thanh toán đã hết hạn. Vui lòng chọn lại gói cước.');
          setMode('packages');
        } else {
          const m = Math.floor(timeLeft / 60);
          const s = timeLeft % 60;
          setTimeLeftStr(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
      };
      
      calculate();
      const timer = setInterval(() => {
        timeLeft -= 1;
        calculate();
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [mode, paymentState]);

  // Xử lý nút Đăng Nhập
  const handleLoginSubmit = async (e) => {
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

  // Xử lý nút Đăng Ký
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Kiểm tra username hợp lệ
      if (username.length < 4) {
        setError('Tên đăng nhập phải có ít nhất 4 ký tự.');
        setIsLoading(false);
        return;
      }

      // Kiểm tra trùng lặp
      const q = query(collection(db, 'stores'), where('username', '==', username));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setError('Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác.');
        setIsLoading(false);
        return;
      }

      // Tạo tài khoản (mặc định cho 0 ngày dùng thử)
      const nowStr = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'stores'), {
        username,
        password,
        expiresAt: nowStr,
        createdAt: nowStr,
        packageType: 'Thường'
      });
      
      const newStore = { id: docRef.id, username, password, expiresAt: nowStr, packageType: 'Thường' };
      setCreatedStore(newStore);
      setMode('packages'); // Chuyển sang màn hình chọn gói
      
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Chọn gói thanh toán
  const handleSelectPackage = async (pkg) => {
    setSelectedPkg(pkg);
    setMode('payment');
    setPaymentState('idle');
    setIsLoading(true);
    setError('');
    
    try {
      const result = await createOrder(createdStore.id, pkg.id);
      setOrderCode(result.orderCode);
      setQrUrl(result.qrUrl);
      setOrderAmount(result.amount);
    } catch (err) {
      console.error(err);
      setError('Lỗi khởi tạo đơn hàng. Vui lòng thử lại.');
      setMode('packages');
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
          {mode === 'login' ? 'Đăng nhập Quản lý' : 
           mode === 'register' ? 'Đăng ký Tài khoản' : 
           mode === 'packages' ? 'Chọn Gói Cước' : 'Thanh toán'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 mb-8">
          {mode === 'login' && 'Dành cho chủ cửa hàng'}
          {mode === 'register' && 'Tạo cửa hàng mới nhanh chóng'}
          {mode === 'packages' && 'Tài khoản của bạn đã tạo thành công!'}
          {mode === 'payment' && `Thanh toán cho gói ${selectedPkg?.name}`}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* ==================================================== */}
        {/* GIAO DIỆN ĐĂNG NHẬP HOẶC ĐĂNG KÝ */}
        {/* ==================================================== */}
        {(mode === 'login' || mode === 'register') && (
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
            <form className="space-y-6" onSubmit={mode === 'login' ? handleLoginSubmit : handleRegisterSubmit}>
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
                    <>
                       {mode === 'login' ? 'Đăng Nhập' : 'Đăng Ký Tài Khoản'} 
                       <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
            
            <div className="mt-6 flex flex-col items-center justify-center gap-4 text-sm pb-6 border-b border-gray-100">
              <button 
                type="button" 
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                {mode === 'login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
              </button>
              
              <div className="flex items-center gap-2 text-gray-500">
                 <Lock className="w-4 h-4" /> Bảo mật thông tin an toàn
              </div>
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
                     {packages.map(pkg => {
                        const isPro = pkg.type === 'Pro';
                        return (
                           <div key={pkg.id} className={`border rounded-xl p-3 text-center flex flex-col items-center justify-center ${isPro ? 'border-amber-300 bg-amber-50/50' : 'border-blue-100 bg-blue-50/50'}`}>
                              {isPro ? <Crown className="w-6 h-6 text-amber-600 mb-2" /> : <PackageSearch className="w-6 h-6 text-blue-600 mb-2" />}
                              <p className="font-bold text-gray-900 text-sm mb-1">{pkg.name}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${isPro ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                 {isPro ? 'Pro' : 'Thường'}
                              </span>
                              <p className="text-xs text-gray-500 mb-1">
                                 {pkg.durationValue || pkg.durationDays} {(pkg.durationUnit || 'days') === 'days' ? 'ngày' : pkg.durationUnit === 'hours' ? 'giờ' : 'phút'}
                              </p>
                              <p className={`font-black text-sm ${isPro ? 'text-blue-600' : 'text-blue-600'}`}>{new Intl.NumberFormat('vi-VN').format(pkg.price)}đ</p>
                           </div>
                        );
                     })}
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
        )}

        {/* ==================================================== */}
        {/* GIAO DIỆN CHỌN GÓI CƯỚC (SAU KHI ĐĂNG KÝ) */}
        {/* ==================================================== */}
        {mode === 'packages' && (
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
            {error && (
               <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl text-center font-medium border border-red-100 mb-6">
                 {error}
               </div>
            )}
            
            <p className="text-sm font-bold text-gray-700 mb-4 text-center">Vui lòng chọn 1 gói cước để kích hoạt tài khoản:</p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
               {packages.map(pkg => {
                  const isPro = pkg.type === 'Pro';
                  return (
                     <div 
                        key={pkg.id} 
                        onClick={() => handleSelectPackage(pkg)} 
                        className={`border-2 rounded-xl p-3 cursor-pointer transition-all text-center group flex flex-col justify-center items-center ${isPro ? 'border-amber-200 bg-amber-50/50 hover:border-amber-500 hover:bg-amber-100' : 'border-blue-100 bg-blue-50/50 hover:border-blue-500 hover:bg-blue-100'}`}
                     >
                        {isPro ? <Crown className={`w-6 h-6 mb-2 ${isPro ? 'text-amber-500 group-hover:text-amber-600' : ''}`} /> : <PackageSearch className="w-6 h-6 text-blue-500 group-hover:text-blue-600 mb-2" />}
                        <p className={`font-bold text-sm mb-1 ${isPro ? 'text-gray-900 group-hover:text-amber-800' : 'text-gray-900 group-hover:text-blue-800'}`}>{pkg.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${isPro ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                           {isPro ? 'Pro' : 'Thường'}
                        </span>
                        <p className="text-xs text-gray-500 mb-1">
                           {pkg.durationValue || pkg.durationDays} {(pkg.durationUnit || 'days') === 'days' ? 'ngày' : pkg.durationUnit === 'hours' ? 'giờ' : 'phút'}
                        </p>
                        <p className={`font-black text-sm mt-1 ${isPro ? 'text-blue-600' : 'text-blue-600'}`}>{new Intl.NumberFormat('vi-VN').format(pkg.price)}đ</p>
                     </div>
                  );
               })}
            </div>
            
            <button 
               onClick={() => onLogin(createdStore)} 
               className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors mt-2"
            >
               Bỏ qua & Đăng nhập (Dùng thử)
            </button>
          </div>
        )}

        {/* ==================================================== */}
        {/* GIAO DIỆN THANH TOÁN QR */}
        {/* ==================================================== */}
        {mode === 'payment' && (
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
            {isLoading ? (
               <div className="py-12 flex flex-col items-center justify-center">
                 <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                 <p className="text-gray-500 font-medium text-sm">Đang tạo mã thanh toán...</p>
               </div>
            ) : (
               <>
                  {paymentState === 'success' ? (
                     <div className="py-12 flex flex-col items-center justify-center text-center">
                       <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                         <CheckCircle2 className="w-10 h-10 text-green-600" />
                       </div>
                       <h4 className="text-2xl font-bold text-green-600 mb-2">Thành công!</h4>
                       <p className="text-sm text-gray-600 mb-6">{paymentSuccessMsg}</p>
                       <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                     </div>
                  ) : (
                     <div>
                        <div className="mb-4 text-center">
                           <span className="text-sm text-gray-500 block mb-1">Thành tiền:</span>
                           <span className="text-3xl font-black text-blue-600">{new Intl.NumberFormat('vi-VN').format(orderAmount)}đ</span>
                        </div>
                        
                        <div className="mb-4 flex justify-between items-center text-sm font-bold text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                           <span>Nội dung chuyển khoản:</span>
                           <span className="text-blue-700 text-base">{orderCode}</span>
                        </div>
                        
                        <div className="mb-4 flex justify-between items-center text-sm font-bold text-gray-700">
                           <span>Quét mã QR dưới đây:</span>
                           <span className="text-red-500">{timeLeftStr}</span>
                        </div>
                        
                        {qrUrl && (
                           <div className="relative border-2 border-gray-100 rounded-xl p-2 mb-6">
                              <img src={qrUrl} alt="QR Code Thanh Toán" className="w-full h-auto rounded-lg" />
                           </div>
                        )}
                        
                        <div className="flex flex-col items-center justify-center gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                           <div className="flex items-center gap-2 text-blue-700 font-bold">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Hệ thống đang chờ nhận tiền...
                           </div>
                           <p className="text-xs text-blue-600/80 text-center">
                              Sau khi bạn quét mã chuyển khoản thành công, màn hình này sẽ tự động chuyển vào phần mềm.
                           </p>
                        </div>
                        
                        <button 
                           onClick={() => setMode('packages')} 
                           className="mt-6 w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                           <ChevronLeft className="w-5 h-5" /> Chọn gói khác
                        </button>
                     </div>
                  )}
               </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

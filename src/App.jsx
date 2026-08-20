import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDocs, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { createOrder } from './lib/api';
import { Menu, LogOut, PackageSearch, AlertTriangle, Clock, Crown, QrCode, CheckCircle2, ChevronLeft, Loader2, Key, Phone, MessageCircle } from 'lucide-react';
import { addDays, addHours, addMinutes, differenceInMilliseconds } from 'date-fns';
import Sidebar from './components/Sidebar';
import SettingsTab from './tabs/SettingsTab';
import EmployeesTab from './tabs/EmployeesTab';
import ShiftsTab from './tabs/ShiftsTab';
import LogsTab from './tabs/LogsTab';
import RequestsTab from './tabs/RequestsTab';
import MessagesTab from './tabs/MessagesTab';
import PayrollTab from './tabs/PayrollTab';
import StatusTab from './tabs/StatusTab';
import SubscriptionTab from './tabs/SubscriptionTab';
import PhotosTab from './tabs/PhotosTab';
import NotificationBell from './components/NotificationBell';
import MenuTab from './tabs/MenuTab';
import TablesTab from './tabs/TablesTab';
import HistoryTab from './tabs/HistoryTab';
import AuditLogsTab from './tabs/AuditLogsTab';
import Login from './Login';
import { StoreProvider } from './StoreContext';
import { UIProvider } from './contexts/UIContext';

function BannedScreen({ onLogout, storeData }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
       <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full text-center border border-red-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
             <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Tài khoản bị khóa</h1>
          <p className="text-gray-600 mb-4">Tài khoản cửa hàng của bạn đã bị Tổng Quản Lý khóa.</p>
          {storeData?.banReason && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6 border border-red-100 font-medium text-left">
               <strong>Lý do khóa:</strong> {storeData.banReason}
            </div>
          )}
          <p className="text-gray-500 mb-8">Vui lòng liên hệ hotline <strong>0123.456.789</strong> để được hỗ trợ mở lại.</p>
          <button onClick={onLogout} className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold transition-colors">Về trang Đăng nhập</button>
       </div>
    </div>
  );
}

function ExpiredScreen({ onLogout, storeData, setStoreData }) {
  const [packages, setPackages] = useState([]);
  const [contactInfo, setContactInfo] = useState(null);
  const [activationKey, setActivationKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [message, setMessage] = useState('');
  
  const [paymentState, setPaymentState] = useState('packages'); // 'packages' | 'payment' | 'success'
  const [selectedBuyPackage, setSelectedBuyPackage] = useState(null);
  const [orderCode, setOrderCode] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [orderAmount, setOrderAmount] = useState(0);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [orderErrorMsg, setOrderErrorMsg] = useState('');
  
  useEffect(() => {
    const fetchPackages = async () => {
      const snap = await getDocs(collection(db, 'subscription_packages'));
      setPackages(snap.docs.map(d => ({id: d.id, ...d.data()})));
      
      const cSnap = await getDoc(doc(db, 'system_settings', 'contact_info'));
      if (cSnap.exists()) setContactInfo(cSnap.data());
    };
    fetchPackages();
  }, []);

  useEffect(() => {
    if (paymentState === 'payment') {
      if (timeLeft > 0) {
        const timer = setInterval(() => {
          setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
      } else {
        setOrderErrorMsg("Mã thanh toán đã hết hạn. Vui lòng chọn lại gói cước.");
        setPaymentState('packages');
      }
    }
  }, [paymentState, timeLeft]);

  const handleOpenPayment = async (pkg) => {
    if (isCreatingOrder) return;
    setIsCreatingOrder(true);
    try {
      const { success, orderCode: code, qrUrl: qr, amount, message } = await createOrder(storeData.id, pkg.id);
      if (success) {
        setOrderCode(code);
        setQrUrl(qr);
        setOrderAmount(amount);
        setSelectedBuyPackage(pkg);
        setPaymentState('payment');
        setTimeLeft(15 * 60);
      } else {
        setOrderErrorMsg("Hệ thống không thể tạo đơn hàng lúc này. Vui lòng thử lại.");
      }
    } catch (err) {
      console.error(err);
      setOrderErrorMsg("Hệ thống không thể tạo đơn hàng lúc này. Vui lòng thử lại.");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  useEffect(() => {
    if (!orderCode || paymentState !== 'payment') return;
    const unsub = onSnapshot(doc(db, 'orders', orderCode.toString()), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'SUCCESS') {
           setPaymentState('success');
           setTimeout(() => {
             window.location.reload();
           }, 2000);
        }
      }
    });
    return () => unsub();
  }, [orderCode, paymentState, storeData.id, setStoreData]);

  const handleActivate = async () => {
    if (!activationKey.trim()) return;
    setIsActivating(true);
    setMessage('');

    try {
      const q = query(collection(db, 'subscription_keys'), where('key', '==', activationKey.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setMessage('Mã kích hoạt không hợp lệ!');
        setIsActivating(false);
        return;
      }

      const keyDoc = snap.docs[0];
      const keyData = keyDoc.data();

      if (keyData.isUsed) {
        setMessage('Mã này đã được sử dụng!');
        setIsActivating(false);
        return;
      }

      let baseDate = new Date();
      const currExp = storeData.expiresAt ? new Date(storeData.expiresAt) : new Date();
      if (currExp > baseDate) baseDate = currExp; 
      
      let newExpiry;
      const dVal = keyData.durationValue || keyData.durationDays;
      const dUnit = keyData.durationUnit || 'days';
      const keyType = keyData.type || 'Thường';
      
      if (dUnit === 'days') {
        newExpiry = addDays(baseDate, dVal).toISOString();
      } else if (dUnit === 'hours') {
        newExpiry = addHours(baseDate, dVal).toISOString();
      } else if (dUnit === 'minutes') {
        newExpiry = addMinutes(baseDate, dVal).toISOString();
      }
      
      await updateDoc(doc(db, 'stores', storeData.id), { expiresAt: newExpiry, packageType: keyType });
      await updateDoc(doc(db, 'subscription_keys', keyDoc.id), {
        isUsed: true,
        usedByStoreId: storeData.id,
        usedAt: new Date().toISOString()
      });

      await import('firebase/firestore').then(({ addDoc, collection }) => {
        addDoc(collection(db, 'subscription_history'), {
          storeId: storeData.id,
          storeUsername: storeData.username || storeData.storeName || '',
          packageName: `Dùng mã kích hoạt: ${activationKey.trim()}`,
          durationDays: dUnit === 'days' ? dVal : (dUnit === 'hours' ? dVal/24 : dVal/1440),
          price: 0,
          createdAt: new Date().toISOString()
        });
      });

      setStoreData(prev => ({ ...prev, expiresAt: newExpiry, packageType: keyType }));
    } catch(e) {
      console.error(e);
      setMessage('Lỗi khi kích hoạt.');
      setIsActivating(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
       
       {orderErrorMsg && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl relative animate-in fade-in zoom-in duration-200">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                   <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Đã xảy ra lỗi</h3>
                <p className="text-gray-600 mb-6 text-sm">{orderErrorMsg}<br/>Vui lòng liên hệ trực tiếp với chúng tôi để được hỗ trợ thanh toán & gia hạn thủ công.</p>
                {contactInfo && (
                   <div className="bg-gray-50 rounded-xl p-4 mb-6 flex flex-col gap-3">
                      {contactInfo.phone && <a href={`tel:${contactInfo.phone}`} className="font-bold text-blue-600 hover:underline flex items-center justify-center gap-2"><Phone className="w-4 h-4"/> SĐT: {contactInfo.phone}</a>}
                      {contactInfo.zalo && <a href={contactInfo.zalo} target="_blank" rel="noreferrer" className="font-bold text-blue-600 hover:underline flex items-center justify-center gap-2"><MessageCircle className="w-4 h-4"/> Zalo Hỗ Trợ</a>}
                   </div>
                )}
                <button onClick={() => setOrderErrorMsg('')} className="w-full bg-gray-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-black transition-colors">Đóng</button>
             </div>
          </div>
       )}

       <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full text-center border border-red-100">
          
          {paymentState === 'success' ? (
            <div className="py-8">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-black text-gray-900 mb-4">Gia hạn thành công!</h2>
              <p className="text-gray-600 mb-8">Cảm ơn bạn. Tài khoản của bạn đã được gia hạn và có thể tiếp tục sử dụng phần mềm.</p>
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            </div>
          ) : paymentState === 'payment' ? (
            <div>
              <button 
                 onClick={() => setPaymentState('packages')} 
                 className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-bold mb-6 transition-colors"
              >
                 <ChevronLeft className="w-5 h-5" /> Trở lại bảng giá
              </button>
              
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <QrCode className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Thanh toán qua quét mã QR</h2>
              <p className="text-gray-600 mb-6">Mở ứng dụng ngân hàng và quét mã để thanh toán. Hệ thống sẽ tự động xác nhận.</p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center max-w-sm mx-auto shadow-inner relative">
                 {qrUrl ? (
                    <img src={qrUrl} alt="QR Code" className="w-64 h-64 object-contain mb-4 rounded-xl border border-gray-200 shadow-sm" />
                 ) : (
                    <div className="w-64 h-64 flex items-center justify-center mb-4">
                      <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
                    </div>
                 )}
                 <div className="w-full text-center bg-white p-4 rounded-xl border border-blue-100">
                    <p className="text-sm text-gray-500 mb-1">Số tiền thanh toán</p>
                    <p className="text-3xl font-black text-blue-600">{new Intl.NumberFormat('vi-VN').format(orderAmount)}<span className="text-xl">đ</span></p>
                 </div>
                 <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-gray-500">
                   <Clock className="w-4 h-4" /> Thời gian còn lại: <span className="text-red-500">{formatTime(timeLeft)}</span>
                 </div>
              </div>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                 <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">Tài khoản đã hết hạn</h1>
              <p className="text-gray-600 mb-8">Phần mềm quản lý cửa hàng <b>{storeData.storeName}</b> đã hết thời hạn sử dụng. Vui lòng liên hệ nhà cung cấp hoặc chọn một trong các gói cước dưới đây để gia hạn.</p>
              
              <div className="grid grid-cols-2 gap-3 mb-8">
                 {packages.map(pkg => {
                    const isPro = pkg.type === 'Pro';
                    return (
                       <div 
                          key={pkg.id} 
                          onClick={() => handleOpenPayment(pkg)}
                          className={`border-2 rounded-xl p-4 cursor-pointer transition-all text-center group flex flex-col justify-center items-center ${isPro ? 'border-amber-200 bg-amber-50/50 hover:border-amber-500 hover:bg-amber-100' : 'border-blue-100 bg-blue-50/50 hover:border-blue-500 hover:bg-blue-100'}`}
                       >
                          {isPro ? <Crown className={`w-8 h-8 mb-2 ${isPro ? 'text-amber-500 group-hover:text-amber-600' : ''}`} /> : <PackageSearch className="w-8 h-8 text-blue-500 group-hover:text-blue-600 mb-2" />}
                          <p className={`font-bold text-lg mb-1 ${isPro ? 'text-gray-900 group-hover:text-amber-800' : 'text-gray-900 group-hover:text-blue-800'}`}>{pkg.name}</p>
                          <span className={`text-[12px] font-bold px-3 py-0.5 rounded-full mb-3 ${isPro ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                             {isPro ? 'Pro' : 'Thường'}
                          </span>
                          <p className="text-sm text-gray-500 mb-2">
                             {pkg.durationValue || pkg.durationDays} {(pkg.durationUnit || 'days') === 'days' ? 'ngày' : pkg.durationUnit === 'hours' ? 'giờ' : 'phút'}
                          </p>
                          <p className={`font-black text-xl mt-1 ${isPro ? 'text-blue-600' : 'text-blue-600'}`}>{new Intl.NumberFormat('vi-VN').format(pkg.price)}đ</p>
                       </div>
                    );
                 })}
              </div>

            </>
          )}

          {paymentState === 'packages' && (
            <>
              {/* Activation Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 text-left">
                 <h3 className="font-bold text-gray-900 mb-2">Bạn đã có Mã kích hoạt (Key)?</h3>
                 <div className="flex gap-2">
                    <input
                       type="text"
                       placeholder="Nhập mã KEY..."
                       value={activationKey}
                       onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                       className="flex-1 px-4 py-3 rounded-xl border border-blue-200 outline-none focus:border-blue-500 font-mono font-bold"
                    />
                    <button
                       onClick={handleActivate}
                       disabled={isActivating || !activationKey}
                       className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                       {isActivating ? 'Đang kích hoạt...' : 'Kích Hoạt'}
                    </button>
                 </div>
                 {message && <p className={`text-sm font-medium mt-2 ${message.includes('không') || message.includes('Lỗi') ? 'text-red-600' : 'text-green-600'}`}>{message}</p>}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <button onClick={onLogout} className="flex items-center justify-center gap-2 text-gray-600 bg-gray-100 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors w-full sm:w-auto">
                   <LogOut className="w-5 h-5" /> Đăng xuất
                 </button>
              </div>
              
              {contactInfo && (
                 <div className="mt-8 pt-8 border-t border-gray-100 text-sm text-gray-600">
                    <p className="mb-2 font-medium">Hoặc liên hệ với chúng tôi qua:</p>
                    <div className="flex flex-wrap justify-center gap-4">
                       {contactInfo.phone && <a href={`tel:${contactInfo.phone}`} className="font-bold text-blue-600 hover:underline">SĐT: {contactInfo.phone}</a>}
                       {contactInfo.zalo && <a href={contactInfo.zalo} target="_blank" rel="noreferrer" className="font-bold text-blue-600 hover:underline">Zalo / Fanpage</a>}
                       {contactInfo.email && <a href={`mailto:${contactInfo.email}`} className="font-bold text-blue-600 hover:underline">Email: {contactInfo.email}</a>}
                    </div>
                 </div>
              )}
            </>
          )}
       </div>
    </div>
  );
}

function MainApp({ storeData, onLogout }) {
  const [activeTab, setActiveTab] = useState('settings');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [photoPendingCount, setPhotoPendingCount] = useState(0);
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [isWarning, setIsWarning] = useState(false);
  const packageType = storeData?.packageType || 'Thường';
  const isPro = packageType === 'Pro';

  // Listen for pending checkout photos count
  useEffect(() => {
    if (!storeData?.id) return;
    const q = query(
      collection(db, 'stores', storeData.id, 'checkout_photos'),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, (snap) => {
      setPhotoPendingCount(snap.size);
    });
    return () => unsub();
  }, [storeData?.id]);



  useEffect(() => {
    if (!storeData?.expiresAt) return;
    const interval = setInterval(() => {
      const ms = differenceInMilliseconds(new Date(storeData.expiresAt), new Date());
      if (ms > 0) {
        setIsWarning(ms <= 24 * 60 * 60 * 1000); // <= 24 hours
        
        const d = Math.floor(ms / (1000 * 60 * 60 * 24));
        const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const m = Math.floor((ms / 1000 / 60) % 60);
        const s = Math.floor((ms / 1000) % 60);
        
        const parts = [];
        if (d > 0) parts.push(`${d} ngày`);
        if (h > 0) parts.push(`${h} giờ`);
        if (m > 0) parts.push(`${m} phút`);
        parts.push(`${s} giây`);
        setTimeLeftStr(parts.join(' '));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [storeData?.expiresAt]);

  const renderTab = () => {
    switch (activeTab) {
      case 'settings': return <SettingsTab />;
      case 'employees': return <EmployeesTab />;
      case 'shifts': return <ShiftsTab />;
      case 'messages': return <MessagesTab />;
      case 'status': return <StatusTab />;
      case 'menu': return <MenuTab />;
      case 'tables': return <TablesTab />;
      case 'history': return <HistoryTab />;
      case 'audit_logs': return <AuditLogsTab />;
      case 'logs': return <LogsTab />;
      case 'requests': return <RequestsTab />;
      case 'payroll': return <PayrollTab />;
      case 'subscription': return <SubscriptionTab />;
      case 'photos': return <PhotosTab />;
      default: return <SettingsTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        pendingCount={pendingRequests}
        photoPendingCount={photoPendingCount}
        onLogout={onLogout}
        packageType={packageType}
        storeId={storeData?.id}
      />
      
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 lg:ml-64`}>
        {/* Warning Banner */}
        {isWarning && (
           <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold shadow-md z-40 relative">
             <AlertTriangle className="w-5 h-5" />
             Sắp hết hạn! Tài khoản của bạn chỉ còn {timeLeftStr}. Vui lòng gia hạn ngay để không bị gián đoạn.
           </div>
        )}

         {/* Desktop Notification Bell (Floating) */}
         <div className="hidden lg:block">
           <NotificationBell setActiveTab={setActiveTab} onCountChange={setPendingRequests} />
         </div>

         {/* Mobile Header Only */}
        <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between p-4">
          <div className="flex flex-col overflow-hidden max-w-[65%]">
            <h1 className="text-lg font-bold text-gray-800 truncate">
              {storeData?.storeName || 'Admin Staff'}
            </h1>
            <div className={cn("text-[10px] font-bold w-fit px-1.5 py-0.5 rounded mt-0.5", packageType === 'Pro' ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600")}>
              Gói {packageType || 'Thường'}
            </div>
          </div>
          <div className="flex items-center">
            <NotificationBell setActiveTab={setActiveTab} isMobile={true} />
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-gray-600 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto focus:outline-none">
          <div className="w-full p-4 sm:p-6 lg:p-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[calc(100vh-6rem)] p-4 sm:p-6 md:p-8">
              {renderTab()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  const [storeData, setStoreData] = useState(() => {
    const saved = localStorage.getItem('storeData');
    return saved ? JSON.parse(saved) : null;
  });
  const [isExpired, setIsExpired] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  const parseDate = (val) => {
    if (!val) return new Date();
    if (typeof val === 'object' && val.seconds) return new Date(val.seconds * 1000);
    if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate();
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  // Sync with Firestore
  useEffect(() => {
    if (!storeData?.id) return;
    
    // Realtime sync from DB
    const unsub = onSnapshot(doc(db, 'stores', storeData.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setStoreData(data);
        localStorage.setItem('storeData', JSON.stringify(data));
        setIsBanned(data.isBanned === true);
      } else {
        handleLogout();
      }
    });

    return () => unsub();
  }, [storeData?.id]);

  // Interval check
  useEffect(() => {
    if (!storeData?.expiresAt) return;
    const interval = setInterval(() => {
       const exp = parseDate(storeData.expiresAt);
       setIsExpired(exp < new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [storeData?.expiresAt]);

  const handleLogin = (data) => {
    setStoreData(data);
    localStorage.setItem('storeData', JSON.stringify(data));
  };

  const handleLogout = () => {
    localStorage.removeItem('storeData');
    setStoreData(null);
  };

  return (
    <UIProvider>
      {!storeData ? (
        <Login onLogin={handleLogin} />
      ) : (
        <StoreProvider storeData={storeData} setStoreData={setStoreData}>
          {isBanned ? (
            <BannedScreen onLogout={handleLogout} storeData={storeData} />
          ) : isExpired ? (
            <ExpiredScreen storeData={storeData} setStoreData={setStoreData} onLogout={handleLogout} />
          ) : (
            <MainApp storeData={storeData} onLogout={handleLogout} />
          )}
        </StoreProvider>
      )}
    </UIProvider>
  );
}

export default App;

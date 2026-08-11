import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDocs, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Menu, LogOut, PackageSearch, AlertTriangle, Clock } from 'lucide-react';
import { addDays, addHours, addMinutes, differenceInMilliseconds } from 'date-fns';
import Sidebar from './components/Sidebar';
import SettingsTab from './tabs/SettingsTab';
import EmployeesTab from './tabs/EmployeesTab';
import ShiftsTab from './tabs/ShiftsTab';
import LogsTab from './tabs/LogsTab';
import RequestsTab from './tabs/RequestsTab';
import PayrollTab from './tabs/PayrollTab';
import StatusTab from './tabs/StatusTab';
import SubscriptionTab from './tabs/SubscriptionTab';
import PhotosTab from './tabs/PhotosTab';
import NotificationBell from './components/NotificationBell';
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
  
  useEffect(() => {
    const fetchPackages = async () => {
      const snap = await getDocs(collection(db, 'subscription_packages'));
      setPackages(snap.docs.map(d => ({id: d.id, ...d.data()})));
      
      const cSnap = await getDoc(doc(db, 'system_settings', 'contact_info'));
      if (cSnap.exists()) setContactInfo(cSnap.data());
    };
    fetchPackages();
  }, []);

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
      // Component will unmount automatically because isExpired will become false
    } catch(e) {
      console.error(e);
      setMessage('Lỗi khi kích hoạt.');
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
       <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full text-center border border-red-100">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
             <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Tài khoản đã hết hạn</h1>
          <p className="text-gray-600 mb-8">Phần mềm quản lý cửa hàng <b>{storeData.storeName}</b> đã hết thời hạn sử dụng. Vui lòng liên hệ nhà cung cấp hoặc chọn một trong các gói cước dưới đây để gia hạn.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
             {packages.map(pkg => (
                <div key={pkg.id} className="border border-gray-200 rounded-xl p-4 text-center">
                   <PackageSearch className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                   <h3 className="font-bold text-gray-900">{pkg.name}</h3>
                   <p className="text-sm text-gray-500 mb-2">{pkg.durationDays} ngày</p>
                   <p className="font-black text-blue-600">{new Intl.NumberFormat('vi-VN').format(pkg.price)}đ</p>
                </div>
             ))}
          </div>

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
             {message && <p className="text-sm font-medium text-red-600 mt-2">{message}</p>}
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
       </div>
    </div>
  );
}

function MainApp({ storeData, onLogout }) {
  const [activeTab, setActiveTab] = useState('settings');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [isWarning, setIsWarning] = useState(false);
  const packageType = storeData?.packageType || 'Thường';
  const isPro = packageType === 'Pro';



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
      case 'status': return <StatusTab />;
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
          <h1 className="text-lg font-bold text-gray-800 truncate">
            {storeData?.storeName || 'Admin Staff'}
          </h1>
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

  // Sync with Firestore and interval check
  useEffect(() => {
    if (!storeData) return;
    
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

    // Check expiry every second
    const interval = setInterval(() => {
       const exp = storeData.expiresAt ? new Date(storeData.expiresAt) : new Date();
       setIsExpired(exp < new Date());
    }, 1000);

    return () => {
       unsub();
       clearInterval(interval);
    };
  }, [storeData?.id, storeData?.expiresAt]);

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

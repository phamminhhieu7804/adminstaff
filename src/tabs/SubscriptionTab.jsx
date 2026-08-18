import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, updateDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldCheck, Calendar, Phone, Mail, MessageCircle, PackageSearch, Key, Crown, Star, QrCode, X, CreditCard, Loader2 } from 'lucide-react';
import { useStore } from '../StoreContext';
import { useUI } from '../contexts/UIContext';
import { format, differenceInDays, addDays, addHours, addMinutes } from 'date-fns';
import { fetchPackages, createOrder } from '../lib/api';

const parseDate = (val) => {
  if (!val) return new Date();
  if (typeof val === 'object' && val.seconds) return new Date(val.seconds * 1000);
  if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate();
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

export default function SubscriptionTab() {
  const { storeId } = useStore();
  const { storeData, setStoreData } = useStore();
  const { showToast } = useUI();
  const [packages, setPackages] = useState([]);
  const [contactInfo, setContactInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activationKey, setActivationKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [message, setMessage] = useState('');
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [conversionPopup, setConversionPopup] = useState(null);
  const [selectedBuyPackage, setSelectedBuyPackage] = useState(null);
  const [orderCode, setOrderCode] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [orderAmount, setOrderAmount] = useState(0);
  const [paymentState, setPaymentState] = useState('idle'); // 'idle' | 'waiting' | 'success'
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  
  // States cho Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState('packages'); // 'packages' | 'history'
  const [historyData, setHistoryData] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Fetch History
  useEffect(() => {
    if (activeSubTab !== 'history') return;
    const fetchHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const qOrders = query(collection(db, 'orders'), where('storeId', '==', storeData.id), where('status', '==', 'SUCCESS'));
        const snapOrders = await getDocs(qOrders);
        const orderHistory = snapOrders.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            type: 'Thanh toán QR (SePay)',
            packageName: data.planName || data.packageType || 'Gia hạn phần mềm',
            price: data.amount || 0,
            durationDays: data.durationDays || 0,
            date: parseDate(data.updatedAt || data.createdAt)
          };
        });

        const qKeys = query(collection(db, 'subscription_history'), where('storeId', '==', storeData.id));
        const snapKeys = await getDocs(qKeys);
        const keyHistory = snapKeys.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            type: 'Nhập Mã (Key)',
            packageName: data.packageName || 'Kích hoạt bằng Key',
            price: data.price || 0,
            durationDays: data.durationDays || 0,
            date: parseDate(data.createdAt)
          };
        });

        const combined = [...orderHistory, ...keyHistory].sort((a, b) => b.date - a.date);
        setHistoryData(combined);
      } catch (err) {
        console.error(err);
      } finally {
        setIsHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [activeSubTab, storeData.id]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (selectedBuyPackage && paymentState === 'idle') {
      if (timeLeft > 0) {
        const timer = setInterval(() => {
          setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
      } else {
        showToast("Mã thanh toán đã hết hạn. Vui lòng chọn lại gói cước.", "error");
        setSelectedBuyPackage(null);
      }
    }
  }, [selectedBuyPackage, paymentState, timeLeft]);

  const isPro = storeData?.packageType === 'Pro';

  // GỌI API GATEWAY ĐỂ TẠO ĐƠN HÀNG + LẤY QR
  const handleOpenPayment = async (pkg) => {
    setSelectedBuyPackage(pkg);
    setPaymentState('idle');
    setPaymentSuccessMsg('');
    setDiscountCode('');
    setTimeLeft(15 * 60);
    setIsCreatingOrder(true);
    setOrderCode('');
    setQrUrl('');

    try {
      // Gọi API Gateway: POST /api/create-order
      const result = await createOrder(storeData?.id, pkg.id);
      
      setOrderCode(result.orderCode);
      setQrUrl(result.qrUrl);
      setOrderAmount(result.amount);
    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng:", error);
      showToast('Lỗi khi tạo đơn hàng. Vui lòng thử lại.', 'error');
      setSelectedBuyPackage(null);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Lắng nghe trạng thái đơn hàng trực tiếp từ orders/{orderCode}
  useEffect(() => {
    if (!orderCode || paymentSuccessMsg) return;

    const unsubscribe = onSnapshot(doc(db, 'orders', orderCode), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'SUCCESS') {
          const duration = `${selectedBuyPackage?.durationValue || selectedBuyPackage?.durationDays || ''} ${(selectedBuyPackage?.durationUnit || 'days') === 'days' ? 'ngày' : selectedBuyPackage?.durationUnit === 'hours' ? 'giờ' : 'phút'}`;
          setPaymentState('success');
          setPaymentSuccessMsg(`Cảm ơn quý khách đã thanh toán gói ${selectedBuyPackage?.name || ''} thành công! Đã được cộng ${duration}.`);
          
          setTimeout(() => {
             setSelectedBuyPackage(null);
             window.location.href = '/';
          }, 5000);
        }
      }
    }, (error) => {
       console.log("Order listener error:", error);
    });

    return () => unsubscribe();
  }, [orderCode, paymentSuccessMsg, selectedBuyPackage]);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        // Lấy gói cước qua API Gateway thay vì Firestore trực tiếp
        const pkgList = await fetchPackages();
        setPackages(pkgList);
        
        // Contact info vẫn đọc trực tiếp từ Firestore (không nằm trong flow thanh toán)
        const cSnap = await getDoc(doc(db, 'system_settings', 'contact_info'));
        if (cSnap.exists()) setContactInfo(cSnap.data());
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInfo();
  }, []);

  useEffect(() => {
    if (!storeData?.expiresAt) return;

    const calculateTimeLeft = () => {
      const exp = parseDate(storeData.expiresAt);
      const now = new Date();
      if (exp > now) {
        const ms = exp - now;
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
      } else {
        setTimeLeftStr('Đã hết hạn');
      }
    };

    calculateTimeLeft(); // Tính toán ngay lập tức lần đầu
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [storeData?.expiresAt]);

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

      const keyType = keyData.type || 'Thường';
      const currentType = storeData.packageType || 'Thường';

      let baseDate = new Date();
      const currExp = parseDate(storeData.expiresAt);
      const now = new Date();
      
      const dVal = keyData.durationValue || keyData.durationDays;
      const dUnit = keyData.durationUnit || 'days';
      let newDaysToAdd = dUnit === 'days' ? dVal : (dUnit === 'hours' ? dVal / 24 : dVal / 1440);

      if (currentType === 'Thường' && keyType === 'Pro' && currExp > now) {
        const remainingMs = currExp - now;
        const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const convertedDays = Math.floor(remainingDays * 0.3);
        const totalProDays = newDaysToAdd + convertedDays;

        setConversionPopup({
          remainingDays,
          convertedDays,
          newKeyDays: newDaysToAdd,
          totalDays: totalProDays,
          onConfirm: async () => {
            const newExpiry = addDays(now, totalProDays).toISOString();
            
            await updateDoc(doc(db, 'stores', storeData.id), { 
              expiresAt: newExpiry,
              packageType: 'Pro'
            });
            
            await updateDoc(doc(db, 'subscription_keys', keyDoc.id), {
              isUsed: true,
              usedByStoreId: storeData.id,
              usedAt: new Date().toISOString()
            });

            await addDoc(collection(db, 'subscription_history'), {
              storeId: storeData.id,
              storeUsername: storeData.username || storeData.storeName || '',
              packageName: `Nâng cấp Pro: ${activationKey.trim()} (chuyển đổi ${convertedDays} ngày Thường)`,
              durationDays: totalProDays,
              price: keyData.price || 0,
              createdAt: new Date().toISOString()
            });

            setStoreData(prev => ({ ...prev, expiresAt: newExpiry, packageType: 'Pro' }));
            setActivationKey('');
            setMessage('✅ Nâng cấp Pro thành công!');
            setConversionPopup(null);
            setIsActivating(false);
          },
          onCancel: () => {
            setConversionPopup(null);
            setIsActivating(false);
          }
        });
        return;
      }

      if (currExp > now && currentType === keyType) {
        baseDate = currExp;
      }
      
      let newExpiry;
      if (dUnit === 'days') {
        newExpiry = addDays(baseDate, dVal).toISOString();
      } else if (dUnit === 'hours') {
        newExpiry = addHours(baseDate, dVal).toISOString();
      } else if (dUnit === 'minutes') {
        newExpiry = addMinutes(baseDate, dVal).toISOString();
      }
      
      await updateDoc(doc(db, 'stores', storeData.id), { 
        expiresAt: newExpiry,
        packageType: keyType
      });
      
      await updateDoc(doc(db, 'subscription_keys', keyDoc.id), {
        isUsed: true,
        usedByStoreId: storeData.id,
        usedAt: new Date().toISOString()
      });

      await addDoc(collection(db, 'subscription_history'), {
        storeId: storeData.id,
        storeUsername: storeData.username || storeData.storeName || '',
        packageName: `Dùng mã kích hoạt (${keyType}): ${activationKey.trim()}`,
        durationDays: dUnit === 'days' ? dVal : (dUnit === 'hours' ? dVal/24 : dVal/1440),
        price: keyData.price || 0,
        createdAt: new Date().toISOString()
      });

      setStoreData(prev => ({ ...prev, expiresAt: newExpiry, packageType: keyType }));
      setActivationKey('');
      setMessage('✅ Kích hoạt thành công!');
    } catch(e) {
      console.error(e);
      setMessage('Lỗi khi kích hoạt. Vui lòng thử lại.');
    } finally {
      setIsActivating(false);
    }
  };

  const expDate = parseDate(storeData?.expiresAt);

  return (
    <div className="w-full space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" /> Thông tin Phần mềm
        </h2>
        <p className="text-gray-500 mt-1">Trạng thái gói cước và thông tin gia hạn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <div className={`rounded-2xl border p-6 shadow-sm flex flex-col h-full bg-white ${isPro ? 'border-amber-300' : 'border-gray-200'}`}>
           <h3 className={`text-lg font-bold mb-4 ${isPro ? 'text-amber-600' : 'text-gray-900'}`}>Gói cước hiện tại: {isPro ? 'Pro' : 'Thường'}</h3>
           <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${isPro ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-600'}`}>
                 {isPro ? <Crown className="w-8 h-8" /> : <Calendar className="w-8 h-8" />}
              </div>
              <div>
                 <p className="text-sm text-gray-500">Thời hạn sử dụng</p>
                 <p className={`font-bold text-xl ${isPro ? 'text-amber-600' : 'text-blue-700'}`}>{timeLeftStr || 'Đang tính toán...'}</p>
              </div>
           </div>
           {isPro && (
             <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-amber-600 text-sm font-bold">Tất cả tính năng đã được mở khóa</span>
             </div>
           )}
           <div className="mt-auto rounded-xl p-4 bg-gray-50">
              <p className="text-sm text-gray-600">Ngày hết hạn: <b className={isPro ? 'text-amber-600' : 'text-gray-900'}>{format(expDate, 'dd/MM/yyyy HH:mm:ss')}</b></p>
           </div>
        </div>

        {/* Contact Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col h-full">
           <h3 className="text-lg font-bold text-gray-900 mb-4">Liên hệ Hỗ trợ & Gia hạn</h3>
           {contactInfo ? (
             <div className="space-y-3 mt-auto">
                {contactInfo.phone && (
                   <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 transition-colors font-bold text-sm">
                      <Phone className="w-4 h-4"/> {contactInfo.phone}
                   </a>
                )}
                {contactInfo.zalo && (
                   <a href={contactInfo.zalo} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 transition-colors font-bold text-sm">
                      <MessageCircle className="w-4 h-4"/> Nhắn tin Zalo / Fanpage
                   </a>
                )}
                {contactInfo.email && (
                   <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 transition-colors font-bold text-sm">
                      <Mail className="w-4 h-4"/> {contactInfo.email}
                   </a>
                )}
             </div>
           ) : (
             <p className="text-gray-500 text-sm mt-auto">Chưa có thông tin liên hệ.</p>
           )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveSubTab('packages')}
          className={`pb-3 px-2 font-bold text-[15px] transition-colors border-b-2 ${activeSubTab === 'packages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          Mua Gói Cước
        </button>
        <button 
          onClick={() => setActiveSubTab('history')}
          className={`pb-3 px-2 font-bold text-[15px] transition-colors border-b-2 ${activeSubTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          Lịch sử giao dịch & Mã đã dùng
        </button>
      </div>

      {activeSubTab === 'packages' && (
        <div className="space-y-6">
          {/* Activation Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
         <h3 className="text-lg font-bold text-gray-900 mb-2">Nhập Mã Kích Hoạt</h3>
         <p className="text-sm text-gray-500 mb-4">Nhập mã (Key) bạn được cung cấp để tự động gia hạn phần mềm.</p>
         
         <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 w-full">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="w-5 h-5 text-gray-400" />
               </div>
               <input
                  type="text"
                  placeholder="VD: STD-30D-ABCDEF hoặc PRO-360D-ABCDEF"
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
               />
            </div>
            <button 
               onClick={handleActivate}
               disabled={isActivating || !activationKey}
               className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-8 rounded-xl transition-colors whitespace-nowrap"
            >
               {isActivating ? 'Đang xử lý...' : 'Kích Hoạt Ngay'}
            </button>
         </div>
         {message && <p className={`text-sm font-medium mt-3 ${message.includes('thành công') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
      </div>
      
      {/* Packages Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
         <h3 className="text-lg font-bold text-gray-900 mb-4">Bảng giá Gói cước</h3>
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {isLoading ? <p>Đang tải...</p> : packages.map(pkg => {
              const pkgType = pkg.type || 'Thường';
              const hasDiscount = pkg.discount > 0;
              const finalPrice = hasDiscount ? pkg.price - (pkg.price * pkg.discount / 100) : pkg.price;
              
              return (
                <div 
                  key={pkg.id} 
                  onClick={() => handleOpenPayment(pkg)}
                  className={`border rounded-xl p-4 text-center hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 ${pkgType === 'Pro' ? 'border-yellow-300 bg-gradient-to-b from-yellow-50 to-white hover:border-yellow-400' : 'border-blue-100 bg-blue-50/30 hover:border-blue-300'}`}
                >
                   {pkgType === 'Pro' ? <Crown className="w-6 h-6 text-yellow-500 mx-auto mb-2" /> : <PackageSearch className="w-6 h-6 text-blue-600 mx-auto mb-2" />}
                   <p className="font-bold text-gray-900 text-sm mb-1 line-clamp-1" title={pkg.name}>{pkg.name}</p>
                   <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${pkgType === 'Pro' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{pkgType}</span>
                   <p className="text-xs text-gray-500 mb-2">
                      Thêm {pkg.durationValue || pkg.durationDays} {(pkg.durationUnit || 'days') === 'days' ? 'ngày' : pkg.durationUnit === 'hours' ? 'giờ' : 'phút'}
                   </p>
                   {hasDiscount ? (
                     <div>
                       <p className="text-xs text-gray-400 line-through">{new Intl.NumberFormat('vi-VN').format(pkg.price)}đ</p>
                       <p className="font-black text-blue-600 text-lg">{new Intl.NumberFormat('vi-VN').format(finalPrice)}<span className="text-xs font-medium">đ</span></p>
                       <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">-{pkg.discount}%</span>
                     </div>
                   ) : (
                     <p className="font-black text-blue-600 text-lg">{new Intl.NumberFormat('vi-VN').format(pkg.price)}<span className="text-xs font-medium">đ</span></p>
                   )}
                </div>
              );
            })}
         </div>
      </div>
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
           <h3 className="text-lg font-bold text-gray-900 mb-4">Lịch sử Giao dịch</h3>
           {isHistoryLoading ? (
             <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
           ) : historyData.length === 0 ? (
             <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-xl border border-gray-100">Chưa có giao dịch hoặc mã kích hoạt nào.</div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse whitespace-nowrap">
                 <thead>
                   <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                     <th className="p-3 font-bold">Thời gian</th>
                     <th className="p-3 font-bold">Hình thức</th>
                     <th className="p-3 font-bold">Nội dung / Gói cước</th>
                     <th className="p-3 font-bold">Cộng thêm</th>
                     <th className="p-3 font-bold text-right">Số tiền</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 text-sm">
                   {historyData.map(item => (
                     <tr key={item.id} className="hover:bg-blue-50/50 transition-colors">
                       <td className="p-3 text-gray-600">{format(item.date, 'dd/MM/yyyy HH:mm')}</td>
                       <td className="p-3 font-bold text-gray-700">{item.type}</td>
                       <td className="p-3 text-gray-900">{item.packageName}</td>
                       <td className="p-3 font-black text-green-600">+{item.durationDays} ngày</td>
                       <td className="p-3 text-right font-black text-blue-600">
                         {item.price > 0 ? `${new Intl.NumberFormat('vi-VN').format(item.price)}đ` : 'Miễn phí'}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      )}

      {/* Conversion Popup */}
      {conversionPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 p-6 text-white">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8" />
                <h3 className="text-xl font-black">Nâng cấp lên Pro</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <p className="text-sm text-gray-700">Gói Thường còn lại: <b className="text-blue-700">{conversionPopup.remainingDays} ngày</b></p>
                <p className="text-sm text-gray-700">Chuyển đổi 30%: <b className="text-green-700">+{conversionPopup.convertedDays} ngày Pro</b></p>
                <p className="text-sm text-gray-700">Key Pro mới: <b className="text-blue-700">+{conversionPopup.newKeyDays} ngày Pro</b></p>
                <div className="border-t border-blue-200 pt-2 mt-2">
                  <p className="text-lg font-black text-gray-900">Tổng thời hạn Pro: <span className="text-yellow-600">{conversionPopup.totalDays} ngày</span></p>
                </div>
              </div>
              <p className="text-sm text-gray-500">Lưu ý: 70% số ngày còn lại của gói Thường sẽ bị mất khi chuyển đổi sang Pro.</p>
              <div className="flex gap-3">
                <button 
                  onClick={conversionPopup.onCancel}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={conversionPopup.onConfirm}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold rounded-xl hover:from-yellow-600 hover:to-amber-600 transition-colors"
                >
                  Xác nhận nâng cấp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Payment Modal */}
      {selectedBuyPackage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`relative w-full max-w-md rounded-2xl shadow-xl overflow-hidden bg-white ${selectedBuyPackage.type === 'Pro' ? 'border border-amber-300' : ''}`}>
            
            {/* Header */}
            <div className={`p-6 flex justify-between items-center border-b ${selectedBuyPackage.type === 'Pro' ? 'border-amber-100 bg-amber-50/30' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                {selectedBuyPackage.type === 'Pro' ? (
                   <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                     <Crown className="w-6 h-6 text-amber-600" />
                   </div>
                ) : (
                   <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                     <PackageSearch className="w-6 h-6 text-blue-600" />
                   </div>
                )}
                <div>
                  <h3 className={`font-bold text-lg leading-tight ${selectedBuyPackage.type === 'Pro' ? 'text-amber-600' : 'text-gray-900'}`}>Thanh Toán</h3>
                  <p className="text-xs text-gray-500">Mua gói cước tự động</p>
                </div>
              </div>
              <button onClick={() => setSelectedBuyPackage(null)} className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-400 hover:text-gray-900">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
               {paymentState === 'success' && paymentSuccessMsg ? (
                  <div className="text-center py-8 animate-in fade-in zoom-in duration-300">
                     <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-green-600" />
                     </div>
                     <h3 className="text-xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h3>
                     <p className="text-gray-600 leading-relaxed mb-6">{paymentSuccessMsg}</p>
                     <p className="text-sm text-gray-400 italic">Đang tự động chuyển về trang chủ...</p>
                  </div>
               ) : isCreatingOrder ? (
                  <div className="text-center py-12">
                     <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                     <p className="text-gray-600 font-medium">Đang tạo đơn hàng...</p>
                  </div>
               ) : (
                  <>
                     <div className={`rounded-xl p-4 mb-5 ${selectedBuyPackage.type === 'Pro' ? 'bg-amber-50 border border-amber-100' : 'bg-blue-50 border border-blue-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                           <span className="font-bold text-gray-900">{selectedBuyPackage.name}</span>
                           <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedBuyPackage.type === 'Pro' ? 'bg-amber-200 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>{selectedBuyPackage.type || 'Thường'}</span>
                        </div>
                        <p className="text-sm mb-3 text-gray-600">
                          Thời hạn: <b>{selectedBuyPackage.durationValue || selectedBuyPackage.durationDays} {(selectedBuyPackage.durationUnit || 'days') === 'days' ? 'ngày' : selectedBuyPackage.durationUnit === 'hours' ? 'giờ' : 'phút'}</b>
                        </p>
                        <div className={`flex justify-between items-end border-t border-dashed pt-3 mt-3 ${selectedBuyPackage.type === 'Pro' ? 'border-amber-200' : 'border-blue-200'}`}>
                           <span className="text-sm text-gray-500">Thành tiền</span>
                           <span className={`text-xl font-black ${selectedBuyPackage.type === 'Pro' ? 'text-amber-600' : 'text-blue-700'}`}>
                             {new Intl.NumberFormat('vi-VN').format(orderAmount || (selectedBuyPackage.discount > 0 ? selectedBuyPackage.price - (selectedBuyPackage.price * selectedBuyPackage.discount / 100) : selectedBuyPackage.price))}đ
                           </span>
                        </div>
                     </div>

                     {/* Discount Code */}
                     <div className="flex gap-2 mb-5">
                       <input 
                         type="text" 
                         value={discountCode}
                         onChange={(e) => setDiscountCode(e.target.value)}
                         placeholder="Nhập mã giảm giá..." 
                         className={`flex-1 border border-gray-300 rounded-xl px-4 py-2 outline-none text-sm bg-gray-50 ${selectedBuyPackage.type === 'Pro' ? 'focus:ring-2 focus:ring-amber-500' : 'focus:ring-2 focus:ring-blue-500'}`} 
                       />
                       <button className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition-colors whitespace-nowrap">
                         Áp dụng
                       </button>
                     </div>

                     <div className="text-center mb-6">
                        <div className="flex justify-between items-end mb-4 text-left">
                           <div>
                              <p className="text-sm font-medium text-gray-700">Quét mã để thanh toán tự động</p>
                              <p className="text-xs text-gray-500 mt-1">Nội dung CK: <b className="text-gray-900">{orderCode}</b></p>
                           </div>
                           <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">Thời gian giữ mã</p>
                              <div className={`text-lg font-bold font-mono ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
                                 {formatTime(timeLeft)}
                              </div>
                           </div>
                        </div>
                        
                        {/* QR Code từ API Gateway (không còn hardcode bank info) */}
                        <div className="mx-auto w-full max-w-[240px] bg-white p-2 rounded-xl border border-gray-200 relative mb-4">
                           {qrUrl ? (
                              <img 
                                 src={qrUrl} 
                                 alt="QR Thanh Toán"
                                 className="w-full h-auto rounded-lg"
                              />
                           ) : (
                              <div className="w-full aspect-square flex items-center justify-center">
                                 <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                              </div>
                           )}
                        </div>

                        <div className="flex flex-col items-center justify-center space-y-2 mt-4">
                           <div className="flex items-center gap-2 text-blue-600 font-medium">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Hệ thống đang chờ nhận tiền...</span>
                           </div>
                           <p className="text-xs text-gray-400">Trạng thái sẽ tự động cập nhật ngay khi bạn chuyển khoản thành công.</p>
                        </div>
                     </div>
                  </>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
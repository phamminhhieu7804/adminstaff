'use client';

import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase'; // File cấu hình Firebase của dự án
import { ShieldCheck, Loader2, X, CreditCard, Star, Package } from 'lucide-react';
import { useStore } from '../StoreContext';
export default function PaymentModal({ onClose }) {
  const { storeId } = useStore();
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [orderCode, setOrderCode] = useState(null);
  
  const [paymentState, setPaymentState] = useState('idle'); 

  // Thời gian đếm ngược (15 phút)
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (paymentState === 'qr') {
      if (timeLeft > 0) {
        const timer = setInterval(() => {
          setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
      } else {
        // Hết thời gian giữ mã, tự động quay về trang chọn gói
        alert("Mã thanh toán đã hết hạn. Vui lòng chọn lại gói cước.");
        setPaymentState('idle');
      }
    }
  }, [paymentState, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. Tải danh sách Gói cước (Plans) từ Firestore
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'plans'));
        const plansData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const normalizedData = {};
          
          // Loại bỏ khoảng trắng thừa ở tên trường (VD: "price " -> "price")
          Object.keys(data).forEach(key => {
            normalizedData[key.trim()] = data[key];
          });

          return {
            id: doc.id,
            ...normalizedData
          };
        });
        
        // Sắp xếp theo giá (tùy chọn)
        plansData.sort((a, b) => (a.price || 0) - (b.price || 0));
        setPlans(plansData);
      } catch (error) {
        console.error("Lỗi khi tải gói cước:", error);
      } finally {
        setLoadingPlans(false);
      }
    };
    
    fetchPlans();
  }, []);

  // Hàm tính giá an toàn (đề phòng lưu dạng chuỗi hoặc nhầm tên trường amount/price)
  const getFinalPrice = (plan) => {
    if (!plan) return 0;
    let rawVal = plan.price ?? plan.prices ?? plan.amount ?? plan.Price ?? 0;
    
    // Nếu vô tình lưu dưới dạng chuỗi có chứa dấu phẩy hoặc chấm (VD: "150.000" hoặc "150,000")
    if (typeof rawVal === 'string') {
      rawVal = rawVal.replace(/[.,\s]/g, ''); // Xóa hết dấu chấm, phẩy, khoảng trắng
    }
    
    const rawPrice = Number(rawVal) || 0;
    const discount = Number(plan.discount) || 0;
    if (discount > 0) {
      return rawPrice - (rawPrice * discount / 100);
    }
    return rawPrice;
  };

  // 2. Xử lý khi người dùng chọn 1 gói cước -> Tạo Đơn hàng (Order)
  const handleSelectPlan = async (plan) => {
    try {
      setSelectedPlan(plan);
      
      // Tính giá sau khuyến mãi
      const finalPrice = getFinalPrice(plan);

      // Sinh mã đơn hàng ngẫu nhiên (PAY + 6 ký tự ngẫu nhiên)
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newOrderCode = `PAY${randomString}`;
      setOrderCode(newOrderCode);
      
      // Reset thời gian đếm ngược
      setTimeLeft(15 * 60);

      // Chuyển UI sang màn hình QR ngay lập tức
      setPaymentState('qr');

      // Ghi đơn hàng tạm (PENDING) vào Firestore collection 'orders'
      const orderRef = doc(db, 'orders', newOrderCode);
      await setDoc(orderRef, {
        storeId: storeId,
        planId: plan.id,
        planName: plan.name,
        amount: finalPrice,
        durationDays: plan.durationDays || 30,
        status: 'PENDING',
        createdAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng:", error);
      alert("Không thể tạo mã thanh toán lúc này. Vui lòng thử lại!");
      setPaymentState('idle');
    }
  };

  // 3. Lắng nghe trạng thái Đơn hàng (Realtime)
  useEffect(() => {
    if (!orderCode) return;

    const orderRef = doc(db, 'orders', orderCode);
    
    // Chỉ lắng nghe document của đơn hàng hiện tại
    const unsubscribe = onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Nếu Backend xử lý Webhook thành công và update status thành SUCCESS
        if (data.status === 'SUCCESS') {
          setPaymentState('success');
          
          // Tự động đóng Modal hoặc Reload trang sau 5 giây
          setTimeout(() => {
            if (onClose) onClose();
          }, 5000);
        }
      }
    }, (error) => {
      console.error("Lỗi khi lắng nghe Firestore Order:", error);
    });

    return () => unsubscribe();
  }, [orderCode, onClose]);


  // Hàm Render giao diện Danh sách Gói cước
  const renderPlansList = () => {
    if (loadingPlans) {
      return (
        <div className="py-12 flex justify-center items-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      );
    }

    if (plans.length === 0) {
      return (
        <div className="py-12 text-center text-gray-500">
          Chưa có gói cước nào được cấu hình trên hệ thống.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {plans.map((plan) => {
          const finalPrice = getFinalPrice(plan);
          let rawVal = plan.price ?? plan.prices ?? plan.amount ?? plan.Price ?? 0;
          if (typeof rawVal === 'string') rawVal = rawVal.replace(/[.,\s]/g, '');
          const rawPrice = Number(rawVal) || 0;

          return (
            <div 
              key={plan.id}
              onClick={() => handleSelectPlan(plan)}
              className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${plan.isPopular ? 'border-amber-500 bg-amber-50/50' : 'border-gray-200 hover:border-amber-300 bg-white'}`}
            >
              {/* Badge Nổi bật */}
              {plan.isPopular && (
                <div className="absolute -top-3 left-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Star className="w-3 h-3 fill-white" /> PHỔ BIẾN NHẤT
                </div>
              )}

              <div>
                <h4 className="font-bold text-gray-900">{plan.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{plan.description || `Sử dụng trong ${plan.durationDays} ngày`}</p>
              </div>

              <div className="text-right">
                {plan.discount > 0 && (
                  <div className="text-xs text-gray-400 line-through mb-0.5">
                    {new Intl.NumberFormat('vi-VN').format(rawPrice)}đ
                  </div>
                )}
                <div className="font-black text-amber-600 text-lg">
                  {new Intl.NumberFormat('vi-VN').format(finalPrice)}đ
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl animate-in fade-in zoom-in duration-200">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header Modal */}
        <div className="bg-amber-50 p-6 border-b border-amber-100 flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 flex items-center justify-center rounded-xl font-bold">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-amber-600">Nâng Cấp Cửa Hàng</h3>
            <p className="text-xs text-gray-500">Mở khóa tính năng chuyên nghiệp</p>
          </div>
        </div>

        {/* Nội dung Modal */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          
          {paymentState === 'idle' ? (
            // BƯỚC 1: DANH SÁCH GÓI CƯỚC
            renderPlansList()

          ) : paymentState === 'success' ? (
            // BƯỚC 3: THÀNH CÔNG
            <div className="text-center py-8 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Thanh toán thành công!</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Cảm ơn quý khách đã nâng cấp gói {selectedPlan?.name}. Cửa hàng đã được tự động gia hạn.
              </p>
              <p className="text-sm text-gray-400 italic">Cửa sổ sẽ tự động đóng...</p>
            </div>

          ) : (
            // BƯỚC 2: HIỂN THỊ MÃ QR ĐỂ THANH TOÁN
            <div className="animate-in slide-in-from-bottom-4 duration-300">
              
              <button 
                onClick={() => setPaymentState('idle')}
                className="text-sm font-medium text-amber-600 mb-4 hover:underline"
              >
                &larr; Chọn gói khác
              </button>

              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-900">{selectedPlan?.name}</span>
                  <span className="text-xl font-black text-amber-600">
                    {new Intl.NumberFormat('vi-VN').format(getFinalPrice(selectedPlan))}đ
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Thời hạn: <b>{selectedPlan?.durationDays || 30} ngày</b>
                </p>
              </div>

              <div className="text-center mb-6">
                <div className="flex justify-between items-end mb-4">
                  <div className="text-left">
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
                
                <div className="mx-auto w-full max-w-[240px] bg-white p-2 rounded-xl border border-gray-200 relative mb-4">
                  <img 
                    src={`https://vietqr.app/img?bank=TPBank&acc=00001937189&template=compact&showinfo=true&holder=PHAM MINH HIEU&amount=${
                      getFinalPrice(selectedPlan)
                    }&addInfo=${encodeURIComponent(orderCode)}&memo=${encodeURIComponent(orderCode)}&des=${encodeURIComponent(orderCode)}`} 
                    alt="QR Thanh Toan"
                    className="w-full h-auto rounded-lg"
                  />
                </div>

                <div className="flex flex-col items-center justify-center space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-blue-600 font-medium">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Hệ thống đang chờ nhận tiền...</span>
                  </div>
                  <p className="text-xs text-gray-400">Trạng thái sẽ tự động cập nhật ngay khi bạn chuyển khoản thành công.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

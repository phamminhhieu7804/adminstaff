import React, { useState } from 'react';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, Receipt, Tag, Clock, User, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function TableReceiptModal({ table, storeId, db, onClose, showToast }) {
  const [discountType, setDiscountType] = useState(table?.discount?.type || 'amount');
  const [discountValue, setDiscountValue] = useState(table?.discount?.value || table?.discount?.amount || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const orders = table.orders || [];
  const subTotal = orders.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const discountValueNum = Number(discountValue) || 0;
  const computedDiscountAmount = discountType === 'percent' 
    ? (subTotal * discountValueNum) / 100 
    : discountValueNum;

  const finalTotal = subTotal - computedDiscountAmount > 0 ? subTotal - computedDiscountAmount : 0;

  const handleSaveDiscount = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'stores', storeId, 'tables', table.id), {
        discount: {
          type: discountType,
          value: discountValueNum,
          amount: computedDiscountAmount // Backend compatibility for menustaff
        }
      });
      showToast('Đã lưu giảm giá thành công!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi lưu giảm giá', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCashPayment = async () => {
    showConfirm('Xác nhận thanh toán', `Xác nhận bàn ${table.name} đã thanh toán thành công và đóng bàn?`, async () => {
    setIsPaying(true);
    try {
      // Lưu lịch sử đơn hàng
      await addDoc(collection(db, 'stores', storeId, 'order_history'), {
        tableId: table.id,
        tableName: table.name,
        orders: table.orders || [],
        totalAmount: finalTotal,
        subTotal: subTotal,
        discount: {
          type: discountType,
          value: discountValueNum,
          amount: computedDiscountAmount
        },
        paymentMethod: 'cash',
        completedAt: new Date().toISOString(),
        employeeCode: 'ADMIN',
        employeeName: 'Quản lý / Chủ quán'
      });

      // Reset bàn về empty
      await updateDoc(doc(db, 'stores', storeId, 'tables', table.id), {
        status: 'empty',
        orders: [],
        discount: null,
        openedBy: null,
        openedAt: null
      });

      showToast('Thanh toán thành công!', 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi thanh toán', 'error');
    } finally {
      setIsPaying(false);
    }
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Không xác định';
    try {
      return format(new Date(isoString), 'HH:mm - dd/MM/yyyy', { locale: vi });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            Chi tiết Bàn {table.name}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {(table.openedBy || table.openedAt) && (
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 flex items-center gap-1"><User className="w-4 h-4"/> Người mở bàn:</span>
                <span className="font-semibold text-blue-800">{table.openedBy || 'Không xác định'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 flex items-center gap-1"><Clock className="w-4 h-4"/> Thời gian mở:</span>
                <span className="font-semibold text-blue-800">{formatDate(table.openedAt)}</span>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase mb-2">Danh sách món</h4>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100 max-h-[30vh] overflow-y-auto">
              {orders.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa gọi món nào.</p>
              ) : (
                orders.map((o, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800">{o.quantity}x {o.name}</span>
                      {o.note && <span className="text-xs text-orange-600 italic">Ghi chú: {o.note}</span>}
                    </div>
                    <span className="font-medium">{(o.price * o.quantity).toLocaleString('vi-VN')}đ</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-between font-bold text-gray-800 mt-2 px-1 text-sm">
              <span>Tạm tính:</span>
              <span>{subTotal.toLocaleString('vi-VN')}đ</span>
            </div>
          </div>

          <form onSubmit={handleSaveDiscount} className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4" /> Áp dụng giảm giá
            </h4>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="w-1/3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Loại</label>
                  <select
                    value={discountType}
                    onChange={e => setDiscountType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="amount">Số tiền</option>
                    <option value="percent">%</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mức giảm</label>
                  <input 
                    type="number" 
                    value={discountValue} 
                    onChange={e => setDiscountValue(e.target.value)} 
                    placeholder={discountType === 'percent' ? "VD: 10" : "VD: 20000"}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              {computedDiscountAmount > 0 && (
                 <p className="text-xs text-blue-600 font-medium text-right">Giảm: -{computedDiscountAmount.toLocaleString('vi-VN')}đ</p>
              )}
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSaving ? 'Đang lưu...' : 'Cập nhật Giảm giá'}
              </button>
            </div>
          </form>

          <div className="border-t border-dashed border-gray-300 pt-4 mt-4">
            <div className="flex justify-between text-lg font-black text-gray-900 mb-4">
              <span>Khách cần thanh toán:</span>
              <span className="text-orange-600">{finalTotal.toLocaleString('vi-VN')}đ</span>
            </div>
            
            <button 
              onClick={handleCashPayment}
              disabled={isPaying || orders.length === 0}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-base hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5" />
              {isPaying ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </button>
            <p className="text-xs text-gray-500 text-center mt-3">
              (Thanh toán sẽ làm trống bàn và lưu vào lịch sử)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

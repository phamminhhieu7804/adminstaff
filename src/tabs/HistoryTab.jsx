import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useStore } from '../StoreContext';
import { Loader2, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function HistoryTab() {
  const { storeId } = useStore();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (!storeId) return;
    const q = query(collection(db, 'stores', storeId, 'order_history'), orderBy('completedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistory(docs);
      
      const total = docs.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      setTotalRevenue(total);
      
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Lịch sử & Doanh thu</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-md flex items-center gap-5 relative overflow-hidden">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm z-10">
            <DollarSign className="w-7 h-7 text-white" />
          </div>
          <div className="z-10">
            <p className="text-blue-100 font-medium mb-1">Tổng doanh thu</p>
            <p className="text-3xl font-black">{new Intl.NumberFormat('vi-VN').format(totalRevenue)}đ</p>
          </div>
          <TrendingUp className="absolute -bottom-4 -right-4 w-32 h-32 text-white opacity-10" />
        </div>
        
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <Calendar className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <p className="text-gray-500 font-medium mb-1">Tổng số đơn hàng</p>
            <p className="text-3xl font-black text-gray-900">{history.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-700">Mã Đơn / Bàn</th>
                <th className="px-6 py-4 font-bold text-gray-700">Thời gian</th>
                <th className="px-6 py-4 font-bold text-gray-700 text-center">Số món</th>
                <th className="px-6 py-4 font-bold text-gray-700 text-right">Tổng tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">Chưa có đơn hàng nào được hoàn thành.</td>
                </tr>
              ) : (
                history.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{order.tableName || 'Mang đi'}</p>
                      <p className="text-xs text-gray-400 font-mono">#{order.id.slice(-6).toUpperCase()}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {order.completedAt ? format(new Date(order.completedAt), 'HH:mm - dd/MM/yyyy', { locale: vi }) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-bold text-center">
                      <span className="bg-gray-100 px-2 py-1 rounded-md">{order.items?.length || 0}</span>
                    </td>
                    <td className="px-6 py-4 font-black text-blue-600 text-right text-lg">
                      {new Intl.NumberFormat('vi-VN').format(order.totalAmount || 0)}đ
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

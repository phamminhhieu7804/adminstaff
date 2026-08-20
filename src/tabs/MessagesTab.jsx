import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { useUI } from '../contexts/UIContext';
import { db } from '../lib/firebase';
import { Send, Users, User } from 'lucide-react';
import { useStore } from '../StoreContext';

export default function MessagesTab() {
  const { t } = useTranslation();
  const { storeId } = useStore();
  const { showToast } = useUI();
  const [employees, setEmployees] = useState([]);
  const [msgType, setMsgType] = useState('all'); // 'all' or 'individual'
  const [targetEmp, setTargetEmp] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchEmps = async () => {
      const snap = await getDocs(collection(db, 'stores', storeId, 'employees'));
      setEmployees(snap.docs.map(d => ({ ...d.data() })).filter(e => e.employeeCode));
    };
    if (storeId) fetchEmps();
  }, [storeId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (msgType === 'individual' && !targetEmp) {
      showToast('Vui lòng chọn nhân viên', 'error');
      return;
    }

    setIsSending(true);
    try {
      if (msgType === 'all') {
        const batch = employees.map(emp => 
          addDoc(collection(db, 'stores', storeId, 'notifications'), {
            employeeCode: emp.employeeCode,
            title: 'Thông báo từ Quản lý',
            message: message.trim(),
            type: 'info',
            read: false,
            createdAt: new Date().toISOString(),
            timestamp: serverTimestamp()
          })
        );
        await Promise.all(batch);
      } else {
        await addDoc(collection(db, 'stores', storeId, 'notifications'), {
          employeeCode: targetEmp,
          title: 'Thông báo từ Quản lý',
          message: message.trim(),
          type: 'info',
          read: false,
          createdAt: new Date().toISOString(),
          timestamp: serverTimestamp()
        });
      }
      showToast('Đã gửi thông báo thành công!', 'success');
      setMessage('');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi gửi thông báo', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Tin nhắn</h2>
        <p className="text-gray-500 mt-1">Gửi thông báo đến nhân viên trong cửa hàng</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => setMsgType('all')}
            className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${msgType === 'all' ? 'bg-blue-50 text-blue-700 border-2 border-blue-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
          >
            <Users className="w-5 h-5" /> Nhắn tin chung
          </button>
          <button 
            onClick={() => setMsgType('individual')}
            className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${msgType === 'individual' ? 'bg-blue-50 text-blue-700 border-2 border-blue-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
          >
            <User className="w-5 h-5" /> Nhắn tin riêng
          </button>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          {msgType === 'individual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chọn nhân viên *</label>
              <select
                value={targetEmp}
                onChange={e => setTargetEmp(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                required={msgType === 'individual'}
              >
                <option value="">-- Chọn nhân viên --</option>
                {employees.map(emp => (
                  <option key={emp.employeeCode} value={emp.employeeCode}>
                    {emp.fullName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung tin nhắn *</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 resize-none"
              placeholder="Nhập nội dung thông báo..."
              required
            ></textarea>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSending || !message.trim() || (msgType === 'individual' && !targetEmp)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
              {isSending ? 'Đang gửi...' : 'Gửi tin nhắn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

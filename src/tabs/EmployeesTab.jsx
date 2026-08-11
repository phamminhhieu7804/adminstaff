import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, getDoc, setDoc, deleteDoc, where, updateDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { useUI } from '../contexts/UIContext';
import { db } from '../lib/firebase';
import { Plus, Edit2, Trash2, Search, X, CheckCircle2, TrendingUp, TrendingDown, Lock, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useStore } from '../StoreContext';

const initialFormState = {
  employeeCode: '',
  fullName: '',
  hometown: '',
  idCardNumber: '',
  salaryType: 'HOURLY',
  salaryRate: '',
  bankName: '',
  bankAccount: '',
  position: '',
  isLocked: false
};

export default function EmployeesTab() {
  const { storeId, storeData } = useStore();
  const isPro = storeData?.packageType === 'Pro';
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [formData, setFormData] = useState(initialFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ type: 'increase', amount: '', salaryType: 'HOURLY', reason: '' });
  
  const { showToast, showConfirm } = useUI();
  
  // Lock Employee Modal
  const [lockEmpModal, setLockEmpModal] = useState({ show: false, employeeCode: '', employeeName: '', note: '' });

  const fetchEmployees = async () => {
    if (!storeId) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'employees'), where('storeId', '==', storeId));
      const querySnapshot = await getDocs(q);
      const empList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEmployees(empList);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [storeId]);

  const handleOpenModal = (mode, employee = null) => {
    setModalMode(mode);
    if (mode === 'edit' && employee) {
      setFormData(employee);
    } else {
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
  };


  const handleOpenAdjustModal = (emp) => {
    setAdjustTarget(emp);
    setAdjustForm({ type: 'increase', amount: emp.salaryRate, salaryType: emp.salaryType, reason: '' });
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const amount = Number(adjustForm.amount);
      const nowStr = new Date().toISOString();
      const currentPeriod = format(new Date(), 'yyyy-MM');
      const payslipDocId = `${storeId}_${adjustTarget.employeeCode}_${currentPeriod}`;
      
      if (adjustForm.type === 'increase') {
        const docRef = doc(db, 'employees', adjustTarget.employeeCode);
        await setDoc(docRef, { salaryType: adjustForm.salaryType, salaryRate: amount, storeId }, { merge: true });
        
        await addDoc(collection(db, 'salary_adjustments'), {
          storeId, employeeCode: adjustTarget.employeeCode, type: 'increase',
          amount, salaryType: adjustForm.salaryType, oldRate: adjustTarget.salaryRate,
          createdAt: nowStr, timestamp: serverTimestamp()
        });

        await addDoc(collection(db, 'notifications'), {
          employeeCode: adjustTarget.employeeCode, type: 'salary_increase',
          title: 'Cập Nhật Lương Cơ Bản',
          message: `Mức lương của bạn đã được quản lý cập nhật thành ${new Intl.NumberFormat('vi-VN').format(amount)}đ (${adjustForm.salaryType === 'HOURLY' ? 'Theo giờ' : adjustForm.salaryType === 'DAILY' ? 'Theo ngày' : 'Theo tháng'}).`,
          read: false, createdAt: nowStr, timestamp: serverTimestamp(), storeId
        });
      } else if (adjustForm.type === 'bonus') {
        await setDoc(doc(db, 'payslips', payslipDocId), { storeId, employeeCode: adjustTarget.employeeCode, period: currentPeriod, bonus: increment(amount), updatedAt: nowStr }, { merge: true });
        
        await addDoc(collection(db, 'salary_adjustments'), {
          storeId, employeeCode: adjustTarget.employeeCode, type: 'bonus',
          amount, reason: adjustForm.reason, createdAt: nowStr, timestamp: serverTimestamp()
        });

        await addDoc(collection(db, 'notifications'), {
          employeeCode: adjustTarget.employeeCode, type: 'salary_bonus',
          title: 'Nhận Thưởng',
          message: `Bạn được thưởng ${new Intl.NumberFormat('vi-VN').format(amount)}đ. Lý do: ${adjustForm.reason || 'Không có ghi chú'}`,
          read: false, createdAt: nowStr, timestamp: serverTimestamp(), storeId
        });
      } else if (adjustForm.type === 'decrease') {
        await setDoc(doc(db, 'payslips', payslipDocId), { storeId, employeeCode: adjustTarget.employeeCode, period: currentPeriod, deduction: increment(amount), updatedAt: nowStr }, { merge: true });
        
        await addDoc(collection(db, 'salary_adjustments'), {
          storeId, employeeCode: adjustTarget.employeeCode, type: 'decrease',
          amount, reason: adjustForm.reason, createdAt: nowStr, timestamp: serverTimestamp()
        });
        
        await addDoc(collection(db, 'notifications'), {
          employeeCode: adjustTarget.employeeCode, type: 'salary_decrease',
          title: 'Thông Báo Phạt / Trừ Lương',
          message: `Bạn bị trừ ${new Intl.NumberFormat('vi-VN').format(amount)}đ vào lương tháng này. Lý do: ${adjustForm.reason}`,
          read: false, createdAt: nowStr, timestamp: serverTimestamp(), storeId
        });
      }
      
      showToast('Thao tác thành công!');
      setIsAdjustModalOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi điều chỉnh lương.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const empData = {
        ...formData,
        salaryRate: Number(formData.salaryRate),
        storeId
      };
      
      if (modalMode === 'edit') {
         const oldEmp = employees.find(emp => emp.employeeCode === empData.employeeCode);
         if (oldEmp && oldEmp.position !== empData.position && empData.position) {
             await addDoc(collection(db, 'notifications'), {
               employeeCode: empData.employeeCode,
               title: 'Cập Nhật Chức Vụ',
               message: `Bạn đã được quản lý phong chức vụ mới: ${empData.position}`,
               type: 'info',
               read: false,
               createdAt: new Date().toISOString(),
               timestamp: serverTimestamp(),
               storeId
             });
         }
      }

      // Use employeeCode as document ID
      const docRef = doc(db, 'employees', empData.employeeCode);
      await setDoc(docRef, empData);
      
      showToast(modalMode === 'add' ? 'Thêm nhân viên thành công!' : 'Cập nhật nhân viên thành công!');
      handleCloseModal();
      fetchEmployees(); // Refresh list
    } catch (error) {
      console.error("Error saving employee:", error);
      showToast('Có lỗi xảy ra khi lưu thông tin.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (employeeCode) => {
    showConfirm(
      'Xóa nhân viên',
      'Bạn có chắc chắn muốn xóa nhân viên này và toàn bộ dữ liệu liên quan? Dữ liệu không thể khôi phục.',
      async () => {
        try {
          setIsSubmitting(true);
          // 1. Delete employee document
          await deleteDoc(doc(db, 'employees', employeeCode));
          
          // 2. Cascade delete related records
          const collectionsToClean = ['attendance_logs', 'payslips', 'advance_requests', 'leave_requests', 'notifications'];
          for (const col of collectionsToClean) {
            const q = query(collection(db, col), where('employeeCode', '==', employeeCode));
            const snap = await getDocs(q);
            await Promise.all(snap.docs.map(d => deleteDoc(doc(db, col, d.id))));
          }

          // 3. Remove from all shifts
          const shiftsSnap = await getDocs(collection(db, 'shifts'));
          const updateShiftPromises = shiftsSnap.docs.map(async (shiftDoc) => {
             const shiftData = shiftDoc.data();
             if (shiftData.employees && shiftData.employees.includes(employeeCode)) {
                const newEmployees = shiftData.employees.filter(e => e !== employeeCode);
                return updateDoc(doc(db, 'shifts', shiftDoc.id), { employees: newEmployees });
             }
          });
          await Promise.all(updateShiftPromises);

          showToast('Đã xóa nhân viên và dọn dẹp toàn bộ dữ liệu lịch sử.');
          fetchEmployees(); // Refresh list
        } catch (error) {
          console.error("Error deleting employee:", error);
          showToast('Có lỗi xảy ra khi xóa.', 'error');
        } finally {
          setIsSubmitting(false);
        }
      },
      'Đồng ý xóa',
      'Hủy'
    );
  };

  const handleToggleLock = async (employeeCode, currentStatus) => {
    if (!currentStatus) return;
    try {
      await setDoc(doc(db, 'employees', employeeCode), { isLocked: false, failedAttempts: 0, lockedUntil: null }, { merge: true });
      showToast('Đã mở khóa tài khoản nhân viên!');
      fetchEmployees();
    } catch (error) {
      console.error("Error toggling lock:", error);
      showToast('Có lỗi xảy ra khi mở khóa.', 'error');
    }
  };

  const handleLockEmployee = async (e) => {
    e.preventDefault();
    if (!lockEmpModal.note.trim()) return;
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'employees', lockEmpModal.employeeCode), {
        isLocked: true,
        lockReason: lockEmpModal.note.trim()
      }, { merge: true });
      showToast('Đã khóa tài khoản nhân viên.');
      setLockEmpModal({ show: false, employeeCode: '', employeeName: '', note: '' });
      fetchEmployees();
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi khóa.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản Lý Nhân Sự</h2>
          <p className="text-gray-500 mt-1">Danh sách thông tin nhân viên và mức lương.</p>
        </div>
        <button
          onClick={() => handleOpenModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Thêm Nhân Viên
        </button>
      </div>



      {/* Filter Bar */}
      <div className="mb-6 flex">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Tìm kiếm theo Tên hoặc Mã NV..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NV</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và Tên</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chức vụ</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quê Quán</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CCCD</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hình thức lương</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mức lương</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngân hàng</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    Không tìm thấy nhân viên nào.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.employeeCode} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{emp.employeeCode}</td>
                    <td className={cn("px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-2", emp.isLocked ? "text-red-600" : "text-gray-900")}>
                      {!emp.isLocked ? (
                        <span 
                          onClick={() => setLockEmpModal({ show: true, employeeCode: emp.employeeCode, employeeName: emp.fullName, note: '' })}
                          className="cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                          title="Bấm để khóa tài khoản"
                        >
                          {emp.fullName}
                        </span>
                      ) : (
                        <span>{emp.fullName}</span>
                      )}
                      
                      {emp.isLocked && (
                        <button 
                          onClick={() => handleToggleLock(emp.employeeCode, emp.isLocked)} 
                          className="p-1 hover:bg-red-100 rounded-full text-red-600 transition-colors cursor-pointer" 
                          title="Mở khóa tài khoản"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                       {emp.position ? <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{emp.position}</span> : <span className="text-gray-400 italic">Nhân viên</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.hometown}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.idCardNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium",
                        emp.salaryType === 'HOURLY' ? "bg-purple-100 text-purple-800" :
                        emp.salaryType === 'DAILY' ? "bg-blue-100 text-blue-800" :
                        "bg-amber-100 text-amber-800"
                      )}>
                        {emp.salaryType === 'HOURLY' ? 'Theo giờ' : emp.salaryType === 'DAILY' ? 'Theo ngày' : 'Theo tháng'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(emp.salaryRate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {emp.bankName ? <div className="flex flex-col"><span className="font-semibold text-gray-700">{emp.bankName}</span><span>{emp.bankAccount}</span></div> : <span className="italic text-gray-400">Chưa có</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                       {emp.isLocked ? (
                         <button onClick={() => handleToggleLock(emp.employeeCode, emp.isLocked)} className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors">Bị khóa (Nhấn mở)</button>
                       ) : (
                         <div className="flex items-center gap-1.5">
                           <span className={cn("relative flex h-2.5 w-2.5", emp.isOnline ? "text-green-500" : "text-gray-400")}>
                             {emp.isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                             <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", emp.isOnline ? "bg-green-500" : "bg-gray-400")}></span>
                           </span>
                           <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", emp.isOnline ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-50 text-gray-600 border border-gray-200")}>
                             {emp.isOnline ? 'Hoạt động' : 'Offline'}
                           </span>
                         </div>
                       )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-3">
                      <button 
                        onClick={() => handleOpenAdjustModal(emp)}
                        className="text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      >
                        <TrendingUp className="w-4 h-4" /> Điều chỉnh lương
                      </button>
                      <button 
                        onClick={() => handleOpenModal('edit', emp)}
                        className="text-blue-600 hover:text-blue-900 p-1.5"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.employeeCode)}
                        className="text-red-600 hover:text-red-900 p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {modalMode === 'add' ? 'Thêm Nhân Viên Mới' : 'Cập Nhật Nhân Viên'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại (Mã PIN) *</label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="VD: 0901234567"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({...formData, employeeCode: e.target.value})}
                  />
                  {modalMode === 'add' && <p className="text-xs text-gray-500 mt-1">Dùng để nhân viên đăng nhập điểm danh.</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Nguyễn Văn A"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="VD: Quản lý, Pha chế..."
                    value={formData.position || ''}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số CCCD</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="0123456789"
                    value={formData.idCardNumber}
                    onChange={(e) => setFormData({...formData, idCardNumber: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quê Quán</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="TP.HCM"
                    value={formData.hometown}
                    onChange={(e) => setFormData({...formData, hometown: e.target.value})}
                  />
                </div>
                
                <div className="relative">
                  {!isPro && (
                    <div className="absolute inset-0 bg-gray-100/60 z-10 rounded-lg flex items-center justify-center cursor-not-allowed">
                      <Lock className="w-4 h-4 text-gray-400 mr-1" /><span className="text-xs text-gray-400 font-bold">Pro</span>
                    </div>
                  )}
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức trả lương *</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                    value={formData.salaryType}
                    onChange={(e) => setFormData({...formData, salaryType: e.target.value})}
                    disabled={!isPro}
                  >
                    <option value="HOURLY">Theo giờ (HOURLY)</option>
                    <option value="DAILY">Theo ngày (DAILY)</option>
                    <option value="MONTHLY">Theo tháng (MONTHLY)</option>
                  </select>
                </div>
                
                <div className="relative">
                  {!isPro && (
                    <div className="absolute inset-0 bg-gray-100/60 z-10 rounded-lg flex items-center justify-center cursor-not-allowed">
                      <Lock className="w-4 h-4 text-gray-400 mr-1" /><span className="text-xs text-gray-400 font-bold">Pro</span>
                    </div>
                  )}
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mức lương (VNĐ) *</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-12"
                      placeholder="VD: 25.000"
                      value={formData.salaryRate ? new Intl.NumberFormat('vi-VN').format(formData.salaryRate) : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setFormData({...formData, salaryRate: raw ? Number(raw) : ''});
                      }}
                      disabled={!isPro}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 font-medium">
                      đ
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-100 relative">
                   {!isPro && (
                     <div className="absolute inset-0 bg-gray-100/60 z-10 rounded-lg flex items-center justify-center cursor-not-allowed">
                       <Lock className="w-4 h-4 text-gray-400 mr-1" /><span className="text-xs text-gray-400 font-bold">Pro</span>
                     </div>
                   )}
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Tên Ngân Hàng</label>
                     <input
                       type="text"
                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                       placeholder="VD: Vietcombank"
                       value={formData.bankName || ''}
                       onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                       disabled={!isPro}
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Số Tài Khoản</label>
                     <input
                       type="text"
                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                       placeholder="VD: 0123456789"
                       value={formData.bankAccount || ''}
                       onChange={(e) => setFormData({...formData, bankAccount: e.target.value})}
                       disabled={!isPro}
                     />
                   </div>
                   
                   {modalMode === 'edit' && (
                     <div className="md:col-span-2 pt-2">
                       <label className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 text-red-600 rounded border-red-300 focus:ring-red-500 focus:ring-2"
                            checked={formData.isLocked || false}
                            onChange={(e) => setFormData({...formData, isLocked: e.target.checked})}
                          />
                          <div>
                            <p className="font-semibold text-red-800 text-sm">Tạm khóa tài khoản</p>
                            <p className="text-xs text-red-600 mt-0.5">Nhân viên sẽ bị đăng xuất và không thể đăng nhập cho đến khi được mở khóa.</p>
                          </div>
                       </label>
                     </div>
                   )}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-white font-medium bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : null}
                  {modalMode === 'add' ? 'Lưu Nhân Viên' : 'Cập Nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Adjust Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Điều Chỉnh Lương
              </h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAdjustSubmit} className="p-6">
              <div className="flex gap-2 mb-6">
                 <button type="button" onClick={() => setAdjustForm({...adjustForm, type: 'increase', reason: ''})} className={cn("flex-1 py-2 px-2 text-sm rounded-lg font-medium flex items-center justify-center gap-1 border-2 transition-all", adjustForm.type === 'increase' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-500")}>
                    <TrendingUp className="w-4 h-4"/> Tăng Lương
                 </button>
                 <button type="button" onClick={() => setAdjustForm({...adjustForm, type: 'bonus', reason: ''})} className={cn("flex-1 py-2 px-2 text-sm rounded-lg font-medium flex items-center justify-center gap-1 border-2 transition-all", adjustForm.type === 'bonus' ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500")}>
                    <Gift className="w-4 h-4"/> Thưởng
                 </button>
                 <button type="button" onClick={() => setAdjustForm({...adjustForm, type: 'decrease', reason: ''})} className={cn("flex-1 py-2 px-2 text-sm rounded-lg font-medium flex items-center justify-center gap-1 border-2 transition-all", adjustForm.type === 'decrease' ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-500")}>
                    <TrendingDown className="w-4 h-4"/> Trừ Lương
                 </button>
              </div>

              <div className="space-y-4">
                 {adjustForm.type === 'increase' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-sm mb-4">
                       <p className="font-semibold mb-1">Cập nhật Lương Cơ Bản</p>
                       <p>Lương hiện tại: <b>{new Intl.NumberFormat('vi-VN').format(adjustTarget?.salaryRate)}đ</b> ({adjustTarget?.salaryType}). Hành động này sẽ thay đổi vĩnh viễn hình thức và mức lương gốc.</p>
                    </div>
                 )}
                 {adjustForm.type === 'bonus' && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-blue-800 text-sm mb-4">
                       <p className="font-semibold mb-1">Thưởng nóng</p>
                       <p>Số tiền này sẽ được <b>cộng thêm</b> vào phiếu lương tháng hiện tại của <b>{adjustTarget?.fullName}</b>.</p>
                    </div>
                 )}
                 {adjustForm.type === 'decrease' && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-800 text-sm mb-4">
                       <p className="font-semibold mb-1">Tạo phiếu phạt</p>
                       <p>Số tiền này sẽ được <b>khấu trừ</b> trực tiếp vào Tiền Lương Thực Nhận trong tháng này.</p>
                    </div>
                 )}

                 {adjustForm.type === 'increase' && (
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Hình thức trả lương mới</label>
                     <select
                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                       value={adjustForm.salaryType}
                       onChange={(e) => setAdjustForm({...adjustForm, salaryType: e.target.value})}
                     >
                       <option value="HOURLY">Theo giờ (HOURLY)</option>
                       <option value="DAILY">Theo ngày (DAILY)</option>
                       <option value="MONTHLY">Theo tháng (MONTHLY)</option>
                     </select>
                   </div>
                 )}

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">{adjustForm.type === 'increase' ? 'Mức lương mới (VNĐ)' : adjustForm.type === 'bonus' ? 'Số tiền thưởng (VNĐ)' : 'Số tiền phạt (VNĐ)'}</label>
                   <div className="relative">
                     <input
                       type="text"
                       inputMode="numeric"
                       required
                       className={cn("w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 outline-none transition-all pr-12 font-bold text-lg", adjustForm.type === 'increase' ? "focus:ring-emerald-500 focus:border-emerald-500 text-emerald-700" : adjustForm.type === 'bonus' ? "focus:ring-blue-500 focus:border-blue-500 text-blue-700" : "focus:ring-red-500 focus:border-red-500 text-red-700")}
                       placeholder={adjustForm.type === 'increase' ? "VD: 30000" : "VD: 50000"}
                       value={adjustForm.amount ? new Intl.NumberFormat('vi-VN').format(adjustForm.amount) : ''}
                       onChange={(e) => {
                         const raw = e.target.value.replace(/\D/g, '');
                         setAdjustForm({...adjustForm, amount: raw ? Number(raw) : ''});
                       }}
                     />
                     <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 font-medium">đ</div>
                   </div>
                 </div>

                 {(adjustForm.type === 'decrease' || adjustForm.type === 'bonus') && (
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Lý do / Ghi chú</label>
                     <textarea
                       required={adjustForm.type === 'decrease'}
                       rows="2"
                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                       placeholder={adjustForm.type === 'decrease' ? "VD: Đi trễ, làm hỏng đồ..." : "VD: Làm tốt, đạt doanh thu..."}
                       value={adjustForm.reason}
                       onChange={(e) => setAdjustForm({...adjustForm, reason: e.target.value})}
                     ></textarea>
                   </div>
                 )}
              </div>
              
              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-5 py-2.5 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn("px-5 py-2.5 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed", adjustForm.type === 'increase' ? "bg-emerald-600 hover:bg-emerald-700" : adjustForm.type === 'bonus' ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700")}
                >
                  {isSubmitting ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : null}
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lock Employee Modal */}
      {lockEmpModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-red-50">
                 <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                   <Lock className="w-5 h-5" /> Khóa tài khoản
                 </h3>
                 <button onClick={() => setLockEmpModal({ show: false, employeeCode: '', employeeName: '', note: '' })} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded border shadow-sm"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleLockEmployee} className="p-4">
                 <p className="text-sm text-gray-600 mb-4">
                   Bạn đang <strong>khóa tài khoản</strong> của nhân viên <span className="font-bold text-gray-900">{lockEmpModal.employeeName}</span>.
                 </p>
                 <div className="mb-4">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú / Lý do khóa <span className="text-red-500">*</span></label>
                   <textarea
                     required
                     rows={3}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-red-500 text-sm"
                     placeholder="VD: Vi phạm quy định..."
                     value={lockEmpModal.note}
                     onChange={(e) => setLockEmpModal(prev => ({ ...prev, note: e.target.value }))}
                   />
                 </div>
                 <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setLockEmpModal({ show: false, employeeCode: '', employeeName: '', note: '' })} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
                    <button type="submit" disabled={isSubmitting || !lockEmpModal.note.trim()} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                      Xác nhận Khóa
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

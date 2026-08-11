import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Edit2, Trash2, X, CheckCircle2, Clock, CalendarDays, ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';
import { cn } from '../lib/utils';
import { startOfWeek, addDays, subDays, format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useUI } from '../contexts/UIContext';

export default function ShiftsTab() {
  const [shifts, setShifts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [storeSettings, setStoreSettings] = useState({});
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { showToast, showConfirm } = useUI();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [formData, setFormData] = useState({ id: '', name: '', startTime: '', endTime: '', latePenalty: '', enableOvertime: false, overtimeRate: '', maxEmployees: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Assign Modal
  const [assignModal, setAssignModal] = useState({ show: false, date: null, shift: null, cellSchedules: [] });
  const [selectedEmpCode, setSelectedEmpCode] = useState('');
  
  // Lock Employee Modal
  const [lockEmpModal, setLockEmpModal] = useState({ show: false, scheduleId: null, employeeCode: '', employeeName: '', note: '' });

  // Fetch Core Data
  useEffect(() => {
    const unShifts = onSnapshot(collection(db, 'shifts'), (snap) => {
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unEmp = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unSettings = onSnapshot(doc(db, 'store_settings', 'default'), (docSnap) => {
      if (docSnap.exists()) setStoreSettings(docSnap.data());
    });

    setIsLoading(false);
    return () => { unShifts(); unEmp(); unSettings(); };
  }, []);

  // Fetch Schedules for current week
  useEffect(() => {
    const startStr = format(currentWeek, 'yyyy-MM-dd');
    const endStr = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
    
    const q = query(collection(db, 'schedules'), where('date', '>=', startStr), where('date', '<=', endStr));
    const unSchedules = onSnapshot(q, (snap) => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    return () => unSchedules();
  }, [currentWeek]);

  // Update assignModal cellSchedules automatically when schedules change
  useEffect(() => {
     if (assignModal.show && assignModal.date && assignModal.shift) {
        const updatedCell = schedules.filter(s => s.shiftId === assignModal.shift.id && s.date === assignModal.date);
        setAssignModal(prev => ({ ...prev, cellSchedules: updatedCell }));
     }
  }, [schedules]);


  const handleOpenModal = (mode, shift = null) => {
    setModalMode(mode);
    if (mode === 'edit' && shift) {
      setFormData({
         ...shift,
         latePenalty: shift.latePenalty || '',
         enableOvertime: shift.enableOvertime || false,
         overtimeRate: shift.overtimeRate || '',
         maxEmployees: shift.maxEmployees || 1
      });
    } else {
      setFormData({ id: '', name: '', startTime: '', endTime: '', latePenalty: '', enableOvertime: false, overtimeRate: '', maxEmployees: 1 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const shiftId = modalMode === 'add' ? `shift_${Date.now()}` : formData.id;
      const docRef = doc(db, 'shifts', shiftId);
      
      await setDoc(docRef, {
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        maxEmployees: Number(formData.maxEmployees) || 1,
        latePenalty: Number(formData.latePenalty) || 0,
        enableOvertime: formData.enableOvertime,
        overtimeRate: formData.enableOvertime ? (Number(formData.overtimeRate) || 0) : 0
      });
      
      showToast(modalMode === 'add' ? 'Thêm ca làm thành công!' : 'Cập nhật ca làm thành công!');
      setIsModalOpen(false);
    } catch (error) {
      showToast("Có lỗi xảy ra khi lưu thông tin.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (shiftId) => {
    showConfirm(
      'Xóa ca làm',
      'Bạn có chắc chắn muốn xóa ca làm này?',
      async () => {
        try { await deleteDoc(doc(db, 'shifts', shiftId)); showToast('Đã xóa ca làm.'); } 
        catch (error) { showToast("Có lỗi xảy ra khi xóa.", "error"); }
      }
    );
  };

  const handleDeleteSchedule = (id) => {
    showConfirm(
      'Xóa nhân viên khỏi ca',
      'Bạn có chắc muốn xóa nhân viên khỏi ca này?',
      async () => {
        try {
          await deleteDoc(doc(db, 'schedules', id));
          showToast('Đã xóa xếp ca.');
        } catch (error) {
          console.error("Error deleting schedule: ", error);
          showToast('Có lỗi xảy ra', 'error');
        }
      }
    );
  };

  const handleLockEmployee = async (e) => {
    e.preventDefault();
    if (!lockEmpModal.note.trim()) return;
    setIsSubmitting(true);
    try {
      // 1. Delete schedule
      if (lockEmpModal.scheduleId) {
        await deleteDoc(doc(db, 'schedules', lockEmpModal.scheduleId));
      }
      
      // 2. Update employee to locked
      await updateDoc(doc(db, 'employees', lockEmpModal.employeeCode), {
        isLocked: true,
        lockReason: lockEmpModal.note.trim()
      });
      
      showToast('Đã xóa ca và khóa tài khoản nhân viên.');
      setLockEmpModal({ show: false, scheduleId: null, employeeCode: '', employeeName: '', note: '' });
      // We don't close assignModal so they can see the person is removed
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi khóa.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [regModal, setRegModal] = useState(false);
  const [regForm, setRegForm] = useState({
     registrationMode: 'manual',
     allowShiftRegistration: false,
     weeklyOpenDay: 4,
     weeklyCloseDay: 6
  });

  const getRegistrationStatus = () => {
      const mode = storeSettings.registrationMode || 'manual';
      if (mode === 'manual') {
          return {
             isOpen: storeSettings.allowShiftRegistration,
             label: storeSettings.allowShiftRegistration ? 'Đang Mở Đăng Ký Ca' : 'Đã Khóa Đăng Ký Ca'
          };
      }
      
      const openDay = storeSettings.weeklyOpenDay || 4;
      const closeDay = storeSettings.weeklyCloseDay || 6;
      let currentDay = new Date().getDay();
      if (currentDay === 0) currentDay = 7;
      
      let isOpen = false;
      if (openDay <= closeDay) {
          isOpen = currentDay >= openDay && currentDay <= closeDay;
      } else {
          isOpen = currentDay >= openDay || currentDay <= closeDay;
      }
      
      const dayNames = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
      return {
          isOpen,
          label: isOpen ? `Đang Mở (${dayNames[openDay]} - ${dayNames[closeDay]})` : `Đã Khóa (${dayNames[openDay]} - ${dayNames[closeDay]})`
      };
  };

  const regStatus = getRegistrationStatus();

  const openRegModal = () => {
     setRegForm({
        registrationMode: storeSettings.registrationMode || 'manual',
        allowShiftRegistration: storeSettings.allowShiftRegistration || false,
        weeklyOpenDay: storeSettings.weeklyOpenDay || 4,
        weeklyCloseDay: storeSettings.weeklyCloseDay || 6
     });
     setRegModal(true);
  };

  const saveRegSettings = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'store_settings', 'default'), {
        registrationMode: regForm.registrationMode,
        allowShiftRegistration: regForm.allowShiftRegistration,
        weeklyOpenDay: Number(regForm.weeklyOpenDay),
        weeklyCloseDay: Number(regForm.weeklyCloseDay)
      }, { merge: true });
      showToast('Cập nhật cấu hình đăng ký ca thành công!');
      setRegModal(false);
    } catch (e) {
      showToast("Không thể cập nhật cấu hình.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedEmpCode || !assignModal.date || !assignModal.shift) return;
    const emp = employees.find(e => e.employeeCode === selectedEmpCode);
    if (!emp) return;
    
    try {
      await addDoc(collection(db, 'schedules'), {
        date: assignModal.date,
        shiftId: assignModal.shift.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        assignedBy: 'admin',
        createdAt: new Date().toISOString()
      });
      showToast('Đã thêm nhân viên vào ca!');
      setSelectedEmpCode('');
    } catch (e) {
      showToast("Lỗi khi thêm lịch", "error");
    }
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));

  return (
    <div className="h-full flex flex-col relative space-y-8 overflow-y-auto">

      {/* SCHEDULE CALENDAR SECTION */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Lên Lịch Làm Việc</h2>
          <p className="text-gray-500 mt-1">Xếp ca làm cho nhân viên hoặc mở để nhân viên tự đăng ký.</p>
        </div>
        
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-gray-200 bg-gray-50 gap-4">
             <div className="flex items-center gap-4">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-blue-600"/> Lịch Tuần</h3>
                <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg shadow-sm px-1 py-1">
                   <button onClick={() => setCurrentWeek(subDays(currentWeek, 7))} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronLeft className="w-5 h-5"/></button>
                   <span className="font-semibold text-sm px-2">{format(weekDays[0], 'dd/MM')} - {format(weekDays[6], 'dd/MM/yyyy')}</span>
                   <button onClick={() => setCurrentWeek(addDays(currentWeek, 7))} className="p-1 hover:bg-gray-100 rounded text-gray-600"><ChevronRight className="w-5 h-5"/></button>
                </div>
             </div>
             <button onClick={openRegModal} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95", regStatus.isOpen ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300" : "bg-red-100 text-red-700 hover:bg-red-200 border border-red-300")}>
               {regStatus.isOpen ? <Unlock className="w-4 h-4"/> : <Lock className="w-4 h-4"/>}
               {regStatus.label}
             </button>
          </div>
          
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
             <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 border-r border-gray-200">Ca \ Ngày</th>
                  {weekDays.map(day => (
                     <th key={day.toISOString()} className={cn("px-2 py-3 text-center text-xs border-r border-gray-200 w-32", format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "bg-blue-50 text-blue-700" : "text-gray-900")}>
                       <div className="font-bold uppercase">{format(day, 'EEEE', {locale: vi})}</div>
                       <div className={cn("font-medium", format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? "text-blue-600" : "text-gray-500")}>{format(day, 'dd/MM')}</div>
                     </th>
                  ))}
                </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
                {shifts.map(shift => (
                   <tr key={shift.id}>
                     <td className="px-3 py-3 border-r border-gray-200 bg-gray-50 align-top">
                       <div className="font-bold text-sm text-gray-900 leading-tight mb-1">{shift.name}</div>
                       <div className="text-xs text-gray-500 font-medium mb-1"><Clock className="w-3 h-3 inline mr-1"/>{shift.startTime}-{shift.endTime}</div>
                       <div className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-medium inline-block">Tối đa: {shift.maxEmployees || 1}</div>
                     </td>
                     {weekDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const cellSchedules = schedules.filter(s => s.shiftId === shift.id && s.date === dateStr);
                        const isFull = cellSchedules.length >= (shift.maxEmployees || 1);
                        return (
                          <td key={dateStr} className="p-1 border-r border-gray-200 align-top relative group min-h-[90px] h-[90px]">
                             <div className="absolute inset-0 p-1.5 overflow-y-auto">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded w-full text-center border", isFull ? "bg-red-50 text-red-700 border-red-200" : (cellSchedules.length > 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-transparent"))}>
                                     {cellSchedules.length} / {shift.maxEmployees || 1}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {cellSchedules.map(sch => (
                                    <div key={sch.id} className="text-[11px] font-medium bg-blue-50 text-blue-700 px-1.5 py-1 rounded border border-blue-100 leading-tight truncate" title={sch.employeeName}>
                                      {sch.employeeName}
                                    </div>
                                  ))}
                                </div>
                             </div>
                             <button onClick={() => setAssignModal({ show: true, date: dateStr, shift, cellSchedules })} className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 bg-gray-900/5 hover:bg-gray-900/10 transition-all flex items-center justify-center cursor-pointer z-10">
                                <Edit2 className="w-6 h-6 text-blue-600 opacity-60 bg-white p-1 rounded-md shadow-sm" />
                             </button>
                          </td>
                        );
                     })}
                   </tr>
                ))}
             </tbody>
          </table>
        </div>
      </div>

      {/* SHIFT DEFINITION SECTION */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Danh Sách Ca Làm</h2>
            <p className="text-gray-500 mt-1">Thiết lập các ca làm việc cho nhân viên.</p>
          </div>
          <button
            onClick={() => handleOpenModal('add')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Thêm Ca Làm
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Ca Làm</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Giới hạn NV</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thiết lập thêm</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : shifts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      Chưa có ca làm nào được thiết lập.
                    </td>
                  </tr>
                ) : (
                  shifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{shift.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                        {shift.startTime} - {shift.endTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-blue-600">
                        {shift.maxEmployees || 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-col gap-1.5">
                          {shift.latePenalty > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-md w-max">Phạt trễ: {new Intl.NumberFormat('vi-VN').format(shift.latePenalty)}đ</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md w-max">Không phạt trễ</span>
                          )}
                          {shift.enableOvertime ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-max">Tăng ca: {new Intl.NumberFormat('vi-VN').format(shift.overtimeRate)}đ/h</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md w-max">Không tính tăng ca</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleOpenModal('edit', shift)} className="text-blue-600 hover:text-blue-900 mr-4 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(shift.id)} className="text-red-600 hover:text-red-900 p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
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
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">
                {modalMode === 'add' ? 'Thêm Ca Làm Mới' : 'Cập Nhật Ca Làm'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-1 rounded shadow-sm border border-gray-200"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên Ca Làm *</label>
                  <input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="VD: Ca Sáng..." value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giờ bắt đầu *</label>
                    <input type="time" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giờ kết thúc *</label>
                    <input type="time" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giới hạn số nhân viên (Người / Ca) *</label>
                  <input type="number" required min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={formData.maxEmployees} onChange={(e) => setFormData({...formData, maxEmployees: e.target.value})} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phạt đi trễ (VNĐ)</label>
                    <div className="relative">
                      <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none pr-10" placeholder="Trống = 0" value={formData.latePenalty ? new Intl.NumberFormat('vi-VN').format(formData.latePenalty) : ''} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setFormData({...formData, latePenalty: raw ? Number(raw) : ''}); }} />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 font-medium text-sm">đ</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                      Cho phép tăng ca
                      <button type="button" onClick={() => setFormData({...formData, enableOvertime: !formData.enableOvertime})} className={cn("w-10 h-5 rounded-full transition-colors relative", formData.enableOvertime ? "bg-emerald-500" : "bg-gray-300")}>
                         <span className={cn("absolute top-0.5 bg-white w-4 h-4 rounded-full transition-all shadow-sm", formData.enableOvertime ? "left-[22px]" : "left-[2px]")}></span>
                      </button>
                    </label>
                    {formData.enableOvertime && (
                      <div className="relative animate-in slide-in-from-top-1">
                        <input type="text" required className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none pr-12 bg-emerald-50 text-emerald-900" placeholder="Mức lương / 1 giờ" value={formData.overtimeRate ? new Intl.NumberFormat('vi-VN').format(formData.overtimeRate) : ''} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setFormData({...formData, overtimeRate: raw ? Number(raw) : ''}); }} />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-emerald-600 font-medium text-sm">đ/h</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg">Hủy</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-white font-medium bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-70">
                  {isSubmitting && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>}
                  {modalMode === 'add' ? 'Lưu Ca Làm' : 'Cập Nhật'}
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
                 <button onClick={() => setLockEmpModal({ show: false, scheduleId: null, employeeCode: '', employeeName: '', note: '' })} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded border shadow-sm"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleLockEmployee} className="p-4">
                 <p className="text-sm text-gray-600 mb-4">
                   Bạn đang xóa ca và <strong>khóa tài khoản</strong> của nhân viên <span className="font-bold text-gray-900">{lockEmpModal.employeeName}</span>. Nhân viên sẽ bị văng ra khỏi hệ thống ngay lập tức.
                 </p>
                 <div className="mb-4">
                   <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú / Lý do vi phạm <span className="text-red-500">*</span></label>
                   <textarea
                     required
                     rows={3}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-red-500 text-sm"
                     placeholder="VD: Vi phạm quy định giờ giấc..."
                     value={lockEmpModal.note}
                     onChange={(e) => setLockEmpModal(prev => ({ ...prev, note: e.target.value }))}
                   />
                 </div>
                 <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setLockEmpModal({ show: false, scheduleId: null, employeeCode: '', employeeName: '', note: '' })} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
                    <button type="submit" disabled={isSubmitting || !lockEmpModal.note.trim()} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                      Xác nhận Khóa
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                 <h3 className="text-lg font-bold text-gray-900 leading-tight">
                   Xếp ca <span className="text-blue-600">{assignModal.shift.name}</span><br/>
                   <span className="text-sm font-medium text-gray-500">Ngày {format(parseISO(assignModal.date), 'dd/MM/yyyy')}</span>
                 </h3>
                 <button onClick={() => setAssignModal({ show: false, date: null, shift: null, cellSchedules: [] })} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded border shadow-sm"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4">
                 <div className="flex justify-between items-center mb-3">
                    <p className="text-sm text-gray-600 font-medium">Danh sách nhân viên (Tối đa {assignModal.shift.maxEmployees || 1})</p>
                    <span className={cn("text-xs font-bold px-2 py-1 rounded-full border", assignModal.cellSchedules.length >= (assignModal.shift.maxEmployees || 1) ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200")}>
                      Đã chọn: {assignModal.cellSchedules.length}
                    </span>
                 </div>
                 
                 <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                   {assignModal.cellSchedules.length === 0 ? <p className="text-sm text-gray-400 italic text-center py-4 border border-dashed rounded-lg">Chưa có ai đăng ký ca này.</p> : assignModal.cellSchedules.map(sch => (
                      <div key={sch.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                        <div>
                          <span className="text-sm font-bold text-gray-900 block">{sch.employeeName}</span>
                          <span className="text-[10px] text-gray-500 font-medium bg-gray-200 px-1.5 rounded">{sch.employeeCode}</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <button 
                             onClick={() => setLockEmpModal({ show: true, scheduleId: sch.id, employeeCode: sch.employeeCode, employeeName: sch.employeeName, note: '' })} 
                             className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 p-2 rounded-lg transition-colors"
                             title="Xóa khỏi ca và Khóa tài khoản"
                           >
                             <Lock className="w-4 h-4"/>
                           </button>
                           <button 
                             onClick={() => handleDeleteSchedule(sch.id)} 
                             className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                             title="Xóa khỏi ca"
                           >
                             <Trash2 className="w-4 h-4"/>
                           </button>
                        </div>
                      </div>
                   ))}
                 </div>
                 
                 <div className="pt-3 border-t border-gray-200 flex gap-2">
                    <select value={selectedEmpCode} onChange={e => setSelectedEmpCode(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-medium focus:border-blue-500">
                      <option value="">-- Bấm để chọn nhân viên --</option>
                      {employees.filter(e => !assignModal.cellSchedules.some(s => s.employeeCode === e.employeeCode)).map(e => (
                         <option key={e.employeeCode} value={e.employeeCode}>{e.fullName} ({e.employeeCode})</option>
                      ))}
                    </select>
                    <button onClick={handleAddSchedule} disabled={!selectedEmpCode || assignModal.cellSchedules.length >= (assignModal.shift.maxEmployees || 1)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:active:scale-100 active:scale-95 transition-all text-sm shadow-sm">Thêm</button>
                 </div>
              </div>
           </div>
        </div>
      )}
      {/* Registration Settings Modal */}
      {regModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">Cấu hình Đăng ký Ca</h3>
              <button onClick={() => setRegModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveRegSettings} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chế độ Mở/Đóng</label>
                <select
                  value={regForm.registrationMode}
                  onChange={(e) => setRegForm({ ...regForm, registrationMode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="manual">Thủ công (Tự Mở/Khóa bằng tay)</option>
                  <option value="auto">Tự động (Theo ngày trong tuần)</option>
                </select>
              </div>
              
              {regForm.registrationMode === 'manual' && (
                <div className="pt-2">
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={regForm.allowShiftRegistration}
                        onChange={(e) => setRegForm({ ...regForm, allowShiftRegistration: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-800">Đang cho phép đăng ký ca (Mở khóa)</span>
                   </label>
                   <p className="text-xs text-gray-500 mt-1 pl-6">Nhân viên có thể vào app để đăng ký ca làm khi mục này được bật.</p>
                </div>
              )}

              {regForm.registrationMode === 'auto' && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 mt-4">
                   <div className="col-span-2">
                     <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-100">
                       Hệ thống sẽ tự động mở và khóa đăng ký ca hằng tuần theo các ngày bạn chọn. Nhân viên sẽ đăng ký cho <b>tuần làm việc tiếp theo</b>.
                     </p>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mở vào thứ</label>
                      <select
                        value={regForm.weeklyOpenDay}
                        onChange={(e) => setRegForm({ ...regForm, weeklyOpenDay: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="1">Thứ 2</option>
                        <option value="2">Thứ 3</option>
                        <option value="3">Thứ 4</option>
                        <option value="4">Thứ 5</option>
                        <option value="5">Thứ 6</option>
                        <option value="6">Thứ 7</option>
                        <option value="7">Chủ nhật</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Đóng vào thứ</label>
                      <select
                        value={regForm.weeklyCloseDay}
                        onChange={(e) => setRegForm({ ...regForm, weeklyCloseDay: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="1">Thứ 2</option>
                        <option value="2">Thứ 3</option>
                        <option value="3">Thứ 4</option>
                        <option value="4">Thứ 5</option>
                        <option value="5">Thứ 6</option>
                        <option value="6">Thứ 7</option>
                        <option value="7">Chủ nhật</option>
                      </select>
                   </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setRegModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Hủy</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

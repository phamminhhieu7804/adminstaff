import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, addDoc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Edit2, Trash2, X, CheckCircle2, Clock, CalendarDays, ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';
import { cn } from '../lib/utils';
import { startOfWeek, addDays, subDays, format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useUI } from '../contexts/UIContext';
import { useStore } from '../StoreContext';

export default function ShiftsTab() {
  const { storeId } = useStore();
  const { t } = useTranslation();
  const [shifts, setShifts] = useState([]);
  const [offDays, setOffDays] = useState([]);
  const [offDayForm, setOffDayForm] = useState({ type: 'date', date: '', weekday: '0' });
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
    const unShifts = onSnapshot(collection(db, 'stores', storeId, 'shifts'), (snap) => {
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unOffDays = onSnapshot(collection(db, 'stores', storeId, 'off_days'), (snap) => {
      setOffDays(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unEmp = onSnapshot(collection(db, 'stores', storeId, 'employees'), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unSettings = onSnapshot(doc(db, 'store_settings', 'default'), (docSnap) => {
      if (docSnap.exists()) setStoreSettings(docSnap.data());
    });

    setIsLoading(false);
    return () => { unShifts(); unEmp(); unSettings(); unOffDays(); };
  }, []);

  // Fetch Schedules for current week
  useEffect(() => {
    const startStr = format(currentWeek, 'yyyy-MM-dd');
    const endStr = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
    
    const q = query(collection(db, 'stores', storeId, 'schedules'), where('date', '>=', startStr), where('date', '<=', endStr));
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
      const docRef = doc(db, 'stores', storeId, 'shifts', shiftId);
      
      await setDoc(docRef, {
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        maxEmployees: Number(formData.maxEmployees) || 1,
        latePenalty: Number(formData.latePenalty) || 0,
        enableOvertime: formData.enableOvertime,
        overtimeRate: formData.enableOvertime ? (Number(formData.overtimeRate) || 0) : 0
      });
      
      showToast(modalMode === 'add' ? t('shiftsTab.addSuccess') : t('shiftsTab.updateSuccess'));
      setIsModalOpen(false);
    } catch (error) {
      showToast(t('shiftsTab.saveError'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (shiftId) => {
    showConfirm(
      t('shiftsTab.deleteShiftTitle'),
      t('shiftsTab.deleteShiftConfirm'),
      async () => {
        try { await deleteDoc(doc(db, 'stores', storeId, 'shifts', shiftId)); showToast(t('shiftsTab.deleteShiftSuccess')); } 
        catch (error) { showToast(t('shiftsTab.deleteError'), 'error'); }
      }
    );
  };

  const handleDeleteSchedule = (id) => {
    showConfirm(
      t('shiftsTab.deleteEmpTitle'),
      t('shiftsTab.deleteEmpConfirm'),
      async () => {
        try {
          await deleteDoc(doc(db, 'stores', storeId, 'schedules', id));
          showToast(t('shiftsTab.deleteEmpSuccess'));
        } catch (error) {
          console.error("Error deleting schedule: ", error);
          showToast(t('shiftsTab.error'), 'error');
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
        await deleteDoc(doc(db, 'stores', storeId, 'schedules', lockEmpModal.scheduleId));
      }
      
      // 2. Update employee to locked
      await updateDoc(doc(db, 'stores', storeId, 'employees', lockEmpModal.employeeCode), {
        isLocked: true,
        lockReason: lockEmpModal.note.trim()
      });
      
      showToast(t('shiftsTab.lockEmpSuccess'));
      setLockEmpModal({ show: false, scheduleId: null, employeeCode: '', employeeName: '', note: '' });
      // We don't close assignModal so they can see the person is removed
    } catch (err) {
      console.error(err);
      showToast(t('shiftsTab.lockEmpError'), 'error');
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
             label: storeSettings.allowShiftRegistration ? t('shiftsTab.regOpen') : t('shiftsTab.regClosed')
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
      
      const dayNames = ['', t('shiftsTab.day2'), t('shiftsTab.day3'), t('shiftsTab.day4'), t('shiftsTab.day5'), t('shiftsTab.day6'), t('shiftsTab.day7'), t('shiftsTab.day8')];
      return {
          isOpen,
          label: isOpen ? `${t('shiftsTab.regOpenAuto')} (${dayNames[openDay]} - ${dayNames[closeDay]})` : `${t('shiftsTab.regClosedAuto')} (${dayNames[openDay]} - ${dayNames[closeDay]})`
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
      showToast(t('shiftsTab.updateRegSuccess'));
      setRegModal(false);
    } catch (e) {
      showToast(t('shiftsTab.updateRegError'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  
  const handleAddOffDay = async () => {
    if (offDayForm.type === 'date' && !offDayForm.date) {
      showToast('Vui lòng chọn ngày', 'error'); return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'stores', storeId, 'off_days'), {
        type: offDayForm.type,
        date: offDayForm.type === 'date' ? offDayForm.date : null,
        weekday: offDayForm.type === 'weekday' ? offDayForm.weekday : null,
        createdAt: serverTimestamp()
      });

      const msg = offDayForm.type === 'date' ? `ngày ${format(parseISO(offDayForm.date), 'dd/MM/yyyy')}` : 
                  (offDayForm.weekday === '0' ? 'Chủ nhật hàng tuần' : `thứ ${Number(offDayForm.weekday)+1} hàng tuần`);
      await updateDoc(doc(db, 'stores', storeId), {
         latestOffDayAlert: {
            timestamp: new Date().getTime(),
            message: `THÔNG BÁO: Quán sẽ nghỉ vào ${msg}. Các ca làm vào thời gian này sẽ tự động bị hủy.`
         }
      });

      const snaps = await getDocs(collection(db, 'stores', storeId, 'schedules'));
      const batchDeletes = [];
      snaps.docs.forEach(d => {
         const sch = d.data();
         if (!sch.date) return;
         if (offDayForm.type === 'date' && sch.date === offDayForm.date) {
            batchDeletes.push(deleteDoc(doc(db, 'stores', storeId, 'schedules', d.id)));
         } else if (offDayForm.type === 'weekday') {
            const schDate = parseISO(sch.date);
            if (schDate.getDay().toString() === offDayForm.weekday) {
               batchDeletes.push(deleteDoc(doc(db, 'stores', storeId, 'schedules', d.id)));
            }
         }
      });
      await Promise.all(batchDeletes);

      showToast('Đã thiết lập ngày nghỉ', 'success');
    } catch(err) {
      console.error(err);
      showToast('Lỗi khi thiết lập', 'error');
    }
    setIsSubmitting(false);
  };

  const handleDeleteOffDay = async (id) => {
    try {
      await deleteDoc(doc(db, 'stores', storeId, 'off_days', id));
      showToast('Đã xóa ngày nghỉ');
    } catch(err) { showToast('Lỗi', 'error'); }
  };

  const handleAddSchedule = async () => {
    if (!selectedEmpCode || !assignModal.date || !assignModal.shift) return;
    const emp = employees.find(e => e.employeeCode === selectedEmpCode);
    if (!emp) return;
    
    try {
      await addDoc(collection(db, 'stores', storeId, 'schedules'), {
        date: assignModal.date,
        shiftId: assignModal.shift.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        assignedBy: 'admin',
        createdAt: new Date().toISOString()
      });
      showToast(t('shiftsTab.addEmpSuccess'));
      setSelectedEmpCode('');
    } catch (e) {
      showToast(t('shiftsTab.addEmpError'), 'error');
    }
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));

  return (
    <div className="h-full flex flex-col relative space-y-8 overflow-y-auto">

      {/* SCHEDULE CALENDAR SECTION */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{t('shiftsTab.scheduleTitle')}</h2>
          <p className="text-gray-500 mt-1">{t('shiftsTab.scheduleDesc')}</p>
        </div>
        
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-gray-200 bg-gray-50 gap-4">
             <div className="flex items-center gap-4">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-blue-600"/> {t('shiftsTab.weeklySchedule')}</h3>
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
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 border-r border-gray-200">{t('shiftsTab.shiftDay')}</th>
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
                       <div className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-medium inline-block">{t('shiftsTab.max')}: {shift.maxEmployees || 1}</div>
                     </td>
                     {weekDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const cellSchedules = schedules.filter(s => s.shiftId === shift.id && s.date === dateStr);
            const dayOfWeek = day.getDay().toString();
            const isOffDay = offDays.some(od => 
               (od.type === 'date' && od.date === dateStr) || 
               (od.type === 'weekday' && od.weekday === dayOfWeek)
            );
                        const isFull = cellSchedules.length >= (shift.maxEmployees || 1);
                        return (
                          <td key={dateStr} className={`p-1 border-r border-gray-200 align-top relative group min-h-[90px] h-[90px] ${isOffDay ? "bg-gray-200 opacity-60" : ""}`}>
                             {isOffDay && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                     <div className="bg-red-600/90 text-white font-bold text-[10px] md:text-xs px-2 py-1 rounded uppercase tracking-wider transform -rotate-12 shadow-sm whitespace-nowrap">Quán Nghỉ</div>
                  </div>
                )}
                <div className={`absolute inset-0 p-1.5 overflow-y-auto ${isOffDay ? "pointer-events-none" : ""}`}>
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
        
      {/* OFF DAYS SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Thiết Lập Ngày Nghỉ Quán</h3>
        <p className="text-gray-500 text-sm mb-6">Đóng cửa quán vào các ngày cụ thể hoặc thứ trong tuần. Các ca làm việc sẽ bị hủy và không thể đăng ký.</p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
           <select 
              value={offDayForm.type} 
              onChange={e => setOffDayForm({...offDayForm, type: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
           >
              <option value="date">Ngày cụ thể</option>
              <option value="weekday">Thứ trong tuần (Định kỳ)</option>
           </select>
           {offDayForm.type === 'date' ? (
              <input type="date" className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500" 
                     value={offDayForm.date} onChange={e => setOffDayForm({...offDayForm, date: e.target.value})} />
           ) : (
              <select className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                      value={offDayForm.weekday} onChange={e => setOffDayForm({...offDayForm, weekday: e.target.value})}>
                 <option value="1">Thứ hai</option>
                 <option value="2">Thứ ba</option>
                 <option value="3">Thứ tư</option>
                 <option value="4">Thứ năm</option>
                 <option value="5">Thứ sáu</option>
                 <option value="6">Thứ bảy</option>
                 <option value="0">Chủ nhật</option>
              </select>
           )}
           <button onClick={handleAddOffDay} disabled={isSubmitting} className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg flex items-center justify-center gap-2 font-medium">
             <Plus className="w-5 h-5"/> Thêm ngày nghỉ
           </button>
        </div>

        {offDays.length > 0 && (
           <div className="flex flex-wrap gap-3">
             {offDays.map(od => (
                <div key={od.id} className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-3">
                   <span className="font-semibold text-red-700">
                     {od.type === 'date' && od.date ? format(parseISO(od.date), 'dd/MM/yyyy') : 
                      (od.weekday === '0' ? 'Chủ nhật hàng tuần' : `Thứ ${Number(od.weekday) + 1} hàng tuần`)}
                   </span>
                   <button onClick={() => handleDeleteOffDay(od.id)} className="text-red-500 hover:text-red-800 bg-red-100 hover:bg-red-200 p-1 rounded">
                      <X className="w-4 h-4"/>
                   </button>
                </div>
             ))}
           </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">

          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('shiftsTab.shiftListTitle')}</h2>
            <p className="text-gray-500 mt-1">{t('shiftsTab.shiftListDesc')}</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('shiftsTab.shiftName')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('shiftsTab.time')}</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('shiftsTab.empLimit')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('shiftsTab.extraSettings')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('shiftsTab.action')}</th>
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
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />{t('shiftsTab.noShifts')}</td>
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
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-md w-max">{t('shiftsTab.latePenalty')}: {new Intl.NumberFormat('vi-VN').format(shift.latePenalty)}đ</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md w-max">{t('shiftsTab.noLatePenalty')}</span>
                          )}
                          {shift.enableOvertime ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-max">{t('shiftsTab.overtime')}: {new Intl.NumberFormat('vi-VN').format(shift.overtimeRate)}đ/h</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md w-max">{t('shiftsTab.noOvertime')}</span>
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
                {modalMode === 'add' ? t('shiftsTab.addNewShift') : t('shiftsTab.updateShift')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-1 rounded shadow-sm border border-gray-200"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftsTab.shiftNameReq')}</label>
                  <input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder={t('shiftsTab.shiftNamePlaceholder')} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftsTab.startTimeReq')}</label>
                    <input type="time" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftsTab.endTimeReq')}</label>
                    <input type="time" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftsTab.empLimitReq')}</label>
                  <input type="number" required min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" value={formData.maxEmployees} onChange={(e) => setFormData({...formData, maxEmployees: e.target.value})} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftsTab.latePenaltyVND')}</label>
                    <div className="relative">
                      <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none pr-10" placeholder={t('shiftsTab.emptyIsZero')} value={formData.latePenalty ? new Intl.NumberFormat('vi-VN').format(formData.latePenalty) : ''} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setFormData({...formData, latePenalty: raw ? Number(raw) : ''}); }} />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 font-medium text-sm">đ</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                      {t('shiftsTab.allowOvertime')}
                      <button type="button" onClick={() => setFormData({...formData, enableOvertime: !formData.enableOvertime})} className={cn("w-10 h-5 rounded-full transition-colors relative", formData.enableOvertime ? "bg-emerald-500" : "bg-gray-300")}>
                         <span className={cn("absolute top-0.5 bg-white w-4 h-4 rounded-full transition-all shadow-sm", formData.enableOvertime ? "left-[22px]" : "left-[2px]")}></span>
                      </button>
                    </label>
                    {formData.enableOvertime && (
                      <div className="relative animate-in slide-in-from-top-1">
                        <input type="text" required className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none pr-12 bg-emerald-50 text-emerald-900" placeholder={t('shiftsTab.wagePerHour')} value={formData.overtimeRate ? new Intl.NumberFormat('vi-VN').format(formData.overtimeRate) : ''} onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); setFormData({...formData, overtimeRate: raw ? Number(raw) : ''}); }} />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-emerald-600 font-medium text-sm">đ/h</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 rounded-lg">{t('shiftsTab.cancel')}</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-white font-medium bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-70">
                  {isSubmitting && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>}
                  {modalMode === 'add' ? t('shiftsTab.saveShift') : t('shiftsTab.update')}
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
                   <Lock className="w-5 h-5" /> {t('shiftsTab.lockAccount')}</h3>
                 <button onClick={() => setLockEmpModal({ show: false, scheduleId: null, employeeCode: '', employeeName: '', note: '' })} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded border shadow-sm"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleLockEmployee} className="p-4">
                 <p className="text-sm text-gray-600 mb-4">
                   {t('shiftsTab.lockWarning1')} <span className="font-bold text-gray-900">{lockEmpModal.employeeName}</span>{t('shiftsTab.lockWarning2')}
                 </p>
                 <div className="mb-4">
                   <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftsTab.reasonViolation')} <span className="text-red-500">*</span></label>
                   <textarea
                     required
                     rows={3}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-red-500 text-sm"
                     placeholder={t('shiftsTab.reasonPlaceholder')}
                     value={lockEmpModal.note}
                     onChange={(e) => setLockEmpModal(prev => ({ ...prev, note: e.target.value }))}
                   />
                 </div>
                 <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setLockEmpModal({ show: false, scheduleId: null, employeeCode: '', employeeName: '', note: '' })} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">{t('shiftsTab.cancel')}</button>
                    <button type="submit" disabled={isSubmitting || !lockEmpModal.note.trim()} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">{t('shiftsTab.confirmLock')}</button>
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
                   {t('shiftsTab.assignShift')} <span className="text-blue-600">{assignModal.shift.name}</span><br/>
                   <span className="text-sm font-medium text-gray-500">{t('shiftsTab.date')} {format(parseISO(assignModal.date), 'dd/MM/yyyy')}</span>
                 </h3>
                 <button onClick={() => setAssignModal({ show: false, date: null, shift: null, cellSchedules: [] })} className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded border shadow-sm"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4">
                 <div className="flex justify-between items-center mb-3">
                    <p className="text-sm text-gray-600 font-medium">{t('shiftsTab.empListMax')}{assignModal.shift.maxEmployees || 1})</p>
                    <span className={cn("text-xs font-bold px-2 py-1 rounded-full border", assignModal.cellSchedules.length >= (assignModal.shift.maxEmployees || 1) ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200")}>
                      {t('shiftsTab.selected')}: {assignModal.cellSchedules.length}
                    </span>
                 </div>
                 
                 <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                   {assignModal.cellSchedules.length === 0 ? <p className="text-sm text-gray-400 italic text-center py-4 border border-dashed rounded-lg">{t('shiftsTab.noRegistration')}</p> : assignModal.cellSchedules.map(sch => (
                      <div key={sch.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                        <div>
                          <span className="text-sm font-bold text-gray-900 block">{sch.employeeName}</span>
                          <span className="text-[10px] text-gray-500 font-medium bg-gray-200 px-1.5 rounded">{sch.employeeCode}</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <button 
                             onClick={() => setLockEmpModal({ show: true, scheduleId: sch.id, employeeCode: sch.employeeCode, employeeName: sch.employeeName, note: '' })} 
                             className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 p-2 rounded-lg transition-colors"
                             title={t('shiftsTab.deleteAndLock')}
                           >
                             <Lock className="w-4 h-4"/>
                           </button>
                           <button 
                             onClick={() => handleDeleteSchedule(sch.id)} 
                             className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                             title={t('shiftsTab.removeFromShift')}
                           >
                             <Trash2 className="w-4 h-4"/>
                           </button>
                        </div>
                      </div>
                   ))}
                 </div>
                 
                 <div className="pt-3 border-t border-gray-200 flex gap-2">
                    <select value={selectedEmpCode} onChange={e => setSelectedEmpCode(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-medium focus:border-blue-500">
                      <option value="">-- {t('shiftsTab.clickToSelectEmp')} --</option>
                      {employees.filter(e => !assignModal.cellSchedules.some(s => s.employeeCode === e.employeeCode)).map(e => (
                         <option key={e.employeeCode} value={e.employeeCode}>{e.fullName} ({e.employeeCode})</option>
                      ))}
                    </select>
                    <button onClick={handleAddSchedule} disabled={!selectedEmpCode || assignModal.cellSchedules.length >= (assignModal.shift.maxEmployees || 1)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:active:scale-100 active:scale-95 transition-all text-sm shadow-sm">{t('shiftsTab.add')}</button>
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
              <h3 className="font-bold text-lg text-gray-900">{t('shiftsTab.regSettings')}</h3>
              <button onClick={() => setRegModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveRegSettings} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftsTab.openCloseMode')}</label>
                <select
                  value={regForm.registrationMode}
                  onChange={(e) => setRegForm({ ...regForm, registrationMode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="manual">{t('shiftsTab.manualMode')}</option>
                  <option value="auto">{t('shiftsTab.autoMode')}</option>
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
                      <span className="text-sm font-medium text-gray-800">{t('shiftsTab.allowReg')}</span>
                   </label>
                   <p className="text-xs text-gray-500 mt-1 pl-6">{t('shiftsTab.allowRegDesc')}</p>
                </div>
              )}

              {regForm.registrationMode === 'auto' && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 mt-4">
                   <div className="col-span-2">
                     <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-100" dangerouslySetInnerHTML={{ __html: t('shiftsTab.autoRegDesc') }} />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftsTab.openOnDay')}</label>
                      <select
                        value={regForm.weeklyOpenDay}
                        onChange={(e) => setRegForm({ ...regForm, weeklyOpenDay: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="1">{t('shiftsTab.day2')}</option>
                        <option value="2">{t('shiftsTab.day3')}</option>
                        <option value="3">{t('shiftsTab.day4')}</option>
                        <option value="4">{t('shiftsTab.day5')}</option>
                        <option value="5">{t('shiftsTab.day6')}</option>
                        <option value="6">{t('shiftsTab.day7')}</option>
                        <option value="7">{t('shiftsTab.day8')}</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('shiftsTab.closeOnDay')}</label>
                      <select
                        value={regForm.weeklyCloseDay}
                        onChange={(e) => setRegForm({ ...regForm, weeklyCloseDay: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="1">{t('shiftsTab.day2')}</option>
                        <option value="2">{t('shiftsTab.day3')}</option>
                        <option value="3">{t('shiftsTab.day4')}</option>
                        <option value="4">{t('shiftsTab.day5')}</option>
                        <option value="5">{t('shiftsTab.day6')}</option>
                        <option value="6">{t('shiftsTab.day7')}</option>
                        <option value="7">{t('shiftsTab.day8')}</option>
                      </select>
                   </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setRegModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">{t('shiftsTab.cancel')}</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {isSubmitting ? t('shiftsTab.saving') : t('shiftsTab.saveConfig')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, AlertTriangle, Send, X, CheckCircle2, AlertCircle, History } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { cn } from '../lib/utils';
import { useStore } from '../StoreContext';
import { useTranslation } from 'react-i18next';
import LogsTab from './LogsTab';

export default function StatusTab() {
  const { storeId } = useStore();
  const { t } = useTranslation();
  const { storeData } = useStore();
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [monthSchedules, setMonthSchedules] = useState([]);
  const [todayLeaves, setTodayLeaves] = useState([]);
  const [salaryAdjustments, setSalaryAdjustments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [warningModal, setWarningModal] = useState({ show: false, log: null, message: '' });
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  
  // Track sent warnings in current session
  const [sentWarnings, setSentWarnings] = useState([]);

  // Data fetching
  useEffect(() => {
    if (!storeData?.id) return;
    
    const unEmployees = onSnapshot(query(collection(db, 'stores', storeId, 'employees')), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unShifts = onSnapshot(query(collection(db, 'stores', storeId, 'shifts')), (snap) => {
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    const unSchedules = onSnapshot(query(
        collection(db, 'stores', storeId, 'schedules'),
        where('date', '>=', startStr), 
        where('date', '<=', endStr)
    ), (snap) => {
      setMonthSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unLeaves = onSnapshot(query(
        collection(db, 'stores', storeId, 'leave_requests'),
        where('status', '==', 'approved')
    ), (snap) => {
       const leaves = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       const coveringToday = leaves.filter(l => l.startDate <= todayStr && l.endDate >= todayStr);
       setTodayLeaves(coveringToday);
    });
    
    const unAdjustments = onSnapshot(query(
      collection(db, 'stores', storeId, 'salary_adjustments')
    ), (snap) => {
       setSalaryAdjustments(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });
    
    // Only fetch this month's logs for stats, but we need today's logs for current status
    
    const unLogs = onSnapshot(query(collection(db, 'stores', storeId, 'attendance_logs')), (snap) => {
      const allLogs = snap.docs.map(d => {
        const data = d.data();
        let dateObj = new Date();
        if (data.timestamp?.toDate) dateObj = data.timestamp.toDate();
        else if (data.timestamp) dateObj = new Date(data.timestamp);
        else if (data.time) dateObj = new Date(data.time);
        return { id: d.id, ...data, dateObj };
      }).filter(log => log.dateObj >= start && log.dateObj <= end);
      
      allLogs.sort((a, b) => b.dateObj - a.dateObj); // descending
      setLogs(allLogs);
    });

    return () => {
      unEmployees();
      unShifts();
      unSchedules();
      unLeaves();
      unAdjustments();
      unLogs();
    };
  }, [storeData?.id]);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  };

  // Compute aggregated stats per employee
  const employeeStats = employees.map(emp => {
    const empLogs = logs.filter(l => l.employeeCode === emp.employeeCode);
    
    // Check current status (using the most recent log TODAY)
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const todayLogs = empLogs.filter(l => l.dateObj >= todayStart && l.dateObj <= todayEnd);
    
    let isWorking = false;
    let activeShift = null;
    let isCurrentlyLate = false;
    
    if (todayLogs.length > 0) {
      const latestLog = todayLogs[0]; // because it's sorted descending
      if (latestLog.type === 'check-in' || latestLog.type === 'CHECK_IN') {
        isWorking = true;
        activeShift = latestLog.shiftName;
        if (latestLog.isLate) isCurrentlyLate = true;
      }
    }
    
    // Absent logic
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const empMonthSchedules = monthSchedules.filter(s => s.employeeCode === emp.employeeCode);
    const empTodaySchedules = empMonthSchedules.filter(s => s.date === todayStr);
    const empLeaves = todayLeaves.filter(l => l.employeeCode === emp.employeeCode);
    
    let isAbsent = false;
    let absentStatus = '';
    let totalSkipped = 0;
    
    if (empTodaySchedules.length > 0) {
       let missingShifts = 0;
       const now = new Date();
       
       empTodaySchedules.forEach(sch => {
          const shiftData = shifts.find(s => s.id === sch.shiftId);
          if (!shiftData) return;
          
          const hasCheckedIn = todayLogs.some(l => l.shiftId === sch.shiftId && (l.type === 'check-in' || l.type === 'CHECK_IN'));
          
          if (!hasCheckedIn) {
             const [h, m] = shiftData.startTime.split(':');
             const shiftStart = new Date();
             shiftStart.setHours(Number(h), Number(m), 0, 0);
             
             // If we are past the shift start time by 15 minutes, they are missing
             if (now > new Date(shiftStart.getTime() + 15 * 60000)) {
                missingShifts++;
             }
          }
       });
       
       if (missingShifts > 0) {
          isAbsent = true;
          if (empLeaves.length > 0) absentStatus = t('statusTab.approvedLeave');
          else absentStatus = t('statusTab.unexcusedAbsence');
       }
    }
    
    // Count total skipped shifts for the month
    const now = new Date();
    const skippedLogs = [];
    
    empMonthSchedules.forEach(sch => {
        const shiftData = shifts.find(s => s.id === sch.shiftId);
        if (!shiftData) return;

        if (sch.status === 'skipped') {
            totalSkipped++;
            skippedLogs.push({
               id: 'skip_' + sch.id,
               type: 'skipped',
               dateObj: new Date(sch.date + 'T' + (shiftData.endTime || '23:59') + ':00'),
               shiftName: shiftData.name,
               isLate: false,
               isSkipped: true,
               dateStr: sch.date
            });
            return;
        }
        
        if (!shiftData.endTime) return;
        
        let isEnded = false;
        if (sch.date < todayStr) {
            isEnded = true;
        } else if (sch.date === todayStr) {
            const [h, m] = shiftData.endTime.split(':');
            const shiftEnd = new Date();
            shiftEnd.setHours(Number(h), Number(m), 0, 0);
            if (now > shiftEnd) isEnded = true;
        }
        
        if (isEnded) {
            const hasCheckedIn = empLogs.some(l => 
                l.shiftId === sch.shiftId && 
                format(l.dateObj, 'yyyy-MM-dd') === sch.date &&
                (l.type === 'check-in' || l.type === 'CHECK_IN')
            );
            if (!hasCheckedIn) {
                totalSkipped++;
                skippedLogs.push({
                   id: 'skip_' + sch.id,
                   type: 'skipped',
                   dateObj: new Date(sch.date + 'T' + shiftData.endTime + ':00'),
                   shiftName: shiftData.name,
                   isLate: false,
                   isSkipped: true,
                   dateStr: sch.date
                });
            }
        }
    });

    // Compute month stats
    let totalLate = 0;
    let totalOnTime = 0;
    const checkIns = empLogs.filter(l => l.type === 'check-in' || l.type === 'CHECK_IN');
    
    checkIns.forEach(log => {
      if (log.isLate) totalLate++;
      else totalOnTime++;
    });
    
    const combinedLogs = [...checkIns, ...skippedLogs].sort((a, b) => b.dateObj - a.dateObj);

    return {
      ...emp,
      isWorking,
      activeShift,
      isCurrentlyLate,
      isAbsent,
      absentStatus,
      totalLate,
      totalOnTime,
      totalSkipped,
      recentLogs: combinedLogs
    };
  });

  const filteredStats = employeeStats.filter(e => 
    (e.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendWarning = async (e) => {
    e.preventDefault();
    if (!warningModal.log || !selectedEmployee) return;

    try {
      await addDoc(collection(db, 'stores', storeId, 'notifications'), {
        storeId: storeData.id,
        employeeCode: selectedEmployee.employeeCode,
        title: t('statusTab.lateWarningTitle'),
        message: warningModal.message,
        type: 'warning',
        read: false,
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      });
      
      showToast(t('statusTab.warningSent', 'success'));
      setSentWarnings(prev => [...prev, warningModal.log.id]);
      setWarningModal({ show: false, log: null, message: '' });
    } catch (err) {
      showToast(t('statusTab.errorSending', 'error'));
    }
  };

    return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <div className="mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-gray-900">{t('statusTab.statusTrackingTitle')}</h2>
        <p className="text-gray-500 mt-1">{t('statusTab.statusTrackingDesc')}</p>
      </div>
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left Column: LogsTab */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white border border-gray-200 rounded-xl p-4 shadow-sm min-h-0 overflow-auto">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><History className="w-5 h-5"/> Lịch sử chấm công</h3>
          <LogsTab isEmbedded={true} />
        </div>
        
        {/* Right Column: Status Cards */}
        <div className="w-full lg:w-1/2 flex flex-col bg-white border border-gray-200 rounded-xl p-4 shadow-sm min-h-0 overflow-auto">
      
      <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all"
            placeholder={t("statusTab.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStats.map(emp => (
            <div 
              key={emp.id} 
              onClick={() => setSelectedEmployee(emp)}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white",
                    emp.isWorking ? (emp.isCurrentlyLate ? "bg-red-500" : "bg-green-500") : "bg-gray-400"
                  )}>
                    {emp.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className={cn("font-semibold leading-tight transition-colors", emp.isCurrentlyLate ? "text-red-600 group-hover:text-red-700" : "text-gray-900 group-hover:text-blue-600")}>{emp.fullName}</h3>
                    <p className="text-xs text-gray-500">{emp.employeeCode}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex flex-col items-start gap-2">
                {emp.isWorking ? (
                  <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium", emp.isCurrentlyLate ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
                    <span className={cn("w-2 h-2 rounded-full animate-pulse", emp.isCurrentlyLate ? "bg-red-500" : "bg-green-500")}></span>
                    Đang làm ca: {emp.activeShift} {emp.isCurrentlyLate && ` (${t("statusTab.late")})`}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 text-gray-600 text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                    Offline
                  </div>
                )}
                
                {emp.isAbsent && (
                  <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border", emp.absentStatus === t('statusTab.approvedLeave') ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200")}>
                     <AlertCircle className="w-3.5 h-3.5" />
                     {emp.absentStatus}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm pt-3 border-t border-gray-100">
                <div className="bg-emerald-50 rounded-lg p-2 flex flex-col items-center justify-center">
                  <p className="text-emerald-700 font-medium">{t('statusTab.onTime')}</p>
                  <p className="text-xl font-bold text-emerald-600">{emp.totalOnTime}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2 flex flex-col items-center justify-center">
                  <p className="text-amber-700 font-medium">{t('statusTab.late')}</p>
                  <p className="text-xl font-bold text-amber-600">{emp.totalLate}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 flex flex-col items-center justify-center">
                  <p className="text-red-700 font-medium">{t('statusTab.skipped')}</p>
                  <p className="text-xl font-bold text-red-600">{emp.totalSkipped}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

              </div>
      </div>
      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                  Chi tiết Check-in: {selectedEmployee.fullName}
                </h3>
                <p className="text-sm text-gray-500">{t('statusTab.thisMonth')}: {t('statusTab.onTime')} ({selectedEmployee.totalOnTime}) - {t('statusTab.late')} ({selectedEmployee.totalLate})</p>
              </div>
              <button onClick={() => setSelectedEmployee(null)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('statusTab.time')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('statusTab.shift')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('statusTab.status')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('statusTab.action')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedEmployee.recentLogs.length === 0 ? (
                     <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">{t('statusTab.noData')}</td></tr>
                  ) : (
                    selectedEmployee.recentLogs.map(log => (
                      <tr key={log.id} className={cn("transition-colors", (log.isLate || log.isSkipped) ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-gray-50")}>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                          {log.isSkipped ? format(log.dateObj, 'dd/MM/yyyy') : format(log.dateObj, 'dd/MM/yyyy HH:mm')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900 font-medium">
                          {log.shiftName || t('statusTab.unknown')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {log.isSkipped ? (
                            <div className="flex items-center justify-center gap-1.5 text-red-700 text-sm font-medium">
                              <AlertTriangle className="w-4 h-4" /> Bỏ ca
                            </div>
                          ) : log.isLate ? (
                            <div className="flex items-center justify-center gap-1.5 text-amber-700 text-sm font-medium">
                              <AlertTriangle className="w-4 h-4" /> {t('statusTab.late')} {log.lateMinutes} phút
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 text-green-700 text-sm font-medium">
                              <CheckCircle2 className="w-4 h-4" /> Đúng giờ
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                          {log.isLate && !sentWarnings.includes(log.id) && (
                            <button 
                              onClick={() => {
                                setWarningModal({
                                  show: true,
                                  log,
                                  message: t('statusTab.lateWarningMsg', { minutes: log.lateMinutes, shift: log.shiftName, time: format(log.dateObj, 'HH:mm dd/MM/yyyy') })
                                });
                              }}
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-md transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" /> Gửi cảnh cáo
                            </button>
                          )}
                          {log.isSkipped && !sentWarnings.includes(log.id) && (
                            <button 
                              onClick={() => {
                                setWarningModal({
                                  show: true,
                                  log,
                                  message: t('statusTab.skipWarningMsg', { shift: log.shiftName, date: format(log.dateObj, 'dd/MM/yyyy') })
                                });
                              }}
                              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" /> Gửi nhắc nhở
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Lịch sử điều chỉnh lương */}
            <div className="border-t border-gray-200 bg-gray-50">
              <div className="p-4 border-b border-gray-200 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-500" />
                <h4 className="font-bold text-gray-900">{t('statusTab.salaryAdjHistory')}</h4>
              </div>
              <div className="p-4 max-h-48 overflow-y-auto space-y-3">
                {salaryAdjustments.filter(a => a.employeeCode === selectedEmployee.employeeCode).length === 0 ? (
                  <p className="text-gray-500 text-center text-sm">{t('statusTab.noSalaryData')}</p>
                ) : (
                  salaryAdjustments.filter(a => a.employeeCode === selectedEmployee.employeeCode).map(adj => (
                    <div key={adj.id} className="bg-white border border-gray-200 p-3 rounded-lg flex justify-between items-start shadow-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded",
                            adj.type === 'increase' ? "bg-emerald-100 text-emerald-700" :
                            adj.type === 'bonus' ? "bg-blue-100 text-blue-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {adj.type === 'increase' ? t('statusTab.baseSalaryIncrease') : adj.type === 'bonus' ? t('statusTab.bonus') : t('statusTab.penalty')}
                          </span>
                          <span className="text-xs text-gray-500">{format(new Date(adj.createdAt), 'HH:mm - dd/MM/yyyy')}</span>
                        </div>
                        {adj.reason && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{t('statusTab.reason')}: {adj.reason}</p>}
                      </div>
                      <div className={cn(
                        "font-black text-right whitespace-nowrap",
                        adj.type === 'increase' ? "text-emerald-600" :
                        adj.type === 'bonus' ? "text-blue-600" :
                        "text-red-600"
                      )}>
                        {adj.type === 'increase' ? t('statusTab.upTo') + ' ' : (adj.type === 'bonus' ? '+' : '-')}
                        {new Intl.NumberFormat('vi-VN').format(adj.amount)}đ
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Message Modal */}
      {warningModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-red-50 text-red-900">
              <h4 className="font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> {t('statusTab.composeWarning')}</h4>
              <button onClick={() => setWarningModal({ show: false, log: null, message: '' })}>
                <X className="w-5 h-5 hover:text-red-700" />
              </button>
            </div>
            <form onSubmit={handleSendWarning} className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                {t('statusTab.warningDesc1')} <b>{selectedEmployee?.fullName}</b> {t('statusTab.warningDesc2')}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('statusTab.warningContent')}</label>
                <textarea 
                  required 
                  rows="4" 
                  value={warningModal.message}
                  onChange={(e) => setWarningModal({ ...warningModal, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none text-sm"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setWarningModal({ show: false, log: null, message: '' })}
                  className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Gửi ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, getDoc, setDoc, updateDoc, addDoc, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useUI } from '../contexts/UIContext';
import { db } from '../lib/firebase';
import { Download, Calendar, FileSpreadsheet, Lock, Unlock, CheckCircle2, Send, AlertCircle } from 'lucide-react';
import { format, differenceInSeconds, startOfMonth, endOfMonth, parseISO, addMonths } from 'date-fns';
import Papa from 'papaparse';
import { useStore } from '../StoreContext';

export default function PayrollTab() {
  const { storeId, settings } = useStore();
  const { showToast, showConfirm } = useUI();
  const [employees, setEmployees] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [isCalculating, setIsCalculating] = useState(true);
  
  const today = new Date();
  const [currentPeriod, setCurrentPeriod] = useState(format(today, 'yyyy-MM'));
  const [isSending, setIsSending] = useState(false);
  const [payslipsRealtime, setPayslipsRealtime] = useState({});

  // Fetch settings
  useEffect(() => {
    if (settings && settings.currentPayrollPeriod) {
      setCurrentPeriod(settings.currentPayrollPeriod);
    }
  }, [settings]);

  // Fetch employees
  useEffect(() => {
    if (!storeId) return;
    const fetchEmployees = async () => {
      try {
        const querySnapshot = await getDocs(query(collection(db, 'employees'), where('storeId', '==', storeId)));
        const empList = querySnapshot.docs.map(d => ({
          employeeCode: d.id,
          ...d.data()
        }));
        setEmployees(empList);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchEmployees();
  }, [storeId]);

  // Auto calculate when dates or employees change
  useEffect(() => {
    if (employees.length === 0 || !storeId || !currentPeriod) return;
    
    const calculatePayroll = async () => {
      setIsCalculating(true);
      try {
        const periodDate = parseISO(currentPeriod + '-01');
        const start = startOfMonth(periodDate);
        const end = endOfMonth(periodDate);
        const period = currentPeriod;
        
        // 1. Fetch attendance
        const logsSnapshot = await getDocs(query(collection(db, 'attendance_logs'), where('storeId', '==', storeId)));
        const validLogs = [];
        logsSnapshot.forEach(doc => {
          const data = doc.data();
          let dateObj = null;
          if (data.timestamp?.toDate) dateObj = data.timestamp.toDate();
          else if (data.timestamp) dateObj = new Date(data.timestamp);
          else if (data.time) dateObj = new Date(data.time);
          
          if (dateObj && dateObj >= start && dateObj <= end && (data.status === 'valid' || data.status === 'Hợp lệ')) {
            validLogs.push({ ...data, dateObj, id: doc.id });
          }
        });
        
        // 2. Fetch advance requests
        const advanceSnap = await getDocs(query(collection(db, 'advance_requests'), where('storeId', '==', storeId)));
        const approvedAdvances = {};
        advanceSnap.forEach(doc => {
          const data = doc.data();
          if (data.status === 'approved') {
            let dateObj = data.createdAt ? new Date(data.createdAt) : null;
            if (dateObj && dateObj >= start && dateObj <= end) {
              approvedAdvances[data.employeeCode] = (approvedAdvances[data.employeeCode] || 0) + Number(data.amount);
            }
          }
        });
        
        // 3. Fetch payslips status (bonus, deduction, isPaid)
        const payslipsSnap = await getDocs(query(collection(db, 'payslips'), where('storeId', '==', storeId), where('period', '==', period)));
        const payslipsDict = {};
        payslipsSnap.forEach(doc => {
          payslipsDict[doc.data().employeeCode] = doc.data();
        });

        // 4. Group logs by employee
        const logsByEmp = validLogs.reduce((acc, log) => {
          if (!acc[log.employeeCode]) acc[log.employeeCode] = [];
          acc[log.employeeCode].push(log);
          return acc;
        }, {});
        
        // 5. Calculate for each employee
        const result = employees.map(emp => {
          const empLogs = logsByEmp[emp.employeeCode] || [];
          empLogs.sort((a, b) => a.dateObj - b.dateObj);
          
          let baseSalaryEarned = 0;
          let workingDays = 0;
          let totalHours = 0;
          
          const logsByDay = empLogs.reduce((acc, log) => {
            const dayKey = format(log.dateObj, 'yyyy-MM-dd');
            if (!acc[dayKey]) acc[dayKey] = [];
            acc[dayKey].push(log);
            return acc;
          }, {});
          
          const activeDays = Object.keys(logsByDay);
          
          if (emp.salaryType === 'HOURLY') {
            let totalSeconds = 0;
            activeDays.forEach(day => {
              const dayLogs = logsByDay[day];
              let checkInTime = null;
              dayLogs.forEach(log => {
                const isCheckIn = log.type === 'check-in' || log.type === 'CHECK_IN';
                if (isCheckIn) checkInTime = log.dateObj;
                else if (!isCheckIn && checkInTime) {
                  const secs = differenceInSeconds(log.dateObj, checkInTime);
                  if (secs > 0 && secs < 24 * 3600) totalSeconds += secs;
                  checkInTime = null;
                }
              });
            });
            totalHours = totalSeconds / 3600;
            baseSalaryEarned = totalHours * emp.salaryRate;
            workingDays = activeDays.length;
          } 
          else if (emp.salaryType === 'DAILY') {
            let validDays = 0;
            activeDays.forEach(day => {
              const dayLogs = logsByDay[day];
              const hasCheckIn = dayLogs.some(l => l.type === 'check-in' || l.type === 'CHECK_IN');
              const hasCheckOut = dayLogs.some(l => l.type === 'check-out' || l.type === 'CHECK_OUT');
              if (hasCheckIn && hasCheckOut) validDays++;
            });
            baseSalaryEarned = validDays * emp.salaryRate;
            workingDays = validDays;
          }
          else if (emp.salaryType === 'MONTHLY') {
            workingDays = activeDays.length;
            const ratio = Math.min(workingDays / 26, 1);
            baseSalaryEarned = ratio * emp.salaryRate;
          }
          
          const totalAdvance = approvedAdvances[emp.employeeCode] || 0;
          const payslip = payslipsDict[emp.employeeCode] || { bonus: 0, deduction: 0, isPaid: false };
          
          let calculatedSalary = baseSalaryEarned + (Number(payslip.bonus) || 0) - (Number(payslip.deduction) || 0) - totalAdvance;
          calculatedSalary = Math.max(Math.round(calculatedSalary), 0);
          
          return {
            ...emp,
            workingDays,
            totalHours: totalHours.toFixed(1),
            totalAdvance,
            baseSalaryEarned: Math.round(baseSalaryEarned),
            bonus: payslip.bonus || 0,
            deduction: payslip.deduction || 0,
            isPaid: payslip.isPaid || false,
            isNotified: payslip.isNotified || false,
            calculatedSalary
          };
        });
        
        setPayrollData(result);
      } catch (error) {
        console.error("Error calculating payroll:", error);
      } finally {
        setIsCalculating(false);
      }
    };
    
    calculatePayroll();
  }, [currentPeriod, employees, storeId]);

  // Realtime payslips listener
  useEffect(() => {
    if (!storeId || !currentPeriod) return;
    const q = query(collection(db, 'payslips'), where('storeId', '==', storeId), where('period', '==', currentPeriod));
    const unsub = onSnapshot(q, (snap) => {
      const dict = {};
      snap.forEach(d => { dict[d.data().employeeCode] = d.data(); });
      setPayslipsRealtime(dict);
    });
    return () => unsub();
  }, [storeId, currentPeriod]);

  // Merge realtime payslips into payrollData
  useEffect(() => {
    if (Object.keys(payslipsRealtime).length === 0 || payrollData.length === 0 || isCalculating) return;
    
    setPayrollData(prev => {
      let changed = false;
      const next = prev.map(emp => {
        const p = payslipsRealtime[emp.employeeCode];
        if (p) {
          if (emp.isPaid !== p.isPaid || emp.isNotified !== p.isNotified || emp.bonus !== p.bonus || emp.deduction !== p.deduction || emp.isConfirmedByAdmin !== p.isConfirmedByAdmin) {
            changed = true;
            return {
              ...emp,
              bonus: p.bonus || 0,
              deduction: p.deduction || 0,
              isPaid: p.isPaid || false,
              isNotified: p.isNotified || false,
              isConfirmedByAdmin: p.isConfirmedByAdmin || false,
              calculatedSalary: Math.max(Math.round(emp.baseSalaryEarned + (Number(p.bonus) || 0) - (Number(p.deduction) || 0) - emp.totalAdvance), 0)
            };
          }
        }
        return emp;
      });
      return changed ? next : prev;
    });
  }, [payslipsRealtime, isCalculating]);

  // Auto advance month if everyone is paid
  useEffect(() => {
    if (payrollData.length > 0 && !isCalculating) {
      const allPaid = payrollData.every(emp => emp.isPaid);
      if (allPaid && settings?.currentPayrollPeriod === currentPeriod) {
        // Advance month
        const nextPeriodDate = addMonths(parseISO(currentPeriod + '-01'), 1);
        const nextPeriodStr = format(nextPeriodDate, 'yyyy-MM');
        updateDoc(doc(db, 'store_settings', storeId), {
          currentPayrollPeriod: nextPeriodStr
        }).then(() => {
          setCurrentPeriod(nextPeriodStr);
          showToast(`Hệ thống tự động chuyển sang kỳ lương mới: ${nextPeriodStr}`);
        });
      }
    }
  }, [payrollData, isCalculating, currentPeriod, settings, storeId]);

  const handleSendNotification = () => {
    showConfirm(
      'Gửi thông báo',
      `Bạn muốn chốt sổ và gửi thông báo nhận lương tháng ${currentPeriod} tới tất cả nhân viên?`,
      async () => {
        setIsSending(true);
        try {
          // 1. Mark all payslips for currentPeriod as notified
          for (const emp of payrollData) {
            const docId = `${storeId}_${emp.employeeCode}_${currentPeriod}`;
            await setDoc(doc(db, 'payslips', docId), {
              storeId,
              employeeCode: emp.employeeCode,
              period: currentPeriod,
              bonus: emp.bonus || 0,
              deduction: emp.deduction || 0,
              isNotified: true,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            
            // 2. Send notification to each
            await addDoc(collection(db, 'notifications'), {
              employeeCode: emp.employeeCode,
              title: 'Nhận Lương',
              message: `Lương tháng ${currentPeriod} đã sẵn sàng. Vui lòng vào Phiếu Lương để xác nhận sau khi đã nhận tiền.`,
              type: 'success',
              read: false,
              createdAt: new Date().toISOString(),
              timestamp: serverTimestamp(),
              storeId
            });
          }
          
          // Force refresh data
          setPayrollData(prev => prev.map(item => ({ ...item, isNotified: true })));
          showToast('Đã gửi thông báo thành công!');
        } catch (e) {
          console.error(e);
          showToast('Lỗi gửi thông báo!', 'error');
        } finally {
          setIsSending(false);
        }
      }
    );
  };

  const handleForceConfirmAll = () => {
    showConfirm(
      'Xác nhận thay thế',
      `Bạn muốn thay mặt nhân viên xác nhận đã thanh toán cho toàn bộ người chưa xác nhận trong tháng ${currentPeriod}?`,
      async () => {
        setIsSending(true);
        try {
          for (const emp of payrollData) {
            if (!emp.isPaid) {
              const docId = `${storeId}_${emp.employeeCode}_${currentPeriod}`;
              await setDoc(doc(db, 'payslips', docId), {
                isPaid: true,
                isConfirmedByAdmin: true,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          }
          setPayrollData(prev => prev.map(item => ({ ...item, isPaid: true })));
          showToast('Đã xác nhận thanh toán tất cả thành công!');
        } catch (e) {
          console.error(e);
          showToast('Lỗi khi xác nhận thanh toán!', 'error');
        } finally {
          setIsSending(false);
        }
      }
    );
  };

  const exportCSV = () => {
    if (payrollData.length === 0) return;
    
    const exportData = payrollData.map(item => ({
      "Mã NV": item.employeeCode,
      "Họ Tên": item.fullName,
      "Hình Thức": item.salaryType === 'HOURLY' ? 'Theo giờ' : item.salaryType === 'DAILY' ? 'Theo ngày' : 'Theo tháng',
      "Mức Lương Gốc": item.salaryRate,
      "Số ngày": item.workingDays,
      "Số giờ": item.totalHours,
      "Thưởng": item.bonus,
      "Trừ tiền": item.deduction,
      "Đã Ứng": item.totalAdvance,
      "Thực Nhận": item.calculatedSalary,
      "Trạng thái": item.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'
    }));
    
    const csv = Papa.unparse(exportData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bang_Luong_${currentPeriod}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tính Lương & Báo Cáo</h2>
          <p className="text-gray-500 mt-1">Dữ liệu được tính toán tự động dựa trên thời gian thực.</p>
        </div>
        
        {/* Status Indicator */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${payrollData.length > 0 && payrollData.every(p => p.isPaid) ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
          {payrollData.length > 0 && payrollData.every(p => p.isPaid) ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <Calendar className="w-6 h-6" />}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">KỲ LƯƠNG</p>
            <p className="text-sm font-medium">Tháng <span className="font-bold text-lg">{currentPeriod.split('-')[1]}</span> năm {currentPeriod.split('-')[0]}</p>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row items-end gap-4">
        <div className="w-full md:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn tháng tính lương</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="month"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all cursor-pointer"
              value={currentPeriod}
              max={format(addMonths(new Date(), 1), 'yyyy-MM')}
              onChange={(e) => setCurrentPeriod(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1"></div>
        
        {payrollData.length > 0 && (
          <button
            onClick={payrollData.some(p => p.isNotified) && !payrollData.every(p => p.isPaid) ? handleForceConfirmAll : handleSendNotification}
            disabled={isSending || payrollData.every(p => p.isPaid)}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 text-white font-medium rounded-lg transition-colors shadow-sm h-[42px] ${
              payrollData.every(p => p.isPaid) ? 'bg-gray-400 cursor-not-allowed' :
              payrollData.some(p => p.isNotified) ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : 
             payrollData.some(p => p.isNotified) && !payrollData.every(p => p.isPaid) ? <CheckCircle2 className="w-4 h-4"/> : <Send className="w-4 h-4" />}
            {payrollData.every(p => p.isPaid) ? 'Đã hoàn tất kỳ lương' :
             payrollData.some(p => p.isNotified) ? 'Xác nhận thay nhân viên' : 'Chốt sổ & Gửi thông báo nhận lương'}
          </button>
        )}
        
        <div className="flex-1"></div>
        
        <button
          onClick={exportCSV}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow-sm h-[42px]"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Xuất Excel / CSV
        </button>
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
        {isCalculating ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
             <p className="text-gray-500">Đang tính toán dữ liệu...</p>
          </div>
        ) : payrollData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-500">
            <p className="text-lg font-medium text-gray-600">Không có nhân viên nào</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã NV</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và Tên</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hình thức</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lương gốc</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày công</th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Giờ công</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thưởng</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bị trừ</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đã ứng</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">Thực nhận</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrollData.map((item) => {
                  const isPaid = item.isPaid;
                  return (
                  <tr 
                    key={item.employeeCode} 
                    className={`transition-colors ${isPaid ? 'bg-gray-100 opacity-60' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.employeeCode}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {item.fullName}
                      {isPaid && <div className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3"/> {item.isConfirmedByAdmin ? 'CHỦ ĐÃ XÁC NHẬN' : 'ĐÃ THANH TOÁN'}</div>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-[10px] leading-4 font-semibold rounded-full ${
                        item.salaryType === 'HOURLY' ? 'bg-purple-100 text-purple-800' :
                        item.salaryType === 'DAILY' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {item.salaryType === 'HOURLY' ? 'Theo giờ' : item.salaryType === 'DAILY' ? 'Theo ngày' : 'Theo tháng'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Intl.NumberFormat('vi-VN').format(item.salaryRate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-700 font-bold text-center bg-blue-50/30">
                      {item.workingDays}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-purple-700 font-bold text-center bg-purple-50/30">
                      {item.totalHours}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-emerald-600">
                      {item.bonus > 0 ? `+${new Intl.NumberFormat('vi-VN').format(item.bonus)}` : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-red-600">
                      {item.deduction > 0 ? `-${new Intl.NumberFormat('vi-VN').format(item.deduction)}` : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-orange-600 font-medium text-right">
                      {item.totalAdvance > 0 ? `-${new Intl.NumberFormat('vi-VN').format(item.totalAdvance)}` : '0'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-black text-blue-700 text-right bg-blue-50/50">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.calculatedSalary)}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
        
        {payrollData.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end items-center">
            <span className="text-sm font-medium text-gray-500 mr-4">Tổng quỹ lương:</span>
            <span className="text-xl font-black text-gray-900">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                payrollData.reduce((sum, item) => sum + item.calculatedSalary, 0)
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

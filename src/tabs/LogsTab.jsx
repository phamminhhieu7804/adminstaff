import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, Calendar, Filter, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { useStore } from '../StoreContext';

export default function LogsTab({ isEmbedded = false }) {
  const { storeId } = useStore();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      // Assuming logs are stored with a timestamp field, if not, orderBy might fail without index
      // We will just fetch all and sort client-side if needed, but query is better.
      const q = query(collection(db, 'stores', storeId, 'attendance_logs'));
      const querySnapshot = await getDocs(q);
      
      const logsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Handle Firestore timestamp or string
        let dateObj = new Date();
        if (data.timestamp?.toDate) {
          dateObj = data.timestamp.toDate();
        } else if (data.timestamp) {
          dateObj = new Date(data.timestamp);
        } else if (data.time) { // Fallback if field is named 'time'
          dateObj = new Date(data.time);
        }
        
        return {
          id: doc.id,
          ...data,
          dateObj
        };
      });
      
      // Sort descending by date
      logsData.sort((a, b) => b.dateObj - a.dateObj);
      
      setLogs(logsData);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchSearch = 
      (log.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (log.employeeName || log.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchDate = dateFilter ? format(log.dateObj, 'yyyy-MM-dd') === dateFilter : true;
    
    return matchSearch && matchDate;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  return (
    <div className={isEmbedded ? "h-full flex flex-col" : "h-full flex flex-col"}>
      {!isEmbedded && (
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Bảng Theo Dõi Chấm Công</h2>
        <p className="text-gray-500 mt-1">Lịch sử check-in và check-out của tất cả nhân viên.</p>
      </div>

      )}
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all"
            placeholder="Lọc theo Mã NV hoặc Tên NV..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset page on filter
            }}
          />
        </div>
        
        <div className="w-full md:w-64 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="date"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        
        {(searchTerm || dateFilter) && (
          <button 
            onClick={() => {
              setSearchTerm('');
              setDateFilter('');
            }}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chi tiết Ca</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : currentLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500 flex-col items-center flex">
                    <Filter className="w-12 h-12 text-gray-300 mb-3" />
                    <p>Không tìm thấy dữ liệu chấm công nào phù hợp.</p>
                  </td>
                </tr>
              ) : (
                currentLogs.map((log) => {
                  const isCheckIn = log.type === 'check-in' || log.type === 'CHECK_IN';
                  const isValid = log.status === 'valid' || log.status === 'Hợp lệ';
                  
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {format(log.dateObj, 'dd/MM/yyyy HH:mm:ss')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.employeeName || log.fullName || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{log.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn(
                          "px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full",
                          isCheckIn ? "bg-indigo-100 text-indigo-800" : "bg-orange-100 text-orange-800"
                        )}>
                          {isCheckIn ? 'Check-in' : 'Check-out'}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {isCheckIn ? (
                           <div className="flex flex-col gap-1">
                             {log.isLate ? (
                               <span className="text-red-600 font-medium">Trễ {log.lateMinutes} phút</span>
                             ) : (
                               <span className="text-green-600 font-medium">Đúng giờ</span>
                             )}
                             {log.latePenalty > 0 && <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 w-max rounded">Phạt: {new Intl.NumberFormat('vi-VN').format(log.latePenalty)}đ</span>}
                           </div>
                        ) : (
                           <div className="flex flex-col gap-1">
                             {log.overtimeMinutes > 0 ? (
                               <span className="text-emerald-600 font-medium">Tăng ca {log.overtimeMinutes} phút</span>
                             ) : (
                               <span className="text-gray-500 font-medium">Không tăng ca</span>
                             )}
                             {log.overtimePay > 0 && <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 w-max rounded">+{new Intl.NumberFormat('vi-VN').format(log.overtimePay)}đ</span>}
                           </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={cn(
                          "flex items-center gap-1.5 text-sm font-medium",
                          isValid ? "text-green-600" : "text-red-600"
                        )}>
                          {isValid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {isValid ? 'Hợp lệ' : 'Vi phạm'}
                        </div>
                        {!isValid && log.violationReason && (
                          <div className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={log.violationReason}>
                            {log.violationReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Hiển thị <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> đến <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> trong số <span className="font-medium">{filteredLogs.length}</span> kết quả
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Simple pagination buttons - just showing current/total for now to save space */}
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Trang {currentPage} / {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

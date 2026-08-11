import React, { useState, useEffect } from 'react';
import { Settings, Users, ClipboardList, Calculator, Menu, Clock, FileText, ShieldCheck, LogOut, Camera, Lock, Crown, Phone, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, pendingCount, onLogout, packageType, storeId }) {
  const isPro = packageType === 'Pro';
  const [upgradePopup, setUpgradePopup] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const cSnap = await getDoc(doc(db, 'system_settings', 'contact_info'));
        if (cSnap.exists()) setContactInfo(cSnap.data());
      } catch(e) {}
    };
    fetchContact();
  }, []);

  const lockedTabs = ['requests', 'payroll', 'shifts'];

  const navItems = [
    { id: 'settings', label: 'Cấu Hình Cửa Hàng', icon: Settings },
    { id: 'employees', label: 'Quản Lý Nhân Sự', icon: Users },
    { id: 'shifts', label: 'Quản Lý Ca Làm', icon: Clock },
    { id: 'status', label: 'Trạng Thái', icon: Users },
    { id: 'logs', label: 'Theo Dõi Chấm Công', icon: ClipboardList },
    { id: 'photos', label: 'Duyệt ảnh Check-out', icon: Camera },
    { id: 'requests', label: 'Quản Lý Yêu Cầu', icon: FileText },
    { id: 'payroll', label: 'Tính Lương & Báo Cáo', icon: Calculator },
    { id: 'subscription', label: 'Thông tin Phần mềm', icon: ShieldCheck },
  ];

  const handleTabClick = (itemId) => {
    if (!isPro && lockedTabs.includes(itemId)) {
      setUpgradePopup(true);
      setIsOpen(false);
      return;
    }
    setActiveTab(itemId);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center justify-center h-16 border-b border-gray-200">
          <h1 className={cn("text-xl font-bold flex items-center gap-2", isPro ? "text-yellow-500" : "text-blue-600")}>
            <span className={cn("p-1.5 rounded-lg", isPro ? "bg-yellow-500 text-white" : "bg-blue-600 text-white")}>
              {isPro ? <Crown className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
            </span>
            {isPro ? 'Adminstaff Pro' : 'Admin Staff'}
          </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isLocked = !isPro && lockedTabs.includes(item.id);
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 relative",
                    isLocked 
                      ? "text-gray-400 hover:bg-gray-100 cursor-pointer"
                      : isActive 
                        ? (isPro ? "bg-yellow-50 text-yellow-600" : "bg-blue-50 text-blue-700")
                        : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-colors flex-shrink-0",
                    isLocked 
                      ? "text-gray-300"
                      : isActive 
                        ? (isPro ? "text-yellow-600" : "text-blue-700") 
                        : "text-gray-400"
                  )} />
                  <span className="truncate">{item.label}</span>
                  {isLocked && (
                    <Lock className="w-3.5 h-3.5 ml-auto text-gray-300 flex-shrink-0" />
                  )}
                  {item.id === 'requests' && !isLocked && pendingCount > 0 && (
                     <span className="ml-auto flex-shrink-0 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                       {pendingCount}
                     </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Package badge */}
        <div className={cn("mx-3 mb-3 p-3 rounded-xl text-center", isPro ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20" : "bg-gray-50 border border-gray-100")}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            {isPro ? <Crown className="w-4 h-4 text-yellow-500" /> : <ShieldCheck className="w-4 h-4 text-gray-400" />}
            <span className={cn("text-xs font-bold", isPro ? "text-yellow-400" : "text-gray-500")}>{isPro ? 'GÓI PRO' : 'GÓI THƯỜNG'}</span>
          </div>
          {!isPro && (
            <button onClick={() => setUpgradePopup(true)} className="text-[10px] text-blue-600 hover:underline font-medium">
              Nâng cấp Pro →
            </button>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={onLogout}
            className={cn(
              "flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors text-red-600 bg-red-50 hover:bg-red-100"
            )}
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Upgrade Popup */}
      {upgradePopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 p-6 text-white text-center">
              <Crown className="w-12 h-12 mx-auto mb-2" />
              <h3 className="text-xl font-black">Nâng cấp gói Pro</h3>
              <p className="text-yellow-100 text-sm mt-1">Mở khóa tất cả tính năng cao cấp</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600 text-sm text-center">Tính năng này chỉ khả dụng ở gói <b className="text-yellow-600">Pro</b>. Vui lòng liên hệ để nâng cấp:</p>
              <div className="space-y-3">
                {contactInfo?.phone && (
                  <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 transition-colors font-bold text-sm">
                    <Phone className="w-5 h-5"/> {contactInfo.phone}
                  </a>
                )}
                {contactInfo?.email && (
                  <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 transition-colors font-bold text-sm">
                    <Mail className="w-5 h-5"/> {contactInfo.email}
                  </a>
                )}
                {!contactInfo && (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl text-blue-700 font-bold text-sm">
                      <Phone className="w-5 h-5"/> 0356959935
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl text-blue-700 font-bold text-sm">
                      <Mail className="w-5 h-5"/> phamminhhieu7804@gmail.com
                    </div>
                  </>
                )}
              </div>
              <button 
                onClick={() => setUpgradePopup(false)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { Settings, Users, ClipboardList, Calculator, Menu, Clock, FileText, ShieldCheck, LogOut, Camera, Lock, Crown, Phone, Mail, UtensilsCrossed, Grid2X2, History, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTranslation } from 'react-i18next';

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, pendingCount, photoPendingCount, onLogout, packageType, storeId }) {
  const isPro = packageType === 'Pro';
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

  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);
  };

  const lockedTabs = ['requests', 'payroll', 'shifts'];

  const navItems = [
    { id: 'settings', label: t('nav.settings'), icon: Settings },
    { id: 'employees', label: t('nav.employees'), icon: Users },
    { id: 'shifts', label: t('nav.shifts'), icon: Clock },
    { id: 'status', label: t('nav.status'), icon: Users },
    { id: 'menu', label: 'Thực đơn', icon: UtensilsCrossed },
    { id: 'tables', label: 'Bàn', icon: Grid2X2 },
    { id: 'history', label: 'Lịch sử & Doanh thu', icon: History },
    { id: 'audit_logs', label: 'Lịch sử Thao tác', icon: ClipboardList },
    { id: 'logs', label: t('nav.logs'), icon: FileText },
    { id: 'photos', label: t('nav.photos'), icon: Camera },
    { id: 'requests', label: t('nav.requests'), icon: FileText },
    { id: 'payroll', label: t('nav.payroll'), icon: Calculator },
    { id: 'subscription', label: t('nav.subscription'), icon: ShieldCheck },
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
                  {item.id === 'photos' && photoPendingCount > 0 && (
                     <span className="ml-auto flex-shrink-0 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                       {photoPendingCount}
                     </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Package badge */}
        <div 
          onClick={() => { if (!isPro) setActiveTab('subscription'); }}
          className={cn("mx-3 mb-3 p-3 rounded-xl text-center", isPro ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20" : "bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors")}
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            {isPro ? <Crown className="w-4 h-4 text-yellow-500" /> : <ShieldCheck className="w-4 h-4 text-gray-400" />}
            <span className={cn("text-xs font-bold", isPro ? "text-yellow-400" : "text-gray-500")}>{isPro ? 'GÓI PRO' : 'GÓI THƯỜNG'}</span>
          </div>
          {!isPro && (
            <span className="text-[10px] text-blue-600 font-medium">
              Nâng cấp Pro →
            </span>
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-200">
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors mb-2"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-blue-600" />
              <span>Ngôn ngữ / Language</span>
            </div>
            <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
              {i18n.language === 'vi' ? 'VI' : 'EN'}
            </span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{t('logout')}</span>
          </button>
        </div>
      </div>
    </>
  );
}

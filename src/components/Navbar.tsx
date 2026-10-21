import React, { useState } from 'react';
import {
  Plus,
  Users,
  Send,
  Database,
  Sliders,
  ShieldCheck,
  LogIn,
  LogOut,
  UserCheck,
  Menu,
  X,
  LayoutDashboard,
  Receipt,
  Wallet,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import type { AuthSession } from '../types/index.ts';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onOpenCreateInvite: () => void;
  isRegisteredView?: boolean;
  onBackToAdmin?: () => void;
  authSession: AuthSession | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  pendingDisbursementsCount?: number;
  communityName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateInvite,
  isRegisteredView,
  onBackToAdmin,
  authSession,
  onLogout,
  onOpenLogin,
  pendingDisbursementsCount = 0,
  communityName = 'Portal Sayuti.com',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const brandName = communityName?.trim() || 'Portal Komunitas';
  // Generate clean initials for logo badge (e.g. "Portal Sayuti.com" -> "PS", "Komunitas Kreatif" -> "KK")
  const initials =
    brandName
      .split(/\s+/)
      .map((word) => word.replace(/[^a-zA-Z0-9]/g, '')[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'PK';

  const adminNavItems = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'invitations', label: 'Undangan', icon: Plus },
    { id: 'members', label: 'Anggota', icon: Users },
    { id: 'invoices', label: 'Invoice & Komisi', icon: Receipt },
    {
      id: 'disbursements',
      label: 'Pencairan',
      icon: Wallet,
      badge: pendingDisbursementsCount > 0 ? pendingDisbursementsCount : undefined,
    },
    { id: 'logs', label: 'WhatsApp Log', icon: Send },
    { id: 'database', label: 'Database SQL', icon: Database },
    { id: 'settings', label: 'Pengaturan', icon: Sliders },
  ];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 w-full max-w-full">
      {/* Primary Top Bar */}
      <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Brand Wordmark (Safe responsive clipping) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          <button
            onClick={() => {
              if (isRegisteredView && onBackToAdmin) {
                onBackToAdmin();
              }
              if (authSession?.role === 'member') {
                setActiveTab('member-portal');
              } else if (authSession?.role === 'admin') {
                setActiveTab('overview');
              } else {
                setActiveTab('login');
              }
            }}
            className="flex items-center gap-2 text-left group min-w-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm shrink-0 transition-transform group-hover:scale-105">
              {initials}
            </div>
            <div className="min-w-0">
              <span
                title={brandName}
                className="text-xs sm:text-base font-bold tracking-tight text-slate-900 truncate block leading-tight max-w-[130px] xs:max-w-[170px] sm:max-w-[220px] md:max-w-xs lg:max-w-none"
              >
                {brandName}
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate block max-w-[130px] xs:max-w-[170px] sm:max-w-none">
                Portal Undangan & Anggota
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Links (>= lg) */}
        {!isRegisteredView && authSession?.role === 'admin' && (
          <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600">
            {adminNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
                  activeTab === item.id
                    ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
                    : ''
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        )}

        {!isRegisteredView && authSession?.role === 'member' && (
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => handleSelectTab('member-portal')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'member-portal'
                  ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
                  : ''
              }`}
            >
              Kartu & Profil Anggota
            </button>
          </nav>
        )}

        {isRegisteredView && (
          <div className="hidden sm:block text-xs sm:text-sm font-medium text-slate-600">
            <span>Halaman Registrasi Anggota</span>
          </div>
        )}

        {/* Action Controls & Mobile Toggles (Right) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isRegisteredView ? (
            <>
              {authSession ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-xs font-semibold text-slate-900 leading-tight">
                      {authSession.name}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {authSession.role === 'admin' ? 'Administrator' : 'Anggota'}
                    </span>
                  </div>
 
                  {/* Mobile Menu Toggle Button (Hamburger) */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="lg:hidden p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    title={mobileMenuOpen ? 'Tutup Menu' : 'Buka Menu'}
                    aria-label="Toggle menu"
                  >
                    {mobileMenuOpen ? (
                      <X className="w-4 h-4 text-slate-800" />
                    ) : (
                      <Menu className="w-4 h-4 text-slate-800" />
                    )}
                  </button>

                  <button
                    onClick={onLogout}
                    className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap"
                    title="Keluar dari sesi ini"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Keluar</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onOpenLogin}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm whitespace-nowrap"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Masuk</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={onBackToAdmin}
              className="inline-flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 text-slate-700" />
              <span>Kembali</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Horizontal Swipeable Sub-Nav Bar: Always visible on mobile devices */}
      {!isRegisteredView && authSession?.role === 'admin' && (
        <div className="lg:hidden bg-slate-100/90 border-t border-slate-200 px-2 py-1.5 overflow-x-auto no-scrollbar flex items-center gap-1.5 text-xs w-full max-w-full">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1 py-0.2 rounded-full ${
                      isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile Swipeable Sub-Nav Bar for Member */}
      {!isRegisteredView && authSession?.role === 'member' && (
        <div className="lg:hidden bg-slate-100/90 border-t border-slate-200 px-2 py-1.5 overflow-x-auto no-scrollbar flex items-center gap-1.5 text-xs w-full max-w-full">
          <button
            onClick={() => handleSelectTab('member-portal')}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-slate-900 text-white shadow-sm whitespace-nowrap shrink-0"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Kartu & Profil Anggota</span>
          </button>
        </div>
      )}

      {/* Mobile Drawer (Collapsible Dropdown Overlay for mobile) */}
      {mobileMenuOpen && !isRegisteredView && authSession && (
        <div className="lg:hidden border-t border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">{authSession.name}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                {authSession.role === 'admin' ? 'Administrator Komunitas' : 'Anggota Resmi'}
              </div>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>

          <div className="p-2 space-y-1 max-h-[75vh] overflow-y-auto">
            {authSession.role === 'admin' &&
              adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    )}
                  </button>
                );
              })}

            {authSession.role === 'member' && (
              <button
                onClick={() => handleSelectTab('member-portal')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-900 text-white"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-white" />
                  <span>Kartu & Profil Anggota</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

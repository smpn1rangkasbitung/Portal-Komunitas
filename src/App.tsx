import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { InvitationsManager } from './components/InvitationsManager.tsx';
import { MembersDirectory } from './components/MembersDirectory.tsx';
import { WhatsAppLogsManager } from './components/WhatsAppLogsManager.tsx';
import { DatabaseSchemaViewer } from './components/DatabaseSchemaViewer.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { CreateInviteModal } from './components/CreateInviteModal.tsx';
import { RegistrationPage } from './components/RegistrationPage.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { MemberPortal } from './components/MemberPortal.tsx';
import { InvoicesManager } from './components/InvoicesManager.tsx';
import { DisbursementsManager } from './components/DisbursementsManager.tsx';
import type {
  Member,
  Invitation,
  NotificationLog,
  Invoice,
  Disbursement,
  AppSettings,
  DatabaseStatus,
  DashboardStats,
  AuthSession,
} from './types/index.ts';

export default function App() {
  // Authentication session state (strictly persists from localStorage unless logged out)
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      const isLoggedOut = localStorage.getItem('community_logged_out');
      if (isLoggedOut === 'true') {
        localStorage.removeItem('community_auth_session');
        return null;
      }
      const saved = localStorage.getItem('community_auth_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // Navigation & View state - defaults to login if not authenticated
  const [activeTab, setActiveTab] = useState<'overview' | 'invitations' | 'members' | 'invoices' | 'disbursements' | 'logs' | 'database' | 'settings' | 'login' | 'member-portal'>(() => {
    try {
      const isLoggedOut = localStorage.getItem('community_logged_out');
      if (isLoggedOut === 'true') {
        return 'login';
      }
      const saved = localStorage.getItem('community_auth_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role === 'member') return 'member-portal';
        if (parsed.role === 'admin') return 'overview';
      }
    } catch (e) {
      console.error(e);
    }
    return 'login';
  });

  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Check URL on load for /join?token=xxx or ?token=xxx
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setPublicToken(tokenParam);
    }
  }, []);

  const loadAllData = async () => {
    try {
      const [statsRes, dbRes, invRes, memRes, invoicesRes, disbRes, logsRes, setRes] = await Promise.all([
        fetch('/api/stats').then((r) => r.json()).catch(() => null),
        fetch('/api/database/status').then((r) => r.json()).catch(() => null),
        fetch('/api/invitations').then((r) => r.json()).catch(() => []),
        fetch('/api/members').then((r) => r.json()).catch(() => []),
        fetch('/api/invoices').then((r) => r.json()).catch(() => []),
        fetch('/api/disbursements').then((r) => r.json()).catch(() => []),
        fetch('/api/whatsapp/logs').then((r) => r.json()).catch(() => []),
        fetch('/api/settings').then((r) => r.json()).catch(() => null),
      ]);

      if (statsRes) setStats(statsRes);
      if (dbRes) setDbStatus(dbRes);
      if (Array.isArray(invRes)) setInvitations(invRes);
      if (Array.isArray(memRes)) setMembers(memRes);
      if (Array.isArray(invoicesRes)) setInvoices(invoicesRes);
      if (Array.isArray(disbRes)) setDisbursements(disbRes);
      if (Array.isArray(logsRes)) setLogs(logsRes);
      if (setRes) setSettings(setRes);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleLoginSuccess = (session: AuthSession) => {
    setAuthSession(session);
    try {
      localStorage.removeItem('community_logged_out');
      localStorage.removeItem('community_just_logged_out');
      localStorage.setItem('community_auth_session', JSON.stringify(session));
    } catch (e) {
      console.error(e);
    }

    if (session.role === 'admin') {
      setActiveTab('overview');
    } else {
      setActiveTab('member-portal');
    }
  };

  const handleLogout = () => {
    setAuthSession(null);
    try {
      localStorage.removeItem('community_auth_session');
      localStorage.setItem('community_logged_out', 'true');
      localStorage.setItem('community_just_logged_out', 'true');
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    setActiveTab('login');
  };

  const handleOpenPublicPreview = (token?: string) => {
    if (token) {
      setPublicToken(token);
    } else {
      const active = invitations.find((i) => i.status === 'pending');
      if (active) {
        setPublicToken(active.token);
      } else {
        setIsCreateModalOpen(true);
      }
    }
  };

  const handleBackToPortal = () => {
    setPublicToken(null);
    window.history.pushState({}, '', window.location.pathname);
    loadAllData();
  };

  const handleSuccessRegistered = (newMember: Member) => {
    loadAllData();
  };

  const handleMemberUpdated = (updatedMember: Member) => {
    if (authSession?.member?.id === updatedMember.id) {
      const updatedSession: AuthSession = {
        ...authSession,
        name: updatedMember.full_name,
        member: updatedMember,
      };
      setAuthSession(updatedSession);
      localStorage.setItem('community_auth_session', JSON.stringify(updatedSession));
    }
    loadAllData();
  };

  // If in Public Registration View
  if (publicToken) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans w-full max-w-full overflow-x-hidden">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenCreateInvite={() => setIsCreateModalOpen(true)}
          isRegisteredView={true}
          onBackToAdmin={handleBackToPortal}
          authSession={authSession}
          onLogout={handleLogout}
          onOpenLogin={() => {
            setPublicToken(null);
            setActiveTab('login');
          }}
          communityName={settings?.community_name}
        />
        <main className="flex-1 w-full max-w-full min-w-0 overflow-x-hidden">
          <RegistrationPage
            token={publicToken}
            onSuccessRegistered={handleSuccessRegistered}
            onNavigateToAdmin={handleBackToPortal}
          />
        </main>
        <footer className="py-6 border-t border-slate-200 text-center text-xs text-slate-500 bg-white px-4">
          <span>{settings?.community_name || 'Portal Sayuti.com'} · Portal Pendaftaran Resmi Terenkripsi</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateInvite={() => setIsCreateModalOpen(true)}
        isRegisteredView={false}
        authSession={authSession}
        onLogout={handleLogout}
        onOpenLogin={() => setActiveTab('login')}
        pendingDisbursementsCount={stats?.pendingDisbursements ?? 0}
        communityName={settings?.community_name}
      />

      <main className="flex-1 w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 min-w-0 max-w-full overflow-x-hidden">
        {/* View 1: Login Form (Admin & Anggota) */}
        {activeTab === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            availableMembers={members}
            communityName={settings?.community_name}
          />
        )}

        {/* View 2: Member Portal (When Member Logged In) */}
        {authSession?.role === 'member' && authSession.member && activeTab === 'member-portal' && (
          <MemberPortal
            member={authSession.member}
            settings={settings}
            onLogout={handleLogout}
            onMemberUpdated={handleMemberUpdated}
          />
        )}

        {/* Admin Views (Protected) */}
        {authSession?.role === 'admin' && (
          <>
            {activeTab === 'overview' && (
              <DashboardOverview
                stats={stats}
                dbStatus={dbStatus}
                onOpenCreateInvite={() => setIsCreateModalOpen(true)}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'invitations' && (
              <InvitationsManager
                invitations={invitations}
                onRefresh={loadAllData}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                communityName={settings?.community_name}
              />
            )}

            {activeTab === 'members' && (
              <MembersDirectory
                members={members}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'invoices' && (
              <InvoicesManager
                invoices={invoices}
                members={members}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'disbursements' && (
              <DisbursementsManager
                disbursements={disbursements}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'logs' && (
              <WhatsAppLogsManager
                logs={logs}
                settings={settings}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'database' && (
              <DatabaseSchemaViewer
                status={dbStatus}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsModal
                settings={settings}
                onRefresh={loadAllData}
              />
            )}
          </>
        )}

        {/* If user logged in as Member but clicks non-member tab */}
        {authSession?.role === 'member' && activeTab !== 'member-portal' && activeTab !== 'login' && (
          <div className="max-w-md mx-auto my-12 text-center bg-white border border-slate-200 p-8 rounded-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-2">Area Khusus Administrator</h3>
            <p className="text-xs text-slate-600 mb-4">
              Anda sedang masuk sebagai anggota ({authSession.name}). Halaman ini hanya dapat diakses oleh Administrator.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setActiveTab('member-portal')}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Kembali ke Area Anggota
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Ganti Akun (Logout)
              </button>
            </div>
          </div>
        )}

        {/* If user not logged in and not on login tab */}
        {!authSession && activeTab !== 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            availableMembers={members}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-500">
        <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>{settings?.community_name || 'Portal Sayuti.com'}</span>
            <span className="mx-2">·</span>
            <span>Sistem Undangan 1-Link 1-Registrasi & WhatsApp Gateway</span>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <span>Gateway: tiket.sayuti.com</span>
            {!authSession && (
              <button
                onClick={() => setActiveTab('login')}
                className="text-blue-600 hover:underline font-medium"
              >
                Form Login
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modal Create Invite */}
      <CreateInviteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadAllData}
        onOpenPublicPreview={handleOpenPublicPreview}
      />
    </div>
  );
}

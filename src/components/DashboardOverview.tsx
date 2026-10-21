import React from 'react';
import {
  Users,
  Send,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  MessageSquare,
  Receipt,
  Wallet,
} from 'lucide-react';
import type { DashboardStats, DatabaseStatus } from '../types/index.ts';

interface DashboardOverviewProps {
  stats: DashboardStats | null;
  dbStatus: DatabaseStatus | null;
  onOpenCreateInvite: () => void;
  onNavigateTab: (tab: 'invitations' | 'members' | 'invoices' | 'disbursements' | 'logs' | 'database') => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  stats,
  dbStatus,
  onOpenCreateInvite,
  onNavigateTab,
}) => {
  const successRate = stats && stats.totalNotifications > 0
    ? Math.round((stats.successfulNotifications / stats.totalNotifications) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Members */}
        <div
          onClick={() => onNavigateTab('members')}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Anggota Terdaftar</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
            {stats?.totalMembers ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Nomor referensi unik aktif</span>
            <span className="text-slate-900 font-medium group-hover:underline">Lihat »</span>
          </div>
        </div>

        {/* Card 2: Active Invitations */}
        <div
          onClick={() => onNavigateTab('invitations')}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Undangan Aktif</span>
            <LinkIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-blue-600 tabular-nums font-mono">
            {stats?.activeInvitations ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>1 link 1 registrasi</span>
            <span className="text-blue-600 font-medium group-hover:underline">Kelola »</span>
          </div>
        </div>

        {/* Card 3: Used Invitations */}
        <div
          onClick={() => onNavigateTab('invitations')}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Undangan Terpakai</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums font-mono">
            {stats?.usedInvitations ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Tervalidasi & hangus</span>
            <span className="text-emerald-700 font-medium">Selesai</span>
          </div>
        </div>

        {/* Card 4: WhatsApp Gateway */}
        <div
          onClick={() => onNavigateTab('logs')}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">WhatsApp Dispatches</span>
            <Send className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
            {stats?.totalNotifications ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Sukses: {successRate}%</span>
            <span className="text-slate-900 font-medium group-hover:underline">Log »</span>
          </div>
        </div>

        {/* Card 5: Invoices & Commissions (Tabel invoice) */}
        <div
          onClick={() => onNavigateTab('invoices')}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Invoice & Komisi</span>
            <Receipt className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 tabular-nums font-mono">
            Rp {(stats?.totalCommissionPaid ?? 0).toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{stats?.totalPaidInvoices ?? 0} order lunas</span>
            <span className="text-blue-600 font-medium group-hover:underline">Kelola »</span>
          </div>
        </div>

        {/* Card 6: Pencairan Komisi (Withdrawals & Approval) */}
        <div
          onClick={() => onNavigateTab('disbursements')}
          className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors cursor-pointer group relative overflow-hidden"
        >
          {(stats?.pendingDisbursements ?? 0) > 0 && (
            <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
          )}
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Approval Pencairan</span>
            <Wallet className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="flex items-baseline gap-2">
            <div className={`text-2xl font-bold font-mono tabular-nums ${(stats?.pendingDisbursements ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {stats?.pendingDisbursements ?? 0}
            </div>
            {(stats?.pendingDisbursements ?? 0) > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full animate-pulse">
                Menunggu
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Cair: Rp {(stats?.totalDisbursedAmount ?? 0).toLocaleString('id-ID')}</span>
            <span className="text-emerald-700 font-medium group-hover:underline">Kelola »</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Members & Recent WhatsApp Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Members */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Anggota Baru Terverifikasi</h3>
              <p className="text-xs text-slate-500">Anggota yang baru saja menyelesaikan registrasi</p>
            </div>
            <button
              onClick={() => onNavigateTab('members')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-0.5"
            >
              <span>Semua Anggota</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!stats?.recentMembers || stats.recentMembers.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Belum ada anggota yang mendaftar. Buat undangan pertama Anda untuk memulai.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentMembers.map((member) => (
                <div key={member.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{member.full_name}</div>
                    <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-blue-700 font-medium">{member.reference_number}</span>
                      <span>·</span>
                      <span>{member.city || 'Indonesia'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[11px] text-slate-600 block tabular-nums">
                      {member.phone_number}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(member.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent WhatsApp Logs */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Log Aktivitas WhatsApp Terkini</h3>
              <p className="text-xs text-slate-500">Catatan pengiriman pesan otomatis gateway</p>
            </div>
            <button
              onClick={() => onNavigateTab('logs')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-0.5"
            >
              <span>Semua Log</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!stats?.recentLogs || stats.recentLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Belum ada pesan yang dikirimkan melalui WhatsApp Gateway.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold uppercase ${
                          log.status === 'success' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {log.status === 'success' ? 'Terkirim' : 'Gagal'}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-700 font-mono tabular-nums">{log.recipient_phone}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] truncate mt-0.5 max-w-sm">
                      {log.message_body}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[10px] text-slate-400 block tabular-nums">
                      {new Date(log.created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="text-[10px] text-slate-400 block uppercase">
                      {log.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

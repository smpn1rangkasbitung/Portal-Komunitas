import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  Link as LinkIcon,
  Copy,
  Check,
  Send,
  Trash2,
  ExternalLink,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Share2,
  RotateCw,
  Sparkles,
  QrCode,
  X,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type { Invitation } from '../types/index.ts';
import { Pagination } from './Pagination.tsx';

interface InvitationsManagerProps {
  invitations: Invitation[];
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  communityName?: string;
}

export const InvitationsManager: React.FC<InvitationsManagerProps> = ({
  invitations,
  onRefresh,
  onOpenCreateModal,
  communityName = 'Portal Sayuti.com',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'used' | 'revoked'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedFullLinkId, setCopiedFullLinkId] = useState<number | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [quickGenerating, setQuickGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [shareModalInvite, setShareModalInvite] = useState<Invitation | null>(null);
  const [copiedModalLink, setCopiedModalLink] = useState(false);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getInviteUrl = (token: string) => {
    const origin = window.location.origin;
    return `${origin}/join?token=${token}`;
  };

  // Find the primary active invitation for quick access banner
  const latestActiveInvite = invitations.find((i) => i.status === 'pending');

  const handleCopyLink = (inv: Invitation) => {
    const url = getInviteUrl(inv.token);
    navigator.clipboard.writeText(url);
    setCopiedFullLinkId(inv.id);
    showToast(`Tautan pendaftaran untuk ${inv.recipient_name} berhasil disalin!`);
    setTimeout(() => setCopiedFullLinkId(null), 2000);
  };

  const handleCopyTokenOnly = (inv: Invitation) => {
    navigator.clipboard.writeText(inv.token);
    setCopiedId(inv.id);
    showToast(`Token '${inv.token}' berhasil disalin ke clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerateToken = async (inv: Invitation) => {
    const result = await Swal.fire({
      title: 'Generate Ulang Token?',
      html: `Generate ulang token untuk <b>${inv.recipient_name}</b>?<br/><br/><span class="text-xs text-slate-500">Token lama (<code>${inv.token}</code>) akan dinonaktifkan dan digantikan dengan token baru. Tautan pendaftaran otomatis diperbarui dengan masa aktif 7 hari.</span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0f172a',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Generate Baru',
      cancelButtonText: 'Batal',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl shadow-xl',
        confirmButton: 'rounded-xl text-xs sm:text-sm font-medium px-4 py-2.5',
        cancelButton: 'rounded-xl text-xs sm:text-sm font-medium px-4 py-2.5',
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    setRegeneratingId(inv.id);
    try {
      const res = await fetch(`/api/invitations/${inv.id}/regenerate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_in_days: 7 }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await Swal.fire({
          title: 'Token Diperbarui!',
          text: `Token untuk ${inv.recipient_name} berhasil di-generate ulang.`,
          icon: 'success',
          timer: 1600,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-2xl',
          },
        });
        showToast(`Token untuk ${inv.recipient_name} berhasil di-generate ulang!`);
        if (shareModalInvite && shareModalInvite.id === inv.id) {
          setShareModalInvite(data.invitation);
        }
        onRefresh();
      } else {
        Swal.fire({
          title: 'Gagal',
          text: data.error || 'Gagal generate ulang token.',
          icon: 'error',
          customClass: {
            popup: 'rounded-2xl',
          },
        });
      }
    } catch (e: any) {
      Swal.fire({
        title: 'Kesalahan Jaringan',
        text: 'Terjadi kesalahan jaringan: ' + e.message,
        icon: 'error',
        customClass: {
          popup: 'rounded-2xl',
        },
      });
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleQuickGenerate = async () => {
    setQuickGenerating(true);
    try {
      const res = await fetch('/api/invitations/quick-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name: 'Calon Anggota',
          expires_in_days: 7,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        navigator.clipboard.writeText(data.invite_link);
        await Swal.fire({
          title: 'Tautan Berhasil Dibuat!',
          text: 'Tautan pendaftaran baru dengan token telah dibuat dan otomatis disalin ke clipboard.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-2xl',
          },
        });
        showToast(`Link pendaftaran baru dengan token berhasil dibuat & disalin!`);
        onRefresh();
        setShareModalInvite(data.invitation);
      } else {
        Swal.fire({
          title: 'Gagal',
          text: data.error || 'Gagal membuat link pendaftaran cepat.',
          icon: 'error',
          customClass: {
            popup: 'rounded-2xl',
          },
        });
      }
    } catch (e: any) {
      Swal.fire({
        title: 'Kesalahan',
        text: 'Terjadi kesalahan: ' + e.message,
        icon: 'error',
        customClass: {
          popup: 'rounded-2xl',
        },
      });
    } finally {
      setQuickGenerating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    const result = await Swal.fire({
      title: 'Batalkan Undangan?',
      text: 'Apakah Anda yakin ingin membatalkan undangan ini? Tautan tidak akan bisa digunakan lagi.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Batalkan Undangan',
      cancelButtonText: 'Batal',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl shadow-xl',
        confirmButton: 'rounded-xl text-xs sm:text-sm font-medium px-4 py-2.5',
        cancelButton: 'rounded-xl text-xs sm:text-sm font-medium px-4 py-2.5',
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await Swal.fire({
          title: 'Undangan Dibatalkan',
          text: 'Undangan berhasil dinonaktifkan.',
          icon: 'success',
          timer: 1600,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-2xl',
          },
        });
        showToast('Undangan berhasil dibatalkan.');
        onRefresh();
      } else {
        const d = await res.json().catch(() => ({}));
        Swal.fire({
          title: 'Gagal',
          text: d.error || 'Gagal membatalkan undangan.',
          icon: 'error',
          customClass: {
            popup: 'rounded-2xl',
          },
        });
      }
    } catch (e: any) {
      Swal.fire({
        title: 'Kesalahan',
        text: 'Terjadi kesalahan: ' + e.message,
        icon: 'error',
        customClass: {
          popup: 'rounded-2xl',
        },
      });
    }
  };

  const handleSendWhatsApp = async (inv: Invitation) => {
    setSendingId(inv.id);
    try {
      const link = getInviteUrl(inv.token);
      const res = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_phone: inv.recipient_phone,
          message: `Halo ${inv.recipient_name}! Anda diundang untuk bergabung ke ${communityName}. Silakan lengkapi pendaftaran 1-kali-pakai via tautan resmi berikut: ${link}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Undangan via WhatsApp berhasil dikirim ke ${inv.recipient_phone}!`);
      } else {
        showToast(`Pengiriman dicatat: ${data.error || 'Periksa konfigurasi WhatsApp API'}`);
      }
      onRefresh();
    } catch (e: any) {
      Swal.fire({
        title: 'Gagal Mengirim WhatsApp',
        text: e.message || 'Terjadi kesalahan pengiriman pesan.',
        icon: 'error',
        customClass: {
          popup: 'rounded-2xl',
        },
      });
    } finally {
      setSendingId(null);
    }
  };

  const filtered = invitations.filter((inv) => {
    const matchesSearch =
      inv.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.recipient_phone.includes(searchTerm) ||
      inv.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.member_reference && inv.member_reference.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedInvitations = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Manajemen Undangan (1 Link 1 Registrasi)
            </h2>
            <span className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold border border-slate-200">
              Token Berbasis Keamanan Tinggi
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap link memiliki token unik 1-kali-pakai. Token dapat di-generate ulang kapan saja dan langsung hangus setelah pendaftaran selesai.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            onClick={handleQuickGenerate}
            disabled={quickGenerating}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Generate token pendaftaran baru secara instan"
          >
            <RotateCw className={`w-3.5 h-3.5 text-blue-600 ${quickGenerating ? 'animate-spin' : ''}`} />
            <span>{quickGenerating ? 'Membuat Token...' : 'Generate Token Baru'}</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Undangan Khusus</span>
          </button>
        </div>
      </div>

      {/* Highlight Box: Tautan Pendaftaran Terkini & Fitur Token Generate Ulang */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900">
                Link Pendaftaran dengan Token Aktif
              </span>
              <span className="text-[11px] text-slate-500 ml-2 hidden sm:inline">
                (Siap dibagikan ke calon anggota)
              </span>
            </div>
          </div>

          {latestActiveInvite && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Penerima:</span>
              <span className="font-semibold text-slate-800">{latestActiveInvite.recipient_name}</span>
              <span className="text-blue-700 font-mono text-[11px] bg-blue-100/70 px-2 py-0.5 rounded">
                {latestActiveInvite.token}
              </span>
            </div>
          )}
        </div>

        {latestActiveInvite ? (
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full min-w-0">
            <div className="flex-1 relative flex items-center min-w-0">
              <input
                type="text"
                readOnly
                value={getInviteUrl(latestActiveInvite.token)}
                className="w-full pl-3 pr-20 py-2 text-xs font-mono bg-white border border-blue-300 rounded-lg focus:outline-none text-slate-800 shadow-sm selection:bg-blue-100 truncate"
              />
              <span className="absolute right-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                Token Aktif
              </span>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
              {/* Copy Full Link Button */}
              <button
                onClick={() => handleCopyLink(latestActiveInvite)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm whitespace-nowrap"
              >
                {copiedFullLinkId === latestActiveInvite.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>

              {/* Generate Ulang Token Button */}
              <button
                onClick={() => handleRegenerateToken(latestActiveInvite)}
                disabled={regeneratingId === latestActiveInvite.id}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-lg transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
                title="Ganti token lama dengan token baru untuk tautan ini"
              >
                <RotateCw className={`w-3.5 h-3.5 text-blue-600 ${regeneratingId === latestActiveInvite.id ? 'animate-spin' : ''}`} />
                <span>Generate Ulang Token</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-white border border-dashed border-blue-200 rounded-xl">
            <div className="text-xs text-slate-600">
              Saat ini belum ada link pendaftaran aktif dengan status pending. Anda dapat membuat token baru secara instan.
            </div>
            <button
              onClick={handleQuickGenerate}
              disabled={quickGenerating}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Link & Token Baru</span>
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-1">
          <span className="flex items-center gap-1 text-blue-800 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            1 Link = 1 Registrasi (Otomatis hangus saat pendaftaran sukses)
          </span>
          <span className="text-slate-400">·</span>
          <span>Jika token bocor atau kedaluwarsa, klik <strong>Generate Ulang Token</strong> untuk memperbarui link secara aman.</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nama, nomor WhatsApp, atau kode token..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
          />
        </div>

        {/* Status Filter Segmented Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({invitations.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'pending' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aktif ({invitations.filter((i) => i.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('used')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'used' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Terpakai ({invitations.filter((i) => i.status === 'used').length})
          </button>
          <button
            onClick={() => setStatusFilter('revoked')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'revoked' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dibatalkan ({invitations.filter((i) => i.status === 'revoked').length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Calon Anggota</th>
                <th className="py-3 px-4">Nomor WhatsApp</th>
                <th className="py-3 px-4">Status Undangan</th>
                <th className="py-3 px-4">Token & Link Pendaftaran</th>
                <th className="py-3 px-4">Masa Berlaku / Terpakai</th>
                <th className="py-3 px-4 text-right">Tindakan & Generate Token</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Tidak ada data undangan yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                paginatedInvitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Recipient */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.recipient_name}</div>
                      <div className="text-[11px] text-slate-400">Oleh: {inv.created_by}</div>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-800 tabular-nums font-medium">
                        {inv.recipient_phone}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {inv.status === 'pending' && (
                        <div className="flex items-center gap-1.5 text-blue-700">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-semibold">Aktif (Belum Digunakan)</span>
                        </div>
                      )}
                      {inv.status === 'used' && (
                        <div>
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Terpakai (Hangus)</span>
                          </div>
                          {inv.member_reference && (
                            <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                              Ref: {inv.member_reference}
                            </div>
                          )}
                        </div>
                      )}
                      {inv.status === 'revoked' && (
                        <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Dibatalkan</span>
                        </div>
                      )}
                      {inv.status === 'expired' && (
                        <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Kedaluwarsa</span>
                        </div>
                      )}
                    </td>

                    {/* Token & URL with Copy Actions */}
                    <td className="py-3 px-4">
                      <div className="space-y-1 max-w-[260px]">
                        {/* Token Badge */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded truncate">
                            {inv.token}
                          </span>
                          <button
                            onClick={() => handleCopyTokenOnly(inv)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-800 transition-colors shrink-0"
                            title="Salin kode token saja"
                          >
                            {copiedId === inv.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Full Link Quick Copy */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyLink(inv)}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-medium truncate"
                            title="Salin link pendaftaran lengkap"
                          >
                            <LinkIcon className="w-3 h-3 shrink-0" />
                            <span className="truncate">Salin Link Pendaftaran</span>
                          </button>
                          {copiedFullLinkId === inv.id && (
                            <span className="text-[10px] text-emerald-600 font-semibold">
                              ✓ Tersalin
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Date & Expiry */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] text-slate-700 tabular-nums">
                        Dibuat:{' '}
                        {new Date(inv.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      {inv.used_at ? (
                        <div className="text-[10px] text-emerald-700 font-medium">
                          Digunakan:{' '}
                          {new Date(inv.used_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      ) : inv.expires_at ? (
                        <div className="text-[10px] text-slate-400">
                          Berlaku s/d:{' '}
                          {new Date(inv.expires_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      ) : null}
                    </td>

                    {/* Actions & Regenerate Token */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {/* GENERATE ULANG TOKEN BUTTON */}
                        <button
                          onClick={() => handleRegenerateToken(inv)}
                          disabled={regeneratingId === inv.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
                          title="Generate ulang token baru untuk undangan ini"
                        >
                          <RotateCw
                            className={`w-3.5 h-3.5 ${regeneratingId === inv.id ? 'animate-spin' : ''}`}
                          />
                          <span className="hidden xl:inline">Generate Ulang</span>
                        </button>

                        {/* Detail / Share Modal */}
                        <button
                          onClick={() => setShareModalInvite(inv)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Detail dan Bagikan Tautan / QR"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Send via WhatsApp */}
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => handleSendWhatsApp(inv)}
                            disabled={sendingId === inv.id}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                            title="Kirim link undangan ke WhatsApp penerima"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Revoke */}
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Batalkan tautan undangan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Limit Control */}
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="undangan"
        />
      </div>

      {/* Modal: Detail, QR & Bagikan Tautan Undangan */}
      {shareModalInvite && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in duration-200">
            <button
              onClick={() => setShareModalInvite(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Detail Undangan & Token Registrasi</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {shareModalInvite.recipient_name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Nomor WhatsApp: <span className="font-mono text-slate-700 font-medium">{shareModalInvite.recipient_phone}</span>
            </p>

            <div className="space-y-4">
              {/* Token Display Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">Kode Token Rahasia</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    shareModalInvite.status === 'pending'
                      ? 'bg-blue-100 text-blue-800'
                      : shareModalInvite.status === 'used'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {shareModalInvite.status.toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-slate-900 bg-white p-2 rounded border border-slate-200 select-all">
                  {shareModalInvite.token}
                </div>
              </div>

              {/* Full Registration Link */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Tautan Lengkap Pendaftaran (1 Link 1 Registrasi)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getInviteUrl(shareModalInvite.token)}
                    className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-800 select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getInviteUrl(shareModalInvite.token));
                      setCopiedModalLink(true);
                      setTimeout(() => setCopiedModalLink(false), 2000);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    {copiedModalLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="pt-2">
                <button
                  onClick={() => handleRegenerateToken(shareModalInvite)}
                  disabled={regeneratingId === shareModalInvite.id}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${regeneratingId === shareModalInvite.id ? 'animate-spin' : ''}`} />
                  <span>Generate Ulang Token Ini</span>
                </button>
              </div>

              {shareModalInvite.status === 'pending' && (
                <button
                  onClick={() => handleSendWhatsApp(shareModalInvite)}
                  disabled={sendingId === shareModalInvite.id}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Tautan Ini via WhatsApp Gateway</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  QrCode,
  Copy,
  Check,
  Send,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  LogOut,
  Save,
  ShieldCheck,
  Sparkles,
  Lock,
  Key,
  Receipt,
  Coins,
  Clock,
  CreditCard,
  TrendingUp,
  Wallet,
  Building,
  ArrowDownToLine,
  XCircle,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import type { Member, AppSettings, MemberCommissionSummary, Disbursement } from '../types/index.ts';
import { Pagination } from './Pagination.tsx';

interface MemberPortalProps {
  member: Member;
  settings: AppSettings | null;
  onLogout: () => void;
  onMemberUpdated: (updated: Member) => void;
}

export const MemberPortal: React.FC<MemberPortalProps> = ({
  member,
  settings,
  onLogout,
  onMemberUpdated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'card_profile' | 'commission' | 'disbursements'>('card_profile');
  const [copiedRef, setCopiedRef] = useState(false);
  const [resendingWa, setResendingWa] = useState(false);
  const [waFeedback, setWaFeedback] = useState<string | null>(null);

  // Commission & Invoices state from table invoice
  const [commissionSummary, setCommissionSummary] = useState<MemberCommissionSummary | null>(null);
  const [loadingCommission, setLoadingCommission] = useState(false);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesPageSize, setInvoicesPageSize] = useState(10);

  // Disbursements history pagination
  const [disbursementsPage, setDisbursementsPage] = useState(1);
  const [disbursementsPageSize, setDisbursementsPageSize] = useState(10);

  // Withdrawal (Request Pencairan) State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('BCA (Bank Central Asia)');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('');
  const [withdrawAccountHolder, setWithdrawAccountHolder] = useState(member.full_name || '');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [withdrawSendWa, setWithdrawSendWa] = useState(true);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // Profile Edit State
  const [email, setEmail] = useState(member.email || '');
  const [city, setCity] = useState(member.city || '');
  const [bioInterest, setBioInterest] = useState(member.bio_interest || '');
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Rekening Bank Pencairan Dana State
  const [bankName, setBankName] = useState(member.bank_name || 'BCA (Bank Central Asia)');
  const [accountNumber, setAccountNumber] = useState(member.account_number || '');
  const [accountHolder, setAccountHolder] = useState(member.account_holder || member.full_name || '');
  const [savingBank, setSavingBank] = useState(false);
  const [bankSuccess, setBankSuccess] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sync state if member prop updates
  React.useEffect(() => {
    if (member.bank_name) setBankName(member.bank_name);
    if (member.account_number) setAccountNumber(member.account_number);
    if (member.account_holder) setAccountHolder(member.account_holder);
    if (member.email) setEmail(member.email);
    if (member.city) setCity(member.city);
    if (member.bio_interest) setBioInterest(member.bio_interest);
  }, [member]);

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankError(null);
    setBankSuccess(false);

    if (!accountNumber.trim()) {
      setBankError('Nomor rekening atau nomor e-wallet pencairan wajib diisi.');
      return;
    }

    setSavingBank(true);
    try {
      const res = await fetch('/api/members/me/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          account_holder: accountHolder.trim() || member.full_name,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBankSuccess(true);
        onMemberUpdated(data.member);
        setWithdrawBank(bankName.trim());
        setWithdrawAccountNumber(accountNumber.trim());
        setWithdrawAccountHolder(accountHolder.trim() || member.full_name);
        setTimeout(() => setBankSuccess(false), 3500);
      } else {
        setBankError(data.error || 'Gagal menyimpan rekening pencairan.');
      }
    } catch (e: any) {
      setBankError('Koneksi terputus: ' + e.message);
    } finally {
      setSavingBank(false);
    }
  };

  const loadCommission = async () => {
    setLoadingCommission(true);
    try {
      const res = await fetch(`/api/members/me/commission?nomor_referensi=${encodeURIComponent(member.reference_number)}`);
      const data = await res.json();
      if (res.ok) {
        setCommissionSummary(data);
      }
    } catch (e) {
      console.error('Error loading commission:', e);
    } finally {
      setLoadingCommission(false);
    }
  };

  React.useEffect(() => {
    loadCommission();
  }, [member.reference_number]);

  const handleCopy = () => {
    navigator.clipboard.writeText(member.reference_number);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleResendWa = async () => {
    setResendingWa(true);
    setWaFeedback(null);
    try {
      const res = await fetch('/api/members/me/resend-card-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: member.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWaFeedback('Kartu keanggotaan dan nomor referensi berhasil dikirimkan ke WhatsApp Anda!');
      } else {
        setWaFeedback(data.error || 'Gagal mengirim notifikasi WhatsApp.');
      }
    } catch (e: any) {
      setWaFeedback('Terjadi kesalahan: ' + e.message);
    } finally {
      setResendingWa(false);
      setTimeout(() => setWaFeedback(null), 4000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setUpdateSuccess(false);

    try {
      const res = await fetch('/api/members/me/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          email,
          city,
          bio_interest: bioInterest,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUpdateSuccess(true);
        onMemberUpdated(data.member);
        setTimeout(() => setUpdateSuccess(false), 3000);
      } else {
        Swal.fire({
          title: 'Gagal',
          text: data.error || 'Gagal memperbarui profil.',
          icon: 'error',
          customClass: { popup: 'rounded-2xl' },
        });
      }
    } catch (e: any) {
      Swal.fire({
        title: 'Kesalahan Jaringan',
        text: 'Terjadi kesalahan koneksi: ' + e.message,
        icon: 'error',
        customClass: { popup: 'rounded-2xl' },
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!newPassword || newPassword.length < 5) {
      setPasswordError('Kata sandi baru minimal 5 karakter.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/members/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordSuccess(true);
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        setPasswordError(data.error || 'Gagal mengubah kata sandi.');
      }
    } catch (e: any) {
      setPasswordError('Terjadi kesalahan koneksi: ' + e.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleOpenWithdrawModal = (suggestedAmount?: number) => {
    setWithdrawError(null);
    setWithdrawSuccess(null);
    setWithdrawBank(member.bank_name || bankName || 'BCA (Bank Central Asia)');
    setWithdrawAccountNumber(member.account_number || accountNumber || '');
    setWithdrawAccountHolder(member.account_holder || accountHolder || member.full_name || '');

    if (suggestedAmount !== undefined) {
      setWithdrawAmount(String(suggestedAmount));
    } else if (commissionSummary && commissionSummary.availableBalance > 0) {
      setWithdrawAmount(String(commissionSummary.availableBalance));
    } else {
      setWithdrawAmount('');
    }
    setIsWithdrawModalOpen(true);
  };

  const handleSubmitWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);

    const amount = parseFloat(withdrawAmount);
    const minAmount = settings?.min_disbursement_amount || 25000;
    const available = commissionSummary?.availableBalance ?? 0;

    if (isNaN(amount) || amount <= 0) {
      setWithdrawError('Nominal pencairan harus lebih dari 0.');
      return;
    }

    if (amount < minAmount) {
      setWithdrawError(`Minimal pencairan komisi adalah Rp ${minAmount.toLocaleString('id-ID')}.`);
      return;
    }

    if (amount > available) {
      setWithdrawError(`Saldo komisi siap cair Anda tidak mencukupi (Tersedia: Rp ${available.toLocaleString('id-ID')}).`);
      return;
    }

    if (!withdrawAccountNumber.trim() || !withdrawAccountHolder.trim()) {
      setWithdrawError('Nomor rekening dan nama pemilik rekening wajib diisi.');
      return;
    }

    setSubmittingWithdraw(true);
    try {
      const res = await fetch('/api/disbursements/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: member.id,
          reference_number: member.reference_number,
          amount: amount,
          bank_name: withdrawBank,
          account_number: withdrawAccountNumber.trim(),
          account_holder: withdrawAccountHolder.trim(),
          notes: withdrawNotes.trim() || undefined,
          send_whatsapp: withdrawSendWa,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWithdrawSuccess('Permohonan pencairan komisi berhasil diajukan! Menunggu persetujuan dan transfer dari admin.');
        // Also auto-save bank details to profile if not saved yet
        if (!member.account_number || member.account_number !== withdrawAccountNumber.trim()) {
          fetch('/api/members/me/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              member_id: member.id,
              bank_name: withdrawBank,
              account_number: withdrawAccountNumber.trim(),
              account_holder: withdrawAccountHolder.trim(),
            }),
          }).then((r) => r.json()).then((d) => {
            if (d.success && d.member) {
              onMemberUpdated(d.member);
            }
          }).catch(() => {});
        }
        loadCommission();
        setTimeout(() => {
          setIsWithdrawModalOpen(false);
          setActiveSubTab('disbursements');
        }, 1500);
      } else {
        setWithdrawError(data.error || 'Gagal mengajukan pencairan.');
      }
    } catch (err: any) {
      setWithdrawError('Kesalahan jaringan: ' + err.message);
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Welcome Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Anggota Resmi Terverifikasi
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="font-mono text-xs text-slate-600 tabular-nums">
              Ref: {member.reference_number}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Selamat Datang, {member.full_name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {settings?.community_name || 'Portal Sayuti.com'}
          </p>
        </div>

        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar (Logout)</span>
        </button>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('card_profile')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === 'card_profile'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Kartu & Profil Anggota
        </button>
        <button
          onClick={() => {
            setActiveSubTab('commission');
            loadCommission();
          }}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === 'commission'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Komisi & Referral Order</span>
          {commissionSummary && commissionSummary.totalEarnedCommission > 0 && (
            <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-mono font-bold tabular-nums">
              Rp {commissionSummary.totalEarnedCommission.toLocaleString('id-ID')}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveSubTab('disbursements');
            loadCommission();
          }}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            activeSubTab === 'disbursements'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Pencairan Komisi</span>
          {commissionSummary && (commissionSummary.pendingDisbursementAmount > 0 || commissionSummary.availableBalance > 0) && (
            <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-mono font-bold tabular-nums">
              {commissionSummary.pendingDisbursementAmount > 0
                ? `${commissionSummary.disbursements?.filter(d => d.status === 'pending').length || 1} Pending`
                : 'Siap Tarik'}
            </span>
          )}
        </button>
      </div>

      {waFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{waFeedback}</span>
        </div>
      )}

      {/* Tab 1: Card & Profile */}
      {activeSubTab === 'card_profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Digital Member Card */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Kartu Tanda Anggota Digital</h3>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden">
              <div className="flex items-start justify-between border-b border-slate-700/70 pb-3 mb-4">
                <div>
                  <span className="text-[10px] text-blue-400 uppercase font-semibold tracking-wider">
                    Kartu Keanggotaan Resmi
                  </span>
                  <div className="text-base font-bold text-white">
                    {settings?.community_name || 'Portal Sayuti.com'}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-blue-400" />
                </div>
              </div>

              <div className="mb-4">
                <span className="text-[10px] text-slate-400 block">Nomor Referensi Unik (nomor_referensi)</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xl sm:text-2xl font-bold text-blue-400 tracking-wider tabular-nums">
                    {member.reference_number}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                    title="Salin Nomor Referensi"
                  >
                    {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-3 border-t border-slate-700/60 text-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-400">Nama:</span>
                  <span className="font-semibold text-white">{member.full_name}</span>
                </div>
                <div className="flex justify-between font-mono tabular-nums">
                  <span className="text-slate-400">WhatsApp:</span>
                  <span>{member.phone_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Domisili:</span>
                  <span>{member.city || 'Indonesia'}</span>
                </div>
                <div className="flex justify-between font-mono tabular-nums">
                  <span className="text-slate-400">Terdaftar Sejak:</span>
                  <span>
                    {new Date(member.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons under card */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleResendWa}
                disabled={resendingWa}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
              >
                {resendingWa ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mengirim ke WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Ulang ke WhatsApp Saya</span>
                  </>
                )}
              </button>

              <button
                onClick={handleCopy}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
              >
                {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRef ? 'Tersalin' : 'Salin Nomor Ref'}</span>
              </button>
            </div>
          </div>

          {/* Right: Profile Editor */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Perbarui Profil Anggota</h3>
                <p className="text-xs text-slate-500">Kelola informasi kontak dan minat komunitas Anda.</p>
              </div>
            </div>

            {updateSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Profil Anda berhasil diperbarui!</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  disabled
                  value={member.full_name}
                  className="w-full p-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Nama lengkap terverifikasi sesuai undangan awal.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  disabled
                  value={member.phone_number}
                  className="w-full p-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed tabular-nums"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Nomor WhatsApp terikat dengan token registrasi Anda.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kota / Domisili
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Contoh: Bandung"
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bidang Minat / Kontribusi
                </label>
                <textarea
                  rows={3}
                  value={bioInterest}
                  onChange={(e) => setBioInterest(e.target.value)}
                  placeholder="Ceritakan bidang minat Anda di komunitas..."
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{updating ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>

            {/* Section: Rekening Bank Pencairan Dana */}
            <div className="pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Nomor Rekening Pencairan Komisi
                  </h4>
                </div>
                {member.account_number ? (
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Tercantum & Siap
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    Belum Dicantumkan
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 mb-3">
                Cantumkan nomor rekening bank atau e-wallet Anda. Data ini akan otomatis digunakan saat Anda mencairkan saldo komisi referral.
              </p>

              {bankSuccess && (
                <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Nomor rekening pencairan berhasil disimpan ke profil!</span>
                </div>
              )}

              {bankError && (
                <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  {bankError}
                </div>
              )}

              <form onSubmit={handleSaveBankAccount} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Bank atau E-Wallet
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  >
                    <option value="BCA (Bank Central Asia)">BCA (Bank Central Asia)</option>
                    <option value="BRI (Bank Rakyat Indonesia)">BRI (Bank Rakyat Indonesia)</option>
                    <option value="Mandiri">Bank Mandiri</option>
                    <option value="BNI (Bank Negara Indonesia)">BNI (Bank Negara Indonesia)</option>
                    <option value="BSI (Bank Syariah Indonesia)">BSI (Bank Syariah Indonesia)</option>
                    <option value="CIMB Niaga">CIMB Niaga</option>
                    <option value="Bank Jago">Bank Jago</option>
                    <option value="SeaBank">SeaBank</option>
                    <option value="DANA">DANA (E-Wallet)</option>
                    <option value="GoPay">GoPay (E-Wallet)</option>
                    <option value="OVO">OVO (E-Wallet)</option>
                    <option value="ShopeePay">ShopeePay (E-Wallet)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nomor Rekening / No. HP *
                    </label>
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Contoh: 8920194812"
                      className="w-full p-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Pemilik Rekening (a.n.) *
                    </label>
                    <input
                      type="text"
                      required
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="Sesuai buku rekening"
                      className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingBank}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <Building className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{savingBank ? 'Menyimpan...' : 'Simpan Rekening Pencairan'}</span>
                </button>
              </form>
            </div>

            {/* Section: Change Password */}
            <div className="pt-5 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-slate-700" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Keamanan & Ganti Kata Sandi
                </h4>
              </div>

              {passwordSuccess && (
                <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Kata sandi berhasil diperbarui!</span>
                </div>
              )}

              {passwordError && (
                <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kata Sandi Baru
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 5 karakter"
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{changingPassword ? 'Memperbarui...' : 'Perbarui Kata Sandi Akun'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Commission & Referral Invoices */}
      {activeSubTab === 'commission' && (
        <div className="space-y-6">
          {/* Top Referral Share Box */}
          <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-900 text-white p-5 sm:p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-300 block mb-1">
                  Nomor Referensi Anda (nomor_referensi)
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-blue-200 tracking-wider">
                    {member.reference_number}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    title="Salin Nomor Referensi"
                  >
                    {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-blue-100/80 mt-1 max-w-xl">
                  Bagikan nomor referensi ini kepada pelanggan atau cantumkan saat pemesanan percetakan. Anda akan menerima komisi untuk setiap order berstatus lunas.
                </p>
              </div>

              <button
                onClick={loadCommission}
                disabled={loadingCommission}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors self-start sm:self-auto shrink-0"
              >
                <span>{loadingCommission ? 'Memperbarui...' : 'Segarkan Data'}</span>
              </button>
            </div>
          </div>

          {/* Rule Notice */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Ketentuan Komisi Anggota:</span>
              <span>
                Komisi hanya tampil dan dihitung aktif sebagai saldo Anda jika status pembayaran transaksi adalah <strong>Lunas</strong>. Pesanan yang masih pending akan tercatat sebagai komisi tertunda hingga diverifikasi admin.
              </span>
            </div>
          </div>

          {/* Saldo Siap Cair Action Banner */}
          <div className="bg-white border-2 border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/50 via-white to-blue-50/30">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                  Saldo Komisi Tersedia
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">Siap Ditarik / Dicairkan</span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-700 font-mono tracking-tight tabular-nums mt-1.5">
                Rp {(commissionSummary?.availableBalance ?? 0).toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Minimal penarikan: Rp {(settings?.min_disbursement_amount || 25000).toLocaleString('id-ID')} · Ditransfer ke rekening bank / e-wallet pilihan Anda.
              </p>
            </div>

            <button
              onClick={() => handleOpenWithdrawModal()}
              disabled={(commissionSummary?.availableBalance ?? 0) < (settings?.min_disbursement_amount || 25000)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-400 rounded-xl transition-all shadow-md shadow-emerald-600/20 shrink-0 w-full sm:w-auto"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Ajukan Pencairan Dana</span>
            </button>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Saldo Siap Cair
              </span>
              <div className="text-xl font-bold text-emerald-600 font-mono tabular-nums">
                Rp {(commissionSummary?.availableBalance ?? 0).toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                Dapat ditarik ke bank/e-wallet
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Sedang Diajukan (Pending)
              </span>
              <div className="text-xl font-bold text-amber-600 font-mono tabular-nums">
                Rp {(commissionSummary?.pendingDisbursementAmount ?? 0).toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-amber-700 font-medium block mt-1">
                Menunggu verifikasi admin
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Telah Dicairkan (Selesai)
              </span>
              <div className="text-xl font-bold text-blue-600 font-mono tabular-nums">
                Rp {(commissionSummary?.disbursedAmount ?? 0).toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Dana telah masuk ke rekening
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Akumulasi Komisi Lunas
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                Rp {(commissionSummary?.totalEarnedCommission ?? 0).toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Dari {commissionSummary?.paidInvoicesCount ?? 0} order lunas
              </span>
            </div>
          </div>

          {/* Invoices List Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Daftar Transaksi Invoice dengan Nomor Referensi Anda
                </h4>
                <p className="text-xs text-slate-500">
                  Data order yang menggunakan nomor referensi <code className="font-mono text-slate-800">{member.reference_number}</code>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              {(() => {
                const invoicesList = commissionSummary?.invoices || [];
                const paginatedInvoices = invoicesList.slice((invoicesPage - 1) * invoicesPageSize, invoicesPage * invoicesPageSize);

                return (
                  <>
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">No. Invoice</th>
                          <th className="py-3 px-4">Tanggal</th>
                          <th className="py-3 px-4">Pelanggan / Deskripsi</th>
                          <th className="py-3 px-4 text-right">Total Transaksi</th>
                          <th className="py-3 px-4 text-right">Komisi Anda</th>
                          <th className="py-3 px-4 text-center">Status Pembayaran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoicesList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-500">
                              Belum ada transaksi invoice yang tercatat dengan nomor referensi Anda.
                            </td>
                          </tr>
                        ) : (
                          paginatedInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4 font-mono font-medium text-slate-900">
                                {inv.invoice_number}
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                {new Date(inv.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                                {inv.description && (
                                  <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                    {inv.description}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                                Rp {Number(inv.total_amount).toLocaleString('id-ID')}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className={`font-mono font-bold tabular-nums ${inv.status === 'lunas' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  Rp {Number(inv.commission_amount).toLocaleString('id-ID')}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {inv.status === 'lunas' ? 'Aktif' : 'Menunggu Lunas'}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                    inv.status === 'lunas'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : inv.status === 'batal'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {inv.status === 'lunas' && <CheckCircle2 className="w-3 h-3" />}
                                  {inv.status === 'pending' && <Clock className="w-3 h-3" />}
                                  <span className="capitalize">{inv.status}</span>
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Pagination for Invoices */}
                    <Pagination
                      currentPage={invoicesPage}
                      totalItems={invoicesList.length}
                      pageSize={invoicesPageSize}
                      onPageChange={setInvoicesPage}
                      onPageSizeChange={setInvoicesPageSize}
                      itemName="transaksi invoice"
                    />
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Disbursements (Pencairan Komisi) */}
      {activeSubTab === 'disbursements' && (
        <div className="space-y-6">
          {/* Header & Balance Card */}
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-900 text-white p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 block mb-1">
                Saldo Komisi Siap Cair Anda
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-200 font-mono tracking-tight tabular-nums">
                Rp {(commissionSummary?.availableBalance ?? 0).toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-emerald-100/80 mt-1 max-w-lg">
                Komisi berasal dari pesanan percetakan pelanggan yang menggunakan nomor referensi Anda ({member.reference_number}) dan telah berstatus lunas.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleOpenWithdrawModal()}
                disabled={(commissionSummary?.availableBalance ?? 0) < (settings?.min_disbursement_amount || 25000)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:bg-slate-300 rounded-xl transition-all shadow-md shrink-0"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>Ajukan Pencairan Sekarang</span>
              </button>
            </div>
          </div>

          {/* Registered Bank Account Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Rekening Pencairan Terdaftar
                </span>
                {member.account_number ? (
                  <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                    <span className="text-sm font-bold text-slate-900">
                      {member.bank_name || 'Bank BCA'}
                    </span>
                    <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {member.account_number}
                    </span>
                    <span className="text-xs text-slate-600">
                      (a.n. {member.account_holder || member.full_name})
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Nomor rekening pencairan belum dicantumkan.
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setActiveSubTab('card_profile')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap self-stretch sm:self-auto justify-center"
            >
              <span>{member.account_number ? 'Ubah Rekening' : 'Cantumkan Rekening'}</span>
            </button>
          </div>

          {/* KPI Summary for Disbursements */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Sedang Diajukan (Menunggu Approval)
              </span>
              <div className="text-xl font-bold text-amber-600 font-mono tabular-nums">
                Rp {(commissionSummary?.pendingDisbursementAmount ?? 0).toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Sedang diverifikasi oleh admin
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Total Telah Dicairkan
              </span>
              <div className="text-xl font-bold text-emerald-600 font-mono tabular-nums">
                Rp {(commissionSummary?.disbursedAmount ?? 0).toLocaleString('id-ID')}
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Telah ditransfer ke rekening Anda
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Total Permohonan
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                {commissionSummary?.disbursements?.length ?? 0} Kali
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                Riwayat transaksi penarikan dana
              </span>
            </div>
          </div>

          {/* Disbursements History Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Riwayat Pengajuan Pencairan Dana Anda
                </h4>
                <p className="text-xs text-slate-500">
                  Daftar transaksi penarikan saldo komisi dan status persetujuan dari administrator.
                </p>
              </div>

              <button
                onClick={loadCommission}
                disabled={loadingCommission}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Segarkan
              </button>
            </div>

            <div className="overflow-x-auto">
              {(() => {
                const disbursementsList = commissionSummary?.disbursements || [];
                const paginatedDisbursements = disbursementsList.slice((disbursementsPage - 1) * disbursementsPageSize, disbursementsPage * disbursementsPageSize);

                return (
                  <>
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Kode & Tanggal</th>
                          <th className="py-3 px-4">Tujuan Transfer</th>
                          <th className="py-3 px-4 text-right">Nominal</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4">Keterangan Admin / Bukti Transfer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {disbursementsList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-500">
                              <p className="font-medium">Belum ada riwayat pengajuan pencairan komisi.</p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                Klik tombol "Ajukan Pencairan Sekarang" di atas jika Anda memiliki saldo komisi siap cair.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          paginatedDisbursements.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-mono font-bold text-slate-900">{d.disbursement_code}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {new Date(d.created_at).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}{' '}
                                  {new Date(d.created_at).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900 flex items-center gap-1">
                                  <Building className="w-3 h-3 text-slate-400" />
                                  <span>{d.bank_name}</span>
                                </div>
                                <div className="font-mono font-bold text-slate-800 text-[11px] tabular-nums mt-0.5">
                                  {d.account_number}
                                </div>
                                <div className="text-[10px] text-slate-500">a.n. {d.account_holder}</div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="font-mono font-bold text-sm text-slate-900 tabular-nums">
                                  Rp {Number(d.amount).toLocaleString('id-ID')}
                                </div>
                                {d.notes && (
                                  <div className="text-[10px] text-slate-400 truncate max-w-xs text-right mt-0.5">
                                    "{d.notes}"
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                    d.status === 'approved'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : d.status === 'rejected'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {d.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                                  {d.status === 'pending' && <Clock className="w-3 h-3" />}
                                  {d.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                  <span>
                                    {d.status === 'approved'
                                      ? 'Disetujui'
                                      : d.status === 'rejected'
                                      ? 'Ditolak'
                                      : 'Menunggu Approval'}
                                  </span>
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                {d.status === 'approved' && (
                                  <div>
                                    {d.transfer_proof_ref && (
                                      <div className="font-mono text-[11px] font-medium text-emerald-800">
                                        Ref Transfer: {d.transfer_proof_ref}
                                      </div>
                                    )}
                                    {d.admin_notes && (
                                      <div className="text-[11px] text-slate-600 truncate max-w-xs" title={d.admin_notes}>
                                        {d.admin_notes}
                                      </div>
                                    )}
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      Diproses: {d.processed_at ? new Date(d.processed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                    </div>
                                  </div>
                                )}
                                {d.status === 'rejected' && (
                                  <div>
                                    <div className="text-[11px] text-rose-700 font-medium">
                                      Alasan: {d.admin_notes || 'Ditolak oleh admin'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      Saldo dikembalikan ke akun Anda
                                    </div>
                                  </div>
                                )}
                                {d.status === 'pending' && (
                                  <span className="text-[11px] text-slate-400 italic">
                                    Menunggu proses transfer oleh admin...
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Pagination for Disbursements */}
                    <Pagination
                      currentPage={disbursementsPage}
                      totalItems={disbursementsList.length}
                      pageSize={disbursementsPageSize}
                      onPageChange={setDisbursementsPage}
                      onPageSizeChange={setDisbursementsPageSize}
                      itemName="pengajuan pencairan"
                    />
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENGAJUAN PENCAIRAN DANA */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Formulir Pengajuan Pencairan Dana Komisi
                </h3>
                <p className="text-xs text-slate-500">
                  Tarik komisi referral Anda langsung ke rekening bank atau e-wallet.
                </p>
              </div>
            </div>

            {withdrawError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                {withdrawError}
              </div>
            )}

            {withdrawSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{withdrawSuccess}</span>
              </div>
            )}

            {/* Available Balance Preview Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-500 block">
                  Saldo Siap Dicairkan Saat Ini
                </span>
                <span className="text-xl font-bold text-emerald-600 font-mono tabular-nums">
                  Rp {(commissionSummary?.availableBalance ?? 0).toLocaleString('id-ID')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setWithdrawAmount(String(commissionSummary?.availableBalance ?? 0))}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Tarik Semua
              </button>
            </div>

            <form onSubmit={handleSubmitWithdraw} className="space-y-4">
              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Pencairan (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={settings?.min_disbursement_amount || 25000}
                  max={commissionSummary?.availableBalance ?? 0}
                  step="1000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Contoh: 100000"
                  className="w-full p-2.5 text-sm font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 tabular-nums"
                />

                {/* Quick amount chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[50000, 100000, 250000, 500000].map((amt) => {
                    const disabled = (commissionSummary?.availableBalance ?? 0) < amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        disabled={disabled}
                        onClick={() => setWithdrawAmount(String(amt))}
                        className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 transition-colors"
                      >
                        Rp {amt.toLocaleString('id-ID')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bank & Destination Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Bank atau E-Wallet Tujuan *
                </label>
                <select
                  value={withdrawBank}
                  onChange={(e) => setWithdrawBank(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                >
                  <option value="BCA (Bank Central Asia)">BCA (Bank Central Asia)</option>
                  <option value="BRI (Bank Rakyat Indonesia)">BRI (Bank Rakyat Indonesia)</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BNI (Bank Negara Indonesia)">BNI (Bank Negara Indonesia)</option>
                  <option value="BSI (Bank Syariah Indonesia)">BSI (Bank Syariah Indonesia)</option>
                  <option value="CIMB Niaga">CIMB Niaga</option>
                  <option value="Bank Jago">Bank Jago</option>
                  <option value="SeaBank">SeaBank</option>
                  <option value="DANA">DANA (E-Wallet)</option>
                  <option value="GoPay">GoPay (E-Wallet)</option>
                  <option value="OVO">OVO (E-Wallet)</option>
                  <option value="ShopeePay">ShopeePay (E-Wallet)</option>
                </select>
              </div>

              {/* Account Number & Account Holder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Rekening / No. HP *
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawAccountNumber}
                    onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                    placeholder="Contoh: 8830192831"
                    className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Pemilik Rekening *
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawAccountHolder}
                    onChange={(e) => setWithdrawAccountHolder(e.target.value)}
                    placeholder="Sesuai buku tabungan / e-wallet"
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  placeholder="Misal: Penarikan komisi promo referral"
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
              </div>

              {/* Checkbox WhatsApp */}
              <div className="flex items-start gap-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                <input
                  type="checkbox"
                  id="sendWaWithdraw"
                  checked={withdrawSendWa}
                  onChange={(e) => setWithdrawSendWa(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="sendWaWithdraw" className="text-xs text-emerald-900 cursor-pointer">
                  <span className="font-semibold block">Kirim Bukti Pengajuan ke WhatsApp Saya</span>
                  <span>
                    Kirim konfirmasi pengajuan otomatis ke WhatsApp {member.phone_number}.
                  </span>
                </label>
              </div>

              {/* Live Balance after withdrawal */}
              {withdrawAmount && !isNaN(Number(withdrawAmount)) && (
                <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                  <span>Sisa Saldo Komisi Setelah Penarikan:</span>
                  <span className="font-mono font-semibold text-slate-800 tabular-nums">
                    Rp {Math.max(0, (commissionSummary?.availableBalance ?? 0) - Number(withdrawAmount)).toLocaleString('id-ID')}
                  </span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingWithdraw || (commissionSummary?.availableBalance ?? 0) <= 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>{submittingWithdraw ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Pencairan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


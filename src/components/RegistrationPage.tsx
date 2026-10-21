import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Copy,
  Check,
  Send,
  User,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  QrCode,
  Download,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { Member } from '../types/index.ts';

interface RegistrationPageProps {
  token: string;
  onSuccessRegistered?: (member: Member) => void;
  onNavigateToAdmin?: () => void;
}

export const RegistrationPage: React.FC<RegistrationPageProps> = ({
  token,
  onSuccessRegistered,
  onNavigateToAdmin,
}) => {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState<boolean | null>(null);
  const [errorReason, setErrorReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [inviteData, setInviteData] = useState<{
    recipient_name: string;
    recipient_phone: string;
    expires_at?: string | null;
  } | null>(null);
  const [communityData, setCommunityData] = useState<{
    name: string;
    tagline: string;
  }>({
    name: 'Portal Sayuti.com',
    tagline: 'Wadah Kolaborasi, Inspirasi, dan Pertumbuhan Bersama',
  });

  // Form states
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [bioInterest, setBioInterest] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Success state
  const [registeredMember, setRegisteredMember] = useState<Member | null>(null);
  const [waSentStatus, setWaSentStatus] = useState<any>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const checkTokenValidity = async () => {
    setLoading(true);
    setErrorReason('');
    setErrorMessage('');
    try {
      const res = await fetch(`/api/invitations/validate/${encodeURIComponent(token)}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setValid(true);
        setInviteData(data.invitation);
        if (data.community) setCommunityData(data.community);
        setFullName(data.invitation.recipient_name || '');
        setPhoneNumber(data.invitation.recipient_phone || '');
      } else {
        setValid(false);
        setErrorReason(data.reason || 'INVALID');
        setErrorMessage(data.message || 'Tautan undangan tidak sah atau tidak dapat digunakan.');
      }
    } catch (err: any) {
      setValid(false);
      setErrorReason('NETWORK_ERROR');
      setErrorMessage('Terjadi kendala saat memeriksa validitas undangan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      checkTokenValidity();
    } else {
      setLoading(false);
      setValid(false);
      setErrorReason('NO_TOKEN');
      setErrorMessage('Token undangan tidak terdeteksi pada URL.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!fullName.trim() || !phoneNumber.trim()) {
      setSubmitError('Nama lengkap dan nomor WhatsApp wajib diisi.');
      return;
    }

    if (!password || password.length < 5) {
      setSubmitError('Kata sandi minimal 5 karakter untuk keamanan akun Anda.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Konfirmasi kata sandi tidak cocok. Pastikan kedua kolom kata sandi sama.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          full_name: fullName,
          phone_number: phoneNumber,
          password: password,
          email,
          city,
          bio_interest: bioInterest,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRegisteredMember(data.member);
        setWaSentStatus(data.whatsapp);
        if (onSuccessRegistered) {
          onSuccessRegistered(data.member);
        }
      } else {
        setSubmitError(data.error || 'Pendaftaran gagal diproses. Silakan coba kembali.');
      }
    } catch (err: any) {
      setSubmitError('Koneksi terputus saat memproses pendaftaran: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4" />
        <h2 className="text-base font-semibold text-slate-800">Memvalidasi Link Undangan</h2>
        <p className="text-xs text-slate-500 mt-1">
          Sistem sedang memverifikasi token kriptografis 1-kali-pakai...
        </p>
      </div>
    );
  }

  // State: Token Invalid / Used / Revoked / Expired
  if (!valid && !registeredMember) {
    return (
      <div className="max-w-xl mx-auto my-12 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            {errorReason === 'ALREADY_USED' ? (
              <CheckCircle2 className="w-7 h-7 text-amber-600" />
            ) : (
              <ShieldAlert className="w-7 h-7 text-rose-600" />
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {errorReason === 'ALREADY_USED'
              ? 'Tautan Undangan Sudah Digunakan'
              : errorReason === 'EXPIRED'
              ? 'Tautan Undangan Kedaluwarsa'
              : errorReason === 'REVOKED'
              ? 'Undangan Dibatalkan'
              : 'Tautan Undangan Tidak Sah'}
          </h2>

          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {errorMessage}
          </p>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left mb-6 text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-800">Aturan Keamanan Komunitas:</div>
            <div>• Setiap link pendaftaran hanya berlaku tepat untuk 1 anggota terverifikasi (1 Link 1 Registrasi).</div>
            <div>• Setelah formulir dikirim, tautan langsung dinonaktifkan secara permanen untuk mencegah penyalahgunaan.</div>
            <div>• Jika Anda membutuhkan akses baru, silakan hubungi pengurus komunitas terkait.</div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={checkTokenValidity}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Cek Ulang Tautan</span>
            </button>
            {onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
              >
                <span>Masuk Dashboard Admin</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // State: Registration Success & Digital ID Card
  if (registeredMember) {
    return (
      <div className="max-w-2xl mx-auto my-10 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Header */}
          <div className="text-center pb-6 border-b border-slate-100">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3 border border-emerald-100">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Pendaftaran Berhasil Diverifikasi!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Selamat datang di {communityData.name}. Tanda keanggotaan Anda telah diterbitkan.
            </p>
          </div>

          {/* Digital Member Card */}
          <div className="my-6 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-4 border-b border-slate-700/60 pb-4 mb-4">
              <div>
                <span className="text-[10px] tracking-wider uppercase font-semibold text-blue-400 block">
                  Kartu Keanggotaan Resmi
                </span>
                <h3 className="text-base font-bold text-white leading-tight">
                  {communityData.name}
                </h3>
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            <div className="mb-4">
              <div className="text-[11px] text-slate-400">Nomor Referensi Unik:</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xl sm:text-2xl font-bold text-blue-400 tracking-wider tabular-nums">
                  {registeredMember.reference_number}
                </span>
                <button
                  onClick={() => copyToClipboard(registeredMember.reference_number)}
                  className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                  title="Salin Nomor Referensi"
                >
                  {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-700/50">
              <div>
                <span className="text-[10px] text-slate-400 block">Nama Anggota</span>
                <span className="font-medium text-white truncate block">{registeredMember.full_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">WhatsApp</span>
                <span className="font-mono text-slate-200 tabular-nums block">{registeredMember.phone_number}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Kota / Domisili</span>
                <span className="text-slate-200 truncate block">{registeredMember.city || 'Indonesia'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Tanggal Registrasi</span>
                <span className="font-mono text-slate-200 tabular-nums block">
                  {new Date(registeredMember.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Notification status */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 mb-6 flex items-start gap-3">
            <Send className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-slate-900 block">
                Notifikasi WhatsApp Otomatis:
              </span>
              Pesan konfirmasi pendaftaran beserta Nomor Referensi Unik telah diteruskan melalui WhatsApp Gateway ke{' '}
              <span className="font-mono font-medium text-slate-900 tabular-nums">{registeredMember.phone_number}</span>.
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={() => copyToClipboard(registeredMember.reference_number)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {copiedRef ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedRef ? 'Tersalin ke Clipboard' : 'Salin Nomor Referensi'}</span>
            </button>

            {onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm"
              >
                <span>Buka Dashboard Admin</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // State: Fill Registration Form
  return (
    <div className="max-w-xl mx-auto my-10 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Banner */}
        <div className="border-b border-slate-100 pb-5 mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Undangan Khusus Satu Kali Pakai</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Formulir Pendaftaran Anggota
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {communityData.name} — {communityData.tagline}
          </p>

          {inviteData && (
            <div className="mt-3 py-2 px-3 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-blue-900 flex items-center justify-between">
              <span>Undangan ditujukan kepada: <strong>{inviteData.recipient_name}</strong></span>
              <span className="font-mono text-[11px] text-blue-700 tabular-nums">{inviteData.recipient_phone}</span>
            </div>
          )}
        </div>

        {submitError && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="08123456789 atau 628123456789"
                className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 tabular-nums"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Nomor referensi unik dan verifikasi keanggotaan akan dikirimkan otomatis ke WhatsApp ini.
            </p>
          </div>

          {/* Password & Confirm Password for Member Login Security */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Kata Sandi Akun <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'Tutup' : 'Lihat'}</span>
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 5 karakter"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Digunakan bersama no referensi untuk login ke Area Anggota.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ulangi Kata Sandi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Pastikan sama dengan kata sandi di sebelah kiri.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="budi@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kota / Domisili
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Contoh: Jakarta / Surabaya"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bidang Minat / Alasan Bergabung
            </label>
            <textarea
              rows={3}
              value={bioInterest}
              onChange={(e) => setBioInterest(e.target.value)}
              placeholder="Ceritakan minat atau kontribusi yang ingin Anda bawa ke komunitas ini..."
              className="w-full p-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-all shadow-sm"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mendaftarkan & Menerbitkan Nomor Referensi...</span>
                </>
              ) : (
                <>
                  <span>Selesaikan Pendaftaran & Dapatkan Nomor Referensi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-[11px] text-slate-500 border-t border-slate-100 pt-4">
          Tautan ini bersifat rahasia dan akan otomatis hangus setelah proses pendaftaran selesai.
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  Phone,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  QrCode,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { AuthSession, Member } from '../types/index.ts';

interface LoginPageProps {
  onLoginSuccess: (session: AuthSession) => void;
  onNavigateToRegister?: () => void;
  availableMembers?: Member[];
  communityName?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
  availableMembers = [],
  communityName = 'Portal Sayuti.com',
}) => {
  const [roleTab, setRoleTab] = useState<'admin' | 'member'>('admin');

  // Admin form (starts empty to avoid unwanted auto-login)
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Member form (starts empty)
  const [memberAuthMode, setMemberAuthMode] = useState<'password' | 'token'>('password');
  const [memberIdentifier, setMemberIdentifier] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberToken, setMemberToken] = useState('');
  const [showMemberPassword, setShowMemberPassword] = useState(false);

  const [justLoggedOut, setJustLoggedOut] = useState(() => {
    try {
      return localStorage.getItem('community_just_logged_out') === 'true';
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess({
          role: 'admin',
          name: data.name,
          adminUsername: data.adminUsername,
          token: data.token,
        });
      } else {
        setError(data.error || 'Username atau password salah.');
      }
    } catch (err: any) {
      setError('Gagal menghubungi server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!memberIdentifier.trim() || !memberPassword.trim()) {
      setError('Nomor Referensi/WhatsApp dan Kata Sandi wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/member-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: memberIdentifier.trim(),
          password: memberPassword.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess({
          role: 'member',
          name: data.name,
          member: data.member,
          token: data.token,
        });
      } else {
        setError(data.error || 'Autentikasi gagal. Periksa nomor referensi dan kata sandi Anda.');
      }
    } catch (err: any) {
      setError('Gagal menghubungi server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!memberToken.trim()) {
      setError('Kode token undangan atau token registrasi wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/member-login-by-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: memberToken.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess({
          role: 'member',
          name: data.name,
          member: data.member,
          token: data.token,
        });
      } else {
        setError(data.error || 'Token tidak valid. Pastikan token undangan atau token keanggotaan Anda benar.');
      }
    } catch (err: any) {
      setError('Gagal menghubungi server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const brandName = communityName?.trim() || 'Portal Komunitas';
  const initials = brandName
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, '')[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'PK';

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="text-center pb-6 border-b border-slate-100 mb-6">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm font-bold text-base tracking-wider">
            {initials}
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Masuk ke {brandName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pilih jenis akun untuk mengakses dashboard admin atau portal data anggota.
          </p>
        </div>

        {justLoggedOut && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Anda telah keluar dari sesi. Silakan masuk kembali menggunakan username dan password admin atau nomor referensi & password anggota.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setJustLoggedOut(false);
                try {
                  localStorage.removeItem('community_just_logged_out');
                } catch (e) {}
              }}
              className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
              title="Tutup pemberitahuan"
            >
              ✕
            </button>
          </div>
        )}

        {/* Role Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setRoleTab('admin');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              roleTab === 'admin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Login Admin</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleTab('member');
              setError(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              roleTab === 'member'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Login Anggota</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Admin Login Form */}
        {roleTab === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username Admin
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="username"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="password"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
              </div>
            </div>
 
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-all shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memverifikasi Admin...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Member Login Section */}
        {roleTab === 'member' && (
          <div className="space-y-4">
            {/* Sub-tab selection for Member Login: Password vs Token */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMemberAuthMode('password');
                  setError(null);
                }}
                className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  memberAuthMode === 'password'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                <span>Dengan Password</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMemberAuthMode('token');
                  setError(null);
                }}
                className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  memberAuthMode === 'token'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tanpa Password (Token)</span>
              </button>
            </div>

            {/* Mode 1: Login dengan Password (Verified strictly from database) */}
            {memberAuthMode === 'password' && (
              <form onSubmit={handleMemberSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Referensi Unik atau Nomor WhatsApp
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={memberIdentifier}
                      onChange={(e) => setMemberIdentifier(e.target.value)}
                      placeholder="REF-KOM-2026-94812 atau 085712345678"
                      className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900 tabular-nums"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Gunakan nomor referensi yang tercetak di kartu anggota atau nomor WhatsApp terdaftar.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Kata Sandi (Dimuat & Diverifikasi dari Database)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMemberPassword(!showMemberPassword)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      {showMemberPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showMemberPassword ? 'Tutup' : 'Lihat'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showMemberPassword ? 'text' : 'password'}
                      required
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      placeholder="Masukkan kata sandi keanggotaan Anda..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="text-slate-400">
                      Password dicek ketat ke database
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMemberAuthMode('token');
                        setError(null);
                      }}
                      className="text-emerald-700 hover:underline font-medium"
                    >
                      Lupa sandi? Gunakan Token
                    </button>
                  </div>
                </div>

                {/* Helper for demo member login with verified password */}
     
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-sm"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memverifikasi Database...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk dengan Kata Sandi</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Mode 2: Login Tanpa Password (Gunakan Token) */}
            {memberAuthMode === 'token' && (
              <form onSubmit={handleMemberTokenSubmit} className="space-y-4">
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Akses Cepat Berbasis Token (Tanpa Password)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-700">
                    Anda dapat masuk langsung ke portal anggota hanya dengan memasukkan kode token link undangan atau nomor referensi terdaftar Anda.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Token Undangan atau Token Registrasi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={memberToken}
                      onChange={(e) => setMemberToken(e.target.value)}
                      placeholder="Contoh: demo-undangan-terpakai-02 atau inv_..."
                      className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-900 selection:bg-emerald-100"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Kode token yang tercantum pada link pendaftaran WhatsApp yang dikirim pengurus.
                  </p>
                </div>

                {/* Helper for demo token */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
                  <span>Token Demo Anggota:</span>
                  <button
                    type="button"
                    onClick={() => setMemberToken('demo-undangan-terpakai-02')}
                    className="text-emerald-700 hover:underline font-mono text-[11px]"
                  >
                    demo-undangan-terpakai-02 (Isi Otomatis)
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl transition-all shadow-sm"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memverifikasi Token...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Masuk Langsung dengan Token</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
          Belum terdaftar sebagai anggota?{' '}
          <span className="text-slate-700 font-medium">
            Pendaftaran hanya dapat dilakukan melalui link undangan resmi pengurus.
          </span>
        </div>
      </div>
    </div>
  );
};

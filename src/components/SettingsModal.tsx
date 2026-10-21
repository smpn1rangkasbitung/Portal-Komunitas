import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  CheckCircle2,
  Save,
  MessageSquare,
  Key,
  Globe,
  Info,
  Coins,
  QrCode,
  CreditCard,
  Zap,
  Check,
  ShieldCheck,
} from 'lucide-react';
import type { AppSettings } from '../types/index.ts';

interface SettingsModalProps {
  settings: AppSettings | null;
  onRefresh: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onRefresh,
}) => {
  const [waGatewayUrl, setWaGatewayUrl] = useState('');
  const [waApiKey, setWaApiKey] = useState('');
  const [waDeviceId, setWaDeviceId] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [communityTagline, setCommunityTagline] = useState('');
  const [defaultInviteMessage, setDefaultInviteMessage] = useState('');
  const [defaultSuccessMessage, setDefaultSuccessMessage] = useState('');

  // Commission Settings
  const [commissionRatePercent, setCommissionRatePercent] = useState('10');
  const [commissionCalculationMode, setCommissionCalculationMode] = useState<'percentage' | 'fixed'>('percentage');
  const [commissionFixedAmount, setCommissionFixedAmount] = useState('50000');
  const [commissionDescription, setCommissionDescription] = useState('Komisi referral diberikan untuk setiap transaksi yang berhasil dan telah berstatus lunas.');
  const [minDisbursementAmount, setMinDisbursementAmount] = useState('25000');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setWaGatewayUrl(settings.wa_gateway_url || 'https://tiket.sayuti.com/api/gateway/send');
      setWaApiKey(settings.wa_api_key || '');
      setWaDeviceId(settings.wa_device_id || '');
      setCommunityName(settings.community_name || 'Portal Sayuti.com');
      setCommunityTagline(settings.community_tagline || 'Wadah Kolaborasi, Inspirasi, dan Pertumbuhan Bersama');
      setDefaultInviteMessage(
        settings.default_invite_message ||
          'Halo {name}! Anda diundang secara khusus untuk bergabung ke komunitas {community}. Silakan lengkapi pendaftaran 1-kali-pakai via tautan resmi berikut: {link}'
      );
      setDefaultSuccessMessage(
        settings.default_success_message ||
          'Selamat bergabung di {community}, {name}! Pendaftaran Anda telah berhasil. Nomor Referensi Keanggotaan Resmi Anda: {reference_number}. Simpan nomor ini untuk akses anggota.'
      );
      if (settings.commission_rate_percent !== undefined) {
        setCommissionRatePercent(String(settings.commission_rate_percent));
      }
      if (settings.commission_calculation_mode) {
        setCommissionCalculationMode(settings.commission_calculation_mode);
      }
      if (settings.commission_fixed_amount !== undefined) {
        setCommissionFixedAmount(String(settings.commission_fixed_amount));
      }
      if (settings.commission_description) {
        setCommissionDescription(settings.commission_description);
      }
      if (settings.min_disbursement_amount !== undefined) {
        setMinDisbursementAmount(String(settings.min_disbursement_amount));
      }
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wa_gateway_url: waGatewayUrl,
          wa_api_key: waApiKey,
          wa_device_id: waDeviceId,
          community_name: communityName,
          community_tagline: communityTagline,
          default_invite_message: defaultInviteMessage,
          default_success_message: defaultSuccessMessage,
          commission_rate_percent: parseFloat(commissionRatePercent) || 10,
          commission_calculation_mode: commissionCalculationMode,
          commission_fixed_amount: parseFloat(commissionFixedAmount) || 50000,
          commission_description: commissionDescription,
          min_disbursement_amount: parseFloat(minDisbursementAmount) || 25000,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(true);
        onRefresh();
        Swal.fire({
          title: 'Pengaturan Disimpan!',
          text: 'Konfigurasi portal, WhatsApp gateway, dan komisi berhasil diperbarui.',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false,
          customClass: { popup: 'rounded-2xl shadow-xl' },
        });
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const errMsg = data.error || 'Gagal menyimpan pengaturan.';
        setSaveError(errMsg);
        Swal.fire({
          title: 'Gagal Menyimpan',
          text: errMsg,
          icon: 'error',
          customClass: { popup: 'rounded-2xl shadow-xl' },
        });
      }
    } catch (err: any) {
      const errMsg = 'Koneksi terputus: ' + err.message;
      setSaveError(errMsg);
      Swal.fire({
        title: 'Kesalahan Jaringan',
        text: errMsg,
        icon: 'error',
        customClass: { popup: 'rounded-2xl shadow-xl' },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Pengaturan WhatsApp Gateway & Komunitas</h2>
          <p className="text-xs text-slate-500">
            Konfigurasi koneksi WhatsApp Gateway, identitas komunitas, sistem komisi, dan template pesan notifikasi otomatis.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Pengaturan berhasil disimpan ke sistem!</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
          {saveError}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Community Identity & Member Card Name (Full Width Container) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 w-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <Globe className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Nama Komunitas di Aplikasi & Kartu Anggota
                </h3>
                <p className="text-[11px] text-slate-500">
                  Nama ini langsung berlaku di Navbar, Kartu Tanda Anggota Digital, Halaman Login & Registrasi.
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200 hidden sm:inline-block">
              Pengaturan Identitas
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Komunitas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  placeholder="Contoh: Portal Sayuti.com"
                  className="w-full p-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Nama resmi komunitas Anda yang akan tercetak di Kartu Anggota dan Header Aplikasi.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Tagline / Slogan Komunitas
                </label>
                <input
                  type="text"
                  value={communityTagline}
                  onChange={(e) => setCommunityTagline(e.target.value)}
                  placeholder="Wadah Kolaborasi, Inspirasi, dan Pertumbuhan Bersama"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Ditampilkan pada subtitle portal dan pesan sambutan pendaftaran.
                </span>
              </div>
            </div>

            {/* Live Preview of Digital Member Card */}
            <div className="lg:col-span-5">
              <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>Pratinjau Langsung Kartu Anggota Digital:</span>
              </span>
              <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden">
                <div className="flex items-start justify-between border-b border-slate-700/70 pb-2 mb-3">
                  <div>
                    <span className="text-[9px] text-blue-400 uppercase font-semibold tracking-wider block">
                      Kartu Keanggotaan Resmi
                    </span>
                    <div className="text-sm font-bold text-white transition-all truncate max-w-[200px] sm:max-w-none">
                      {communityName.trim() || 'Nama Komunitas Anda'}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <QrCode className="w-4 h-4 text-blue-400" />
                  </div>
                </div>

                <div className="mb-2">
                  <span className="text-[9px] text-slate-400 block">Nomor Referensi Unik (Contoh)</span>
                  <span className="font-mono text-base font-bold text-blue-400 tracking-wider">
                    REF-94812
                  </span>
                </div>

                <div className="text-[10px] text-slate-300 pt-2 border-t border-slate-700/60 flex justify-between">
                  <span>Nama: Budi Santoso</span>
                  <span className="text-emerald-400 font-semibold">✓ Anggota Aktif</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 italic">
                *Begitu Anda menekan "Simpan Semua Pengaturan", nama baru akan langsung diterapkan ke seluruh sistem.
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout on Desktop to utilize all screen width */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full">
          {/* LEFT COLUMN: WhatsApp Gateway & Messages */}
          <div className="space-y-6">
            {/* Section 2: WhatsApp Gateway Settings */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Key className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Kredensial WhatsApp Gateway (Sayuti Gateway API)</h3>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Sistem terhubung ke API WhatsApp Gateway resmi (<code>tiket.sayuti.com/api/gateway/send</code>) menggunakan otentikasi <strong>Bearer JWT Token</strong> dan parameter <code>to</code>, <code>message</code>, <code>delay</code>, <code>simulateTyping</code>.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gateway Endpoint URL
                </label>
                <input
                  type="text"
                  required
                  value={waGatewayUrl}
                  onChange={(e) => setWaGatewayUrl(e.target.value)}
                  placeholder="https://tiket.sayuti.com/api/gateway/send"
                  className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Authorization Token (Bearer JWT Token)
                </label>
                <textarea
                  rows={4}
                  value={waApiKey}
                  onChange={(e) => setWaApiKey(e.target.value)}
                  placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI..."
                  className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 resize-none break-all"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Token JWT otentikasi Bearer untuk pengiriman pesan WhatsApp ke server gateway.
                </span>
              </div>
            </div>

            {/* Section 3: Notification Templates */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Template Pesan WhatsApp Otomatis</h3>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Pesan Undangan Link Pendaftaran
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Variabel: {'{name}'}, {'{community}'}, {'{link}'}
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={defaultInviteMessage}
                  onChange={(e) => setDefaultInviteMessage(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 resize-none font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Pesan Konfirmasi Pendaftaran Sukses & Nomor Referensi
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Variabel: {'{name}'}, {'{community}'}, {'{reference_number}'}
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={defaultSuccessMessage}
                  onChange={(e) => setDefaultSuccessMessage(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 resize-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Commission Settings & System Reference */}
          <div className="space-y-6">
            {/* Section 4: Commission & Invoice Settings */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Pengaturan Komisi Referral & Tabel invoice
                  </h3>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                  invoice.nomor_referensi
                </span>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Tabel Database MySQL:</span>
                  <span>
                    Sistem membaca transaksi langsung dari tabel <code className="font-mono font-bold">invoice</code> melalui kolom <code className="font-mono font-bold">nomor_referensi</code>. Komisi hanya berstatus aktif dan dapat dicairkan jika invoice berstatus <strong>Lunas</strong>.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Persentase Komisi (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={commissionRatePercent}
                      onChange={(e) => setCommissionRatePercent(e.target.value)}
                      className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Dihitung dari total transaksi order lunas.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mode Perhitungan Komisi
                  </label>
                  <select
                    value={commissionCalculationMode}
                    onChange={(e) => setCommissionCalculationMode(e.target.value as 'percentage' | 'fixed')}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  >
                    <option value="percentage">Persentase Transaksi (%)</option>
                    <option value="fixed">Nominal Tetap (Flat Rp)</option>
                  </select>
                </div>
              </div>

              {commissionCalculationMode === 'fixed' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominal Komisi Tetap (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={commissionFixedAmount}
                    onChange={(e) => setCommissionFixedAmount(e.target.value)}
                    className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimal Nominal Pencairan Komisi (Rp)
                </label>
                <input
                  type="number"
                  min="10000"
                  step="5000"
                  value={minDisbursementAmount}
                  onChange={(e) => setMinDisbursementAmount(e.target.value)}
                  className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Batas minimum saldo yang dapat diajukan anggota untuk ditarik ke rekening bank.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ketentuan & Catatan Komisi
                </label>
                <textarea
                  rows={2}
                  value={commissionDescription}
                  onChange={(e) => setCommissionDescription(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 resize-none"
                />
              </div>
            </div>

            {/* Section 5: Integration Reference Card */}
            <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Zap className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Panduan Integrasi Variabel Otomatis
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pesan WhatsApp Gateway secara otomatis menyisipkan variabel dinamis saat pendaftaran berhasil dan pengiriman tautan undangan:
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                  <span className="text-emerald-400 font-bold block">{'{name}'}</span>
                  <span className="text-[10px] text-slate-400">Nama Penerima</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                  <span className="text-emerald-400 font-bold block">{'{link}'}</span>
                  <span className="text-[10px] text-slate-400">Tautan 1x Pakai</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                  <span className="text-blue-400 font-bold block">{'{reference_number}'}</span>
                  <span className="text-[10px] text-slate-400">Nomor Unik Anggota</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded border border-slate-700">
                  <span className="text-blue-400 font-bold block">{'{community}'}</span>
                  <span className="text-[10px] text-slate-400">Nama Komunitas</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Format nomor otomatis dinormalisasi ke awalan 62 (Indonesia).</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Action Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Pastikan seluruh konfigurasi URL gateway dan persentase komisi sudah sesuai sebelum menyimpan.
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan Pengaturan...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

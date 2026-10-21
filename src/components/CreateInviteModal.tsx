import React, { useState } from 'react';
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  Send,
  ExternalLink,
  User,
  Phone,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface CreateInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenPublicPreview?: (token: string) => void;
}

export const CreateInviteModal: React.FC<CreateInviteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [expiresDays, setExpiresDays] = useState('7');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [createdInvite, setCreatedInvite] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!recipientName.trim() || !recipientPhone.trim()) {
      setError('Nama calon anggota dan nomor WhatsApp wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),
          expires_in_days: parseInt(expiresDays, 10),
          send_whatsapp: sendWhatsApp,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedInvite(data);
        onSuccess();
      } else {
        setError(data.error || 'Gagal membuat undangan.');
      }
    } catch (err: any) {
      setError('Terjadi kendala saat menghubungi server: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!createdInvite?.invite_link) return;
    navigator.clipboard.writeText(createdInvite.invite_link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const resetForm = () => {
    setRecipientName('');
    setRecipientPhone('');
    setExpiresDays('7');
    setSendWhatsApp(true);
    setError(null);
    setCreatedInvite(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in duration-200">
        <button
          onClick={resetForm}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {!createdInvite ? (
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sistem Undangan 1 Link 1 Registrasi</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Buat Undangan Anggota Baru
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Setiap undangan memiliki token rahasia unik yang otomatis hangus setelah digunakan mendaftar.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Calon Anggota <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Contoh: Hendra Kusuma"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp Calon Anggota <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="08123456789 atau 62812..."
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Masa Berlaku Undangan
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <select
                    value={expiresDays}
                    onChange={(e) => setExpiresDays(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  >
                    <option value="3">3 Hari</option>
                    <option value="7">7 Hari (Direkomendasikan)</option>
                    <option value="14">14 Hari</option>
                    <option value="30">30 Hari</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-blue-900 font-medium">
                  <input
                    type="checkbox"
                    checked={sendWhatsApp}
                    onChange={(e) => setSendWhatsApp(e.target.checked)}
                    className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Kirim otomatis link undangan via WhatsApp Gateway sekarang</span>
                </label>
                <p className="text-[11px] text-blue-700 mt-1 pl-5">
                  Pesan berisi link khusus pendaftaran akan langsung diteruskan ke nomor calon anggota via wa.printpro.my.id.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Membuat Link...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Generate Tautan Undangan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Result state after invite generation */
          <div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 border border-emerald-100">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Tautan Undangan Berhasil Dibuat!
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Bagikan link unik satu-kali-pakai berikut kepada <strong>{createdInvite.invitation?.recipient_name}</strong>.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Link Pendaftaran Eksklusif (1-Kali-Pakai)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdInvite.invite_link}
                  className="w-full text-xs font-mono bg-white border border-slate-200 rounded p-1.5 text-slate-800"
                />
                <button
                  onClick={handleCopy}
                  className="p-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors shrink-0"
                  title="Salin Tautan"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {createdInvite.whatsapp && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 mb-4 flex items-start gap-2">
                <Send className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Pengiriman WhatsApp Gateway:</span>
                  <span>
                    {createdInvite.whatsapp.success
                      ? 'Pesan undangan berhasil dikirimkan ke nomor WhatsApp calon anggota.'
                      : 'Pesan telah dicatat (periksa status API Key di log gateway).'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2">
              <button
                onClick={resetForm}
                className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

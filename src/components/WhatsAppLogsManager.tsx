import React, { useState } from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Code,
  X,
  Phone,
  MessageSquare,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { NotificationLog, AppSettings } from '../types/index.ts';
import { Pagination } from './Pagination.tsx';

interface WhatsAppLogsManagerProps {
  logs: NotificationLog[];
  settings: AppSettings | null;
  onRefresh: () => void;
}

export const WhatsAppLogsManager: React.FC<WhatsAppLogsManagerProps> = ({
  logs,
  settings,
  onRefresh,
}) => {
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Halo! Ini adalah pesan uji coba dari sistem pendaftaran komunitas terintegrasi WhatsApp Gateway.');
  const [simulate, setSimulate] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedPayload, setSelectedPayload] = useState<{
    phone: string;
    payload: string | null;
    error: string | null;
  } | null>(null);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) return;

    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_phone: testPhone,
          message: testMessage,
          simulate,
        }),
      });
      const data = await res.json();
      setTestResult(data);
      onRefresh();
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  const filtered = logs.filter((log) => {
    const matchesSearch =
      log.recipient_phone.includes(searchTerm) ||
      log.message_body.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.error_message && log.error_message.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedLogs = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Log Notifikasi WhatsApp Gateway</h2>
          <p className="text-xs text-slate-500">
            Riwayat lengkap pengiriman pesan otomatis melalui endpoint gateway (<code>tiket.sayuti.com/api/gateway/send</code>).
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang Log</span>
        </button>
      </div>

      {/* Gateway Configuration & Quick Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Dispatch Tester */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Uji Pengiriman Langsung (Live Test Dispatch)</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Kirim pesan uji coba ke nomor WhatsApp Anda untuk memverifikasi kesiapan token dan gateway.
          </p>

          <form onSubmit={handleSendTest} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp Tujuan
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="08123456789 atau 62812..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mode Pengiriman
                </label>
                <div className="flex items-center gap-3 pt-1.5">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulate}
                      onChange={(e) => setSimulate(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>Mode Simulasi (Tanpa Kuota)</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pesan Notifikasi
              </label>
              <textarea
                rows={2}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Pesan akan langsung tercatat di tabel log notifikasi di bawah.
              </span>
              <button
                type="submit"
                disabled={sendingTest}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
              >
                {sendingTest ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mengirim ke Gateway...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Pesan Uji Coba</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Test feedback */}
          {testResult && (
            <div
              className={`mt-4 p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-semibold block">
                  {testResult.success ? 'Berhasil Dikirim ke Gateway' : 'Gagal Mengirim'}
                </span>
                <span className="text-[11px] block mt-0.5">
                  {testResult.error || JSON.stringify(testResult.responsePayload || 'Sukses')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Gateway Connection Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Endpoint Gateway WhatsApp</h3>
          </div>
          <div className="text-xs text-slate-600 space-y-2">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target URL</span>
              <span className="font-mono text-slate-800 break-all bg-slate-50 p-1.5 rounded block text-[11px]">
                {settings?.wa_gateway_url || 'https://tiket.sayuti.com/api/gateway/send'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Otentikasi Token</span>
              <span className="font-mono text-slate-700 text-[11px]">
                {settings?.wa_api_key ? 'Bearer eyJhb... (Aktif)' : 'Bearer Token Tiket Sayuti (Default Aktif)'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Payload Format</span>
              <span className="font-mono text-slate-700 text-[11px]">
                to, message, delay, simulateTyping
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
            Anda dapat memperbarui Token dan URL Gateway di tab Pengaturan API.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nomor WhatsApp atau isi pesan..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({logs.length})
          </button>
          <button
            onClick={() => setStatusFilter('success')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'success' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sukses ({logs.filter((l) => l.status === 'success').length})
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === 'failed' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gagal ({logs.filter((l) => l.status === 'failed').length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Nomor WhatsApp</th>
                <th className="py-3 px-4">Isi Pesan</th>
                <th className="py-3 px-4">Status & HTTP</th>
                <th className="py-3 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Tidak ada riwayat log notifikasi WhatsApp yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Time */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-[11px] text-slate-800 tabular-nums">
                        {new Date(log.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 tabular-nums">
                        {new Date(log.created_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 text-[11px]">
                        {log.type === 'invite_link'
                          ? 'Kirim Undangan'
                          : log.type === 'registration_success'
                          ? 'Konfirmasi Registrasi'
                          : log.type === 'manual_test'
                          ? 'Uji Coba Manual'
                          : log.type === 'disbursement_request'
                          ? 'Pengajuan Pencairan'
                          : log.type === 'disbursement_approved'
                          ? 'Pencairan Disetujui'
                          : log.type === 'disbursement_rejected'
                          ? 'Pencairan Ditolak'
                          : 'Notifikasi Admin'}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-slate-900 font-medium tabular-nums">
                        {log.recipient_phone}
                      </span>
                    </td>

                    {/* Message */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-[11px] text-slate-700 line-clamp-2">
                        {log.message_body}
                      </div>
                      {log.error_message && (
                        <div className="text-[10px] text-rose-600 mt-0.5 line-clamp-1">
                          Error: {log.error_message}
                        </div>
                      )}
                    </td>

                    {/* Status & HTTP */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold ${
                            log.status === 'success' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {log.status === 'success' ? 'Sukses' : 'Gagal'}
                        </span>
                        {log.http_status && (
                          <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                            ({log.http_status})
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Payload Viewer */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() =>
                          setSelectedPayload({
                            phone: log.recipient_phone,
                            payload: log.response_payload || null,
                            error: log.error_message || null,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>Lihat Raw</span>
                      </button>
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
          itemName="log pesan"
        />
      </div>

      {/* Raw Payload Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in duration-200">
            <button
              onClick={() => setSelectedPayload(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Raw Payload WhatsApp Gateway
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-mono tabular-nums">
              Tujuan: {selectedPayload.phone}
            </p>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Response JSON Payload</span>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-60">
                  {selectedPayload.payload || '(Tidak ada response payload)'}
                </pre>
              </div>

              {selectedPayload.error && (
                <div>
                  <span className="text-[10px] text-rose-600 uppercase font-semibold block mb-1">Pesan Error Gateway</span>
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-mono">
                    {selectedPayload.error}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

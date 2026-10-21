import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  FileText,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Trash2,
  DollarSign,
  TrendingUp,
  Receipt,
  User,
  ExternalLink,
  ShieldAlert,
  Database,
  Calendar,
} from 'lucide-react';
import type { Invoice, Member } from '../types/index.ts';
import { Pagination } from './Pagination.tsx';

interface InvoicesManagerProps {
  invoices: Invoice[];
  members: Member[];
  onRefresh: () => void;
}

export const InvoicesManager: React.FC<InvoicesManagerProps> = ({
  invoices,
  members,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lunas' | 'pending' | 'batal'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // New Invoice Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRef, setSelectedRef] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [status, setStatus] = useState<'lunas' | 'pending'>('lunas');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const refNum = selectedRef.trim();
    if (!refNum) {
      setSubmitError('Pilih atau masukkan nomor referensi anggota (nomor_referensi).');
      return;
    }
    if (!customerName.trim()) {
      setSubmitError('Nama pelanggan wajib diisi.');
      return;
    }
    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Total nominal transaksi harus lebih dari 0.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomor_referensi: refNum,
          reference_number: refNum,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || undefined,
          description: description.trim() || undefined,
          total_amount: amount,
          status,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsModalOpen(false);
        setSelectedRef('');
        setCustomerName('');
        setCustomerPhone('');
        setDescription('');
        setTotalAmount('');
        setStatus('lunas');
        onRefresh();
      } else {
        setSubmitError(data.error || 'Gagal menyimpan transaksi invoice.');
      }
    } catch (err: any) {
      setSubmitError('Kesalahan koneksi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: 'lunas' | 'pending' | 'batal') => {
    try {
      const res = await fetch(`/api/invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'Hapus Invoice?',
      text: 'Yakin ingin menghapus data invoice ini? Data yang dihapus tidak dapat dipulihkan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Data',
      cancelButtonText: 'Batal',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl shadow-xl',
        confirmButton: 'rounded-xl text-xs sm:text-sm font-medium px-4 py-2.5',
        cancelButton: 'rounded-xl text-xs sm:text-sm font-medium px-4 py-2.5',
      },
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await Swal.fire({
          title: 'Berhasil Dihapus!',
          text: 'Data invoice telah berhasil dihapus dari sistem.',
          icon: 'success',
          timer: 1600,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-2xl',
          },
        });
        onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        Swal.fire({
          title: 'Gagal Menghapus',
          text: err.error || 'Terjadi kesalahan saat menghapus invoice.',
          icon: 'error',
          customClass: {
            popup: 'rounded-2xl',
          },
        });
      }
    } catch (e: any) {
      console.error(e);
      Swal.fire({
        title: 'Kesalahan Sistem',
        text: e.message || 'Terjadi kesalahan koneksi.',
        icon: 'error',
        customClass: {
          popup: 'rounded-2xl',
        },
      });
    }
  };

  // ATURAN: Invoice yang ditampilkan HANYA yang memiliki nomor_referensi (jika kosong jangan ditampilkan)
  const validInvoices = invoices.filter((inv) => {
    const ref = (inv.nomor_referensi || inv.reference_number || '').trim();
    return ref !== '' && ref !== '0';
  });

  const filteredInvoices = validInvoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const refMatch =
      (inv.nomor_referensi || inv.reference_number || '').toLowerCase().includes(term);
    const numMatch = (inv.invoice_number || '').toLowerCase().includes(term);
    const custMatch = (inv.customer_name || '').toLowerCase().includes(term);
    const memMatch = (inv.member_name || '').toLowerCase().includes(term);

    const matchSearch = !searchTerm || refMatch || numMatch || custMatch || memMatch;
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Calculate totals from invoices with nomor_referensi
  const totalAllInvoices = validInvoices.length;
  const paidInvoices = validInvoices.filter((i) => i.status === 'lunas');
  const pendingInvoices = validInvoices.filter((i) => i.status === 'pending');

  const totalSalesPaid = paidInvoices.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
  const totalCommissionPaid = paidInvoices.reduce((acc, curr) => acc + (Number(curr.commission_amount) || 0), 0);
  const totalCommissionPending = pendingInvoices.reduce((acc, curr) => acc + (Number(curr.commission_amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Transaksi Invoice & Komisi Anggota
            </h2>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Tabel: invoice
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Filter: nomor_referensi aktif
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Hanya menampilkan invoice yang memiliki <code className="font-mono text-slate-800">nomor_referensi</code>. Invoice tanpa nomor referensi disembunyikan.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Catat Transaksi Invoice</span>
        </button>
      </div>

      {/* Notice Banner: Existing Table & Commission Rule */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Database className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900">
              Integrasi Tabel Database Pos / Percetakan:
            </span>{' '}
            <span className="text-slate-600">
              Data transaksi dibaca langsung dari tabel <strong className="text-slate-900">invoice</strong> melalui kolom <strong className="text-slate-900">nomor_referensi</strong>. Hanya invoice dengan <code className="font-mono text-slate-800">nomor_referensi</code> yang ditampilkan. Komisi referral hanya berstatus aktif & cair saat status invoice adalah <strong className="text-emerald-700">Lunas</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            Total Transaksi Invoice
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {totalAllInvoices}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {paidInvoices.length} Lunas · {pendingInvoices.length} Pending
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            Total Penjualan Referral (Lunas)
          </span>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            Rp {totalSalesPaid.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Dari pesanan lunas
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            Komisi Aktif (Lunas)
          </span>
          <div className="text-xl font-bold text-emerald-600 font-mono tabular-nums">
            Rp {totalCommissionPaid.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tampil di saldo anggota
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            Komisi Pending (Tertunda)
          </span>
          <div className="text-xl font-bold text-amber-600 font-mono tabular-nums">
            Rp {totalCommissionPending.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Menunggu pembayaran lunas
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nomor invoice, nomor_referensi, pelanggan, atau nama anggota..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'lunas', 'pending', 'batal'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors uppercase text-[10px] tracking-wider ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'Semua' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">No. Invoice</th>
                <th className="py-3 px-4">Nomor Referensi Anggota</th>
                <th className="py-3 px-4">Pelanggan / Produk</th>
                <th className="py-3 px-4 text-right">Nilai Transaksi</th>
                <th className="py-3 px-4 text-right">Komisi Anggota</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="font-medium">Tidak ada data transaksi invoice dengan nomor referensi yang sesuai filter.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Invoice tanpa nomor referensi anggota disembunyikan secara otomatis dari daftar.</p>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Invoice Number */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      <div>{inv.invoice_number}</div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        {new Date(inv.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>

                    {/* Member Reference */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded tabular-nums">
                          {inv.nomor_referensi || inv.reference_number}
                        </span>
                        <button
                          onClick={() => handleCopy(inv.nomor_referensi || inv.reference_number)}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors"
                          title="Salin nomor referensi"
                        >
                          {copiedText === (inv.nomor_referensi || inv.reference_number) ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {inv.member_name && (
                        <div className="text-[11px] text-blue-700 font-medium mt-0.5">
                          {inv.member_name}
                        </div>
                      )}
                    </td>

                    {/* Customer & Description */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                      {inv.description && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {inv.description}
                        </div>
                      )}
                      {inv.customer_phone && (
                        <div className="text-[10px] font-mono text-slate-400">
                          {inv.customer_phone}
                        </div>
                      )}
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      Rp {Number(inv.total_amount).toLocaleString('id-ID')}
                    </td>

                    {/* Commission */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-bold text-emerald-600 tabular-nums">
                        Rp {Number(inv.commission_amount).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ({inv.commission_rate_percent ?? 10}%)
                      </div>
                    </td>

                    {/* Status Badge */}
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
                        {inv.status === 'batal' && <XCircle className="w-3 h-3" />}
                        <span className="capitalize">{inv.status}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status !== 'lunas' && (
                          <button
                            onClick={() => handleUpdateStatus(inv.id, 'lunas')}
                            title="Tandai Pembayaran Lunas (Komisi Aktif)"
                            className="px-2 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
                          >
                            Set Lunas
                          </button>
                        )}
                        {inv.status === 'lunas' && (
                          <button
                            onClick={() => handleUpdateStatus(inv.id, 'pending')}
                            title="Kembalikan ke status Pending"
                            className="px-2 py-1 text-[10px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors"
                          >
                            Set Pending
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Hapus Invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
          totalItems={filteredInvoices.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="invoice"
        />
      </div>

      {/* Modal: Catat Transaksi Invoice */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Catat Transaksi Invoice (Tabel invoice)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Menyimpan data pesanan ke tabel <code className="font-mono text-slate-800">invoice</code> dengan menghubungkan <code className="font-mono text-slate-800">nomor_referensi</code> anggota.
            </p>

            {submitError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                {submitError}
              </div>
            )}

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              {/* Select or type nomor_referensi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Referensi Anggota (nomor_referensi) *
                </label>
                <div className="space-y-1.5">
                  <select
                    value={selectedRef}
                    onChange={(e) => setSelectedRef(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  >
                    <option value="">-- Pilih dari Anggota Terdaftar --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.reference_number}>
                        {m.reference_number} - {m.full_name} ({m.phone_number})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Atau ketik langsung nomor_referensi (misal: REF-64248)..."
                    value={selectedRef}
                    onChange={(e) => setSelectedRef(e.target.value)}
                    className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pelanggan / Pemesan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama pembeli atau nama instansi/perusahaan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
              </div>

              {/* Customer Phone & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    WhatsApp Pelanggan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Pembayaran
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'lunas' | 'pending')}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                  >
                    <option value="lunas">Lunas (Komisi Langsung Aktif)</option>
                    <option value="pending">Pending (Menunggu Pembayaran)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Pesanan / Produk
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Paket Cetak Brosur A4 1.000 lembar"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Nilai Transaksi (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  placeholder="Contoh: 1500000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Komisi dihitung otomatis sebesar 10% (Rp{' '}
                  {totalAmount ? Math.round(Number(totalAmount) * 0.1).toLocaleString('id-ID') : '0'}) untuk nomor referensi anggota terkait.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

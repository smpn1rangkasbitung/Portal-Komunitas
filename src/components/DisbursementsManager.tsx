import React, { useState } from 'react';
import {
  Wallet,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Copy,
  Check,
  Send,
  Building,
  CreditCard,
  User,
  Phone,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import type { Disbursement } from '../types/index.ts';
import { Pagination } from './Pagination.tsx';

interface DisbursementsManagerProps {
  disbursements: Disbursement[];
  onRefresh: () => void;
}

export const DisbursementsManager: React.FC<DisbursementsManagerProps> = ({
  disbursements,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Approval Modal State
  const [selectedDisbursement, setSelectedDisbursement] = useState<Disbursement | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [transferProofRef, setTransferProofRef] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [sendWaOnApprove, setSendWaOnApprove] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  // Reject Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [sendWaOnReject, setSendWaOnReject] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Detail View Modal State
  const [viewDetailItem, setViewDetailItem] = useState<Disbursement | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleOpenApproveModal = (d: Disbursement) => {
    setSelectedDisbursement(d);
    setTransferProofRef(`TRX-${d.bank_name.split(' ')[0].toUpperCase()}-${Date.now().toString().slice(-6)}`);
    setApproveNotes(`Transfer pencairan komisi ${d.disbursement_code} berhasil diproses.`);
    setApproveError(null);
    setIsApproveModalOpen(true);
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisbursement) return;

    setApproving(true);
    setApproveError(null);

    try {
      const res = await fetch(`/api/disbursements/${selectedDisbursement.id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processed_by: 'Administrator',
          transfer_proof_ref: transferProofRef.trim() || undefined,
          admin_notes: approveNotes.trim() || undefined,
          send_whatsapp: sendWaOnApprove,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsApproveModalOpen(false);
        setSelectedDisbursement(null);
        onRefresh();
      } else {
        setApproveError(data.error || 'Gagal menyetujui pengajuan pencairan.');
      }
    } catch (err: any) {
      setApproveError('Kesalahan jaringan: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleOpenRejectModal = (d: Disbursement) => {
    setSelectedDisbursement(d);
    setRejectReason('');
    setRejectError(null);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisbursement) return;

    if (!rejectReason.trim()) {
      setRejectError('Alasan penolakan wajib diisi agar anggota memahami penyebabnya.');
      return;
    }

    setRejecting(true);
    setRejectError(null);

    try {
      const res = await fetch(`/api/disbursements/${selectedDisbursement.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processed_by: 'Administrator',
          admin_notes: rejectReason.trim(),
          send_whatsapp: sendWaOnReject,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsRejectModalOpen(false);
        setSelectedDisbursement(null);
        onRefresh();
      } else {
        setRejectError(data.error || 'Gagal memproses penolakan.');
      }
    } catch (err: any) {
      setRejectError('Kesalahan jaringan: ' + err.message);
    } finally {
      setRejecting(false);
    }
  };

  // Filter disbursements
  const filteredDisbursements = disbursements.filter((d) => {
    const term = searchTerm.toLowerCase();
    const codeMatch = (d.disbursement_code || '').toLowerCase().includes(term);
    const nameMatch = (d.member_name || '').toLowerCase().includes(term);
    const refMatch = (d.reference_number || '').toLowerCase().includes(term);
    const phoneMatch = (d.member_phone || '').toLowerCase().includes(term);
    const bankMatch = (d.bank_name || '').toLowerCase().includes(term);
    const accMatch = (d.account_number || '').toLowerCase().includes(term);
    const holderMatch = (d.account_holder || '').toLowerCase().includes(term);

    const matchSearch =
      !searchTerm ||
      codeMatch ||
      nameMatch ||
      refMatch ||
      phoneMatch ||
      bankMatch ||
      accMatch ||
      holderMatch;

    const matchStatus = statusFilter === 'all' || d.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const paginatedDisbursements = filteredDisbursements.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // KPI Calculations
  const pendingItems = disbursements.filter((d) => d.status === 'pending');
  const approvedItems = disbursements.filter((d) => d.status === 'approved');
  const rejectedItems = disbursements.filter((d) => d.status === 'rejected');

  const totalPendingAmount = pendingItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalApprovedAmount = approvedItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header and Telemetry */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Persetujuan & Kelola Pencairan Komisi
            </h2>
            {pendingItems.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                {pendingItems.length} Menunggu Approval
              </span>
            )}
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Tabel: disbursements
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola permohonan penarikan saldo komisi anggota dari transaksi invoice yang telah lunas.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
        >
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Info Banner: Verification Flow */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900">
              Alur Verifikasi Pencairan Dana:
            </span>{' '}
            <span className="text-slate-600">
              Anggota mengajukan penarikan dari saldo komisi order lunas. Setelah Anda melakukan transfer antarbank atau e-wallet, klik tombol <strong>"Setujui & Tandai Cair"</strong> dan masukkan ID bukti transfer. WhatsApp Gateway akan secara otomatis mengirim notifikasi resmi ke nomor anggota.
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Requests */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
          {pendingItems.length > 0 && (
            <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />
          )}
          <span className="text-xs font-medium text-slate-500 block mb-1">
            Menunggu Approval (Pending)
          </span>
          <div className="text-2xl font-bold text-amber-600 font-mono tabular-nums">
            {pendingItems.length}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1 font-mono">
            Rp {totalPendingAmount.toLocaleString('id-ID')}
          </div>
        </div>

        {/* Card 2: Total Disbursed Amount */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            Total Dana Telah Dicairkan
          </span>
          <div className="text-xl font-bold text-emerald-600 font-mono tabular-nums">
            Rp {totalApprovedAmount.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Dari {approvedItems.length} permohonan disetujui
          </div>
        </div>

        {/* Card 3: Approved Count */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            Pencairan Disetujui (Approved)
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {approvedItems.length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Dana berhasil ditransfer
          </div>
        </div>

        {/* Card 4: Rejected Count */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block mb-1">
            Pencairan Ditolak (Rejected)
          </span>
          <div className="text-2xl font-bold text-rose-600 font-mono tabular-nums">
            {rejectedItems.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Saldo dikembalikan ke anggota
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
            placeholder="Cari kode pengajuan, nama anggota, nomor referensi, nama bank, atau no. rekening..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'pending', label: `Pending (${pendingItems.length})` },
              { id: 'approved', label: 'Disetujui' },
              { id: 'rejected', label: 'Ditolak' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors uppercase text-[10px] tracking-wider whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Disbursements List Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Kode & Tanggal</th>
                <th className="py-3 px-4">Anggota & Ref</th>
                <th className="py-3 px-4">Tujuan Rekening Transfer</th>
                <th className="py-3 px-4 text-right">Nominal Pencairan</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Catatan / Bukti</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDisbursements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <p className="font-medium">Tidak ada permohonan pencairan komisi yang sesuai dengan filter.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Anggota dapat mengajukan penarikan dana melalui menu Komisi di portal anggota mereka.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedDisbursements.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Code & Date */}
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

                    {/* Member Info */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{d.member_name}</div>
                      <div className="flex items-center gap-1 text-[11px] text-blue-700 font-mono mt-0.5">
                        <span>{d.reference_number}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{d.member_phone}</div>
                    </td>

                    {/* Bank & Account Destination */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{d.bank_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] tabular-nums">
                          {d.account_number}
                        </span>
                        <button
                          onClick={() => handleCopy(d.account_number)}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors"
                          title="Salin No Rekening"
                        >
                          {copiedText === d.account_number ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-500">a.n. {d.account_holder}</div>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-bold text-base text-slate-900 tabular-nums">
                        Rp {Number(d.amount).toLocaleString('id-ID')}
                      </div>
                      {d.notes && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs text-right mt-0.5" title={d.notes}>
                          "{d.notes}"
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
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

                    {/* Admin Notes & Proof */}
                    <td className="py-3 px-4">
                      {d.status === 'approved' && (
                        <div>
                          {d.transfer_proof_ref && (
                            <div className="font-mono text-[11px] font-medium text-emerald-800">
                              Ref: {d.transfer_proof_ref}
                            </div>
                          )}
                          {d.admin_notes && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[180px]" title={d.admin_notes}>
                              {d.admin_notes}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono">
                            {d.processed_at ? new Date(d.processed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                          </div>
                        </div>
                      )}
                      {d.status === 'rejected' && (
                        <div>
                          <div className="text-[11px] text-rose-700 font-medium truncate max-w-[180px]" title={d.admin_notes || 'Ditolak'}>
                            {d.admin_notes || 'Pengajuan ditolak'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">Saldo kembali</div>
                        </div>
                      )}
                      {d.status === 'pending' && (
                        <span className="text-[10px] text-slate-400 italic">Belum diproses</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {d.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenApproveModal(d)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>
                          <button
                            onClick={() => handleOpenRejectModal(d)}
                            className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                          >
                            <span>Tolak</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setViewDetailItem(d)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Lihat Detail
                        </button>
                      )}
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
          totalItems={filteredDisbursements.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="pengajuan pencairan"
        />
      </div>

      {/* MODAL APPROVAL PENCAIRAN */}
      {isApproveModalOpen && selectedDisbursement && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Approval Pencairan Komisi
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Kode: {selectedDisbursement.disbursement_code}
                  </span>
                </div>
              </div>
            </div>

            {approveError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                {approveError}
              </div>
            )}

            {/* Recipient & Amount Details Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Anggota Penerima:</span>
                <span className="font-bold text-slate-900">{selectedDisbursement.member_name} ({selectedDisbursement.reference_number})</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Nominal yang Dicairkan:</span>
                <span className="font-mono text-base font-bold text-emerald-700 tabular-nums">
                  Rp {Number(selectedDisbursement.amount).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Bank / E-Wallet Tujuan:</span>
                <span className="font-semibold text-slate-900">{selectedDisbursement.bank_name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500">Nomor Rekening:</span>
                <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                  <span>{selectedDisbursement.account_number}</span>
                  <button
                    onClick={() => handleCopy(selectedDisbursement.account_number)}
                    className="p-1 text-slate-400 hover:text-slate-800"
                    title="Salin nomor rekening"
                  >
                    {copiedText === selectedDisbursement.account_number ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Nama Pemilik Rekening:</span>
                <span className="font-semibold text-slate-900">{selectedDisbursement.account_holder}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmApprove} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Bukti Transfer / ID Transaksi Bank (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: TRX-BCA-202610-9841"
                  value={transferProofRef}
                  onChange={(e) => setTransferProofRef(e.target.value)}
                  className="w-full p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Persetujuan untuk Anggota
                </label>
                <textarea
                  rows={2}
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="Pesan pemberitahuan atau info tambahan untuk anggota..."
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 resize-none"
                />
              </div>

              {/* Checkbox WhatsApp */}
              <div className="flex items-start gap-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                <input
                  type="checkbox"
                  id="sendWaApprove"
                  checked={sendWaOnApprove}
                  onChange={(e) => setSendWaOnApprove(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="sendWaApprove" className="text-xs text-emerald-900 cursor-pointer">
                  <span className="font-semibold block">Kirim Notifikasi WhatsApp Otomatis</span>
                  <span>
                    Kirim pesan konfirmasi resmi ke WhatsApp {selectedDisbursement.member_phone} bahwa dana telah berhasil ditransfer.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApproveModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{approving ? 'Memproses...' : 'Konfirmasi Setujui & Tandai Cair'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REJECT PENCAIRAN */}
      {isRejectModalOpen && selectedDisbursement && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in duration-200">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tolak Pengajuan Pencairan
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Kode: {selectedDisbursement.disbursement_code}
                </span>
              </div>
            </div>

            {rejectError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                {rejectError}
              </div>
            )}

            <p className="text-xs text-slate-600 mb-4">
              Jika ditolak, saldo sebesar <strong className="font-mono text-slate-900">Rp {Number(selectedDisbursement.amount).toLocaleString('id-ID')}</strong> akan dikembalikan secara utuh ke saldo komisi akun anggota.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penolakan *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Contoh: Nomor rekening tidak valid / nama pemilik rekening tidak sesuai dengan identitas anggota."
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 resize-none"
                />
              </div>

              {/* Checkbox WhatsApp */}
              <div className="flex items-start gap-2 p-3 bg-rose-50/70 border border-rose-200 rounded-lg">
                <input
                  type="checkbox"
                  id="sendWaReject"
                  checked={sendWaOnReject}
                  onChange={(e) => setSendWaOnReject(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <label htmlFor="sendWaReject" className="text-xs text-rose-900 cursor-pointer">
                  <span className="font-semibold block">Kirim Alasan via WhatsApp</span>
                  <span>
                    Beritahukan penolakan dan alasannya langsung ke nomor WhatsApp {selectedDisbursement.member_phone}.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{rejecting ? 'Menolak...' : 'Konfirmasi Penolakan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {viewDetailItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Rincian Pencairan Dana
              </h3>
              <button
                onClick={() => setViewDetailItem(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Kode Pengajuan:</span>
                <span className="font-mono font-bold text-slate-900">{viewDetailItem.disbursement_code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Nama Anggota:</span>
                <span className="font-semibold text-slate-900">{viewDetailItem.member_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Nomor Referensi:</span>
                <span className="font-mono text-blue-700 font-bold">{viewDetailItem.reference_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Nominal:</span>
                <span className="font-mono font-bold text-base text-emerald-600">
                  Rp {Number(viewDetailItem.amount).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Bank / E-Wallet:</span>
                <span className="font-semibold text-slate-900">{viewDetailItem.bank_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Nomor Rekening:</span>
                <span className="font-mono font-bold text-slate-900">{viewDetailItem.account_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Nama Rekening:</span>
                <span className="font-semibold text-slate-900">{viewDetailItem.account_holder}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status:</span>
                <span className="font-semibold uppercase text-[10px] text-slate-900">{viewDetailItem.status}</span>
              </div>
              {viewDetailItem.transfer_proof_ref && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Bukti Transfer:</span>
                  <span className="font-mono font-bold text-slate-900">{viewDetailItem.transfer_proof_ref}</span>
                </div>
              )}
              {viewDetailItem.admin_notes && (
                <div className="py-1">
                  <span className="text-slate-500 block mb-1">Catatan Admin:</span>
                  <p className="bg-slate-50 p-2 rounded text-slate-700">{viewDetailItem.admin_notes}</p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewDetailItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

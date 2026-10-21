import React, { useState } from 'react';
import {
  Users,
  Search,
  Download,
  Copy,
  Check,
  QrCode,
  Eye,
  CheckCircle2,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
} from 'lucide-react';
import type { Member } from '../types/index.ts';
import { Pagination } from './Pagination.tsx';

interface MembersDirectoryProps {
  members: Member[];
  onRefresh: () => void;
}

export const MembersDirectory: React.FC<MembersDirectoryProps> = ({
  members,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleCopy = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleExportCSV = () => {
    if (members.length === 0) return;
    const headers = ['ID', 'Nomor Referensi', 'Nama Lengkap', 'Nomor WhatsApp', 'Email', 'Kota', 'Minat', 'Status', 'Tanggal Daftar'];
    const rows = members.map((m) => [
      m.id,
      m.reference_number,
      `"${m.full_name.replace(/"/g, '""')}"`,
      `"${m.phone_number}"`,
      `"${(m.email || '').replace(/"/g, '""')}"`,
      `"${(m.city || '').replace(/"/g, '""')}"`,
      `"${(m.bio_interest || '').replace(/"/g, '""')}"`,
      m.status,
      m.created_at,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `daftar_anggota_komunitas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = members.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      m.full_name.toLowerCase().includes(term) ||
      m.reference_number.toLowerCase().includes(term) ||
      m.phone_number.includes(term) ||
      (m.email && m.email.toLowerCase().includes(term)) ||
      (m.city && m.city.toLowerCase().includes(term))
    );
  });

  const paginatedMembers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Daftar Anggota Komunitas</h2>
          <p className="text-xs text-slate-500">
            Seluruh anggota terverifikasi yang telah mendaftar melalui link undangan dan memiliki Nomor Referensi Unik.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={members.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm disabled:opacity-50 shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Ekspor CSV</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nama, nomor referensi unik, WhatsApp, atau kota..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Nomor Referensi Unik</th>
                <th className="py-3 px-4">Nama Anggota</th>
                <th className="py-3 px-4">Nomor WhatsApp</th>
                <th className="py-3 px-4">Email & Domisili</th>
                <th className="py-3 px-4">Tanggal Bergabung</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Tidak ditemukan data anggota yang sesuai.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Reference */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded tabular-nums">
                          {member.reference_number}
                        </span>
                        <button
                          onClick={() => handleCopy(member.reference_number)}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded transition-colors"
                          title="Salin nomor referensi"
                        >
                          {copiedRef === member.reference_number ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{member.full_name}</div>
                      {member.bio_interest && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                          {member.bio_interest}
                        </div>
                      )}
                    </td>

                    {/* WhatsApp */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-medium text-slate-800 tabular-nums">
                        {member.phone_number}
                      </span>
                    </td>

                    {/* Email & City */}
                    <td className="py-3 px-4">
                      <div className="text-slate-800">{member.email || '-'}</div>
                      <div className="text-[11px] text-slate-400">{member.city || 'Indonesia'}</div>
                    </td>

                    {/* Created At */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] text-slate-700 tabular-nums">
                        {new Date(member.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Aktif</span>
                      </span>
                    </td>

                    {/* Detail button */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedMember(member)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ID Card</span>
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
          itemName="anggota"
        />
      </div>

      {/* Modal Detail Member ID Card */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in duration-200">
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 mb-4">
              Kartu Tanda Anggota Resmi
            </h3>

            {/* Card Preview */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md relative overflow-hidden mb-5">
              <div className="flex items-start justify-between border-b border-slate-700 pb-3 mb-3">
                <div>
                  <span className="text-[10px] text-blue-400 uppercase font-semibold">Komunitas Sinergi Nusantara</span>
                  <div className="text-sm font-bold text-white">ID Keanggotaan Terverifikasi</div>
                </div>
                <QrCode className="w-7 h-7 text-blue-400" />
              </div>

              <div className="mb-3">
                <span className="text-[10px] text-slate-400 block">Nomor Referensi Unik</span>
                <span className="font-mono text-xl font-bold text-blue-400 tracking-wider tabular-nums">
                  {selectedMember.reference_number}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 w-24">Nama:</span>
                  <span className="font-semibold text-white">{selectedMember.full_name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums">
                  <span className="text-slate-400 w-24">WhatsApp:</span>
                  <span>{selectedMember.phone_number}</span>
                </div>
                {selectedMember.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-24">Email:</span>
                    <span>{selectedMember.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 w-24">Domisili:</span>
                  <span>{selectedMember.city || 'Indonesia'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleCopy(selectedMember.reference_number)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Nomor Ref</span>
              </button>
              <button
                onClick={() => setSelectedMember(null)}
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

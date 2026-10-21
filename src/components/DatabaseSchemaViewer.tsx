import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  RefreshCw,
  Server,
  Layers,
  Key,
} from 'lucide-react';
import type { DatabaseStatus } from '../types/index.ts';

interface DatabaseSchemaViewerProps {
  status: DatabaseStatus | null;
  onRefresh: () => void;
}

export const DatabaseSchemaViewer: React.FC<DatabaseSchemaViewerProps> = ({
  status,
  onRefresh,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<any>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [sqlSchema, setSqlSchema] = useState<string>('');

  useEffect(() => {
    fetch('/api/database/schema-sql')
      .then((res) => res.text())
      .then((data) => setSqlSchema(data))
      .catch((e) => console.error(e));
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/database/test-mysql', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
      onRefresh();
    } catch (e: any) {
      setTestResult({ success: false, message: 'Koneksi gagal: ' + e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrateResult(null);
    try {
      const res = await fetch('/api/database/migrate', { method: 'POST' });
      const data = await res.json();
      setMigrateResult(data);
      onRefresh();
    } catch (e: any) {
      setMigrateResult({ success: false, message: 'Migrasi gagal: ' + e.message });
    } finally {
      setMigrating(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([sqlSchema], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'schema_komunitas_print_new.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Database MySQL & Skema Tabel Terintegrasi</h2>
          <p className="text-xs text-slate-500">
            Koneksi ke server database MySQL dan definisi tabel DDL terstruktur untuk data anggota, undangan, dan log notifikasi.
          </p>
        </div>
      </div>

      {/* Connection Info Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">MySQL Server Connection</span>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                    status?.isConnected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {status?.isConnected ? 'Terhubung (MySQL Live)' : 'Penyimpanan Lokal Aktif (Fallback)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{status?.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Server className="w-3.5 h-3.5" />
              <span>{testing ? 'Menguji...' : 'Uji Koneksi MySQL'}</span>
            </button>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">DB Host</span>
            <span className="font-mono text-slate-800 font-medium block tabular-nums">{status?.host || 'posapp.hostr.my.id'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Port</span>
            <span className="font-mono text-slate-800 font-medium block tabular-nums">{status?.port || 3306}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Database</span>
            <span className="font-mono text-slate-800 font-medium block">{status?.database || 'db_print_new'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Username</span>
            <span className="font-mono text-slate-800 font-medium block">{status?.user || 'db_print_new'}</span>
          </div>
        </div>

        {/* Feedback results */}
        {(testResult || migrateResult) && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className="font-semibold block">Hasil Uji Koneksi:</span>
                  <span>{testResult.message}</span>
                </div>
              </div>
            )}
            {migrateResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  migrateResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {migrateResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className="font-semibold block">Hasil Eksekusi Migrasi:</span>
                  <span>{migrateResult.message}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
 
    </div>
  );
};

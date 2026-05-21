/**
 * @ai_context Komponen tooltip health status yang menampilkan data dari healthGuardian.worker.
 *             Ditampilkan sebagai overlay saat user klik icon sync di header MainLayout.
 * @security_tier LOW
 * @business_rule Health data bersifat informatif — tidak ada aksi kritis di sini.
 *               Hanya owner (ADMIN) yang bisa melihat detail storage/DLQ count.
 * @data-component-id: sync-heartbeat-indicator
 * @data-error-domain: sync
 * @changelog:
 *   2026-05-21 — Dibuat untuk BATCH C: wire HEALTH_REPORT dari healthGuardian (BATCH C)
 */
import React from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  HardDrive,
  RefreshCw,
  Inbox,
  Clock,
} from 'lucide-react';

export interface HealthReport {
  timestamp: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  issues: { code: string; message: string; severity: string }[];
  storageUsedPercent: number;
  pendingSyncCount: number;
  dlqCount: number;
}

interface Props {
  report: HealthReport | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function SyncHeartbeatIndicator({ report, isLoading, onRefresh }: Props) {
  if (isLoading && !report) {
    return (
      <div className="w-72 p-4 text-center">
        <RefreshCw size={20} className="animate-spin text-stone-400 mx-auto mb-2" />
        <p className="text-xs text-stone-500">Memeriksa kesehatan sistem...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="w-72 p-4 text-center">
        <p className="text-xs text-stone-500">Klik refresh untuk memeriksa kesehatan sistem.</p>
        <button
          onClick={onRefresh}
          className="mt-3 flex items-center gap-1.5 mx-auto text-xs text-stone-500 hover:text-stone-700 transition-colors"
        >
          <RefreshCw size={12} />
          Periksa Sekarang
        </button>
      </div>
    );
  }

  const statusConfig = {
    HEALTHY: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle size={16} />, label: 'Sistem Sehat' },
    WARNING: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertTriangle size={16} />, label: 'Ada Peringatan' },
    CRITICAL: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: <XCircle size={16} />, label: 'Perhatian Diperlukan' },
  }[report.status];

  const storageColor =
    report.storageUsedPercent >= 80
      ? 'bg-rose-500'
      : report.storageUsedPercent >= 60
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const lastCheckTime = new Date(report.timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="w-72 overflow-hidden">
      {/* Status Header */}
      <div className={`flex items-center gap-2.5 px-4 py-3 ${statusConfig.bg} border-b ${statusConfig.border}`}>
        <span className={statusConfig.color}>{statusConfig.icon}</span>
        <div className="flex-1">
          <p className={`text-sm font-bold ${statusConfig.color}`}>{statusConfig.label}</p>
          <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
            <Clock size={10} />
            Dicek pukul {lastCheckTime}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="text-stone-400 hover:text-stone-600 transition-colors"
          title="Refresh health check"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Metrics */}
      <div className="px-4 py-3 space-y-3 bg-white">
        {/* Storage Usage */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
              <HardDrive size={13} />
              Penyimpanan Lokal
            </span>
            <span className={`text-xs font-bold ${report.storageUsedPercent >= 80 ? 'text-rose-600' : report.storageUsedPercent >= 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {report.storageUsedPercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${storageColor}`}
              style={{ width: `${Math.min(report.storageUsedPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Pending Sync + DLQ */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-stone-50 rounded-xl p-2.5 text-center border border-stone-100">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <RefreshCw size={12} className="text-stone-400" />
              <span className="text-[10px] text-stone-500 font-medium">Antrian Sync</span>
            </div>
            <p className={`text-lg font-bold ${report.pendingSyncCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {report.pendingSyncCount}
            </p>
          </div>
          <div className="bg-stone-50 rounded-xl p-2.5 text-center border border-stone-100">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Inbox size={12} className="text-stone-400" />
              <span className="text-[10px] text-stone-500 font-medium">DLQ (Error)</span>
            </div>
            <p className={`text-lg font-bold ${report.dlqCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {report.dlqCount}
            </p>
          </div>
        </div>
      </div>

      {/* Issues List */}
      {report.issues.length > 0 && (
        <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide font-bold text-stone-400">Isu Terdeteksi</p>
          {report.issues.slice(0, 3).map((issue, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 text-xs rounded-lg p-2 ${issue.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}
            >
              <AlertTriangle size={11} className="shrink-0 mt-0.5" />
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

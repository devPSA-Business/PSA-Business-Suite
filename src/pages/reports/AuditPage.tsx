import { AuditLogViewer } from '../../features/audit/components/AuditLogViewer';
import { IntegrityVerifier } from '../../features/audit/components/IntegrityVerifier';
import { ShieldAlert } from 'lucide-react';
import { BackButton } from '../../shared/components/BackButton';

export function AuditPage() {
  return (
    <div className="h-full flex flex-col gap-6">
      <BackButton />
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 shrink-0 flex items-center gap-4">
        <div className="w-12 h-12 bg-stone-50 text-brand-900 rounded-xl flex items-center justify-center">
          <ShieldAlert size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-brand-900">Audit Log</h2>
          <p className="text-stone-500 text-sm">Catatan aktivitas sistem dan transaksi (Append-only).</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pb-6 relative">
        {/* G-13 FIX: UI Verifikasi Integritas Audit */}
        <IntegrityVerifier />
        <AuditLogViewer />
        <span className="text-[9px] text-stone-300 font-mono absolute bottom-1 right-2">[W-A-01]</span>
      </div>
    </div>
  );
}

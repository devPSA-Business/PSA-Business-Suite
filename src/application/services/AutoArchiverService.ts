import { db } from '../../shared/api/db';

/**
 * @ai_context Local Pruner: Menghapus data audit log dan sync event lama (>90 hari) dari IndexedDB lokal.
 * @security_tier HIGH
 * @business_rule TRANSAKSI TIDAK BOLEH DIHAPUS (untuk referensi buyback luring).
 * Hanya menghapus audit_logs dan sync_events yang sudah dipastikan tersinkronisasi (SYNCED).
 */
export async function runAutoArchiver() {
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  
  // 1. Bersihkan Audit Logs lama (Simpan yang terbaru untuk Hash Chain)
  const oldAuditLogs = await db.audit_logs
    .where('timestamp')
    .below(ninetyDaysAgo)
    .primaryKeys();

  if (oldAuditLogs.length > 0) {
    let logsToDelete = [...oldAuditLogs];
    const allLogsCount = await db.audit_logs.count();
    
    // Jangan hapus log terakhir untuk menjaga integritas Hash
    if (allLogsCount === logsToDelete.length) {
      const latestLog = await db.audit_logs.orderBy('timestamp').last();
      if (latestLog && latestLog.id) {
        logsToDelete = logsToDelete.filter(id => id !== latestLog.id);
      }
    }
    
    if (logsToDelete.length > 0) {
      await db.audit_logs.bulkDelete(logsToDelete as string[]);
      console.log(`[AutoArchiver] Pruned ${logsToDelete.length} audit logs (legacy >90 days).`);
    }
  }

  // 2. Bersihkan Sync Events lama yang sudah SYNCED
  const oldSyncEvents = await db.sync_events
    .where('timestamp')
    .below(ninetyDaysAgo)
    .filter(e => e.status === 'SYNCED')
    .primaryKeys();

  if (oldSyncEvents.length > 0) {
    await db.sync_events.bulkDelete(oldSyncEvents as number[]);
    console.log(`[AutoArchiver] Pruned ${oldSyncEvents.length} synced events (legacy >90 days).`);
  }
}

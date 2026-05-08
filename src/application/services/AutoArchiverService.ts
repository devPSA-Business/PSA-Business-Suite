import { archiveOldLogsAndEvents } from '../../shared/utils/dataArchiver';

/**
 * @ai_context Local Pruner: Menghapus data audit log dan sync event lama (>90 hari) dari IndexedDB lokal.
 * @security_tier HIGH
 * @business_rule TRANSAKSI TIDAK BOLEH DIHAPUS (untuk referensi buyback luring).
 * Hanya menghapus audit_logs dan sync_events yang sudah dipastikan tersinkronisasi (SYNCED).
 */
export async function runAutoArchiver() {
  await archiveOldLogsAndEvents();
}

import { db } from '../api/db';
import { logger } from '../../lib/logger';

/**
 * @ai_context Auto-Pruner (Zero Maintenance Strategy Phase 2).
 * Dijalankan di background atau saat Admin menekan bersihkan data lokal.
 * Tidak perlu repot pop-up download file JSON untuk Founder. Asalkan sudah di Cloud (SYNCED),
 * hapus dari Dexie tablet untuk menghemat storage offline.
 * 
 * PERHATIAN: HANYA MENGHAPUS LOG DAN EVENT YANG SUDAH SYNC. TRANSAKSI HARUS DIPERTAHANKAN
 * UNTUK REFERENSI BUYBACK SAAT OFFLINE.
 */
export const archiveOldLogsAndEvents = async (): Promise<{ count: number }> => {
  try {
    const PRUNE_THRESHOLD_DAYS = 90;
    // Definisi data lama: > PRUNE_THRESHOLD_DAYS
    const thresholdDate = Date.now() - PRUNE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
    
    // Temukan audit_logs yang lebih tua, KECUALI yang tipe GOLD_BUYBACK
    const oldLogs = await db.audit_logs
      .where('timestamp')
      .below(thresholdDate)
      .filter(log => log.action !== 'GOLD_BUYBACK')
      .primaryKeys();

    // Temukan sync_events tua yang statusnya MUTLAK 'SYNCED'
    const oldSyncEvents = await db.sync_events
      .where('timestamp')
      .below(thresholdDate)
      .filter(event => event.status === 'SYNCED')
      .primaryKeys();
    
    const totalToDelete = oldLogs.length + oldSyncEvents.length;

    if (totalToDelete === 0) {
      return { count: 0 };
    }

    // Hapus dari database luring dengan aman
    let logsToDelete = [...oldLogs];
    
    await db.transaction('rw', db.audit_logs, db.sync_events, async () => {
      // Prevent deleting the absolute last audit log if we are deleting everything
      // to maintain the cryptographic hash chain.
      const allLogsCount = await db.audit_logs.count();
      if (allLogsCount === logsToDelete.length && logsToDelete.length > 0) {
        const latestLog = await db.audit_logs.orderBy('timestamp').last();
        if (latestLog && latestLog.id) {
           logsToDelete = logsToDelete.filter(id => id !== latestLog.id);
        }
      }

      if (logsToDelete.length > 0) {
        await db.audit_logs.bulkDelete(logsToDelete as string[]);
      }

      if (oldSyncEvents.length > 0) {
        await db.sync_events.bulkDelete(oldSyncEvents as number[]);
      }
      
      const lastLog = await db.audit_logs.orderBy('timestamp').last();
      const lastHash = lastLog ? lastLog.hash : '0';
      
      const details = `Auto-Prune Aktif: Menghapus ${logsToDelete.length} audit logs dan ${oldSyncEvents.length} sync events (Status: SYNCED) kedaluwarsa (> ${PRUNE_THRESHOLD_DAYS} hari).`;
      
      // Catat penghapusan ke audit log agar tidak dicurigai hilang
      const encoder = new TextEncoder();
      const data = encoder.encode(lastHash + Date.now().toString() + 'LOCAL_PRUNE' + 'System' + details);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await db.audit_logs.add({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        action: 'LOCAL_PRUNE',
        user: 'System',
        details,
        hash,
        previousHash: lastHash
      });
    });

    logger.info(`Berhasil membersihkan ${logsToDelete.length} logs dan ${oldSyncEvents.length} events dari IndexedDB.`);
    return { count: totalToDelete };
  } catch (error) {
    logger.error('Gagal menjalankan auto-prune data lama:', { error: (error instanceof Error ? error.message : String(error)) || error });
    return { count: 0 };
  }
};

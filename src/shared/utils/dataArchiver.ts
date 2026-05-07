import { db } from '../api/db';
import { logger } from '../../lib/logger';
import { Dexie } from 'dexie';

/**
 * @ai_context Auto-Pruner (Zero Maintenance Strategy Phase 2).
 * Dijalankan di background atau saat Admin menekan bersihkan data lokal.
 * Tidak perlu repot pop-up download file JSON untuk Founder. Asalkan sudah di Cloud (SYNCED),
 * hapus dari Dexie tablet untuk menghemat storage offline.
 * 
 * PERHATIAN: HANYA MENGHAPUS LOG DAN EVENT YANG SUDAH SYNC. TRANSAKSI HARUS DIPERTAHANKAN
 * UNTUK REFERENSI BUYBACK SAAT OFFLINE.
 */
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
    
    // 1. Identifikasi Audit Logs tua
    const oldLogs = await db.audit_logs
      .where('timestamp')
      .below(thresholdDate)
      .filter(log => log.action !== 'GOLD_BUYBACK')
      .toArray();

    // 2. Identifikasi Sync Events tua yang statusnya MUTLAK 'SYNCED'
    const oldSyncEvents = await db.sync_events
      .where('timestamp')
      .below(thresholdDate)
      .filter(event => event.status === 'SYNCED')
      .toArray();

    // Keamanan Tambahan: Hanya hapus audit_log jika event sinkronisasinya sudah SYNCED atau menghilang (sudah dipruning sebelumnya)
    // Kita filter oldLogs berdasarkan status sync-nya.
    
    // Audit logs yang aman dihapus:
    // a. Ada di daftar oldSyncEvents (berarti statusnya SYNCED dan tua)
    // b. Atas dasar waktu yang sangat lama, kita asumsikan sudah aman (opsional, tapi safer jika cek ID)
    
    // Perbaikan Logika:
    const safeLogsToDelete: string[] = [];
    for (const log of oldLogs) {
       // Cek apakah ada event tertunda untuk ID ini
       const pendingEvent = await db.sync_events
         .where('entity_type').equals('audit_logs')
         .and(e => e.payload.id === log.id && e.status !== 'SYNCED')
         .first();
       
       if (!pendingEvent) {
         safeLogsToDelete.push(log.id);
       }
    }
    
    const eventIdsToDelete = oldSyncEvents.map(e => e.id as number);
    const totalToDelete = safeLogsToDelete.length + eventIdsToDelete.length;

    if (totalToDelete === 0) {
      return { count: 0 };
    }

    await db.transaction('rw', db.audit_logs, db.sync_events, async () => {
      // Maintain the cryptographic hash chain by keeping the absolute last log
      let finalLogsToDelete = [...safeLogsToDelete];
      const allLogsCount = await db.audit_logs.count();
      
      if (allLogsCount <= finalLogsToDelete.length && allLogsCount > 0) {
        const latestLog = await db.audit_logs.orderBy('timestamp').last();
        if (latestLog && latestLog.id) {
            finalLogsToDelete = finalLogsToDelete.filter(id => id !== latestLog.id);
        }
      }

      if (finalLogsToDelete.length > 0) {
        await db.audit_logs.bulkDelete(finalLogsToDelete);
      }

      if (eventIdsToDelete.length > 0) {
        await db.sync_events.bulkDelete(eventIdsToDelete);
      }
      
      const lastLog = await db.audit_logs.orderBy('timestamp').last();
      const lastHash = lastLog ? lastLog.hash : 'GENESIS_BLOCK_0000000000000000';
      
      const details = `Auto-Prune: Membersihkan ${finalLogsToDelete.length} logs dan ${eventIdsToDelete.length} synced events (> ${PRUNE_THRESHOLD_DAYS} hari).`;
      
      // Menggunakan timestamp monotonic
      let timestamp = Date.now();
      if (lastLog && timestamp <= lastLog.timestamp) {
        timestamp = lastLog.timestamp + 1;
      }

      // Re-calculate hash manually to maintain chain
      const encoder = new TextEncoder();
      const id = crypto.randomUUID();
      const dataString = `${lastHash}|${id}|${timestamp}|LOCAL_PRUNE|System|${details}||`;
      const data = encoder.encode(dataString);
      const hashBuffer = await Dexie.waitFor(crypto.subtle.digest('SHA-256', data));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await db.audit_logs.add({
        id,
        timestamp,
        action: 'LOCAL_PRUNE',
        user: 'System',
        details,
        hash,
        previousHash: lastHash
      });
    });

    logger.info(`Pruning berhasil: ${safeLogsToDelete.length} logs, ${eventIdsToDelete.length} events removed.`);
    return { count: totalToDelete };
  } catch (error) {
    logger.error('Gagal menjalankan auto-prune data lama:', { error: (error instanceof Error ? error.message : String(error)) || error });
    return { count: 0 };
  }
};

/**
 * @ai_context: Utilitas sinkronisasi waktu server (READ-ONLY).
 * @security_tier: LOW
 * @business_rule: Hanya membaca timestamp dari Firestore — DILARANG write apapun dari modul ini.
 *                 Dokumen 'serverInfo/timestamp' dikelola eksklusif oleh Cloud Functions (scheduledSystemWatchdog).
 * @changelog:
 *   2026-05-21 — FIX C-01: Hapus setDoc — dari write+read menjadi read-only.
 *                Eliminasi pelanggaran "Rule of Least Privilege" dan "The Leak" pattern.
 */
import { logger } from '../../lib/logger';
import { doc, getDocFromServer } from 'firebase/firestore';
import { firestoreDb, isConfigValid } from '../api/firebase';

let timeOffset = 0;

export async function syncTimeOffset(): Promise<void> {
  if (!navigator.onLine || !isConfigValid) return;

  try {
    const timestampRef = doc(firestoreDb, 'serverInfo', 'timestamp');
    const t0 = Date.now();

    // READ-ONLY: Ambil dokumen yang sudah ada (dikelola oleh Cloud Functions / watchdog).
    // Jika dokumen belum ada, skip — jangan write dari client.
    const snap = await getDocFromServer(timestampRef);
    const t1 = Date.now();

    if (!snap.exists()) {
      // Normal pada first-run sebelum watchdog Cloud Function pertama kali berjalan.
      return;
    }

    const serverTime = snap.data()?.time?.toMillis?.();
    if (serverTime) {
      const latency = (t1 - t0) / 2;
      const currentLocalEstimated = Date.now() - latency;
      timeOffset = serverTime - currentLocalEstimated;

      const offsetMinutes = Math.abs(timeOffset) / (60 * 1000);
      if (offsetMinutes > 5) {
        logger.warn('[timeUtils] Time drift detected', { offsetMinutes: offsetMinutes.toFixed(2) });
      }
    }
  } catch (error) {
    // Silent fail: tidak kritis — sistem tetap berjalan dengan waktu lokal.
    logger.warn('[timeUtils] Gagal sync time offset', { error });
  }
}

export function getCurrentTime(): number {
  return Date.now() + timeOffset;
}

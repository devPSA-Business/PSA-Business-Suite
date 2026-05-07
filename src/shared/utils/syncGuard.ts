/**
 * @ai_context    : Mencegah duplikasi sync events di memori sebelum masuk ke IndexedDB.
 * @security_tier : HIGH
 */
import { db } from '../api/db';

const IN_FLIGHT_KEYS = new Map<string, number>();
const TTL_MS = 5 * 60 * 1000; // 5 menit

export async function guardSyncEnqueue(
  resourceType: string,
  resourceId: string,
  idempotencyKey: string
): Promise<boolean> {
  const now = Date.now();
  
  // Cleanup expired in-flight keys
  for (const [key, timestamp] of IN_FLIGHT_KEYS.entries()) {
    if (now - timestamp > TTL_MS) {
      IN_FLIGHT_KEYS.delete(key);
    }
  }

  if (IN_FLIGHT_KEYS.has(idempotencyKey)) {
    console.warn(`[SyncGuard] Duplicate sync blocked (in-flight): ${idempotencyKey}`);
    return false;
  }

  // Cek IndexedDB untuk mencegah duplikat permanen setelah reload
  try {
    const existing = await db.sync_events
      .where('idempotency_key')
      .equals(idempotencyKey)
      .first();

    if (existing) {
      console.warn(`[SyncGuard] Duplicate sync blocked (IndexedDB): ${idempotencyKey}`);
      return false;
    }
  } catch (error) {
    console.error('[SyncGuard] Gagal mengecek IndexedDB', error);
  }

  IN_FLIGHT_KEYS.set(idempotencyKey, now);
  setTimeout(() => IN_FLIGHT_KEYS.delete(idempotencyKey), TTL_MS);
  
  return true;
}

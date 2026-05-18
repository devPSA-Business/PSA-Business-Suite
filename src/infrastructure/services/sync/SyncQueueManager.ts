/**
 * @ai_context Mengelola antrian sinkronisasi: enqueue, idempotency guard, heal, dan DLQ management.
 * @security_tier HIGH
 * @business_rule Semua mutasi WAJIB melalui SyncQueueManager sebelum ke cloud.
 *                Tidak ada direct write ke Firestore dari luar service ini.
 */
import { db, SyncEvent } from '../../../shared/api/db';
import { useAuthStore } from '../../../shared/store/authStore';
import { guardSyncEnqueue } from '../../../shared/utils/syncGuard';
import { logger } from '../../../lib/logger';

export class SyncQueueManager {
  /**
   * Enqueue event ke sync_events (IndexedDB) dengan idempotency guard.
   * Mengembalikan ID event yang di-queue, atau 0 jika ditolak duplikat.
   */
  async enqueue(event: Omit<SyncEvent, 'id' | 'status' | 'timestamp'>): Promise<number> {
    const branchId = useAuthStore.getState().user?.branchId || 'HQ';
    const payload = { ...event.payload };
    if (!payload.branchId) payload.branchId = branchId;

    const idempotency_key = event.idempotency_key || crypto.randomUUID();
    const docId = String(payload.client_txn_id || payload.id || crypto.randomUUID());

    // G-06: Validasi via guardSyncEnqueue sebelum queueing
    const isSafe = await guardSyncEnqueue(event.entity_type, docId, idempotency_key);
    if (!isSafe) return 0;

    return await db.transaction('rw', db.sync_events, async () => {
      const existing = await db.sync_events
        .where('idempotency_key')
        .equals(idempotency_key)
        .first();
      if (existing && typeof existing.id === 'number') return existing.id;

      const syncEvent: SyncEvent = {
        ...event,
        payload,
        status: 'PENDING',
        timestamp: Date.now(),
        idempotency_key,
      };
      const id = await db.sync_events.add(syncEvent);
      return typeof id === 'number' ? id : 0;
    });
  }

  /**
   * Menyembuhkan event yang stuck > 5 menit.
   * Event yang sudah > 5 kali healing dipindahkan ke DLQ.
   */
  async heal(): Promise<void> {
    const stuckEvents = await db.sync_events
      .where('status')
      .equals('PENDING')
      .and((e) => Date.now() - e.timestamp > 300_000)
      .toArray();

    for (const event of stuckEvents) {
      const currentHeals = event.retry_count || 0;
      if (currentHeals >= 5) {
        const eventToDlq = {
          ...event,
          status: 'FAILED',
          error_message: 'Max healing attempts reached',
        } as SyncEvent;
        if (eventToDlq.payload && typeof eventToDlq.payload.photoBeforeBase64 === 'string') {
          eventToDlq.payload.photoBeforeBase64 = '[TRIMMED_FOR_DLQ]';
        }
        await db.transaction('rw', db.sync_events, db.sync_dlq, async () => {
          await db.sync_dlq.add(eventToDlq);
          await db.sync_events.delete(event.id!);
        });
        logger.warn('[SyncQueueManager] Event dipindah ke DLQ', { id: event.id, type: event.entity_type });
      } else {
        await db.sync_events.update(event.id!, {
          status: 'PENDING',
          timestamp: Date.now(),
          retry_count: currentHeals + 1,
        });
      }
    }
  }

  /** Ambil event executable (PENDING dan belum melewati next_retry_time), maks 100 per siklus. */
  async getExecutableEvents(): Promise<SyncEvent[]> {
    const allEvents = await db.sync_events
      .where('status')
      .anyOf(['PENDING', 'FAILED'])
      .toArray();

    allEvents.sort((a, b) => a.timestamp - b.timestamp);
    const capped = allEvents.slice(0, 100);

    const now = Date.now();
    const blockedEntityIds = new Set<string>();
    const executable: SyncEvent[] = [];

    for (const event of capped) {
      const docId = event.payload?.client_txn_id
        ? String(event.payload.client_txn_id)
        : event.payload?.id
          ? String(event.payload.id)
          : String(event.id);
      const entityKey = `${event.entity_type}:${docId}`;

      if (blockedEntityIds.has(entityKey)) continue;

      const isFailed = event.status === 'FAILED';
      const isPendingWait = event.next_retry_time && event.next_retry_time > now;

      if (isFailed || isPendingWait) {
        blockedEntityIds.add(entityKey);
        continue;
      }

      executable.push(event);
    }

    return executable;
  }

  /** Tandai event sebagai SYNCED setelah berhasil dikirim ke cloud. */
  async markSynced(eventIds: number[]): Promise<void> {
    await db.transaction('rw', db.sync_events, async () => {
      for (const id of eventIds) {
        await db.sync_events.update(id, { status: 'SYNCED', retry_count: 0 });
      }
    });
  }

  /** Tandai event sebagai CONFLICT dan simpan server payload. */
  async markConflict(conflicts: { eventId: number; serverPayload: unknown }[]): Promise<void> {
    await db.transaction('rw', db.sync_events, async () => {
      for (const { eventId, serverPayload } of conflicts) {
        await db.sync_events.update(eventId, { status: 'CONFLICT', server_payload: serverPayload });
      }
    });
  }

  /** Tandai event FAILED dengan exponential backoff. Pindahkan ke DLQ jika melebihi MAX_RETRIES. */
  async markFailed(eventId: number, errorMessage: string, currentEvent?: SyncEvent): Promise<void> {
    const currentRetryCount = currentEvent?.retry_count || 0;
    const newRetryCount = currentRetryCount + 1;
    const MAX_RETRIES = 5;

    if (newRetryCount >= MAX_RETRIES) {
      const eventToDlq = { ...currentEvent, status: 'FAILED', error_message: errorMessage } as SyncEvent;
      if (eventToDlq.payload && typeof eventToDlq.payload.photoBeforeBase64 === 'string') {
        eventToDlq.payload.photoBeforeBase64 = '[TRIMMED_FOR_DLQ]';
      }
      await db.sync_dlq.add(eventToDlq);
      await db.sync_events.delete(eventId);
    } else {
      const nextRetryTime = Date.now() + Math.pow(2, newRetryCount) * 1000;
      await db.sync_events.update(eventId, { retry_count: newRetryCount, next_retry_time: nextRetryTime });
    }
  }
}

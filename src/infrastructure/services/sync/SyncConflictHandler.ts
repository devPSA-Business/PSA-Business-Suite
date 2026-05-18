/**
 * @ai_context Menangani deteksi dan resolusi konflik sinkronisasi antara data lokal dan server.
 * @security_tier HIGH
 * @business_rule Setiap keputusan resolusi konflik WAJIB dilog ke audit_logs.
 *                Resolusi SERVER akan menimpa data lokal — hanya boleh dipilih secara eksplisit oleh owner.
 */
import { db, SyncEvent } from '../../../shared/api/db';
import {
  firestoreDb,
  safeFirestoreCall,
} from '../../../shared/api/firebase';
import {
  collection,
  doc,
  getDoc,
} from 'firebase/firestore';
import { useAuthStore } from '../../../shared/store/authStore';
import { IUnitOfWork } from '../../../application/core/IUnitOfWork';
import { logger } from '../../../lib/logger';

export class SyncConflictHandler {
  /**
   * Pre-fetch dokumen server untuk event UPDATE agar bisa deteksi konflik versi.
   * Mengembalikan map eventId → serverData.
   */
  async prefetchServerDocs(
    events: SyncEvent[]
  ): Promise<Map<number, unknown>> {
    const updateEvents = events.filter(
      (e) =>
        (e.action === 'UPDATE' || e.action === 'UPDATE_DELTA') &&
        e.payload.version !== undefined
    );

    const serverDocsMap = new Map<number, unknown>();
    if (updateEvents.length === 0) return serverDocsMap;

    const fetchItems = updateEvents.map((event) => {
      const collectionRef = collection(firestoreDb, event.entity_type);
      const docId = event.payload?.client_txn_id
        ? String(event.payload.client_txn_id)
        : event.payload?.id
          ? String(event.payload.id)
          : String(event.id);
      return { eventId: event.id!, docRef: doc(collectionRef, docId) };
    });

    try {
      const fetchPromises = fetchItems.map((item) =>
        getDoc(item.docRef).then((snap) => ({ eventId: item.eventId, snap }))
      );
      const results = await Promise.allSettled(fetchPromises);
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.snap.exists()) {
          serverDocsMap.set(result.value.eventId, result.value.snap.data());
        }
      }
    } catch (err) {
      logger.warn('[SyncConflictHandler] Gagal prefetch server docs untuk conflict check', err);
    }

    return serverDocsMap;
  }

  /** Deteksi apakah event memiliki konflik versi berdasarkan data server yang sudah di-prefetch. */
  hasConflict(event: SyncEvent, serverData: unknown): boolean {
    if (
      (event.action === 'UPDATE' || event.action === 'UPDATE_DELTA') &&
      event.payload.version !== undefined
    ) {
      const sd = serverData as Record<string, unknown> | undefined;
      if (sd?.version && Number(sd.version) >= Number(event.payload.version)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resolusi konflik oleh owner: LOCAL (paksa versi lokal) atau SERVER (terima server).
   * Semua keputusan dilog ke audit trail.
   */
  async resolve(
    eventId: number,
    resolution: 'LOCAL' | 'SERVER',
    uow: IUnitOfWork
  ): Promise<void> {
    const event = await db.sync_events.get(eventId);
    if (!event) throw new Error('Sync event not found');

    const currentUser = useAuthStore.getState().user;
    const userIdentifier = currentUser?.name || 'SYSTEM';

    if (resolution === 'LOCAL') {
      await this._resolveLocal(event, eventId, userIdentifier, uow);
    } else {
      await this._resolveServer(event, eventId, userIdentifier, uow);
    }
  }

  private async _resolveLocal(
    event: SyncEvent,
    eventId: number,
    userIdentifier: string,
    uow: IUnitOfWork
  ): Promise<void> {
    const serverVersion = event.server_payload?.version
      ? Number(event.server_payload.version)
      : 0;
    const updatedPayload = { ...event.payload, version: serverVersion + 1 };

    await uow.execute(async () => {
      await db.sync_events.update(eventId, {
        status: 'PENDING',
        payload: updatedPayload,
        retry_count: 0,
        next_retry_time: 0,
        server_payload: undefined,
      });
      await uow.registerAudit(
        'RESOLVE_CONFLICT',
        userIdentifier,
        `Konflik ${event.entity_type} diselesaikan: versi LOKAL (ID: ${event.payload.id || event.payload.client_txn_id})`,
        {
          entityId: String(event.payload.id || event.payload.client_txn_id),
          payloadDiff: JSON.stringify({ resolution: 'LOCAL' }),
        }
      );
    }, ['sync_events', 'audit_logs']);
  }

  private async _resolveServer(
    event: SyncEvent,
    eventId: number,
    userIdentifier: string,
    uow: IUnitOfWork
  ): Promise<void> {
    const ALL_CONFLICT_TABLES = [
      'sync_events', 'stock', 'customers', 'repair_services', 'gold_buyback',
      'shifts', 'petty_cash', 'transactions', 'gold_liquidations',
      'custom_orders', 'appointments', 'financial_closures', 'audit_logs',
    ];

    await uow.execute(async () => {
      await db.sync_events.delete(eventId);

      if (event.server_payload && (event.payload.id || event.payload.client_txn_id)) {
        await safeFirestoreCall(async () => {
          await this._applyServerPayloadLocally(event);
        });
      }

      await uow.registerAudit(
        'RESOLVE_CONFLICT',
        userIdentifier,
        `Konflik ${event.entity_type} diselesaikan: versi SERVER (ID: ${event.payload.id || event.payload.client_txn_id})`,
        {
          entityId: String(event.payload.id || event.payload.client_txn_id),
          payloadDiff: JSON.stringify({ resolution: 'SERVER' }),
        }
      );
    }, ALL_CONFLICT_TABLES);
  }

  private async _applyServerPayloadLocally(event: SyncEvent): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = event.server_payload as any;
    switch (event.entity_type) {
      case 'stock':               await db.stock.put(payload); break;
      case 'customers':           await db.customers.put(payload); break;
      case 'repair_services':     await db.repair_services.put(payload); break;
      case 'gold_buyback':        await db.gold_buyback.put(payload); break;
      case 'shifts':              await db.shifts.put(payload); break;
      case 'petty_cash':          await db.petty_cash.put(payload); break;
      case 'transactions':        await db.transactions.put(payload); break;
      case 'gold_liquidations':   await db.gold_liquidations.put(payload); break;
      case 'custom_orders':       await db.custom_orders.put(payload); break;
      case 'appointments':        await db.appointments.put(payload); break;
      case 'financial_closures':  await db.financial_closures.put(payload); break;
      default:
        logger.error(`[SyncConflictHandler] unhandled entity_type "${event.entity_type}"`);
        await db.sync_dlq.add({
          ...event,
          status: 'FAILED',
          error_message: `unhandled_conflict_entity: ${event.entity_type}`,
        });
    }
  }
}

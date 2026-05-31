/**
 * @ai_context Menangani deteksi dan resolusi konflik sinkronisasi antara data lokal dan server.
 * @security_tier HIGH
 * @business_rule Setiap keputusan resolusi konflik WAJIB dilog ke audit_logs.
 *                Resolusi SERVER akan menimpa data lokal — hanya boleh dipilih secara eksplisit oleh owner.
 * @data-component-id: sync-conflict-handler
 * @data-error-domain: sync
 * @changelog:
 *   2026-05-20 — P2: Map permission-denied (stok negatif/CRDT reject) → sync_dlq dengan status CONFLICT
 *                    Mencegah retry loop pada operasi yang sah ditolak oleh Firestore rules
 */
import { db, SyncEvent, StockItem, Customer, RepairService, GoldBuyback, Shift, PettyCash, Transaction, GoldLiquidation, CustomOrder, Appointment, FinancialClosure } from '../../../shared/api/db';

/**
 * Union type dari semua entitas yang bisa ada di server_payload conflict resolution.
 * Digunakan untuk menghilangkan `as any` pada _applyServerPayloadLocally.
 * Di-export agar tersedia untuk test dan tipe eksplisit di SyncUploaderService.
 */
export type ConflictPayload =
  | StockItem
  | Customer
  | RepairService
  | GoldBuyback
  | Shift
  | PettyCash
  | Transaction
  | GoldLiquidation
  | CustomOrder
  | Appointment
  | FinancialClosure;
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

/** Kode error Firestore yang dikenali sebagai konflik terstruktur, bukan failure sementara */
const CONFLICT_ERROR_CODES = new Set([
  'permission-denied',      // Firestore rules reject: stok negatif, CRDT version stale, dll
  'failed-precondition',    // Kondisi prasyarat tidak terpenuhi (misalnya document state invalid)
  'already-exists',         // Idempotency key collision (duplikat event)
]);

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
   * P2 Remediation: Klasifikasi error Firestore — apakah ini konflik struktural atau kegagalan sementara.
   *
   * Konflik struktural (CONFLICT): permission-denied, failed-precondition, already-exists
   * → Tidak perlu retry → masuk DLQ dengan status CONFLICT
   *
   * Kegagalan sementara: network error, unavailable, deadline-exceeded
   * → Boleh retry dengan exponential backoff
   *
   * @param error - Error yang ditangkap dari operasi Firestore
   * @returns 'conflict' | 'transient' | 'unknown'
   */
  classifyFirestoreError(error: unknown): 'conflict' | 'transient' | 'unknown' {
    if (error instanceof Error) {
      // Firebase error code format: "FirebaseError: [code/message]" atau error.code property
      const firebaseError = error as Error & { code?: string };
      const code = firebaseError.code ?? '';

      // Ekstrak kode dari message jika tidak ada property code
      const messageCode = error.message.match(/\(([^)]+)\)/)?.[1] ?? '';
      const effectiveCode = code || messageCode;

      if (CONFLICT_ERROR_CODES.has(effectiveCode)) {
        return 'conflict';
      }

      // Kegagalan sementara yang layak di-retry
      const transientCodes = new Set(['unavailable', 'deadline-exceeded', 'internal', 'cancelled']);
      if (transientCodes.has(effectiveCode)) {
        return 'transient';
      }
    }
    return 'unknown';
  }

  /**
   * P2 Remediation: Pindahkan event ke Dead Letter Queue (DLQ) saat Firestore menolak
   * dengan error permission-denied (stok negatif / CRDT version reject).
   *
   * Event di DLQ TIDAK akan di-retry otomatis. Owner harus manual review di ConflictResolutionPage.
   *
   * @param event - SyncEvent yang gagal
   * @param error - Error dari Firestore
   * @param reason - Penjelasan singkat untuk audit log
   */
  async moveToDeadLetterQueue(
    event: SyncEvent,
    error: unknown,
    reason: string = 'permission-denied'
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const dlqEntry: SyncEvent = {
      ...event,
      status: 'CONFLICT',
      error_message: `[DLQ:${reason}] ${errorMessage}`,
      retry_count: (event.retry_count ?? 0) + 1,
      // Tandai waktu masuk DLQ untuk audit trail
      next_retry_time: 0,
    };

    try {
      await db.sync_dlq.add(dlqEntry);
      logger.warn(
        `[SyncConflictHandler] Event ${event.id} (${event.entity_type}/${event.action}) dipindahkan ke DLQ.`,
        {
          eventId: event.id,
          entityType: event.entity_type,
          reason,
          errorMessage: errorMessage.slice(0, 200), // truncate untuk mencegah log bloat
        }
      );
    } catch (dlqErr) {
      // Jangan throw — kegagalan DLQ tidak boleh crash sync loop
      logger.error('[SyncConflictHandler] CRITICAL: Gagal menulis ke sync_dlq', {
        originalEventId: event.id,
        dlqError: dlqErr instanceof Error ? dlqErr.message : String(dlqErr),
      });
    }

    // Hapus dari antrian utama agar tidak di-retry
    try {
      if (event.id) {
        await db.sync_events.delete(event.id);
      }
    } catch (deleteErr) {
      logger.error('[SyncConflictHandler] Gagal hapus event dari sync_events setelah DLQ', {
        eventId: event.id,
        deleteError: deleteErr instanceof Error ? deleteErr.message : String(deleteErr),
      });
    }
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
    // server_payload diverifikasi shape-nya secara runtime oleh entity_type di switch di bawah
    // Double-cast (unknown → specific type) adalah idiom TS yang aman karena entity_type menjamin struktur
    const payload = event.server_payload as unknown;
    switch (event.entity_type) {
      case 'stock':               await db.stock.put(payload as unknown as StockItem); break;
      case 'customers':           await db.customers.put(payload as unknown as Customer); break;
      case 'repair_services':     await db.repair_services.put(payload as unknown as RepairService); break;
      case 'gold_buyback':        await db.gold_buyback.put(payload as unknown as GoldBuyback); break;
      case 'shifts':              await db.shifts.put(payload as unknown as Shift); break;
      case 'petty_cash':          await db.petty_cash.put(payload as unknown as PettyCash); break;
      case 'transactions':        await db.transactions.put(payload as unknown as Transaction); break;
      case 'gold_liquidations':   await db.gold_liquidations.put(payload as unknown as GoldLiquidation); break;
      case 'custom_orders':       await db.custom_orders.put(payload as unknown as CustomOrder); break;
      case 'appointments':        await db.appointments.put(payload as unknown as Appointment); break;
      case 'financial_closures':  await db.financial_closures.put(payload as unknown as FinancialClosure); break;
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

import { ISyncService } from '../../application/services/ISyncService';
import { db, SyncEvent } from '../../shared/api/db';
import { firestoreDb, safeFirestoreCall, isConfigValid } from '../../shared/api/firebase';
import { writeBatch, doc, collection, increment, updateDoc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '../../shared/store/authStore';
import { logger } from '../../lib/logger';
import { IUnitOfWork } from '../../application/core/IUnitOfWork';

import { guardSyncEnqueue } from '../../shared/utils/syncGuard';

/**
 * @ai_context Sistem penjaminan sampainya data Offline ke Cloud (Firebase Firestore).
 * @security_tier HIGH
 * @business_rule Jangan ubah arsitektur Queue dan Interval. Ini di setting 10 Detik 
 * berdasar keputusan mitigasi data-loss. Dilarang menambah fungsi direct-write ke Firebase dari luar service ini!
 */
export class SyncServiceImpl implements ISyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncAt: number | null = null;
  private consecutiveFailures = 0;

  async enqueueSync(event: Omit<SyncEvent, 'id' | 'status' | 'timestamp'>): Promise<number> {
    // F2 Prep: Inject branchId from the current user session
    const branchId = useAuthStore.getState().user?.branchId || 'HQ';
    const payload = { ...event.payload };
    if (!payload.branchId) {
      payload.branchId = branchId;
    }

    const idempotency_key = event.idempotency_key || crypto.randomUUID();
    const docId = String(payload.client_txn_id || payload.id || crypto.randomUUID());
    
    // G-06: Validasi via guardSyncEnqueue sebelum queueing
    const isSafe = await guardSyncEnqueue(event.entity_type, docId, idempotency_key);
    if (!isSafe) {
      return 0; // Ditolak karena duplikat
    }

    return await db.transaction('rw', db.sync_events, async () => {
      // Phase 1.1 Hotfix/Optimization: Use indexed query
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
        idempotency_key
      };
      const id = await db.sync_events.add(syncEvent);
      return typeof id === 'number' ? id : 0;
    });
  }

  async healSyncQueue() {
    const stuckEvents = await db.sync_events
      .where('status').equals('PENDING')
      .and(e => Date.now() - e.timestamp > 300000) // Stuck for > 5 min
      .toArray();
      
    for (const event of stuckEvents) {
      const currentHeals = event.retry_count || 0;
      if (currentHeals >= 5) {
          const eventToDlq = { ...event, status: 'FAILED', error_message: 'Max healing attempts reached' } as SyncEvent;
          if (eventToDlq.payload && typeof eventToDlq.payload.photoBeforeBase64 === 'string') {
             eventToDlq.payload.photoBeforeBase64 = '[TRIMMED_FOR_DLQ]';
          }
          await db.transaction('rw', db.sync_events, db.sync_dlq, async () => {
             await db.sync_dlq.add(eventToDlq);
             await db.sync_events.delete(event.id!);
          });
      } else {
          await db.sync_events.update(event.id!, { status: 'PENDING', timestamp: Date.now(), retry_count: currentHeals + 1 });
      }
    }
  }

  private async checkRealConnectivity(): Promise<boolean> {
    if (!navigator.onLine) return false;
    try {
      // Validate with a lightweight HEAD request to Firestore
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch('https://firestore.googleapis.com/', { 
        method: 'HEAD', 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  }

  async processSyncQueue(): Promise<void> {
    if (!navigator.onLine || !isConfigValid) return;

    const isReallyOnline = await this.checkRealConnectivity();
    if (!isReallyOnline) {
      logger.warn('[SyncService] Device appears online but cannot reach Firestore. Aborting sync.');
      return;
    }
    logger.info('[SyncService] Proceeding with sync as real connectivity confirmed.');

    try {
      await navigator.locks.request('psa-sync-lock', { ifAvailable: true }, async (lock) => {
        if (lock === null) {
          // Lock is held by another tab, skip sync
          return;
        }

        const allPendingEvents = await db.sync_events
          .where('status')
          .anyOf(['PENDING', 'FAILED'])
          .sortBy('timestamp');

        const now = Date.now();
        // Check for blocked entity IDs
        const blockedEntityIds = new Set<string>();
        const executableEvents: SyncEvent[] = [];

        for (const event of allPendingEvents) {
          const docId = event.payload?.client_txn_id 
              ? String(event.payload.client_txn_id) 
              : event.payload?.id 
                ? String(event.payload.id) 
                : String(event.id);
          const entityKey = `${event.entity_type}:${docId}`;

          if (blockedEntityIds.has(entityKey)) {
             continue; // Skip because a prior event for this entity is blocked
          }

          const isFailed = event.status === 'FAILED';
          const isPendingWait = event.next_retry_time && event.next_retry_time > now;

          if (isFailed || isPendingWait) {
             // This event cannot be executed now, so it blocks subsequent events for the same entity
             blockedEntityIds.add(entityKey);
             continue;
          }

          executableEvents.push(event);
        }

        if (executableEvents.length === 0) return;

        const CHUNK_SIZE = 200;
        const chunks = [];
        for (let i = 0; i < executableEvents.length; i += CHUNK_SIZE) {
          chunks.push(executableEvents.slice(i, i + CHUNK_SIZE));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(firestoreDb);
          const individualOperations: { eventId: number; operation: () => Promise<void> }[] = [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const conflictEvents: { eventId: number; serverPayload: any }[] = [];

          // Pre-fetch server documents for conflict checking (Fixing N+1 Query Problem)
          const docsToFetch = chunk
            .filter(event => (event.action === 'UPDATE' || event.action === 'UPDATE_DELTA') && event.payload.version !== undefined)
            .map(event => {
              const collectionRef = collection(firestoreDb, event.entity_type);
              const docId = event.payload?.client_txn_id 
                ? String(event.payload.client_txn_id) 
                : event.payload?.id 
                  ? String(event.payload.id) 
                  : String(event.id);
              return { eventId: event.id!, docRef: doc(collectionRef, docId) };
            });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const serverDocsMap = new Map<number, any>();
          if (docsToFetch.length > 0) {
            try {
              const fetchPromises = docsToFetch.map(item => getDoc(item.docRef).then(docSnap => ({ eventId: item.eventId, docSnap })));
              const results = await Promise.allSettled(fetchPromises);
              for (const result of results) {
                if (result.status === 'fulfilled' && result.value.docSnap.exists()) {
                  serverDocsMap.set(result.value.eventId, result.value.docSnap.data());
                }
              }
            } catch (fetchErr) {
              logger.warn('[SyncService] Failed batched pre-fetch for conflict check', fetchErr);
            }
          }

          for (const event of chunk) {
            if (!event.id) continue;

            const collectionRef = collection(firestoreDb, event.entity_type);
            const docId = event.payload?.client_txn_id 
              ? String(event.payload.client_txn_id) 
              : event.payload?.id 
                ? String(event.payload.id) 
                : String(event.id);
            const docRef = doc(collectionRef, docId);

            // Fast conflict detection logic (Using pre-fetched data)
            if ((event.action === 'UPDATE' || event.action === 'UPDATE_DELTA') && event.payload.version !== undefined) {
              const serverData = serverDocsMap.get(event.id);
              if (serverData && serverData.version && serverData.version >= Number(event.payload.version)) {
                // Conflict detected!
                conflictEvents.push({ eventId: event.id, serverPayload: serverData });
                continue; // Skip adding to batch
              }
            }

            if (event.action === 'UPDATE_DELTA' && event.payload.delta_field && event.payload.delta_value !== undefined) {
              const change = Number(event.payload.delta_value);
              const field = String(event.payload.delta_field);
              if (!isNaN(change)) {
                // Ensure delta operations merge other keys (like price, cost, version)
                const updateData = { ...event.payload };
                delete updateData.delta_field;
                delete updateData.delta_value;
                updateData[field] = increment(change);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                batch.update(docRef, updateData as any);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                individualOperations.push({ eventId: event.id, operation: async () => { await updateDoc(docRef, updateData as any); } });
              }
            } else if (event.entity_type === 'stock' && event.action === 'UPDATE' && event.payload.quantityChange !== undefined) {
              // Backward compatibility for existing queued events + Ensure HPP and Price sync
              const change = Number(event.payload.quantityChange);
              if (!isNaN(change)) {
                const updateData = { ...event.payload };
                delete updateData.quantityChange;
                updateData.quantity = increment(change);
                
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                batch.update(docRef, updateData as any);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                individualOperations.push({ eventId: event.id, operation: async () => { await updateDoc(docRef, updateData as any); } });
              }
            } else if (event.action === 'INSERT' || event.action === 'UPDATE') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const stripUndefined = (obj: any) => JSON.parse(JSON.stringify(obj));
              const safePayload = stripUndefined(event.payload);

              // Offload Base64 images to Firebase Storage to avoid 10MB Firestore limit
              if (event.entity_type === 'repair_services' && safePayload.photoBeforeBase64) {
                try {
                  const { storage } = await import('../../shared/api/firebase');
                  const { ref, uploadString, getDownloadURL } = await import('firebase/storage');
                  
                  if (!storage) {
                    throw new Error('Firebase Storage not initialized');
                  }

                  const base64Data = safePayload.photoBeforeBase64.includes(',') 
                    ? safePayload.photoBeforeBase64.split(',')[1] 
                    : safePayload.photoBeforeBase64;
                  
                  // F-16: Tambahkan validasi ukuran base64 di sisi service
                  if (base64Data.length > 3000000) {
                    throw new Error('Ukuran foto terlalu besar (> 2MB).');
                  }
                  
                  const imageRef = ref(storage, `repairs/${docId}_before_${Date.now()}.jpg`);
                  await uploadString(imageRef, base64Data, 'base64');
                  const downloadUrl = await getDownloadURL(imageRef);
                  
                  safePayload.photoBeforeUrl = downloadUrl;
                  delete safePayload.photoBeforeBase64;
                } catch (imgError) {
                  logger.error('[SyncService] Failed to upload repair image to storage', imgError);
                  // FIX: Jangan throw error. Tandai event ini FAILED, dan lanjutkan loop ke event berikutnya.
                  await db.sync_events.update(event.id, { 
                    status: 'FAILED', 
                    error_message: 'Gagal upload foto: ' + ((imgError instanceof Error ? imgError.message : String(imgError)) || 'Timeout'),
                    next_retry_time: Date.now() + 60000 
                  });
                  continue; // Skip adding this document to the Firestore batch, let others proceed
                }
              }

              batch.set(docRef, safePayload, { merge: true });
              individualOperations.push({ eventId: event.id, operation: async () => { await setDoc(docRef, safePayload, { merge: true }); } });
            } else if (event.action === 'DELETE') {
              batch.delete(docRef);
              individualOperations.push({ eventId: event.id, operation: async () => { await deleteDoc(docRef); } });
            }
          }

          // Update conflict events in DB
          if (conflictEvents.length > 0) {
            await db.transaction('rw', db.sync_events, async () => {
              for (const conflict of conflictEvents) {
                await db.sync_events.update(conflict.eventId, { 
                  status: 'CONFLICT', 
                  server_payload: conflict.serverPayload 
                });
              }
            });
          }

          if (individualOperations.length === 0) continue; // Nothing to commit in this chunk

          await new Promise((resolve) => setTimeout(resolve, 50));

          try {
            await safeFirestoreCall(async () => { await batch.commit(); });
            
            // SEC/SYNC-01: Set to SYNCED AFTER successful commit to prevent data loss on crash
            await db.transaction('rw', db.sync_events, async () => {
              for (const op of individualOperations) {
                await db.sync_events.update(op.eventId, { status: 'SYNCED', retry_count: 0 });
              }
            });
          } catch (error) {
            logger.warn('[SyncService] Batch commit failed. Falling back to individual writes.', error);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errCode = (error as any)?.code;
            if (errCode === 'unauthenticated' || errCode === 'permission-denied') {
              this.handleAuthError();
              return;
            }

            const results = await Promise.allSettled(
              individualOperations.map(op => safeFirestoreCall(op.operation))
            );

            await db.transaction('rw', db.sync_events, async () => {
              for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const eventId = individualOperations[i].eventId;
                
                if (result.status === 'fulfilled') {
                  await db.sync_events.update(eventId, { status: 'SYNCED', retry_count: 0 });
                } else {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const errorObj = result.reason as any;
                  const errorMessage = errorObj instanceof Error ? errorObj.message : String(errorObj);
                  
                  if (errorObj?.code === 'unauthenticated' || errorObj?.code === 'permission-denied' || errorMessage.includes('401')) {
                    this.handleAuthError();
                    await db.sync_events.update(eventId, { next_retry_time: Date.now() + 60000 });
                    continue;
                  }

                  const event = chunk.find(e => e.id === eventId);
                  const currentRetryCount = event?.retry_count || 0;
                  const newRetryCount = currentRetryCount + 1;
                  const nextRetryTime = Date.now() + Math.pow(2, newRetryCount) * 1000;
                  
                  const MAX_RETRIES = 5;
                  
                  if (newRetryCount >= MAX_RETRIES) {
                    const eventToDlq = { ...event, status: 'FAILED', error_message: errorMessage } as SyncEvent;
                    // Phase 1.3: Prevent DLQ Bloat by trimming large base64 strings
                    if (eventToDlq.payload && typeof eventToDlq.payload.photoBeforeBase64 === 'string') {
                       eventToDlq.payload.photoBeforeBase64 = '[TRIMMED_FOR_DLQ]';
                    }
                    await db.sync_dlq.add(eventToDlq);
                    await db.sync_events.delete(eventId);
                  } else {
                    await db.sync_events.update(eventId, { retry_count: newRetryCount, next_retry_time: nextRetryTime });
                  }
                }
              }
            });
          }
        }
      });
    } catch (error) {
      logger.error('[SyncService] Failed to process sync queue.', error);
    }
  }

  async resolveConflict(eventId: number, resolution: 'LOCAL' | 'SERVER', uow: IUnitOfWork): Promise<void> {
    const event = await db.sync_events.get(eventId);
    if (!event) throw new Error('Sync event not found');

    const currentUser = useAuthStore.getState().user;
    const userIdentifier = currentUser?.name || 'SYSTEM';

    if (resolution === 'LOCAL') {
      // Force local update by incrementing version
      const serverVersion = event.server_payload?.version ? Number(event.server_payload.version) : 0;
      const updatedPayload = {
        ...event.payload,
        version: serverVersion + 1
      };

      await uow.execute(async () => {
        await db.sync_events.update(eventId, {
          status: 'PENDING',
          payload: updatedPayload,
          retry_count: 0,
          next_retry_time: 0,
          server_payload: undefined
        });

        await uow.registerAudit(
          'RESOLVE_CONFLICT',
          userIdentifier,
          `Konflik sinkronisasi pada ${event.entity_type} diselesaikan: Memaksa versi LOKAL (ID: ${event.payload.id || event.payload.client_txn_id})`,
          { entityId: String(event.payload.id || event.payload.client_txn_id), payloadDiff: JSON.stringify({ resolution: 'LOCAL' }) }
        );
      }, ['sync_events', 'audit_logs']);
      
      // Trigger sync
      this.processSyncQueue();
    } else {
      // Accept server changes (F6: Expanded to all relevant tables)
      const ALL_CONFLICT_TABLES = [
        'sync_events', 
        'stock', 
        'customers', 
        'repair_services',
        'gold_buyback',
        'shifts',
        'petty_cash',
        'transactions',
        'gold_liquidations',
        'custom_orders',
        'appointments',
        'audit_logs'
      ];

      await uow.execute(async () => {
        await db.sync_events.delete(eventId);
        
        if (event.server_payload && (event.payload.id || event.payload.client_txn_id)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const payload = event.server_payload as any;
          
          switch (event.entity_type) {
            case 'stock':
              await db.stock.put(payload);
              break;
            case 'customers':
              await db.customers.put(payload);
              break;
            case 'repair_services':
              await db.repair_services.put(payload);
              break;
            case 'gold_buyback':
              await db.gold_buyback.put(payload);
              break;
            case 'shifts':
              await db.shifts.put(payload);
              break;
            case 'petty_cash':
              await db.petty_cash.put(payload);
              break;
            case 'transactions':
              await db.transactions.put(payload);
              break;
            case 'gold_liquidations':
              await db.gold_liquidations.put(payload);
              break;
            case 'custom_orders':
              await db.custom_orders.put(payload);
              break;
            case 'appointments':
              await db.appointments.put(payload);
              break;
            default:
              logger.error(`[SyncService] resolveConflict: unhandled entity_type "${event.entity_type}"`);
              await db.sync_dlq.add({
                ...event,
                status: 'FAILED',
                error_message: `unhandled_conflict_entity: ${event.entity_type}`
              });
          }
        }

        await uow.registerAudit(
          'RESOLVE_CONFLICT',
          userIdentifier,
          `Konflik sinkronisasi pada ${event.entity_type} diselesaikan: Menerima versi SERVER (ID: ${event.payload.id || event.payload.client_txn_id})`,
          { entityId: String(event.payload.id || event.payload.client_txn_id), payloadDiff: JSON.stringify({ resolution: 'SERVER' }) }
        );
      }, ALL_CONFLICT_TABLES);
    }
  }

  private handleAuthError(): void {
    logger.error('[SyncService] Authentication error detected. Pausing sync.');
    this.stopAutoSync();
    window.dispatchEvent(new CustomEvent('psa:auth-error', { detail: { message: 'Sesi Habis, Silakan Login Ulang untuk Menyinkronkan Data' } }));
  }

  private handleOnline = () => {
    logger.info('[SyncService] Device is online, triggering sync...');
    this.processSyncQueue().catch(e => logger.error('[SyncService] Sync catch-all', e));
  };

  private emitSyncStatus(detail: { ok: boolean; lastSyncAt?: number; failures?: number }): void {
    window.dispatchEvent(new CustomEvent('psa:sync-status', { detail }));
  }

  startAutoSync(): void {
    // F3: Improved auto-sync start logic
    // 1. Immediate sync attempt on activation
    this.processSyncQueue().then(() => {
        this.lastSyncAt = Date.now();
        this.emitSyncStatus({ ok: true, lastSyncAt: this.lastSyncAt });
    }).catch(err => 
      logger.error('[SyncService] Initial sync failed', err)
    );
    
    // 2. Periodic sync every 15 minutes (cost-efficient heartbeat)
    this.syncInterval = setInterval(async () => {
      try {
        await this.processSyncQueue();
        this.lastSyncAt = Date.now();
        this.consecutiveFailures = 0;
        this.emitSyncStatus({ ok: true, lastSyncAt: this.lastSyncAt });
      } catch (err) {
        logger.error('[SyncService] Periodic sync failed', err);
        this.consecutiveFailures++;
        this.emitSyncStatus({ ok: false, failures: this.consecutiveFailures });
      }
    }, 15 * 60 * 1000);

    // 3. Register browser online listener
    window.addEventListener('online', this.handleOnline);
  }

  stopAutoSync(): void {
    window.removeEventListener('online', this.handleOnline);
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

/**
 * @ai_context Menangani upload batch event ke Firestore dengan retry exponential dan DLQ fallback.
 * @security_tier HIGH
 * @business_rule Semua write ke Firestore WAJIB melalui service ini, bukan dari UI langsung.
 *                Foto Base64 > 2MB wajib diupload ke Firebase Storage sebelum di-set ke Firestore.
 */
import { db, SyncEvent } from '../../../shared/api/db';
import {
  firestoreDb,
  safeFirestoreCall,
} from '../../../shared/api/firebase';
import {
  writeBatch,
  doc,
  collection,
  increment,
  updateDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { logger } from '../../../lib/logger';
import { SyncQueueManager } from './SyncQueueManager';
import { SyncConflictHandler } from './SyncConflictHandler';

const CHUNK_SIZE = 50;

export class SyncUploaderService {
  constructor(
    private readonly queueManager: SyncQueueManager,
    private readonly conflictHandler: SyncConflictHandler,
    private readonly onAuthError: () => void
  ) {}

  /** Upload semua executable events ke Firestore dalam chunks. */
  async upload(events: SyncEvent[]): Promise<void> {
    const chunks: SyncEvent[][] = [];
    for (let i = 0; i < events.length; i += CHUNK_SIZE) {
      chunks.push(events.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      await this._processChunk(chunk);
    }
  }

  private async _processChunk(chunk: SyncEvent[]): Promise<void> {
    // Pre-fetch server docs untuk conflict detection (solusi N+1 problem)
    const serverDocsMap = await this.conflictHandler.prefetchServerDocs(chunk);

    const batch = writeBatch(firestoreDb);
    const individualOps: { eventId: number; op: () => Promise<void> }[] = [];
    const conflictEvents: { eventId: number; serverPayload: unknown }[] = [];

    for (const event of chunk) {
      if (!event.id) continue;

      const collectionRef = collection(firestoreDb, event.entity_type);
      const docId = event.payload?.client_txn_id
        ? String(event.payload.client_txn_id)
        : event.payload?.id
          ? String(event.payload.id)
          : String(event.id);
      const docRef = doc(collectionRef, docId);

      // Conflict detection
      if (event.id && serverDocsMap.has(event.id)) {
        const serverData = serverDocsMap.get(event.id);
        if (this.conflictHandler.hasConflict(event, serverData)) {
          conflictEvents.push({ eventId: event.id, serverPayload: serverData });
          continue;
        }
      }

      // Foto Base64 → Firebase Storage (repair images)
      if (event.entity_type === 'repair_services' && event.payload.photoBeforeBase64) {
        const uploaded = await this._uploadRepairPhoto(event);
        if (!uploaded) continue; // event sudah ditandai FAILED, skip batch
      }

      this._addToBatch(batch, individualOps, event, docRef);
    }

    // Simpan conflict events
    if (conflictEvents.length > 0) {
      await this.queueManager.markConflict(conflictEvents);
    }

    if (individualOps.length === 0) return;

    // Jeda kecil agar GC bisa berjalan sebelum commit
    await new Promise((r) => setTimeout(r, 50));

    await this._commitBatch(batch, individualOps, chunk);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _addToBatch(batch: any, individualOps: { eventId: number; op: () => Promise<void> }[], event: SyncEvent, docRef: any): void {
    const eventId = event.id!;

    if (event.action === 'UPDATE_DELTA' && event.payload.delta_field && event.payload.delta_value !== undefined) {
      const change = Number(event.payload.delta_value);
      const field = String(event.payload.delta_field);
      if (!isNaN(change)) {
        const updateData = { ...event.payload };
        delete updateData.delta_field;
        delete updateData.delta_value;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (updateData as any)[field] = increment(change);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        batch.update(docRef, updateData as any);
        individualOps.push({ eventId, op: async () => { await updateDoc(docRef, updateData as any); } }); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    } else if (event.entity_type === 'stock' && event.action === 'UPDATE' && event.payload.quantityChange !== undefined) {
      // Backward compatibility untuk event stock lama
      const change = Number(event.payload.quantityChange);
      if (!isNaN(change)) {
        const updateData = { ...event.payload };
        delete updateData.quantityChange;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (updateData as any).quantity = increment(change);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        batch.update(docRef, updateData as any);
        individualOps.push({ eventId, op: async () => { await updateDoc(docRef, updateData as any); } }); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    } else if (event.action === 'INSERT' || event.action === 'UPDATE') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stripUndefined = (obj: any) => JSON.parse(JSON.stringify(obj));
      const safePayload = stripUndefined(event.payload);
      batch.set(docRef, safePayload, { merge: true });
      individualOps.push({ eventId, op: async () => { await setDoc(docRef, safePayload, { merge: true }); } });
    } else if (event.action === 'DELETE') {
      batch.delete(docRef);
      individualOps.push({ eventId, op: async () => { await deleteDoc(docRef); } });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _commitBatch(batch: any, individualOps: { eventId: number; op: () => Promise<void> }[], chunk: SyncEvent[]): Promise<void> {
    try {
      await safeFirestoreCall(async () => { await batch.commit(); });
      await this.queueManager.markSynced(individualOps.map((o) => o.eventId));
    } catch (error) {
      logger.warn('[SyncUploaderService] Batch commit gagal, fallback ke individual writes.', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errCode = (error as any)?.code;
      if (errCode === 'unauthenticated' || errCode === 'permission-denied') {
        this.onAuthError();
        return;
      }
      await this._fallbackIndividualWrites(individualOps, chunk);
    }
  }

  private async _fallbackIndividualWrites(
    individualOps: { eventId: number; op: () => Promise<void> }[],
    chunk: SyncEvent[]
  ): Promise<void> {
    const results = await Promise.allSettled(
      individualOps.map((o) => safeFirestoreCall(o.op))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const eventId = individualOps[i].eventId;

      if (result.status === 'fulfilled') {
        await this.queueManager.markSynced([eventId]);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorObj = result.reason as any;
        const errorMessage = errorObj instanceof Error ? errorObj.message : String(errorObj);

        if (errorObj?.code === 'unauthenticated' || errorObj?.code === 'permission-denied') {
          this.onAuthError();
          return;
        }

        const currentEvent = chunk.find((e) => e.id === eventId);
        await this.queueManager.markFailed(eventId, errorMessage, currentEvent);
      }
    }
  }

  /** Upload foto Base64 ke Firebase Storage; update payload event in-place. Returns true jika sukses. */
  private async _uploadRepairPhoto(event: SyncEvent): Promise<boolean> {
    try {
      const { storage } = await import('../../../shared/api/firebase');
      const { ref, uploadString, getDownloadURL } = await import('firebase/storage');

      if (!storage) throw new Error('Firebase Storage not initialized');

      const raw = event.payload.photoBeforeBase64 as string;
      const base64Data = raw.includes(',') ? raw.split(',')[1] : raw;

      // F-16: Validasi ukuran base64
      if (base64Data.length > 3_000_000) {
        throw new Error('Ukuran foto terlalu besar (> 2MB).');
      }

      const docId = event.payload?.client_txn_id
        ? String(event.payload.client_txn_id)
        : event.payload?.id
          ? String(event.payload.id)
          : String(event.id);
      const imageRef = ref(storage, `repairs/${docId}_before_${Date.now()}.jpg`);
      await uploadString(imageRef, base64Data, 'base64');
      const downloadUrl = await getDownloadURL(imageRef);

      event.payload.photoBeforeUrl = downloadUrl;
      delete event.payload.photoBeforeBase64;
      return true;
    } catch (imgError) {
      logger.error('[SyncUploaderService] Gagal upload foto reparasi', imgError);
      await db.sync_events.update(event.id!, {
        status: 'FAILED',
        error_message: 'Gagal upload foto: ' + (imgError instanceof Error ? imgError.message : String(imgError)),
        next_retry_time: Date.now() + 60_000,
      });
      return false;
    }
  }
}

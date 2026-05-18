/**
 * @ai_context Orchestrator tipis untuk sinkronisasi offline → cloud.
 *             Semua logika detail didelegasikan ke sub-services di folder ./sync/
 * @security_tier HIGH
 * @business_rule Jangan tambah logika bisnis di sini. Ini hanya koordinator.
 *                Interval sync 15 menit dipilih untuk keseimbangan antara
 *                konsistensi data dan efisiensi biaya Firestore free tier.
 */
import { ISyncService } from '../../application/services/ISyncService';
import { isConfigValid } from '../../shared/api/firebase';
import { IUnitOfWork } from '../../application/core/IUnitOfWork';
import { logger } from '../../lib/logger';
import { SyncQueueManager } from './sync/SyncQueueManager';
import { SyncConnectivityChecker } from './sync/SyncConnectivityChecker';
import { SyncUploaderService } from './sync/SyncUploaderService';
import { SyncConflictHandler } from './sync/SyncConflictHandler';
import { SyncEvent } from '../../shared/api/db';

export class SyncServiceImpl implements ISyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncAt: number | null = null;
  private consecutiveFailures = 0;

  private readonly queueManager = new SyncQueueManager();
  private readonly connectivityChecker = new SyncConnectivityChecker();
  private readonly conflictHandler = new SyncConflictHandler();
  private readonly uploaderService = new SyncUploaderService(
    this.queueManager,
    this.conflictHandler,
    () => this.handleAuthError()
  );

  async enqueueSync(event: Omit<SyncEvent, 'id' | 'status' | 'timestamp'>): Promise<number> {
    return this.queueManager.enqueue(event);
  }

  async healSyncQueue(): Promise<void> {
    return this.queueManager.heal();
  }

  async processSyncQueue(): Promise<void> {
    if (!navigator.onLine || !isConfigValid) return;

    const isReachable = await this.connectivityChecker.isFirestoreReachable();
    if (!isReachable) {
      logger.warn('[SyncService] Firestore tidak terjangkau. Sync dibatalkan.');
      return;
    }

    try {
      await navigator.locks.request('psa-sync-lock', { ifAvailable: true }, async (lock) => {
        if (lock === null) return;

        const events = await this.queueManager.getExecutableEvents();
        if (events.length === 0) return;

        await this.uploaderService.upload(events);
      });
    } catch (error) {
      logger.error('[SyncService] Gagal memproses sync queue.', error);
    }
  }

  async resolveConflict(eventId: number, resolution: 'LOCAL' | 'SERVER', uow: IUnitOfWork): Promise<void> {
    await this.conflictHandler.resolve(eventId, resolution, uow);
    if (resolution === 'LOCAL') this.processSyncQueue();
  }

  startAutoSync(): void {
    this.processSyncQueue()
      .then(() => {
        this.lastSyncAt = Date.now();
        this.emitSyncStatus({ ok: true, lastSyncAt: this.lastSyncAt });
      })
      .catch((err) => logger.error('[SyncService] Initial sync gagal', err));

    this.syncInterval = setInterval(async () => {
      try {
        await this.processSyncQueue();
        this.lastSyncAt = Date.now();
        this.consecutiveFailures = 0;
        this.emitSyncStatus({ ok: true, lastSyncAt: this.lastSyncAt });
      } catch (err) {
        logger.error('[SyncService] Periodic sync gagal', err);
        this.consecutiveFailures++;
        this.emitSyncStatus({ ok: false, failures: this.consecutiveFailures });
      }
    }, 15 * 60 * 1_000);

    window.addEventListener('online', this.handleOnline);
  }

  stopAutoSync(): void {
    window.removeEventListener('online', this.handleOnline);
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private handleOnline = () => {
    logger.info('[SyncService] Device online, memulai sync...');
    this.processSyncQueue().catch((e) => logger.error('[SyncService] Sync catch-all', e));
  };

  private handleAuthError(): void {
    logger.error('[SyncService] Auth error — sync dihentikan.');
    this.stopAutoSync();
    window.dispatchEvent(
      new CustomEvent('psa:auth-error', {
        detail: { message: 'Sesi Habis, Silakan Login Ulang untuk Menyinkronkan Data' },
      })
    );
  }

  private emitSyncStatus(detail: { ok: boolean; lastSyncAt?: number; failures?: number }): void {
    window.dispatchEvent(new CustomEvent('psa:sync-status', { detail }));
  }
}

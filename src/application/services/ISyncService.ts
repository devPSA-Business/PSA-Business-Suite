import { SyncEvent } from '../../shared/api/db';

export interface ISyncService {
  enqueueSync(event: Omit<SyncEvent, 'id' | 'status' | 'timestamp'>): Promise<number>;
  processSyncQueue(): Promise<void>;
  resolveConflict(eventId: number, resolution: 'LOCAL' | 'SERVER'): Promise<void>;
  startAutoSync(): void;
  stopAutoSync(): void;
}

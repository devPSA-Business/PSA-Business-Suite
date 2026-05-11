import { SyncEvent } from '../../shared/api/db';
import { IUnitOfWork } from '../core/IUnitOfWork';

export interface ISyncService {
  enqueueSync(event: Omit<SyncEvent, 'id' | 'status' | 'timestamp'>): Promise<number>;
  processSyncQueue(): Promise<void>;
  resolveConflict(eventId: number, resolution: 'LOCAL' | 'SERVER', uow: IUnitOfWork): Promise<void>;
  startAutoSync(): void;
  stopAutoSync(): void;
}

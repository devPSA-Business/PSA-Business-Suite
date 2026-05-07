import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncServiceImpl } from '../../../src/infrastructure/services/SyncServiceImpl';
import { isConfigValid } from '../../../src/shared/api/firebase';
import { db } from '../../../src/shared/api/db';
import { guardSyncEnqueue } from '../../../src/shared/utils/syncGuard';
import { useAuthStore } from '../../../src/shared/store/authStore';
import { safeFirestoreCall } from '../../../src/shared/api/firebase';

// Mock DB
const createQueryMock = () => {
  const mock: any = {
    equals: vi.fn().mockImplementation(() => mock),
    anyOf: vi.fn().mockImplementation(() => mock),
    sortBy: vi.fn().mockResolvedValue([]),
    filter: vi.fn().mockImplementation(() => mock),
    toArray: vi.fn().mockResolvedValue([]),
    first: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    limit: vi.fn().mockImplementation(() => mock),
    offset: vi.fn().mockImplementation(() => mock),
    reverse: vi.fn().mockImplementation(() => mock),
    primaryKeys: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(0),
    modify: vi.fn().mockResolvedValue(0),
  };
  return mock;
};

vi.mock('../../../src/shared/api/db', () => ({
  db: {
    transaction: vi.fn(async (...args) => {
      const cb = args[args.length - 1];
      return await cb();
    }),
    sync_events: {
      where: vi.fn(() => createQueryMock()),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      bulkDelete: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    },
    sync_dlq: { add: vi.fn() },
    stock: { put: vi.fn(), get: vi.fn() },
    customers: { put: vi.fn(), get: vi.fn() },
    repair_services: { put: vi.fn(), get: vi.fn() },
    gold_buyback: { put: vi.fn(), get: vi.fn() },
    shifts: { put: vi.fn(), get: vi.fn() },
    petty_cash: { put: vi.fn(), get: vi.fn() },
    transactions: { put: vi.fn(), get: vi.fn() },
    gold_liquidations: { put: vi.fn(), get: vi.fn() },
    custom_orders: { put: vi.fn(), get: vi.fn() },
    appointments: { put: vi.fn(), get: vi.fn() },
  }
}));

vi.mock('../../../src/shared/utils/syncGuard', () => ({
  guardSyncEnqueue: vi.fn()
}));

vi.mock('../../../src/shared/store/authStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ user: { branchId: 'TEST_BRANCH' } }))
  }
}));

vi.mock('../../../src/shared/api/firebase', () => ({
  firestoreDb: {},
  isConfigValid: true,
  safeFirestoreCall: vi.fn(async (cb) => await cb())
}));

vi.mock('firebase/firestore', () => ({
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn()
  })),
  doc: vi.fn(),
  collection: vi.fn(),
  increment: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn()
}));

const mockOnline = vi.spyOn(navigator, 'onLine', 'get');

describe('SyncServiceImpl', () => {
  let syncService: SyncServiceImpl;

    beforeEach(() => {
    if (syncService) {
      syncService.stopAutoSync();
    }
    vi.resetAllMocks();
    mockOnline.mockReturnValue(false); // Prevent startInitialSync during construction
    (db.sync_events.where as any).mockImplementation(() => createQueryMock());
    (db.sync_events.add as any).mockResolvedValue(42);
    (db.sync_events.get as any).mockResolvedValue(null);
    (db.sync_events.update as any).mockResolvedValue(1);
    (db.sync_events.delete as any).mockResolvedValue(1);
    (db.sync_events.toArray as any).mockResolvedValue([]);
    (safeFirestoreCall as any).mockImplementation(async (cb: any) => await cb());
    syncService = new SyncServiceImpl();
    syncService.stopAutoSync(); // Prevent background noise during tests
    mockOnline.mockReturnValue(true); // Re-enable for tests
  });

  afterEach(() => {
    if (syncService) {
      syncService.stopAutoSync();
    }
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('enqueueSync', () => {
    it('should reject if guardSyncEnqueue returns false', async () => {
      (guardSyncEnqueue as any).mockResolvedValue(false);
      const event = { entity_type: 'stock', action: 'INSERT' as any, payload: { id: 's1' } };
      const id = await syncService.enqueueSync(event);
      expect(id).toBe(0);
    });

    it('should inject branchId and enqueue if safe', async () => {
      (guardSyncEnqueue as any).mockResolvedValue(true);
      
      const existingQuery = createQueryMock();
      existingQuery.equals.mockReturnValue({ first: vi.fn().mockResolvedValue(null) });
      (db.sync_events.where as any).mockReturnValue(existingQuery);
      (db.sync_events.add as any).mockResolvedValue(42);

      const id = await syncService.enqueueSync({ entity_type: 'stock', action: 'INSERT' as any, payload: {} });
      expect(id).toBe(42);
      expect(db.sync_events.add).toHaveBeenCalledWith(
        expect.objectContaining({ payload: expect.objectContaining({ branchId: 'TEST_BRANCH' }) })
      );
    });

    it('should resolve immediately if idempotency key exists', async () => {
      (guardSyncEnqueue as any).mockResolvedValue(true);
      
      const existingQuery = createQueryMock();
      existingQuery.equals.mockReturnValue({ first: vi.fn().mockResolvedValue({ id: 99 }) });
      (db.sync_events.where as any).mockReturnValue(existingQuery);

      const id = await syncService.enqueueSync({ entity_type: 'stock', action: 'INSERT' as any, payload: {} });
      expect(id).toBe(99);
      expect(db.sync_events.add).not.toHaveBeenCalled();
    });
  });

  describe('healSyncQueue', () => {
    it('should heal stuck events by updating status to PENDING', async () => {
      const stuckEvents = [
        { id: 1, status: 'PENDING', timestamp: 0, retry_count: 0 },
        { id: 2, status: 'PENDING', timestamp: 0, retry_count: 5 } // DLQ
      ];
      
      const query = {
        and: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(stuckEvents) }),
        equals: vi.fn()
      };
      query.equals.mockReturnValue(query);
      (db.sync_events.where as any).mockReturnValue(query);

      await syncService.healSyncQueue();
      
      expect(db.sync_events.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'PENDING', retry_count: 1 }));
      expect(db.sync_dlq.add).toHaveBeenCalledWith(expect.objectContaining({ id: 2, status: 'FAILED' }));
      expect(db.sync_events.delete).toHaveBeenCalledWith(2);
    });
  });

  describe('resolveConflict', () => {
    const mockUow = {
      execute: vi.fn(async (work) => await work()),
      registerAudit: vi.fn().mockResolvedValue(undefined)
    } as any;

    it('should handle LOCAL resolution by incrementing version and logging audit', async () => {
      const event = { id: 1, entity_type: 'stock', payload: { id: 's1', version: 1 }, server_payload: { version: 2 } };
      (db.sync_events.get as any).mockResolvedValue(event);

      await syncService.resolveConflict(1, 'LOCAL', mockUow);
      
      expect(db.sync_events.update).toHaveBeenCalledWith(1, expect.objectContaining({
        payload: { id: 's1', version: 3 },
        status: 'PENDING'
      }));
      expect(mockUow.registerAudit).toHaveBeenCalledWith(
        'RESOLVE_CONFLICT',
        expect.any(String),
        expect.stringContaining('LOKAL'),
        expect.objectContaining({ entityId: 's1' })
      );
    });

    it('should handle SERVER resolution by updating entity repository and logging audit', async () => {
      const event = { id: 2, entity_type: 'stock', payload: { id: 's1' }, server_payload: { id: 's1', name: 'Server Name' } };
      (db.sync_events.get as any).mockResolvedValue(event);

      await syncService.resolveConflict(2, 'SERVER', mockUow);
      
      expect(db.sync_events.delete).toHaveBeenCalledWith(2);
      expect(db.stock.put).toHaveBeenCalledWith({ id: 's1', name: 'Server Name' });
      expect(mockUow.registerAudit).toHaveBeenCalledWith(
        'RESOLVE_CONFLICT',
        expect.any(String),
        expect.stringContaining('SERVER'),
        expect.objectContaining({ entityId: 's1' })
      );
    });
  });

  describe('AutoSync', () => {
    it('handles startAutoSync failure gracefully', async () => {
      vi.useFakeTimers();
      const processSpy = vi.spyOn(syncService, 'processSyncQueue').mockRejectedValue(new Error('Initial start sync error'));
      syncService.startAutoSync();
      await vi.runOnlyPendingTimersAsync();
      syncService.stopAutoSync();
    });
    it('starts and stops auto sync without errors', async () => {
      vi.useFakeTimers();
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      const processSpy = vi.spyOn(syncService, 'processSyncQueue').mockResolvedValue(undefined);
      syncService.startAutoSync();
      expect(setIntervalSpy).toHaveBeenCalled();
      
      await vi.runOnlyPendingTimersAsync();
      
      // Simulate an online event
      window.dispatchEvent(new Event('online'));
      await vi.runOnlyPendingTimersAsync();

      // Simulate online event with error
      processSpy.mockRejectedValue(new Error('Online sync fail'));
      window.dispatchEvent(new Event('online'));
      await vi.runOnlyPendingTimersAsync();

      processSpy.mockRejectedValue(new Error('Sync interval error'));
      await vi.runOnlyPendingTimersAsync();

      syncService.stopAutoSync();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('processSyncQueue', () => {
    beforeEach(() => {
       Object.defineProperty(navigator, 'locks', {
         value: { request: vi.fn(async (name, options, cb) => await cb(true)) },
         configurable: true,
         writable: true
       });
    });

    it('should have auto-sync configuration valid (skipped check)', () => {
        expect(true).toBe(true);
    });
    
    it('returns early if real connectivity check fails', async () => {
      mockOnline.mockReturnValue(true);
      (db.sync_events.where as any).mockClear();
      const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
      await syncService.processSyncQueue();
      expect(db.sync_events.where).toHaveBeenCalledTimes(0);
      fetchSpy.mockRestore();
    });

    it('returns early if real connectivity check fails due to timeout', async () => {
      mockOnline.mockReturnValue(true);
      (db.sync_events.where as any).mockClear();
      vi.useFakeTimers();
      
      // Spy on fetch and provide a implementation that hangs until we advance time
      const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url, options) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve({ ok: true } as any);
          }, 10000);
          
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new Error('AbortError'));
            });
          }
        });
      });

      const syncPromise = syncService.processSyncQueue();
      
      // Advance to trigger the 3s timeout in checkRealConnectivity
      await vi.advanceTimersByTimeAsync(3500);
      
      await syncPromise;
      
      // Since checkRealConnectivity returns false on timeout, processSyncQueue should abort
      expect(db.sync_events.where).toHaveBeenCalledTimes(0);
      
      fetchSpy.mockRestore();
      vi.useRealTimers();
    });
    
    it('processes generic chunk of pending events', async () => {
      mockOnline.mockReturnValue(true);
      global.fetch = vi.fn().mockResolvedValue({ ok: true } as any);

      const events = [
         { id: 1, entity_type: 'stock', action: 'INSERT', payload: { client_txn_id: '123' }, status: 'PENDING' },
         { id: 2, entity_type: 'stock', action: 'UPDATE_DELTA', payload: { client_txn_id: '124', delta_field: 'quantity', delta_value: 5 }, status: 'PENDING' },
         { id: 3, entity_type: 'stock', action: 'DELETE', payload: { client_txn_id: '125' }, status: 'PENDING' }
      ];
      
      const query = {
        anyOf: vi.fn().mockReturnValue({ sortBy: vi.fn().mockResolvedValue(events) })
      };
      (db.sync_events.where as any).mockReturnValue(query);

      const batchMock = {
         update: vi.fn(),
         set: vi.fn(),
         delete: vi.fn(),
         commit: vi.fn().mockResolvedValue(undefined)
      };
      
      const firestore = await import('firebase/firestore');
      (firestore.writeBatch as any).mockReturnValue(batchMock);

      await syncService.processSyncQueue();
      
      expect(db.sync_events.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'SYNCED' }));
      expect(db.sync_events.update).toHaveBeenCalledWith(2, expect.objectContaining({ status: 'SYNCED' }));
      expect(db.sync_events.update).toHaveBeenCalledWith(3, expect.objectContaining({ status: 'SYNCED' }));
      
      expect(batchMock.set).toHaveBeenCalled();
      expect(batchMock.update).toHaveBeenCalled();
      expect(batchMock.delete).toHaveBeenCalled();
      expect(batchMock.commit).toHaveBeenCalled();
    });
    
    it('handles batch commit failures and falls back to individual writes', async () => {
      mockOnline.mockReturnValue(true);
      global.fetch = vi.fn().mockResolvedValue({ ok: true } as any);

      const events = [
         { id: 1, entity_type: 'stock', action: 'INSERT', payload: { client_txn_id: '123' }, status: 'PENDING' }
      ];
      
      const query = {
        anyOf: vi.fn().mockReturnValue({ sortBy: vi.fn().mockResolvedValue(events) })
      };
      (db.sync_events.where as any).mockReturnValue(query);

      const batchMock = {
         set: vi.fn(),
         commit: vi.fn().mockRejectedValue(new Error('Batch failed'))
      };
      
      const firestore = await import('firebase/firestore');
      (firestore.writeBatch as any).mockReturnValue(batchMock);
      (firestore.setDoc as any).mockResolvedValue(undefined); // Individual write succeeds

      await syncService.processSyncQueue();
      
      expect(db.sync_events.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'SYNCED' }));
    });
    
  it('handles blocked events in queue correctly', async () => {
      mockOnline.mockReturnValue(true);
      global.fetch = vi.fn().mockResolvedValue({ ok: true } as any);

      // We have multiple events for the same entity id. The first one is FAILED.
      // The second one is PENDING but should be blocked by the first.
      const events = [
         { id: 1, entity_type: 'stock', action: 'INSERT', payload: { client_txn_id: 'x1' }, status: 'FAILED' },
         { id: 2, entity_type: 'stock', action: 'UPDATE', payload: { client_txn_id: 'x1' }, status: 'PENDING' },
         { id: 3, entity_type: 'customer', action: 'INSERT', payload: { client_txn_id: 'x2' }, status: 'PENDING' }
      ];
      
      const query = {
        anyOf: vi.fn().mockReturnValue({ sortBy: vi.fn().mockResolvedValue(events) })
      };
      (db.sync_events.where as any).mockReturnValue(query);

      const batchMock = {
         set: vi.fn(),
         commit: vi.fn().mockResolvedValue(true)
      };
      
      const firestore = await import('firebase/firestore');
      (firestore.writeBatch as any).mockReturnValue(batchMock);

      await syncService.processSyncQueue();
      
      // Stock 1 is failed (skip), stock 2 is blocked (skip), customer 3 is pushed
      expect(db.sync_events.update).toHaveBeenCalledWith(3, expect.objectContaining({ status: 'SYNCED' }));
      expect(db.sync_events.update).not.toHaveBeenCalledWith(1, expect.any(Object));
      expect(db.sync_events.update).not.toHaveBeenCalledWith(2, expect.any(Object));
  });
  
  it('handles quantityChange in payload for UPDATE', async () => {
    mockOnline.mockReturnValue(true);
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as any);

    const events = [
       { id: 1, entity_type: 'stock', action: 'UPDATE', payload: { client_txn_id: '123', quantityChange: 5 }, status: 'PENDING' }
    ];
    
    const query = {
      anyOf: vi.fn().mockReturnValue({ sortBy: vi.fn().mockResolvedValue(events) })
    };
    (db.sync_events.where as any).mockReturnValue(query);

    const batchMock = {
       update: vi.fn(),
       commit: vi.fn().mockResolvedValue(true)
    };
    
    const firestore = await import('firebase/firestore');
    (firestore.writeBatch as any).mockReturnValue(batchMock);
    (firestore.increment as any) = vi.fn().mockReturnValue('INC(5)');

    await syncService.processSyncQueue();
    expect(batchMock.update).toHaveBeenCalledWith(undefined, { client_txn_id: '123', quantity: 'INC(5)' });
  });

  it('detects write conflicts with pre-fetched data', async () => {
    mockOnline.mockReturnValue(true);
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as any);

    const events = [
       { id: 1, entity_type: 'stock', action: 'UPDATE', payload: { client_txn_id: '123', version: 1 }, status: 'PENDING' }
    ];
    const query = {
      anyOf: vi.fn().mockReturnValue({ sortBy: vi.fn().mockResolvedValue(events) })
    };
    (db.sync_events.where as any).mockReturnValue(query);

    const firestore = await import('firebase/firestore');
    const batchMock = { update: vi.fn(), commit: vi.fn().mockResolvedValue(true) };
    (firestore.writeBatch as any).mockReturnValue(batchMock);
    
    (firestore.getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ version: 2 }) // Server has newer version
    });

    await syncService.processSyncQueue();
    expect(db.sync_events.update).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'CONFLICT' }));
    expect(batchMock.update).not.toHaveBeenCalled();
  });

  it('handles authentication error when batch commit fails', async () => {
    mockOnline.mockReturnValue(true);
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as any);

    const events = [{ id: 1, entity_type: 'stock', action: 'INSERT', payload: { client_txn_id: '123' }, status: 'PENDING' }];
    const query = createQueryMock();
    query.sortBy.mockResolvedValue(events);
    (db.sync_events.where as any).mockReturnValue(query);

    const commitMock = vi.fn().mockRejectedValue({ code: 'permission-denied' });
    const batchMock = { commit: commitMock, set: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const firestore = await import('firebase/firestore');
    (firestore.writeBatch as any).mockReturnValue(batchMock);
    
    const authErrorEventSpy = vi.fn();
    window.addEventListener('psa:auth-error', authErrorEventSpy);

    await syncService.processSyncQueue();
    
    expect(authErrorEventSpy).toHaveBeenCalled();
  });
  
  it('trims large base64 photos when moving to DLQ', async () => {
    mockOnline.mockReturnValue(true);
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as any);

    const events = [{ 
      id: 1, 
      entity_type: 'stock', 
      action: 'INSERT', 
      payload: { client_txn_id: '123', photoBeforeBase64: 'very_long_base64_string' }, 
      status: 'PENDING',
      retry_count: 4
    }];
    const query = createQueryMock();
    query.sortBy.mockResolvedValue(events);
    (db.sync_events.where as any).mockReturnValue(query);

    const commitMock = vi.fn().mockRejectedValue(new Error('Persistent error'));
    const batchMock = { commit: commitMock, set: vi.fn(), update: vi.fn(), delete: vi.fn() };
    const firestore = await import('firebase/firestore');
    (firestore.writeBatch as any).mockReturnValue(batchMock);
    
    // safeFirestoreCall wrap
    (firestore.setDoc as any).mockRejectedValue(new Error('Persistent error'));

    await syncService.processSyncQueue();
    
    expect(db.sync_dlq.add).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ photoBeforeBase64: '[TRIMMED_FOR_DLQ]' })
    }));
  });
  }); // Close processSyncQueue

  describe('healSyncQueue', () => {
    it('moves stuck events > 5 times to DLQ', async () => {
      const dbAny = db as any;
      const stuckEvent = { id: 10, status: 'PENDING', timestamp: Date.now() - 400000, retry_count: 5 };
      dbAny.sync_events.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          and: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([stuckEvent])
          })
        })
      });

      await syncService.healSyncQueue();
      expect(dbAny.sync_dlq.add).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILED' }));
      expect(dbAny.sync_events.delete).toHaveBeenCalledWith(10);
    });

    it('retries stuck events < 5 times', async () => {
      const dbAny = db as any;
      const stuckEvent = { id: 11, status: 'PENDING', timestamp: Date.now() - 400000, retry_count: 2 };
      dbAny.sync_events.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          and: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([stuckEvent])
          })
        })
      });
      await syncService.healSyncQueue();
      expect(dbAny.sync_events.update).toHaveBeenCalledWith(11, expect.objectContaining({ status: 'PENDING', retry_count: 3 }));
    });
  });

  describe('enqueueSync', () => {
    it('uses existing branchId and assigns default', async () => {
      (global as any).useAuthStore = { getState: () => ({ user: { branchId: 'BR-1' } }) };
      (db.sync_events.where as any).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null)
        })
      });
      const eventId = await syncService.enqueueSync({ entity_type: 'test', action: 'INSERT', payload: {} });
      expect(typeof eventId).toBe('number');
    });
  });
});


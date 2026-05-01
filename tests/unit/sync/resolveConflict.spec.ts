// tests/unit/sync/resolveConflict.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncServiceImpl } from '../../../src/infrastructure/services/SyncServiceImpl';
import { db } from '../../../src/shared/api/db';

/**
 * @ai_context: F12 - Quality Assurance & Test Coverage
 * Unit test for SyncServiceImpl.resolveConflict (SERVER mode).
 */

vi.mock('../../../src/shared/api/db', () => ({
  db: {
    sync_events: { get: vi.fn(), delete: vi.fn(), update: vi.fn() },
    sync_dlq:    { add: vi.fn() },
    stock:              { put: vi.fn() },
    customers:          { put: vi.fn() },
    repair_services:    { put: vi.fn() },
    gold_buyback:       { put: vi.fn() },
    shifts:             { put: vi.fn() },
    petty_cash:         { put: vi.fn() },
    transactions:       { put: vi.fn() },
    gold_liquidations:  { put: vi.fn() },
    custom_orders:      { put: vi.fn() },
    appointments:       { put: vi.fn() },
    transaction: vi.fn((_mode, _tables, work) => work()),
  }
}));

describe('SyncServiceImpl.resolveConflict (SERVER mode)', () => {
  const service = new SyncServiceImpl();
  const mockServerPayload = { id: 'doc-123', name: 'Server Name', version: 5, branchId: 'HQ' };

  const makeEvent = (entityType: string) => ({
    id: 1,
    entity_type: entityType,
    status: 'CONFLICT' as const,
    payload: { id: 'doc-123' },
    server_payload: mockServerPayload,
    action: 'UPDATE' as const,
    timestamp: Date.now(),
    idempotency_key: 'k1'
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    'stock',
    'customers',
    'repair_services',
    'gold_buyback',
    'shifts',
    'petty_cash',
    'transactions',
    'gold_liquidations',
    'custom_orders',
    'appointments'
  ])('should apply server data to %s in local IndexedDB', async (entityType) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.sync_events.get).mockResolvedValue(makeEvent(entityType) as any);
    
    await service.resolveConflict(1, 'SERVER');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetTable = (db as any)[entityType];
    expect(targetTable.put).toHaveBeenCalledWith(mockServerPayload);
    expect(db.sync_events.delete).toHaveBeenCalledWith(1);
  });

  it('should push to DLQ for unknown entity_type', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.sync_events.get).mockResolvedValue(makeEvent('unknown_entity_type') as any);
    
    await service.resolveConflict(1, 'SERVER');
    
    expect(db.sync_dlq.add).toHaveBeenCalledWith(
      expect.objectContaining({
        error_message: expect.stringContaining('unhandled_conflict_entity: unknown_entity_type')
      })
    );
  });
});

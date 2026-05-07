import { describe, it, expect, vi, beforeEach } from 'vitest';
import { guardSyncEnqueue } from '../../../src/shared/utils/syncGuard';
import { db } from '../../../src/shared/api/db';

vi.mock('../../../src/shared/api/db', () => ({
  db: {
    sync_events: {
      where: vi.fn()
    }
  }
}));

describe('syncGuard', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should allow unique keys', async () => {
    (db.sync_events.where as any).mockImplementation(() => ({
      equals: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null)
    }));
    
    const result = await guardSyncEnqueue('stock', 's1', 'key1');
    expect(result).toBe(true);
  });

  it('should block in-flight duplicates', async () => {
    (db.sync_events.where as any).mockImplementation(() => ({
      equals: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null)
    }));
    
    await guardSyncEnqueue('stock', 's1', 'key-dup');
    const result = await guardSyncEnqueue('stock', 's1', 'key-dup');
    expect(result).toBe(false);
  });

  it('should block IndexedDB duplicates', async () => {
    (db.sync_events.where as any).mockImplementation(() => ({
      equals: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue({ id: 1 })
    }));
    
    const result = await guardSyncEnqueue('stock', 's1', 'key-db');
    expect(result).toBe(false);
  });

  it('should handle IndexedDB errors gracefully', async () => {
    (db.sync_events.where as any).mockImplementation(() => {
       throw new Error('DB Error');
    });
    
    const result = await guardSyncEnqueue('stock', 's1', 'key-err');
    expect(result).toBe(true); // Should fallback to allow if DB check fails but NOT in-flight
  });
});

import { describe, it, expect, vi } from 'vitest';
import { getDatabaseSize, db } from '../../../src/shared/api/db';

describe('Database API', () => {
  it('should have a defined db instance', () => {
    expect(db).toBeDefined();
    expect(db.name).toBe('PSA_POS_DB');
  });

  it('should estimate database size', async () => {
    // Mock navigator.storage.estimate
    const mockEstimate = vi.fn().mockResolvedValue({ usage: 1024 });
    vi.stubGlobal('navigator', {
      storage: {
        estimate: mockEstimate
      }
    });

    const size = await getDatabaseSize();
    expect(size).toBe(1024);
    expect(mockEstimate).toHaveBeenCalled();
  });

  it('should return 0 if storage estimate is not available', async () => {
    vi.stubGlobal('navigator', {});
    const size = await getDatabaseSize();
    expect(size).toBe(0);
  });
});

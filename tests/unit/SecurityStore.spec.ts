
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPin, useSecurityStore } from '../../src/shared/store/useSecurityStore';
import { db } from '../../src/shared/api/db';

// Mock DB
vi.mock('../../src/shared/api/db', () => ({
  db: {
    users: {
      get: vi.fn(),
      update: vi.fn(),
    },
    keyval: {
      put: vi.fn().mockResolvedValue(true),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true)
    }
  }
}));

describe('SecurityStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should hash PIN uniquely per user using PBKDF2', async () => {
    const pin = '123456';
    const userId1 = 'user1';
    const userId2 = 'user2';

    const hash1 = await hashPin(pin, userId1);
    const hash2 = await hashPin(pin, userId2);

    expect(hash1).not.toBe(hash2);
    expect(hash1).toHaveLength(64); // 256 bits = 64 hex chars
    expect(hash2).toHaveLength(64);
  });

  it('should require PIN change for Admin with legacy hash', async () => {
    const adminUser = {
      id: 'USR-ADMIN',
      pinHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' // Legacy SHA-256 for 123456
    };
    
    (db.users.get as any).mockResolvedValue(adminUser);

    const requiresChange = await useSecurityStore.getState().checkRequiresPinChange('USR-ADMIN', '123456');
    expect(requiresChange).toBe(true);
  });

  it('should not require PIN change for Admin with unique hash', async () => {
    const adminUser = {
      id: 'USR-ADMIN',
      pinHash: 'a1b2c3d4...', // Some unique hash
      salt: 'some-valid-salt'
    };
    
    (db.users.get as any).mockResolvedValue(adminUser);

    const requiresChange = await useSecurityStore.getState().checkRequiresPinChange('USR-ADMIN', '123456');
    expect(requiresChange).toBe(false);
  });
});

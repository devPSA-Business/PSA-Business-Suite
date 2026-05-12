
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPin, useSecurityStore } from '../../src/shared/store/useSecurityStore';
import { db } from '../../src/shared/api/db';
import { cryptoDB } from '../../src/lib/cryptoIndexedDB';
import { cryptoKeyStore } from '../../src/lib/cryptoKeyStore';
import { useAuthStore } from '../../src/shared/store/authStore';

vi.mock('../../src/shared/api/firebase', () => ({
  functions: {},
  auth: { currentUser: { uid: 'admin123' } }
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => {
    return vi.fn().mockImplementation(async ({ pin, saltHex }) => {
      return { data: { hash: `mock-hash-${pin}-${saltHex}`.padEnd(64, '0') } };
    });
  }),
  getFunctions: vi.fn()
}));

// Mock DB
vi.mock('../../src/shared/api/db', () => ({
  db: {
    users: {
      get: vi.fn(),
      update: vi.fn(),
      toArray: vi.fn()
    },
    keyval: {
      put: vi.fn().mockResolvedValue(true),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true)
    },
    store_profile: {
      get: vi.fn().mockResolvedValue(null)
    }
  }
}));

vi.mock('../../src/lib/cryptoIndexedDB', () => ({
  cryptoDB: {
    generateDeviceKey: vi.fn().mockResolvedValue('mock-device-key'),
    wrapKeyWithPin: vi.fn().mockResolvedValue('wrapped-key'),
    reWrapKeyWithPin: vi.fn().mockResolvedValue('new-wrapped-key'),
    unwrapKeyWithPin: vi.fn().mockResolvedValue(undefined),
    setKey: vi.fn(),
    getKey: vi.fn()
  }
}));

vi.mock('../../src/lib/cryptoKeyStore', () => ({
  cryptoKeyStore: {
    getWrappedKey: vi.fn(),
    saveWrappedKey: vi.fn()
  }
}));

describe('SecurityStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSecurityStore.setState({ 
      isPinVerified: false, 
      failedAttempts: 0, 
      absoluteFailedAttempts: 0, 
      lastAttemptTime: 0, 
      isSystemLocked: false,
      isSetupComplete: false,
      adminFailedAttempts: 0,
      lastAdminAttemptTime: 0 
    });
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

  it('should update setup state via initSetupState', async () => {
    (db.store_profile.get as any).mockResolvedValueOnce({ isSetupComplete: true });
    await useSecurityStore.getState().initSetupState();
    expect(useSecurityStore.getState().isSetupComplete).toBe(true);
    
    (db.store_profile.get as any).mockResolvedValueOnce({ isSetupComplete: false });
    await useSecurityStore.getState().initSetupState();
    expect(useSecurityStore.getState().isSetupComplete).toBe(false);
  });
  
  it('should initialize system lock via initSystemLock', async () => {
    (db.keyval.get as any).mockImplementation((k: string) => {
        if (k === 'is_system_locked') return Promise.resolve({ value: true });
        if (k === 'absolute_failed_attempts') return Promise.resolve({ value: 10 });
        return null;
    });
    await useSecurityStore.getState().initSystemLock();
    expect(useSecurityStore.getState().isSystemLocked).toBe(true);
    expect(useSecurityStore.getState().absoluteFailedAttempts).toBe(10);
  });

  it('should handle errors in initSystemLock', async () => {
    (db.keyval.get as any).mockRejectedValue(new Error('init error'));
    await expect(useSecurityStore.getState().initSystemLock()).resolves.toBeUndefined();
  });

  it('should handle errors in initSetupState', async () => {
    (db.store_profile.get as any).mockRejectedValue(new Error('setup error'));
    // Should suppress the error and not update state
    await expect(useSecurityStore.getState().initSetupState()).resolves.toBeUndefined();
  });

  it('should return false if user not found in checkRequiresPinChange', async () => {
    (db.users.get as any).mockResolvedValue(null);
    expect(await useSecurityStore.getState().checkRequiresPinChange('404', 'pin')).toBe(false);
  });

  it('should catch error in checkRequiresPinChange', async () => {
    (db.users.get as any).mockRejectedValue(new Error('db error'));
    const result = await useSecurityStore.getState().checkRequiresPinChange('user', 'pin');
    expect(result).toBe(false);
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

  it('should lock system if verification fails 10 absolute times', async () => {
    useSecurityStore.setState({ absoluteFailedAttempts: 9 });
    const user = { id: 'usr-1', status: 'ACTIVE', pinHash: 'some-hash', salt: 'salt1' };
    (db.users.get as any).mockResolvedValue(user);
    
    // Attempt login with wrong pin (returns hash different from 'some-hash')
    const result = await useSecurityStore.getState().verifyUserPin('usr-1', '000000');
    expect(result).toBe(false);
    expect(useSecurityStore.getState().isSystemLocked).toBe(true);
    expect(db.keyval.put).toHaveBeenCalledWith({ key: 'is_system_locked', value: true });
  });

  it('should deny verifyUserPin if system is locked', async () => {
    useSecurityStore.setState({ isSystemLocked: true });
    const result = await useSecurityStore.getState().verifyUserPin('usr-1', '123456');
    expect(result).toBe(false);
  });

  it('should successfully verify user pin via legacy hashes', async () => {
    const pin = 'legacy123';
    
    // Simulate legacy SHA-256 hash
    const msgBuffer = new TextEncoder().encode(pin);
    const oldHashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const oldHashArray = Array.from(new Uint8Array(oldHashBuffer));
    const oldHash = oldHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const user = { id: 'usr-legacy', status: 'ACTIVE', pinHash: oldHash, salt: 'legacy-salt', role: 'CASHIER' };
    (db.users.get as any).mockResolvedValue(user);
    
    (cryptoKeyStore.getWrappedKey as any).mockResolvedValue({
        id: 'primary_device_key',
        wrappedKeysByPin: { 'usr-legacy': 'wrapped-data' }
    });
    
    const result = await useSecurityStore.getState().verifyUserPin('usr-legacy', pin);
    expect(result).toBe(true);
  });

  it('should correctly authorizeUserLocal', async () => {
    (cryptoDB.getKey as any).mockReturnValue('some-key');
    (cryptoKeyStore.getWrappedKey as any).mockResolvedValue({
        wrappedKeysByPin: {}
    });
    (db.users.get as any).mockResolvedValue({ id: 'usr-2', salt: 'salt2' });
    
    const result = await useSecurityStore.getState().authorizeUserLocal('usr-2', 'pin2');
    expect(result).toBe(true);
    expect(cryptoKeyStore.saveWrappedKey).toHaveBeenCalled();
  });

  it('should return false from authorizeUserLocal if preconditions fail', async () => {
    (cryptoDB.getKey as any).mockReturnValue(null);
    expect(await useSecurityStore.getState().authorizeUserLocal('u', 'p')).toBe(false);
    
    (cryptoDB.getKey as any).mockReturnValue('some-key');
    (cryptoKeyStore.getWrappedKey as any).mockResolvedValue(null);
    expect(await useSecurityStore.getState().authorizeUserLocal('u', 'p')).toBe(false);
    
    (cryptoKeyStore.getWrappedKey as any).mockResolvedValue({});
    (db.users.get as any).mockResolvedValue(null);
    expect(await useSecurityStore.getState().authorizeUserLocal('u', 'p')).toBe(false);
    
    (db.users.get as any).mockResolvedValue({ id: 'u' });
    (cryptoDB.wrapKeyWithPin as any).mockRejectedValueOnce(new Error('fail'));
    expect(await useSecurityStore.getState().authorizeUserLocal('u', 'p')).toBe(false);
  });

  it('should verify admin pin correctly across users', async () => {
    const pin = 'adminpin';
    const salt = 'adminsalt';
    const hash = await hashPin(pin, salt);
    
    (db.users.toArray as any).mockResolvedValue([
      { id: 'usr-admin', role: 'ADMIN', status: 'ACTIVE', pinHash: hash, salt }
    ]);
    
    const result = await useSecurityStore.getState().verifyAdminPin(pin);
    expect(result).toBe(true);
    expect(useSecurityStore.getState().adminFailedAttempts).toBe(0);
  });

  it('should deny admin pin if system is locked', async () => {
    useSecurityStore.setState({ isSystemLocked: true });
    expect(await useSecurityStore.getState().verifyAdminPin('1')).toBe(false);
  });

  it('should throttle verifyAdminPin if requested too fast', async () => {
    useSecurityStore.setState({ lastAdminAttemptTime: Date.now() });
    expect(await useSecurityStore.getState().verifyAdminPin('xyz')).toBe(false);
  });

  it('should lock verifyAdminPin after 5 fails', async () => {
    useSecurityStore.setState({ adminFailedAttempts: 5, lastAdminAttemptTime: Date.now() });
    expect(await useSecurityStore.getState().verifyAdminPin('xyz')).toBe(false);
  });

  it('should increase admin failed attempts for wrong PIN and do nuclear absolute lock', async () => {
    useSecurityStore.setState({ absoluteFailedAttempts: 9 });
    (db.users.toArray as any).mockResolvedValue([
      { id: 'usr-admin', role: 'ADMIN', status: 'ACTIVE', pinHash: 'badhash', salt: 'salt' }
    ]);
    
    const result = await useSecurityStore.getState().verifyAdminPin('wrong');
    expect(result).toBe(false);
    expect(useSecurityStore.getState().adminFailedAttempts).toBe(1);
    expect(useSecurityStore.getState().absoluteFailedAttempts).toBe(10);
    expect(useSecurityStore.getState().isSystemLocked).toBe(true);
    expect(db.keyval.put).toHaveBeenCalledWith({ key: 'is_system_locked', value: true });
  });

  it('should lock out user during verifyUserPin throttling', async () => {
    useSecurityStore.setState({ lastAttemptTime: Date.now() });
    expect(await useSecurityStore.getState().verifyUserPin('u', 'p')).toBe(false);
    
    useSecurityStore.setState({ lastAttemptTime: Date.now(), failedAttempts: 5 });
    expect(await useSecurityStore.getState().verifyUserPin('u', 'p')).toBe(false);
  });

  it('should handle verifyUserPin no user found', async () => {
    (db.users.get as any).mockResolvedValue(null);
    expect(await useSecurityStore.getState().verifyUserPin('u', 'p')).toBe(false);
  });

  it('should verifyUserPin but fail early on not enrolled local crypto', async () => {
    const pin = 'legacy123';
    const msgBuffer = new TextEncoder().encode(pin);
    const oldHashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const oldHashArray = Array.from(new Uint8Array(oldHashBuffer));
    const oldHash = oldHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const user = { id: 'usr-new123', status: 'ACTIVE', pinHash: oldHash, salt: 'legacy-salt', role: 'CASHIER' };
    (db.users.get as any).mockResolvedValue(user);
    
    (cryptoKeyStore.getWrappedKey as any).mockResolvedValue({
        id: 'primary_device_key',
        wrappedKeysByPin: {} // no keys
    });
    
    expect(await useSecurityStore.getState().verifyUserPin('usr-new123', pin)).toBe(false);
  });
  
  it('should create new device key and wrap if none exists in verifyUserPin', async () => {
    // Polyfill randomUUID for this test
    if (!crypto.randomUUID) {
      crypto.randomUUID = () => 'test-uuid' as any;
    }
    
    const pin = 'legacy123';
    const user = { id: 'usr-init', status: 'ACTIVE', pinHash: 'does-not-matter', salt: 'legacy-salt', role: 'CASHIER' };
    
    const currentSalt = new Uint8Array([1, 2, 3]);
    const hashData = await hashPin(pin, currentSalt);
    user.pinHash = hashData;
    user.salt = currentSalt as any;
    
    (db.users.get as any).mockResolvedValue(user);
    (cryptoKeyStore.getWrappedKey as any).mockResolvedValue(null);
    
    // Attempt verification
    const result = await useSecurityStore.getState().verifyUserPin('usr-init', pin);
    
    expect(result).toBe(true);
    expect(cryptoDB.generateDeviceKey).toHaveBeenCalled();
  });

  it('should verify admin pin via SHA-256 fallback', async () => {
    const pin = 'admin123';
    const msgBuffer = new TextEncoder().encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256Hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    (db.users.toArray as any).mockResolvedValue([
      { id: 'admin-legacy', role: 'ADMIN', status: 'ACTIVE', pinHash: sha256Hash, salt: 'some-salt' }
    ]);

    // Ensure state is clean
    useSecurityStore.setState({ isSystemLocked: false, adminFailedAttempts: 0, lastAdminAttemptTime: 0 });

    const result = await useSecurityStore.getState().verifyAdminPin(pin);
    expect(result).toBe(true);
  });

  it('should lock the store and logout user when lock() is called', () => {
    const logoutSpy = vi.spyOn(useAuthStore.getState(), 'logout');
    useSecurityStore.getState().lock();
    
    expect(useSecurityStore.getState().isPinVerified).toBe(false);
    expect(logoutSpy).toHaveBeenCalled();
  });
});


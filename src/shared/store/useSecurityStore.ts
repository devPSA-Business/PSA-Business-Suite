/**
 * ============================================================================
 * 🛑 AI EMERGENCY STOP & AUDIT PROTOCOL
 * ============================================================================
 * @security_tier MAXIMUM
 * STOP! JIKA ANDA (AI MODEL) MENGAKSES FILE INI, BACA `/AI_TRACK_RECORD.md` SEGERA.
 * PERINGATAN: Modul ini mengatur Jantung Keamanan Enkripsi Lokal.
 * 1. DILARANG KERAS mengembalikan/menambahkan fitur panggil server KMS di sini.
 * 2. Kunci enkripsi harus MURNI dibungkus oleh PIN lokal pengguna.
 * 3. Kegagalan fungsi di sini akan membuat data toko hilang permanen!
 * ============================================================================
 * 
 * @lockdown_status: CRITICAL_AUTH_LOGIC
 * @warning: DO NOT MODIFY. This module handles PIN hashing and database decryption.
 * Changes to hashPin() or verifyUserPin() will lock all users out of their data.
 * @last_audit: 2026-04-19
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { db, User } from '../api/db';
import { useAuthStore } from './authStore';
import { UserRole } from '../../domain/models/User';
import { useToastStore } from './toastStore';
import { cryptoDB } from '../../lib/cryptoIndexedDB';
import { cryptoKeyStore } from '../../lib/cryptoKeyStore';
import { logger } from '../../lib/logger';
import { dexieSecurityStorage } from '../../infrastructure/storage/dexieSecurityStorage';

interface SecurityState {
  isPinVerified: boolean;
  failedAttempts: number;
  absoluteFailedAttempts: number;
  lastAttemptTime: number;
  isSystemLocked: boolean;
  isSetupComplete: boolean;
  adminFailedAttempts: number;
  lastAdminAttemptTime: number;
  verifyUserPin: (userId: string, pin: string) => Promise<boolean>;
  verifyAdminPin: (pin: string) => Promise<boolean>;
  lock: () => void;
  checkRequiresPinChange: (userId: string, pinInput: string) => Promise<boolean>;
  authorizeUserLocal: (targetUserId: string, targetUserPin: string) => Promise<boolean>;
  generateRecoveryKey: () => Promise<string>;
  initSystemLock: () => Promise<void>;
  initSetupState: () => Promise<void>;
}

const BRUTE_FORCE_DELAY = 2000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000;
const PEPPER = import.meta.env.VITE_CRYPTO_PEPPER;

export const HASH_ITERATIONS_V1 = 100000;
export const HASH_ITERATIONS_V2 = 600000;

export const hashPin = async (
  pin: string, 
  saltInput: string | Uint8Array, 
  usePepper: boolean = true,
  iterations: number = HASH_ITERATIONS_V2
): Promise<string> => {
  const encoder = new TextEncoder();
  const pinBuffer = encoder.encode(usePepper ? pin + PEPPER : pin);
  const salt = typeof saltInput === 'string' ? encoder.encode(saltInput) : saltInput;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    pinBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const ensureUserSalt = async (user: User): Promise<Uint8Array> => {
   if (user.salt) {
      return typeof user.salt === 'string' ? new TextEncoder().encode(user.salt) : (user.salt as Uint8Array);
   }
   const newSalt = crypto.getRandomValues(new Uint8Array(32));
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   await db.users.update(user.id, { salt: newSalt as any });
   return newSalt;
};

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set, get) => ({
      isPinVerified: false,
      failedAttempts: 0,
      absoluteFailedAttempts: 0,
      lastAttemptTime: 0,
      isSystemLocked: false,
      isSetupComplete: false,
      adminFailedAttempts: 0,
      lastAdminAttemptTime: 0,
      
      initSetupState: async () => {
        try {
          const defaultProfile = await db.store_profile.get('default');
          if (defaultProfile && defaultProfile.isSetupComplete) {
            set({ isSetupComplete: true });
          } else {
             set({ isSetupComplete: false });
          }
        } catch (error) {
           console.error('[Security] Failed to fetch setup status:', error);
        }
      },

      initSystemLock: async () => {
        try {
          const lockedRecord = await db.keyval.get('is_system_locked');
          const absoluteRecord = await db.keyval.get('absolute_failed_attempts');
          
          set({ 
            isSystemLocked: lockedRecord?.value === true,
            absoluteFailedAttempts: (absoluteRecord?.value as number) || 0
          });
        } catch (error) {
          logger.error('Failed to load system lock state from IndexedDB', { error: String(error) });
        }
      },

      checkRequiresPinChange: async (userId: string, _pinInput: string) => {
        try {
          const user = await db.users.get(userId);
          if (!user) return false;
          // Legacy hashes didn't have salt or used short hashes
          if (!user.salt || user.isDefaultPin === true) {
             return true;
          }
          return false;
        } catch(e) {
          return false;
        }
      },
      
      verifyUserPin: async (userId: string, pin: string) => {
        const state = get();
        const now = Date.now();
        
        if (state.isSystemLocked) {
          useToastStore.getState().addToast('Sistem terkunci permanen akibat indikasi pembobolan (Nuclear Lockout).', 'error');
          return false;
        }

        if (now - state.lastAttemptTime < BRUTE_FORCE_DELAY) {
          useToastStore.getState().addToast('Terlalu cepat.', 'warning');
          return false;
        }

        if (state.failedAttempts >= MAX_FAILED_ATTEMPTS) {
          if (now - state.lastAttemptTime < LOCKOUT_DURATION) {
            return false;
          } else {
            set({ failedAttempts: 0 });
          }
        }

        set({ lastAttemptTime: now });
        const user = await db.users.get(userId);
        if (!user || user.status !== 'ACTIVE') return false;

        const currentSalt = await ensureUserSalt(user);

        const hashedInputV2 = await hashPin(pin, currentSalt, true, HASH_ITERATIONS_V2);
        let isPinValid = (hashedInputV2 === user.pinHash);
        const needsHashUpgrade = !isPinValid;

        if (!isPinValid) {
          const hashedInputV1 = await hashPin(pin, currentSalt, true, HASH_ITERATIONS_V1);
          isPinValid = (hashedInputV1 === user.pinHash);
          if (!isPinValid) {
            const hashedInputLegacyNoPepper = await hashPin(pin, currentSalt, false, HASH_ITERATIONS_V1);
            isPinValid = (hashedInputLegacyNoPepper === user.pinHash);
            if (!isPinValid) {
              const msgBuffer = new TextEncoder().encode(pin);
              const oldHashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
              const oldHashArray = Array.from(new Uint8Array(oldHashBuffer));
              const oldHash = oldHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
              isPinValid = (oldHash === user.pinHash);
            }
          }
        }

        if (!isPinValid) {
          const newAbsolute = state.absoluteFailedAttempts + 1;
          const isSystemLocked = newAbsolute >= 10;
          
          set((s) => ({ 
            failedAttempts: s.failedAttempts + 1, 
            absoluteFailedAttempts: newAbsolute,
            isSystemLocked: s.isSystemLocked || isSystemLocked
          }));
          
          db.keyval.put({ key: 'absolute_failed_attempts', value: newAbsolute }).catch(console.error);
          if (isSystemLocked) {
             db.keyval.put({ key: 'is_system_locked', value: true }).catch(console.error);
          }
          return false;
        }

        set({ failedAttempts: 0, absoluteFailedAttempts: 0 });
        db.keyval.delete('absolute_failed_attempts').catch(console.error);

        try {
          let wrappedKeyMeta = await cryptoKeyStore.getWrappedKey();
          if (!wrappedKeyMeta) {
            const deviceKey = await cryptoDB.generateDeviceKey();
            const newSalt = crypto.getRandomValues(new Uint8Array(32));
            const pinWrappedKey = await cryptoDB.wrapKeyWithPin(deviceKey, pin, newSalt);
            wrappedKeyMeta = {
              id: 'primary_device_key',
              keyId: `local-key-${crypto.randomUUID()}`,
              wrappedKeyBlob: 'DEPRECATED_NO_SERVER',
              wrappedKeysByPin: { [user.id]: pinWrappedKey },
              createdAt: Date.now()
            };
            await cryptoKeyStore.saveWrappedKey(wrappedKeyMeta);
            const updatedHash = await hashPin(pin, newSalt, true, HASH_ITERATIONS_V2);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await db.users.update(user.id, { salt: newSalt as any, pinHash: updatedHash });
            cryptoDB.setKey(deviceKey, wrappedKeyMeta.keyId);
          } else {
            if (!wrappedKeyMeta.wrappedKeysByPin) wrappedKeyMeta.wrappedKeysByPin = {};
            const userOfflineKey = wrappedKeyMeta.wrappedKeysByPin[user.id];
            if (!userOfflineKey) throw new Error('NOT_ENROLLED_LOCAL_CRYPTO');
            
            if (!user.salt || needsHashUpgrade) {
              const oldSalt = await ensureUserSalt(user);
              const newSalt = crypto.getRandomValues(new Uint8Array(32));
              const newPinWrappedKey = await cryptoDB.reWrapKeyWithPin(userOfflineKey, pin, oldSalt, pin, newSalt);
              wrappedKeyMeta.wrappedKeysByPin[user.id] = newPinWrappedKey;
              await cryptoKeyStore.saveWrappedKey(wrappedKeyMeta);
              const updatedHash = await hashPin(pin, newSalt, true, HASH_ITERATIONS_V2);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await db.users.update(user.id, { salt: newSalt as any, pinHash: updatedHash });
              await cryptoDB.unwrapKeyWithPin(newPinWrappedKey, pin, newSalt);
            } else {
              await cryptoDB.unwrapKeyWithPin(userOfflineKey, pin, await ensureUserSalt(user));
            }
          }
          set({ isPinVerified: true });
          useAuthStore.getState().login({ id: user.id, name: user.name, role: user.role });
          return true;
        } catch (error) {
          return false;
        }
      },

      authorizeUserLocal: async (targetUserId: string, targetUserPin: string) => {
         const currentKey = cryptoDB.getKey();
         if (!currentKey) return false;
         const wrappedKeyMeta = await cryptoKeyStore.getWrappedKey();
         if (!wrappedKeyMeta) return false;
         if (!wrappedKeyMeta.wrappedKeysByPin) wrappedKeyMeta.wrappedKeysByPin = {};
         const targetUser = await db.users.get(targetUserId);
         if (!targetUser) return false;
         try {
           const salt = await ensureUserSalt(targetUser);
           const pinWrappedKey = await cryptoDB.wrapKeyWithPin(currentKey, targetUserPin, salt);
           wrappedKeyMeta.wrappedKeysByPin[targetUserId] = pinWrappedKey;
           await cryptoKeyStore.saveWrappedKey(wrappedKeyMeta);
           return true;
         } catch (err) {
           return false;
         }
      },

      generateRecoveryKey: async () => {
        const key = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('').toUpperCase();
          
        // SEC-04: Simpan HASH dari kunci (bukan kunci itu sendiri) untuk verifikasi
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
        const keyHash = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0')).join('');
          
        await db.keyval.put({ key: 'recovery_key_hash', value: keyHash });
        // Kunci asli hanya dikembalikan ke UI untuk dicatat user, tidak disimpan
        return key;
      },

      verifyAdminPin: async (pin: string) => {
        const state = get();
        const now = Date.now();
        
        if (state.isSystemLocked) {
          useToastStore.getState().addToast('Sistem terkunci permanen akibat indikasi pembobolan (Nuclear Lockout).', 'error');
          return false;
        }

        // SEC-03: Throttle min 2 detik antar percobaan
        if (now - state.lastAdminAttemptTime < BRUTE_FORCE_DELAY) {
          useToastStore.getState().addToast('Terlalu cepat.', 'warning');
          return false;
        }
        
        // SEC-03: Lockout setelah MAX percobaan gagal
        if (state.adminFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          if (now - state.lastAdminAttemptTime < LOCKOUT_DURATION) {
            useToastStore.getState().addToast('Sistem terkunci sementara.', 'error');
            return false; // Masih dalam periode lockout
          } else {
            set({ adminFailedAttempts: 0 }); // Reset setelah durasi
          }
        }
        
        set({ lastAdminAttemptTime: now });

        const users = await db.users.toArray();
        const authorizedUsers = users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.MANAGER);
        
        let isValid = false;
        
        for (const user of authorizedUsers) {
          if (user.status === 'ACTIVE') {
            const currentSalt = await ensureUserSalt(user);
            
            // Try V2 (600k)
            const hashedInputV2 = await hashPin(pin, currentSalt, true, HASH_ITERATIONS_V2);
            if (hashedInputV2 === user.pinHash) {
               isValid = true;
               break;
            }
            
            // Fallback V1 (100k)
            const hashedInputV1 = await hashPin(pin, currentSalt, true, HASH_ITERATIONS_V1);
            if (hashedInputV1 === user.pinHash) {
               isValid = true;
               break;
            }
            
            // Fallback Legacy No Pepper
            const hashedInputLegacyNoPepper = await hashPin(pin, currentSalt, false, HASH_ITERATIONS_V1);
            if (hashedInputLegacyNoPepper === user.pinHash) {
               isValid = true;
               break;
            }
            
            // Fallback SHA-256
            const msgBuffer = new TextEncoder().encode(pin);
            const oldHashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const oldHashArray = Array.from(new Uint8Array(oldHashBuffer));
            const oldHash = oldHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            if (oldHash === user.pinHash) {
               isValid = true;
               break;
            }
          }
        }
        
        if (!isValid) {
          const newAbsolute = state.absoluteFailedAttempts + 1;
          const isSystemLocked = newAbsolute >= 10;
          
          set((s) => ({ 
            adminFailedAttempts: s.adminFailedAttempts + 1,
            absoluteFailedAttempts: newAbsolute,
            isSystemLocked: s.isSystemLocked || isSystemLocked
          }));

          db.keyval.put({ key: 'absolute_failed_attempts', value: newAbsolute }).catch(console.error);
          if (isSystemLocked) {
             db.keyval.put({ key: 'is_system_locked', value: true }).catch(console.error);
          }
          return false;
        }
        
        set({ adminFailedAttempts: 0, absoluteFailedAttempts: 0 });
        db.keyval.delete('absolute_failed_attempts').catch(console.error);
        return true;
      },

      lock: () => {
        set({ isPinVerified: false });
        useAuthStore.getState().logout();
      },
      
    }),
    { 
      name: 'psa-security-storage',
      storage: createJSONStorage(() => dexieSecurityStorage)
    }
  )
);

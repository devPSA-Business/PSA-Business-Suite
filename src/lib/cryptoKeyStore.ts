/**
 * @lockdown_status: CRITICAL_KEY_STORAGE
 * @warning: DO NOT MODIFY. This module handles the persistence of wrapped keys.
 * Changes here will break the ability to unwrap existing device keys.
 * @last_audit: 2026-04-19
 */
import { db } from '../shared/api/db';

export interface WrappedKeyMetadata {
  id: string; // e.g., 'primary_device_key'
  keyId: string; // Server-side identifier
  wrappedKeyBlob: string; // Server-wrapped
  wrappedKeysByPin?: Record<string, string>; // PIN-wrapped (multi-user mapping: userId -> wrappedKey)
  createdAt: number;
}

export const cryptoKeyStore = {
  async saveWrappedKey(metadata: WrappedKeyMetadata): Promise<void> {
    // Ensure the keys_meta table exists in your Dexie schema definition
    // e.g., keys_meta: 'id, keyId'
    await db.table('keys_meta').put(metadata);
  },

  async getWrappedKey(id: string = 'primary_device_key'): Promise<WrappedKeyMetadata | undefined> {
    return await db.table('keys_meta').get(id);
  },

  async clearWrappedKey(id: string = 'primary_device_key'): Promise<void> {
    await db.table('keys_meta').delete(id);
  }
};

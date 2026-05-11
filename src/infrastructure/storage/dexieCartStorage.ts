import { StateStorage } from 'zustand/middleware';
import { db } from '../../shared/api/db';

const DEBOUNCE_MS = 300; // Konstanta untuk debounce
let debounceTimer: NodeJS.Timeout | null = null;
let pendingState: string | null = null;

/**
 * Memaksa buffer memori untuk ditulis ke dalam IndexedDB.
 */
const flush = async () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (pendingState) {
    const stateToSave = pendingState;
    pendingState = null;
    try {
      await db.keyval.put({ key: 'pos-cart-storage', value: stateToSave });
    } catch (error) {
      console.error("Failed to flush cart state to Dexie:", error);
      if (!pendingState) pendingState = stateToSave; // Restore if failed
    }
  }
};

// Listener untuk menghindari kehilangan state jika tab ditutup sebelum debounce selesai
if (typeof window !== 'undefined') {
  const handleUnloadOrHide = () => {
    if (pendingState) {
      // Sinkronous Emergency Backup menggunakan localStorage telah dihapus 
      // demi keamanan (Forensic Audit v1.3.5)
      // Fire and forget
      flush().catch(() => {});
    }
  };

  window.addEventListener('beforeunload', handleUnloadOrHide);
  window.addEventListener('pagehide', handleUnloadOrHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      handleUnloadOrHide();
    }
  });
}

/**
 * Custom Dexie Storage Adapter untuk Zustand `persist` middleware.
 * Mencegah DataCloneError dan menghindari bottleneck eksekusi dengan Debouncer
 * I/O Buffer memori, serta mekanisme darurat saat `beforeunload`.
 */
export const dexieCartStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      // 1. Baca dari IndexedDB
      const record = await db.keyval.get(name);
      return (record?.value as string) || null;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      pendingState = value;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(flush, DEBOUNCE_MS);
    } catch (error) {
      console.error("Failed to setItem in dexieCartStorage:", error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await db.keyval.delete(name);
    } catch (error) {
      console.error("Failed to removeItem in dexieCartStorage:", error);
    }
  },
};


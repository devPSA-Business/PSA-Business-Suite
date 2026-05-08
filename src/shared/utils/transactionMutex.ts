/**
 * @ai_context    : Mutex sederhana untuk mencegah concurrent checkout (double-click) pada kasir yang sama.
 * @security_tier : HIGH
 */
const LOCKS = new Map<string, boolean>();

export function acquireLock(key: string): boolean {
  if (LOCKS.get(key)) return false;
  LOCKS.set(key, true);
  return true;
}

export function releaseLock(key: string): void {
  LOCKS.delete(key);
}

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!acquireLock(key)) {
    throw new Error('Transaksi sedang diproses. Silakan tunggu sebentar (Jangan klik 2 kali).');
  }
  try {
    return await fn();
  } finally {
    releaseLock(key);
  }
}

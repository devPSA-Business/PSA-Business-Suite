/**
 * @ai_context Memverifikasi konektivitas nyata ke Firestore sebelum sync dimulai.
 * @security_tier MEDIUM
 * @business_rule Cek ini wajib dilakukan sebelum setiap siklus upload agar
 *                tidak terjadi sync partial yang merusak integritas data.
 */
import { logger } from '../../../lib/logger';

export class SyncConnectivityChecker {
  /**
   * Verifikasi apakah device benar-benar bisa menjangkau Firestore.
   * navigator.onLine tidak cukup — bisa "online" tapi WiFi captive portal.
   */
  async isFirestoreReachable(): Promise<boolean> {
    if (!navigator.onLine) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3_000);
      await fetch('https://firestore.googleapis.com/', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return true;
    } catch {
      logger.warn('[SyncConnectivityChecker] Firestore tidak dapat dijangkau.');
      return false;
    }
  }
}

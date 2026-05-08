import { functions } from '../../shared/api/firebase';
import { httpsCallable } from 'firebase/functions';
import { logger } from '../../lib/logger';

/**
 * G-01 FIX: Service untuk mengirim alert/notifikasi via proxy (Cloud Function)
 * Client-side JANGAN PERNAH memiliki Token Bot Telegram.
 * 
 * @security_tier: HIGH
 * @ai_context: Dipanggil oleh App.tsx saat menerima 'SEND_ALERT' dari healthGuardian.worker.ts
 */
export class AlertService {
  /**
   * Mengirim pesan peringatan ke tim IT/Owner via Telegram melalui proxy.
   * Pastikan firebase-functions 'sendTelegramAlert' tersedia di backend.
   */
  async sendTelegramAlert(message: string): Promise<void> {
    try {
      if (!functions) {
        logger.warn('AlertService: Firebase functions not initialized, skipping alert:', message);
        return;
      }
      
      const sendAlertCallable = httpsCallable(functions, 'sendTelegramAlert');
      await sendAlertCallable({ message });
      logger.info('Alert dikirim ke eksternal berhasil.');
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Gagal mengirim alert ke eksternal:', { error: error.message });
      } else {
        logger.error('Gagal mengirim alert ke eksternal:', { error: String(error) });
      }
    }
  }
}

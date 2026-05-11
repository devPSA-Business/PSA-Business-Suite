import { logger } from '../../lib/logger';
import { functions } from '../../shared/api/firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * G-01 FIX: Service untuk mengirim alert/notifikasi via proxy (Node Express BFF)
 * Client-side JANGAN PERNAH memiliki Token Bot Telegram.
 * 
 * @security_tier: HIGH
 * @ai_context: Dipanggil oleh App.tsx saat menerima 'SEND_ALERT' dari healthGuardian.worker.ts
 */
export class AlertService {
  /**
   * Mengirim pesan peringatan ke tim IT/Owner via Telegram melalui proxy.
   */
  async sendTelegramAlert(message: string): Promise<void> {
    try {
      if (!functions) throw new Error('Firebase Functions is not initialized.');
      const sendAlertCallable = httpsCallable(functions, 'sendTelegramAlert');
      await sendAlertCallable({ message, level: 'warn', action: 'ALERT' });
      
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

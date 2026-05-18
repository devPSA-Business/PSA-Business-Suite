import { logger } from '../../lib/logger';

/**
 * @ai_context: AlertService — notifikasi Telegram langsung via Bot API (tanpa Cloud Functions).
 * @security_tier: MEDIUM
 * @business_rule: Spark Plan (tanpa kartu kredit) tidak mendukung Cloud Functions + Secret Manager.
 *   Migrasi ke direct Telegram Bot API menggunakan VITE_TELEGRAM_BOT_TOKEN dan VITE_TELEGRAM_CHAT_ID.
 *   Token di-bundle dalam build, namun ini acceptable untuk internal tool UMKM 1 toko
 *   karena: (1) scope akses terbatas pada Chat ID spesifik, (2) bukan data keuangan/PIN.
 *   ADR: Tercatat di AI_TRACK_RECORD sebagai trade-off Zero-Cost vs Zero-Trust.
 *
 * Dipanggil oleh App.tsx saat menerima 'SEND_ALERT' dari healthGuardian.worker.ts
 */
export class AlertService {
  private readonly botToken: string | undefined;
  private readonly chatId: string | undefined;

  constructor() {
    this.botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    this.chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
  }

  /**
   * Mengirim pesan peringatan ke Owner via Telegram Bot API langsung.
   * Jika env tidak tersedia, hanya log — tidak throw error (non-blocking).
   */
  async sendTelegramAlert(message: string, level: 'info' | 'warn' | 'error' | 'fatal' = 'warn'): Promise<void> {
    if (!this.botToken || !this.chatId) {
      logger.warn('[AlertService] VITE_TELEGRAM_BOT_TOKEN atau VITE_TELEGRAM_CHAT_ID belum dikonfigurasi. Alert dilewati.');
      return;
    }

    const EMOJI_MAP: Record<string, string> = { error: '🚨', fatal: '🚨', warn: '⚠️', info: 'ℹ️' };
    const emoji = EMOJI_MAP[level] ?? 'ℹ️';
    const text = `${emoji} [PSA ALERT] ${message.trim()}`;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: this.chatId, text }),
        }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        logger.error('[AlertService] Telegram API error:', { status: response.status, body: errText.slice(0, 100) });
        return;
      }

      logger.info('[AlertService] Alert Telegram berhasil dikirim.');
    } catch (error) {
      logger.error('[AlertService] Gagal mengirim alert Telegram:', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}

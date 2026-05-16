import * as functions from 'firebase-functions';
import fetch from 'node-fetch';

/**
 * @ai_context Service notifikasi Telegram untuk monitoring sistem PSA.
 * @security_tier HIGH
 * @business_rule Hanya pengguna TERAUTENTIKASI (role ADMIN/MANAGER) yang boleh memanggil.
 *                Mencegah spam alert dari user tidak terotorisasi.
 */
export const sendTelegramAlert = functions
  .runWith({ secrets: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'] })
  .https.onCall(async (data, context) => {

    // ─── AUTH GUARD (P0) ────────────────────────────────────────────────────
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Fungsi ini hanya dapat dipanggil oleh pengguna yang telah terautentikasi.',
      );
    }

    // Hanya ADMIN atau MANAGER yang boleh kirim alert
    const role = context.auth.token?.role as string | undefined;
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Hanya ADMIN atau MANAGER yang dapat mengirim notifikasi sistem.',
      );
    }

    // ─── ENV GUARD ──────────────────────────────────────────────────────────
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Konfigurasi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID belum diset.',
      );
    }

    // ─── INPUT VALIDATION ───────────────────────────────────────────────────
    const { action, message, level } = data as {
      action?: string;
      message?: string;
      level?: 'info' | 'warn' | 'error' | 'fatal';
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Field "message" wajib diisi.');
    }

    const EMOJI_MAP: Record<string, string> = { error: '🚨', fatal: '🚨', warn: '⚠️', info: 'ℹ️' };
    const emoji = EMOJI_MAP[level ?? 'info'] ?? 'ℹ️';
    const text = `${emoji} [${action ?? 'SYSTEM'}] ${message.trim()}`;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
        },
      );

      if (!response.ok) {
        throw new functions.https.HttpsError('internal', `Telegram API error: ${response.statusText}`);
      }

      functions.logger.info('[sendTelegramAlert] Alert sent', { uid: context.auth!.uid, action });
      return { success: true };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      functions.logger.error('[sendTelegramAlert] Failed', error);
      throw new functions.https.HttpsError('internal', 'Gagal mengirim notifikasi Telegram.');
    }
  });

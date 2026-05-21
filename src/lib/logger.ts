/**
 * @ai_context Logger terpusat PSA Business Suite dengan PII sanitization dan Telegram FATAL alert.
 * @security_tier HIGH
 * @business_rule Zero-Trust logging: semua PII (email, phone, name, dll) wajib disanitasi
 *               sebelum dikirim ke output manapun. Level FATAL memicu Telegram alert real-time.
 * @data-component-id: logger
 * @data-error-domain: system
 * @changelog:
 *   2026-05-20 — P3: Tambah logger.fatal() dengan Telegram alert via AlertService
 *                    Throttling 30 detik untuk mencegah spam alert
 *                    Lazy import AlertService untuk menghindari circular dependency
 */

const SANITIZE_KEYS = [
  'email', 'phone', 'address', 'customerName', 'nik', 'pin', 'password',
  'recipient', 'message', 'note', 'details', 'phone_number', 'email_address'
];

function sanitize(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitize(item));
  }

  const newObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SANITIZE_KEYS.includes(key)) {
      newObj[key] = '<<PII_REMOVED>>';
    } else {
      newObj[key] = sanitize(value);
    }
  }
  return newObj;
}

/** Throttle: timestamp FATAL alert terakhir dikirim (mencegah spam Telegram) */
let _lastFatalAlertTime = 0;
const FATAL_THROTTLE_MS = 30_000; // 30 detik

/**
 * Kirim Telegram alert untuk FATAL error — fire-and-forget, non-blocking.
 * Lazy import AlertService untuk menghindari circular dependency di bootstrap.
 */
async function _sendFatalTelegramAlert(message: string, meta: unknown): Promise<void> {
  const now = Date.now();
  if (now - _lastFatalAlertTime < FATAL_THROTTLE_MS) {
    // Throttled — log ke console saja, jangan kirim Telegram lagi
    console.warn('[Logger] FATAL alert throttled — too frequent', { message });
    return;
  }
  _lastFatalAlertTime = now;

  try {
    // Lazy import untuk mencegah circular dep saat logger digunakan di bootstrap app
    const { AlertService } = await import('../infrastructure/services/AlertService');
    const alertService = new AlertService();

    // Bangun pesan singkat, pastikan tidak ada PII
    const sanitizedMeta = meta !== undefined
      ? sanitize(meta as Record<string, unknown>)
      : undefined;
    const metaSummary = sanitizedMeta
      ? ` | Meta: ${JSON.stringify(sanitizedMeta).slice(0, 200)}`
      : '';

    await alertService.sendTelegramAlert(
      `[FATAL] ${message}${metaSummary}`,
      'fatal'
    );
  } catch (alertErr) {
    // Jangan throw dari dalam alert — logger.fatal tidak boleh crash app
    console.error('[Logger] Gagal kirim FATAL alert ke Telegram:', alertErr);
  }
}

export const logger = {
  info: (message: string | unknown, meta?: unknown) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error ? { error: meta.message } : (typeof meta === 'object' && meta !== null ? sanitize(meta as Record<string, unknown>) : { data: meta });
    console.info(JSON.stringify({ level: 'info', message: msg, timestamp: new Date().toISOString(), ...(m as object) }));
  },

  warn: (message: string | unknown, meta?: unknown) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error ? { error: meta.message } : (typeof meta === 'object' && meta !== null ? sanitize(meta as Record<string, unknown>) : { data: meta });
    console.warn(JSON.stringify({ level: 'warn', message: msg, timestamp: new Date().toISOString(), ...(m as object) }));
  },

  error: (message: string | unknown, meta?: unknown) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error ? { error: meta.message, stack: meta.stack } : (typeof meta === 'object' && meta !== null ? sanitize(meta as Record<string, unknown>) : { data: meta });
    console.error(JSON.stringify({ level: 'error', message: msg, timestamp: new Date().toISOString(), ...(m as object) }));
  },

  debug: (message: string | unknown, meta?: unknown) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error ? { error: meta.message } : (typeof meta === 'object' && meta !== null ? sanitize(meta as Record<string, unknown>) : { data: meta });
    console.debug(JSON.stringify({ level: 'debug', message: msg, timestamp: new Date().toISOString(), ...(m as object) }));
  },

  /**
   * Level FATAL: untuk kondisi kritis yang membutuhkan perhatian owner segera.
   * Otomatis mengirim Telegram alert via AlertService (throttled 30 detik).
   *
   * Gunakan untuk:
   * - Kegagalan enkripsi / dekripsi database
   * - Kegagalan autentikasi Firebase berulang
   * - Corruption data terdeteksi (hash chain mismatch)
   * - Nuclear lockout / database reset
   *
   * Jangan gunakan untuk: error bisnis biasa, validasi input, timeout jaringan sementara.
   *
   * @example
   * logger.fatal('Hash chain rusak — kemungkinan manipulasi data', { lastValidHash, corruptId });
   */
  fatal: (message: string | unknown, meta?: unknown) => {
    const msg = message instanceof Error ? message.message : (typeof message === 'string' ? message : String(message));
    const m = meta instanceof Error
      ? { error: meta.message, stack: meta.stack }
      : (typeof meta === 'object' && meta !== null ? sanitize(meta as Record<string, unknown>) : { data: meta });

    // 1. Log ke console dengan level 'fatal' (struktural, bisa dicapture oleh error tracking)
    console.error(JSON.stringify({ level: 'fatal', message: msg, timestamp: new Date().toISOString(), ...(m as object) }));

    // 2. Kirim Telegram alert — fire-and-forget, tidak memblokir caller
    void _sendFatalTelegramAlert(msg, meta);
  },
};

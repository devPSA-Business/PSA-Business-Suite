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
 *   2026-05-27 — BACKLOG-03: Tambah initGlobalErrorHandlers() untuk capture
 *                    unhandledrejection dan uncaughtError — mencegah silent failures.
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

/**
 * BACKLOG-03: Inisialisasi global error handlers untuk capture promise rejections
 * dan error yang tidak tertangani. Dipanggil SEKALI di main.tsx saat bootstrap.
 *
 * Tanpa ini, error async yang tidak ada try-catch-nya akan "hilang" secara senyap
 * — tidak terlog, tidak ada Telegram alert, tidak bisa di-diagnosa.
 *
 * @example // main.tsx
 *   import { initGlobalErrorHandlers } from './lib/logger';
 *   initGlobalErrorHandlers();
 */
export function initGlobalErrorHandlers(): void {
  // Guard: jangan register lebih dari sekali
  if ((window as Window & { __PSA_GLOBAL_HANDLERS_INIT__?: boolean }).__PSA_GLOBAL_HANDLERS_INIT__) {
    return;
  }
  (window as Window & { __PSA_GLOBAL_HANDLERS_INIT__?: boolean }).__PSA_GLOBAL_HANDLERS_INIT__ = true;

  // 1. Promise rejection yang tidak ada .catch() handler-nya
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const msg = reason instanceof Error
      ? reason.message
      : (typeof reason === 'string' ? reason : JSON.stringify(reason));

    logger.error('[UnhandledRejection] Promise gagal tanpa handler', {
      reason: msg,
      stack: reason instanceof Error ? reason.stack : undefined,
    });

    // Kirim fatal alert jika terlihat seperti error kritis (bukan timeout biasa)
    const isCritical = msg.toLowerCase().includes('quota') ||
      msg.toLowerCase().includes('crypto') ||
      msg.toLowerCase().includes('corrupt') ||
      msg.toLowerCase().includes('nuclear') ||
      msg.toLowerCase().includes('dexie');

    if (isCritical) {
      logger.fatal('[UnhandledRejection] Error kritis terdeteksi — perlu investigasi', {
        reason: msg,
      });
    }
  });

  // 2. Synchronous error global (sangat jarang di React, tapi safety net)
  window.addEventListener('error', (event: ErrorEvent) => {
    logger.error('[UncaughtError] Error global tidak tertangani', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error instanceof Error ? event.error.message : String(event.error),
    });
  });
}

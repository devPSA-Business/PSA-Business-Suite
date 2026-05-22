/**
 * @ai_context: Modul inisialisasi Sentry untuk error monitoring & session tracking.
 * @security_tier: MEDIUM
 * @business_rule: Sentry HANYA aktif jika VITE_SENTRY_DSN tersedia (opsional, zero-cost mode).
 *                 Tanpa DSN, modul ini no-op — aplikasi tetap berjalan normal.
 *                 PII (email, nama, PIN) TIDAK PERNAH dikirim ke Sentry.
 * @data-component-id: sentry-monitoring
 * @data-error-domain: system
 *
 * CARA AKTIVASI:
 *   1. Buat akun Sentry free di sentry.io (5.000 errors/bulan gratis)
 *   2. Buat project → salin DSN
 *   3. Tambah VITE_SENTRY_DSN ke GitHub Secrets
 *   4. Deploy ulang — monitoring aktif otomatis
 *
 * TANPA SENTRY (current mode):
 *   - logger.fatal() sudah mengirim alert ke Telegram (real-time)
 *   - ErrorBoundary.tsx menangkap React render errors
 *   - Ini sudah cukup untuk skala UMKM 1 toko
 *
 * @changelog:
 *   2026-05-21 — Dibuat sebagai modul opsional — Production Readiness Gap PRG-02
 */

/** Cek apakah Sentry dikonfigurasi */
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const IS_PROD    = import.meta.env.PROD === true;

/**
 * Inisialisasi Sentry. Dipanggil sekali di App.tsx saat bootstrap.
 * No-op jika VITE_SENTRY_DSN tidak dikonfigurasi.
 */
export async function initSentry(): Promise<void> {
  if (!SENTRY_DSN || !IS_PROD) {
    // DEV mode atau DSN tidak dikonfigurasi — skip Sentry, gunakan Telegram alert saja
    return;
  }

  try {
    // Dynamic import agar Sentry tidak masuk bundle jika DSN kosong
    const Sentry = await import('@sentry/react');

    Sentry.init({
      dsn: SENTRY_DSN,
      environment: 'production',
      release: `psa-business-suite@${import.meta.env.VITE_APP_VERSION || '1.5.0'}`,

      // Performance: sample 10% transaksi (hemat quota free tier)
      tracesSampleRate: 0.1,

      // Session Replay: tidak diaktifkan (data sensitif toko perhiasan)
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,

      // Integrations minimal — hanya error reporting
      integrations: [
        Sentry.browserTracingIntegration(),
      ],

      // Filter: jangan kirim error network biasa (offline-first app — ini normal)
      ignoreErrors: [
        'NetworkError',
        'Failed to fetch',
        'Load failed',
        'ChunkLoadError',      // service worker update — normal
        'AbortError',          // user navigasi saat request masih berjalan
        /ResizeObserver loop/, // false positive browser warning
      ],

      beforeSend(event) {
        // PII Safety: hapus user context dan breadcrumbs sebelum kirim ke Sentry
        // Breadcrumbs dapat berisi nama pelanggan / HP — dihapus seluruhnya
        delete event.user;
        event.breadcrumbs = undefined;
        return event;
      },
    });

    console.info('[Sentry] Monitoring aktif.');
  } catch (err) {
    // Sentry gagal load — jangan crash aplikasi utama
    console.warn('[Sentry] Gagal inisialisasi (non-fatal):', err);
  }
}

/**
 * Tangkap error manual ke Sentry (dipakai di logger.fatal).
 * No-op jika Sentry tidak dikonfigurasi.
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
  if (!SENTRY_DSN || !IS_PROD) return;

  // Dynamic import sudah cache setelah initSentry() — aman dipanggil berulang
  import('@sentry/react').then((Sentry) => {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        source: 'psa-logger-fatal',
        domain: 'psa-business-suite',
      },
    });
  }).catch(() => { /* silent */ });
}

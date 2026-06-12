import { ErrorInfo } from 'react';
import { db } from '../api/db';
import { logger } from '../../lib/logger';

/**
 * persistError — Wrapper untuk menyimpan error aplikasi ke IndexedDB (sync_events)
 * agar dapat di-sync ke Firestore dan di-monitor.
 *
 * BERBEDA dari `src/lib/logger.ts` yang hanya merupakan runtime logger (console + Telegram).
 * File ini adalah persistence layer untuk error boundary & UI error tracking.
 *
 * Jangan import `src/lib/logger.ts` langsung dari UI — gunakan `persistError` dari sini.
 *
 * @deprecated Alias `logError` tetap diekspor untuk backward-compatibility ErrorBoundary.
 */
export const persistError = async (error: Error, errorInfo?: ErrorInfo, user: string = 'unknown') => {
  const errorPayload = {
    user,
    message: (error instanceof Error ? error.message : String(error)),
    componentStack: errorInfo?.componentStack,
    stack: error.stack,
    timestamp: Date.now()
  };

  // Tetap log ke console menggunakan logger tersanitasi
  logger.error("APP_ERROR_LOG", errorPayload);

  // Simpan ke IndexedDB untuk di sync ke Firestore (Visibility error di production)
  try {
    // Sanitasi payload sebelum simpan ke DB (Redundansi keamanan)
    const sanitizedPayload = JSON.parse(JSON.stringify(errorPayload));
    if (sanitizedPayload.message) {
      sanitizedPayload.message = sanitizedPayload.message
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '<<PII_REMOVED>>')
        .replace(/\b\d{16}\b/g, '<<PII_REMOVED>>') // NIK (16 digit)
        .replace(/\+?\d{8,15}/g, '<<PII_REMOVED>>');
    }
    
    await db.sync_events.add({
      entity_type: 'error_log',
      action: 'INSERT',
      payload: sanitizedPayload,
      status: 'PENDING',
      timestamp: Date.now()
    });
  } catch (e) {
    logger.error("Gagal mencatat error ke DB", e);
  }
};

/** @deprecated Gunakan persistError. Alias ini akan dihapus di v1.6. */
export const logError = persistError;


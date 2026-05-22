/**
 * @ai_context Backup Manager — ekspor/impor database terenkripsi PSA Business Suite.
 * @security_tier HIGH
 * @business_rule Backup wajib terenkripsi sebelum tersimpan di storage manapun.
 *   Auto-backup lokal disimpan di IndexedDB (db.keyval) — maksimal 3 backup rotasi.
 *   Physical backup (.psa) disimpan ke folder pilihan user via File System Access API.
 * @data-component-id: backup-manager
 * @data-error-domain: backup
 * @changelog:
 *   2026-05-20 — P3: Tambah savePhysicalBackup() menggunakan File System Access API
 *                    Proteksi terhadap IndexedDB cache clearing oleh browser/OS
 *                    Graceful fallback ke download biasa jika API tidak tersedia
 *                    Tambah isFileSystemAccessSupported() untuk deteksi capability
 */
import { cryptoDB } from '../../lib/cryptoIndexedDB';
import { DIContainer } from '../../infrastructure/di/Container';
import { logger } from '../../lib/logger';

export interface BackupStatus {
  status: 'idle' | 'processing' | 'success' | 'error';
  error?: string;
  blob?: Blob;
}

/**
 * Deteksi apakah File System Access API tersedia di browser/OS ini.
 * Chrome/Edge di Android & Desktop: tersedia.
 * Firefox & Safari iOS: TIDAK tersedia (akan fallback ke download biasa).
 */
function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

export class BackupManager {
  private static instance: BackupManager;
  private worker: Worker | null = null;

  private constructor() {}

  static getInstance(): BackupManager {
    if (!this.instance) {
      this.instance = new BackupManager();
    }
    return this.instance;
  }

  /**
   * Menjalankan proses export database lokal terenkripsi → Blob
   */
  async exportTerenkripsi(passphrase: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        this.worker = new Worker(new URL('../../workers/backup.worker.ts', import.meta.url), {
          type: 'module',
        });
      }

      const timeout = setTimeout(() => {
        reject(new Error('Proses backup melampaui batas waktu (timeout).'));
      }, 60000);

      this.worker.onmessage = (e) => {
        const { status, blob, error } = e.data as { status: string; blob?: Blob; error?: string };
        clearTimeout(timeout);
        if (status === 'success' && blob) {
          DIContainer.unitOfWork.registerAudit(
            'MANUAL_BACKUP_EXPORTED',
            'Sistem',
            'Pengeksporan database lokal terenkripsi berhasil dilakukan.'
          ).catch(err => logger.warn('[BackupManager] Gagal audit export:', { error: String(err) }));
          resolve(blob);
        } else {
          reject(new Error(error || 'Gagal mengenkripsi data.'));
        }
      };

      this.worker.onerror = (err) => {
        clearTimeout(timeout);
        reject(new Error('Worker error: ' + (err instanceof Error ? err.message : String(err))));
      };

      this.worker.postMessage({ action: 'export', passphrase });
    });
  }

  /**
   * Menjalankan proses import database dari file terenkripsi
   */
  async importTerenkripsi(file: File, passphrase: string): Promise<void> {
    const fileBuffer = await file.arrayBuffer();

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        this.worker = new Worker(new URL('../../workers/backup.worker.ts', import.meta.url), {
          type: 'module',
        });
      }

      this.worker.onmessage = (e) => {
        const { status, error } = e.data as { status: string; error?: string };
        if (status === 'success') {
          DIContainer.unitOfWork.registerAudit(
            'MANUAL_BACKUP_IMPORTED',
            'Sistem',
            'Pemulihan database lokal dari file backup berhasil dilakukan.'
          ).catch(err => logger.warn('[BackupManager] Gagal audit import:', { error: String(err) }));
          resolve();
        } else {
          reject(new Error(error || 'Gagal memulihkan data. PIN mungkin salah.'));
        }
      };

      this.worker.postMessage({ action: 'import', fileData: fileBuffer, passphrase });
    });
  }

  /**
   * P3 Remediation: Simpan backup .psa ke storage fisik perangkat via File System Access API.
   *
   * Solusi untuk: IndexedDB dapat di-clear oleh browser (settings → clear storage),
   * cache eviction pada low storage, atau reset perangkat. File .psa di folder pilihan
   * user (Downloads, Drive-synced folder, dll) persisten terhadap browser clear.
   *
   * @param blob - Blob backup terenkripsi dari exportTerenkripsi()
   * @param filename - Nama file yang disarankan (default: psa-backup-YYYY-MM-DD.psa)
   * @returns 'file-system-api' jika berhasil via picker, 'download-fallback' jika via download biasa
   */
  async savePhysicalBackup(
    blob: Blob,
    filename?: string
  ): Promise<'file-system-api' | 'download-fallback'> {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const safeFilename = filename ?? `psa-backup-${date}.psa`;

    if (isFileSystemAccessSupported()) {
      try {
        // File System Access API — user memilih folder sendiri (bisa Downloads, OneDrive, dll)
        const fileHandle = await (window as unknown as Window & {
          showSaveFilePicker: (options: unknown) => Promise<{
            createWritable: () => Promise<{
              write: (blob: Blob) => Promise<void>;
              close: () => Promise<void>;
            }>;
          }>;
        }).showSaveFilePicker({
          suggestedName: safeFilename,
          types: [
            {
              description: 'PSA Business Suite Backup',
              accept: { 'application/octet-stream': ['.psa'] },
            },
          ],
          startIn: 'downloads',
        });

        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        logger.info('[BackupManager] Physical backup berhasil disimpan via File System Access API.', {
          filename: safeFilename,
        });

        await DIContainer.unitOfWork.registerAudit(
          'PHYSICAL_BACKUP_SAVED',
          'Sistem',
          `Backup fisik berhasil disimpan ke perangkat: ${safeFilename} (File System Access API)`
        ).catch(() => {});

        return 'file-system-api';
      } catch (err) {
        // User membatalkan picker → tidak dianggap error, hanya log
        if (err instanceof Error && err.name === 'AbortError') {
          logger.info('[BackupManager] User membatalkan save dialog — tidak ada file disimpan.');
          throw err; // Re-throw agar caller bisa tahu user cancel
        }
        // Error lain → fallback ke download biasa
        logger.warn('[BackupManager] File System Access API gagal, fallback ke download:', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Fallback: download biasa (href + a.click) — universal support
    this.downloadBlob(blob, safeFilename);
    logger.info('[BackupManager] Physical backup disimpan via download fallback.', { filename: safeFilename });

    await DIContainer.unitOfWork.registerAudit(
      'PHYSICAL_BACKUP_SAVED',
      'Sistem',
      `Backup fisik berhasil diunduh: ${safeFilename} (download fallback)`
    ).catch(() => {});

    return 'download-fallback';
  }

  /**
   * Auto-backup ke IndexedDB (rotasi 3 backup terakhir).
   * Dipanggil otomatis saat tutup shift.
   */
  async autoBackupLocal(): Promise<void> {
    try {
      if (!this.worker) {
        this.worker = new Worker(new URL('../../workers/backup.worker.ts', import.meta.url), {
          type: 'module',
        });
      }

      const exportedKey = cryptoDB.getRawDeviceKey();
      if (!exportedKey) {
        // Normal — user belum login/unlock PIN
        return;
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Auto backup timeout')), 60000);
        const listener = (e: MessageEvent) => {
          clearTimeout(timeout);
          this.worker!.removeEventListener('message', listener);
          const { status, blob: b, error } = e.data as { status: string; blob?: Blob; error?: string };
          if (status === 'success' && b) {
            resolve(b);
          } else {
            reject(new Error(error || 'Failed'));
          }
        };
        this.worker!.addEventListener('message', listener);
        this.worker!.postMessage({ action: 'export', keyMaterial: exportedKey });
      });

      const buffer = await blob.arrayBuffer();
      const timestamp = Date.now();
      const backupKey = `auto_backup_${timestamp}`;

      const { db } = await import('../../shared/api/db');
      await db.keyval.put({ key: backupKey, value: buffer, timestamp });

      // Rotasi: pertahankan hanya 3 backup terbaru
      const allKeys = await db.keyval.toArray();
      const backupKeys = allKeys.filter(k => typeof k.key === 'string' && (k.key as string).startsWith('auto_backup_'));
      if (backupKeys.length > 3) {
        backupKeys.sort((a, b) => ((a.timestamp as number) || 0) - ((b.timestamp as number) || 0));
        const toDelete = backupKeys.slice(0, backupKeys.length - 3);
        for (const item of toDelete) {
          await db.keyval.delete(item.key as string);
        }
      }
    } catch (e) {
      logger.warn('[BackupManager] Auto backup local gagal (non-critical):', {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  /**
   * Trigger download file ke browser user (fallback universal).
   * Untuk ekspor dengan picker, gunakan savePhysicalBackup().
   */
  downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /** Kembalikan status dukungan File System Access API di browser saat ini */
  get supportsFileSystemAccess(): boolean {
    return isFileSystemAccessSupported();
  }
}

export const backupManager = BackupManager.getInstance();

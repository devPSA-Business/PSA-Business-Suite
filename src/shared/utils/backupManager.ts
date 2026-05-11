import { cryptoDB } from '../../lib/cryptoIndexedDB';
import { DIContainer } from '../../infrastructure/di/Container';

/**
 * PSA Business Suite: Backup Manager
 * Mengelola komunikasi dengan backup.worker.ts untuk enkripsi data offline.
 */

export interface BackupStatus {
  status: 'idle' | 'processing' | 'success' | 'error';
  error?: string;
  blob?: Blob;
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
   * Menjalankan proses export database lokal terenkripsi
   */
  async exportTerenkripsi(passphrase: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        this.worker = new Worker(new URL('../../workers/backup.worker.ts', import.meta.url), {
          type: 'module'
        });
      }

      const timeout = setTimeout(() => {
        reject(new Error('Proses backup melampaui batas waktu (timeout).'));
      }, 60000);

      this.worker.onmessage = (e) => {
        const { status, blob, error } = e.data;
        clearTimeout(timeout);
        
        if (status === 'success' && blob) {
          // Log Audit (Local only, will be synced if online)
          DIContainer.unitOfWork.registerAudit(
            'MANUAL_BACKUP_EXPORTED',
            'Sistem',
            'Pengeksporan database lokal terenkripsi berhasil dilakukan.'
          ).catch(console.error);
          
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
          type: 'module'
        });
      }

      this.worker.onmessage = (e) => {
        const { status, error } = e.data;
        if (status === 'success') {
          DIContainer.unitOfWork.registerAudit(
            'MANUAL_BACKUP_IMPORTED',
            'Sistem',
            'Pemulihan database lokal dari file backup berhasil dilakukan.'
          ).catch(console.error);
          resolve();
        } else {
          reject(new Error(error || 'Gagal memulihkan data. PIN mungkin salah.'));
        }
      };

      this.worker.postMessage({ action: 'import', fileData: fileBuffer, passphrase });
    });
  }

  /**
   * Menjalankan proses auto backup ke IndexedDB (menyimpan 3 backup terakhir)
   */
  async autoBackupLocal(): Promise<void> {
    try {
      if (!this.worker) {
        this.worker = new Worker(new URL('../../workers/backup.worker.ts', import.meta.url), {
          type: 'module'
        });
      }

      // Gunakan kunci enkripsi perangkat mentah untuk proses backup
      const exportedKey = cryptoDB.getRawDeviceKey();
      if (!exportedKey) {
        // Bukan error, user belum login/unlock PIN
        return;
      }
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Auto backup timeout')), 60000);
        
        const listener = (e: MessageEvent) => {
          clearTimeout(timeout);
          this.worker!.removeEventListener('message', listener);
          if (e.data.status === 'success') {
            resolve(e.data.blob);
          } else {
            reject(new Error(e.data.error || 'Failed'));
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
      
      const allKeys = await db.keyval.toArray();
      const backupKeys = allKeys.filter(k => typeof k.key === 'string' && (k.key as string).startsWith('auto_backup_'));
      
      if (backupKeys.length > 3) {
        backupKeys.sort((a, b) => (a.timestamp as number) - (b.timestamp as number));
        const toDelete = backupKeys.slice(0, backupKeys.length - 3);
        for (const item of toDelete) {
          await db.keyval.delete(item.key as string);
        }
      }
    } catch (e) {
      console.error('Auto backup failed:', e);
    }
  }

  /**
   * Trigger download file ke browser user
   */
  downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const backupManager = BackupManager.getInstance();

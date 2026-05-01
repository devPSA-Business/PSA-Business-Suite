export class SecureBackupService {
  /**
   * Export the database securely using Web Worker.
   * Returns a URL to the Blob for downloading.
   */
  static async exportDatabase(passphrase: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Using Vite's ?worker import syntax requires generating a worker dynamically 
      // or we can instantiate via basic Worker
      const workerUrl = new URL('../../workers/backup.worker.ts', import.meta.url);
      const worker = new Worker(workerUrl, { type: 'module' });

      worker.onmessage = (e) => {
        const { status, blob, error } = e.data;
        if (status === 'success') {
          const url = URL.createObjectURL(blob);
          resolve(url);
        } else {
          reject(new Error(error));
        }
        worker.terminate();
      };

      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };

      worker.postMessage({ action: 'export', passphrase });
    });
  }

  /**
   * Import the database securely using Web Worker.
   */
  static async importDatabase(fileData: ArrayBuffer, passphrase: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const workerUrl = new URL('../../workers/backup.worker.ts', import.meta.url);
      const worker = new Worker(workerUrl, { type: 'module' });

      worker.onmessage = (e) => {
        const { status, error } = e.data;
        if (status === 'success') {
          resolve();
        } else {
          reject(new Error(error));
        }
        worker.terminate();
      };

      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };

      worker.postMessage({ action: 'import', fileData, passphrase });
    });
  }
}

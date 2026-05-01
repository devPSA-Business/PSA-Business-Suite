import { metrics } from '../../lib/metrics';

/**
 * @file ScaleService.ts
 * @description Integrasi Timbangan Digital via WebSerial API
 */
export class ScaleService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private port: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private reader: any = null;

  async connect(): Promise<void> {
    if (!('serial' in navigator)) {
      throw new Error('Browser Anda tidak mendukung WebSerial API. Gunakan Google Chrome atau Edge versi terbaru.');
    }
    const start = performance.now();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: 9600 }); // Baud rate standar timbangan emas
      metrics.histogram('hardware_connection_duration_ms', performance.now() - start, { hardware: 'scale', status: 'success' });
      metrics.increment('hardware_connection_total', { hardware: 'scale', status: 'success' });
    } catch (error) {
      metrics.histogram('hardware_connection_duration_ms', performance.now() - start, { hardware: 'scale', status: 'error' });
      metrics.increment('hardware_connection_total', { hardware: 'scale', status: 'error' });
      throw new Error('Gagal menghubungkan timbangan. Pastikan kabel USB terpasang dan tidak digunakan oleh aplikasi lain.');
    }
  }

  async readWeight(): Promise<number> {
    if (!this.port) throw new Error('Timbangan belum terhubung.');

    try {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      let buffer = '';
      const timeoutMs = 5000;
      const startTime = Date.now();

      while (true) {
        const remainingTime = timeoutMs - (Date.now() - startTime);
        if (remainingTime <= 0) {
          throw new Error('Timeout pembacaan timbangan');
        }

        const readPromise = this.reader.read();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout pembacaan timbangan')), remainingTime)
        );

        const { value, done } = await Promise.race([readPromise, timeoutPromise]) as { value: string, done: boolean };

        if (done) throw new Error('Koneksi terputus.');

        buffer += value;

        // Pencegahan Buffer Overrun: Timbangan normal mengirim ~20 byte per baris.
        // Jika buffer melebihi 1024 byte tanpa newline, maka yang masuk adalah noise/sampah.
        if (buffer.length > 1024) {
          buffer = '';
          throw new Error('Overrun Data: Timbangan mengirim noise. Periksa kabel atau spesifikasi baud rate.');
        }

        if (buffer.includes('\n') || buffer.includes('\r')) {
          const lines = buffer.split(/[\r\n]+/);
          const rawData = lines[0].trim();
          const weightMatch = rawData.match(/(\d+\.\d+|\d+)/);
          
          if (!weightMatch) throw new Error('Format data timbangan tidak dikenali.');

          return parseFloat(weightMatch[0]);
        }
      }
    } catch (error) {
      console.error('[ScaleService] Read Error:', error);
      throw error instanceof Error ? error : new Error('Gagal membaca data dari timbangan.');
    } finally {
      if (this.reader) {
        this.reader.releaseLock();
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.reader) await this.reader.cancel();
    if (this.port) await this.port.close();
    this.port = null;
  }
}

export const scaleService = new ScaleService();

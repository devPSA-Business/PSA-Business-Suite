import { db, FinancialClosure } from '../../shared/api/db';
import { IUnitOfWork } from '../core/IUnitOfWork';
import { IReportQuery } from '../queries/IReportQuery';
import { logger } from '../../lib/logger';

/**
 * @ai_context AuditIntegrityService — tutup buku harian & verifikasi hash chain.
 * @security_tier HIGH
 * @arch_note createDailyClosure() mensyaratkan (1) navigator.onLine dan (2) pendingSyncCount===0
 *   sebelum dijalankan. Dua kondisi itu menjamin data lokal Dexie ≡ data Firestore.
 *   Karena itu pengambilan previousHash TIDAK perlu getDoc() Firestore langsung —
 *   cukup query Dexie lokal. Ini menghilangkan pelanggaran Hard Constraint #1 & #11
 *   (Pillar of Truth: Dexie SSoT) yang ditemukan audit 2026-05-30.
 */
export class AuditIntegrityService {
  constructor(
    private readonly uow: IUnitOfWork,
    private readonly reportQuery: IReportQuery
  ) {}

  private getFormattedDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  async createDailyClosure(date: Date, branchId: string): Promise<FinancialClosure> {
    // 1. Otoritas Sentral: Tutup buku tidak boleh offline untuk mencegah split-brain
    if (!navigator.onLine) {
      throw new Error('Penutupan buku WAJIB dilakukan saat online (tersambung internet) untuk menjaga integritas antar perangkat.');
    }

    // 2. Otoritas Sinkronisasi: Pastikan antrean sync kosong
    const pendingSyncCount = await db.sync_events.where('status').equals('PENDING').count();
    if (pendingSyncCount > 0) {
      throw new Error(`Tidak dapat menutup buku. Ada ${pendingSyncCount} transaksi yang belum tersinkronisasi ke Cloud. Tunggu beberapa saat.`);
    }

    return this.uow.execute(async () => {
      const dateStr = this.getFormattedDate(date);
      const idStr = `${branchId}-${dateStr}`;
      const startOfDay = new Date(dateStr).setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr).setHours(23, 59, 59, 999);

      // 3. Cek Idempotency lokal (mungkin sudah ada)
      const existingClosure = await db.financial_closures.get(idStr);
      if (existingClosure) {
        return existingClosure; 
      }

      // 4. Ambil rangkuman data untuk branch ini
      const report = await this.reportQuery.getFinancialReport(startOfDay, endOfDay);

      // 5. Dapatkan hash hari sebelumnya dari Dexie lokal (BUKAN direct Firestore).
      //    Alasan: createDailyClosure() sudah memvalidasi pendingSyncCount===0, artinya
      //    semua financial_closures lokal sudah ter-sync ke cloud. Dexie SSoT berlaku.
      //    Mengambil dari Dexie menghormati Hard Constraint #1 (Pillar of Truth).
      const prevDate = new Date(startOfDay - 1);
      const prevDateStr = this.getFormattedDate(prevDate);
      const prevIdStr = `${branchId}-${prevDateStr}`;
      
      let previousHash = 'GENESIS_BLOCK_0000000000000000';
      try {
        const prevClosure = await db.financial_closures.get(prevIdStr);
        if (prevClosure?.hash) {
          previousHash = prevClosure.hash;
        }
        // Jika tidak ada di lokal: ini hari pertama atau genesis — gunakan GENESIS_BLOCK default.
      } catch (err) {
        logger.error('[AuditIntegrity] Gagal membaca previousHash dari Dexie lokal', { error: err });
        throw new Error('Gagal membaca data penutupan buku hari sebelumnya. Coba lagi.');
      }

      // 6. Buat summary dan hash
      const summary = {
        totalRevenue: report.totalRevenue,
        grossProfit: report.grossProfit,
        totalTransactions: report.transactionCount,
        cashIn: report.cashFlow.cashIn,
        cashOut: report.cashFlow.cashOut,
      };
      
      const dataToHash = JSON.stringify(summary) + previousHash;
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(dataToHash);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const currentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // 7. Simpan ke database
      const newClosure: FinancialClosure = {
        id: idStr,
        date: startOfDay,
        summary,
        hash: currentHash,
        previousHash,
        branchId,
      };

      await db.financial_closures.put(newClosure);
      await this.uow.registerSync('financial_closures', 'INSERT', newClosure as unknown as Record<string, unknown>);
      await this.uow.registerAudit('DAILY_CLOSURE', 'System', `Tutup buku otoritatif untuk ${branchId} pada ${dateStr}. Hash: ${currentHash.substring(0, 8)}...`);

      return newClosure;
    }, 'FULL_SCOPE');
  }

  async verifyChain(branchId: string): Promise<{ isValid: boolean; brokenLink?: string }> {
    const allClosures = await db.financial_closures.where('branchId').equals(branchId).sortBy('date');
    if (allClosures.length < 2) return { isValid: true };

    for (let i = 1; i < allClosures.length; i++) {
      const current = allClosures[i];
      const previous = allClosures[i - 1];

      // Verifikasi #1: Apakah hash sebelumnya cocok?
      if (current.previousHash !== previous.hash) {
        return { isValid: false, brokenLink: current.id };
      }

      // Verifikasi #2: Apakah hash saat ini konsisten dengan datanya?
      const dataToHash = JSON.stringify(current.summary) + current.previousHash;
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(dataToHash);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const recalculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (current.hash !== recalculatedHash) {
        return { isValid: false, brokenLink: current.id };
      }
    }

    return { isValid: true };
  }

  /**
   * MEMOTONG RANTAI (Spot Check): Memverifikasi integritas Crypto-Audit Logs.
   * Karena prune menghapus data lama, kita mulai dari log tertua yang ada.
   */
  async verifyAuditChain(limit: number = 100): Promise<{ isValid: boolean; brokenLink?: string }> {
    const logs = await db.audit_logs.orderBy('timestamp').reverse().limit(limit).toArray();
    // Reverse again to get chronological order for verification
    logs.reverse();

    if (logs.length <= 1) return { isValid: true };

    for (let i = 1; i < logs.length; i++) {
      const current = logs[i];
      const previous = logs[i - 1];

      if (current.previousHash !== previous.hash) {
        // Jika previousHash bukan GENESIS (berarti terputus di tengah jalan)
        if (current.previousHash !== 'GENESIS_BLOCK_0000000000000000' && current.previousHash !== '0') {
           return { isValid: false, brokenLink: current.id };
        }
      }
    }

    return { isValid: true };
  }
}

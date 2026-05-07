import { db, FinancialClosure } from '../../shared/api/db';
import { IUnitOfWork } from '../core/IUnitOfWork';
import { IReportQuery } from '../queries/IReportQuery';
import { firestoreDb, isConfigValid } from '../../shared/api/firebase';
import { doc, getDoc } from 'firebase/firestore';

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

      // 5. Dapatkan hash hari sebelumnya LANGSUNG DARI FIREBASE (Server Authoritative)
      const prevDate = new Date(startOfDay - 1);
      const prevDateStr = this.getFormattedDate(prevDate);
      const prevIdStr = `${branchId}-${prevDateStr}`;
      
      let previousHash = 'GENESIS_BLOCK_0000000000000000';
      try {
        if (!isConfigValid) throw new Error("Config Firebase tidak valid");
        const prevDocRef = doc(firestoreDb, 'financial_closures', prevIdStr);
        const prevDocSnap = await getDoc(prevDocRef);
        if (prevDocSnap.exists()) {
          previousHash = prevDocSnap.data().hash || previousHash;
        } else {
          // Fallback check local if absolutely needed, but prefer cloud if it was supposed to be synced
          // Actually, relying on cloud means if it's missing in cloud, it's a genesis or fatal sync drop.
          // Since we required pendingSyncCount == 0, if it's not in cloud, it truly doesn't exist.
        }
      } catch (err) {
        console.error("Gagal mengambil previousHash dari Cloud:", err);
        throw new Error("Koneksi ke sistem pusat terganggu saat mengambil hash otoritatif. Coba lagi.");
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
}

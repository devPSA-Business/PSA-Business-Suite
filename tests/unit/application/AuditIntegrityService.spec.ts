/**
 * @file AuditIntegrityService.spec.ts
 * @security_tier HIGH
 * @ai_context NT-02 — Komponen ini adalah SATU-SATUNYA mekanisme deteksi tampering data
 *   historis (audit chain + financial closure chain). 0% coverage sebelumnya adalah
 *   P0 dari sisi keamanan. Test ini TIDAK mock crypto.subtle — menggunakan SHA-256 nyata
 *   agar kriptografi end-to-end terverifikasi, bukan hanya struktur data.
 *
 * ATURAN PENTING UNTUK AI YANG MEMODIFIKASI FILE INI:
 * - JANGAN ganti crypto.subtle dengan mock — justru tidak akan memvalidasi keamanan hash
 * - sortBy() di Dexie mengembalikan Promise<T[]> LANGSUNG, bukan Collection — mock harus
 *   merefleksikan ini (lihat makeSortByMock)
 * - verifyChain() menerima array FinancialClosure SUDAH TERURUT ASC — bukan raw Dexie query
 * - verifyAuditChain() reverse() di dalam test adalah untuk memeriksa urutan yang benar
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditIntegrityService } from '../../../src/application/services/AuditIntegrityService';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';
import { IReportQuery, FinancialReport } from '../../../src/application/queries/IReportQuery';
import { FinancialClosure, AuditLog } from '../../../src/shared/api/db';

// ─── Mock db (Dexie) ─────────────────────────────────────────────────────────
vi.mock('../../../src/shared/api/db', () => {
  const makeEqualsChain = () => ({
    equals: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    toArray: vi.fn().mockResolvedValue([]),
    sortBy: vi.fn().mockResolvedValue([]),
  });

  return {
    db: {
      financial_closures: {
        get: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
        where: vi.fn(() => makeEqualsChain()),
      },
      audit_logs: {
        orderBy: vi.fn(() => ({
          reverse: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          toArray: vi.fn().mockResolvedValue([]),
        })),
      },
      sync_events: {
        where: vi.fn(() => makeEqualsChain()),
      },
    },
  };
});

// ─── Import db SETELAH mock didefinisikan ────────────────────────────────────
import { db } from '../../../src/shared/api/db';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Hitung SHA-256 nyata (digunakan untuk expected hash di test createDailyClosure) */
async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buf = encoder.encode(data);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Buat FinancialClosure minimal untuk keperluan test */
function makeClosure(
  overrides: Partial<FinancialClosure> & { id: string; hash: string; previousHash: string }
): FinancialClosure {
  return {
    date: Date.now(),
    summary: {
      totalRevenue: 1_000_000,
      grossProfit: 300_000,
      totalTransactions: 10,
      cashIn: 1_100_000,
      cashOut: 100_000,
    },
    branchId: 'PSA-001',
    ...overrides,
  };
}

/** Buat AuditLog minimal */
function makeAuditLog(overrides: Partial<AuditLog> & { id: string; hash: string; previousHash: string }): AuditLog {
  return {
    timestamp: Date.now(),
    action: 'CHECKOUT',
    user: 'Kasir1',
    details: 'Transaksi #001',
    ...overrides,
  };
}

/** FinancialReport kosong untuk mock */
const EMPTY_REPORT: FinancialReport = {
  totalRevenue: 500_000,
  totalCost: 200_000,
  grossProfit: 300_000,
  margin: 60,
  transactionCount: 5,
  breakdown: {
    retail: { revenue: 500_000, cogs: 200_000, grossProfit: 300_000 },
    gold: { revenue: 0, cogs: 0, grossProfit: 0 },
    services: { revenue: 0, cogs: 0, grossProfit: 0 },
  },
  cashFlow: { cashIn: 550_000, cashOut: 50_000, netCash: 500_000 },
};

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('AuditIntegrityService', () => {
  let service: AuditIntegrityService;
  let mockUow: IUnitOfWork;
  let mockReportQuery: IReportQuery;

  beforeEach(() => {
    vi.resetAllMocks();

    // IUnitOfWork: execute() harus BENAR-BENAR menjalankan callback agar logika di
    // dalam createDailyClosure() (hash, put, registerSync) bisa diuji.
    mockUow = {
      execute: vi.fn().mockImplementation(async (work: () => Promise<unknown>) => work()),
      registerAudit: vi.fn().mockResolvedValue(undefined),
      registerSync: vi.fn().mockResolvedValue(undefined),
      registerStockHistory: vi.fn().mockResolvedValue(undefined),
      registerGoldAssetHistory: vi.fn().mockResolvedValue(undefined),
    };

    mockReportQuery = {
      getFinancialReport: vi.fn().mockResolvedValue(EMPTY_REPORT),
      getDailyStats: vi.fn(),
      getTopSellingItems: vi.fn(),
      getLowStockItems: vi.fn(),
      getBranchPerformance: vi.fn(),
    } as unknown as IReportQuery;

    service = new AuditIntegrityService(mockUow, mockReportQuery);

    // navigator.onLine — default: online (kondisi normal)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);

    // db.sync_events.where('status').equals('PENDING').count() → 0 (default: antrean kosong)
    (db.sync_events.where as ReturnType<typeof vi.fn>).mockReturnValue({
      equals: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
    });

    // db.financial_closures mocks — default: kosong
    (db.financial_closures.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (db.financial_closures.put as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (db.financial_closures.where as ReturnType<typeof vi.fn>).mockReturnValue({
      equals: vi.fn().mockReturnValue({ sortBy: vi.fn().mockResolvedValue([]) }),
    });

    // db.audit_logs.orderBy().reverse().limit().toArray() → []
    (db.audit_logs.orderBy as ReturnType<typeof vi.fn>).mockReturnValue({
      reverse: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
  });

  // ─── createDailyClosure ────────────────────────────────────────────────────

  describe('createDailyClosure', () => {
    const testDate = new Date('2026-06-09T08:00:00.000Z');
    const branchId = 'PSA-001';

    it('melempar error saat offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      await expect(service.createDailyClosure(testDate, branchId)).rejects.toThrow(
        'WAJIB dilakukan saat online'
      );
    });

    it('melempar error saat ada antrian sync pending', async () => {
      (db.sync_events.where as ReturnType<typeof vi.fn>).mockReturnValue({
        equals: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(3) }),
      });

      await expect(service.createDailyClosure(testDate, branchId)).rejects.toThrow(
        '3 transaksi yang belum tersinkronisasi'
      );
    });

    it('idempotent — mengembalikan closure yang sudah ada tanpa buat baru', async () => {
      const existingClosure = makeClosure({
        id: `${branchId}-2026-06-09`,
        hash: 'existing_hash_abc123',
        previousHash: 'GENESIS_BLOCK_0000000000000000',
        branchId,
      });
      (db.financial_closures.get as ReturnType<typeof vi.fn>).mockResolvedValue(existingClosure);

      const result = await service.createDailyClosure(testDate, branchId);

      expect(result).toEqual(existingClosure);
      // Pastikan TIDAK ada penulisan baru
      expect(db.financial_closures.put).not.toHaveBeenCalled();
      expect(mockUow.registerSync).not.toHaveBeenCalled();
    });

    it('genesis block — previousHash = GENESIS_BLOCK saat tidak ada closure sebelumnya', async () => {
      // Tidak ada closure sebelumnya di Dexie (default mock: get → undefined)
      (db.financial_closures.get as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await service.createDailyClosure(testDate, branchId);

      expect(result.previousHash).toBe('GENESIS_BLOCK_0000000000000000');
      expect(result.branchId).toBe(branchId);
      expect(result.hash).toBeTruthy();
      expect(result.hash).toHaveLength(64); // SHA-256 hex = 64 karakter
    });

    it('menghasilkan hash SHA-256 yang benar berdasarkan summary + previousHash', async () => {
      const previousHash = 'abc123previoushash';
      // get() dipanggil dua kali: (1) idempotency check → undefined, (2) previousHash check
      (db.financial_closures.get as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(undefined) // idempotency: belum ada
        .mockResolvedValueOnce({ hash: previousHash }); // previous closure

      const result = await service.createDailyClosure(testDate, branchId);

      // Hitung expected hash menggunakan summary dari EMPTY_REPORT
      const expectedSummary = {
        totalRevenue: EMPTY_REPORT.totalRevenue,
        grossProfit: EMPTY_REPORT.grossProfit,
        totalTransactions: EMPTY_REPORT.transactionCount,
        cashIn: EMPTY_REPORT.cashFlow.cashIn,
        cashOut: EMPTY_REPORT.cashFlow.cashOut,
      };
      const expectedHash = await sha256(JSON.stringify(expectedSummary) + previousHash);

      expect(result.hash).toBe(expectedHash);
      expect(result.previousHash).toBe(previousHash);
      expect(db.financial_closures.put).toHaveBeenCalledWith(expect.objectContaining({ hash: expectedHash }));
      expect(mockUow.registerSync).toHaveBeenCalledWith(
        'financial_closures',
        'INSERT',
        expect.objectContaining({ hash: expectedHash })
      );
      expect(mockUow.registerAudit).toHaveBeenCalledWith(
        'DAILY_CLOSURE',
        'System',
        expect.stringContaining(expectedHash.substring(0, 8))
      );
    });
  });

  // ─── verifyChain ──────────────────────────────────────────────────────────

  describe('verifyChain', () => {
    const branchId = 'PSA-001';

    it('mengembalikan isValid: true saat kurang dari 2 closure', async () => {
      (db.financial_closures.where as ReturnType<typeof vi.fn>).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          sortBy: vi.fn().mockResolvedValue([
            makeClosure({ id: 'PSA-001-2026-06-09', hash: 'h1', previousHash: 'GENESIS_BLOCK_0000000000000000', branchId }),
          ]),
        }),
      });

      const result = await service.verifyChain(branchId);
      expect(result.isValid).toBe(true);
    });

    it('mendeteksi previousHash yang tidak cocok (tampering urutan hash)', async () => {
      const closure1 = makeClosure({ id: 'PSA-001-2026-06-08', hash: 'hash_hari_1', previousHash: 'GENESIS_BLOCK_0000000000000000', branchId });
      const closure2 = makeClosure({
        id: 'PSA-001-2026-06-09',
        hash: 'hash_hari_2',
        previousHash: 'HASH_YANG_SALAH_BUKAN_hash_hari_1', // ← tidak cocok
        branchId,
      });

      (db.financial_closures.where as ReturnType<typeof vi.fn>).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          sortBy: vi.fn().mockResolvedValue([closure1, closure2]),
        }),
      });

      const result = await service.verifyChain(branchId);
      expect(result.isValid).toBe(false);
      expect(result.brokenLink).toBe('PSA-001-2026-06-09');
    });

    it('mendeteksi hash yang tidak sesuai dengan data (tampering isi)', async () => {
      // Buat closure1 dengan hash valid
      const summary1 = {
        totalRevenue: 1_000_000, grossProfit: 300_000,
        totalTransactions: 10, cashIn: 1_100_000, cashOut: 100_000,
      };
      const hash1 = await sha256(JSON.stringify(summary1) + 'GENESIS_BLOCK_0000000000000000');
      const closure1 = makeClosure({ id: 'PSA-001-2026-06-08', hash: hash1, previousHash: 'GENESIS_BLOCK_0000000000000000', branchId, summary: summary1 });

      // closure2: previousHash benar, tapi hash NOT sesuai isinya (data diubah setelah hashing)
      const closure2 = makeClosure({
        id: 'PSA-001-2026-06-09',
        hash: 'hash_yang_dimanipulasi_tidak_valid',
        previousHash: hash1,       // ← previousHash cocok (lolos cek #1)
        summary: { ...summary1, totalRevenue: 9_999_999 }, // ← data diubah tapi hash lama
        branchId,
      });

      (db.financial_closures.where as ReturnType<typeof vi.fn>).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          sortBy: vi.fn().mockResolvedValue([closure1, closure2]),
        }),
      });

      const result = await service.verifyChain(branchId);
      expect(result.isValid).toBe(false);
      expect(result.brokenLink).toBe('PSA-001-2026-06-09');
    });

    it('mengembalikan isValid: true untuk chain yang valid', async () => {
      const summary = {
        totalRevenue: 500_000, grossProfit: 150_000,
        totalTransactions: 5, cashIn: 550_000, cashOut: 50_000,
      };
      const hash1 = await sha256(JSON.stringify(summary) + 'GENESIS_BLOCK_0000000000000000');
      const hash2 = await sha256(JSON.stringify(summary) + hash1);

      const closure1 = makeClosure({ id: 'PSA-001-2026-06-08', hash: hash1, previousHash: 'GENESIS_BLOCK_0000000000000000', branchId, summary });
      const closure2 = makeClosure({ id: 'PSA-001-2026-06-09', hash: hash2, previousHash: hash1, branchId, summary });

      (db.financial_closures.where as ReturnType<typeof vi.fn>).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          sortBy: vi.fn().mockResolvedValue([closure1, closure2]),
        }),
      });

      const result = await service.verifyChain(branchId);
      expect(result.isValid).toBe(true);
      expect(result.brokenLink).toBeUndefined();
    });
  });

  // ─── verifyAuditChain ─────────────────────────────────────────────────────

  describe('verifyAuditChain', () => {
    it('mengembalikan isValid: true saat kurang dari atau sama dengan 1 log', async () => {
      (db.audit_logs.orderBy as ReturnType<typeof vi.fn>).mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              makeAuditLog({ id: 'log-1', hash: 'h1', previousHash: 'GENESIS_BLOCK_0000000000000000' }),
            ]),
          }),
        }),
      });

      const result = await service.verifyAuditChain(100);
      expect(result.isValid).toBe(true);
    });

    it('mendeteksi chain audit yang terputus (non-genesis previousHash mismatch)', async () => {
      // verifyAuditChain() mengambil limit latest, reverse → urutan kronologis
      // Kita berikan urutan reverse dulu (terbaru dulu), method akan reverse() lagi
      const log1 = makeAuditLog({ id: 'log-001', hash: 'hash_txn_1', previousHash: 'GENESIS_BLOCK_0000000000000000' });
      const log2 = makeAuditLog({ id: 'log-002', hash: 'hash_txn_2', previousHash: 'BUKAN_hash_txn_1' }); // ← rusak
      const log3 = makeAuditLog({ id: 'log-003', hash: 'hash_txn_3', previousHash: 'hash_txn_2' });

      // orderBy().reverse().limit().toArray() → [log3, log2, log1] (terbaru dulu)
      // Setelah logs.reverse() di dalam method → [log1, log2, log3]
      (db.audit_logs.orderBy as ReturnType<typeof vi.fn>).mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([log3, log2, log1]),
          }),
        }),
      });

      const result = await service.verifyAuditChain(100);
      expect(result.isValid).toBe(false);
      expect(result.brokenLink).toBe('log-002');
    });

    it('chain yang valid melewati semua verifikasi', async () => {
      const log1 = makeAuditLog({ id: 'log-001', hash: 'h1', previousHash: 'GENESIS_BLOCK_0000000000000000' });
      const log2 = makeAuditLog({ id: 'log-002', hash: 'h2', previousHash: 'h1' });
      const log3 = makeAuditLog({ id: 'log-003', hash: 'h3', previousHash: 'h2' });

      // Urutan dari DB (terbaru dulu: log3, log2, log1) → setelah reverse() dalam method → [log1, log2, log3]
      (db.audit_logs.orderBy as ReturnType<typeof vi.fn>).mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([log3, log2, log1]),
          }),
        }),
      });

      const result = await service.verifyAuditChain(100);
      expect(result.isValid).toBe(true);
    });

    it('genesis di tengah chain diperbolehkan (prune scenario)', async () => {
      // Setelah prune data lama, log pertama yang tersisa bisa punya previousHash = GENESIS
      const log1 = makeAuditLog({ id: 'log-010', hash: 'h10', previousHash: 'GENESIS_BLOCK_0000000000000000' }); // awal setelah prune
      const log2 = makeAuditLog({ id: 'log-011', hash: 'h11', previousHash: 'h10' });

      (db.audit_logs.orderBy as ReturnType<typeof vi.fn>).mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([log2, log1]),
          }),
        }),
      });

      const result = await service.verifyAuditChain(100);
      expect(result.isValid).toBe(true);
    });
  });
});

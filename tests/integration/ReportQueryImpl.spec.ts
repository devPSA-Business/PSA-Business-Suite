/**
 * @ai_context Integration test — ReportQueryImpl.getFinancialReport() money path
 * @business_rule SPLIT payment: HANYA cashPortion yang masuk ke cashFlow.cashIn
 *   Bukan total full transaction. Ini adalah regresi utama BUG-02.
 * @security_tier HIGH — jalur uang toko, false positive = laporan keuangan salah
 *
 * Seed scenario:
 *   CASH-1:    Rp 100.000 CASH  → cashIn += 100.000
 *   CASH-2:    Rp 150.000 CASH  → cashIn += 150.000
 *   SPLIT-1:   Rp 200.000 total, cashPortion 80.000   → cashIn += 80.000 (bukan 200k!)
 *   SPLIT-2:   Rp 300.000 total, cashPortion 120.000  → cashIn += 120.000 (bukan 300k!)
 *   VOIDED:    Rp 100.000 SPLIT cashPortion 50.000    → cashIn += 0 (VOIDED, skip)
 *
 *   Expected cashIn  = 100k + 150k + 80k + 120k = 450.000
 *   Expected (wrong) = 100k + 150k + 200k + 300k = 750.000  ← regresi guard
 *
 *   cashOut seed:
 *     PettyCash: Rp 25.000
 *     GoldBuyback (CASH): Rp 75.000
 *   Expected cashOut = 100.000
 *   Expected netCash = 450.000 - 100.000 = 350.000
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@shared/api/db';
import { ReportQueryImpl } from '../../src/infrastructure/queries/ReportQueryImpl';

// ─── Time Boundaries ──────────────────────────────────────────────────────────
const NOW = Date.now();
const RANGE_START = NOW - 7 * 24 * 60 * 60 * 1000; // 7 hari lalu
const RANGE_END   = NOW + 1000;                     // sekarang + 1 detik

describe('Integration: ReportQueryImpl — getFinancialReport money path', () => {
  let reportQuery: ReportQueryImpl;

  beforeEach(async () => {
    // Fresh Dexie instance untuk setiap test — isolasi data
    await db.delete();
    await db.open();
    reportQuery = new ReportQueryImpl();
  });

  afterEach(async () => {
    await db.delete();
  });

  // ─── TC-REPORT-1: cashIn SPLIT harus cashPortion, BUKAN total ─────────────

  it('TC-REPORT-1: cashIn dari SPLIT transaction = cashPortion (bukan total)', async () => {
    // Seed: 2 CASH + 2 SPLIT transactions — tidak ada secureData (decrypt pass-through)
    await db.transactions.bulkPut([
      {
        id: 'tx-cash-1',
        date: NOW - 1000,
        total: 100_000,
        paymentMethod: 'CASH',
        status: 'SUCCESS',
        items: [],
        user: 'kasir-1',
      },
      {
        id: 'tx-cash-2',
        date: NOW - 2000,
        total: 150_000,
        paymentMethod: 'CASH',
        status: 'SUCCESS',
        items: [],
        user: 'kasir-1',
      },
      {
        id: 'tx-split-1',
        date: NOW - 3000,
        total: 200_000,
        cashPortion: 80_000,     // ← Hanya ini yang masuk laci
        paymentMethod: 'SPLIT',
        status: 'SUCCESS',
        items: [],
        user: 'kasir-1',
      },
      {
        id: 'tx-split-2',
        date: NOW - 4000,
        total: 300_000,
        cashPortion: 120_000,    // ← Hanya ini yang masuk laci
        paymentMethod: 'SPLIT',
        status: 'SUCCESS',
        items: [],
        user: 'kasir-1',
      },
    ]);

    const report = await reportQuery.getFinancialReport(RANGE_START, RANGE_END);

    // cashIn HARUS = 100k + 150k + 80k + 120k = 450k
    expect(report.cashFlow.cashIn).toBe(450_000);

    // REGRESI GUARD: cashIn TIDAK BOLEH = sum of all totals (750k)
    // Ini membuktikan SPLIT tidak di-count full total-nya
    expect(report.cashFlow.cashIn).not.toBe(750_000);

    // REGRESI GUARD: cashIn TIDAK BOLEH = sum SPLIT totals saja (500k)
    expect(report.cashFlow.cashIn).not.toBe(500_000);
  });

  // ─── TC-REPORT-2: VOIDED transaction tidak masuk cashIn ──────────────────

  it('TC-REPORT-2: VOIDED SPLIT transaction cashPortion tidak dihitung ke cashIn', async () => {
    await db.transactions.bulkPut([
      {
        id: 'tx-cash-ok',
        date: NOW - 1000,
        total: 100_000,
        paymentMethod: 'CASH',
        status: 'SUCCESS',
        items: [],
        user: 'kasir-1',
      },
      {
        id: 'tx-split-voided',
        date: NOW - 2000,
        total: 100_000,
        cashPortion: 50_000,
        paymentMethod: 'SPLIT',
        status: 'VOIDED',         // ← HARUS di-skip
        items: [],
        user: 'kasir-1',
      },
    ]);

    const report = await reportQuery.getFinancialReport(RANGE_START, RANGE_END);

    // Hanya CASH 100k masuk — VOIDED SPLIT 50k tidak boleh terhitung
    expect(report.cashFlow.cashIn).toBe(100_000);
  });

  // ─── TC-REPORT-3: cashOut dari petty_cash + gold_buyback CASH ────────────

  it('TC-REPORT-3: cashOut = petty_cash + gold_buyback CASH payment', async () => {
    await db.petty_cash.bulkPut([
      { id: 'pc-1', date: NOW - 1000, amount: 25_000, description: 'Beli plastik', user: 'u1', category: 'OPERASIONAL' as const },
    ]);
    await db.gold_buyback.bulkPut([
      {
        id: 'gb-1', date: NOW - 2000, buybackPrice: 75_000, paymentMethod: 'CASH',
        status: 'stored', weightGram: 1.5, kadar: 0.750, pricePerGram: 900_000,
        margin: 0.05, customerName: 'Test Customer', customerId: 'c1',
        cashSource: 'gold_cash' as const, user: 'kasir-1',
      },
    ]);

    const report = await reportQuery.getFinancialReport(RANGE_START, RANGE_END);

    // cashOut = petty 25k + gold 75k = 100k
    expect(report.cashFlow.cashOut).toBe(100_000);
  });

  // ─── TC-REPORT-4: netCash = cashIn - cashOut ─────────────────────────────

  it('TC-REPORT-4: netCash = cashIn - cashOut (350k)', async () => {
    await db.transactions.bulkPut([
      {
        id: 'tx-cash-A', date: NOW - 1000, total: 100_000,
        paymentMethod: 'CASH', status: 'SUCCESS', items: [], user: 'k1',
      },
      {
        id: 'tx-cash-B', date: NOW - 2000, total: 150_000,
        paymentMethod: 'CASH', status: 'SUCCESS', items: [], user: 'k1',
      },
      {
        id: 'tx-split-A', date: NOW - 3000, total: 200_000, cashPortion: 80_000,
        paymentMethod: 'SPLIT', status: 'SUCCESS', items: [], user: 'k1',
      },
      {
        id: 'tx-split-B', date: NOW - 4000, total: 300_000, cashPortion: 120_000,
        paymentMethod: 'SPLIT', status: 'SUCCESS', items: [], user: 'k1',
      },
    ]);
    await db.petty_cash.put(
      { id: 'pc-X', date: NOW - 500, amount: 25_000, description: 'Tas kresek', user: 'u1', category: 'OPERASIONAL' as const }
    );
    await db.gold_buyback.put({
      id: 'gb-X', date: NOW - 600, buybackPrice: 75_000, paymentMethod: 'CASH',
      status: 'stored', weightGram: 2, kadar: 0.999, pricePerGram: 1_100_000,
      margin: 0.05, customerName: 'Customer Gold', customerId: 'c2',
      cashSource: 'gold_cash' as const, user: 'kasir-1',
    });

    const report = await reportQuery.getFinancialReport(RANGE_START, RANGE_END);

    expect(report.cashFlow.cashIn).toBe(450_000);
    expect(report.cashFlow.cashOut).toBe(100_000);
    expect(report.cashFlow.netCash).toBe(350_000);
  });

  // ─── TC-REPORT-5: SPLIT tanpa cashPortion → tidak masuk cashIn ───────────

  it('TC-REPORT-5: SPLIT dengan cashPortion undefined/null tidak crash dan tidak masuk cashIn', async () => {
    await db.transactions.bulkPut([
      {
        id: 'tx-split-no-portion',
        date: NOW - 1000,
        total: 100_000,
        paymentMethod: 'SPLIT',
        // cashPortion sengaja tidak ada (edge case data lama / migrasi)
        status: 'SUCCESS',
        items: [],
        user: 'k1',
      },
    ]);

    const report = await reportQuery.getFinancialReport(RANGE_START, RANGE_END);

    // cashPortion undefined → guard `(tx.cashPortion ?? 0) > 0` → skip
    // cashIn harus = 0, bukan crash
    expect(report.cashFlow.cashIn).toBe(0);
    expect(report.cashFlow.cashOut).toBe(0);
  });

  // ─── TC-REPORT-6: Transaksi di LUAR range tidak terhitung ────────────────

  it('TC-REPORT-6: transaksi di luar date range tidak masuk kalkulasi', async () => {
    const OUT_OF_RANGE = NOW - 30 * 24 * 60 * 60 * 1000; // 30 hari lalu

    await db.transactions.bulkPut([
      {
        id: 'tx-in-range',
        date: NOW - 1000,
        total: 100_000,
        paymentMethod: 'CASH',
        status: 'SUCCESS',
        items: [],
        user: 'k1',
      },
      {
        id: 'tx-out-range',
        date: OUT_OF_RANGE,
        total: 999_000,         // Nilai besar — kalau masuk berarti test gagal
        paymentMethod: 'CASH',
        status: 'SUCCESS',
        items: [],
        user: 'k1',
      },
    ]);

    // Range hanya 7 hari terakhir — transaksi 30 hari lalu tidak masuk
    const report = await reportQuery.getFinancialReport(RANGE_START, RANGE_END);

    expect(report.cashFlow.cashIn).toBe(100_000);
    expect(report.transactionCount).toBe(1);
  });

  // ─── TC-REPORT-7: Empty DB → zero values, tidak crash ────────────────────

  it('TC-REPORT-7: getFinancialReport dengan empty DB harus return zeros tanpa crash', async () => {
    const report = await reportQuery.getFinancialReport(RANGE_START, RANGE_END);

    expect(report.cashFlow.cashIn).toBe(0);
    expect(report.cashFlow.cashOut).toBe(0);
    expect(report.cashFlow.netCash).toBe(0);
    expect(report.totalRevenue).toBe(0);
    expect(report.transactionCount).toBe(0);
  });
});

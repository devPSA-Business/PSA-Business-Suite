/**
 * PSA Business Suite — Integration Test: The Money Path (SPLIT Payment)
 *
 * Mensimulasikan alur lengkap pembayaran SPLIT:
 * Checkout → Persist ke IDB → ShiftTotalsReconciler → Verifikasi cashIn
 *
 * @business_rule SPLIT: porsi kas dari cashPortion harus masuk ke cashIn shift
 * @ai_context Integration test untuk TD-01 fix (cashPortion persistence)
 * @security_tier LOW
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@shared/api/db';
import { CheckoutUseCase } from '@features/pos/usecases/CheckoutUseCase';
import { LoyaltyUseCase } from '@features/pos/usecases/LoyaltyUseCase';
import { RetailRepositoryImpl } from '@infrastructure/repositories/RetailRepositoryImpl';
import { StockRepositoryImpl } from '@infrastructure/repositories/StockRepositoryImpl';
import { ShiftRepositoryImpl } from '@infrastructure/repositories/ShiftRepositoryImpl';
import { UnitOfWorkImpl } from '@infrastructure/uow/UnitOfWorkImpl';
import { ShiftTotalsReconciler } from '../../src/infrastructure/migrations/ShiftTotalsReconciler';
import { SyncServiceImpl } from '@infrastructure/services/SyncServiceImpl';
import { StockCategory } from '@domain/models/StockCategory';
import { cryptoDB } from '../../src/lib/cryptoIndexedDB';
import { MathUtils } from '../../src/shared/utils/decimalUtils';
import { Dexie } from 'dexie';

describe('Integration: SPLIT Payment — The Money Path', () => {
  let checkoutUseCase: CheckoutUseCase;
  let retailRepo: RetailRepositoryImpl;
  let stockRepo: StockRepositoryImpl;
  let shiftRepo: ShiftRepositoryImpl;
  let uow: UnitOfWorkImpl;

  const SHIFT_ID = 'SHIFT-SPLIT-TEST-001';
  const STOCK_ID = 'STOCK-SPLIT-001';
  const START_CASH = 500_000;
  const PRODUCT_PRICE = 100_000;
  const CASH_PORTION = 60_000;  // Bayar Rp 60k tunai
  // QRIS portion = 100k - 60k = 40k (tidak masuk laci)

  beforeEach(async () => {
    await db.delete();
    await db.open();

    // Setup crypto
    const deviceKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
    cryptoDB.setKey(deviceKey as any, 'test-split-key');

    retailRepo = new RetailRepositoryImpl();
    stockRepo = new StockRepositoryImpl();
    shiftRepo = new ShiftRepositoryImpl();
    const syncService = new SyncServiceImpl();

    const mockLoyalty = {
      calculateAndApplyLoyalty: (req: any) => Dexie.Promise.resolve({
        netTotal: req.total,
        pointsEarned: 0,
        pointsRedeemed: 0,
        loyaltyDiscountAmount: 0
      })
    } as unknown as LoyaltyUseCase;

    uow = new UnitOfWorkImpl(syncService);
    checkoutUseCase = new CheckoutUseCase(retailRepo, stockRepo, shiftRepo, uow, mockLoyalty);

    // State awal: Shift terbuka + stok tersedia
    await shiftRepo.save({
      id: SHIFT_ID,
      status: 'OPEN',
      startTime: Date.now() - 3600_000, // 1 jam lalu
      startCash: START_CASH,
      user: 'USR-ADMIN',
      branchId: 'MAIN'
    } as any);

    await db.stock.put({
      id: STOCK_ID,
      name: 'XUP-CIN-GLD-17-ZRC-001 Test',
      price: PRODUCT_PRICE,
      quantity: 10,
      category: StockCategory.IMITATION,
      version: 1,
      branchId: 'MAIN'
    } as any);
  });

  afterEach(async () => {
    await db.delete();
  });

  // ─── TC #1: cashPortion di-persist ke IDB ──────────────────────────────────
  it('TC-1: cashPortion SPLIT harus tersimpan di IndexedDB Transaction', async () => {
    await checkoutUseCase.execute({
      subtotal: PRODUCT_PRICE,
      items: [{ stockId: STOCK_ID, quantity: 1, price: PRODUCT_PRICE, name: 'Test Item', subtotal: PRODUCT_PRICE }],
      total: PRODUCT_PRICE,
      paymentMethod: 'SPLIT',
      cashPortion: CASH_PORTION,
      userId: 'USR-ADMIN',
      branchId: 'MAIN'
    } as any);

    const saved = await db.transactions.toArray();
    expect(saved).toHaveLength(1);

    // KRITIS: cashPortion harus tersimpan
    expect(saved[0].paymentMethod).toBe('SPLIT');
    expect(saved[0].cashPortion).toBe(CASH_PORTION);
    expect(saved[0].total).toBe(PRODUCT_PRICE);
  });

  // ─── TC #2: ShiftTotalsReconciler menghitung cashIn dengan benar ───────────
  it('TC-2: ShiftTotalsReconciler harus include cashPortion SPLIT dalam cashIn', async () => {
    // Setup: Hapus shift_totals agar reconciler berjalan (simulasi cold-reconstruction)
    await db.shift_totals.clear();

    await checkoutUseCase.execute({
      subtotal: PRODUCT_PRICE,
      items: [{ stockId: STOCK_ID, quantity: 1, price: PRODUCT_PRICE, name: 'Test Item', subtotal: PRODUCT_PRICE }],
      total: PRODUCT_PRICE,
      paymentMethod: 'SPLIT',
      cashPortion: CASH_PORTION,
      userId: 'USR-ADMIN',
      branchId: 'MAIN'
    } as any);

    // Hapus shift_totals setelah checkout untuk force reconciliation
    await db.shift_totals.clear();

    // Jalankan reconciler
    await ShiftTotalsReconciler.reconcileActiveShiftTotals();

    const reconciled = await db.shift_totals.get(SHIFT_ID);
    expect(reconciled).toBeDefined();

    // KRITIS: cashIn harus = cashPortion (60k), BUKAN total transaksi (100k) atau 0
    expect(reconciled!.cashIn).toBe(CASH_PORTION);
    expect(reconciled!.cashIn).not.toBe(PRODUCT_PRICE); // Bukan full amount
    expect(reconciled!.cashIn).not.toBe(0);             // Bukan zero
  });

  // ─── TC #3: Saldo kas akhir akurat ─────────────────────────────────────────
  it('TC-3: Saldo kas akhir shift harus = startCash + cashPortion (bukan + total)', async () => {
    await db.shift_totals.clear();

    await checkoutUseCase.execute({
      subtotal: PRODUCT_PRICE,
      items: [{ stockId: STOCK_ID, quantity: 1, price: PRODUCT_PRICE, name: 'Test Item', subtotal: PRODUCT_PRICE }],
      total: PRODUCT_PRICE,
      paymentMethod: 'SPLIT',
      cashPortion: CASH_PORTION,
      userId: 'USR-ADMIN',
      branchId: 'MAIN'
    } as any);

    await db.shift_totals.clear();
    await ShiftTotalsReconciler.reconcileActiveShiftTotals();

    const reconciled = await db.shift_totals.get(SHIFT_ID);
    expect(reconciled).toBeDefined();

    const expectedCashBalance = MathUtils.add(START_CASH, CASH_PORTION); // 560,000
    const wrongCashBalance = MathUtils.add(START_CASH, PRODUCT_PRICE);    // 600,000 (buggy)

    expect(reconciled!.cashIn).toBe(CASH_PORTION);
    // Verifikasi bahwa saldo bukan hasil bug lama
    expect(MathUtils.add(reconciled!.openCash ?? 0, reconciled!.cashIn)).toBe(expectedCashBalance);
    expect(MathUtils.add(reconciled!.openCash ?? 0, reconciled!.cashIn)).not.toBe(wrongCashBalance);
  });
});

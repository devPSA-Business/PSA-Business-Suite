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
import { VoidTransactionUseCase } from '@features/pos/usecases/VoidTransactionUseCase';
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

  // ═══════════════════════════════════════════════════════════════════════════
  // Rule SPLIT-2: cashPortion boundary validation
  // Memastikan bahwa validasi pre-transaction DAN post-loyalty bekerja benar.
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Rule SPLIT-2: cashPortion boundary validation', () => {
    // ─── TC-4: cashPortion negatif → throw ──────────────────────────────────
    it('TC-4: cashPortion negatif harus diblokir (pre-tx check)', async () => {
      await expect(
        checkoutUseCase.execute({
          subtotal: PRODUCT_PRICE,
          items: [{ stockId: STOCK_ID, quantity: 1, price: PRODUCT_PRICE, name: 'Test Item', subtotal: PRODUCT_PRICE }],
          total: PRODUCT_PRICE,
          paymentMethod: 'SPLIT',
          cashPortion: -1,
          userId: 'USR-ADMIN',
          branchId: 'MAIN'
        } as any)
      ).rejects.toThrow('cashPortion tidak boleh bernilai negatif');
    });

    // ─── TC-5: cashPortion = 0 → throw ─────────────────────────────────────
    it('TC-5: cashPortion Rp 0 harus diblokir (pre-tx check)', async () => {
      await expect(
        checkoutUseCase.execute({
          subtotal: PRODUCT_PRICE,
          items: [{ stockId: STOCK_ID, quantity: 1, price: PRODUCT_PRICE, name: 'Test Item', subtotal: PRODUCT_PRICE }],
          total: PRODUCT_PRICE,
          paymentMethod: 'SPLIT',
          cashPortion: 0,
          userId: 'USR-ADMIN',
          branchId: 'MAIN'
        } as any)
      ).rejects.toThrow('cashPortion tidak boleh Rp 0');
    });

    // ─── TC-6: cashPortion = total (sama persis) → throw ───────────────────
    it('TC-6: cashPortion = total (bukan SPLIT, harusnya CASH) harus diblokir', async () => {
      await expect(
        checkoutUseCase.execute({
          subtotal: PRODUCT_PRICE,
          items: [{ stockId: STOCK_ID, quantity: 1, price: PRODUCT_PRICE, name: 'Test Item', subtotal: PRODUCT_PRICE }],
          total: PRODUCT_PRICE,
          paymentMethod: 'SPLIT',
          cashPortion: PRODUCT_PRICE, // cashPortion = total → bukan SPLIT
          userId: 'USR-ADMIN',
          branchId: 'MAIN'
        } as any)
      ).rejects.toThrow('tidak boleh melebihi atau sama dengan total transaksi');
    });

    // ─── TC-7: cashPortion > total → throw ─────────────────────────────────
    it('TC-7: cashPortion melebihi total harus diblokir (pre-tx check)', async () => {
      await expect(
        checkoutUseCase.execute({
          subtotal: PRODUCT_PRICE,
          items: [{ stockId: STOCK_ID, quantity: 1, price: PRODUCT_PRICE, name: 'Test Item', subtotal: PRODUCT_PRICE }],
          total: PRODUCT_PRICE,
          paymentMethod: 'SPLIT',
          cashPortion: PRODUCT_PRICE + 1, // 1 rupiah lebih dari total
          userId: 'USR-ADMIN',
          branchId: 'MAIN'
        } as any)
      ).rejects.toThrow('tidak boleh melebihi atau sama dengan total transaksi');
    });

    // ─── TC-8: cashPortion valid (boundary pass) → sukses ──────────────────
    it('TC-8: cashPortion valid (< total) harus berhasil diproses', async () => {
      const VALID_CASH_PORTION = PRODUCT_PRICE - 1; // 1 rupiah kurang dari total
      await expect(
        checkoutUseCase.execute({
          subtotal: PRODUCT_PRICE,
          items: [{ stockId: STOCK_ID, quantity: 1, price: PRODUCT_PRICE, name: 'Test Item', subtotal: PRODUCT_PRICE }],
          total: PRODUCT_PRICE,
          paymentMethod: 'SPLIT',
          cashPortion: VALID_CASH_PORTION,
          userId: 'USR-ADMIN',
          branchId: 'MAIN'
        } as any)
      ).resolves.toBeDefined(); // tidak throw → transaksi berhasil
    });

    // ─── TC-9: cashPortion > finalTotal setelah loyalty discount → throw ────
    // Skenario: total = 100k, cashPortion = 80k (< total, lolos pre-check).
    // Server loyalty mengurangi finalTotal menjadi 70k (30k discount).
    // Post-loyalty check: 80k >= 70k → HARUS throw.
    //
    // Root cause sesi sebelumnya: mock menggunakan req.total (undefined)
    // padahal LoyaltyUseCase menerima req.transactionAmount (bukan req.total).
    // Fix: gunakan req.transactionAmount di mock.
    it('TC-9: cashPortion > finalTotal setelah loyalty discount harus diblokir (post-loyalty check)', async () => {
      const LOYALTY_REDUCTION = 30_000;
      // cashPortion = 80k. total = 100k → lolos pre-check (80k < 100k).
      // Setelah loyalty: finalTotal = 70k. Post-check: 80k >= 70k → throw.
      const cashPortionOver = 80_000;

      // Mock dengan loyalty yang mengurangi total 30k
      // PENTING: gunakan req.transactionAmount (bukan req.total) sesuai LoyaltyCalculationRequest
      const loyaltyWith30kReduction = {
        calculateAndApplyLoyalty: (req: any) => Dexie.Promise.resolve({
          netTotal: (req.transactionAmount as number) - LOYALTY_REDUCTION,
          pointsEarned: 0,
          pointsRedeemed: 0,
          loyaltyDiscountAmount: LOYALTY_REDUCTION
        })
      } as unknown as LoyaltyUseCase;

      const uowForTC9 = new UnitOfWorkImpl(new SyncServiceImpl());
      const checkoutForTC9 = new CheckoutUseCase(
        retailRepo, stockRepo, shiftRepo, uowForTC9, loyaltyWith30kReduction
      );

      await expect(
        checkoutForTC9.execute({
          subtotal: PRODUCT_PRICE,
          items: [{ stockId: STOCK_ID, quantity: 1, price: PRODUCT_PRICE, name: 'Test Item', subtotal: PRODUCT_PRICE }],
          total: PRODUCT_PRICE,   // 100k → lolos pre-check (80k < 100k)
          paymentMethod: 'SPLIT',
          cashPortion: cashPortionOver, // 80k → harus gagal post-loyalty (80k >= 70k)
          customerId: 'CUST-TC9-TEST',  // trigger loyalty path
          userId: 'USR-ADMIN',
          branchId: 'MAIN'
        } as any)
      ).rejects.toThrow('melebihi atau sama dengan total akhir setelah diskon');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // P1-B: VoidTransactionUseCase — SPLIT cashPortion revert
  // P1-C: ShiftRepositoryImpl.calculateExpectedCash — SPLIT cashPortion inclusion
  // ═══════════════════════════════════════════════════════════════════════════
  describe('P1-B & P1-C: SPLIT void revert + calculateExpectedCash', () => {
    // ─── TC-10: Void SPLIT → shift cashIn berkurang tepat cashPortion ────────
    it('TC-10: Void SPLIT transaction harus revert cashIn sebesar cashPortion (bukan full total atau 0)', async () => {
      // Setup shift_totals awal agar incrementShiftSales/revertShiftSales bekerja
      await db.shift_totals.put({
        id: SHIFT_ID,
        startTime: Date.now() - 3600_000,
        openCash: START_CASH,
        cashIn: 0,
        cashOut: 0,
        salesTotal: 0,
        buybackTotal: 0,
        pettyCashTotal: 0,
        lastUpdatedAt: Date.now()
      });

      // Checkout SPLIT: Rp 60k tunai + Rp 40k QRIS
      const txId = await checkoutUseCase.execute({
        subtotal: PRODUCT_PRICE,
        items: [{ stockId: STOCK_ID, quantity: 1, price: PRODUCT_PRICE, name: 'Test Item', subtotal: PRODUCT_PRICE }],
        total: PRODUCT_PRICE,
        paymentMethod: 'SPLIT',
        cashPortion: CASH_PORTION, // 60k masuk laci
        sessionId: SHIFT_ID,       // KRITIS: diperlukan agar void dapat temukan shift untuk revert
        userId: 'USR-ADMIN',
        branchId: 'MAIN'
      } as any);

      // Verifikasi cashIn setelah checkout = 60k (bukan 100k)
      const afterCheckout = await db.shift_totals.get(SHIFT_ID);
      expect(afterCheckout!.cashIn).toBe(CASH_PORTION); // 60k

      // Void transaksi
      const voidUseCase = new VoidTransactionUseCase(uow, retailRepo, stockRepo, shiftRepo);
      await voidUseCase.execute({
        transactionId: txId,
        reason: 'Test void TC-10',
        authorizedBy: 'USR-ADMIN'
      });

      // KRITIS: cashIn harus kembali ke 0 — dikurangi cashPortion (60k), bukan total (100k) atau 0
      const afterVoid = await db.shift_totals.get(SHIFT_ID);
      expect(afterVoid!.cashIn).toBe(0); // 60k - 60k = 0
    });

    // ─── TC-11: Void CASH → cashIn berkurang full total (regression test) ───
    it('TC-11: Void CASH transaction harus revert cashIn sebesar full total (regression)', async () => {
      await db.shift_totals.put({
        id: SHIFT_ID,
        startTime: Date.now() - 3600_000,
        openCash: START_CASH,
        cashIn: 0,
        cashOut: 0,
        salesTotal: 0,
        buybackTotal: 0,
        pettyCashTotal: 0,
        lastUpdatedAt: Date.now()
      });

      const txId = await checkoutUseCase.execute({
        subtotal: PRODUCT_PRICE,
        items: [{ stockId: STOCK_ID, quantity: 1, price: PRODUCT_PRICE, name: 'Test Item', subtotal: PRODUCT_PRICE }],
        total: PRODUCT_PRICE,
        paymentMethod: 'CASH',
        sessionId: SHIFT_ID,  // KRITIS: diperlukan agar void dapat temukan shift untuk revert
        userId: 'USR-ADMIN',
        branchId: 'MAIN'
      } as any);

      const afterCheckout = await db.shift_totals.get(SHIFT_ID);
      expect(afterCheckout!.cashIn).toBe(PRODUCT_PRICE); // 100k

      const voidUseCase = new VoidTransactionUseCase(uow, retailRepo, stockRepo, shiftRepo);
      await voidUseCase.execute({
        transactionId: txId,
        reason: 'Test void TC-11',
        authorizedBy: 'USR-ADMIN'
      });

      const afterVoid = await db.shift_totals.get(SHIFT_ID);
      expect(afterVoid!.cashIn).toBe(0); // 100k - 100k = 0
    });

    // ─── TC-12: calculateExpectedCash harus include SPLIT cashPortion ────────
    it('TC-12: calculateExpectedCash harus hitung startCash + cashPortion untuk SPLIT (bukan 0 atau total)', async () => {
      // Checkout SPLIT tanpa setup shift_totals — calculateExpectedCash baca langsung dari transactions
      await checkoutUseCase.execute({
        subtotal: PRODUCT_PRICE,
        items: [{ stockId: STOCK_ID, quantity: 1, price: PRODUCT_PRICE, name: 'Test Item', subtotal: PRODUCT_PRICE }],
        total: PRODUCT_PRICE,
        paymentMethod: 'SPLIT',
        cashPortion: CASH_PORTION, // 60k
        sessionId: SHIFT_ID,       // KRITIS: calculateExpectedCash query by sessionId
        userId: 'USR-ADMIN',
        branchId: 'MAIN'
      } as any);

      const expectedCash = await shiftRepo.calculateExpectedCash(SHIFT_ID);

      const correctExpected   = MathUtils.add(START_CASH, CASH_PORTION);  // 560,000 ✓
      const buggyExpected_old = START_CASH;                                // 500,000 ✗ (SPLIT diabaikan)
      const buggyExpected_max = MathUtils.add(START_CASH, PRODUCT_PRICE); // 600,000 ✗ (full total terhitung)

      expect(expectedCash).toBe(correctExpected);
      expect(expectedCash).not.toBe(buggyExpected_old);
      expect(expectedCash).not.toBe(buggyExpected_max);
    });
  });


});

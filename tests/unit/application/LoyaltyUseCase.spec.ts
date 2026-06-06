import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoyaltyUseCase } from '../../../src/features/pos/usecases/LoyaltyUseCase';
import { ICustomerRepository } from '../../../src/domain/repositories/ICustomerRepository';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';
import { Customer } from '../../../src/domain/models/Customer';

// ─── Business Constants (dari LoyaltyUseCase) ────────────────────────────────
// POINTS_PER_IDR = 10000  → 1 point per Rp 10.000 spent
// IDR_PER_POINT  = 100    → Rp 100 diskon per point ditukar
// ─────────────────────────────────────────────────────────────────────────────

/** Helper: buat Customer dengan loyaltyPoints tertentu */
const makeCustomer = (loyaltyPoints: number, id = 'cust-001') =>
  Customer.create(
    { name: 'Siti Rahayu', phoneNumber: '081234567890', loyaltyPoints },
    id
  );

describe('LoyaltyUseCase', () => {
  let useCase: LoyaltyUseCase;
  let mockCustomerRepo: ICustomerRepository;
  let mockUow: IUnitOfWork;

  beforeEach(() => {
    mockCustomerRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      search: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockUow = {
      execute: vi.fn(async (work) => work()),
      registerAudit: vi.fn(),
      registerSync: vi.fn(),
      registerStockHistory: vi.fn(),
      registerGoldAssetHistory: vi.fn(),
    };
    useCase = new LoyaltyUseCase(mockCustomerRepo, mockUow);
  });

  // ─── Happy Path ───────────────────────────────────────────────────────────

  it('harus menghitung points earned dengan benar (Rp 50.000 → 5 points)', async () => {
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(makeCustomer(100));

    const result = await useCase.calculateAndApplyLoyalty({
      customerId: 'cust-001',
      transactionAmount: 50000,
      pointsToRedeem: 0,
      userId: 'user-1',
    });

    // floor(50000 / 10000) = 5
    expect(result.pointsEarned).toBe(5);
    expect(result.pointsRedeemed).toBe(0);
    expect(result.netTotal).toBe(50000);
    expect(result.loyaltyDiscountAmount).toBe(0);
  });

  it('harus menghitung diskon loyalty dengan benar (10 points → Rp 1.000 diskon)', async () => {
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(makeCustomer(100));

    const result = await useCase.calculateAndApplyLoyalty({
      customerId: 'cust-001',
      transactionAmount: 50000,
      pointsToRedeem: 10,
      userId: 'user-1',
    });

    // 10 points × Rp 100/point = Rp 1.000 diskon
    expect(result.pointsRedeemed).toBe(10);
    expect(result.loyaltyDiscountAmount).toBe(1000);
    expect(result.netTotal).toBe(49000);
  });

  it('netTotal tidak boleh di bawah 0 (redeem melampaui total transaksi)', async () => {
    // transactionAmount = 100 → maxPointsNeeded = ceil(100/100) = 1
    // rawRedeemable = min(1000, 1000, 1) = 1 → discount = Rp 100
    // afterLoyalty = 100 - 100 = 0 → tidak negatif
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(makeCustomer(1000));

    const result = await useCase.calculateAndApplyLoyalty({
      customerId: 'cust-001',
      transactionAmount: 100,
      pointsToRedeem: 1000,
      userId: 'user-1',
    });

    expect(result.netTotal).toBeGreaterThanOrEqual(0);
  });

  it('harus memperbarui loyaltyPoints customer setelah transaksi berhasil', async () => {
    // customer: 100 pts, earn 5 pts, redeem 0 → akhir: 105 pts
    const customer = makeCustomer(100);
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(customer);

    await useCase.calculateAndApplyLoyalty({
      customerId: 'cust-001',
      transactionAmount: 50000,
      pointsToRedeem: 0,
      userId: 'user-1',
    });

    expect(mockCustomerRepo.save).toHaveBeenCalledOnce();
    const savedCustomer = vi.mocked(mockCustomerRepo.save).mock.calls[0][0];
    expect(savedCustomer.loyaltyPoints).toBe(105);
  });

  it('tidak ada points yang diredeem jika pointsToRedeem = 0', async () => {
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(makeCustomer(50));

    const result = await useCase.calculateAndApplyLoyalty({
      customerId: 'cust-001',
      transactionAmount: 20000,
      pointsToRedeem: 0,
      userId: 'user-1',
    });

    expect(result.pointsRedeemed).toBe(0);
    expect(result.loyaltyDiscountAmount).toBe(0);
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────────

  it('harus throw jika customer tidak ditemukan', async () => {
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(null);

    await expect(
      useCase.calculateAndApplyLoyalty({
        customerId: 'non-existent',
        transactionAmount: 50000,
        pointsToRedeem: 0,
        userId: 'user-1',
      })
    ).rejects.toThrow('Customer not found');
  });

  it('pointsRedeemed diclamp ke customer.loyaltyPoints (tidak bisa redeem lebih dari yang dimiliki)', async () => {
    // customer punya 30 pts, minta redeem 100 → clamp ke 30
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(makeCustomer(30));

    const result = await useCase.calculateAndApplyLoyalty({
      customerId: 'cust-001',
      transactionAmount: 50000,
      pointsToRedeem: 100,
      userId: 'user-1',
    });

    expect(result.pointsRedeemed).toBeLessThanOrEqual(30);
    // rawRedeemable = min(100, 30, 500) = 30
    expect(result.pointsRedeemed).toBe(30);
    expect(result.loyaltyDiscountAmount).toBe(3000);
  });

  it('pointsRedeemed diclamp ke maxPointsNeeded (tidak bisa overdiscount)', async () => {
    // transactionAmount = 1000 → maxPointsNeeded = ceil(1000/100) = 10
    // customer punya 500 pts, minta redeem 500 → clamp ke 10
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(makeCustomer(500));

    const result = await useCase.calculateAndApplyLoyalty({
      customerId: 'cust-001',
      transactionAmount: 1000,
      pointsToRedeem: 500,
      userId: 'user-1',
    });

    expect(result.pointsRedeemed).toBe(10);
    expect(result.netTotal).toBeGreaterThanOrEqual(0);
  });

  it('pointsToRedeem negatif diperlakukan sebagai 0 (rawRedeemable < 0 → clamp ke 0)', async () => {
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(makeCustomer(100));

    const result = await useCase.calculateAndApplyLoyalty({
      customerId: 'cust-001',
      transactionAmount: 50000,
      pointsToRedeem: -50,
      userId: 'user-1',
    });

    expect(result.pointsRedeemed).toBe(0);
    expect(result.loyaltyDiscountAmount).toBe(0);
  });

  it('transactionAmount nol → 0 points earned, 0 redeemed, netTotal 0', async () => {
    // maxPointsNeeded = ceil(0/100) = 0 → rawRedeemable = min(10, 100, 0) = 0
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(makeCustomer(100));

    const result = await useCase.calculateAndApplyLoyalty({
      customerId: 'cust-001',
      transactionAmount: 0,
      pointsToRedeem: 10,
      userId: 'user-1',
    });

    expect(result.pointsEarned).toBe(0);
    expect(result.pointsRedeemed).toBe(0);
    expect(result.netTotal).toBe(0);
  });

  it('harus memanggil customerRepository.save() dengan loyaltyPoints yang diperbarui secara akurat', async () => {
    // customer: 50 pts, earn 10 pts (100000/10000), redeem 0 → akhir: 60 pts
    const customer = makeCustomer(50);
    vi.mocked(mockCustomerRepo.findById).mockResolvedValue(customer);

    await useCase.calculateAndApplyLoyalty({
      customerId: 'cust-001',
      transactionAmount: 100000,
      pointsToRedeem: 0,
      userId: 'user-1',
    });

    expect(mockCustomerRepo.save).toHaveBeenCalledOnce();
    const savedCustomer = vi.mocked(mockCustomerRepo.save).mock.calls[0][0];
    expect(savedCustomer.loyaltyPoints).toBe(60);
  });
});

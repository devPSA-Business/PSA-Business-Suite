import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutUseCase, CheckoutRequestDTO } from '../../../src/features/pos/usecases/CheckoutUseCase';
import { IRetailRepository } from '../../../src/domain/repositories/IRetailRepository';
import { IStockRepository } from '../../../src/domain/repositories/IStockRepository';
import { IShiftRepository } from '../../../src/domain/repositories/IShiftRepository';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';
import { LoyaltyUseCase } from '../../../src/features/pos/usecases/LoyaltyUseCase';
import { StockItem } from '../../../src/domain/models/StockItem';
import { StockCategory } from '../../../src/domain/models/StockCategory';

describe('CheckoutUseCase race condition', () => {
  let checkoutUseCase: CheckoutUseCase;
  let mockRetailRepo: IRetailRepository;
  let mockStockRepo: IStockRepository & { updateIfVersionMatches?: any };
  let mockShiftRepo: IShiftRepository;
  let mockUow: IUnitOfWork;
  let mockLoyaltyUseCase: LoyaltyUseCase;

  beforeEach(() => {
    mockRetailRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
    } as any;
    mockStockRepo = {
      findById: vi.fn(),
      findByBarcode: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      decreaseStock: vi.fn().mockResolvedValue(undefined),
      list: vi.fn(),
      updateIfVersionMatches: vi.fn(),
    } as any;
    mockShiftRepo = {
      hasOpenShift: vi.fn().mockResolvedValue(true),
      getOpenShift: vi.fn(),
      save: vi.fn(),
      calculateExpectedCash: vi.fn(),
      findById: vi.fn(),
    } as any;
    mockUow = {
      execute: vi.fn(async (work) => await work()),
      registerAudit: vi.fn().mockResolvedValue(undefined),
      registerSync: vi.fn().mockResolvedValue(undefined),
      registerStockHistory: vi.fn().mockResolvedValue(undefined),
    } as any;
    mockLoyaltyUseCase = {
      calculateAndApplyLoyalty: vi.fn().mockResolvedValue({
        netTotal: 1000,
        pointsEarned: 0,
        pointsRedeemed: 0,
        loyaltyDiscountAmount: 0
      })
    } as any;

    checkoutUseCase = new CheckoutUseCase(
      mockRetailRepo,
      mockStockRepo,
      mockShiftRepo,
      mockUow,
      mockLoyaltyUseCase
    );
  });

  it('allows only one checkout when stock is 1 and two parallel requests occur', async () => {
    const stockItem = StockItem.create({
      name: 'Limited Product',
      category: StockCategory.ACCESSORIES,
      price: 1000,
      cost: 500,
      quantity: 1,
      barcode: '12345',
    });

    // Simulate two concurrent readers that see version = 1
    vi.mocked(mockStockRepo.findById).mockResolvedValue(stockItem);

    // Simulate updateIfVersionMatches: first call succeeds, second call fails due to version mismatch
    let callCount = 0;
    vi.mocked(mockStockRepo.updateIfVersionMatches).mockImplementation(async (id: string, expectedVersion: number, changes: any) => {
      callCount++;
      if (callCount === 1) {
        return true; // first updater wins
      }
      return false; // second detects version mismatch
    });

    const requestA: CheckoutRequestDTO = {
      total: 1000,
      paymentMethod: 'CASH',
      items: [{ stockId: stockItem.id, name: 'Limited Product', quantity: 1, price: 1000, subtotal: 1000 }],
      userId: 'user-1',
    };

    const requestB: CheckoutRequestDTO = {
      total: 1000,
      paymentMethod: 'CASH',
      items: [{ stockId: stockItem.id, name: 'Limited Product', quantity: 1, price: 1000, subtotal: 1000 }],
      userId: 'user-2',
    };

    const results = await Promise.allSettled([
      checkoutUseCase.execute(requestA),
      checkoutUseCase.execute(requestB)
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    if (rejected.length > 0) {
      expect((rejected[0] as PromiseRejectedResult).reason.message).toMatch(/Stok tidak mencukupi|Version conflict/);
    }
  });
});

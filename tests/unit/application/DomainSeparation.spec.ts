import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReceiveStockUseCase } from '../../../src/features/inventory/usecases/ReceiveStockUseCase';
import { GoldLiquidationUseCase } from '../../../src/features/gold/usecases/GoldLiquidationUseCase';
import { IStockRepository } from '../../../src/domain/repositories/IStockRepository';
import { IGoldLiquidationRepository } from '../../../src/domain/repositories/IGoldLiquidationRepository';
import { IGoldBuybackRepository } from '../../../src/domain/repositories/IGoldBuybackRepository';
import { IShiftRepository } from '../../../src/domain/repositories/IShiftRepository';
import { IInternalNoteRepository } from '../../../src/domain/repositories/IInternalNoteRepository';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';
import { StockCategory } from '../../../src/domain/models/StockCategory';
import { UserRole } from '../../../src/domain/models/User';
import { IUserRepository } from '../../../src/domain/repositories/IUserRepository';

import { CheckoutUseCase } from '../../../src/features/pos/usecases/CheckoutUseCase';
import { LoyaltyUseCase } from '../../../src/features/pos/usecases/LoyaltyUseCase';
import { IRetailRepository } from '../../../src/domain/repositories/IRetailRepository';
import { StockItem } from '../../../src/domain/models/StockItem';

describe('Domain Separation: Retail vs Gold Asset Trading', () => {
  let receiveStock: ReceiveStockUseCase;
  let goldSales: GoldLiquidationUseCase;
  let checkout: CheckoutUseCase;
  
  let mockStockRepo: IStockRepository;
  let mockGoldLiquidationRepo: IGoldLiquidationRepository;
  let mockGoldBuybackRepo: IGoldBuybackRepository;
  let mockShiftRepo: IShiftRepository;
  let mockInternalNoteRepo: IInternalNoteRepository;
  let mockRetailRepo: IRetailRepository;
  let mockUserRepo: IUserRepository;
  let mockUow: IUnitOfWork;
  let mockLoyaltyUseCase: LoyaltyUseCase;

  beforeEach(() => {
    mockStockRepo = {
      save: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findByBarcode: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      updateIfVersionMatches: vi.fn().mockResolvedValue(true),
    };
    mockGoldLiquidationRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
    };
    mockGoldBuybackRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
    };
    mockShiftRepo = {
      hasOpenShift: vi.fn().mockResolvedValue(true),
      getOpenShift: vi.fn(),
      save: vi.fn(),
      calculateExpectedCash: vi.fn(),
      findById: vi.fn(),
      checkCloudForActiveShift: vi.fn(), incrementShiftSales: vi.fn(), revertShiftSales: vi.fn(),
    };
    mockInternalNoteRepo = {
      save: vi.fn(),
    };
    mockRetailRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
    };
    mockUserRepo = {
      findById: vi.fn().mockResolvedValue({ role: 'MANAGER' }),
      findByName: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    mockUow = {
      execute: vi.fn((work) => work()),
      registerAudit: vi.fn(),
      registerSync: vi.fn(),
      registerStockHistory: vi.fn(),
      registerGoldAssetHistory: vi.fn(),
    };
    mockLoyaltyUseCase = {
      calculateAndApplyLoyalty: vi.fn().mockResolvedValue({
        netTotal: 1000,
        pointsEarned: 0,
        pointsRedeemed: 0,
        loyaltyDiscountAmount: 0
      })
    } as any;

    receiveStock = new ReceiveStockUseCase(mockStockRepo, mockUow);
    goldSales = new GoldLiquidationUseCase(mockGoldBuybackRepo, mockShiftRepo, mockInternalNoteRepo, mockUserRepo, mockUow);
    checkout = new CheckoutUseCase(mockRetailRepo, mockStockRepo, mockShiftRepo, mockUow, mockLoyaltyUseCase);
  });

  it('Retail ReceiveStock (Jewellery) should NOT call registerGoldAssetHistory', async () => {
    await receiveStock.execute({
      barcode: 'GOLD-001',
      name: 'Gold Ring',
      category: StockCategory.GOLD_JEWELLERY,
      price: 5000000,
      cost: 4000000,
      quantity: 1,
      userId: 'admin-1',
      userRole: UserRole.ADMIN
    });

    expect(mockStockRepo.save).toHaveBeenCalled();
    expect(mockUow.registerStockHistory).toHaveBeenCalled();
    expect(mockUow.registerGoldAssetHistory).not.toHaveBeenCalled();
  });

  it('Retail Checkout should NOT call registerGoldAssetHistory', async () => {
    const stockItem = StockItem.create({
      name: 'Gold Ring',
      category: StockCategory.GOLD_JEWELLERY,
      price: 5000000,
      cost: 4000000,
      quantity: 10,
      barcode: 'GOLD-001'
    });
    vi.mocked(mockStockRepo.findById).mockResolvedValue(stockItem);

    await checkout.execute({
      total: 5000000,
      paymentMethod: 'CASH',
      items: [{ stockId: stockItem.id, name: 'Gold Ring', quantity: 1, price: 5000000, subtotal: 5000000 }],
      userId: 'user-1'
    });

    expect(mockRetailRepo.save).toHaveBeenCalled();
    expect(mockUow.registerStockHistory).toHaveBeenCalled();
    expect(mockUow.registerGoldAssetHistory).not.toHaveBeenCalled();
  });

  it('B2B Gold Sales (Trading) should NOT call registerStockHistory', async () => {
    // Setup asset
    vi.mocked(mockGoldBuybackRepo.findById).mockResolvedValue({ 
      id: 'bb-1', markAsSoldToCollector: vi.fn(), weightGram: 10, buybackPrice: 9000000, status: 'stored', customerName: 'John', kadar: 0.75
    } as any);

    await goldSales.execute({
      buybackIds: ['bb-1'],
      totalSoldPrice: 10000000,
      paymentMethod: 'CASH',
      userId: 'admin-1'
    });

    expect(mockGoldBuybackRepo.save).toHaveBeenCalled();
    expect(mockUow.registerAudit).toHaveBeenCalled();
    expect(mockUow.registerStockHistory).not.toHaveBeenCalled();
    expect(mockStockRepo.save).not.toHaveBeenCalled();
    expect(mockStockRepo.update).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutUseCase, CheckoutRequestDTO } from '../../../src/features/pos/usecases/CheckoutUseCase';
import { IRetailRepository } from '../../../src/domain/repositories/IRetailRepository';
import { IStockRepository } from '../../../src/domain/repositories/IStockRepository';
import { IShiftRepository } from '../../../src/domain/repositories/IShiftRepository';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';
import { LoyaltyUseCase } from '../../../src/features/pos/usecases/LoyaltyUseCase';
import { StockItem } from '../../../src/domain/models/StockItem';
import { StockCategory } from '../../../src/domain/models/StockCategory';

describe('CheckoutUseCase', () => {
  let checkoutUseCase: CheckoutUseCase;
  let mockRetailRepo: IRetailRepository;
  let mockStockRepo: IStockRepository;
  let mockShiftRepo: IShiftRepository;
  let mockUow: IUnitOfWork;
  let mockLoyaltyUseCase: LoyaltyUseCase;

  beforeEach(() => {
    mockRetailRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
    };
    mockStockRepo = {
      findById: vi.fn(),
      findByBarcode: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      updateIfVersionMatches: vi.fn().mockResolvedValue(true),
    };
    mockShiftRepo = {
      hasOpenShift: vi.fn(),
      getOpenShift: vi.fn(),
      save: vi.fn(),
      calculateExpectedCash: vi.fn(),
      findById: vi.fn(),
      checkCloudForActiveShift: vi.fn(), incrementShiftSales: vi.fn(), revertShiftSales: vi.fn(),
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
        netTotal: 10000,
        pointsEarned: 1,
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

  it('should throw error if no open shift', async () => {
    vi.mocked(mockShiftRepo.hasOpenShift).mockResolvedValue(false);

    const request: CheckoutRequestDTO = {
      total: 1000,
      paymentMethod: 'CASH',
      items: [
        { stockId: 'dummy', name: 'Dummy', quantity: 1, price: 1000, subtotal: 1000 }
      ],
      userId: 'user-1',
    };

    await expect(checkoutUseCase.execute(request)).rejects.toThrow('Tidak ada shift yang terbuka');
  });

  it('should throw error if stock is insufficient', async () => {
    vi.mocked(mockShiftRepo.hasOpenShift).mockResolvedValue(true);
    
    const stockItem = StockItem.create({
      name: 'Product 1',
      category: StockCategory.ACCESSORIES,
      price: 1000,
      cost: 500,
      quantity: 5,
      barcode: '12345',
    });
    vi.mocked(mockStockRepo.findById).mockResolvedValue(stockItem);

    const request: CheckoutRequestDTO = {
      total: 10000,
      paymentMethod: 'CASH',
      items: [
        { stockId: stockItem.id, name: 'Product 1', quantity: 10, price: 1000, subtotal: 10000 }
      ],
      userId: 'user-1',
    };

    await expect(checkoutUseCase.execute(request)).rejects.toThrow('Stok tidak mencukupi');
  });

  it('should succeed if stock is sufficient', async () => {
    vi.mocked(mockShiftRepo.hasOpenShift).mockResolvedValue(true);
    
    const stockItem = StockItem.create({
      name: 'Product 1',
      category: StockCategory.ACCESSORIES,
      price: 1000,
      cost: 500,
      quantity: 20,
      barcode: '12345',
    });
    vi.mocked(mockStockRepo.findById).mockResolvedValue(stockItem);

    const request: CheckoutRequestDTO = {
      total: 10000,
      paymentMethod: 'CASH',
      items: [
        { stockId: stockItem.id, name: 'Product 1', quantity: 10, price: 1000, subtotal: 10000 }
      ],
      userId: 'user-1',
    };

    const result = await checkoutUseCase.execute(request);

    expect(result).toBeDefined();
    expect(mockStockRepo.updateIfVersionMatches).toHaveBeenCalledWith(stockItem.id, stockItem.version, { quantity: 10 });
    expect(mockUow.registerStockHistory).toHaveBeenCalledWith(expect.objectContaining({
      stockId: stockItem.id,
      action: 'REMOVE',
      quantityChange: -10,
      newQuantity: 10
    }));
    expect(mockRetailRepo.save).toHaveBeenCalled();
    expect(mockUow.registerAudit).toHaveBeenCalled();
    expect(mockUow.registerSync).toHaveBeenCalled();
  });

  it('should rollback transaction if repository save fails', async () => {
    vi.mocked(mockShiftRepo.hasOpenShift).mockResolvedValue(true);
    
    const stockItem = StockItem.create({
      name: 'Product 1',
      category: StockCategory.ACCESSORIES,
      price: 1000,
      cost: 500,
      quantity: 20,
      barcode: '12345',
    });
    vi.mocked(mockStockRepo.findById).mockResolvedValue(stockItem);
    
    // Simulate failure during save to trigger rollback
    vi.mocked(mockRetailRepo.save).mockRejectedValue(new Error('Database error'));

    const request: CheckoutRequestDTO = {
      total: 10000,
      paymentMethod: 'CASH',
      items: [
        { stockId: stockItem.id, name: 'Product 1', quantity: 10, price: 1000, subtotal: 10000 }
      ],
      userId: 'user-1',
    };

    await expect(checkoutUseCase.execute(request)).rejects.toThrow('Database error');
    
    // Ensure unitOfWork.execute was called
    expect(mockUow.execute).toHaveBeenCalled();
  });
});

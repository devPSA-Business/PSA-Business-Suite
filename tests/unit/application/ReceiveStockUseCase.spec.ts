import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReceiveStockUseCase, ReceiveStockRequestDTO } from '../../../src/features/inventory/usecases/ReceiveStockUseCase';
import { IStockRepository } from '../../../src/domain/repositories/IStockRepository';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';
import { StockItem } from '../../../src/domain/models/StockItem';
import { StockCategory } from '../../../src/domain/models/StockCategory';
import { UserRole } from '../../../src/domain/models/User';

describe('ReceiveStockUseCase', () => {
  let receiveStockUseCase: ReceiveStockUseCase;
  let mockStockRepo: IStockRepository;
  let mockUow: IUnitOfWork;

  beforeEach(() => {
    mockStockRepo = {
      findById: vi.fn(),
      findByBarcode: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      updateIfVersionMatches: vi.fn(),
    };
    mockUow = {
      execute: vi.fn((work) => work()),
      registerAudit: vi.fn(),
      registerSync: vi.fn(),
      registerStockHistory: vi.fn(),
      registerGoldAssetHistory: vi.fn(),
    };

    receiveStockUseCase = new ReceiveStockUseCase(
      mockStockRepo,
      mockUow
    );
  });

  it('should create new stock item if not exists', async () => {
    vi.mocked(mockStockRepo.findByBarcode).mockResolvedValue(null);

    const request: ReceiveStockRequestDTO = {
      barcode: '12345',
      name: 'New Product',
      category: StockCategory.ACCESSORIES,
      price: 1000,
      cost: 500,
      quantity: 10,
      userId: 'user-1',
      userRole: UserRole.ADMIN,
    };

    await receiveStockUseCase.execute(request);

    expect(mockStockRepo.save).toHaveBeenCalled();
    expect(mockUow.registerStockHistory).toHaveBeenCalledWith(expect.objectContaining({
      action: 'ADD',
      quantityChange: 10,
      oldCost: 0,
      newCost: 500
    }));
    expect(mockUow.registerAudit).toHaveBeenCalledWith('CREATE_STOCK', 'user-1', expect.any(String), expect.any(Object));
  });

  it('should flag as stale for non-gold items (delegate HPP to server)', async () => {
    const existingItem = StockItem.create({
      name: 'Existing Product',
      category: StockCategory.ACCESSORIES,
      price: 1000,
      cost: 500,
      quantity: 10,
      barcode: '12345',
    });
    vi.mocked(mockStockRepo.findByBarcode).mockResolvedValue(existingItem);

    const request: ReceiveStockRequestDTO = {
      barcode: '12345',
      name: 'Existing Product',
      category: StockCategory.ACCESSORIES,
      price: 1200,
      cost: 700,
      quantity: 10,
      userId: 'user-1',
      userRole: UserRole.ADMIN,
    };

    await receiveStockUseCase.execute(request);

    expect(mockStockRepo.update).toHaveBeenCalled();
    const updatedStock = vi.mocked(mockStockRepo.update).mock.calls[0][0];
    expect(updatedStock.quantity).toBe(20);
    // Phase 1.1: Cost SHOULD be updated with shadow HPP: (10*500 + 10*700)/20 = 12000/20 = 600
    expect(updatedStock.cost).toBe(600);
    expect(updatedStock.isStale).toBe(true);
    expect(updatedStock.is_shadow_hpp).toBe(true);
    
    // Should register a sync intent for HPP calculation
    expect(mockUow.registerSync).toHaveBeenCalledWith('stock_inbound_intents', 'INSERT', expect.objectContaining({
      inboundQuantity: 10,
      inboundCost: 700
    }));

    expect(mockUow.registerStockHistory).toHaveBeenCalledWith(expect.objectContaining({
      action: 'ADD',
      quantityChange: 10,
      oldCost: 500,
      newCost: 600 // Phase 1.1: Reflects shadow HPP
    }));
  });

  it('should throw error for gold item with different cost (Strict Specific ID)', async () => {
    const existingItem = StockItem.create({
      name: 'Gold Ring',
      category: StockCategory.GOLD_JEWELLERY,
      price: 5000000,
      cost: 4000000,
      quantity: 1,
      barcode: 'G001',
    });
    vi.mocked(mockStockRepo.findByBarcode).mockResolvedValue(existingItem);

    const request: ReceiveStockRequestDTO = {
      barcode: 'G001',
      name: 'Gold Ring',
      category: StockCategory.GOLD_JEWELLERY,
      price: 5500000,
      cost: 4500000, // DIFFERENT COST
      quantity: 1,
      userId: 'user-1',
      userRole: UserRole.ADMIN,
    };

    await expect(receiveStockUseCase.execute(request)).rejects.toThrow(/sudah digunakan untuk batch emas dengan harga modal berbeda/);
  });

  it('should update existing gold stock item if cost is SAME', async () => {
    const existingItem = StockItem.create({
      name: 'Gold Ring',
      category: StockCategory.GOLD_JEWELLERY,
      price: 5000000,
      cost: 4000000,
      quantity: 1,
      barcode: 'G001',
    });
    vi.mocked(mockStockRepo.findByBarcode).mockResolvedValue(existingItem);

    const request: ReceiveStockRequestDTO = {
      barcode: 'G001',
      name: 'Gold Ring',
      category: StockCategory.GOLD_JEWELLERY,
      price: 5500000,
      cost: 4000000, // SAME COST
      quantity: 1,
      userId: 'user-1',
      userRole: UserRole.ADMIN,
    };

    await receiveStockUseCase.execute(request);

    expect(mockStockRepo.update).toHaveBeenCalled();
    const updatedStock = vi.mocked(mockStockRepo.update).mock.calls[0][0];
    expect(updatedStock.quantity).toBe(2);
    expect(updatedStock.cost).toBe(4000000);
    expect(updatedStock.id).toBe(existingItem.id);
  });
});

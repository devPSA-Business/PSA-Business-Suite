import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BulkReceiveStockUseCase } from '@features/inventory/usecases/BulkReceiveStockUseCase';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { IStockRepository } from '@domain/repositories/IStockRepository';
import { UserRole } from '@domain/models/User';
import { StockCategory } from '@domain/models/StockCategory';
import { StockItem } from '@domain/models/StockItem';

describe('BulkReceiveStockUseCase', () => {
  let mockUow: IUnitOfWork;
  let mockStockRepo: IStockRepository;
  let useCase: BulkReceiveStockUseCase;

  beforeEach(() => {
    mockUow = {
      execute: vi.fn().mockImplementation(async (callback) => {
        return await callback();
      }),
      registerAudit: vi.fn(),
      registerSync: vi.fn(),
    } as unknown as IUnitOfWork;

    mockStockRepo = {
      findByBarcode: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    } as unknown as IStockRepository;

    useCase = new BulkReceiveStockUseCase(mockStockRepo, mockUow);
  });

  it('should reject bulk receive if use is CASHIER', async () => {
    await expect(useCase.execute({
      items: [],
      userId: 'user1',
      userRole: UserRole.CASHIER
    })).rejects.toThrow('Akses ditolak: Kasir tidak memiliki izin untuk menambah stok massal.');
  });

  it('should successfully bulk create new stock items', async () => {
    mockStockRepo.findByBarcode = vi.fn().mockResolvedValue(null);

    await useCase.execute({
      items: [
        { barcode: '123', name: 'Ring', category: StockCategory.IMITATION, price: 100, cost: 50, quantity: 2 }
      ],
      userId: 'manager1',
      userRole: UserRole.MANAGER
    });

    expect(mockStockRepo.save).toHaveBeenCalled();
    expect(mockUow.registerAudit).toHaveBeenCalled();
    expect(mockUow.registerSync).toHaveBeenCalled();
  });

  it('should successfully bulk update existing stock items', async () => {
    const existingStock = StockItem.create({
      barcode: '123', name: 'Ring', category: StockCategory.IMITATION, price: 100, cost: 50, quantity: 2, weight: 0, karat: 0
    });
    mockStockRepo.findByBarcode = vi.fn().mockResolvedValue(existingStock);

    await useCase.execute({
      items: [
        { barcode: '123', name: 'Ring', category: StockCategory.IMITATION, price: 120, cost: 60, quantity: 3 }
      ],
      userId: 'manager1',
      userRole: UserRole.MANAGER
    });

    expect(mockStockRepo.update).toHaveBeenCalled();
    expect(mockStockRepo.save).not.toHaveBeenCalled();
    expect(mockUow.registerAudit).toHaveBeenCalled();
    expect(mockUow.registerSync).toHaveBeenCalled();
  });
});

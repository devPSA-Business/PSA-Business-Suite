import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VoidTransactionUseCase } from '@features/pos/usecases/VoidTransactionUseCase';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { IRetailRepository } from '@domain/repositories/IRetailRepository';
import { IStockRepository } from '@domain/repositories/IStockRepository';
import { RetailTransaction } from '@domain/models/RetailTransaction';

vi.mock('@shared/api/db', () => ({
  db: {
    shift_totals: {
      get: vi.fn(),
      put: vi.fn()
    }
  }
}));

describe('VoidTransactionUseCase', () => {
  let mockUow: IUnitOfWork;
  let mockRetailRepo: IRetailRepository;
  let mockStockRepo: IStockRepository;
  let mockShiftRepo: any;
  let useCase: VoidTransactionUseCase;

  beforeEach(() => {
    mockUow = {
      execute: vi.fn().mockImplementation(async (callback) => {
        return await callback();
      }),
      registerAudit: vi.fn(),
      registerStockHistory: vi.fn(),
    } as unknown as IUnitOfWork;

    mockRetailRepo = {
      findById: vi.fn(),
      save: vi.fn(),
    } as unknown as IRetailRepository;

    mockStockRepo = {
      findById: vi.fn(),
      updateIfVersionMatches: vi.fn().mockResolvedValue(true),
    } as unknown as IStockRepository;

    mockShiftRepo = {
        revertShiftSales: vi.fn()
    } as any;

    useCase = new VoidTransactionUseCase(mockUow, mockRetailRepo, mockStockRepo, mockShiftRepo);
  });

  it('should successfully void a transaction and restore stock', async () => {
    const transaction = RetailTransaction.create({
      items: [{
        stockId: 'stock1',
        name: 'Item 1',
        quantity: 2,
        price: 50000,
        subtotal: 100000,
        isCustomItem: false
      }],
      total: 100000,
      paymentMethod: 'CASH',
      sessionId: 'session1',
      status: 'SUCCESS',
      userId: 'user1'
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockRetailRepo.findById as any).mockResolvedValue(transaction);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockStockRepo.findById as any).mockResolvedValue({ id: 'stock1', quantity: 5, version: 1, cost: 20000 });

    await useCase.execute({
      transactionId: transaction.id,
      reason: 'Wrong item',
      authorizedBy: 'admin1'
    });

    expect(mockRetailRepo.save).toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mockStockRepo as any).updateIfVersionMatches).toHaveBeenCalledWith(
      'stock1', 1, { quantity: 7 }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mockUow as any).registerAudit).toHaveBeenCalled();
  });

  it('should throw error if transaction not found', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockRetailRepo.findById as any).mockResolvedValue(null);

    await expect(useCase.execute({
      transactionId: 'invalid',
      reason: 'Wrong',
      authorizedBy: 'admin1'
    })).rejects.toThrow('Transaksi tidak ditemukan.');
  });
});

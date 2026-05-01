import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuybackUseCase, BuybackRequestDTO } from '../../../src/features/gold/usecases/BuybackUseCase';
import { IGoldBuybackRepository } from '../../../src/domain/repositories/IGoldBuybackRepository';
import { IGoldLiquidationRepository } from '../../../src/domain/repositories/IGoldLiquidationRepository';
import { IStockRepository } from '../../../src/domain/repositories/IStockRepository';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';
import { IUserRepository } from '../../../src/domain/repositories/IUserRepository';

describe('BuybackUseCase', () => {
  let useCase: BuybackUseCase;
  let mockGoldBuybackRepo: IGoldBuybackRepository;
  let mockGoldLiquidationRepo: IGoldLiquidationRepository;
  let mockStockRepo: IStockRepository;
  let mockUserRepo: IUserRepository;
  let mockUow: IUnitOfWork;

  beforeEach(() => {
    mockGoldBuybackRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
    };
    mockGoldLiquidationRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
    };
    mockStockRepo = {
      findById: vi.fn(),
      findByBarcode: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      updateIfVersionMatches: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };
    mockUserRepo = {
      findByName: vi.fn().mockResolvedValue({ role: 'MANAGER' }),
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

    useCase = new BuybackUseCase(
      mockGoldBuybackRepo,
      mockStockRepo,
      mockUserRepo,
      mockUow
    );
  });

  it('should throw error if user is not MANAGER or ADMIN', async () => {
    vi.mocked(mockUserRepo.findByName).mockResolvedValue({ role: 'CASHIER' } as any);

    const request: BuybackRequestDTO = {
      customerName: 'John Doe',
      weightGram: 10,
      kadar: 0.750,
      pricePerGram: 1000000,
      margin: 0.1,
      buyPrice: 9000000,
      paymentMethod: 'CASH',
      userId: 'user-1',
    };

    await expect(useCase.execute(request)).rejects.toThrow('Akses Ditolak');
  });

  it('should succeed and log history', async () => {
    // Current asset 0g
    vi.mocked(mockGoldBuybackRepo.findAll).mockResolvedValue([]);
    vi.mocked(mockGoldLiquidationRepo.findAll).mockResolvedValue([]);

    const request: BuybackRequestDTO = {
      customerName: 'John Doe',
      weightGram: 10,
      kadar: 0.750,
      pricePerGram: 1000000,
      margin: 0.1,
      buyPrice: 9000000,
      paymentMethod: 'CASH',
      userId: 'user-1',
    };

    const result = await useCase.execute(request);

    expect(result).toBeDefined();
    expect(mockGoldBuybackRepo.save).toHaveBeenCalled();
    expect(mockUow.registerGoldAssetHistory).toHaveBeenCalledWith(expect.objectContaining({
      action: 'BUYBACK',
      weightChange: 9,
      newTotalWeight: 9 // PGE of 10g 90% is 9g
    }));
    expect(mockUow.registerAudit).toHaveBeenCalled();
  });
});

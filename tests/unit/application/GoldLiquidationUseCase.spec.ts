import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoldLiquidationUseCase, GoldLiquidationRequestDTO } from '../../../src/features/gold/usecases/GoldLiquidationUseCase';
import { IGoldLiquidationRepository } from '../../../src/domain/repositories/IGoldLiquidationRepository';
import { IGoldBuybackRepository } from '../../../src/domain/repositories/IGoldBuybackRepository';
import { IShiftRepository } from '../../../src/domain/repositories/IShiftRepository';
import { IInternalNoteRepository } from '../../../src/domain/repositories/IInternalNoteRepository';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';
import { IUserRepository } from '../../../src/domain/repositories/IUserRepository';

describe('GoldLiquidationUseCase', () => {
  let useCase: GoldLiquidationUseCase;
  let mockGoldLiquidationRepo: IGoldLiquidationRepository;
  let mockGoldBuybackRepo: IGoldBuybackRepository;
  let mockShiftRepo: IShiftRepository;
  let mockInternalNoteRepo: IInternalNoteRepository;
  let mockUserRepo: IUserRepository;
  let mockUow: IUnitOfWork;

  beforeEach(() => {
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
      checkCloudForActiveShift: vi.fn(), incrementShiftSales: vi.fn(),
    };
    mockInternalNoteRepo = {
      save: vi.fn(),
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

    useCase = new GoldLiquidationUseCase(
      mockGoldBuybackRepo,
      mockShiftRepo,
      mockInternalNoteRepo,
      mockUserRepo,
      mockUow
    );
  });

  it('should throw error if user is not MANAGER or ADMIN', async () => {
    vi.mocked(mockUserRepo.findByName).mockResolvedValue({ role: 'CASHIER' } as any);

    const request: GoldLiquidationRequestDTO = {
      buybackIds: ['bb-1'],
      totalSoldPrice: 10000000,
      paymentMethod: 'CASH',
      userId: 'user-1',
    };

    await expect(useCase.execute(request)).rejects.toThrow('Akses Ditolak');
  });

  it('should throw error if no open shift', async () => {
    vi.mocked(mockShiftRepo.hasOpenShift).mockResolvedValue(false);

    const request: GoldLiquidationRequestDTO = {
      buybackIds: ['bb-1'],
      totalSoldPrice: 10000000,
      paymentMethod: 'CASH',
      userId: 'user-1',
    };

    await expect(useCase.execute(request)).rejects.toThrow('Tidak ada shift yang terbuka');
  });

  it('should throw error if gold asset is insufficient', async () => {
    // Total buyback 5g, total sold 0g -> current asset 5g
    vi.mocked(mockGoldBuybackRepo.findById).mockResolvedValue(null);

    const request: GoldLiquidationRequestDTO = {
      buybackIds: ['bb-error'],
      totalSoldPrice: 10000000,
      paymentMethod: 'CASH',
      userId: 'user-1',
    };

    await expect(useCase.execute(request)).rejects.toThrow(/tidak ditemukan/);
  });

  it('should succeed if gold asset is sufficient and log history', async () => {
    // Total buyback 20g, total sold 5g -> current asset 15g
    vi.mocked(mockGoldBuybackRepo.findById).mockResolvedValue({ 
      id: 'bb-1', markAsSoldToCollector: vi.fn(), weightGram: 10, buybackPrice: 9000000
    } as any);

    const request: GoldLiquidationRequestDTO = {
      buybackIds: ['bb-1'],
      totalSoldPrice: 10000000,
      paymentMethod: 'CASH',
      userId: 'user-1',
    };

    const result = await useCase.execute(request);

    expect(result).toBeDefined();
    expect(mockGoldBuybackRepo.save).toHaveBeenCalled();
    expect(mockUow.registerGoldAssetHistory).toHaveBeenCalledWith(expect.objectContaining({
      action: 'LIQUIDATION',
      weightChange: -10,
      newTotalWeight: 5 // 15 - 10
    }));
    expect(mockUow.registerAudit).toHaveBeenCalled();
  });
});

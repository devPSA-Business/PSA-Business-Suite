import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenShiftUseCase } from '@features/shift/usecases/OpenShiftUseCase';
import { IShiftRepository } from '@domain/repositories/IShiftRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';

vi.mock('@shared/api/db', () => ({
  db: {
    shift_totals: {
      put: vi.fn().mockResolvedValue(undefined)
    }
  }
}));

describe('OpenShiftUseCase', () => {
  let mockShiftRepo: IShiftRepository;
  let mockUow: IUnitOfWork;
  let useCase: OpenShiftUseCase;

  beforeEach(() => {
    mockShiftRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      hasOpenShift: vi.fn().mockResolvedValue(false),
      getActiveShift: vi.fn(),
      findAll: vi.fn(),
      calculateExpectedCash: vi.fn(),
      checkCloudForActiveShift: vi.fn().mockResolvedValue({ hasActiveShift: false, isOffline: true, isTimeout: false }),
    } as unknown as IShiftRepository;

    mockUow = {
      execute: vi.fn().mockImplementation(async (callback) => {
        return await callback();
      }),
      registerAudit: vi.fn(),
      registerSync: vi.fn(),
      registerGoldAssetHistory: vi.fn(),
      registerStockHistory: vi.fn(),
    };

    useCase = new OpenShiftUseCase(mockShiftRepo, mockUow);
  });

  it('should successfully open a shift', async () => {
    const result = await useCase.execute({
      startCash: 100000,
      userId: 'user1'
    });
    expect(result.shiftId).toBeDefined();
    expect(mockShiftRepo.hasOpenShift).toHaveBeenCalled();
    expect(mockShiftRepo.save).toHaveBeenCalled();
    expect(mockUow.registerAudit).toHaveBeenCalled();
    expect(mockUow.registerSync).toHaveBeenCalled();
  });

  it('should throw error if a shift is already open locally', async () => {
    mockShiftRepo.hasOpenShift = vi.fn().mockResolvedValue(true);
    await expect(useCase.execute({
      startCash: 100000,
      userId: 'user1'
    })).rejects.toThrow('Shift lain masih terbuka di perangkat ini. Tutup shift sebelumnya terlebih dahulu.');
  });
});

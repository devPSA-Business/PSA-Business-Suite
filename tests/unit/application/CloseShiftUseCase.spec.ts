import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloseShiftUseCase } from '@features/shift/usecases/CloseShiftUseCase';
import { IShiftRepository } from '@domain/repositories/IShiftRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { ISyncService } from '@application/services/ISyncService';
import { Shift } from '@domain/models/Shift';

vi.mock('@shared/utils/backupManager', () => ({
  backupManager: {
    autoBackupLocal: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('CloseShiftUseCase', () => {
  let mockShiftRepo: IShiftRepository;
  let mockUow: IUnitOfWork;
  let mockSyncService: ISyncService;
  let useCase: CloseShiftUseCase;

  beforeEach(() => {
    mockShiftRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      calculateExpectedCash: vi.fn().mockResolvedValue(150000),
    } as unknown as IShiftRepository;

    mockUow = {
      execute: vi.fn().mockImplementation(async (callback) => {
        return await callback();
      }),
      registerAudit: vi.fn(),
      registerSync: vi.fn(),
    } as unknown as IUnitOfWork;

    mockSyncService = {
      processSyncQueue: vi.fn().mockResolvedValue(true)
    } as unknown as ISyncService;

    useCase = new CloseShiftUseCase(mockShiftRepo, mockUow, mockSyncService);
  });

  it('should successfully close a shift', async () => {
    const mockShift = Shift.create({
      startCash: 100000,
      startTime: Date.now(),
      status: 'OPEN',
      userId: 'user1',
    });
    
    mockShiftRepo.findById = vi.fn().mockResolvedValue(mockShift);

    await useCase.execute({
      shiftId: mockShift.id,
      endCash: 150000,
      userId: 'user1'
    });

    expect(mockShiftRepo.save).toHaveBeenCalled();
    expect(mockUow.registerAudit).toHaveBeenCalled();
    expect(mockUow.registerSync).toHaveBeenCalled();
  });

  it('should throw error if shift is not found', async () => {
    mockShiftRepo.findById = vi.fn().mockResolvedValue(null);

    await expect(useCase.execute({
      shiftId: 'invalid-id',
      endCash: 150000,
      userId: 'user1'
    })).rejects.toThrow('Shift tidak ditemukan');
  });
});

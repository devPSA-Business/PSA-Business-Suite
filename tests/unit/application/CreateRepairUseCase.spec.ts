import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateRepairUseCase } from '@features/services/usecases/CreateRepairUseCase';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { IRepairRepository } from '@domain/repositories/IRepairRepository';

describe('CreateRepairUseCase', () => {
  let mockUow: IUnitOfWork;
  let mockRepairRepo: IRepairRepository;
  let useCase: CreateRepairUseCase;

  beforeEach(() => {
    mockUow = {
      execute: vi.fn().mockImplementation(async (callback) => {
        return await callback();
      }),
      registerAudit: vi.fn(),
      registerSync: vi.fn(),
    } as unknown as IUnitOfWork;

    mockRepairRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as IRepairRepository;

    useCase = new CreateRepairUseCase(mockRepairRepo, mockUow);
  });

  it('should successfully create a repair service', async () => {
    const result = await useCase.execute({
      customerName: 'Budi',
      phoneNumber: '0812345678',
      itemDescription: 'Cincin Patah',
      serviceType: 'SEPUH',
      initialWeight: 5,
      price: 50000,
      paymentMethod: 'CASH',
      userId: 'user1',
      photoBeforeBase64: 'base64str...'
    });

    expect(result).toBeDefined();
    expect(mockRepairRepo.save).toHaveBeenCalled();
    expect(mockUow.registerAudit).toHaveBeenCalled();
    expect(mockUow.registerSync).toHaveBeenCalled();
  });

  it('should throw error if photo is missing', async () => {
    await expect(useCase.execute({
      customerName: 'Budi',
      phoneNumber: '0812345678',
      itemDescription: 'Cincin Patah',
      serviceType: 'SEPUH',
      initialWeight: 5,
      price: 50000,
      paymentMethod: 'CASH',
      userId: 'user1',
    })).rejects.toThrow('Foto bukti reparasi (Before) wajib dilampirkan.');
  });
});

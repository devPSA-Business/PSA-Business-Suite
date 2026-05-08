import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageCustomOrderUseCase } from '../../../src/features/services/usecases/ManageCustomOrderUseCase';

describe('ManageCustomOrderUseCase', () => {
  let useCase: ManageCustomOrderUseCase;
  let mockCustomOrderRepo: any;
  let mockUow: any;

  beforeEach(() => {
    mockCustomOrderRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
    };
    mockUow = {
      execute: vi.fn(async (cb) => await cb()),
      registerAudit: vi.fn(),
      registerSync: vi.fn(),
    };

    useCase = new ManageCustomOrderUseCase(
      mockCustomOrderRepo,
      mockUow
    );
  });

  it('should create a custom order', async () => {
    const order = {
      id: 'o1',
      date: Date.now(),
      customerName: 'Bob',
      phoneNumber: '123',
      itemDescription: 'Gold Chain',
      description: 'Gold Chain Custom Order',
      estimatedPrice: 2000000,
      status: 'PENDING' as const,
      user: 'u1',
      createdAt: Date.now(),
      branchId: 'b1'
    };

    await useCase.createOrder(order);

    expect(mockCustomOrderRepo.save).toHaveBeenCalledWith(order);
    expect(mockUow.registerAudit).toHaveBeenCalled();
    expect(mockUow.registerSync).toHaveBeenCalled();
  });

  it('should mark a custom order as done', async () => {
    const order = {
      id: 'o1',
      customerName: 'Bob',
      status: 'PENDING' as const
    };
    mockCustomOrderRepo.findById.mockResolvedValue(order);

    await useCase.markAsDone('o1', 'u1');

    expect(order.status).toBe('DONE');
    expect(mockCustomOrderRepo.update).toHaveBeenCalledWith(order);
    expect(mockUow.registerAudit).toHaveBeenCalled();
  });

  it('should throw error if order not found when marking as done', async () => {
    mockCustomOrderRepo.findById.mockResolvedValue(null);

    await expect(useCase.markAsDone('invalid', 'u1')).rejects.toThrow('Pesanan tidak ditemukan');
  });
});

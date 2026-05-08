import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateRepairStatusUseCase } from '../../../src/features/services/usecases/UpdateRepairStatusUseCase';
import { RepairService } from '../../../src/domain/models/RepairService';

describe('UpdateRepairStatusUseCase', () => {
  let useCase: UpdateRepairStatusUseCase;
  let mockRepairRepo: any;
  let mockUow: any;
  let mockCommService: any;
  let mockCustomerRepo: any;

  beforeEach(() => {
    mockRepairRepo = {
      findById: vi.fn(),
      save: vi.fn(),
    };
    mockUow = {
      execute: vi.fn(async (cb) => await cb()),
      registerAudit: vi.fn(),
      registerSync: vi.fn(),
    };
    mockCommService = {
      sendMessage: vi.fn(),
    };
    mockCustomerRepo = {
      findById: vi.fn(),
    };

    useCase = new UpdateRepairStatusUseCase(
      mockRepairRepo,
      mockUow,
      mockCommService,
      mockCustomerRepo
    );
  });

  it('should update repair status from RECEIVED to IN_PROGRESS', async () => {
    const existing = RepairService.create({
      customerName: 'Alice',
      phoneNumber: '123',
      itemDescription: 'Ring',
      serviceType: 'REPARASI',
      initialWeight: 5,
      price: 1000,
      status: 'RECEIVED',
      userId: 'u1',
      photoBeforeBase64: 'data:image/png;base64,foo',
      paymentMethod: 'CASH'
    });
    mockRepairRepo.findById.mockResolvedValue(existing);

    const result = await useCase.execute({
      id: existing.id,
      newStatus: 'IN_PROGRESS',
      userId: 'u1'
    });

    expect(result.success).toBe(true);
    expect(mockRepairRepo.save).toHaveBeenCalled();
    expect(mockUow.registerAudit).toHaveBeenCalled();
  });

  it('should trigger notification when status changes to COMPLETED', async () => {
    const existing = RepairService.create({
      customerName: 'Alice',
      phoneNumber: '123',
      itemDescription: 'Ring',
      serviceType: 'REPARASI',
      initialWeight: 5,
      price: 1000,
      status: 'IN_PROGRESS',
      userId: 'u1',
      customerId: 'c1',
      photoBeforeBase64: 'data:image/png;base64,foo',
      paymentMethod: 'CASH'
    });
    mockRepairRepo.findById.mockResolvedValue(existing);
    
    mockCustomerRepo.findById.mockResolvedValue({
      name: 'Alice',
      phoneNumber: '0812345'
    });
    
    mockCommService.sendMessage.mockResolvedValue('http://whatsapp.link');

    const result = await useCase.execute({
      id: existing.id,
      newStatus: 'COMPLETED',
      userId: 'u1'
    });

    expect(result.success).toBe(true);
    expect(result.whatsappUrl).toBe('http://whatsapp.link');
    expect(mockCommService.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      to: '0812345',
      type: 'WHATSAPP'
    }));
  });

  it('should throw error if repair not found', async () => {
    mockRepairRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({
      id: 'invalid',
      newStatus: 'COMPLETED',
      userId: 'u1'
    })).rejects.toThrow('Data reparasi tidak ditemukan');
  });
});

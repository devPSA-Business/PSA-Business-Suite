/**
 * PSA Business Suite — Unit Tests: Customer Management Use Cases
 *
 * Cakupan:
 *  - CreateCustomerUseCase: happy path, loyaltyPoints=0, audit trail, sync registration
 *  - UpdateCustomerUseCase: happy path, not-found guard, version increment, audit + sync
 *  - DeleteCustomerUseCase: soft-delete, not-found guard, audit + sync (UPDATE not DELETE)
 *
 * @ai_context Unit test customer CRUD. Semua dependency di-mock.
 * @security_tier LOW
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateCustomerUseCase } from '../../../src/features/admin/usecases/CreateCustomerUseCase';
import { UpdateCustomerUseCase } from '../../../src/features/admin/usecases/UpdateCustomerUseCase';
import { DeleteCustomerUseCase } from '../../../src/features/admin/usecases/DeleteCustomerUseCase';
import { Customer } from '../../../src/domain/models/Customer';
import { ICustomerRepository } from '../../../src/domain/repositories/ICustomerRepository';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';

// ─── Shared Mock Factories ─────────────────────────────────────────────────

function buildMockUow(): IUnitOfWork {
  return {
    execute: vi.fn().mockImplementation(async (callback: () => Promise<unknown>) => callback()),
    registerAudit: vi.fn().mockResolvedValue(undefined),
    registerSync: vi.fn().mockResolvedValue(undefined),
    registerStockHistory: vi.fn().mockResolvedValue(undefined),
    registerGoldAssetHistory: vi.fn().mockResolvedValue(undefined),
  } as unknown as IUnitOfWork;
}

function buildMockCustomerRepo(): ICustomerRepository {
  return {
    findById: vi.fn(),
    findAll: vi.fn().mockResolvedValue([]),
    search: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function buildExistingCustomer(id = 'CUST-001', name = 'Siti Rahayu'): Customer {
  return Customer.create(
    { name, phoneNumber: '081234567890', email: 'siti@test.com', loyaltyPoints: 0 },
    id
  );
}

// ─── CreateCustomerUseCase ─────────────────────────────────────────────────

describe('CreateCustomerUseCase', () => {
  let mockRepo: ICustomerRepository;
  let mockUow: IUnitOfWork;
  let useCase: CreateCustomerUseCase;

  beforeEach(() => {
    mockRepo = buildMockCustomerRepo();
    mockUow = buildMockUow();
    useCase = new CreateCustomerUseCase(mockRepo, mockUow);
  });

  it('should call repository.save and return saved customer', async () => {
    const saved = buildExistingCustomer();
    vi.mocked(mockRepo.save).mockResolvedValue(saved);

    const result = await useCase.execute({
      name: 'Siti Rahayu',
      phoneNumber: '081234567890',
      userId: 'USER-KASIR-01',
    });

    expect(result).toBe(saved);
    expect(mockRepo.save).toHaveBeenCalledOnce();
  });

  it('should initialize loyaltyPoints to 0 regardless of request', async () => {
    let capturedCustomer: Customer | undefined;
    vi.mocked(mockRepo.save).mockImplementation(async (c) => {
      capturedCustomer = c;
      return c;
    });

    await useCase.execute({ name: 'Pelanggan Baru', phoneNumber: '082222222222', userId: 'U1' });

    expect(capturedCustomer?.loyaltyPoints).toBe(0);
  });

  it('should register CREATE_CUSTOMER audit log with correct userId', async () => {
    const saved = buildExistingCustomer();
    vi.mocked(mockRepo.save).mockResolvedValue(saved);

    await useCase.execute({ name: 'Siti Rahayu', phoneNumber: '081234567890', userId: 'USER-KASIR-01' });

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'CREATE_CUSTOMER', 'USER-KASIR-01', expect.stringContaining('Siti Rahayu')
    );
  });

  it('should register sync INSERT event for customers collection', async () => {
    const saved = buildExistingCustomer();
    vi.mocked(mockRepo.save).mockResolvedValue(saved);

    await useCase.execute({ name: 'Siti Rahayu', phoneNumber: '081234567890', userId: 'U1' });

    expect(mockUow.registerSync).toHaveBeenCalledWith(
      'customers', 'INSERT', expect.objectContaining({ id: saved.id, name: saved.name })
    );
  });
});

// ─── UpdateCustomerUseCase ─────────────────────────────────────────────────

describe('UpdateCustomerUseCase', () => {
  let mockRepo: ICustomerRepository;
  let mockUow: IUnitOfWork;
  let useCase: UpdateCustomerUseCase;

  beforeEach(() => {
    mockRepo = buildMockCustomerRepo();
    mockUow = buildMockUow();
    useCase = new UpdateCustomerUseCase(mockRepo, mockUow);
  });

  it('should throw if customer not found', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute({ id: 'GHOST', userId: 'U1' }))
      .rejects.toThrow('Pelanggan tidak ditemukan');
  });

  it('should update and return customer with incremented version', async () => {
    const existing = buildExistingCustomer();
    const initialVersion = existing.version;
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.update).mockImplementation(async (c) => c);

    const result = await useCase.execute({ id: 'CUST-001', name: 'Nama Baru', userId: 'U1' });

    expect(result.name).toBe('Nama Baru');
    expect(result.version).toBe(initialVersion + 1);
  });

  it('should register UPDATE_CUSTOMER audit log', async () => {
    const existing = buildExistingCustomer();
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.update).mockImplementation(async (c) => c);

    await useCase.execute({ id: 'CUST-001', name: 'Baru', userId: 'USER-ADMIN-01' });

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'UPDATE_CUSTOMER', 'USER-ADMIN-01', expect.any(String)
    );
  });

  it('should register sync UPDATE event for customers collection', async () => {
    const existing = buildExistingCustomer('CUST-001');
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.update).mockImplementation(async (c) => c);

    await useCase.execute({ id: 'CUST-001', name: 'Baru', userId: 'U1' });

    expect(mockUow.registerSync).toHaveBeenCalledWith(
      'customers', 'UPDATE', expect.objectContaining({ id: 'CUST-001' })
    );
  });
});

// ─── DeleteCustomerUseCase ─────────────────────────────────────────────────

describe('DeleteCustomerUseCase', () => {
  let mockRepo: ICustomerRepository;
  let mockUow: IUnitOfWork;
  let useCase: DeleteCustomerUseCase;

  beforeEach(() => {
    mockRepo = buildMockCustomerRepo();
    mockUow = buildMockUow();
    useCase = new DeleteCustomerUseCase(mockRepo, mockUow);
  });

  it('should throw if customer not found', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute('GHOST', 'U1'))
      .rejects.toThrow('Pelanggan tidak ditemukan');
  });

  it('should soft-delete (isDeleted=true) and NOT call hard delete', async () => {
    const existing = buildExistingCustomer();
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);

    let capturedUpdate: Customer | undefined;
    vi.mocked(mockRepo.update).mockImplementation(async (c) => {
      capturedUpdate = c;
      return c;
    });

    await useCase.execute('CUST-001', 'USER-ADMIN-01');

    expect(capturedUpdate?.isDeleted).toBe(true);
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });

  it('should register DELETE_CUSTOMER audit log with customer name', async () => {
    const existing = buildExistingCustomer('CUST-001', 'Budi Santoso');
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.update).mockImplementation(async (c) => c);

    await useCase.execute('CUST-001', 'USER-ADMIN-01');

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'DELETE_CUSTOMER', 'USER-ADMIN-01', expect.stringContaining('Budi Santoso')
    );
  });

  it('should register sync UPDATE (not DELETE) with isDeleted:true', async () => {
    const existing = buildExistingCustomer('CUST-001');
    vi.mocked(mockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockRepo.update).mockImplementation(async (c) => c);

    await useCase.execute('CUST-001', 'USER-ADMIN-01');

    expect(mockUow.registerSync).toHaveBeenCalledWith(
      'customers', 'UPDATE', expect.objectContaining({ id: 'CUST-001', isDeleted: true })
    );
  });
});

/**
 * PSA Business Suite — Unit Tests: ManageUserUseCase
 *
 * Cakupan:
 *  - createUser:  happy path, duplikat nama, audit trail, sync registration
 *  - updateUser:  happy path, not-found guard, partial update, PIN update dengan salt
 *  - deleteUser:  happy path, not-found guard, self-delete guard, audit + sync
 *
 * NT-01 Fix (Audit 2026-06-12): Menguji bahwa semua operasi CRUD user/karyawan
 * melewati ManageUserUseCase dan tidak langsung mengakses DB layer.
 *
 * @ai_context Unit test user management CRUD. Semua dependency di-mock.
 * @security_tier HIGH
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageUserUseCase } from '../../../src/features/admin/usecases/ManageUserUseCase';
import { IUserRepository } from '../../../src/domain/repositories/IUserRepository';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';
import { User, UserRole } from '../../../src/domain/models/User';

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

function buildMockUserRepo(): IUserRepository {
  return {
    findById: vi.fn(),
    findByName: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    deleteById: vi.fn().mockResolvedValue(undefined),
  };
}

function buildExistingUser(id = 'USR-001', name = 'Ahmad Kasir'): User {
  return {
    id,
    name,
    role: UserRole.CASHIER,
    pinHash: 'hash-lama',
    branchId: 'HQ',
    status: 'ACTIVE',
    createdAt: Date.now(),
  };
}

// ─── createUser ────────────────────────────────────────────────────────────

describe('ManageUserUseCase.createUser', () => {
  let mockRepo: IUserRepository;
  let mockUow: IUnitOfWork;
  let useCase: ManageUserUseCase;

  beforeEach(() => {
    mockRepo = buildMockUserRepo();
    mockUow = buildMockUow();
    useCase = new ManageUserUseCase(mockRepo, mockUow);
  });

  it('should call repository.save with correct user fields', async () => {
    const result = await useCase.createUser({
      id: 'USR-001',
      name: 'Ahmad Kasir',
      role: UserRole.CASHIER,
      branchId: 'HQ',
      pinHash: 'hash-abc',
      requestedBy: 'USR-ADMIN-01',
    });

    expect(mockRepo.save).toHaveBeenCalledOnce();
    expect(result.id).toBe('USR-001');
    expect(result.name).toBe('Ahmad Kasir');
    expect(result.role).toBe(UserRole.CASHIER);
    expect(result.status).toBe('ACTIVE');
  });

  it('should register audit log CREATE_USER with correct actor', async () => {
    await useCase.createUser({
      id: 'USR-002',
      name: 'Budi Manager',
      role: UserRole.MANAGER,
      branchId: 'HQ',
      pinHash: 'hash-xyz',
      requestedBy: 'USR-ADMIN-01',
    });

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'CREATE_USER',
      'USR-ADMIN-01',
      expect.stringContaining('Budi Manager'),
      expect.objectContaining({ entityId: 'USR-002', role: UserRole.MANAGER })
    );
  });

  it('should register sync event INSERT for users table', async () => {
    await useCase.createUser({
      id: 'USR-003',
      name: 'Cici Cashier',
      role: UserRole.CASHIER,
      branchId: 'CABANG-01',
      pinHash: 'hash-xyz',
      requestedBy: 'USR-ADMIN-01',
    });

    expect(mockUow.registerSync).toHaveBeenCalledWith(
      'users',
      'INSERT',
      expect.objectContaining({ id: 'USR-003', name: 'Cici Cashier' })
    );
  });

  it('should throw if user with same name already exists', async () => {
    vi.mocked(mockRepo.findByName).mockResolvedValue(buildExistingUser('USR-EXISTING', 'Ahmad Kasir'));

    await expect(
      useCase.createUser({
        id: 'USR-NEW',
        name: 'Ahmad Kasir',
        role: UserRole.CASHIER,
        branchId: 'HQ',
        pinHash: 'hash-abc',
        requestedBy: 'USR-ADMIN-01',
      })
    ).rejects.toThrow('Ahmad Kasir');

    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('should persist salt when provided', async () => {
    const salt = new Uint8Array([1, 2, 3, 4]);
    let capturedUser: User | undefined;
    vi.mocked(mockRepo.save).mockImplementation(async (u) => { capturedUser = u; });

    await useCase.createUser({
      id: 'USR-004',
      name: 'Dewi Admin',
      role: UserRole.ADMIN,
      branchId: 'HQ',
      pinHash: 'hash-salt',
      salt,
      requestedBy: 'USR-ADMIN-01',
    });

    expect(capturedUser?.salt).toBe(salt);
  });

  it('should wrap work in UnitOfWork.execute', async () => {
    await useCase.createUser({
      id: 'USR-005',
      name: 'Eko Staf',
      role: UserRole.CASHIER,
      branchId: 'HQ',
      pinHash: 'hash',
      requestedBy: 'USR-ADMIN-01',
    });

    expect(mockUow.execute).toHaveBeenCalledOnce();
  });
});

// ─── updateUser ────────────────────────────────────────────────────────────

describe('ManageUserUseCase.updateUser', () => {
  let mockRepo: IUserRepository;
  let mockUow: IUnitOfWork;
  let useCase: ManageUserUseCase;
  let existingUser: User;

  beforeEach(() => {
    mockRepo = buildMockUserRepo();
    mockUow = buildMockUow();
    useCase = new ManageUserUseCase(mockRepo, mockUow);
    existingUser = buildExistingUser();
    vi.mocked(mockRepo.findById).mockResolvedValue(existingUser);
  });

  it('should update name and role, keep other fields intact', async () => {
    let capturedUser: User | undefined;
    vi.mocked(mockRepo.save).mockImplementation(async (u) => { capturedUser = u; });

    await useCase.updateUser({
      id: 'USR-001',
      name: 'Ahmad Senior Kasir',
      role: UserRole.MANAGER,
      requestedBy: 'USR-ADMIN-01',
    });

    expect(capturedUser?.name).toBe('Ahmad Senior Kasir');
    expect(capturedUser?.role).toBe(UserRole.MANAGER);
    expect(capturedUser?.pinHash).toBe('hash-lama'); // unchanged
    expect(capturedUser?.branchId).toBe('HQ'); // unchanged
    expect(capturedUser?.status).toBe('ACTIVE'); // unchanged
  });

  it('should update pinHash and salt when provided', async () => {
    const newSalt = new Uint8Array([10, 20, 30]);
    let capturedUser: User | undefined;
    vi.mocked(mockRepo.save).mockImplementation(async (u) => { capturedUser = u; });

    await useCase.updateUser({
      id: 'USR-001',
      pinHash: 'hash-baru',
      salt: newSalt,
      requestedBy: 'USR-ADMIN-01',
    });

    expect(capturedUser?.pinHash).toBe('hash-baru');
    expect(capturedUser?.salt).toBe(newSalt);
  });

  it('should throw if user not found', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(
      useCase.updateUser({ id: 'USR-GHOST', name: 'Ghost', requestedBy: 'USR-ADMIN-01' })
    ).rejects.toThrow('USR-GHOST');

    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('should register audit log UPDATE_USER', async () => {
    await useCase.updateUser({
      id: 'USR-001',
      name: 'Ahmad Baru',
      requestedBy: 'USR-ADMIN-01',
    });

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'UPDATE_USER',
      'USR-ADMIN-01',
      expect.stringContaining('Ahmad'),
      expect.objectContaining({ entityId: 'USR-001' })
    );
  });

  it('should register sync event UPDATE for users table', async () => {
    await useCase.updateUser({
      id: 'USR-001',
      name: 'Ahmad Updated',
      requestedBy: 'USR-ADMIN-01',
    });

    expect(mockUow.registerSync).toHaveBeenCalledWith(
      'users',
      'UPDATE',
      expect.objectContaining({ id: 'USR-001' })
    );
  });

  it('should apply partial updates — untouched fields stay from existing user', async () => {
    let capturedUser: User | undefined;
    vi.mocked(mockRepo.save).mockImplementation(async (u) => { capturedUser = u; });

    // Only update branchId, everything else should stay the same
    await useCase.updateUser({
      id: 'USR-001',
      branchId: 'CABANG-01',
      requestedBy: 'USR-ADMIN-01',
    });

    expect(capturedUser?.name).toBe(existingUser.name);
    expect(capturedUser?.role).toBe(existingUser.role);
    expect(capturedUser?.branchId).toBe('CABANG-01');
  });
});

// ─── deleteUser ────────────────────────────────────────────────────────────

describe('ManageUserUseCase.deleteUser', () => {
  let mockRepo: IUserRepository;
  let mockUow: IUnitOfWork;
  let useCase: ManageUserUseCase;

  beforeEach(() => {
    mockRepo = buildMockUserRepo();
    mockUow = buildMockUow();
    useCase = new ManageUserUseCase(mockRepo, mockUow);
    vi.mocked(mockRepo.findById).mockResolvedValue(buildExistingUser());
  });

  it('should call repository.deleteById with correct id', async () => {
    await useCase.deleteUser({ id: 'USR-001', requestedBy: 'USR-ADMIN-01' });

    expect(mockRepo.deleteById).toHaveBeenCalledWith('USR-001');
  });

  it('should throw if user not found', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(
      useCase.deleteUser({ id: 'USR-GHOST', requestedBy: 'USR-ADMIN-01' })
    ).rejects.toThrow('USR-GHOST');

    expect(mockRepo.deleteById).not.toHaveBeenCalled();
  });

  it('should throw if requestedBy === id (self-delete attempt)', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(buildExistingUser('USR-ADMIN-01', 'Admin'));

    await expect(
      useCase.deleteUser({ id: 'USR-ADMIN-01', requestedBy: 'USR-ADMIN-01' })
    ).rejects.toThrow('sendiri');

    expect(mockRepo.deleteById).not.toHaveBeenCalled();
  });

  it('should register audit log DELETE_USER with user info', async () => {
    await useCase.deleteUser({ id: 'USR-001', requestedBy: 'USR-ADMIN-01' });

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'DELETE_USER',
      'USR-ADMIN-01',
      expect.stringContaining('Ahmad Kasir'),
      expect.objectContaining({ entityId: 'USR-001' })
    );
  });

  it('should register sync event DELETE for users table', async () => {
    await useCase.deleteUser({ id: 'USR-001', requestedBy: 'USR-ADMIN-01' });

    expect(mockUow.registerSync).toHaveBeenCalledWith(
      'users',
      'DELETE',
      expect.objectContaining({ id: 'USR-001', deletedAt: expect.any(Number) })
    );
  });

  it('should wrap work in UnitOfWork.execute', async () => {
    await useCase.deleteUser({ id: 'USR-001', requestedBy: 'USR-ADMIN-01' });

    expect(mockUow.execute).toHaveBeenCalledOnce();
  });
});

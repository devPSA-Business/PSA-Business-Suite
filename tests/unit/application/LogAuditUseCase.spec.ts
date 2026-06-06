import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogAuditUseCase } from '../../../src/features/audit/usecases/LogAuditUseCase';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';

describe('LogAuditUseCase', () => {
  let useCase: LogAuditUseCase;
  let mockUow: IUnitOfWork;

  beforeEach(() => {
    mockUow = {
      execute: vi.fn(async (work) => work()),
      registerAudit: vi.fn().mockResolvedValue(undefined),
      registerSync: vi.fn(),
      registerStockHistory: vi.fn(),
      registerGoldAssetHistory: vi.fn(),
    };
    useCase = new LogAuditUseCase(mockUow);
  });

  // ─── Core Behavior ────────────────────────────────────────────────────────

  it('harus memanggil unitOfWork.registerAudit() dengan action, user, dan details yang tepat', async () => {
    await useCase.execute('USER_LOGIN', 'admin-001', 'Login dari browser Chrome');

    expect(mockUow.registerAudit).toHaveBeenCalledOnce();
    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'USER_LOGIN',
      'admin-001',
      'Login dari browser Chrome'
    );
  });

  it('harus membungkus operasi dalam unitOfWork.execute() dengan tables ["audit_logs"]', async () => {
    await useCase.execute('OPEN_SHIFT', 'kasir-01', 'Shift dibuka');

    expect(mockUow.execute).toHaveBeenCalledOnce();
    expect(mockUow.execute).toHaveBeenCalledWith(
      expect.any(Function),
      ['audit_logs']
    );
  });

  it('action string harus di-pass verbatim tanpa transformasi', async () => {
    const rawAction = 'CUSTOM_ACTION_WITH_UNDERSCORE_123';
    await useCase.execute(rawAction, 'user', 'detail');

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      rawAction,
      expect.any(String),
      expect.any(String)
    );
  });

  it('harus resolve void pada eksekusi sukses', async () => {
    const result = await useCase.execute('CLOSE_SHIFT', 'mgr-01', 'Shift ditutup');

    expect(result).toBeUndefined();
  });

  // ─── Error Propagation ────────────────────────────────────────────────────

  it('harus propagate error jika unitOfWork.registerAudit() throws', async () => {
    vi.mocked(mockUow.registerAudit).mockRejectedValue(new Error('IndexedDB quota exceeded'));

    await expect(
      useCase.execute('SOME_ACTION', 'user-1', 'detail')
    ).rejects.toThrow('IndexedDB quota exceeded');
  });

  it('harus propagate error jika unitOfWork.execute() sendiri throws', async () => {
    vi.mocked(mockUow.execute).mockRejectedValue(new Error('Transaction aborted'));

    await expect(
      useCase.execute('SOME_ACTION', 'user-1', 'detail')
    ).rejects.toThrow('Transaction aborted');
  });

  // ─── Boundary Conditions ─────────────────────────────────────────────────

  it('harus berfungsi dengan string kosong sebagai action (tidak validasi di use case)', async () => {
    await expect(
      useCase.execute('', '', '')
    ).resolves.not.toThrow();

    expect(mockUow.registerAudit).toHaveBeenCalledWith('', '', '');
  });

  it('registerAudit harus dipanggil di dalam konteks unitOfWork.execute(), bukan di luar', async () => {
    // Verifikasi urutan: execute() wrap registerAudit(), bukan sebaliknya.
    // Jika execute() tidak dipanggil, registerAudit() juga tidak boleh dipanggil.
    vi.mocked(mockUow.execute).mockImplementation(async () => {
      // sengaja tidak panggil work() untuk verifikasi dependency
    });

    await useCase.execute('ACTION', 'user', 'details');

    // execute dipanggil, tapi karena work() tidak dieksekusi di mock ini,
    // registerAudit pun tidak terpanggil
    expect(mockUow.execute).toHaveBeenCalledOnce();
    expect(mockUow.registerAudit).not.toHaveBeenCalled();
  });
});

/**
 * @ai_context Test suite CloseShiftUseCase — branch coverage 20% → 60%+
 * @business_rule Shift rekonsiliasi adalah jalur kritis; setiap branch harus tervalidasi:
 *   - shift tidak ditemukan → hard fail
 *   - backup gagal → soft fail (lanjut, catat audit)
 *   - setTimeout fire-and-forget: sync + prune (success/fail/empty)
 *   - unitOfWork.execute() throw → mapErrorToUser
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CloseShiftUseCase } from '@features/shift/usecases/CloseShiftUseCase';
import { IShiftRepository } from '@domain/repositories/IShiftRepository';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { ISyncService } from '@application/services/ISyncService';
import { Shift } from '@domain/models/Shift';

// ─── Module Mocks ─────────────────────────────────────────────────────────────

vi.mock('@shared/utils/backupManager', () => ({
  backupManager: {
    autoBackupLocal: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@shared/utils/dataArchiver', () => ({
  archiveOldLogsAndEvents: vi.fn().mockResolvedValue({ count: 0 })
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMockShift(): Shift {
  return Shift.create({
    startCash: 100000,
    startTime: Date.now() - 3600_000,
    status: 'OPEN',
    userId: 'user-1',
  });
}

function makeDefaultMocks() {
  const mockShiftRepo: IShiftRepository = {
    findById: vi.fn().mockResolvedValue(makeMockShift()),
    save: vi.fn().mockResolvedValue(undefined),
    calculateExpectedCash: vi.fn().mockResolvedValue(150000),
  } as unknown as IShiftRepository;

  const mockUow: IUnitOfWork = {
    execute: vi.fn().mockImplementation(async (callback: () => Promise<void>) => {
      return await callback();
    }),
    registerAudit: vi.fn().mockResolvedValue(undefined),
    registerSync: vi.fn().mockResolvedValue(undefined),
  } as unknown as IUnitOfWork;

  const mockSyncService: ISyncService = {
    processSyncQueue: vi.fn().mockResolvedValue(true),
  } as unknown as ISyncService;

  return { mockShiftRepo, mockUow, mockSyncService };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('CloseShiftUseCase', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let backupManager: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let archiveOldLogsAndEvents: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    // Re-import mocked modules to get fresh references after each reset
    const backupMod = await import('@shared/utils/backupManager');
    backupManager = backupMod.backupManager;
    const archiverMod = await import('@shared/utils/dataArchiver');
    archiveOldLogsAndEvents = archiverMod.archiveOldLogsAndEvents;

    // Reset mocks to defaults before each test
    vi.mocked(backupManager.autoBackupLocal).mockResolvedValue(undefined);
    vi.mocked(archiveOldLogsAndEvents).mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ─── TC-CLOSE-1: Happy path ─────────────────────────────────────────────────

  it('TC-CLOSE-1: should successfully close a shift and invoke all side effects', async () => {
    const { mockShiftRepo, mockUow, mockSyncService } = makeDefaultMocks();
    const shift = makeMockShift();
    vi.mocked(mockShiftRepo.findById).mockResolvedValue(shift);

    const useCase = new CloseShiftUseCase(mockShiftRepo, mockUow, mockSyncService);

    await useCase.execute({
      shiftId: shift.id,
      endCash: 150000,
      userId: 'user-1',
    });

    expect(mockShiftRepo.save).toHaveBeenCalledOnce();
    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'AUTO_BACKUP_SUCCESS',
      'user-1',
      expect.stringContaining('berhasil')
    );
    expect(mockUow.registerSync).toHaveBeenCalledOnce();
  });

  // ─── TC-CLOSE-2: Shift not found → hard fail ───────────────────────────────

  it('TC-CLOSE-2: should throw user-facing error when shift is not found', async () => {
    const { mockShiftRepo, mockUow, mockSyncService } = makeDefaultMocks();
    vi.mocked(mockShiftRepo.findById).mockResolvedValue(null);

    const useCase = new CloseShiftUseCase(mockShiftRepo, mockUow, mockSyncService);

    await expect(
      useCase.execute({ shiftId: 'ghost-id', endCash: 150000, userId: 'user-1' })
    ).rejects.toThrow('Shift tidak ditemukan');

    expect(mockShiftRepo.save).not.toHaveBeenCalled();
  });

  // ─── TC-CLOSE-3: Backup failure → soft fail, shift still closes ────────────

  it('TC-CLOSE-3: backup failure records AUTO_BACKUP_FAILED audit but does NOT abort shift close', async () => {
    const { mockShiftRepo, mockUow, mockSyncService } = makeDefaultMocks();
    const shift = makeMockShift();
    vi.mocked(mockShiftRepo.findById).mockResolvedValue(shift);
    vi.mocked(backupManager.autoBackupLocal).mockRejectedValue(new Error('Storage full'));

    const useCase = new CloseShiftUseCase(mockShiftRepo, mockUow, mockSyncService);

    // Should NOT throw despite backup failure
    await useCase.execute({ shiftId: shift.id, endCash: 150000, userId: 'user-1' });

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'AUTO_BACKUP_FAILED',
      'user-1',
      expect.stringContaining('Storage full')
    );
    // Shift should still be persisted
    expect(mockShiftRepo.save).toHaveBeenCalledOnce();
  });

  // ─── TC-CLOSE-4: unitOfWork.execute() throws → mapErrorToUser propagates ───

  it('TC-CLOSE-4: should re-throw mapped error when unitOfWork.execute() throws', async () => {
    const { mockShiftRepo, mockUow, mockSyncService } = makeDefaultMocks();
    vi.mocked(mockUow.execute).mockRejectedValue(new Error('IndexedDB transaction failed'));

    const useCase = new CloseShiftUseCase(mockShiftRepo, mockUow, mockSyncService);

    await expect(
      useCase.execute({ shiftId: 'any-id', endCash: 0, userId: 'user-1' })
    ).rejects.toThrow(); // mapErrorToUser wraps — just assert it rejects

    expect(mockShiftRepo.save).not.toHaveBeenCalled();
  });

  // ─── TC-CLOSE-5: setTimeout — processSyncQueue succeeds (silent) ───────────

  it('TC-CLOSE-5: processSyncQueue success should complete silently after 1000ms', async () => {
    const { mockShiftRepo, mockUow, mockSyncService } = makeDefaultMocks();
    vi.mocked(mockShiftRepo.findById).mockResolvedValue(makeMockShift());
    vi.mocked(mockSyncService.processSyncQueue).mockResolvedValue(undefined);

    const useCase = new CloseShiftUseCase(mockShiftRepo, mockUow, mockSyncService);

    await useCase.execute({ shiftId: 'sid', endCash: 150000, userId: 'user-1' });

    // Advance fake timer to fire setTimeout(, 1000)
    await vi.runAllTimersAsync();

    expect(mockSyncService.processSyncQueue).toHaveBeenCalledOnce();
  });

  // ─── TC-CLOSE-6: setTimeout — processSyncQueue throws → only logs, no crash ─

  it('TC-CLOSE-6: processSyncQueue failure inside setTimeout should not crash or reject', async () => {
    const { mockShiftRepo, mockUow, mockSyncService } = makeDefaultMocks();
    vi.mocked(mockShiftRepo.findById).mockResolvedValue(makeMockShift());
    vi.mocked(mockSyncService.processSyncQueue).mockRejectedValue(new Error('Offline'));

    const useCase = new CloseShiftUseCase(mockShiftRepo, mockUow, mockSyncService);

    // execute() itself must not throw
    await expect(
      useCase.execute({ shiftId: 'sid', endCash: 150000, userId: 'user-1' })
    ).resolves.toBeUndefined();

    // Advance timer — catches the rejected promise internally
    await vi.runAllTimersAsync();

    expect(mockSyncService.processSyncQueue).toHaveBeenCalledOnce();
    // Shift was saved before setTimeout ran
    expect(mockShiftRepo.save).toHaveBeenCalledOnce();
  });

  // ─── TC-CLOSE-7: setTimeout — archiveOldLogsAndEvents success count > 0 ────

  it('TC-CLOSE-7: prune success with count > 0 logs info and registers AUTO_PRUNE_SUCCESS audit', async () => {
    const { mockShiftRepo, mockUow, mockSyncService } = makeDefaultMocks();
    vi.mocked(mockShiftRepo.findById).mockResolvedValue(makeMockShift());
    vi.mocked(archiveOldLogsAndEvents).mockResolvedValue({ count: 42 });

    const useCase = new CloseShiftUseCase(mockShiftRepo, mockUow, mockSyncService);

    await useCase.execute({ shiftId: 'sid', endCash: 150000, userId: 'user-1' });
    await vi.runAllTimersAsync();

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'AUTO_PRUNE_SUCCESS',
      'user-1',
      expect.stringContaining('42')
    );
  });

  // ─── TC-CLOSE-8: setTimeout — archiveOldLogsAndEvents success count === 0 ──

  it('TC-CLOSE-8: prune success with count === 0 should NOT register any prune audit', async () => {
    const { mockShiftRepo, mockUow, mockSyncService } = makeDefaultMocks();
    vi.mocked(mockShiftRepo.findById).mockResolvedValue(makeMockShift());
    vi.mocked(archiveOldLogsAndEvents).mockResolvedValue({ count: 0 });

    const useCase = new CloseShiftUseCase(mockShiftRepo, mockUow, mockSyncService);

    await useCase.execute({ shiftId: 'sid', endCash: 150000, userId: 'user-1' });
    await vi.runAllTimersAsync();

    const auditCalls = vi.mocked(mockUow.registerAudit).mock.calls.map(c => c[0]);
    expect(auditCalls).not.toContain('AUTO_PRUNE_SUCCESS');
    expect(auditCalls).not.toContain('AUTO_PRUNE_FAILED');
  });

  // ─── TC-CLOSE-9: setTimeout — archiveOldLogsAndEvents throws → soft warn ───

  it('TC-CLOSE-9: prune failure should log warn and register AUTO_PRUNE_FAILED audit without crashing', async () => {
    const { mockShiftRepo, mockUow, mockSyncService } = makeDefaultMocks();
    vi.mocked(mockShiftRepo.findById).mockResolvedValue(makeMockShift());
    vi.mocked(archiveOldLogsAndEvents).mockRejectedValue(new Error('Dexie write quota exceeded'));

    const useCase = new CloseShiftUseCase(mockShiftRepo, mockUow, mockSyncService);

    // Main execute must succeed
    await expect(
      useCase.execute({ shiftId: 'sid', endCash: 150000, userId: 'user-1' })
    ).resolves.toBeUndefined();

    await vi.runAllTimersAsync();

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'AUTO_PRUNE_FAILED',
      'user-1',
      expect.stringContaining('Dexie write quota exceeded')
    );
    // Shift was already saved before prune ran
    expect(mockShiftRepo.save).toHaveBeenCalledOnce();
  });

  // ─── TC-CLOSE-10: Discrepancy calculation correctness ──────────────────────

  it('TC-CLOSE-10: should pass correct discrepancy values to audit log', async () => {
    const { mockShiftRepo, mockUow, mockSyncService } = makeDefaultMocks();
    const shift = makeMockShift();
    vi.mocked(mockShiftRepo.findById).mockResolvedValue(shift);
    // expectedCash = 150000, endCash = 180000 → discrepancy = +30000
    vi.mocked(mockShiftRepo.calculateExpectedCash).mockResolvedValue(150000);

    const useCase = new CloseShiftUseCase(mockShiftRepo, mockUow, mockSyncService);

    await useCase.execute({ shiftId: shift.id, endCash: 180000, userId: 'user-1' });

    const closeAuditCall = vi.mocked(mockUow.registerAudit).mock.calls.find(
      c => c[0] === 'CLOSE_SHIFT'
    );
    expect(closeAuditCall).toBeDefined();
    // Audit payload should mention discrepancy of 30000
    expect(closeAuditCall?.[2]).toContain('30.000');
  });
});

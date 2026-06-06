import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecordPettyCashUseCase } from '../../../src/features/pos/usecases/RecordPettyCashUseCase';
import { IPettyCashRepository } from '../../../src/domain/repositories/IPettyCashRepository';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';
import { PettyCash } from '../../../src/shared/api/db';

// ─── Dexie mock (vi.hoisted wajib — vi.mock factory dihoist sebelum variable declaration) ───
const { mockShiftsFirst, mockShiftTotalsGet, mockShiftTotalsPut } = vi.hoisted(() => ({
  mockShiftsFirst: vi.fn(),
  mockShiftTotalsGet: vi.fn(),
  mockShiftTotalsPut: vi.fn(),
}));

vi.mock('../../../src/shared/api/db', () => ({
  db: {
    shifts: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: mockShiftsFirst,
        }),
      }),
    },
    shift_totals: {
      get: mockShiftTotalsGet,
      put: mockShiftTotalsPut,
    },
  },
}));
// ─────────────────────────────────────────────────────────────────────────────

/** Fixture PettyCash valid — menghindari duplikasi di setiap test */
const makePettyCash = (overrides?: Partial<PettyCash>): PettyCash => ({
  id: 'cash-001',
  date: Date.now(),
  category: 'OPERASIONAL',
  amount: 150000,
  description: 'Pembelian ATK',
  user: 'admin-001',
  ...overrides,
});

describe('RecordPettyCashUseCase', () => {
  let useCase: RecordPettyCashUseCase;
  let mockPettyCashRepo: IPettyCashRepository;
  let mockUow: IUnitOfWork;

  beforeEach(() => {
    // Reset db mocks ke state default (tidak ada open shift)
    mockShiftsFirst.mockResolvedValue(null);
    mockShiftTotalsGet.mockResolvedValue(null);
    mockShiftTotalsPut.mockResolvedValue(undefined);

    mockPettyCashRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      getTodayQuery: vi.fn(),
    };
    mockUow = {
      execute: vi.fn(async (work) => work()),
      registerAudit: vi.fn().mockResolvedValue(undefined),
      registerSync: vi.fn().mockResolvedValue(undefined),
      registerStockHistory: vi.fn(),
      registerGoldAssetHistory: vi.fn(),
    };
    useCase = new RecordPettyCashUseCase(mockPettyCashRepo, mockUow);
  });

  // ─── Core Behavior ────────────────────────────────────────────────────────

  it('harus memanggil pettyCashRepository.save() dengan data petty cash yang benar', async () => {
    const pettyCash = makePettyCash();
    await useCase.execute(pettyCash);

    expect(mockPettyCashRepo.save).toHaveBeenCalledOnce();
    expect(mockPettyCashRepo.save).toHaveBeenCalledWith(pettyCash);
  });

  it('harus memanggil unitOfWork.registerAudit() dengan action RECORD_PETTY_CASH', async () => {
    const pettyCash = makePettyCash({ user: 'kasir-007', id: 'cash-XYZ' });
    await useCase.execute(pettyCash);

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'RECORD_PETTY_CASH',
      pettyCash.user,
      expect.stringContaining('Mencatat pengeluaran kas'),
      expect.objectContaining({
        userId: pettyCash.user,
        entityId: pettyCash.id,
      })
    );
  });

  it('harus memanggil unitOfWork.registerSync() dengan entityType petty_cash dan action INSERT', async () => {
    const pettyCash = makePettyCash();
    await useCase.execute(pettyCash);

    expect(mockUow.registerSync).toHaveBeenCalledWith(
      'petty_cash',
      'INSERT',
      expect.objectContaining({ id: pettyCash.id })
    );
  });

  it('harus membungkus seluruh operasi dalam unitOfWork.execute()', async () => {
    const pettyCash = makePettyCash();
    await useCase.execute(pettyCash);

    expect(mockUow.execute).toHaveBeenCalledOnce();
    expect(mockUow.execute).toHaveBeenCalledWith(
      expect.any(Function),
      ['petty_cash', 'shift_totals']
    );
  });

  it('harus meneruskan tables [petty_cash, shift_totals] ke unitOfWork.execute()', async () => {
    await useCase.execute(makePettyCash());

    const [, tables] = vi.mocked(mockUow.execute).mock.calls[0];
    expect(tables).toEqual(['petty_cash', 'shift_totals']);
  });

  // ─── Shift Integration (coverage path tambahan) ───────────────────────────

  it('harus memperbarui shift_totals jika ada open shift dengan shift total yang tersedia', async () => {
    const pettyCash = makePettyCash({ amount: 75000 });
    const fakeShift = { id: 'shift-001', status: 'OPEN', user: 'admin', startTime: Date.now() };
    const fakeShiftTotal = {
      id: 'shift-001', startTime: Date.now(), cashIn: 0,
      cashOut: 50000, pettyCashTotal: 50000, lastUpdatedAt: 0,
    };

    mockShiftsFirst.mockResolvedValue(fakeShift);
    mockShiftTotalsGet.mockResolvedValue(fakeShiftTotal);

    await useCase.execute(pettyCash);

    expect(mockShiftTotalsPut).toHaveBeenCalledWith(
      expect.objectContaining({
        cashOut: 125000,         // 50000 + 75000
        pettyCashTotal: 125000,  // 50000 + 75000
      })
    );
  });

  it('tidak harus crash jika open shift ada tetapi shift_totals tidak ditemukan', async () => {
    const fakeShift = { id: 'shift-002', status: 'OPEN', user: 'admin', startTime: Date.now() };
    mockShiftsFirst.mockResolvedValue(fakeShift);
    mockShiftTotalsGet.mockResolvedValue(null); // shift total tidak ada

    await expect(useCase.execute(makePettyCash())).resolves.not.toThrow();
    // pettyCashRepo.save dan registerAudit tetap harus dipanggil
    expect(mockPettyCashRepo.save).toHaveBeenCalledOnce();
    expect(mockUow.registerAudit).toHaveBeenCalledOnce();
  });

  it('harus propagate error jika pettyCashRepository.save() throws', async () => {
    vi.mocked(mockPettyCashRepo.save).mockRejectedValue(new Error('Disk full'));

    await expect(useCase.execute(makePettyCash())).rejects.toThrow('Disk full');
  });
});

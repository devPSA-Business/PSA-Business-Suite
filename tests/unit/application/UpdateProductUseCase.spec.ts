import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateProductUseCase, UpdateProductRequestDTO } from '../../../src/features/inventory/usecases/UpdateProductUseCase';
import { IStockRepository } from '../../../src/domain/repositories/IStockRepository';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';
import { StockItem } from '../../../src/domain/models/StockItem';
import { StockCategory } from '../../../src/domain/models/StockCategory';
import { UserRole } from '../../../src/domain/models/User';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeExistingItem = () =>
  StockItem.create(
    {
      name: 'Gelang Emas Polos',
      category: StockCategory.GOLD_JEWELLERY,
      price: 500000,
      cost: 400000,
      quantity: 10,
      barcode: 'GLD-001',
    },
    'stock-id-1'
  );

const makeUpdateRequest = (overrides?: Partial<UpdateProductRequestDTO>): UpdateProductRequestDTO => ({
  id: 'stock-id-1',
  name: 'Gelang Emas Ukir',
  category: StockCategory.GOLD_JEWELLERY,
  price: 550000,
  cost: 420000,
  barcode: 'GLD-001-UPD',
  userId: 'admin-001',
  userRole: UserRole.ADMIN,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────

describe('UpdateProductUseCase', () => {
  let useCase: UpdateProductUseCase;
  let mockStockRepo: IStockRepository;
  let mockUow: IUnitOfWork;
  let existingItem: StockItem;

  beforeEach(() => {
    existingItem = makeExistingItem();

    mockStockRepo = {
      findById: vi.fn().mockResolvedValue(existingItem),
      findByBarcode: vi.fn(),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
      list: vi.fn(),
      updateIfVersionMatches: vi.fn().mockResolvedValue(true),
    };
    mockUow = {
      execute: vi.fn(async (work) => work()),
      registerAudit: vi.fn().mockResolvedValue(undefined),
      registerSync: vi.fn().mockResolvedValue(undefined),
      registerStockHistory: vi.fn(),
      registerGoldAssetHistory: vi.fn(),
    };
    useCase = new UpdateProductUseCase(mockStockRepo, mockUow);
  });

  // ─── RBAC Enforcement ─────────────────────────────────────────────────────

  it('harus throw "Akses ditolak" jika userRole adalah CASHIER', async () => {
    await expect(
      useCase.execute(makeUpdateRequest({ userRole: UserRole.CASHIER }))
    ).rejects.toThrow('Akses ditolak');

    // CASHIER check terjadi sebelum UoW — tidak boleh masuk transaksi
    expect(mockUow.execute).not.toHaveBeenCalled();
    expect(mockStockRepo.findById).not.toHaveBeenCalled();
  });

  it('MANAGER harus diizinkan memperbarui produk', async () => {
    await expect(
      useCase.execute(makeUpdateRequest({ userRole: UserRole.MANAGER }))
    ).resolves.not.toThrow();

    expect(mockStockRepo.update).toHaveBeenCalledOnce();
  });

  it('ADMIN harus diizinkan memperbarui produk', async () => {
    await expect(
      useCase.execute(makeUpdateRequest({ userRole: UserRole.ADMIN }))
    ).resolves.not.toThrow();

    expect(mockStockRepo.update).toHaveBeenCalledOnce();
  });

  // ─── Business Logic ───────────────────────────────────────────────────────

  it('harus throw "Produk tidak ditemukan" jika stockRepository.findById mengembalikan null', async () => {
    vi.mocked(mockStockRepo.findById).mockResolvedValue(null);

    await expect(
      useCase.execute(makeUpdateRequest())
    ).rejects.toThrow('Produk tidak ditemukan');

    expect(mockStockRepo.update).not.toHaveBeenCalled();
  });

  it('harus memanggil stockRepository.update() dengan StockItem yang diperbarui', async () => {
    const request = makeUpdateRequest({ name: 'Cincin Berlian', price: 2000000 });
    await useCase.execute(request);

    expect(mockStockRepo.update).toHaveBeenCalledOnce();
    const updatedItem: StockItem = vi.mocked(mockStockRepo.update).mock.calls[0][0];
    expect(updatedItem.name).toBe('Cincin Berlian');
    expect(updatedItem.price).toBe(2000000);
  });

  it('updated item harus mempertahankan quantity asli (update tidak mengubah stok)', async () => {
    await useCase.execute(makeUpdateRequest());

    const updatedItem: StockItem = vi.mocked(mockStockRepo.update).mock.calls[0][0];
    // quantity tidak termasuk dalam DTO update produk — harus tetap sama
    expect(updatedItem.quantity).toBe(existingItem.quantity); // 10
  });

  it('updated item harus mempertahankan version asli — StockItem.update() tidak increment version', async () => {
    // CATATAN: StockItem.update() ≠ StockItem.incrementVersion()
    // update() hanya merge props, version tidak berubah.
    // Jika perlu increment, harus panggil incrementVersion() secara eksplisit.
    await useCase.execute(makeUpdateRequest());

    const updatedItem: StockItem = vi.mocked(mockStockRepo.update).mock.calls[0][0];
    expect(updatedItem.version).toBe(existingItem.version);
  });

  it('updated item harus mempertahankan id yang sama', async () => {
    await useCase.execute(makeUpdateRequest({ id: 'stock-id-1' }));

    const updatedItem: StockItem = vi.mocked(mockStockRepo.update).mock.calls[0][0];
    expect(updatedItem.id).toBe(existingItem.id);
  });

  // ─── Audit & Sync ─────────────────────────────────────────────────────────

  it('harus memanggil unitOfWork.registerAudit() dengan action UPDATE_PRODUCT', async () => {
    const request = makeUpdateRequest({ userId: 'mgr-001', name: 'Kalung Emas', barcode: 'KLN-001' });
    await useCase.execute(request);

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'UPDATE_PRODUCT',
      'mgr-001',
      expect.stringContaining('Kalung Emas')
    );
  });

  it('harus memanggil unitOfWork.registerSync() dengan entityType "stock" dan action "UPDATE"', async () => {
    await useCase.execute(makeUpdateRequest());

    expect(mockUow.registerSync).toHaveBeenCalledWith(
      'stock',
      'UPDATE',
      expect.objectContaining({ id: existingItem.id })
    );
  });

  it('harus membungkus operasi dalam unitOfWork.execute() dengan tables ["stock"]', async () => {
    await useCase.execute(makeUpdateRequest());

    expect(mockUow.execute).toHaveBeenCalledWith(
      expect.any(Function),
      ['stock']
    );
  });

  it('harus propagate error jika stockRepository.update() throws', async () => {
    vi.mocked(mockStockRepo.update).mockRejectedValue(new Error('Write conflict'));

    await expect(useCase.execute(makeUpdateRequest())).rejects.toThrow('Write conflict');
  });
});

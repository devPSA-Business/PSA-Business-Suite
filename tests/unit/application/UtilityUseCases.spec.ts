/**
 * PSA Business Suite — Unit Tests: POS + Shift + Inventory Utility Use Cases
 *
 * Cakupan:
 *  - FlagTransactionUseCase: happy path, not-found guard, audit
 *  - SuspendCartUseCase: cart persist, audit
 *  - ResumeCartUseCase: return+delete, not-found guard, audit
 *  - CreateHandoverUseCase: persist, audit, sync, auto-timestamp
 *  - DeleteProductUseCase: RBAC non-ADMIN block, soft-delete, audit + sync
 *
 * @ai_context Unit test utility use cases. Semua dependency di-mock.
 * @security_tier LOW
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlagTransactionUseCase } from '../../../src/features/pos/usecases/FlagTransactionUseCase';
import { SuspendCartUseCase } from '../../../src/features/pos/usecases/SuspendCartUseCase';
import { ResumeCartUseCase } from '../../../src/features/pos/usecases/ResumeCartUseCase';
import { CreateHandoverUseCase } from '../../../src/features/shift/usecases/CreateHandoverUseCase';
import { DeleteProductUseCase } from '../../../src/features/inventory/usecases/DeleteProductUseCase';
import { RetailTransaction } from '../../../src/domain/models/RetailTransaction';
import { SuspendedCart } from '../../../src/domain/models/SuspendedCart';
import { StockItem } from '../../../src/domain/models/StockItem';
import { StockCategory } from '../../../src/domain/models/StockCategory';
import { UserRole } from '../../../src/domain/models/User';
import { IUnitOfWork } from '../../../src/application/core/IUnitOfWork';
import { IRetailRepository } from '../../../src/domain/repositories/IRetailRepository';
import { ISuspendedCartRepository } from '../../../src/domain/repositories/ISuspendedCartRepository';
import { IHandoverRepository } from '../../../src/domain/repositories/IHandoverRepository';
import { IStockRepository } from '../../../src/domain/repositories/IStockRepository';

// ─── Shared Mock Factory ───────────────────────────────────────────────────

function buildMockUow(): IUnitOfWork {
  return {
    execute: vi.fn().mockImplementation(async (callback: () => Promise<unknown>) => callback()),
    registerAudit: vi.fn().mockResolvedValue(undefined),
    registerSync: vi.fn().mockResolvedValue(undefined),
    registerStockHistory: vi.fn().mockResolvedValue(undefined),
    registerGoldAssetHistory: vi.fn().mockResolvedValue(undefined),
  } as unknown as IUnitOfWork;
}

function buildTransaction(id = 'TX-001'): RetailTransaction {
  return RetailTransaction.create(
    {
      items: [{ stockId: 'STOCK-1', name: 'Cincin Emas', quantity: 1, price: 150_000, subtotal: 150_000 }],
      total: 150_000,
      paymentMethod: 'CASH',
      status: 'SUCCESS',
      sessionId: 'SHIFT-001',
      userId: 'USER-01',
    },
    id
  );
}

function buildStockItem(id = 'STOCK-001'): StockItem {
  return StockItem.create(
    { name: 'Gelang Imitasi', barcode: 'GI-001', category: StockCategory.IMITATION, price: 75_000, cost: 50_000, quantity: 10, version: 1 },
    id
  );
}

function buildSuspendedCart(id = 'CART-001'): SuspendedCart {
  return SuspendedCart.create(
    { name: 'Keranjang A', items: [{ stockId: 'S1', name: 'Anting', quantity: 2, price: 50_000, subtotal: 100_000 }], total: 100_000, timestamp: Date.now(), user: 'KASIR-01' },
    id
  );
}

// ─── FlagTransactionUseCase ────────────────────────────────────────────────

describe('FlagTransactionUseCase', () => {
  let mockRetailRepo: IRetailRepository;
  let mockUow: IUnitOfWork;
  let useCase: FlagTransactionUseCase;

  beforeEach(() => {
    mockRetailRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
    };
    mockUow = buildMockUow();
    useCase = new FlagTransactionUseCase(mockUow, mockRetailRepo);
  });

  it('should throw if transaction not found', async () => {
    vi.mocked(mockRetailRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute({ transactionId: 'TX-GHOST', reason: 'test', userId: 'U1' }))
      .rejects.toThrow('Transaksi tidak ditemukan.');
  });

  it('should save flagged transaction with isFlagged=true and flagReason set', async () => {
    const tx = buildTransaction('TX-001');
    vi.mocked(mockRetailRepo.findById).mockResolvedValue(tx);

    await useCase.execute({ transactionId: 'TX-001', reason: 'Harga tidak sesuai', userId: 'U-MANAGER' });

    expect(mockRetailRepo.save).toHaveBeenCalledOnce();
    const saved = vi.mocked(mockRetailRepo.save).mock.calls[0][0] as RetailTransaction;
    expect(saved.isFlagged).toBe(true);
    expect(saved.flagReason).toBe('Harga tidak sesuai');
  });

  it('should register FLAG_RETAIL_TRANSACTION audit with entityId', async () => {
    const tx = buildTransaction('TX-001');
    vi.mocked(mockRetailRepo.findById).mockResolvedValue(tx);

    await useCase.execute({ transactionId: 'TX-001', reason: 'Curiga', userId: 'U-MANAGER' });

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'FLAG_RETAIL_TRANSACTION', 'U-MANAGER',
      expect.stringContaining('TX-001'),
      expect.objectContaining({ entityId: 'TX-001' })
    );
  });
});

// ─── SuspendCartUseCase ────────────────────────────────────────────────────

describe('SuspendCartUseCase', () => {
  let mockCartRepo: ISuspendedCartRepository;
  let mockUow: IUnitOfWork;
  let useCase: SuspendCartUseCase;

  beforeEach(() => {
    mockCartRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue([]),
      getById: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    mockUow = buildMockUow();
    useCase = new SuspendCartUseCase(mockCartRepo, mockUow);
  });

  it('should save cart with correct name, total, and user', async () => {
    let capturedCart: SuspendedCart | undefined;
    vi.mocked(mockCartRepo.save).mockImplementation(async (c) => { capturedCart = c; });

    await useCase.execute({ name: 'Keranjang VIP', items: [], total: 200_000, user: 'KASIR-01' });

    expect(capturedCart?.name).toBe('Keranjang VIP');
    expect(capturedCart?.total).toBe(200_000);
    expect(capturedCart?.user).toBe('KASIR-01');
  });

  it('should register SUSPEND_CART audit log', async () => {
    await useCase.execute({ name: 'Keranjang Test', items: [], total: 0, user: 'KASIR-01' });

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'SUSPEND_CART', 'KASIR-01', expect.stringContaining('Keranjang Test')
    );
  });
});

// ─── ResumeCartUseCase ─────────────────────────────────────────────────────

describe('ResumeCartUseCase', () => {
  let mockCartRepo: ISuspendedCartRepository;
  let mockUow: IUnitOfWork;
  let useCase: ResumeCartUseCase;

  beforeEach(() => {
    mockCartRepo = {
      save: vi.fn().mockResolvedValue(undefined),
      getAll: vi.fn().mockResolvedValue([]),
      getById: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    mockUow = buildMockUow();
    useCase = new ResumeCartUseCase(mockCartRepo, mockUow);
  });

  it('should throw if cart not found', async () => {
    vi.mocked(mockCartRepo.getById).mockResolvedValue(null);

    await expect(useCase.execute('CART-GHOST', 'KASIR-01'))
      .rejects.toThrow('Keranjang tidak ditemukan');
  });

  it('should return the cart and delete it from storage', async () => {
    const cart = buildSuspendedCart('CART-001');
    vi.mocked(mockCartRepo.getById).mockResolvedValue(cart);

    const result = await useCase.execute('CART-001', 'KASIR-01');

    expect(result).toBe(cart);
    expect(mockCartRepo.delete).toHaveBeenCalledWith('CART-001');
  });

  it('should register RESUME_CART audit log with cart name', async () => {
    const cart = buildSuspendedCart('CART-001');
    vi.mocked(mockCartRepo.getById).mockResolvedValue(cart);

    await useCase.execute('CART-001', 'KASIR-01');

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'RESUME_CART', 'KASIR-01', expect.stringContaining(cart.name)
    );
  });
});

// ─── CreateHandoverUseCase ─────────────────────────────────────────────────

describe('CreateHandoverUseCase', () => {
  let mockHandoverRepo: IHandoverRepository;
  let mockUow: IUnitOfWork;
  let useCase: CreateHandoverUseCase;

  beforeEach(() => {
    mockHandoverRepo = { save: vi.fn().mockResolvedValue(undefined), getAll: vi.fn().mockResolvedValue([]) };
    mockUow = buildMockUow();
    useCase = new CreateHandoverUseCase(mockHandoverRepo, mockUow);
  });

  it('should save handover with correct category, message, and user', async () => {
    await useCase.execute({ category: 'KASIR', message: 'Uang laci Rp 500rb', user: 'KASIR-SORE' });

    const saved = vi.mocked(mockHandoverRepo.save).mock.calls[0][0];
    expect(saved.category).toBe('KASIR');
    expect(saved.message).toBe('Uang laci Rp 500rb');
    expect(saved.user).toBe('KASIR-SORE');
  });

  it('should auto-assign timestamp at creation time', async () => {
    const before = Date.now();
    await useCase.execute({ category: 'KASIR', message: 'Test', user: 'K1' });
    const after = Date.now();

    const saved = vi.mocked(mockHandoverRepo.save).mock.calls[0][0];
    expect(saved.timestamp).toBeGreaterThanOrEqual(before);
    expect(saved.timestamp).toBeLessThanOrEqual(after);
  });

  it('should register CREATE_HANDOVER audit log', async () => {
    await useCase.execute({ category: 'MANAGER', message: 'Laporan diserahkan', user: 'MANAGER-01' });

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'CREATE_HANDOVER', 'MANAGER-01', expect.stringContaining('MANAGER')
    );
  });

  it('should register sync INSERT event for handover collection', async () => {
    await useCase.execute({ category: 'KASIR', message: 'Test', user: 'KASIR-01' });

    expect(mockUow.registerSync).toHaveBeenCalledWith(
      'handover', 'INSERT', expect.objectContaining({ id: expect.any(String) })
    );
  });
});

// ─── DeleteProductUseCase ──────────────────────────────────────────────────

describe('DeleteProductUseCase', () => {
  let mockStockRepo: IStockRepository;
  let mockUow: IUnitOfWork;
  let useCase: DeleteProductUseCase;

  beforeEach(() => {
    mockStockRepo = {
      findById: vi.fn(),
      findByBarcode: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      updateIfVersionMatches: vi.fn().mockResolvedValue(true),
    };
    mockUow = buildMockUow();
    useCase = new DeleteProductUseCase(mockStockRepo, mockUow);
  });

  it('should reject CASHIER role before even touching the repository', async () => {
    await expect(useCase.execute('STOCK-001', 'U1', UserRole.CASHIER))
      .rejects.toThrow('Akses ditolak');
    expect(mockStockRepo.findById).not.toHaveBeenCalled();
  });

  it('should reject MANAGER role with same access denied error', async () => {
    await expect(useCase.execute('STOCK-001', 'U1', UserRole.MANAGER))
      .rejects.toThrow('Akses ditolak');
    expect(mockStockRepo.findById).not.toHaveBeenCalled();
  });

  it('should throw if product not found (ADMIN)', async () => {
    vi.mocked(mockStockRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute('TIDAK-ADA', 'USER-ADMIN-01', UserRole.ADMIN))
      .rejects.toThrow('Produk tidak ditemukan');
  });

  it('should soft-delete (isDeleted:true) without calling hard delete (ADMIN)', async () => {
    const existing = buildStockItem('STOCK-001');
    vi.mocked(mockStockRepo.findById).mockResolvedValue(existing);

    let capturedItem: StockItem | undefined;
    vi.mocked(mockStockRepo.update).mockImplementation(async (item) => { capturedItem = item; });

    await useCase.execute('STOCK-001', 'USER-ADMIN-01', UserRole.ADMIN);

    expect(capturedItem?.isDeleted).toBe(true);
    expect(mockStockRepo.delete).not.toHaveBeenCalled();
  });

  it('should register DELETE_PRODUCT audit log with product name', async () => {
    const existing = buildStockItem();
    vi.mocked(mockStockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockStockRepo.update).mockResolvedValue(undefined);

    await useCase.execute('STOCK-001', 'USER-ADMIN-01', UserRole.ADMIN);

    expect(mockUow.registerAudit).toHaveBeenCalledWith(
      'DELETE_PRODUCT', 'USER-ADMIN-01', expect.stringContaining('Gelang Imitasi')
    );
  });

  it('should register sync UPDATE with isDeleted:true (not DELETE) for cloud consistency', async () => {
    const existing = buildStockItem('STOCK-001');
    vi.mocked(mockStockRepo.findById).mockResolvedValue(existing);
    vi.mocked(mockStockRepo.update).mockResolvedValue(undefined);

    await useCase.execute('STOCK-001', 'USER-ADMIN-01', UserRole.ADMIN);

    expect(mockUow.registerSync).toHaveBeenCalledWith(
      'stock', 'UPDATE', expect.objectContaining({ id: 'STOCK-001', isDeleted: true })
    );
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { ReceiveStockUseCase } from '../../src/features/inventory/usecases/ReceiveStockUseCase';
import { OpenShiftUseCase } from '../../src/features/shift/usecases/OpenShiftUseCase';
import { CheckoutUseCase } from '../../src/features/pos/usecases/CheckoutUseCase';
import { LoyaltyUseCase } from '../../src/features/pos/usecases/LoyaltyUseCase';
import { IStockRepository } from '../../src/domain/repositories/IStockRepository';
import { IShiftRepository } from '../../src/domain/repositories/IShiftRepository';
import { IRetailRepository } from '../../src/domain/repositories/IRetailRepository';
import { ICustomerRepository } from '../../src/domain/repositories/ICustomerRepository';
import { IUnitOfWork } from '../../src/application/core/IUnitOfWork';
import { StockItem } from '../../src/domain/models/StockItem';
import { Shift } from '../../src/domain/models/Shift';
import { RetailTransaction } from '../../src/domain/models/RetailTransaction';
import { StockCategory } from '../../src/domain/models/StockCategory';
import { UserRole } from '../../src/domain/models/User';

// In-memory Repositories
class InMemoryStockRepository implements IStockRepository {
  private items: Map<string, StockItem> = new Map();
  async findById(id: string) { return this.items.get(id) || null; }
  async findByBarcode(barcode: string) { 
    return Array.from(this.items.values()).find(i => i.barcode === barcode) || null; 
  }
  async save(stock: StockItem) { this.items.set(stock.id, stock); }
  async update(stock: StockItem) { this.items.set(stock.id, stock); }
  async delete(id: string) { this.items.delete(id); }
  async decreaseStock(stockId: string, quantity: number) {
    const item = this.items.get(stockId);
    if (item) this.items.set(stockId, item.update({ quantity: item.quantity - quantity }));
  }
  async updateIfVersionMatches(id: string, expectedVersion: number, changes: Partial<StockItem>): Promise<boolean> {
    const item = this.items.get(id);
    if (!item) return false;
    if ((item.version ?? 1) !== expectedVersion) return false;
    this.items.set(id, item.update({ ...changes, version: expectedVersion + 1 }));
    return true;
  }
  async list(branchId?: string) { 
    let results = Array.from(this.items.values());
    if (branchId && branchId !== 'HQ') {
      results = results.filter(i => i.branchId === branchId);
    }
    return results;
  }
}

class InMemoryShiftRepository implements IShiftRepository {
  private shifts: Map<string, Shift> = new Map();
  async hasOpenShift() { return Array.from(this.shifts.values()).some(s => s.status === 'OPEN'); }
  async getOpenShift() { return Array.from(this.shifts.values()).find(s => s.status === 'OPEN') || null; }
  async save(shift: Shift) { this.shifts.set(shift.id, shift); }
  async calculateExpectedCash() { return 0; }
  async findById(id: string) { return this.shifts.get(id) || null; }
  async checkCloudForActiveShift() { return { hasActiveShift: false }; }
  async incrementShiftSales(shiftId: string, addedCash: number, finalTotal: number) {}
}

class InMemoryRetailRepository implements IRetailRepository {
  private txs: Map<string, RetailTransaction> = new Map();
  async save(tx: RetailTransaction) { this.txs.set(tx.id, tx); }
  async findById(id: string) { return this.txs.get(id) || null; }
  async findAll(branchId?: string) {
    let results = Array.from(this.txs.values());
    if (branchId && branchId !== 'HQ') {
      results = results.filter(t => t.branchId === branchId);
    }
    return results;
  }
}

class SimpleUnitOfWork implements IUnitOfWork {
  async execute<T>(work: () => Promise<T>) { return work(); }
  async registerAudit() {}
  async registerSync() {}
  async registerStockHistory() {}
  async registerGoldAssetHistory() {}
}

describe('POS Integration Flow', () => {
  let stockRepo: IStockRepository;
  let shiftRepo: IShiftRepository;
  let retailRepo: IRetailRepository;
  let uow: IUnitOfWork;
  
  let receiveStock: ReceiveStockUseCase;
  let openShift: OpenShiftUseCase;
  let checkout: CheckoutUseCase;
  let loyaltyUseCase: LoyaltyUseCase;

  beforeEach(() => {
    stockRepo = new InMemoryStockRepository();
    shiftRepo = new InMemoryShiftRepository();
    retailRepo = new InMemoryRetailRepository();
    uow = new SimpleUnitOfWork();

    loyaltyUseCase = {
      calculateAndApplyLoyalty: async (req: any) => ({
        netTotal: req.transactionAmount,
        pointsEarned: 0,
        pointsRedeemed: 0,
        loyaltyDiscountAmount: 0
      })
    } as any;

    receiveStock = new ReceiveStockUseCase(stockRepo, uow);
    openShift = new OpenShiftUseCase(shiftRepo, uow);
    checkout = new CheckoutUseCase(retailRepo, stockRepo, shiftRepo, uow, loyaltyUseCase);
  });

  it('should complete a full POS flow: receive stock -> open shift -> checkout', async () => {
    const userId = 'admin-1';

    // 1. Receive Stock
    await receiveStock.execute({
      barcode: 'BRC-001',
      name: 'Test Product',
      category: StockCategory.ACCESSORIES,
      price: 10000,
      cost: 5000,
      quantity: 50,
      userId,
      userRole: UserRole.ADMIN
    });

    const stock = await stockRepo.findByBarcode('BRC-001');
    expect(stock).not.toBeNull();
    expect(stock?.quantity).toBe(50);

    // 2. Open Shift
    const openShiftResult = await openShift.execute({
      startCash: 100000,
      userId
    });

    expect(openShiftResult.shiftId).toBeDefined();
    expect(await shiftRepo.hasOpenShift()).toBe(true);

    // 3. Checkout
    const transactionId = await checkout.execute({
      total: 20000,
      paymentMethod: 'CASH',
      items: [
        {
          stockId: stock!.id,
          name: stock!.name,
          quantity: 2,
          price: stock!.price,
          subtotal: 20000
        }
      ],
      userId
    });

    expect(transactionId).toBeDefined();

    // 4. Verify Results
    const updatedStock = await stockRepo.findById(stock!.id);
    expect(updatedStock?.quantity).toBe(48);

    const transaction = await retailRepo.findById(transactionId);
    expect(transaction).not.toBeNull();
    expect(transaction?.total).toBe(20000);
    expect(transaction?.items[0].unitCost).toBe(5000);
  });
});

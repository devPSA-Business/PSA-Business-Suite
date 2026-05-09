import { describe, it, expect, beforeEach } from 'vitest';
import { Dexie } from 'dexie';
import { db } from '../../src/shared/api/db';
import { UnitOfWorkImpl } from '../../src/infrastructure/uow/UnitOfWorkImpl';
import { StockRepositoryImpl } from '../../src/infrastructure/repositories/StockRepositoryImpl';
import { RetailRepositoryImpl } from '../../src/infrastructure/repositories/RetailRepositoryImpl';
import { ShiftRepositoryImpl } from '../../src/infrastructure/repositories/ShiftRepositoryImpl';
import { CheckoutUseCase, CheckoutRequestDTO } from '../../src/features/pos/usecases/CheckoutUseCase';
import { SyncServiceImpl } from '../../src/infrastructure/services/SyncServiceImpl';
import { LoyaltyUseCase } from '../../src/features/pos/usecases/LoyaltyUseCase';
import { CustomerRepositoryImpl } from '../../src/infrastructure/repositories/CustomerRepositoryImpl';
import { StockItem } from '../../src/domain/models/StockItem';
import { StockCategory } from '../../src/domain/models/StockCategory';
import { Shift } from '../../src/domain/models/Shift';
import { cryptoDB } from '../../src/lib/cryptoIndexedDB';

describe('CheckoutUseCase Stress Test with Dexie', () => {
  let checkoutUseCase: CheckoutUseCase;
  let stockRepo: StockRepositoryImpl;
  let retailRepo: RetailRepositoryImpl;
  let shiftRepo: ShiftRepositoryImpl;
  let uow: UnitOfWorkImpl;
  let syncService: SyncServiceImpl;
  let loyaltyUseCase: LoyaltyUseCase;
  let customerRepo: CustomerRepositoryImpl;

  beforeEach(async () => {
    // Clean Db
    await db.stock.clear();
    await db.transactions.clear();
    await db.shifts.clear();
    await db.audit_logs.clear();
    await db.sync_events.clear();
    await db.stock_history.clear();
    await db.shift_totals.clear();

    const deviceKey = await cryptoDB.generateDeviceKey();
    cryptoDB.setKey(deviceKey, 'test-key');

    syncService = new SyncServiceImpl();
    uow = new UnitOfWorkImpl(syncService);
    stockRepo = new StockRepositoryImpl();
    retailRepo = new RetailRepositoryImpl();
    shiftRepo = new ShiftRepositoryImpl();
    customerRepo = new CustomerRepositoryImpl();
    
    // Create Dummy Loyalty
    loyaltyUseCase = {
      calculateAndApplyLoyalty: (req: any) => Dexie.Promise.resolve({
        netTotal: req.transactionAmount,
        pointsEarned: 0,
        pointsRedeemed: 0,
        loyaltyDiscountAmount: 0
      })
    } as any;

    checkoutUseCase = new CheckoutUseCase(retailRepo, stockRepo, shiftRepo, uow, loyaltyUseCase);

    // Setup Open Shift
    const shift = Shift.create({
      startCash: 100000,
      userId: 'admin-1',
      status: 'OPEN',
      startTime: Date.now()
    });
    await shiftRepo.save(shift);
    await db.shift_totals.put({
      id: shift.id,
      startTime: shift.startTime,
      openCash: 100000,
      cashIn: 0,
      cashOut: 0,
      salesTotal: 0,
      buybackTotal: 0,
      pettyCashTotal: 0
    });
  });

  it('Stress Test: 5 concurrent checkouts on a single stock item with qty = 1', async () => {
    const stockItem = StockItem.create({
      name: 'High Demand Phone',
      category: StockCategory.ACCESSORIES,
      price: 5000000,
      cost: 4000000,
      quantity: 1,
      barcode: 'PHONE-001',
    });
    await stockRepo.save(stockItem);

    const promises = Array.from({ length: 5 }).map((_, idx) => {
      const request: CheckoutRequestDTO = {
        total: 5000000,
        paymentMethod: 'CASH',
        items: [{ stockId: stockItem.id, name: 'High Demand Phone', quantity: 1, price: 5000000, subtotal: 5000000 }],
        userId: `kasir-${idx}`
      };
      return checkoutUseCase.execute(request);
    });

    const results = await Promise.allSettled(promises);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    if (rejected.length > 0) {
      console.log('first rejection:', rejected[0].reason);
    }

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(4);

    const updatedStock = await stockRepo.findById(stockItem.id);
    expect(updatedStock?.quantity).toBe(0);

    const checkouts = await db.transactions.toArray();
    expect(checkouts.length).toBe(1);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockRepositoryImpl } from '../../../src/infrastructure/repositories/StockRepositoryImpl';
import { CustomerRepositoryImpl } from '../../../src/infrastructure/repositories/CustomerRepositoryImpl';
import { ShiftRepositoryImpl } from '../../../src/infrastructure/repositories/ShiftRepositoryImpl';
import { UserRepositoryImpl } from '../../../src/infrastructure/repositories/UserRepositoryImpl';
import { StockItem } from '../../../src/domain/models/StockItem';
import { StockCategory } from '../../../src/domain/models/StockCategory';
import { Customer } from '../../../src/domain/models/Customer';
import { Shift } from '../../../src/domain/models/Shift';
import { User } from '../../../src/domain/models/User';
import { db } from '../../../src/shared/api/db';

vi.mock('../../../src/shared/api/db', () => ({
  db: {
    transaction: vi.fn(async (mode, tables, cb) => await cb()),
    stock: {
      get: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn()
        }))
      })),
      filter: vi.fn(() => ({
        toArray: vi.fn(),
        and: vi.fn().mockReturnThis()
      }))
    },
    customers: {
      get: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn().mockReturnThis(),
        first: vi.fn()
      })),
      toArray: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      filter: vi.fn(() => ({
        toArray: vi.fn()
      }))
    },
    shifts: {
      get: vi.fn(),
      add: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn()
        }))
      })),
      filter: vi.fn(() => ({
        toArray: vi.fn(),
        first: vi.fn()
      }))
    },
    users: {
      get: vi.fn(),
      add: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn().mockReturnThis(),
        first: vi.fn()
      })),
      toArray: vi.fn()
    }
  }
}));

describe('Repository Implementations', () => {
  describe('StockRepositoryImpl', () => {
    let repo: StockRepositoryImpl;
    beforeEach(() => {
      repo = new StockRepositoryImpl();
      vi.resetAllMocks();
    });

    it('should findById', async () => {
      const mockRecord = { id: 's1', name: 'Ring', category: StockCategory.GOLD_JEWELLERY, price: 100, cost: 50, quantity: 5, barcode: 'B1', version: 1 };
      (db.stock.get as any).mockResolvedValue(mockRecord);
      const result = await repo.findById('s1');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Ring');
      expect(result?.id).toBe('s1');
    });

    it('should findByBarcode', async () => {
      const mockRecord = { id: 's1', barcode: 'B1', name: 'Ring', version: 1 };
      const whereMock: any = { equals: vi.fn(() => ({ first: vi.fn().mockResolvedValue(mockRecord) })) };
      (db.stock.where as any).mockReturnValue(whereMock);
      const result = await repo.findByBarcode('B1');
      expect(result?.barcode).toBe('B1');
    });

    it('should save a new stock item', async () => {
      const stock = StockItem.create({ name: 'Ring', category: StockCategory.GOLD_JEWELLERY, price: 100, cost: 50, quantity: 5, barcode: 'B1' });
      await repo.save(stock);
      expect(db.stock.add).toHaveBeenCalled();
    });

    it('should updateIfVersionMatches successfully', async () => {
      const mockRecord = { id: 's1', version: 1 };
      (db.stock.get as any).mockResolvedValue(mockRecord);
      const success = await repo.updateIfVersionMatches('s1', 1, { name: 'Updated' });
      expect(success).toBe(true);
      expect(db.stock.update).toHaveBeenCalledWith('s1', expect.objectContaining({ version: 2 }));
    });

    it('should fail updateIfVersionMatches on version mismatch', async () => {
      const mockRecord = { id: 's1', version: 2 };
      (db.stock.get as any).mockResolvedValue(mockRecord);
      const success = await repo.updateIfVersionMatches('s1', 1, { name: 'Updated' });
      expect(success).toBe(false);
    });
  });

  describe('CustomerRepositoryImpl', () => {
    let repo: CustomerRepositoryImpl;
    beforeEach(() => {
      repo = new CustomerRepositoryImpl();
      vi.resetAllMocks();
    });

    it('should findById', async () => {
      const mockRecord = { id: 'c1', name: 'Customer 1', version: 1, loyaltyPoints: 0 };
      (db.customers.get as any).mockResolvedValue(mockRecord);
      const result = await repo.findById('c1');
      expect(result?.name).toBe('Customer 1');
    });

    it('should save a customer', async () => {
      const customer = Customer.create({ name: 'C1', phoneNumber: 'P1', loyaltyPoints: 0 });
      await repo.save(customer);
      expect(db.customers.add).toHaveBeenCalled();
    });

    it('should search by phone', async () => {
      const mockRecord = { id: 'c1', name: 'C1', phoneNumber: 'P1', isDeleted: false };
      (db.customers.filter as any).mockReturnValue({
        toArray: vi.fn().mockResolvedValue([mockRecord])
      });
      const results = await repo.search('P1');
      expect(results[0].id).toBe('c1');
    });

    it('should findAll customers', async () => {
       (db.customers.filter as any).mockReturnValue({
         toArray: vi.fn().mockResolvedValue([{ id: 'c1', isDeleted: false }])
       });
       const list = await repo.findAll();
       expect(list).toHaveLength(1);
    });
  });

  describe('ShiftRepositoryImpl', () => {
    let repo: ShiftRepositoryImpl;
    beforeEach(() => {
      repo = new ShiftRepositoryImpl();
      vi.resetAllMocks();
    });

    it('should getOpenShift', async () => {
      const mockShift = { id: 'sh1', userId: 'u1', status: 'OPEN' };
      const whereMock: any = { equals: vi.fn(() => ({ first: vi.fn().mockResolvedValue(mockShift) })) };
      (db.shifts.where as any).mockReturnValue(whereMock);
      const result = await repo.getOpenShift();
      expect(result?.id).toBe('sh1');
    });
  });

  describe('UserRepositoryImpl', () => {
    let repo: UserRepositoryImpl;
    beforeEach(() => {
      repo = new UserRepositoryImpl();
      vi.resetAllMocks();
    });

    it('should findByName', async () => {
      const mockUser = { id: 'u1', name: 'admin', role: 'ADMIN', pinHash: 'hash', status: 'ACTIVE', createdAt: Date.now() };
      const whereMock: any = { equals: vi.fn(() => ({ first: vi.fn().mockResolvedValue(mockUser) })) };
      (db.users.where as any).mockReturnValue(whereMock);
      const result = await repo.findByName('admin');
      expect(result?.name).toBe('admin');
    });

    it('should findById', async () => {
      const mockUser = { id: 'u1', name: 'admin' };
      (db.users.get as any).mockResolvedValue(mockUser);
      const result = await repo.findById('u1');
      expect(result?.id).toBe('u1');
    });

    it('should save user', async () => {
       await repo.save({ id: 'u1' } as any);
       expect(db.users.put).toHaveBeenCalled();
    });

    it('should delete user by fetching it by name first', async () => {
       const mockUser = { id: 'u1', name: 'admin' };
       const whereMock: any = { equals: vi.fn(() => ({ first: vi.fn().mockResolvedValue(mockUser) })) };
       (db.users.where as any).mockReturnValue(whereMock);
       
       await repo.delete('admin');
       expect(db.users.delete).toHaveBeenCalledWith('u1');
    });
  });
});

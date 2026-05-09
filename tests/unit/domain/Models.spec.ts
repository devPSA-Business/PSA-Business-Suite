import { describe, it, expect, vi } from 'vitest';
import { Customer } from '../../../src/domain/models/Customer';
import { GoldLiquidation } from '../../../src/domain/models/GoldLiquidation';
import { Handover } from '../../../src/domain/models/Handover';
import { SuspendedCart } from '../../../src/domain/models/SuspendedCart';
import { Entity } from '../../../src/domain/core/Entity';
import { VersionConflictError, InsufficientStockError, StalePriceError } from '../../../src/domain/errors';

// Test concrete entity to test base class
class TestEntity extends Entity<{ name: string }> {
  constructor(id: string, name: string) {
    super(id);
    (this as any).name = name;
  }
}

describe('Domain Models', () => {
  describe('Entity Base Class', () => {
    it('should create an entity with an ID', () => {
      const entity = new TestEntity('123', 'Test');
      expect(entity.id).toBe('123');
    });

    it('should have a createdAt timestamp', () => {
      const entity = new TestEntity('123', 'Test');
      expect(entity.createdAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Customer Model', () => {
    it('should create a customer with version 1', () => {
      const customer = Customer.create({
        name: 'John Doe',
        phoneNumber: '0812345678',
        loyaltyPoints: 0
      });
      expect(customer.name).toBe('John Doe');
      expect(customer.version).toBe(1);
    });

    it('should reconstitute a customer', () => {
      const createdAt = Date.now();
      const customer = Customer.reconstitute({
        name: 'Jane Doe',
        phoneNumber: '0812345679',
        loyaltyPoints: 100,
        version: 5
      }, 'id-1', createdAt);
      expect(customer.id).toBe('id-1');
      expect(customer.version).toBe(5);
      expect(customer.createdAt).toBe(createdAt);
    });

    it('should update and increment version', () => {
      const customer = Customer.create({
        name: 'John Doe',
        phoneNumber: '0812345678',
        loyaltyPoints: 0
      });
      const updated = customer.update({ loyaltyPoints: 10 });
      expect(updated.loyaltyPoints).toBe(10);
      expect(updated.version).toBe(2);
      expect(updated.name).toBe('John Doe');
    });
  });

  describe('GoldLiquidation Model', () => {
    const props = {
      grossWeight: 10,
      stoneWeight: 1,
      netWeight: 9,
      fineWeight: 8,
      cogs: 5000,
      goldContent: 90,
      laborCost: 1000,
      marketPrice: 10000,
      totalPrice: 91000,
      paymentMethod: 'CASH' as const,
      status: 'SUCCESS' as const,
      userId: 'u1'
    };

    it('should create a liquidation with valid props', () => {
      const liquidation = GoldLiquidation.create(props);
      expect(liquidation.totalPrice).toBe(91000);
    });

    it('should throw if netWeight is negative', () => {
      expect(() => GoldLiquidation.create({ ...props, netWeight: -1 }))
        .toThrow('netWeight cannot be negative');
    });

    it('should throw if goldContent is invalid', () => {
      expect(() => GoldLiquidation.create({ ...props, goldContent: 101 }))
        .toThrow('goldContent must be between 0 and 100');
    });

    it('should throw if totalPrice is negative', () => {
      expect(() => GoldLiquidation.create({ ...props, totalPrice: -1 }))
        .toThrow('totalPrice cannot be negative');
    });

    it('should void a transaction', () => {
      const liquidation = GoldLiquidation.create(props);
      const voided = liquidation.voidTransaction('Mistake', 'admin-1');
      expect(voided.status).toBe('VOIDED');
      expect(voided.isVoided).toBe(true);
      expect(voided.voidReason).toBe('Mistake');
    });

    it('should flag a transaction', () => {
      const liquidation = GoldLiquidation.create(props);
      const flagged = liquidation.flagTransaction('High amount');
      expect(flagged.isFlagged).toBe(true);
      expect(flagged.flagReason).toBe('High amount');
    });
  });

  describe('Handover Model', () => {
    it('should create a handover', () => {
      const now = Date.now();
      const handover = Handover.create({
        timestamp: now,
        category: 'SHIFT',
        message: 'Shift closed balanced',
        user: 'u1'
      });
      expect(handover.user).toBe('u1');
      expect(handover.category).toBe('SHIFT');
    });
  });

  describe('SuspendedCart Model', () => {
    it('should create a suspended cart', () => {
      const cart = SuspendedCart.create({
        name: 'John Guest',
        items: [{ stockId: 'st1', name: 'Item 1', quantity: 1, price: 1000, subtotal: 1000 }],
        total: 1000,
        timestamp: Date.now(),
        user: 'u1'
      });
      expect(cart.items.length).toBe(1);
      expect(cart.name).toBe('John Guest');
    });
  });

  describe('Domain Errors', () => {
    it('should create a VersionConflictError', () => {
      const error = new VersionConflictError('Conflict');
      expect(error.name).toBe('VersionConflictError');
      expect(error.message).toBe('Conflict');
    });

    it('should create an InsufficientStockError', () => {
      const error = new InsufficientStockError('No stock', 'st-1', 0, 5);
      expect(error.name).toBe('InsufficientStockError');
      expect(error.stockId).toBe('st-1');
      expect(error.availableQuantity).toBe(0);
      expect(error.requestedQuantity).toBe(5);
    });

    it('should create a StalePriceError', () => {
      const error = new StalePriceError();
      expect(error.name).toBe('StalePriceError');
    });
  });
});

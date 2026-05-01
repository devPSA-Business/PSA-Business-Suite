import { Collection, PromiseExtended } from 'dexie';
import { StockItem, Transaction, RepairService, Handover, AuditLog, SuspendedCart, StockHistory, Shift, GoldBuyback, GoldLiquidation } from '../../shared/api/db';

export interface ILiveQueries {
  observeOpenShift(branchId?: string): PromiseExtended<Shift | undefined>;
  observeLowStock(branchId?: string): PromiseExtended<StockItem[]>;
  observeProducts(branchId?: string): PromiseExtended<StockItem[]>;
  observeRepairs(branchId?: string): PromiseExtended<RepairService[]>;
  observeHandovers(branchId?: string): PromiseExtended<Handover[]>;
  observeAuditLogs(branchId?: string): PromiseExtended<AuditLog[]>;
  observeSuspendedCarts(branchId?: string): PromiseExtended<SuspendedCart[]>;
  observeStockHistory(stockId: string): PromiseExtended<StockHistory[]>;
  observePendingSyncCount(): PromiseExtended<number>;
  searchProducts(query: string, category: string, branchId?: string): Promise<StockItem[]>;
  observeGoldBuybacks(branchId?: string): PromiseExtended<GoldBuyback[]>;
  observeGoldSales(branchId?: string): PromiseExtended<GoldLiquidation[]>;
  observeTodayCashSummary(startTime: number): PromiseExtended<{ cashIn: number; cashOut: number }>;
}

import { PromiseExtended } from 'dexie';
import { StockItem, RepairService, Handover, AuditLog, SuspendedCart, StockHistory, Shift, GoldBuyback, GoldLiquidation, Transaction, CustomOrder } from '../../shared/api/db';

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
  /** Mengambil N transaksi terbaru dari sebuah shift (untuk workspace widget). */
  observeRecentTransactions(shiftStartTime: number, limit?: number, branchId?: string): PromiseExtended<Transaction[]>;
  /** Mengambil semua order kustom yang belum selesai (status != 'DONE'). */
  observeActiveCustomOrders(branchId?: string): PromiseExtended<CustomOrder[]>;
  /** Mengambil janji temu mulai dari tanggal tertentu (untuk communication board). */
  observeAppointments(fromDate: number, branchId?: string): PromiseExtended<import('../../shared/api/db').Appointment[]>;
  /** Mengambil catatan internal mulai dari tanggal tertentu. */
  observeInternalNotes(fromDate: number, branchId?: string): PromiseExtended<import('../../shared/api/db').InternalNote[]>;
}

import { PromiseExtended } from 'dexie';
import { StockItem, RepairService, Handover, AuditLog, SuspendedCart, StockHistory, Shift, GoldBuyback, GoldLiquidation, Transaction, CustomOrder, SyncEvent } from '../../shared/api/db';

/** Parameter filter untuk halaman inventaris */
export interface InventoryListFilter {
  category: string; // 'all' atau kode kategori
  aging: string;    // 'all' | 'slow' | 'dead'
}

/** Hasil query inventaris dengan pagination */
export interface InventoryListResult {
  count: number;
  items: StockItem[];
}

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

  /**
   * Query inventaris dengan search, filter kategori/aging, dan pagination.
   * Digunakan oleh InventoryPage — menggantikan akses langsung db.stock.
   */
  observeInventoryList(
    searchTerm: string,
    filters: InventoryListFilter,
    page: number,
    pageSize: number,
    branchId?: string
  ): PromiseExtended<InventoryListResult>;

  /**
   * Mencari satu produk berdasarkan barcode (exact match).
   * Digunakan oleh ReceiveStockPage untuk auto-fill saat barcode sudah ada di stok.
   */
  findStockByBarcode(barcode: string, branchId?: string): Promise<StockItem | undefined>;

  /**
   * Menghitung berapa item SKU yang prefix-nya cocok, lalu return nomor sequence berikutnya.
   * Digunakan oleh SkuGenerator untuk auto-increment seq (001, 002, dst).
   */
  countSkuSequence(skuPrefix: string): Promise<number>;

  /**
   * Mengambil rantai audit log terurut ASC (oldest first) untuk keperluan verifikasi hash chain.
   * Digunakan oleh IntegrityVerifier — batas default 1000 entri untuk mencegah OOM.
   */
  observeAuditLogChain(limit?: number): Promise<AuditLog[]>;

  /**
   * Mengambil semua event yang gagal sync dan masuk Dead Letter Queue, diurutkan terbaru.
   * Digunakan oleh DeadLetterQueueViewer (read-only). Mutasi DLQ tetap via SyncQueueManager.
   */
  observeDeadLetterQueue(): PromiseExtended<SyncEvent[]>;
}

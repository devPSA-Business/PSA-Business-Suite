import { db, StockItem, RepairService, Handover, AuditLog, SuspendedCart, StockHistory, Shift, GoldBuyback, GoldLiquidation, Transaction, CustomOrder, SyncEvent } from '../../shared/api/db';
import { ILiveQueries, InventoryListFilter, InventoryListResult } from '../../application/queries/ILiveQueries';
import { PromiseExtended, liveQuery } from 'dexie';
import { cryptoDB } from '../../lib/cryptoIndexedDB';

export class LiveQueriesImpl implements ILiveQueries {
  private async decryptAuditLog(log: AuditLog): Promise<AuditLog> {
    if (log.secureData) {
      try {
        const decrypted = await cryptoDB.decryptRecord(JSON.parse(log.secureData));
        return { ...log, details: String(decrypted.details || '') };
      } catch (err) {
        console.error('Failed to decrypt audit log', err);
        return { ...log, details: '' };
      }
    }
    return log;
  }

  observeOpenShift(branchId?: string): PromiseExtended<Shift | undefined> {
    const query = db.shifts.where('status').equals('OPEN');
    if (branchId && branchId !== 'HQ') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return query.filter(s => s.branchId === branchId).first() as any;
    }
    return query.first();
  }

  observeLowStock(branchId?: string): PromiseExtended<StockItem[]> {
    const query = db.stock.where('quantity').below(5);
    if (branchId && branchId !== 'HQ') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return query.filter(i => i.branchId === branchId).limit(100).toArray() as any;
    }
    return query.limit(100).toArray();
  }

  observeProducts(branchId?: string): PromiseExtended<StockItem[]> {
    if (branchId && branchId !== 'HQ') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return db.stock.filter(i => i.branchId === branchId).limit(100).toArray() as any;
    }
    return db.stock.limit(100).toArray();
  }

  observeRepairs(branchId?: string): PromiseExtended<RepairService[]> {
    const query = db.repair_services.orderBy('date').reverse();
    if (branchId && branchId !== 'HQ') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return query.filter(r => r.branchId === branchId).limit(100).toArray() as any;
    }
    return query.limit(100).toArray();
  }

  observeHandovers(branchId?: string): PromiseExtended<Handover[]> {
    const query = db.handovers.orderBy('timestamp').reverse();
    if (branchId && branchId !== 'HQ') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return query.filter(h => h.branchId === branchId).limit(50).toArray() as any;
    }
    return query.limit(50).toArray();
  }

  observeAuditLogs(branchId?: string, limit?: number): PromiseExtended<AuditLog[]> {
    const query = db.audit_logs.orderBy('timestamp').reverse();
    
    // Konversi query menjadi Collection (tipe objek manipulasi Dexie)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let collection: any = query;
    if (branchId && branchId !== 'HQ') {
      collection = query.filter(l => l.branchId === branchId);
    }
    
    // Terapkan batasan (limit) SEBELUM data dilempar ke Array & di Decrypt!
    if (limit && limit > 0) {
      collection = collection.limit(limit);
    }

    const recordsPromise = collection.toArray() as Promise<AuditLog[]>;

    // Cast as any because we mapped the Promise with then()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return recordsPromise.then((logs: AuditLog[]) => Promise.all(logs.map((log: AuditLog) => this.decryptAuditLog(log)))) as any;
  }

  observeSuspendedCarts(branchId?: string): PromiseExtended<SuspendedCart[]> {
    const query = db.suspended_carts.orderBy('timestamp').reverse();
    if (branchId && branchId !== 'HQ') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return query.filter(c => c.branchId === branchId).limit(50).toArray() as any;
    }
    return query.limit(50).toArray();
  }

  observeStockHistory(stockId: string): PromiseExtended<StockHistory[]> {
    return db.stock_history.where('stockId').equals(stockId).sortBy('timestamp');
  }

  observePendingSyncCount(): PromiseExtended<number> {
    return db.sync_events.where('status').equals('PENDING').count();
  }

  async searchProducts(query: string, category: string, branchId?: string): Promise<StockItem[]> {
    // Jika query kosong, kembalikan 50 item pertama yang stoknya > 0
    if (!query) {
      let collection = db.stock.where('quantity').above(0);
      if (category && category !== 'All') {
        collection = db.stock.where('category').equals(category).filter(i => i.quantity > 0);
      }
      if (branchId && branchId !== 'HQ') {
        collection = collection.filter(i => i.branchId === branchId);
      }
      return collection.limit(50).toArray();
    }

    // Optimasi: Memanfaatkan index Dexie.js untuk pencarian prefix yang sangat cepat
    // Ini jauh lebih efisien pada ribuan produk dibandingkan melakukan pull semua data dan filter JS.
    const indexedResults = await db.stock
      .where('name')
      .startsWithIgnoreCase(query)
      .or('barcode')
      .startsWithIgnoreCase(query)
      .toArray();

    // Terapkan filter lanjutan (stok, kategori, cabang) di sisi klien pada data yang sudah direduksi
    let filterQuery = indexedResults.filter(item => {
      if (item.quantity <= 0) return false;
      if (category && category !== 'All' && item.category !== category) return false;
      if (branchId && branchId !== 'HQ' && item.branchId !== branchId) return false;
      return true;
    });

    // Fallback: Jika pencarian prefix tidak menemukan cukup barang, gunakan pencarian substring (includes)
    // pada data mentah yang di-stream.
    if (filterQuery.length < 5) {
      const lowerQuery = query.toLowerCase();
      const fallbackFilter = db.stock.filter(item => {
        if (item.quantity <= 0) return false;
        if (category && category !== 'All' && item.category !== category) return false;
        if (branchId && branchId !== 'HQ' && item.branchId !== branchId) return false;
        
        // Skip yang sudah ditemukan di indexedResults untuk menghindari duplikasi
        if (indexedResults.some(res => res.id === item.id)) return false;

        return item.name.toLowerCase().includes(lowerQuery) || 
               item.barcode.toLowerCase().includes(lowerQuery);
      });
      
      const fallbackResults = await fallbackFilter.limit(50 - filterQuery.length).toArray();
      filterQuery = [...filterQuery, ...fallbackResults];
    }

    return filterQuery.slice(0, 50);
  }

  observeGoldBuybacks(branchId?: string): PromiseExtended<GoldBuyback[]> {
    const query = db.gold_buyback.orderBy('date').reverse();
    if (branchId && branchId !== 'HQ') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return query.filter(b => b.branchId === branchId).limit(100).toArray() as any;
    }
    return query.limit(100).toArray();
  }

  observeGoldSales(branchId?: string): PromiseExtended<GoldLiquidation[]> {
    const query = db.gold_liquidations.orderBy('date').reverse().filter(l => l.status === 'SUCCESS');
    if (branchId && branchId !== 'HQ') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return query.filter(l => l.branchId === branchId).limit(100).toArray() as any;
    }
    return query.limit(100).toArray();
  }

  observeTodayCashSummary(startTime: number): PromiseExtended<{ cashIn: number; cashOut: number }> {
    return liveQuery(async () => {
      const openShift = await db.shifts.where('status').equals('OPEN').first();
      if (!openShift) return { cashIn: 0, cashOut: 0 };
      
      const shiftTotal = await db.shift_totals.get(openShift.id);
      if (shiftTotal) {
        return { cashIn: shiftTotal.cashIn, cashOut: shiftTotal.cashOut };
      }
      
      // Fallback for retro-compatibility if shift_totals record missing
      let cashIn = 0;
      let cashOut = 0;

      const retailTxs = await db.transactions
        .where('date').aboveOrEqual(startTime)
        .filter(t => t.status === 'SUCCESS' && t.paymentMethod === 'CASH')
        .toArray();
      cashIn += retailTxs.reduce((sum, tx) => sum + tx.total, 0);

      const repairTxs = await db.repair_services
        .where('date').aboveOrEqual(startTime)
        .filter(r => (r.status === 'COMPLETED' || r.status === 'DELIVERED') && r.paymentMethod === 'CASH')
        .toArray();
      cashIn += repairTxs.reduce((sum, r) => sum + r.price, 0);

      const pettyCash = await db.petty_cash
        .where('date').aboveOrEqual(startTime)
        .toArray();
      cashOut += pettyCash.reduce((sum, pc) => sum + pc.amount, 0);

      const buybacks = await db.gold_buyback
        .where('date').aboveOrEqual(startTime)
        .filter(b => b.paymentMethod === 'CASH')
        .toArray();
      cashOut += buybacks.reduce((sum, b) => sum + b.buybackPrice, 0);

      return { cashIn, cashOut };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  }

  observeRecentTransactions(shiftStartTime: number, limit = 5, branchId?: string): PromiseExtended<Transaction[]> {
    let query = db.transactions
      .where('date')
      .aboveOrEqual(shiftStartTime)
      .reverse();
    if (branchId && branchId !== 'HQ') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return query.filter((t) => t.branchId === branchId).limit(limit).toArray() as any;
    }
    return query.limit(limit).toArray();
  }

  observeActiveCustomOrders(branchId?: string): PromiseExtended<CustomOrder[]> {
    const query = db.custom_orders.where('status').notEqual('DONE').reverse().sortBy('date');
    if (branchId && branchId !== 'HQ') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (query as unknown as PromiseExtended<CustomOrder[]>).then((orders: CustomOrder[]) =>
        orders.filter((o) => o.branchId === branchId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return query as any;
  }

  observeAppointments(fromDate: number, branchId?: string): PromiseExtended<import('../../shared/api/db').Appointment[]> {
    const query = db.appointments.where('date').aboveOrEqual(fromDate);
    if (branchId && branchId !== 'HQ') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return query.filter((a) => a.branchId === branchId).toArray() as any;
    }
    return query.toArray();
  }

  observeInternalNotes(fromDate: number, branchId?: string): PromiseExtended<import('../../shared/api/db').InternalNote[]> {
    const query = db.internal_notes.where('date').aboveOrEqual(fromDate);
    if (branchId && branchId !== 'HQ') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return query.filter((n) => n.branchId === branchId).toArray() as any;
    }
    return query.toArray();
  }

  /**
   * @ai_context: Query inventaris dengan search teks, filter, dan pagination.
   * @business_rule: Limit 50 item/halaman untuk mencegah DOM freeze pada stok besar.
   * @security_tier: MEDIUM
   */
  observeInventoryList(
    searchTerm: string,
    filters: InventoryListFilter,
    page: number,
    pageSize: number,
    branchId?: string
  ): PromiseExtended<InventoryListResult> {
    return db.transaction('r', db.stock, async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let collection: any;

      if (searchTerm) {
        collection = db.stock
          .where('name').startsWithIgnoreCase(searchTerm)
          .or('barcode').startsWithIgnoreCase(searchTerm);
      } else {
        collection = db.stock.toCollection();
      }

      const filteredCollection = collection.filter((item: StockItem) => {
        if (branchId && branchId !== 'HQ' && item.branchId !== branchId) return false;
        if (filters.category !== 'all' && item.category !== filters.category) return false;
        if (filters.aging === 'slow' && item.quantity < 2) return false;
        if (filters.aging === 'dead' && item.quantity === 0) return false;
        return true;
      });

      const count = await filteredCollection.count();
      const items = await filteredCollection
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();

      return { count, items };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  }

  /**
   * @ai_context: Lookup barcode tunggal untuk auto-fill form penerimaan barang.
   * @business_rule: Exact match — bukan prefix search.
   * @security_tier: LOW
   */
  async findStockByBarcode(barcode: string, branchId?: string): Promise<StockItem | undefined> {
    if (!barcode || barcode.length < 2) return undefined;
    const item = await db.stock.where('barcode').equals(barcode).first();
    if (!item) return undefined;
    if (branchId && branchId !== 'HQ' && item.branchId !== branchId) return undefined;
    return item;
  }

  /**
   * @ai_context: Menghitung nomor sequence berikutnya dari prefix SKU yang ada.
   * @business_rule: SKU format [BRAND]-[KAT]-[WARNA]-[UKURAN]-[BATU]-[SEQ].
   *   Fungsi ini mencari seq tertinggi dan mengembalikan seq + 1.
   * @security_tier: LOW
   */
  async countSkuSequence(skuPrefix: string): Promise<number> {
    const items = await db.stock.where('barcode').startsWith(skuPrefix).toArray();
    if (items.length === 0) return 1;

    let maxSeq = 0;
    for (const item of items) {
      const parts = item.barcode.split('-');
      if (parts.length === 6) {
        const seq = parseInt(parts[5], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
    return maxSeq + 1;
  }

  /**
   * @ai_context: Mengambil audit log terurut ASC untuk verifikasi hash chain.
   * @business_rule: Batas 1000 untuk mencegah OOM. Chain dimulai dari record terlama.
   * @security_tier: HIGH
   */
  async observeAuditLogChain(limit = 1000): Promise<AuditLog[]> {
    return db.audit_logs
      .orderBy('timestamp')
      .limit(limit)
      .toArray();
  }

  /**
   * @ai_context: Reactive query Dead Letter Queue untuk tampilan admin.
   * @business_rule: Mutasi DLQ (retry/discard) WAJIB lewat SyncQueueManager, bukan sini.
   * @security_tier: MEDIUM
   */
  observeDeadLetterQueue(): PromiseExtended<SyncEvent[]> {
    return db.sync_dlq.orderBy('timestamp').reverse().toArray();
  }
}

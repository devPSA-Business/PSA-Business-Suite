import { db, Transaction } from '../../shared/api/db';
import { logger } from '../../lib/logger';

/**
 * @ai_context Service ini berfungsi untuk mengambil data transaksi lokal dari Dexie
 * dan melakukan agregasi untuk ditampilkan di Owner Dashboard.
 * 
 * REVISI SPRINT 7.1: 
 * 1. Menggunakan Web Worker (analytics.worker.ts) untuk batch processing data >5k.
 * 2. Menggunakan Incremental Cache dengan TTL 6 Jam di IndexedDB.
 * @security_tier HIGH (Mengekspos Cost / HPP) 
 */

export interface DailyMetricData {
  date: string; // YYYY-MM-DD
  omzetTotal: number;
  grossProfitTotal: number;
  netProfitTotal: number;
  txCount: number;
}

export interface ProductMetricData {
  productId: string;
  productName: string;
  qtySold: number;
  revenue: number;
  costTotal: number;
  marginPct: number;
  stockCategory?: string; // Tipe barang asli 
  normalizedMarginPct?: number; // Margin yang dinormalisasi untuk kuadran
  baselineMargin?: number;
  turnover?: number; // Approximation
  category?: string; // from ranking (STAR, TRAFFIC, dll)
}

export interface FlaggedTransaction extends Transaction {
  items: (Transaction['items'][0] & { suggestedCost?: number })[];
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 Hours

export class AnalyticsService {
  private worker: Worker | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private callbacks = new Map<string, { resolve: (...args: any[]) => any, reject: (reason?: any) => void }>();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window !== 'undefined') {
      this.worker = new Worker(new URL('../../workers/analytics.worker.ts', import.meta.url), {
        type: 'module'
      });
      this.worker.onmessage = (e) => {
        const { id, status, data, error } = e.data;
        const cb = this.callbacks.get(id);
        if (cb) {
          if (status === 'SUCCESS') cb.resolve(data);
          else cb.reject(new Error(error));
          this.callbacks.delete(id);
        }
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async runInWorker<T>(type: string, payload: any): Promise<T> {
    if (!this.worker) throw new Error("Web Worker not initialized");
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.worker!.postMessage({ type, id, ...payload });
    });
  }

  private async getCachedOrCompute<T>(cacheKey: string, computeFn: () => Promise<T>): Promise<T> {
    try {
      const cached = await db.analytics_cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        logger.info(`[Analytics] Cache HIT for ${cacheKey}`);
        return cached.data as T;
      }
      
      logger.info(`[Analytics] Cache MISS for ${cacheKey}, computing...`);
      const data = await computeFn();
      
      await db.analytics_cache.put({
        id: cacheKey,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: data as any,
        createdAt: Date.now(),
        expiresAt: Date.now() + CACHE_TTL_MS
      });
      return data;
    } catch (e) {
      logger.error('Failed cache mechanism', e instanceof Error ? e : new Error(String(e)));
      return computeFn(); 
    }
  }

  async getDailyMetrics(startDateMs: number, endDateMs: number): Promise<DailyMetricData[]> {
    const cacheKey = `daily_metrics_${startDateMs}_${endDateMs}`;
    return this.getCachedOrCompute(cacheKey, () => 
      this.runInWorker<DailyMetricData[]>('CALCULATE_DAILY_METRICS', { startDateMs, endDateMs })
    );
  }

  async getProductMetrics(startDateMs: number, endDateMs: number): Promise<ProductMetricData[]> {
    const cacheKey = `product_metrics_${startDateMs}_${endDateMs}`;
    return this.getCachedOrCompute(cacheKey, () => 
      this.runInWorker<ProductMetricData[]>('CALCULATE_PRODUCT_METRICS', { startDateMs, endDateMs })
    );
  }

  async getProductRanking(startDateMs: number, endDateMs: number): Promise<ProductMetricData[]> {
    const cacheKey = `product_ranking_${startDateMs}_${endDateMs}`;
    return this.getCachedOrCompute(cacheKey, () => 
      this.runInWorker<ProductMetricData[]>('CALCULATE_PRODUCT_RANKING', { startDateMs, endDateMs })
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getMissingCostScan(startDateMs: number, endDateMs: number): Promise<any[]> {
    // Audit scan sebaiknya realtime dan tidak dicache agar Admin bisa validasi patch segera
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.runInWorker<any[]>('SCAN_MISSING_COST', { startDateMs, endDateMs });
  }

  /**
   * Mengubah HPP (Cost) historis sebuah transaksi berdasarkan pesetujuan Admin.
   * Dibatasi eksklusif logic nya di Client Side aman sebelum dikirim sync cloud.
   */
  async patchTransactionCost(txId: string, updatedItemsCost: Record<string, number>, adminUserId: string): Promise<boolean> {
    try {
        const tx = await db.transactions.get(txId);
        if (!tx) throw new Error("Transaction not found");

        // Clone item & tambal cost baru
        const oldItemsStr = JSON.stringify(tx.items);
        tx.items = tx.items.map(item => {
            if (updatedItemsCost[item.stockId] !== undefined) {
                // Konversi string ke int jika diperlukan oleh form
                item.unitCost = Number(updatedItemsCost[item.stockId]);
            }
            return item;
        });

        // Simpan
        await db.transactions.put(tx);

        // Hancurkan cache analytics karena HPP telah berubah
        await db.analytics_cache.clear();

        // 🛡 Audit Trail Kritis
        const lastLog = await db.audit_logs.orderBy('timestamp').last();
        const lastHash = lastLog ? lastLog.hash : '0';
        const details = `Admin menambal HPP Bolong pada TX: ${txId}. Sebelumnya: ${oldItemsStr}. Sekarang: ${JSON.stringify(tx.items)}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(lastHash + Date.now().toString() + 'PATCH_MISSING_COST' + adminUserId + details);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        await db.audit_logs.add({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          action: 'PATCH_MISSING_COST',
          user: adminUserId,
          details,
          hash,
          previousHash: lastHash
        });

        // Trigger Sync ke Firestore
        await db.sync_events.add({
          entity_type: 'transactions',
          action: 'UPDATE',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          payload: tx as any,
          status: 'PENDING',
          timestamp: Date.now()
        });

        return true;
    } catch (err) {
        logger.error("Failed to patch transaction cost", { error: err });
        return false;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getNlqContext(startDateMs: number, endDateMs: number): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.runInWorker<any>('BUILD_NLQ_CONTEXT', { startDateMs, endDateMs });
  }
}

export const analyticsService = new AnalyticsService();

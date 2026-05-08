import { Dexie } from 'dexie';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { db, AuditLog } from '../../shared/api/db';
import { cryptoDB } from '../../lib/cryptoIndexedDB';
import { ISyncService } from '@application/services/ISyncService';
import { getCurrentTime } from '../../shared/utils/timeUtils';

export class UnitOfWorkImpl implements IUnitOfWork {
  constructor(private readonly syncService: ISyncService) {}

  private readonly MANDATORY_TABLES = ['audit_logs', 'sync_events'];
  private readonly FULL_SCOPE = [
    'daily_gold_price', 'gold_buyback', 'shifts', 'audit_logs', 'sync_events',
    'transactions', 'stock', 'stock_history', 'gold_asset_history', 'repair_services',
    'customers', 'users', 'suspended_carts', 'handovers', 'petty_cash',
    'appointments', 'custom_orders', 'internal_notes', 'notifications',
    'shift_totals', 'store_profile', 'keys_meta', 'keyval', 'sync_dlq', 'ai_feedback_tickets'
  ];

  async execute<T>(work: () => Promise<T>, tables: string[] | 'FULL_SCOPE'): Promise<T> {
    try {
      if (!tables || (Array.isArray(tables) && tables.length === 0)) {
        throw new Error('DEVELOPER ERROR: Anda WAJIB mendefinisikan tabel yang diakses di UnitOfWork untuk mencegah deadlock pada tablet.');
      }
      // Determine scope: use provided tables (merged with mandatory ones) or full scope
      const tableNames = tables === 'FULL_SCOPE' 
        ? this.FULL_SCOPE
        : Array.from(new Set([...tables, ...this.MANDATORY_TABLES]));

      // Use typed transaction
      return await db.transaction('rw', tableNames, work);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'QuotaExceededError' || (err as { inner?: { name?: string } }).inner?.name === 'QuotaExceededError') {
          throw new Error('Penyimpanan lokal penuh (Quota Exceeded). Harap lakukan sinkronisasi dan kosongkan cache peramban Anda.');
        }
      }
      throw err;
    }
  }

  async registerAudit(
    action: string, 
    user: string, 
    details: string,
    extra?: {
      userId?: string;
      role?: string;
      entityId?: string;
      payloadDiff?: string;
      correlationId?: string;
    }
  ): Promise<void> {
    // 1. Ambil log terakhir untuk mendapatkan previousHash dan timestamp terakhir
    const lastLog = await db.audit_logs.orderBy('timestamp').last();
    const previousHash = lastLog ? lastLog.hash : 'GENESIS_BLOCK_0000000000000000';
    
    // Monotonic Time Enforcement to prevent Time Drift Vulnerability
    let timestamp = getCurrentTime();
    if (lastLog && timestamp <= lastLog.timestamp) {
      timestamp = lastLog.timestamp + 1; // Force strictly increasing timestamp
    }
    
    const id = crypto.randomUUID();
    
    // 2. Buat Cryptographic Hash (SHA-256)
    // Menggabungkan previousHash + current data memastikan rantai tidak bisa disisipi/dihapus
    const dataString = `${previousHash}|${id}|${timestamp}|${action}|${user}|${details}|${extra?.entityId || ''}|${extra?.correlationId || ''}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataString);
    const hashBuffer = await Dexie.waitFor(crypto.subtle.digest('SHA-256', dataBuffer));
    
    // Convert buffer to Hex String
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Encrypt sensitive details & payloadDiff
    const encryptedDetails = await Dexie.waitFor(cryptoDB.encryptRecord({ details }));
    let encryptedPayloadDiff = undefined;
    if (extra?.payloadDiff) {
      encryptedPayloadDiff = JSON.stringify(await Dexie.waitFor(cryptoDB.encryptRecord({ diff: extra.payloadDiff })));
    }

    const log: AuditLog = {
      id,
      timestamp,
      action,
      user,
      details: '',
      secureData: JSON.stringify(encryptedDetails),
      hash,
      previousHash,
      userId: extra?.userId,
      role: extra?.role,
      entityId: extra?.entityId,
      payloadDiff: encryptedPayloadDiff,
      correlationId: extra?.correlationId
    };
    
    await db.audit_logs.add(log);
    
    // 3. Auto-sync audit logs ke Cloud (Immutable Backup)
    await this.registerSync('audit_logs', 'INSERT', log as unknown as Record<string, unknown>);
  }

  async registerSync(entityType: string, action: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPDATE_DELTA', payload: Record<string, unknown>): Promise<void> {
    await this.syncService.enqueueSync({
      entity_type: entityType,
      action,
      payload,
    });
  }

  async registerStockHistory(params: {
    stockId: string;
    action: 'ADD' | 'REMOVE' | 'UPDATE' | 'ADJUST';
    quantityChange: number;
    oldCost: number;
    newCost: number;
    newQuantity: number;
    user: string;
    details: string;
  }): Promise<void> {
    const history = {
      id: crypto.randomUUID(),
      timestamp: getCurrentTime(),
      ...params
    };
    await db.stock_history.add(history);
    
    // Auto-sync stock history
    await this.registerSync('stock_history', 'INSERT', history as unknown as Record<string, unknown>);
  }

  async registerGoldAssetHistory(params: {
    action: 'BUYBACK' | 'SALE' | 'ADJUST' | 'LIQUIDATION';
    weightChange: number;
    newTotalWeight: number;
    user: string;
    details: string;
  }): Promise<void> {
    const history = {
      id: crypto.randomUUID(),
      timestamp: getCurrentTime(),
      ...params
    };
    await db.gold_asset_history.add(history);
    
    // Auto-sync gold asset history
    await this.registerSync('gold_asset_history', 'INSERT', history as unknown as Record<string, unknown>);
  }
}

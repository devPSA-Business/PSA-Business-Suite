import Dexie, { Table } from 'dexie';
import { StockCategory } from '../../domain/models/StockCategory';
import { UserRole } from '../../domain/models/User';

export interface StockItem {
  id: string;
  name: string;
  category: StockCategory;
  /** @precision Selalu gunakan MathUtils untuk aritmatika. Jangan gunakan JS native math. */
  price: number;
  /** @precision Selalu gunakan MathUtils untuk aritmatika. Jangan gunakan JS native math. */
  cost: number;
  quantity: number;
  barcode: string;
  weight?: number;
  karat?: number;
  specificCost?: number;
  version?: number;
  isDeleted?: boolean;
  branchId?: string;
  isStale?: boolean; // Indicates offline client needs Server HPP calculation
  is_shadow_hpp?: boolean; // Phase 1.1: indicates cost is a shadow moving average calculation
}

export interface TransactionItem {
  stockId: string;
  name: string;
  quantity: number;
  /** @precision Selalu gunakan MathUtils untuk aritmatika. Jangan gunakan JS native math. */
  price: number;
  /** @precision Selalu gunakan MathUtils untuk aritmatika. Jangan gunakan JS native math. */
  subtotal: number;
  /** @precision Selalu gunakan MathUtils untuk aritmatika. Jangan gunakan JS native math. */
  unitCost?: number;
  maxStock?: number;
  isCustomItem?: boolean;
}

export interface Transaction {
  id: string;
  date: number;
  /** @precision Selalu gunakan MathUtils untuk aritmatika. Jangan gunakan JS native math. */
  total: number;
  paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER' | 'SPLIT';
  items: TransactionItem[];
  status: 'SUCCESS' | 'VOIDED';
  user: string;
  sessionId?: string;
  customerId?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  loyaltyDiscountAmount?: number;
  manualDiscountAmount?: number;
  manualDiscountNote?: string;
  branchId?: string;
  isVoided?: boolean;
  voidReason?: string;
  authorizedBy?: string;
  isFlagged?: boolean;
  flagReason?: string;
  secureData?: string;
}

export interface Shift {
  id: string;
  startTime: number;
  endTime?: number;
  startCash: number;
  endCash?: number;
  expectedCash?: number;
  status: 'OPEN' | 'CLOSED';
  user: string;
  branchId?: string;
}

export interface RepairService {
  id: string;
  date: number;
  customerName: string;
  phoneNumber: string;
  itemDescription: string;
  serviceType: 'REPARASI' | 'SEPUH' | 'PATRI';
  initialWeight: number;
  price: number;
  materialCost?: number;
  photoBeforeBlob?: Blob;
  photoBeforeBase64?: string; // For backward compatibility
  status: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED';
  paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER';
  user: string;
  customerId?: string;
  branchId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  action: string;
  user: string;
  userId?: string;
  role?: string;
  entityId?: string;
  payloadDiff?: string;
  correlationId?: string;
  details: string;
  hash: string;
  previousHash: string;
  branchId?: string;
  secureData?: string;
}

export interface AIFeedbackTicket {
  id: string; // UUID
  timestamp: number;
  created_at: string; // ISO 8601
  user_id: string;
  route: string;
  component_id: string;
  device_type: string;
  screen_width: number;
  app_version: string;
  category: 'Bug' | 'UX' | 'Feature Request' | 'Data/Logic';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  screenshot_url?: string;
  status: 'New' | 'Triage' | 'In Progress' | 'Closed' | 'Needs Clarification';
  triage_notes?: string;
  branchId?: string;
  sync_status?: 'PENDING' | 'SYNCED' | 'FAILED';
}

export interface SyncEvent {
  id?: number;
  entity_type: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPDATE_DELTA';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
  status: 'PENDING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  timestamp: number;
  retry_count?: number;
  next_retry_time?: number;
  error_message?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server_payload?: Record<string, any>; // For conflict resolution
  idempotency_key?: string;
}

export interface GoldLiquidation {
  id: string;
  date: number;
  createdAt?: number;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  fineWeight: number;
  cogs: number;
  goldContent: number;
  laborCost: number;
  marketPrice: number;
  totalPrice: number;
  paymentMethod: 'CASH' | 'TRANSFER';
  status: 'SUCCESS' | 'VOIDED';
  user: string;
  branchId?: string;
}

export interface GoldPrice {
  id: string;
  pricePerGram: number;
  lastUpdated: number;
}

export interface GoldBuyback {
  id: string;
  date: number;
  customerName: string;
  customerId?: string;
  weightGram: number;     // berat riil
  kadar: number;          // 0.375 | 0.585 | 0.750 | 0.916 | 0.999
  pricePerGram: number;   // harga acuan Antam
  margin: number;         // 0.05 - 0.12 dsb
  buybackPrice: number;   // auto-kalkulasi
  paymentMethod: 'CASH' | 'TRANSFER';
  cashSource: 'gold_cash'; // FASE 2: Mutlak dibayar dari kas emas
  status: 'stored' | 'sold_to_collector';
  soldDate?: number;
  soldPrice?: number;
  soldPaymentMethod?: 'CASH' | 'TRANSFER';
  profitLoss?: number;
  notes?: string;
  user: string; // the teller/user
  branchId?: string;
}

export interface DailyGoldPrice {
  date: string; // ISO date YYYY-MM-DD
  antamPrice: number;
  updatedBy: string;
  updatedAt: number;
  branchId?: string;
}

export interface StockHistory {
  id: string;
  stockId: string;
  timestamp: number;
  action: 'ADD' | 'REMOVE' | 'UPDATE' | 'ADJUST';
  quantityChange: number;
  oldCost: number;
  newCost: number;
  newQuantity: number;
  user: string;
  details: string;
}

export interface SuspendedCart {
  id: string;
  name: string;
  items: TransactionItem[];
  total: number;
  timestamp: number;
  user: string;
  branchId?: string;
}

export interface Handover {
  id: string;
  timestamp: number;
  category: string;
  message: string;
  user: string;
  branchId?: string;
}

export interface PettyCash {
  id: string;
  date: number;
  category: 'PEMBELIAN_PRODUK' | 'BAYAR_UTANG' | 'GAJI' | 'PERALATAN' | 'OPERASIONAL' | 'LAINNYA';
  amount: number;
  description: string;
  user: string;
  branchId?: string; // fix: diperlukan untuk branch isolation & Firestore rules
}

export interface Appointment {
  id: string;
  date: number;
  customerName: string;
  description: string;
  status: 'PENDING' | 'DONE';
  user: string;
  branchId?: string; // fix: diperlukan untuk branch isolation & Firestore rules
}

export interface CustomOrder {
  id: string;
  date: number;
  customerName: string;
  description: string;
  estimatedPrice: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
  user: string;
  branchId?: string; // fix: diperlukan untuk branch isolation & Firestore rules
}

export interface InternalNote {
  id: string;
  date: number;
  category: 'KELUHAN' | 'LAPORAN';
  message: string;
  user: string;
  branchId?: string; // fix: konsistensi branch isolation
}

export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  createdAt: number;
  version?: number;
  loyaltyPoints: number;
  isDeleted?: boolean;
  branchId?: string;
  secureData?: string;
}

export interface Notification {
  id: string;
  recipient: string;
  message: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pinHash: string;
  salt?: string; // Phase 1.2: Random UUID salt for PBKDF2
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: number;
  branchId?: string;
  isDefaultPin?: boolean;
}

export interface GoldAssetHistory {
  id: string;
  timestamp: number;
  action: 'BUYBACK' | 'SALE' | 'ADJUST' | 'LIQUIDATION';
  weightChange: number;
  newTotalWeight: number;
  user: string;
  details: string;
}

export interface ShiftTotal {
  id: string; // usually shiftId or "T" + shiftId
  startTime: number;
  openCash: number;
  cashIn: number;
  cashOut: number;
  salesTotal: number;
  buybackTotal: number;
  pettyCashTotal: number;
  lastUpdatedAt?: number;
  branchId?: string;
}

export interface AnalyticsCacheData {
  revenue: number;
  transactions: number;
  date: string;
  metrics: Record<string, number>;
}

export interface AnalyticsCache {
  id: string; // e.g. "daily_metrics_30days"
  data: AnalyticsCacheData;
  createdAt: number;
  expiresAt: number;
}

export interface FraudAnomaly {
  id: string; // UUID
  txId: string;
  cashierId: string;
  score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  rulesTriggered: string[];
  status: 'OPEN' | 'RESOLVED';
  timestamp: number;
  resolvedAt?: number;
  resolvedBy?: string; // Admin User ID
}

export interface TelemetryEvent {
  id: string; // UUID
  timestamp: number;
  eventType: string; // e.g., 'FRAUD_SCAN_COMPLETED', 'FILTER_CATEGORY_USED'
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
  branchId?: string;
}

export interface AiCache {
  queryHash: string; // id
  response: string;
  createdAt: number;
  expiresAt: number;
}

export interface AiAccessLog {
  id: string; // UUID
  queryHash: string;
  responseHash: string;
  aggregatesUsed: number; // Num bytes or items
  timestamp: number;
  userId: string;
  action: 'NLQ_QUERY' | 'NLQ_VIEW_RAW';
}

export interface FinancialClosure {
  id: string; // YYYY-MM-DD
  date: number;
  summary: {
    totalRevenue: number;
    grossProfit: number;
    totalTransactions: number;
    cashIn: number;
    cashOut: number;
  };
  hash: string;
  previousHash: string;
  branchId?: string;
}

export interface PrinterConfig {
  vendorId?: number;
  productId?: number;
  type: 'thermal' | 'inkjet' | 'USB' | 'BLUETOOTH';
  width?: number;
  encoding?: string;
  usb_endpoint?: number;
  name?: string;
  deviceId?: string;
}

export interface StoreProfile {
  id: string; // usually 'default' or single ID
  name: string;
  address: string;
  receiptFooter: string;
  isSetupComplete: boolean;
  updatedAt: number;
  printerConfig?: PrinterConfig;
}

export class PsaDatabase extends Dexie {
  stock!: Table<StockItem, string>;
  transactions!: Table<Transaction, string>;
  repair_services!: Table<RepairService, string>;
  audit_logs!: Table<AuditLog, string>;
  shifts!: Table<Shift, string>;
  sync_events!: Table<SyncEvent, number>;
  users!: Table<User, string>;
  customers!: Table<Customer, string>;
  notifications!: Table<Notification, string>;
  analytics_cache!: Table<AnalyticsCache, string>;
  fraud_anomalies!: Table<FraudAnomaly, string>;
  telemetry_events!: Table<TelemetryEvent, string>;
  financial_closures!: Table<FinancialClosure, string>;
  store_profile!: Table<StoreProfile, string>;
  
  /**
   * Tabel `gold_liquidations` menyimpan data penjualan B2B (Business-to-Business).
   * Ini mencatat transaksi penjualan emas (yang sebelumnya dibeli dari pelanggan via buyback)
   * kepada pihak ketiga atau pengepul. Ini BUKAN transaksi ritel B2C.
   */
  gold_liquidations!: Table<GoldLiquidation, string>;
  
  gold_price!: Table<GoldPrice, string>;
  daily_gold_price!: Table<DailyGoldPrice, string>;
  gold_buyback!: Table<GoldBuyback, string>;
  stock_history!: Table<StockHistory, string>;
  gold_asset_history!: Table<GoldAssetHistory, string>;
  suspended_carts!: Table<SuspendedCart, string>;
  handovers!: Table<Handover, string>;
  petty_cash!: Table<PettyCash, string>;
  appointments!: Table<Appointment, string>;
  custom_orders!: Table<CustomOrder, string>;
  internal_notes!: Table<InternalNote, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keys_meta!: Table<Record<string, any>, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyval!: Table<Record<string, any>, string>;
  sync_dlq!: Table<SyncEvent, number>;
  shift_totals!: Table<ShiftTotal, string>;
  ai_cache!: Table<AiCache, string>;
  ai_access_logs!: Table<AiAccessLog, string>;
  ai_feedback_tickets!: Table<AIFeedbackTicket, string>;

  constructor() {
    super('PSA_POS_DB');
    
    // Version 1: Squashed Schema
    this.version(1).stores({
      stock: 'id, name, category, barcode, quantity, branchId',
      transactions: 'id, date, status, sessionId, customerId, branchId',
      repair_services: 'id, date, customerName, status, paymentMethod, branchId',
      audit_logs: 'id, timestamp, action, user, userId, branchId, entityId',
      shifts: 'id, startTime, status, user, branchId',
      sync_events: '++id, entity_type, status, timestamp, idempotency_key',
      users: 'id, name, role, status, branchId',
      customers: 'id, name, phoneNumber, loyaltyPoints, version, branchId',
      notifications: 'id, recipient, timestamp, status',
      gold_liquidations: 'id, date, status, paymentMethod, branchId',
      gold_price: 'id',
      daily_gold_price: 'date, branchId',
      gold_buyback: 'id, date, customerName, paymentMethod, status, branchId',
      stock_history: 'id, stockId, timestamp, action',
      gold_asset_history: 'id, timestamp, action',
      suspended_carts: 'id, timestamp, user, branchId',
      handovers: 'id, timestamp, category, branchId',
      petty_cash: 'id, date, category, branchId',
      appointments: 'id, date, status, branchId',
      custom_orders: 'id, date, status, branchId',
      internal_notes: 'id, date, category, branchId',
      keys_meta: 'id, keyId',
      keyval: 'key',
      sync_dlq: '++id, entity_type, status, timestamp, idempotency_key',
      shift_totals: 'id, startTime',
      analytics_cache: 'id, expiresAt',
      fraud_anomalies: 'id, txId, cashierId, status, severity, timestamp',
      telemetry_events: 'id, timestamp, eventType, userId',
      ai_cache: 'queryHash, expiresAt',
      ai_access_logs: 'id, timestamp, queryHash',
      ai_feedback_tickets: 'id, timestamp, status, sync_status, category',
      financial_closures: 'id, date, branchId',
      store_profile: 'id, isSetupComplete'
    });

    this.on('populate', () => {
    });
  }
}

export const db = new PsaDatabase();

export const getDatabaseSize = async (): Promise<number> => {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
  return 0;
};

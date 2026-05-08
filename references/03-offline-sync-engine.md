# Reference 03 — Offline Sync Engine, Queue & Retry Strategy
# @ai_context: Mekanisme sinkronisasi offline-first PSA Business Suite
# @business_rule: Transaksi kasir HARUS bisa berjalan tanpa internet
# @security_tier: HIGH

## 1. Arsitektur Sync Engine

```
KASIR (tanpa internet)
  │
  ▼
Dexie.js (IndexedDB) ← Primary Read/Write
  │
  ▼ (background, saat online)
SyncQueue (sync_events table)
  │
  ▼ exponential backoff
healthGuardian.worker.ts (Web Worker)
  │
  ▼ HTTPS + App Check
Firebase Cloud Functions
  │
  ▼
Firestore (backup cloud)
```

## 2. UnitOfWork Pattern (WAJIB untuk semua mutasi)

```typescript
// @ai_context: Setiap mutasi WAJIB lewat UnitOfWork
// @business_rule: Atomicity lokal dijamin, cloud best-effort
interface UnitOfWork {
  transactions: TransactionRepository;
  inventory:    StockRepository;
  syncQueue:    SyncQueueRepository;
  
  commit(): Promise<void>;   // Atomic commit ke IndexedDB
  rollback(): Promise<void>; // Rollback jika ada error
}

// Contoh penggunaan di UseCase:
async function checkoutUseCase(cart: CartItem[], uow: UnitOfWork) {
  const txId = generateId(); // UUID v4 — idempotency key
  
  await uow.transactions.create({ id: txId, ...cart });
  await uow.inventory.decrementBatch(cart); // Delta, bukan absolut
  await uow.syncQueue.enqueue({ entity: 'transaction', id: txId });
  
  await uow.commit(); // Satu commit atomic ke IndexedDB
}
```

## 3. Exponential Backoff & Retry

```typescript
// Konfigurasi retry di SyncServiceImpl.ts
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelayMs: 1000,   // 1 detik
  maxDelayMs: 300_000,    // 5 menit (batas atas)
  backoffMultiplier: 2,
};

// delay = min(initialDelay * 2^retryCount, maxDelay)
// Retry 1: 1s → Retry 2: 2s → Retry 3: 4s → Retry 4: 8s → Retry 5: DLQ
```

## 4. Dead Letter Queue (DLQ) Handling

```typescript
// Item masuk DLQ setelah maxRetries gagal
// Watchdog cek DLQ setiap 6 jam:
//   - DLQ > 10 items → alert Telegram Owner
//   - Auto-retry DLQ setelah 24 jam (1x attempt)
//   - DLQ > 30 hari → eskalasi ke Owner untuk manual review

interface DLQItem extends SyncEvent {
  status: 'DLQ';
  failureReason: string;
  lastAttemptAt: number;
}
```

## 5. Network State Detection

```typescript
// healthGuardian.worker.ts — polling, BUKAN onSnapshot
// Cek konektivitas setiap 30 detik
const HEALTH_CHECK_INTERVAL = 30_000;

// Jika online → proses sync queue PENDING
// Jika offline → simpan ke IndexedDB, queue untuk nanti
// DILARANG: onSnapshot Firestore di main thread atau client langsung
```

## 6. Conflict Detection di Sync

```typescript
// Setelah sync, validasi konsistensi:
interface SyncConflict {
  entity: string;
  localValue: unknown;
  serverValue: unknown;
  resolution: 'local_wins' | 'server_wins' | 'merge';
  resolvedAt: number;
}

// Strategi resolusi:
// - Profil/Settings → server_wins (Last-Write-Wins by timestamp)
// - Stok → merge via CRDT delta
// - Transaksi → local_wins (immutable, append-only)
```

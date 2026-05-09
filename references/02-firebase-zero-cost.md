# Reference 02 — Firebase Zero-Cost, Sync & Conflict Resolution
# @ai_context: Konfigurasi Firebase untuk free tier dan strategi sinkronisasi
# @business_rule: Target biaya Rp 0/bulan; trip-wire di 50K reads/hari
# @security_tier: HIGH

## 1. Firebase Free Tier Limits & Trip-Wire

| Service | Limit Harian | Trip-Wire Alert | Mitigasi |
|---|---|---|---|
| Firestore Reads | 50.000/hari | >40.000 | Tambah IndexedDB cache, kurangi query |
| Firestore Writes | 20.000/hari | >15.000 | Batch writes, debounce sync |
| Cloud Functions | 125.000/bulan | >100.000 | Cache hasil fungsi di Dexie |
| Storage | 1 GB | >800 MB | Kompres foto produk sebelum upload |

## 2. Firestore Initialization (Offline-First Pattern)

```typescript
// src/shared/api/firebase.ts
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache() // Aktifkan persistence
});
```

**Prinsip:** Firestore digunakan sebagai backup & sumber rekonsiliasi, BUKAN primary DB.

## 3. Conflict Resolution Strategy

### Profil & Settings → Last-Write-Wins
```typescript
// Gunakan server timestamp sebagai tie-breaker
const data = {
  ...updatedProfile,
  updatedAt: serverTimestamp(), // Firestore server timestamp
  clientUpdatedAt: Date.now()   // Untuk audit local
};
```

### Stok & Inventaris → CRDT Delta
```typescript
// JANGAN kirim: { stock: 45 }  ← nilai absolut bisa conflict
// WAJIB kirim:  { delta: -2 }  ← delta relatif aman untuk CRDT
interface StockDelta {
  productId: string;
  delta: number;        // +N atau -N, bukan nilai final
  idempotencyKey: string; // UUID v4 — cegah double apply
  timestamp: number;
}
```

### Transaksi Keuangan → Append-Only (Immutable)
- Transaksi TIDAK PERNAH diupdate — hanya ditambah (append-only)
- Void dilakukan dengan membuat transaksi baru bertanda `type: 'VOID'`
- Rekonsiliasi dilakukan via `handleReconcileInventory` Cloud Function

## 4. Sync Queue Pattern

```typescript
// sync_events table di Dexie
interface SyncEvent {
  id: string;           // UUID v4
  entity: string;       // 'transaction' | 'stock' | 'customer'
  payload: string;      // JSON string — TERENKRIPSI untuk data sensitif
  status: 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED' | 'DLQ';
  retryCount: number;   // Max 5 sebelum masuk DLQ
  createdAt: number;
  syncedAt?: number;
}
```

## 5. Auto-Pruner Rules (Aman untuk Dihapus)

```
audit_logs  → hapus jika > 90 hari DAN sudah di-sync ke Firestore
sync_events → hapus jika status = 'COMPLETED' DAN > 30 hari
```

**DILARANG dihapus:**
- Tabel `transactions` (immutable, audit trail permanen)
- Tabel `gold_lots` (HPP Specific Identification)
- SecurityStore data

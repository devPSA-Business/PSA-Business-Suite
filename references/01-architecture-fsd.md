# Reference 01 — Architecture FSD, Firestore Rules & Cloud Functions
# @ai_context: Arsitektur utama PSA Business Suite
# @business_rule: Clean Architecture + Feature-Sliced Design wajib diikuti
# @security_tier: HIGH

## 1. Feature-Sliced Design (FSD) — Aturan Baku

### Alur Dependensi (WAJIB Searah)
```
UI Components → Zustand Store → UseCase → Repository Interface → Dexie Implementation
```

Tidak boleh ada import ke atas (UI tidak boleh import UseCase langsung, UseCase tidak boleh import UI).

### Struktur Fitur Standard
```
features/<nama>/
├── ui/           ← Komponen React, hooks presentasional
├── store/        ← Zustand store (state lokal fitur)
└── usecases/     ← Logika bisnis, orchestrasi, validasi
```

### Aturan `shared/`
- Hanya boleh berisi: tipe lintas fitur, komponen primitif (Button, Toast), utils (MathUtils, formatUtils), db.ts, constants
- DILARANG menaruh logika bisnis spesifik di `shared/`

---

## 2. Firestore Security Rules — Prinsip

```javascript
// Template rules PSA — JANGAN diubah tanpa ADR
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Validasi App Check (wajib di production)
    function isHardened() {
      return request.app.token.app_check_valid;
    }
    
    // Role check
    function hasRole(role) {
      return request.auth.token.role == role;
    }
    
    // Branch isolation
    function isSameBranch(branchId) {
      return request.auth.token.branchId == branchId;
    }
    
    // Kasir hanya bisa akses data cabangnya
    match /branches/{branchId}/transactions/{txId} {
      allow read, write: if isHardened()
        && request.auth != null
        && isSameBranch(branchId)
        && (hasRole('kasir') || hasRole('owner'));
    }
    
    // Owner bisa akses semua
    match /{document=**} {
      allow read, write: if isHardened()
        && hasRole('owner');
    }
  }
}
```

---

## 3. Cloud Functions — Kontrak Interface

### `queryGemini` (AI Proxy)
- Input: `{ query: string, context: SafeAggregateData }` — PII sudah di-strip sebelum masuk
- Output: `{ result: string, cached: boolean }`
- Rate limit: 60 req/menit per branchId
- Secret: GEMINI_API_KEY hanya ada di Functions environment

### `handleReconcileInventory` (CRDT Stock)
- Input: `{ branchId, deltas: StockDelta[] }` — delta, bukan nilai absolut
- Output: `{ reconciled: boolean, newStock: Record<productId, number> }`
- Conflict resolution: delta ditambahkan ke nilai server (CRDT Add-Only)

### `calculateShadowHPP` (Moving Average)
- Input: `{ branchId, productId, newPurchasePrice, newQty }`
- Output: `{ hpp: string }` — string Decimal untuk presisi
- Dijalankan server-side untuk menghindari race condition kalkulasi

### `scheduledSystemWatchdog` (Cron 6 jam)
Checks:
1. Fraud anomaly > 24 jam tanpa closure → alert
2. Sync DLQ > 10 items → auto-retry
3. Financial closure kemarin belum tutup → reminder
4. Kirim summary ke Telegram Bot

---

## 4. ADR Index

| ADR | Topik | Status |
|---|---|---|
| ADR-001 | FSD Architecture Adoption | Closed |
| ADR-002 | Environment & Pipeline Strategy | Closed |
| ADR-005 | Offline-First Sync Protocol | Closed |
| ADR-009 | Vite Crypto Pepper Trade-off | Closed |
| ADR-010 | Checkout Bug-001 Remediation | Closed |
| ADR-011 | App Check Rollback | Closed |
| ADR-012 | POS Checkout Refactor | Closed |

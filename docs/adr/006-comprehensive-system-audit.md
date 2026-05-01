# ADR-006: Comprehensive System Audit & Prioritization
**Status**: Accepted
**Konteks**:
Sistem telah berjalan pada versi PWA Offline-First (1.3.5 / 1.4+). Berdasarkan pengecekan dan audit lintas domain, PSA Core cukup stabil tetapi membawa technical debt lint warnings sebanyak 139 item dan ada gap kebutuhan bisnis seputar pembelian emas pelanggan (modul *Gold Treasury*). Laporan ini diwajibkan untuk merepresentasikan hasil audit komprehensif.

**Keputusan (Audit Findings & Action Plan)**:

1. **Integritas Arsitektur & Performa**:
   - Sistem sudah menaati pemisahan mutasi via `UnitOfWork` (Offline-first / Sinkronisasi).
   - Telah menggunakan `Decimal.js` (MathUtils) dalam kalkulasi emas pada UseCase, mengeliminir risiko *floating-point error*.
   
2. **Kebutuhan Bisnis Kritis (Gold Buying - P1)**:
   - Terdapat **gap skema data**: Entitas `GoldBuyback` yang lama (menyimpan *stoneWeight*, *fineWeight*) masih dipertahankan di Dexie. Ini tidak sinkron dengan SOP terbaru yang tertera dalam *Business Advisory*, di mana entitas ini harus di *reshape* menjadi `GoldBuyTransaction` dengan tambahan kolom `margin`, status penyimpanan (`stored`, `sold_to_collector`), dan aturan pemisahan `cashSource` dari "kas toko" dengan "kas emas".
   
3. **Pembersihan Logika UI / Linter**:
   - Secara masif terdapat unused variables dari proses refactoring pada file utama (seperti `App.tsx`, `OwnerDashboardPage.tsx`). Hal ini berdampak buruk terhadap keterbacaan kode (maintainability) ke depan. Ditemukan 139 warning TypeScript/ESLint yang mesti diresikkan pada tahap optimasi (*P3*).

**Konsekuensi**:
- Pekerjaan refaktor skema Data `GoldBuyback` menjadi prioritas terdekat dalam roadmap (*P1*), yang akan berimplikasi pada layout pelaporan laba/rugi, sinkronisasi firebase, dan alur transaksi kasir layar sentuh.
- Membuka ruang untuk merancang ulang modul Workspace (Pisah Kas Kecil) agar aliran transaksi Buyback tidak membakar kas toko berjalan.

**Alternatif yang Ditolak**:
- Menghilangkan struktur dexie lama seketika. Ditolak karena memerlukan strategi migrasi `IndexedDB` bertahap tanpa membahayakan data pelanggan eksisting di toko yang sudah berjalan.

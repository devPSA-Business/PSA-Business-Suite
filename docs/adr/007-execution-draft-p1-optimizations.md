# DRAFT PENGERJAAN: HASIL AUDIT SISTEM KOMPREHENSIF (Q2 2026)
**Dokumen:** Execution Draft & Roadmap
**Target Sistem:** PSA Business Suite v1.4+
**Oleh:** PSA IT TEAM (Senior Architect & Business Advisor)

---

## 🎯 RINGKASAN TEMUAN AUDIT MENDALAM
Setelah melakukan bedah menyeluruh terhadap file, repositori, dan arsitektur kode saat ini, sistem dinilai **sukses mengimplementasikan standar keamanan dan stabilitas inti** (Offline-First, Dexie, Decimal.js). Namun, kami menemukan *Technical Debt* (Hutang Teknis) dan **Gap Kebutuhan Lapangan** (berdasarkan SOP Owner) yang sangat krusial untuk segera dieksekusi.

Berikut adalah draft pengerjaan terstruktur yang wajib diimplementasikan bertahap:

---

## 🛠️ PETA JALAN EKSEKUSI (DRAFT PENGERJAAN)

### 🧹 FASE 1: Zero Warning & Code Quality Cleanup (Tingkat: Urgent)
*Saat ini linter mendeteksi 134 Warnings (mayoritas Unused Variables, Imports yang tidak terpakai, dan Warning Dependencies pada React Hooks).*
1. **Pembersihan Logika UI:** Menghapus import Icon, variabel hasil refaktor lama, dan pembersihan props pada file-file utama (cth: `App.tsx`, `OwnerDashboardPage.tsx`, dll).
2. **Perbaikan Keamanan `useEffect`:** Mengatasi `react-hooks/exhaustive-deps` di `AuditLogViewer.tsx` dan `EmployeesPage.tsx` agar memori stabil, mencegah render berulang yang memperberat kinerja tablet kasir.

### 💰 FASE 2: Modul Gold Treasury / Buyback Emas (Tingkat: Kritis / P1)
*Skema data saat ini belum 100% mencerminkan operasional riil Beli Emas dari Konsumen sesuai dokumen SOP Lapangan. Harus ada pemisahan "Toko" vs "Emas".*
1. **Perubahan Skema Database (Dexie):** Merombak data kontrak pembelian emas agar memiliki field `margin`, mode penyimpanan (`stored` vs `sold_to_collector`), dan identifikasi `cashSource` (menjamin uang diambil dari *Kas Emas*, bukan *Kas Toko* kasir).
2. **Kalkulasi & Use Case:** Menyesuaikan rumusan `(Gram × Kadar × Harga Acuan Antam) × (1 - Margin)` menggunakan struktur `MathUtils`.
3. **Penyempurnaan Antarmuka (UI) Buyback:** Form interaktif yang ramah pengguna sentuh untuk pengisian estimasi harga secara real-time di depan konsumen.

### 📦 FASE 3: SKU Generator Pintar di Inventaris (Tingkat: Tinggi / P1)
*Owner dan gudang saat ini berisiko salah mengetik input SKU yang dapat membuyarkan data pelaporan stok perhiasan imitasi.*
1. **Implementasi UI Dropdown SKU:** Pembuatan form pendaftaran produk dengan format interaktif: `[BRAND] - [KATEGORI] - [WARNA] - [UKURAN] - [BATU/MOTIF]`.
2. **Auto-Sequence Generator:** Logic cerdas untuk mencari indeks produk terakhir (`SEQ`) agar pembuatan SKU baru akan secara otomatis menambahkan nomor seperti `001`, `002`, menghindari *Duplicate Barcode*.

### 💸 FASE 4: Refactor Modul Workspace & Pemisahan Kas (Tingkat: Menengah / P2)
*Berikatan erat dengan Fase 2. Modal emas dan modal ritel toko harus direkonsiliasi terpisah.*
1. **Redesign Dashboard Petty Cash:** Memisahkan laci virtual antara *Kas Toko (Perhiasan Imitasi/Jasa)* dengan *Kas Emas (Buyback)*.
2. **Dashboard Smart Insights:** Penambahan analitik laba/rugi (Profit & Loss) khusus untuk transaksi Buyback Emas.

### 🚀 FASE 5: Automasi Pipeline & Deployment CI/CD (Tingkat: Tinggi / P1)
*Tidak boleh lagi ada deploy manual berbasis CLI dev yang rentan kesalahan manusia.*
1. Instalasi **GitHub Actions Workflow** untuk otomasi *checking* linter, *type validation*, dan penentuan auto-deployment ke Firebase Hosting (Production).

---

## 🤝 PROTOKOL PERSETUJUAN
Kami siap mengeksekusi mulai dari **FASE 1 (Pembersihan 134 Warnings)* guna menormalkan detak jantung kode Anda ke titik "Nihil Hutang Teknis", dan secara paralel merayap ke **FASE 2**.

Apakah Anda setuju kita mulai pembedahan dari **FASE 1** sekarang?

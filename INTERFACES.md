# INTERFACES.md – Kontrak Antar Modul
*Bagian dari Kerangka Dokumentasi Konteks AI - PSA-BUSINESS-SUITE*

## 1. Kontrak Layer Domain Aplikasi (Tipe Data Bersama)
Objek transfer data (DTO) dan Tipe Entitas dipelihara di bawah wilayah `/src/domain/model/` dan `/src/domain/dtos/`. Tidak boleh ada modul UI di `/src/features/` yang mendefinisikan skema domain bisnisnya sendiri.
**Contoh Interaksi:**
- `Customer`: Profil pelanggan (wajib PII sanitized jika dikirim ke layanan pihak ke-3 melalui Audit log).
- `RetailTransaction`: Pembungkus kasir POS. Terdiri dari *Cart/Item*, Nilai *Tender*, dan status Sinkronisasi.
- `Handover`: Format *schema* transfer *stok* atau *petty cash* antar dua pergantian kasir/pegawai.

## 2. API Repositori (Abstraksi Database)
Lapisan *Infrastructure* diisolasi. Fitur-fitur tidak boleh langsung memanggil modul `dexie` maupun `firebase` untuk membaca data, tetapi harus menggunakan Repositori Terinjeksi (Dependency Injection/Inversion of Control) misalnya:
- `ICustomerRepository`, `IStockRepository`, `IRetailRepository` di dalam `/src/domain/repositories/`.
- Fungsional pembaruan wajib menggunakan pola transaksi **Unit of Work** (`IUnitOfWork.ts`) untuk menjamin *Atomic Commit* lintas tabel IndexedDB (Dexie).

## 3. Service Level Agreement (SLA) untuk Sinkronisasi
- Fungsionalitas aplikasi lokal (POS, Kasir) harus merespons **tanpa blokir koneksi jaringan** (*zero-blocking sync operation*).  
- Antarmuka **Guardian Sync** (`ISyncService`) menerima `sync_status` dari tiap rekam jejak. Event konflik akan menyiarkan (*publish event*) untuk diselesaikan via manual/auto *resolver* pada modul *report/conflict*.

## 4. Protokol Modul Eksternal (Hardware & Crypto)
- **Barcodes / Printer / Timbangan (Scale):** Modul `IPrintService` dan perangkat keras dibungkus secara asinkron. Failsafe disertakan untuk kegagalan PWA terkait pembacaan USB/Bluetooth.
- **Crypto & PIN Hash:** Semua validasi wajib melewati lapisan `IKmsService` & `cryptoKeyStore.ts`. Kontrak tidak boleh dieksploitasi melalui fungsi *bypass frontend*.

---
*Daftar ini akan diperluas berdasarkan API yang tersedia bagi integrasi BFF `/api/*` selanjutnya.*

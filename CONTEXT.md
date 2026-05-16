# CONTEXT.md – Indeks Konteks Bertingkat
*Bagian dari Kerangka Dokumentasi Konteks AI - PSA-BUSINESS-SUITE*

## 1. Tujuan Proyek & Pengguna Akhir
- **Tujuan Khusus:** Sistem operasi inti (Business Suite) offline-first untuk toko perhiasan imitasi. Mengutamakan stabilitas ekstrem, keakuratan transaksi ritel, serta keamanan data secara kriptografis tanpa memerlukan *maintenance* teknis rutin (zero-maintenance).
- **Pengguna Akhir:** 
  1. *Kasir / Staf Frontline:* Mengoperasikan POS, memulai/menutup shift, mengelola penjualan dan *buyback* emas.
  2. *Manajer / Owner:* Akses ke pelaporan *real-time*, rekonsiliasi kas (petty cash), resolusi konflik sinkronisasi, dan audit log finansial.
- **Indikator Keberhasilan:** Ketersediaan operasional tanpa henti (bahkan tanpa internet), waktu *loading* kasir < 1 detik, zero loss dalam rekonsiliasi data *shift*, dan auditabilitas setiap mutasi inventori.

## 2. Fungsi Inti Proyek (80% Nilai Bisnis)
1. **Titik Penjualan Ritel (POS):** Checkout cepat, penangguhan cart, diskon, pelayanan order *custom*, dan pelacakan transaksi pelanggan prioritas.
2. **Manajemen Buyback & Likuidasi Emas:** Menilai, mengamankan, dan mencatat transaksi penjualan/pembelian kembali produk emas dengan akurasi terenkripsi.
3. **Penyimpanan Offline-First & Sinkronisasi:** Memanfaatkan `Dexie` (IndexedDB) untuk operasional lokal toko, dan secara transparan melakukan sinkronisasi dengan Cloud Firebase API ketika terhubung.
4. **Validasi & Shift Handover:** Prosedur ketat berbasis PIN (PinGate) dan laporan akhir pergantian *shift* agar mutasi kas terpantau 100%.

## 3. Alur Proses Bisnis End-to-End
- **Start Shift:** Kasir masuk (PIN authentication), mendaftarkan pembukaan laci kas.
- **Operasional Harian:** Kasir mencatat penjualan, menerima emas bekas (buyback), melayani perbaikan (repair/services), menggunakan *petty cash* kecil. Jika offline, data di *IndexedDB*; jika online, data secara otomatis dipantau Guardian Sinkronisasi (`SyncServiceImpl`).
- **End Shift / Handover:** Aplikasi akan memblokir operasional utama di luar *shift*, melakukan penyetoran (checkout) shift, validasi jumlah fisik kas dengan sistem, dan pemindahan hak.

## 4. Model Data Esensial & Kebijakan
- **Entitas Inti:** `Customer`, `StockItem`, `RetailTransaction`, `GoldBuyback`, `Shift`, `Handover`.
- **Relasi & RLS (Row-Level Security):** Didefinisikan di `firestore.rules`. Akses penulisan log audit dibatasi (immutable). Relasi entitas umumnya terkait ke siklus *Shift* sebagai batas mutasi.

## 5. Peta Sumber Kode (Level 1)
- `/src/domain/` - Model kelas entitas, interface repositori, dan *business rule* murni.
- `/src/application/` - *Service layer*, *use cases*, dan fungsional sistem.
- `/src/infrastructure/` - Implementasi penyimpanan (Dexie lokal, Firebase sinkronisasi), layanan kriptografi (KMS), *hardware bridging*.
- `/src/features/` - UI/UX React yang dipartisi per modul bisnis (contoh: `pos/`, `gold/`, `inventory/`, `shift/`, `reports/`).
- `/src/pages/` - *Assembly* tingkat halaman (*routing* utama untuk *pages*).
-`/server.ts` - *BFF (Backend for Frontend)* lokal mem-proxy API.

---
*File ini difungsikan agar agen AI tidak perlu membaca keseluruhan struktur aplikasi dan hanya berfokus pada arsitektur domain saat memodifikasi.*

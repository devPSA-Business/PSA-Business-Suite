# DOKUMEN USULAN & REKOMENDASI: STANDARISASI RUANG KERJA (WORKSPACE)
**Proyek:** PSA Business Suite
**Tanggal:** 6 April 2026
**Partisipan Diskusi:** Owner & Lead Architect (AI Build)

---

## 1. RINGKASAN EKSEKUTIF
Dokumen ini berisi cetak biru (blueprint) perancangan ulang halaman **Ruang Kerja (Workspace)**. Berdasarkan diskusi strategis dengan Owner, Ruang Kerja tidak hanya berfungsi sebagai pintu masuk kasir, tetapi berevolusi menjadi pusat kendali operasional harian yang mencakup manajemen arus kas kecil (petty cash), pelayanan pelanggan (katalog & order kustom), dan pusat komunikasi antar-lini.

## 2. PRINSIP DESAIN & RESPONSIVITAS (Mobile, Tablet, PC)
Sesuai arahan Owner, antarmuka ini akan distandarisasi untuk semua perangkat dengan prinsip **Bento Grid Layout**. 

**Strategi Responsif:**
*   **Isi Konten (Sama Rata):** Seluruh fitur dan tombol akan 100% sama di semua perangkat. Tidak ada fitur yang disembunyikan di mobile.
*   **Tata Letak (Adaptif):** 
    *   *Mobile:* Grid 1 kolom (menggulir ke bawah).
    *   *Tablet:* Grid 2 kolom.
    *   *PC/Desktop:* Grid 3 kolom (memaksimalkan ruang layar lebar).
*   **Pengecualian (Navigasi):** Sesuai izin Owner, perbedaan hanya terjadi pada navigasi. 
    *   *Mobile:* Menggunakan *Bottom Navigation Bar* (Menu di bawah agar mudah dijangkau jempol) atau *Hamburger Menu*.
    *   *Tablet/PC:* Menggunakan *Sidebar* (Menu di samping kiri) yang persisten.

## 3. ARSITEKTUR TATA LETAK & FITUR (Bento Grid)

### A. Zona Konteks (Header)
*   Informasi Kasir Aktif, Waktu, dan Status Koneksi/Sinkronisasi.

### B. Zona Aksi Utama (Hero Section)
*   **Point of Sale (Kasir):** Tombol raksasa untuk masuk ke mode transaksi (Ritel, Jasa, Emas).

### C. Zona Operasional & Keuangan
*   **Kas Keluar (Petty Cash):** Modul pencatatan pengeluaran laci kasir dengan 3 lini:
    1. Beban Biaya Wajib (Listrik, Keamanan, dll).
    2. Beban Biaya Lainnya (Konsumsi, ATK, dll).
    3. Pengeluaran Lainnya (Refund, dll).
*   **Riwayat Transaksi:** Akses cepat melihat 5-10 transaksi terakhir di shift berjalan (untuk cetak ulang/pembatalan).

### D. Zona Pelayanan Pelanggan
*   **Katalog Produk:** Etalase digital untuk melihat stok dan harga tanpa masuk ke mode kasir.
*   **Order Kustom:** Pencatatan pesanan khusus dari konsumen (Pre-order, perhiasan custom, dll).

### E. Zona Pusat Komunikasi (3 Lini Catatan)
*   **Lini 1: Janji Temu:** Jadwal dengan mitra/konsumen hari ini.
*   **Lini 2: Serah Terima (Handover):** Pesan estafet untuk shift/pengguna selanjutnya.
*   **Lini 3: Catatan Pribadi/Keluhan:** Laporan kerusakan atau keluhan internal yang hanya diteruskan ke Manajemen (Office).

---

## 4. PEMETAAN FILE (FILE MAPPING)

Untuk mengimplementasikan arsitektur di atas, berikut adalah daftar file teknis dan non-teknis yang akan terlibat/dibuat:

### A. File Non-Teknis (Dokumentasi)
*   `docs/WORKSPACE_PROPOSAL.md` *(Dokumen ini)*
*   `docs/DATABASE_SCHEMA_UPDATE.md` *(Rencana penambahan tabel database baru)*

### B. File Teknis UI/UX (Frontend)
*   `src/pages/WorkspacePage.tsx` *(File utama yang akan dirombak total)*
*   `src/features/workspace/components/PettyCashModal.tsx` *(Formulir Kas Keluar)*
*   `src/features/workspace/components/CommunicationBoard.tsx` *(Komponen 3 Lini Catatan)*
*   `src/features/workspace/components/CustomOrderWidget.tsx` *(Widget Order Kustom)*
*   `src/features/workspace/components/CatalogWidget.tsx` *(Widget Katalog)*

### C. File Teknis Database & Domain (Backend/Engine)
*   `src/shared/api/db.ts` *(Membutuhkan penambahan tabel baru: `petty_cash`, `appointments`, `custom_orders`, `internal_notes`)*
*   `src/infrastructure/uow/UnitOfWorkImpl.ts` *(Mendaftarkan tabel baru ke dalam sistem transaksi dan sinkronisasi)*

### D. File Teknis Use Case (Business Logic)
*   `src/application/usecases/RecordPettyCashUseCase.ts`
*   `src/application/usecases/ManageCommunicationUseCase.ts`
*   `src/application/usecases/CreateCustomOrderUseCase.ts`

---

## 5. KESIMPULAN & LANGKAH SELANJUTNYA
Desain ini memastikan Ruang Kerja menjadi *dashboard* yang sangat fungsional, responsif di segala perangkat, dan menjaga akuntabilitas operasional toko. 

**Langkah Eksekusi (Menunggu Approval Owner):**
1. Memperbarui skema database (`db.ts`) untuk menampung data Kas Keluar, Janji Temu, Order Kustom, dan Keluhan.
2. Membangun komponen UI (Bento Grid) di `WorkspacePage.tsx`.
3. Menghubungkan UI dengan logika bisnis (Use Cases) dan Unit of Work.

# ADR-008: Business Context & SKU Refinement (Imitation & Gold Buyback)
**Status**: Accepted
**Konteks**:
Owner (Founder) telah mengklarifikasi dan menginterupsi proses dengan pengarahan bisnis yang lebih jelas. Konteks ini wajib dipegang teguh untuk menuntun penulisan spesifikasi SKU, layanan, dan modul ekstensi pembelian emas.

**Keputusan Bisnis Yang Dimandatkan (The Business Ground Truth)**:

1. **Inti Bisnis (Perdagangan Perhiasan Imitasi)**:
   - **Merek / Brand Material**: `Xuping`, `Yaxia`, `Meilyn`, `AMK titanium`, `Rhodium`.
   - **Kategori**: `Cincin`, `Anting`, `Kalung`, `Gelang Tangan`, `Gelang Kaki`, `Couple`, `Full Set`.
   - *Tindakan Dev*: Sistem SKU (SKU Generator) di Inventaris harus distandarisasi untuk mendukung hierarki brand, kategori, dan spesifikasi/atribut ini agar stok mudah disortir dan dikelola.

2. **Layanan Jasa Perawatan Utama**:
   - `Sepuh`, `Patri`, `Perbaikan Ringan`, `Orderan Custom`.

3. **Layanan Tambahan (Gold Treasury / Beli Emas dari Konsumen)**:
   - Tercipta karena permintaan tinggi di pasar tradisional semi-modern yang besar.
   - **Alur Mutlak**: Toko membeli emas dari konsumen $\rightarrow$ **DIJUAL KE PENGEPUL EMAS**.
   - Emas yang dibeli **DILARANG KERAS** untuk dipajang di etalase toko atau dijual kembali ke konsumen akhir.
   - **Skema Moda/Kas (Cash Source)**: Transaksi pembelian emas bisa diproses menggunakan kas uang laci harian toko, **ATAU** hasil jual dari pengepul emas.
   - **Skema Penyimpanan (Lifecycle)**: Emas bisa (a) langsung dijual ke pengepul, atau (b) disimpan sementara untuk dijual di hari lain manakala harga pengepul menguntungkan.

**Konsekuensi Siklus Pengembangan (Fase 2 & Fase 3)**:
- Pada **Fase 2 (Gold Module)**, Database Dexie harus dirombak agar bisa mencatat siklus lengkap: `Beli -> Simpan -> Jual Ke Pengepul`. Penggunaan aliran nilai uang *masuk dan keluar* harus dilacak persis mengikuti kas yang diizinkan (kas toko vs. kas emas/pengepul).
- Pada **Fase 3 (SKU Generator)**, pembuatan UI input perhiasan imitasi wajib berbentuk *wizard dropdown* yang mengunci parameter berdasarkan daftar Merek dan Kategori di atas agar struktur ID/SKU tidak berantakan.

**Alternatif Ditolak**:
- Menyatukan sistem kasir Emas Eceran. (Ditolak mutlak karena status toko bukan toko perhiasan emas murni; emas hanya untuk sistem "Buy and Dump" ke pengepul).

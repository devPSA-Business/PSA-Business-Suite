PSA Business Suite

Aplikasi Point of Sale (POS) kelas Enterprise yang dirancang khusus untuk toko perhiasan imitasi dan layanan buyback emas. Dibangun dengan arsitektur Offline-First untuk memastikan operasional toko tetap berjalan meski koneksi internet terputus.

---

Deskripsi Proyek
PSA Business Suite adalah sistem POS modern untuk usaha perhiasan imitasi dengan fitur inventaris, layanan reparasi, buyback emas, manajemen shift kasir, dan analitik bisnis. Proyek ini telah melewati pengujian end-to-end dan siap untuk deployment produksi.

---

Fitur Utama
- Offline-First Architecture: Transaksi dan operasi tetap berjalan tanpa internet; sinkronisasi otomatis saat koneksi kembali.  
- Manajemen Inventaris: Pelacakan stok real-time; dukungan barcode; atribut produk terstruktur (bahan, ukuran, finishing, target pengguna, occasion).  
- Manajemen Shift Kasir: Pembukaan/penutupan shift; pencatatan saldo awal dan akhir; audit trail.  
- Modul Reparasi & Buyback: Alur kerja layanan reparasi; prosedur buyback emas terpisah dengan verifikasi kepemilikan.  
- Laporan & Analitik: Dasbor real-time untuk omzet, laba kotor, margin, dan KPI operasional.  
- Audit Trail: Pencatatan aktivitas pengguna yang tidak dapat dimanipulasi.  
- PWA: Dapat diinstal di tablet/desktop seperti aplikasi native; dukungan update in-app.  
- Keamanan Data: Transaksi atomik lokal; antrean sinkronisasi; strict typing TypeScript.

---

Teknologi
- Frontend: React 19, TypeScript, Vite  
- State Management: Zustand  
- Routing: TanStack Router  
- Styling: Tailwind CSS v4  
- Local DB: Dexie.js (IndexedDB wrapper)  
- Cloud DB: Firebase Firestore  
- PWA: vite-plugin-pwa

---

Persyaratan Sistem
- Node.js LTS (disarankan versi terbaru LTS)  
- NPM atau PNPM/Yarn sesuai preferensi tim  
- Akun Firebase untuk sinkronisasi cloud (opsional untuk mode offline-only)

---

Instalasi & Menjalankan

Development
`bash
git clone <REPO_URL>
cd PSA-Business-Suite
npm install
npm run dev
`

Build Production
`bash
npm run build

hasil build ada di folder dist/
`

Menjalankan di Mode Production (Static Server)
`bash
npm run build
npx serve dist
`

---

Konfigurasi Firebase
1. Buat proyek di Firebase Console.  
2. Tambahkan aplikasi web, salin konfigurasi.  
3. Buka src/shared/api/firebase.ts dan ganti firebaseConfig:
`ts
const firebaseConfig = {
  apiKey: "APIKEYANDA",
  authDomain: "DOMAIN_ANDA.firebaseapp.com",
  projectId: "PROJECTIDANDA",
  storageBucket: "BUCKET_ANDA.appspot.com",
  messagingSenderId: "SENDERIDANDA",
  appId: "APPIDANDA"
};
`
4. Pastikan aturan Firestore dan Storage disesuaikan untuk keamanan produksi.  
5. Konfigurasi environment variables jika diperlukan (contoh: .env.production).

---

Instalasi PWA di Tablet Kasir
1. Akses aplikasi melalui browser (disarankan Chrome) pada tablet.  
2. Pastikan menggunakan HTTPS (atau localhost untuk development).  
3. Klik tombol Install App di pojok kanan atas aplikasi.  
4. Ikuti instruksi browser; aplikasi akan muncul di home screen.  
5. Untuk pembaruan, klik tombol Update Tersedia! saat muncul.

---

Arsitektur & Alur Modul (Ringkas)
- Frontend (PWA) ↔ Local DB (Dexie) ↔ Sync Queue ↔ Cloud (Firestore)  
- Modul utama: Inventaris, Reparasi, Shift, Buyback, Laporan, Pengguna.  
- Semua operasi lokal dibungkus transaksi atomik; perubahan dicatat di audit trail.

---

Panduan Penggunaan Aplikasi (Alur Halaman Utama)
- Login → Halaman Beranda (notifikasi, ringkasan harian)  
- Front Line: POS transaksi, scan barcode, layanan reparasi, input buyback (verifikasi owner)  
- Back Office: Validasi transaksi, manajemen produk, manajemen stok, manajemen user  
- Eksekutif Dashboard: KPI, laporan penjualan, analitik margin, rekomendasi strategi  
- Settings: Konfigurasi bisnis, konfigurasi sinkronisasi, manajemen role & permission

---

Panduan AI-Assisted Development
1. Buka AGENTS.md di root proyek.  
2. Navigasi ke ### ⚠️ CURRENT TASK: dan tulis deskripsi tugas singkat.  
3. Ikuti aturan arsitektur yang tercantum di AGENTS.md sebelum menjalankan agen AI.  
4. Semua perubahan yang dihasilkan agen harus ditinjau manual dan diuji end-to-end.

---

Keamanan, Kepatuhan, dan Kebijakan Buyback
- Label Bahan: Dilarang klaim logam mulia tanpa keterangan lapis; gunakan istilah Lapis Emas atau Imitasi.  
- Prosedur Buyback: Verifikasi kepemilikan oleh owner; transaksi dilakukan di lokasi toko; emas yang dibeli tidak dipajang sebagai stok perhiasan.  
- Audit & Logging: Semua tindakan pengguna dicatat; akses sensitif dibatasi berdasarkan role.  
- Backup & Recovery: Sinkronisasi cloud + backup berkala; antrean sinkronisasi untuk pemulihan saat koneksi pulih.

---

Kualitas Kode & Praktik Pengembangan
- Gunakan TypeScript ketat; hindari any.  
- Ikuti prinsip Clean Architecture untuk modul inti.  
- Tulis unit test untuk logika bisnis kritis; lakukan end-to-end test untuk alur transaksi.  
- Gunakan linting dan pre-commit hooks untuk konsistensi kode.

---

Kontribusi
- Ikuti standar branching: main untuk produksi, develop untuk integrasi, feature branch feature/<nama>.  
- Buat PR dengan deskripsi jelas, checklist testing, dan link issue terkait.  
- Semua PR harus melewati code review dan pipeline CI sebelum merge.

---

Status Proyek
SIAP PRODUKSI — Modul utama telah dimigrasikan ke Clean Architecture dan lulus pengujian end-to-end.

---

Lisensi & Kepemilikan
Proyek ini dikembangkan untuk kebutuhan internal PSA Jewellery. Penggunaan ulang atau distribusi memerlukan izin pemilik proyek.
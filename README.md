`

PSA Business Suite

Aplikasi Point of Sale (POS) kelas Enterprise yang dirancang khusus untuk toko perhiasan imitasi dan layanan buyback emas. Dibangun dengan arsitektur Offline-First, memastikan operasional toko tetap berjalan lancar meskipun koneksi internet terputus.

---

📌 Deskripsi Proyek
PSA Business Suite adalah sistem POS modern untuk usaha perhiasan imitasi dengan fitur inventaris, layanan reparasi, buyback emas, dan analitik bisnis.  
Proyek ini telah melewati pengujian end-to-end dan siap digunakan di lingkungan produksi.

---

✨ Fitur Utama
- Offline-First Architecture: Transaksi tetap berjalan tanpa internet, sinkronisasi otomatis saat koneksi kembali.
- Manajemen Inventaris: Pelacakan stok real-time dengan dukungan barcode.
- Manajemen Shift Kasir: Pembukaan/penutupan shift dengan pencatatan saldo awal dan akhir.
- Modul Reparasi & Buyback: Alur kerja khusus untuk layanan reparasi dan pembelian kembali emas.
- Laporan Keuangan Real-time: Dasbor analitik untuk omzet, laba kotor, margin keuntungan.
- Audit Trail: Pencatatan aktivitas pengguna yang tidak dapat dimanipulasi.
- Progressive Web App (PWA): Dapat diinstal di tablet/desktop seperti aplikasi native.

---

🛠️ Teknologi yang Digunakan
- Frontend: React 19, TypeScript, Vite  
- State Management: Zustand  
- Routing: TanStack Router  
- Styling: Tailwind CSS v4  
- Local Database: Dexie.js (IndexedDB wrapper)  
- Cloud Database: Firebase Firestore  
- PWA: vite-plugin-pwa  

---

🚀 Instalasi & Menjalankan Aplikasi

Mode Development
1. Pastikan Node.js sudah terinstal.  
2. Instal dependensi:
   `bash
   npm install
   `
3. Jalankan development server:
   `bash
   npm run dev
   `

Build Production
Untuk menghasilkan build siap produksi:
`bash
npm run build
`
Output akan tersedia di folder dist/.

---

📱 Instalasi PWA di Tablet Kasir
1. Buka aplikasi melalui browser (disarankan Google Chrome) di tablet kasir.  
2. Pastikan akses menggunakan protokol HTTPS (atau localhost untuk development).  
3. Klik tombol Install App di pojok kanan atas.  
4. Ikuti instruksi browser, aplikasi akan muncul di home screen tablet.  
5. Pembaruan Otomatis: Jika ada update, tombol Update Tersedia! akan muncul. Klik untuk memuat versi terbaru.

---

🔧 Konfigurasi Firebase
1. Buat proyek di Firebase Console.  
2. Tambahkan aplikasi web ke proyek.  
3. Salin konfigurasi Firebase.  
4. Buka file src/shared/api/firebase.ts dan ganti objek firebaseConfig:
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

---

🔒 Keamanan & Integritas Data
- Atomic Transactions: Semua operasi database lokal dibungkus transaksi Dexie.  
- Sync Queue: Data gagal sinkronisasi akan masuk antrean dan dicoba ulang otomatis.  
- Strict Typing: TypeScript ketat (tanpa any) untuk meminimalisir runtime error.  

---

🤖 Panduan AI-Assisted Development
Proyek ini terintegrasi dengan AI Studio untuk pengembangan berbantuan AI.  
Ikuti protokol berikut:
1. Buka file AGENTS.md di root proyek.  
2. Navigasi ke bagian paling bawah: ### ⚠️ CURRENT TASK:  
3. Tuliskan deskripsi tugas yang ingin dikerjakan (contoh: Tambahkan fitur pelaporan X).  
4. Sistem AI akan membaca aturan arsitektur bisnis dari AGENTS.md dan mengerjakan sesuai standar Enterprise PSA Business Suite.  

---

📊 Status Proyek
SIAP PRODUKSI  
Seluruh modul utama (Inventaris, Layanan/Reparasi, Shift, Buyback) telah dimigrasikan ke Clean Architecture dan lolos pengujian end-to-end.

---

🗂️ Struktur Halaman Aplikasi
- Halaman Awal/Login: Sambutan, notifikasi, informasi penting.  
- Front Line (Aktivitas Harian): Transaksi penjualan, layanan reparasi, buyback emas.  
- Back Office (Validasi Data): Pengelolaan inventaris, verifikasi transaksi, laporan internal.  
- Dashboard Eksekutif: Analitik, evaluasi kinerja, rekomendasi strategi bisnis.  
- Settings/Configuration: Pengaturan bisnis, aplikasi, dan preferensi pengguna.  

---

👤 Kontribusi
- Dokumentasi tambahan tersedia di file AGENTS.md.  
- Pull Request harus mengikuti standar arsitektur Offline-First dan Enterprise PSA.  
- Audit trail wajib diaktifkan untuk setiap modul baru.

---

📄 Lisensi
Proyek ini dikembangkan untuk kebutuhan internal PSA Jewellery.  
Distribusi atau penggunaan ulang harus mendapat izin dari pemilik proyek.
`
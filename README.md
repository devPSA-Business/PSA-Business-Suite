# PSA Business Suite

Aplikasi Point of Sale (POS) kelas Enterprise yang dirancang khusus untuk toko perhiasan. Aplikasi ini dibangun dengan arsitektur **Offline-First**, memastikan operasional toko tetap berjalan lancar meskipun koneksi internet terputus.

## Status Proyek: SIAP PRODUKSI

Seluruh modul utama (Inventaris, Layanan/Reparasi, Shift, Emas) telah berhasil dimigrasikan ke **Clean Architecture**. Sistem telah melewati pengujian menyeluruh (*end-to-end stress test*) dan siap untuk *deployment* ke lingkungan produksi.

## Fitur Utama

- **Offline-First Architecture**: Transaksi dan operasional tetap berjalan tanpa internet. Data akan disinkronisasi ke *cloud* secara otomatis saat koneksi kembali stabil.
- **Manajemen Inventaris**: Pelacakan stok perhiasan secara *real-time* dengan dukungan *barcode*.
- **Manajemen Shift Kasir**: Pembukaan dan penutupan *shift* dengan pencatatan saldo awal dan akhir yang ketat.
- **Modul Reparasi & Buyback**: Alur kerja khusus untuk layanan reparasi dan pembelian kembali perhiasan dari pelanggan.
- **Laporan Keuangan Real-time**: Dasbor analitik untuk memantau omzet, laba kotor, dan margin keuntungan.
- **Audit Trail**: Pencatatan setiap aktivitas pengguna yang tidak dapat dimanipulasi untuk keamanan dan transparansi.
- **Progressive Web App (PWA)**: Dapat diinstal langsung ke perangkat (tablet/desktop) seperti aplikasi *native*.

## Teknologi yang Digunakan

- **Frontend**: React 19, TypeScript, Vite
- **State Management**: Zustand
- **Routing**: TanStack Router
- **Styling**: Tailwind CSS v4
- **Local Database**: Dexie.js (IndexedDB wrapper)
- **Cloud Database**: Firebase Firestore
- **PWA**: vite-plugin-pwa

## Cara Menjalankan Aplikasi

### Mode Development

1. Pastikan Node.js sudah terinstal.
2. Instal dependensi:
   ```bash
   npm install
   ```
3. Jalankan *development server*:
   ```bash
   npm run dev
   ```

### Build Production

Untuk menghasilkan *build* yang siap di-*deploy* ke *production*:

```bash
npm run build
```

Perintah ini akan mengkompilasi kode TypeScript dan mem-bundle aset ke dalam folder `dist/`.

## Cara Menginstal PWA di Tablet Kasir

Aplikasi ini mendukung PWA (Progressive Web App), sehingga dapat diinstal di tablet kasir untuk pengalaman penggunaan yang lebih baik (layar penuh, akses *offline*).

1. Buka aplikasi melalui *browser* (disarankan Google Chrome) di tablet kasir.
2. Pastikan Anda mengakses aplikasi menggunakan protokol HTTPS (atau `localhost` untuk *development*).
3. Klik tombol **"Install App"** yang terdapat di pojok kanan atas layar aplikasi (di sebelah indikator status sinkronisasi).
4. Ikuti instruksi dari browser untuk menginstal aplikasi.
5. Setelah terinstal, aplikasi akan muncul di *home screen* tablet dan dapat dibuka seperti aplikasi biasa tanpa perlu membuka browser.
6. **Pembaruan Otomatis**: Jika ada pembaruan aplikasi, tombol "Update Tersedia! Klik untuk Memperbarui" akan muncul di pojok kanan atas. Klik tombol tersebut untuk memuat ulang aplikasi dengan versi terbaru.

## Konfigurasi Firebase

Untuk mengaktifkan sinkronisasi *cloud*, Anda perlu mengonfigurasi Firebase:

1. Buat proyek Firebase di [Firebase Console](https://console.firebase.google.com/).
2. Tambahkan aplikasi web ke proyek Anda.
3. Salin konfigurasi Firebase yang diberikan.
4. Buka file `src/shared/api/firebase.ts`.
5. Ganti objek `firebaseConfig` dengan konfigurasi asli dari proyek Firebase Anda.

```typescript
const firebaseConfig = {
  apiKey: "API_KEY_ANDA",
  authDomain: "DOMAIN_ANDA.firebaseapp.com",
  projectId: "PROJECT_ID_ANDA",
  storageBucket: "BUCKET_ANDA.appspot.com",
  messagingSenderId: "SENDER_ID_ANDA",
  appId: "APP_ID_ANDA"
};
```

## Keamanan & Integritas Data

- **Atomic Transactions**: Semua operasi database lokal dibungkus dalam transaksi Dexie untuk mencegah data korup.
- **Sync Queue**: Data yang gagal disinkronisasi ke *cloud* akan masuk ke antrean dan dicoba kembali secara otomatis.
- **Strict Typing**: Menggunakan TypeScript secara ketat (tanpa `any`) untuk meminimalisir *runtime error*.

## Panduan AI-Assisted Development (Antigravity/Gemini)

Proyek ini telah dikonfigurasi dengan *System Instructions* khusus untuk mencegah *over-engineering* dan menjaga keselarasan filosofi *Offline-First*. 

Setiap kali Anda menggunakan AI Studio atau agen pemrograman AI untuk melanjutkan pengembangan, **selalu ikuti protokol berikut**:
1. Buka file `AGENTS.md` di *root* proyek.
2. Navigasi ke bagian paling bawah: `### ⚠️ CURRENT TASK:`.
3. Tuliskan deskripsi tugas yang ingin Anda kerjakan di bagian tersebut (misal: "Tambahkan fitur pelaporan X").
4. Sistem AI secara otomatis akan membaca aturan ketat arsitektur bisnis dari `AGENTS.md` dan mengerjakannya sesuai standar *Enterprise* PSA Business Suite.

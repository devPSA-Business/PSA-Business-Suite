# OPERATIONAL HANDBOOK (MANAJER & FOUNDER)

Panduan kritis pengelolaan PSA Business Suite untuk meminimalkan ketergantungan IT.

## 1. STRATEGI BACKUP & PEMULIHAN
- **Prinsip:** Data Anda tersimpan di dalam memori browser perangkat ini. Jika browser di-reset atau perangkat rusak, data bisa hilang.
- **Tindakan:** Setiap hari Sabtu, masuk ke **Settings > Backup Lokal (Terenkripsi)**.
- **Keamanan:** File `.psa` yang dihasilkan dilindungi sandi. Simpan file ini di Google Drive atau Flash Drive terpisah.

## 2. OTORISASI & DISKON
- **Transaksi Rp 0:** Diblokir untuk barang fisik demi keamanan stok. Jika harus memberikan "bonus" fisik, Manajer wajib memasukkan PIN otorisasi saat checkout.
- **Diskon > 30%:** Akan memicu permintaan otorisasi otomatis. Pastikan Manajer hadir di meja kasir saat kasir meminta diskon besar.

## 3. PENANGANAN MASALAH (TROUBLESHOOTING)
- **Aplikasi "Freeze":** Refresh halaman (F5). Karena fitur *Offline-First*, data keranjang yang sedang diinput tidak akan hilang.
- **Printer Tidak Konek:** Pastikan browser diizinkan mengakses USB. Cek Menu **Settings > Printer Configuration**. Jika gagal, gunakan fitur "Download PDF Struk" dan cetak manual.
- **Data Tidak Masuk ke Cloud:** Selama status icon awan merah, teruskan jualan. Aplikasi akan mengirimkan data secara otomatis saat internet kembali stabil. **JANGAN HAPUS CACHE BROWSER** saat data belum tersinkron.

## 4. INTEGRITAS DATA
- **Audit Log:** Jangan pernah membagikan PIN Anda. Setiap tindakan sensitif terekam dengan cap waktu dan nama pengotorisasi.
- **Pruning Otomatis:** Sistem akan menghapus log lama (>90 hari) secara otomatis untuk menjaga kecepatan aplikasi, namun **Data Transaksi** tidak akan pernah dihapus demi kepentingan Buyback.

---
*Sistem ini dirancang untuk kemandirian penuh pemilik bisnis.*

## 5. MITIGASI PENGHAPUSAN DATA OLEH BROWSER (INDEXEDDB EVICTION)
- **Risiko:** Browser (terutama iOS Safari) dapat menghapus data lokal secara sepihak jika memori perangkat penuh.
- **Pencegahan:** 
  1. Pastikan memori tablet/HP kasir selalu memiliki sisa ruang kosong minimal 2GB.
  2. Lakukan **Backup Lokal Terenkripsi** setiap hari saat tutup toko.
  3. Pastikan aplikasi selalu terhubung ke internet minimal sekali sehari agar data tersinkronisasi ke Cloud.
- **Pemulihan:** Jika data terhapus, gunakan fitur "Pulihkan dari Backup Aman" di halaman Pengaturan Sistem menggunakan file `.psa` terbaru.

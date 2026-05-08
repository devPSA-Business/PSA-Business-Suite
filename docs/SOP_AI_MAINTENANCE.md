# SOP PEMELIHARAAN IT OTONOM (HUMAN-IN-THE-LOOP)
**Dokumen Khusus Owner / Founder**
**Sistem:** PSA Business Suite v1.4+

## 1. KONSEP DASAR
Aplikasi PSA Business Suite Anda dikelola oleh AI dan sistem otomatis (Bot). Sistem ini bekerja 24/7 memantau kesehatan aplikasi, memori, dan keamanan data. Namun, **Sistem TIDAK AKAN mengambil tindakan yang berisiko mengubah data atau tampilan tanpa persetujuan Anda.**

## 2. TIGA ATURAN EMAS (GOLDEN RULES) SISTEM AI
1. **Zero-Surprise (Tanpa Kejutan):** AI tidak akan pernah merilis pembaruan ke tablet kasir secara diam-diam. Semua harus melalui persetujuan Anda.
2. **Auto-Rollback (Mundur Otomatis):** Jika Anda menyetujui sebuah perbaikan, namun dalam 5 menit sistem mendeteksi aplikasi kasir menjadi *error*, sistem otomatis membatalkan perbaikan tersebut ke versi sebelumnya.
3. **Bahasa Manusia:** AI dilarang menggunakan bahasa pemrograman/teknis saat melaporkan masalah kepada Anda.

## 3. CARA MERESPONS NOTIFIKASI TELEGRAM
Jika terjadi anomali (misal: memori penuh, data gagal sinkron), Bot Telegram `HealthGuardian` akan mengirimkan pesan dengan format:
- **Untuk Apa Ini?** (Akar masalah)
- **Dampak Positif & Negatif** (Trade-off)
- **Risiko Jika "IYA" vs "TIDAK"**

**Tindakan Anda:**
Baca risiko yang tertera. Jika Anda setuju dengan tindakan mitigasi, buka aplikasi PSA Business Suite Anda, masuk ke menu **Pengaturan Sistem** atau **Status Sinkronisasi**, dan tekan tombol aksi yang disarankan oleh Bot (misal: *Bersihkan Data Lokal* atau *Paksa Sinkronisasi*).

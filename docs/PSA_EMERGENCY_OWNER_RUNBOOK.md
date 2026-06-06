# PSA EMERGENCY OWNER RUNBOOK
**Versi:** 1.0.0 | **Diperbarui:** 2026-06-06  
**Target Pembaca:** Owner/Kasir (tanpa pengetahuan teknis)  
**Bahasa:** Indonesia  

> Simpan dokumen ini di tempat mudah dijangkau.  
> Cetak dan tempel di dekat komputer kasir.

---

## CARA PAKAI DOKUMEN INI

1. Lihat layar aplikasi — ada pesan apa?
2. Cari pesan serupa di daftar di bawah
3. Ikuti langkah-langkahnya satu per satu
4. Jika tidak berhasil → hubungi bantuan teknis

---

## 🔴 SITUASI 1: LAYAR MERAH — "SISTEM TERKUNCI PERMANEN"

**Tampilan:** Layar merah/oranye, teks "Sistem Terkunci", tidak bisa ketuk apapun

**Penyebab:** PIN salah dimasukkan 10 kali. Ini perlindungan keamanan otomatis.

**Langkah:**
1. Jangan panik — data tidak hilang, hanya terkunci
2. Ambil **Recovery Key** Anda (kertas yang disimpan saat setup awal, atau dari Bitwarden jika sudah disetup)
3. Buka aplikasi di perangkat lain (HP/laptop)
4. Di layar terkunci, cari tombol **"Pemulihan Darurat"** atau **"Recovery"**
5. Masukkan Recovery Key (32 karakter huruf dan angka)
6. Sistem akan terbuka — segera ganti PIN setelahnya
7. Jika Recovery Key tidak ada → hubungi bantuan teknis segera (**data mungkin tidak bisa dipulihkan**)

---

## 🔴 SITUASI 2: NOTIFIKASI "RANTAI AUDIT RUSAK" / "HASH CHAIN BREACH"

**Tampilan:** Pesan peringatan dari Telegram atau dalam aplikasi tentang "audit trail breach" atau "hash chain"

**Penyebab:** Sistem mendeteksi kemungkinan manipulasi data transaksi

**Langkah:**
1. **Jangan tutup aplikasi**
2. **Screenshot pesan tersebut** (untuk dokumentasi)
3. Catat jam dan tanggal kejadian
4. Hentikan transaksi sementara
5. Hubungi bantuan teknis — kirim screenshot
6. Jangan hapus atau ubah data apapun sampai diperiksa

> ⚠️ Ini bisa berarti ada yang mencoba memanipulasi data, atau kerusakan teknis. Perlu investigasi.

---

## 🟠 SITUASI 3: LAYAR BIRU/ABU — "SINKRONISASI GAGAL" / "SYNC ERROR"

**Tampilan:** Ikon cloud dengan tanda silang merah, pesan "Sync gagal" atau angka antrian besar

**Penyebab:** Tidak ada koneksi internet, atau masalah server

**Langkah:**
1. Cek koneksi internet (buka browser, coba buka Google)
2. Jika internet mati → **tidak perlu panik**, aplikasi tetap berjalan offline
3. Data tersimpan di perangkat dan akan otomatis terkirim saat internet kembali
4. Jika internet ada tapi masih error: tutup dan buka ulang aplikasi
5. Tunggu 15 menit — sistem otomatis mencoba ulang
6. Jika 2 jam masih error → hubungi bantuan teknis

---

## 🟠 SITUASI 4: TIDAK BISA BUKA APLIKASI / LAYAR KOSONG / CRASH

**Tampilan:** Layar putih/kosong, loading terus, atau langsung keluar

**Langkah:**
1. Tutup browser/tab sepenuhnya
2. Buka lagi (ketik alamat aplikasi di browser baru)
3. Jika masih tidak bisa: restart perangkat (HP/komputer)
4. Coba buka dari perangkat lain
5. Cek apakah ada pemberitahuan dari Telegram tentang masalah sistem
6. Jika semua gagal → hubungi bantuan teknis

> **Penting:** Data tidak akan hilang — tersimpan di perangkat dan di cloud.

---

## 🟡 SITUASI 5: LUPA PIN

**Tampilan:** Tidak bisa masuk karena lupa PIN (belum 10 kali salah)

**Langkah:**
1. Di layar PIN, cari link **"Lupa PIN?"** atau **"Gunakan Recovery Key"**
2. Masukkan Recovery Key (32 karakter dari kertas/Bitwarden)
3. Ikuti instruksi untuk buat PIN baru
4. Jika Recovery Key juga tidak ada → hubungi bantuan teknis

---

## 🟡 SITUASI 6: DATA STOK/TRANSAKSI TIDAK MUNCUL

**Tampilan:** Halaman stok kosong, riwayat transaksi kosong, padahal kemarin ada

**Langkah:**
1. Tunggu 30 detik — mungkin sedang loading
2. Coba refresh halaman (tombol F5 atau tarik ke bawah di HP)
3. Cek status shift — apakah shift sudah dibuka hari ini?
4. Coba logout dan login ulang
5. Jika masih kosong → **jangan panik**, cek koneksi internet
6. Data mungkin perlu sinkronisasi dari cloud — pastikan internet tersambung

---

## 📞 KONTAK DARURAT

| Situasi | Kontak |
|---------|--------|
| Nuclear Lockout tanpa Recovery Key | Bantuan Teknis — [isi nomor WA] |
| Hash Chain Breach | Bantuan Teknis — [isi nomor WA] |
| Data hilang permanen | Bantuan Teknis — [isi nomor WA] |
| Masalah lain | Bantuan Teknis — [isi nomor WA] |

> Saat menghubungi: screenshot pesan error, sebutkan jam kejadian, dan jangan matikan perangkat

---

## 🔑 INFORMASI PENTING YANG HARUS SELALU TERSEDIA

| Item | Lokasi Penyimpanan |
|------|-------------------|
| Recovery Key (32 karakter) | Kertas di [lokasi aman] + Bitwarden |
| PIN Aplikasi | Ingat, atau Bitwarden |
| Alamat URL Aplikasi | [isi URL aplikasi] |
| Login Email Firebase | [isi email] + Password Manager |

---

*Dokumen ini diperbarui oleh tim teknis. Versi terbaru selalu di folder `docs/` di repository.*

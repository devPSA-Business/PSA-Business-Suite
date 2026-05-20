# Runbook: Pemulihan Kriptografi PSA Business Suite

**Dokumen:** `docs/runbook-crypto-recovery.md`
**Klasifikasi:** SANGAT RAHASIA — SIMPAN FISIK, JANGAN SIMPAN DI CLOUD
**Versi:** 1.0.0
**Tanggal:** 2026-05-20
**@ai_context:** Panduan pemulihan kriptografi darurat untuk owner PSA Business Suite
**@security_tier:** CRITICAL
**@business_rule:** Dokumen ini WAJIB dicetak dan disimpan di tempat aman fisik (brankas/laci terkunci).
                   TIDAK BOLEH difoto, di-screenshot, atau disimpan di Google Drive/WhatsApp.

---

## ⚠️ PERINGATAN KRITIS

Kehilangan informasi di dokumen ini berarti **DATA TIDAK DAPAT DIPULIHKAN SELAMANYA**.
Tidak ada pihak lain yang dapat membantu — bahkan developer sekalipun.

---

## 1. Apa yang Perlu Di-backup?

PSA Business Suite menggunakan **3 lapisan keamanan** yang saling terhubung:

| Lapisan | Nama | Fungsi | Akibat Hilang |
|---------|------|--------|--------------|
| L1 | `VITE_CRYPTO_PEPPER` | Salt tambahan untuk PBKDF2 key derivation | Database terenkripsi tidak dapat dibuka |
| L2 | **Recovery Key** | Membuka database jika PIN lupa | Tidak bisa recovery jika PIN terlupa |
| L3 | **PIN Pengguna** | Autentikasi harian kasir | Bisa direset dengan L2 |

---

## 2. Backup VITE_CRYPTO_PEPPER

### Cara Mendapatkan Nilai Pepper Saat Ini

1. Buka GitHub repository PSA Business Suite
2. Masuk ke `Settings → Secrets and Variables → Actions`
3. Cari secret bernama `VITE_CRYPTO_PEPPER`
4. **CATAT NILAINYA DI SINI:**

```
VITE_CRYPTO_PEPPER = ________________________________
                     (isi manual dengan ballpoint, bukan pensil)
```

### Aturan Backup Pepper

- ✅ Tulis tangan di kertas, simpan di brankas
- ✅ Buat 2 salinan, simpan di 2 lokasi berbeda
- ❌ JANGAN foto dengan HP
- ❌ JANGAN kirim via WhatsApp / Telegram
- ❌ JANGAN simpan di Google Drive / email

### Jadwal Review Pepper

Verifikasi backup setiap **6 bulan sekali** atau setelah:
- Pergantian staf IT/developer
- Reset GitHub repository
- Regenerasi secret GitHub Actions

---

## 3. Recovery Key — Kunci Pemulihan PIN

Recovery Key adalah 24 kata acak (BIP-39 style) yang di-generate saat setup awal.
Key ini memungkinkan owner membuka database meskipun PIN kasir terlupa.

### Cara Generate Recovery Key (Saat Setup Awal / Reset)

1. Buka aplikasi PSA Business Suite
2. Login sebagai ADMIN
3. Masuk ke menu: **Pengaturan → Keamanan → Generate Recovery Key**
4. Sistem akan menampilkan 24 kata. **CATAT SEMUA KATA SESUAI URUTAN:**

```
Recovery Key Perangkat: _____________________________________________

Kata 1:  _______________  Kata 7:  _______________  Kata 13: _______________
Kata 2:  _______________  Kata 8:  _______________  Kata 14: _______________
Kata 3:  _______________  Kata 9:  _______________  Kata 15: _______________
Kata 4:  _______________  Kata 10: _______________  Kata 16: _______________
Kata 5:  _______________  Kata 11: _______________  Kata 17: _______________
Kata 6:  _______________  Kata 12: _______________  Kata 18: _______________

Kata 19: _______________  Kata 22: _______________
Kata 20: _______________  Kata 23: _______________
Kata 21: _______________  Kata 24: _______________

Tanggal Generate: _______________________________________________
Perangkat: _____________________________________________________
```

### Cara Menggunakan Recovery Key (Jika PIN Terlupa)

1. Di halaman login, pilih pengguna yang PIN-nya terlupa
2. Ketuk tombol **"Lupa PIN? Gunakan Recovery Key"**
3. Masukkan 24 kata Recovery Key sesuai urutan
4. Sistem akan membuka database dan meminta PIN baru
5. Set PIN baru, lalu simpan runbook ini dengan tanggal terbaru

---

## 4. Prosedur Darurat Kehilangan Semua Akses

Jika SEMUA lapisan keamanan hilang (Pepper + Recovery Key + PIN):

### Opsi A: Restore dari Backup Terenkripsi `.psa`

1. Cari file backup `.psa` terbaru (tersimpan di folder Downloads perangkat)
2. Di halaman onboarding awal, pilih **"Pulihkan dari Backup"**
3. Masukkan passphrase backup (berbeda dari PIN — catat di bawah)

```
Passphrase Backup: ______________________________________________
Tanggal Backup Terakhir: ________________________________________
Lokasi File Backup: _____________________________________________
```

### Opsi B: Sinkronisasi dari Cloud (Jika Firebase Aktif)

1. Login dengan akun Google yang terhubung ke Firebase
2. Lakukan setup ulang perangkat baru
3. Data akan disinkronisasi dari Firestore
4. ⚠️ Data lokal sejak sync terakhir akan hilang

### Opsi C: Reset Total (Pilihan Terakhir)

Gunakan tombol **"Darurat: Reset Database Lokal"** di halaman login.
- ⚠️ SEMUA DATA LOKAL AKAN TERHAPUS PERMANEN
- Hanya gunakan jika tidak ada backup sama sekali
- Laporkan ke developer untuk investigasi

---

## 5. Checklist Backup Rutin (Bulanan)

Dilakukan setiap **tanggal 1** setiap bulan oleh Owner:

- [ ] Export backup `.psa` dari menu Pengaturan → Backup
- [ ] Simpan file backup di folder khusus (beri nama tanggal)
- [ ] Verifikasi Recovery Key masih bisa dibaca di dokumen ini
- [ ] Pastikan nilai VITE_CRYPTO_PEPPER tercatat akurat
- [ ] Uji restore di perangkat kedua (setiap 3 bulan sekali)

---

## 6. Kontak Darurat

```
Developer PSA Business Suite
Repository: https://github.com/devPSA-Business/PSA-Business-Suite
Email: [isi email developer]
```

---

*Dokumen ini dibuat secara otomatis oleh PSA AI Engineer.*
*Terakhir diperbarui: 2026-05-20*
*Versi sistem: PSA Business Suite v1.4.0+*

# 🛡️ PSA Business Suite — Production Runbook

**Version:** 1.0.0 | **Audience:** Owner / Tim CS | **Update terakhir:** 2026-05-21  
**Kontak Darurat:** Telegram bot → Channel PSA Alerts

> **Filosofi:** Sistem ini dirancang untuk berjalan tanpa intervensi teknis harian.
> Runbook ini HANYA digunakan saat terjadi kejadian tidak normal.

---

## 📋 DAFTAR ISI

1. [Klasifikasi Insiden](#1-klasifikasi-insiden)
2. [Rollback — Kembali ke Versi Stabil](#2-rollback)
3. [Panduan CS — Respons Keluhan Pengguna](#3-panduan-cs)
4. [Monitoring & Alert](#4-monitoring--alert)
5. [Pemulihan Data (Disaster Recovery)](#5-disaster-recovery)
6. [Third-Party Failover](#6-third-party-failover)
7. [Eskalasi & Kontak](#7-eskalasi--kontak)

---

## 1. KLASIFIKASI INSIDEN

| Level | Definisi | Contoh | Respons |
|-------|----------|--------|---------|
| 🔴 **P0 — Kritikal** | Transaksi tidak bisa dilakukan | Kasir tidak bisa checkout | Rollback < 15 menit |
| 🟠 **P1 — Tinggi** | Fitur utama terganggu | Laporan tidak muncul, sync gagal | Fix < 2 jam |
| 🟡 **P2 — Sedang** | Fitur minor terganggu | Gold price tidak update, UI glitch | Fix < 1 hari |
| 🟢 **P3 — Rendah** | Kosmetik/UX | Tampilan tidak rapi di layar tertentu | Jadwalkan |

---

## 2. ROLLBACK

### A. Rollback Otomatis via GitHub (REKOMENDASI)

Setiap deploy produksi yang berhasil **otomatis membuat git tag** dengan format:
```
prod-YYYYMMDD-HHmm-<7-char-sha>
```

**Langkah rollback:**

1. Buka GitHub → Repository PSA Business Suite
2. Klik tab **"Actions"** → pilih workflow **"Deploy — Produksi Firebase Hosting"**
3. Klik tombol **"Run workflow"**
4. Pilih **tag** yang ingin di-restore (pilih tag sebelum masalah terjadi)
5. Klik **"Run workflow"** → tunggu 5-10 menit → aplikasi kembali ke versi lama

**List tag produksi (via terminal):**
```bash
git tag --list 'prod-*' --sort=-creatordate | head -10
```

### B. Rollback Manual via Firebase CLI (Jika GitHub Actions down)

```bash
# 1. Clone repo
git clone https://github.com/devPSA-Business/PSA-Business-Suite.git
cd PSA-Business-Suite

# 2. Checkout ke tag yang stabil
git checkout prod-20260521-XXXX-XXXXXXX

# 3. Build & deploy
npm ci
npm run build

# 4. Deploy ke Firebase (butuh FIREBASE_DEPLOY_TOKEN di .env.local)
npx firebase-tools deploy --only hosting --project psa-business-suite
```

### C. Estimasi Waktu Rollback

| Metode | Waktu | Syarat |
|--------|-------|--------|
| GitHub Actions (rekomendasi) | 5-10 menit | Akses GitHub |
| Firebase CLI manual | 15-20 menit | Node.js + Firebase CLI terinstall |

---

## 3. PANDUAN CS — RESPONS KELUHAN PENGGUNA

### Skenario A: "Aplikasi tidak bisa dibuka / blank screen"

**Apa yang harus ditanyakan kepada kasir:**
1. "Apakah ada update browser / tablet hari ini?"
2. "Coba buka di tab baru atau browser berbeda"
3. "Coba tekan Ctrl+Shift+R (atau Cmd+Shift+R di Mac) untuk hard refresh"

**Jika masih gagal:**
- Minta kasir screenshot halaman error (jika ada pesan error)
- Kirim screenshot ke owner via Telegram
- Tandai insiden sebagai P0 jika kasir tidak bisa transaksi

### Skenario B: "Stok berkurang sendiri / jumlah salah"

**Yang harus dilakukan owner:**
1. Jangan panic — data aman di IndexedDB lokal + Firestore backup
2. Buka **Audit Log** di aplikasi → cari transaksi mencurigakan
3. Verifikasi apakah ada kasir yang melakukan void/return tidak sengaja
4. Jika ada anomali → `Audit Log` → Export → Kirim ke owner untuk analisis

**Pesan ke kasir:**
> "Stok sedang diverifikasi. Jangan lakukan transaksi sampai ada konfirmasi dari owner."

### Skenario C: "Tidak bisa login / PIN salah"

1. Kasir mencoba PIN 5x gagal → sistem lock otomatis (by design, ini keamanan)
2. **Solusi 1 (Recovery Key):** Owner masukkan Recovery Key 24 kata di halaman Lock
3. **Solusi 2 (Owner reset PIN):** Owner masuk dengan akun admin → Settings → Reset PIN kasir
4. **Jika Recovery Key hilang:** Hubungi owner langsung — ini prosedur darurat (lihat `docs/runbook-crypto-recovery.md`)

### Skenario D: "Sync tidak jalan / data tidak update di cloud"

**Ini normal jika offline.** Jelaskan ke kasir:
> "Sistem bekerja offline. Data aman di perangkat. Saat internet kembali, sync otomatis berjalan."

Jika online tapi sync tetap gagal:
1. Buka aplikasi → Settings → cek status sync
2. Tunggu 5-10 menit untuk retry otomatis
3. Jika lebih dari 1 jam tetap gagal → eskalasi ke owner

### Skenario E: "Laporan keuangan tidak cocok"

1. Ini **tidak boleh terjadi** jika Decimal.js digunakan (audit sudah verifikasi)
2. Jika terjadi: screenshot perbedaan + tanggal transaksi bermasalah
3. Kirim ke owner → investigasi via Audit Log

---

## 4. MONITORING & ALERT

### Apa yang dimonitor secara otomatis:

| Monitor | Interval | Channel |
|---------|----------|---------|
| System Watchdog (fraud, sync DLQ, closure) | Setiap 6 jam | Telegram |
| Error fatal (FATAL level) | Real-time | Telegram |
| Deploy berhasil/gagal | Setiap deploy | Email + GitHub |
| Sentry (jika VITE_SENTRY_DSN dikonfigurasi) | Real-time | Sentry dashboard |

### Cara baca Telegram Alert:

```
🚨 [FATAL] PSA Business Suite
Domain: auth
Message: PIN verification failed 5 times — system locked
Timestamp: 2026-05-21T10:35:00Z
```

**Interpretasi:**
- `🚨 [FATAL]` = error serius, butuh perhatian
- `⚠️ [WARN]` = peringatan, pantau
- `ℹ️ [INFO]` = informasi normal (deploy berhasil, sync selesai, dll)

### Sentry Dashboard (jika aktif):

- URL: https://sentry.io/organizations/psa-jewellery/
- Login dengan akun owner
- Cek tab **"Issues"** untuk error terbaru
- Error dibatasi 5.000/bulan (free tier) — cukup untuk 1 toko

---

## 5. DISASTER RECOVERY

### Skenario: Tablet kasir rusak / hilang

**Data aman** karena semua transaksi sudah di-sync ke Firestore cloud.

**Langkah pemulihan:**
1. Siapkan tablet baru
2. Buka browser → akses `https://psa-business-suite.web.app`
3. Proses setup ulang: masukkan nama toko, PIN owner baru
4. **PENTING:** Recovery Key yang lama sudah tidak berlaku — generate Recovery Key baru setelah setup
5. Data cloud akan sync kembali ke tablet baru dalam beberapa menit

### Skenario: Recovery Key hilang

Baca panduan lengkap: [`docs/runbook-crypto-recovery.md`](runbook-crypto-recovery.md)

**Ringkasan singkat:**
- Recovery Key hilang = PIN tidak bisa di-reset via self-service
- Solusi darurat: Backup database manual (export IndexedDB) sebelum reset tablet
- Backup otomatis tersedia di: Settings → Backup → Download

### Skenario: Firestore down

Aplikasi **tetap berjalan 100%** karena Offline-First architecture.
- Semua transaksi tersimpan lokal (IndexedDB)
- SyncQueue akan retry otomatis saat Firestore kembali online
- Tidak perlu aksi dari kasir — beritahu saja bahwa cloud sync tertunda

---

## 6. THIRD-PARTY FAILOVER

| Layanan | Status Jika Down | Dampak ke Toko |
|---------|-----------------|----------------|
| **Firestore** | Offline-first — app tetap jalan | Sync tertunda, data aman lokal |
| **Firebase Auth** | Login baru tidak bisa | Kasir yang sudah login tetap bisa transaksi |
| **Gemini AI (NLQ)** | Fitur tanya-jawab AI mati | Kasir tidak bisa query natural language — semua fitur lain normal |
| **Cloudflare Worker (AI proxy)** | Sama dengan Gemini | Sama |
| **Gold Price API** | Harga emas tidak update otomatis | Input harga emas manual via Settings → Harga Emas |
| **Telegram Bot** | Alert tidak terkirim | Monitoring mati sementara — tidak mempengaruhi transaksi |
| **Firebase Hosting** | Aplikasi tidak bisa diakses via browser baru | Kasir yang sudah buka app tetap bisa (PWA cache) |

### Protokol saat layanan pihak ketiga down:

1. **Jangan restart tablet** — PWA cache memastikan app tetap bisa dipakai
2. Catat transaksi yang terjadi saat gangguan
3. Tunggu layanan pulih — sync akan berjalan otomatis
4. Jika > 4 jam masih gangguan: hubungi eskalasi

---

## 7. ESKALASI & KONTAK

| Prioritas | Jam | Kontak |
|-----------|-----|--------|
| P0 (sistem mati) | 24/7 | Owner langsung via WhatsApp |
| P1 (fitur utama terganggu) | Jam kerja | Owner via Telegram |
| P2/P3 (minor) | Jam kerja normal | Catat, jadwalkan |

### Untuk developer (saat diperlukan):

- Repository: `github.com/devPSA-Business/PSA-Business-Suite`
- Actions log: GitHub → Actions (untuk debug deploy)
- Firebase Console: `console.firebase.google.com` → project `psa-business-suite`
- Firestore data: Firebase Console → Firestore → cari collection `transactions`

---

## APPENDIX — Checklist Sebelum Deploy Produksi

Gunakan ini sebelum setiap rilis besar:

- [ ] `npm run lint` — zero error
- [ ] `npm run test` — semua test passed
- [ ] `npm run build` — build berhasil tanpa warning
- [ ] Manual test: login → transaksi → tutup shift → laporan
- [ ] Verifikasi `.env` / GitHub Secrets masih valid (tidak expired)
- [ ] Recovery Key masih tersimpan aman (fisik)
- [ ] Informasikan kasir jika ada perubahan UI signifikan

---

*PSA Business Suite Production Runbook v1.0.0*  
*Diperbarui: 2026-05-21 — Production Readiness Audit*

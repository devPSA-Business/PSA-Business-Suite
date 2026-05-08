# RUNBOOK: GLOBAL KILL-SWITCH PROTOCOL (PSA v1.4+)
# Status: SECURITY CRITICAL PROTOCOL (P0 MITIGATION)
# Otorisasi: CISO / OWNER ONLY

## 1. TUJUAN
Menghentikan seluruh akses baca/tulis ke Firestore secara global jika terjadi kebocoran kredensial atau eksfiltrasi data.

## 2. PRASYARAT
- [ ] gcloud CLI terinstal & terautentikasi ke project staging/prod.
- [ ] Backup rules saat ini sudah tersimpan di `scripts/backups/`.
- [ ] Webhook notifikasi Owner siap menerima payload.

## 3. LANGKAH EKSEKUSI (DRY-RUN)
Dilakukan di lingkungan staging untuk memverifikasi kesiapan.
1. `export PROJECT_ID=psa-staging`
2. `./scripts/INCIDENTKILLSWITCH.sh staging $PROJECT_ID` (Simulasi: cek log, jangan apply rules)
3. Verifikasi: Periksa `stdout` apakah skrip menunjuk ke file aturan deny yang benar.

## 4. LANGKAH EKSEKUSI (FULL APPLY)
Dilakukan pada saat insiden.
1. `export PROJECT_ID=psa-production`
2. `./scripts/INCIDENTKILLSWITCH.sh production $PROJECT_ID`
3. Webhook akan menerima payload "INITIATING GLOBAL FREEZE".
4. Verifikasi: Cobalah akses aplikasi kasir; aksi read/write harus gagal (Firebase Error).

## 5. LANGKAH ROLLBACK (PEMULIHAN)
Dilakukan setelah insiden terkendali & kunci diputar.
1. `gcloud firestore security-rules update --rules=scripts/backups/firestore-rules-backup-production-<TIMESTAMP>.json --project=$PROJECT_ID`
2. Verifikasi: Akses kasir pulih kembali.

### [⚠️ CATATAN SAFETY]
- Skrip tidak menghapus database, hanya memblokir akses aturan keamanan.
- Lakukan rotasi semua API Key dan Service Account setelah skrip dijalankan.

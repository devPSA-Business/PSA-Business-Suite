# PSA Business Suite — Panduan Setup (Owner)

> Dokumen ini adalah **satu-satunya sumber kebenaran** untuk setup infrastruktur.  
> Baca urut. Jangan lewati fase.

---

## Status Sistem Saat Ini

| Komponen | Status | URL / Catatan |
|---|---|---|
| Firebase Hosting (HTTPS) | ✅ Terkonfigurasi | https://psa-business-suite.web.app |
| Firebase Auth | ✅ Terkonfigurasi | Login email + PIN kasir |
| Firestore (database offline-sync) | ✅ Terkonfigurasi | Spark Plan — Rp 0/bulan |
| CI/CD GitHub Actions | ✅ Aktif | Auto-deploy saat push ke `main` |
| Preview Channel (lingkungan dev) | ✅ Aktif | URL otomatis per-PR, 7 hari |
| Gemini AI (tanya analitik) | 🟡 Perlu Cloudflare Worker | Lihat Fase 5 |
| Notifikasi Telegram | 🟡 Opsional | Lihat Fase 4 |
| APK Android | 🟡 Perlu Keystore | Lihat Fase 6 |
| **Total biaya** | **Rp 0/bulan** | Firebase Spark Plan |

---

## FASE 1 — Buat PAT (Token GitHub) yang Aman

> PAT dibutuhkan untuk workflow `bootstrap-secrets.yml` agar bisa auto-generate CRYPTO_PEPPER.

1. Buka: https://github.com/settings/personal-access-tokens/new
2. Isi form:
   - **Token name**: `PSA-Secrets-Write`
   - **Expiration**: 90 days
   - **Repository access**: `devPSA-Business/PSA-Business-Suite` (only this repo)
   - **Permissions**: `Secrets → Read & Write`, `Actions → Read & Write`
3. Klik **Generate token** → **copy nilainya sekarang** (hanya tampil sekali)
4. Simpan di password manager (bukan di chat atau notepad)

---

## FASE 2 — Set 10 Secrets Wajib di GitHub

Buka: https://github.com/devPSA-Business/PSA-Business-Suite/settings/secrets/actions  
Klik **New repository secret** untuk setiap baris.

### 2A. Firebase Core (6 secrets)

> Sumber: https://console.firebase.google.com → Project PSA → ⚙️ Project Settings → General → Your apps → tab Config

| Nama Secret | Contoh Nilai |
|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `psa-business-suite.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `psa-business-suite` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `psa-business-suite.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789012` |
| `VITE_FIREBASE_APP_ID` | `1:123456:web:abc123def456` |

### 2B. Firebase Service Account (2 secrets)

> Sumber: Firebase Console → ⚙️ Project Settings → Service accounts → **Generate new private key** → download file JSON

| Nama Secret | Nilai |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Seluruh isi file JSON yang didownload (copy-paste semua teks dari `{` sampai `}`) |
| `FIREBASE_PROJECT_ID` | Sama persis dengan `VITE_FIREBASE_PROJECT_ID` |

### 2C. Firebase Deploy Token (1 secret)

> Jalankan perintah ini di terminal HP/komputer kamu:

```bash
npx firebase-tools login:ci
```

Browser terbuka → Login Google → copy token yang muncul di terminal.

| Nama Secret | Nilai |
|---|---|
| `FIREBASE_DEPLOY_TOKEN` | Token panjang yang dimulai dengan `1//0a...` |

### 2D. PAT untuk Bootstrap (1 secret)

| Nama Secret | Nilai |
|---|---|
| `PAT_SECRETS_WRITE` | Token yang dibuat di Fase 1 |

---

## FASE 3 — Generate CRYPTO_PEPPER (Otomatis)

> CRYPTO_PEPPER adalah kunci keamanan untuk hash PIN kasir.  
> **Wajib di-generate via workflow** — nilainya tidak boleh dibuat manual.

1. Pastikan `PAT_SECRETS_WRITE` sudah diset (Fase 2D)
2. Buka: https://github.com/devPSA-Business/PSA-Business-Suite/actions/workflows/bootstrap-secrets.yml
3. Klik **Run workflow** → pilih `all-generated` → klik **Run workflow**
4. Tunggu ~30 detik → `VITE_CRYPTO_PEPPER` ter-set otomatis

> ⚠️ Jangan regenerate pepper setelah ada pengguna aktif. Semua PIN yang sudah dibuat akan tidak valid.

---

## FASE 4 — Setup Repository (Sekali)

> Mengatur branch protection, merge strategy, labels, dan Dependabot otomatis.

1. Buka: https://github.com/devPSA-Business/PSA-Business-Suite/actions/workflows/setup-repo-settings.yml
2. Klik **Run workflow** → ketik `YES` → klik **Run workflow**

Selesai. Tidak perlu diulangi kecuali ada reset repo.

---

## FASE 5 — Secrets Opsional (Tambahkan Bertahap)

Tambahkan setelah Fase 2–4 selesai. App tetap berjalan tanpa ini.

| Nama Secret | Untuk Apa | Cara Mendapat |
|---|---|---|
| `VITE_GEMINI_PROXY_URL` | Fitur tanya AI (NLQ) | Deploy Cloudflare Worker dulu (lihat `workers/gemini-proxy/README.md`) |
| `VITE_TELEGRAM_BOT_TOKEN` | Alert otomatis sistem | BotFather di Telegram → `/newbot` |
| `VITE_TELEGRAM_CHAT_ID` | Tujuan alert Telegram | `api.telegram.org/bot<TOKEN>/getUpdates` setelah kirim pesan ke bot |
| `VITE_RECAPTCHA_SITE_KEY` | Proteksi anti-bot | Google Cloud Console → reCAPTCHA Enterprise |
| `VITE_SENTRY_DSN` | Laporan error otomatis | sentry.io → New Project → DSN |
| `MAIL_USERNAME` | Email notifikasi CI/CD | Gmail yang ingin dipakai untuk kirim notif |
| `MAIL_PASSWORD` | Password Gmail App | Gmail → Akun Google → Keamanan → Sandi Aplikasi |

---

## FASE 6 — Deploy Pertama (Live URL)

Setelah Fase 2–3 selesai:

1. Buka: https://github.com/devPSA-Business/PSA-Business-Suite/actions/workflows/deploy.yml
2. Klik **Run workflow** → **Run workflow**
3. Tunggu ±5 menit
4. ✅ Live di: **https://psa-business-suite.web.app**

Atau push commit kecil ke `main` — deploy berjalan otomatis.

---

## FASE 7 — APK Android (Opsional)

> APK dibuat dari PWA yang sudah ada — tidak perlu rewrite kode.  
> Didistribusikan ke HP kamu dan pasangan via email (Firebase App Distribution).

### Generate Keystore (sekali seumur hidup)

```bash
keytool -genkey -v \
  -keystore psa.keystore \
  -alias psa-signing-key \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=PSA Jewellery,O=PSA,L=Sampit,ST=Kalteng,C=ID"

# Encode ke base64
base64 psa.keystore | tr -d '\n'
```

Simpan file `psa.keystore` di tempat aman (Google Drive terkunci, bukan di repo).

### Set 5 Secrets APK

| Nama Secret | Nilai |
|---|---|
| `KEYSTORE_BASE64` | Output perintah `base64 psa.keystore` |
| `KEYSTORE_PASSWORD` | Password yang dimasukkan saat `keytool -genkey` |
| `KEYSTORE_KEY_ALIAS` | `psa-signing-key` |
| `KEYSTORE_KEY_PASSWORD` | Sama dengan `KEYSTORE_PASSWORD` |
| `APK_TESTER_EMAILS` | Email kamu dan pasangan, pisah koma |

### Build APK

1. Buka: https://github.com/devPSA-Business/PSA-Business-Suite/actions/workflows/twa-build.yml
2. Klik **Run workflow** → isi catatan update → **Run workflow**
3. APK dikirim ke email yang ada di `APK_TESTER_EMAILS`

---

## Checklist Status Setup

```
[ ] FASE 1  — PAT baru dibuat & disimpan di password manager
[ ] FASE 2A — 6 secrets VITE_FIREBASE_* diset
[ ] FASE 2B — FIREBASE_SERVICE_ACCOUNT + FIREBASE_PROJECT_ID diset
[ ] FASE 2C — FIREBASE_DEPLOY_TOKEN diset
[ ] FASE 2D — PAT_SECRETS_WRITE diset
[ ] FASE 3  — Bootstrap workflow dijalankan (VITE_CRYPTO_PEPPER)
[ ] FASE 4  — setup-repo-settings.yml dijalankan
[ ] FASE 6  — Deploy pertama berhasil → https://psa-business-suite.web.app
[ ] FASE 7  — APK dibuat dan dikirim ke HP (opsional)
```

---

*Terakhir diupdate: 2026-05-19 | Dibuat oleh PSA AI Architect*

# 🚀 PSA Business Suite — Setup Guide (Owner)

> Panduan ini untuk menghidupkan proyek dari nol hingga live HTTPS.  
> Baca urut dari atas ke bawah.

---

## ✅ Status Arsitektur

| Komponen | Status | Biaya |
|---|---|---|
| Firebase Hosting (CDN + HTTPS) | ✅ Aktif | Rp 0 |
| Firestore (Database offline-sync) | ✅ Aktif | Rp 0 |
| Firebase Auth (Login) | ✅ Aktif | Rp 0 |
| Firebase Storage (Foto) | ✅ Aktif | Rp 0 |
| Gemini AI (NLQ/Tanya AI) | ✅ Client-side | Rp 0 (1500 req/hari gratis) |
| Telegram Alert (Notifikasi) | ✅ Client-side | Rp 0 |
| Cloud Functions | ❌ Dihapus | Butuh kartu kredit |
| Vercel | ❌ Dihapus | Butuh kartu kredit |

**Live URL:** `https://psa-business-suite.web.app`

---

## LANGKAH 1 — Set GitHub Secrets (Wajib)

### Cara Otomatis (Direkomendasikan)

1. Install GitHub CLI: https://cli.github.com/
2. Buka terminal, jalankan:
   ```bash
   cd PSA-Business-Suite
   bash scripts/setup-github-secrets.sh
   ```
3. Ikuti instruksi di layar — script akan tanya satu per satu

### Cara Manual (via Browser)

Buka: **https://github.com/devPSA-Business/PSA-Business-Suite/settings/secrets/actions**

#### 🔴 WAJIB ADA (deploy gagal tanpa ini)

| Secret | Sumber | Contoh Nilai |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → Your apps → Config | `AIzaSyXXXXX` |
| `VITE_FIREBASE_AUTH_DOMAIN` | (sama) | `psa-business-suite.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | (sama) | `psa-business-suite` |
| `VITE_FIREBASE_STORAGE_BUCKET` | (sama) | `psa-business-suite.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (sama) | `123456789012` |
| `VITE_FIREBASE_APP_ID` | (sama) | `1:123:web:abc` |
| `FIREBASE_PROJECT_ID` | Sama dengan `VITE_FIREBASE_PROJECT_ID` | `psa-business-suite` |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service Accounts → Generate new private key → isi seluruh isi file JSON | `{"type":"service_account",...}` |
| `FIREBASE_DEPLOY_TOKEN` | Jalankan `npx firebase-tools login:ci` di terminal | `1//0aXXXXX` |

#### 🟡 OPSIONAL (app jalan tanpa ini, fitur tertentu disabled)

| Secret | Sumber | Dampak jika kosong |
|---|---|---|
| `VITE_CRYPTO_PEPPER` | **Di-generate otomatis** via Langkah 2 | PIN hash tanpa pepper |
| `VITE_GEMINI_API_KEY` | https://aistudio.google.com/app/apikey | Fitur AI/NLQ tidak tersedia |
| `VITE_TELEGRAM_BOT_TOKEN` | BotFather Telegram → /newbot | Alert sistem tidak kirim |
| `VITE_TELEGRAM_CHAT_ID` | `api.telegram.org/bot<TOKEN>/getUpdates` | Alert sistem tidak kirim |
| `VITE_RECAPTCHA_SITE_KEY` | Google Cloud → reCAPTCHA Enterprise | App Check disabled |
| `VITE_SENTRY_DSN` | https://sentry.io | Error monitoring disabled |
| `MAIL_USERNAME` | Email Gmail CI/CD | Notifikasi deploy by email disabled |
| `MAIL_PASSWORD` | Gmail → Google Account → Security → App Passwords | (sama atas) |

---

## LANGKAH 2 — Generate VITE_CRYPTO_PEPPER (Otomatis)

> Crypto Pepper adalah kunci keamanan untuk hash PIN kasir.  
> **JANGAN buat manual** — gunakan workflow otomatis agar nilai benar-benar random.

1. Buka: https://github.com/devPSA-Business/PSA-Business-Suite/settings/secrets/actions
2. Buat secret baru: `PAT_SECRETS_WRITE` → isi dengan Fine-grained PAT kamu
   - Buat PAT di: https://github.com/settings/tokens?type=beta
   - Permission yang dibutuhkan: **Secrets → Read & Write**
3. Buka: https://github.com/devPSA-Business/PSA-Business-Suite/actions/workflows/bootstrap-secrets.yml
4. Klik **Run workflow** → Input: `all-generated` → **Run workflow**
5. Tunggu ±30 detik → ✅ VITE_CRYPTO_PEPPER ter-set otomatis

> ⚠️ **PENTING**: Jika pepper di-generate ulang, semua user yang punya PIN lama  
> harus **reset PIN** karena hash lama tidak akan cocok.

---

## LANGKAH 3 — Trigger Deploy

Setelah semua secrets di-set:

1. Buka: https://github.com/devPSA-Business/PSA-Business-Suite/actions/workflows/deploy.yml
2. Klik **Run workflow** → **Run workflow**
3. Tunggu ±5 menit
4. ✅ Live di: **https://psa-business-suite.web.app**

Atau: lakukan push kecil ke `main` — deploy otomatis berjalan.

---

## LANGKAH 4 — Konfigurasi Repo (Sekali)

Untuk set branch protection, merge strategy, dll:

1. Buka: https://github.com/devPSA-Business/PSA-Business-Suite/actions/workflows/setup-repo-settings.yml
2. Klik **Run workflow** → Ketik `YES` → **Run workflow**

---

## 🔄 Cara Regenerate Secret dengan Aman

| Kondisi | Cara |
|---|---|
| Lupa nilai secret | Cukup set ulang di GitHub Settings → nilai lama otomatis terganti |
| Regenerate CRYPTO_PEPPER | Jalankan Bootstrap workflow → **user yang punya PIN perlu reset** |
| Token GitHub kadaluarsa | Buat token baru di settings, update secret `PAT_SECRETS_WRITE` |
| FIREBASE_SERVICE_ACCOUNT expired | Firebase Console → Generate key baru → update secret |

---

## 📋 Struktur CI/CD Pipeline

```
Push ke main
    │
    ▼
CI Quality Gate (ci.yml)
    ├── TypeScript check
    ├── ESLint lint
    └── Vitest tests + coverage
    │
    ▼ (jika CI pass)
Deploy (deploy.yml)
    ├── npm run build (Vite + env secrets)
    ├── Firebase Hosting deploy
    ├── Firestore Rules deploy
    └── Email notifikasi sukses/gagal
    │
    ▼
https://psa-business-suite.web.app (LIVE ✅)
```

---

*Auto-generated oleh PSA AI Architect — 2026-05-17*

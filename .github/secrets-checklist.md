# GitHub Secrets Checklist — PSA Business Suite
> Update: 2026-05-16 | Arsitektur: Firebase Hosting Only (Spark Plan — Rp 0/bulan)

## ✅ WAJIB ADA (deploy akan GAGAL tanpa ini)

| Secret Name | Deskripsi | Cara Mendapatkan |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | Firebase Console → Project Settings → General |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain Firebase | Firebase Console → Project Settings |
| `VITE_FIREBASE_PROJECT_ID` | Project ID Firebase | Firebase Console → Project Settings |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket | Firebase Console → Project Settings |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | Firebase Console → Project Settings |
| `VITE_FIREBASE_APP_ID` | App ID Firebase | Firebase Console → Project Settings |
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account untuk deploy | Firebase Console → Project Settings → Service Accounts → Generate Key |
| `FIREBASE_PROJECT_ID` | Project ID (untuk firebase-tools CLI) | Sama dengan `VITE_FIREBASE_PROJECT_ID` |
| `FIREBASE_DEPLOY_TOKEN` | Token deploy untuk firestore rules | Jalankan: `firebase login:ci` → copy token |

## 🟡 OPSIONAL (fitur akan disabled jika tidak ada, tapi app tetap berjalan)

| Secret Name | Deskripsi | Dampak jika kosong |
|---|---|---|
| `VITE_GEMINI_API_KEY` | Gemini API key untuk fitur NLQ/AI | Fitur tanya AI tidak tersedia |
| `VITE_TELEGRAM_BOT_TOKEN` | Token Telegram Bot untuk alert | Alert sistem tidak terkirim |
| `VITE_TELEGRAM_CHAT_ID` | Chat ID Telegram tujuan alert | Alert sistem tidak terkirim |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA Enterprise untuk App Check | App Check disabled (kurang aman) |
| `VITE_SENTRY_DSN` | DSN Sentry untuk error tracking | Error monitoring disabled |
| `VITE_CRYPTO_PEPPER` | Pepper tambahan untuk hash PIN | PIN hash tanpa pepper (masih aman via PBKDF2) |
| `MAIL_USERNAME` | Gmail untuk notifikasi deploy | Email notif deploy tidak terkirim |
| `MAIL_PASSWORD` | Gmail App Password | Email notif deploy tidak terkirim |

## ❌ SUDAH TIDAK DIPERLUKAN (Cloud Functions dihapus)

Secrets ini TIDAK PERLU lagi — Cloud Functions sudah diarsipkan:
- `GEMINI_API_KEY` (server-side) → diganti `VITE_GEMINI_API_KEY`
- `CRYPTO_PEPPER` (server-side) → diganti `VITE_CRYPTO_PEPPER`
- `TELEGRAM_BOT_TOKEN` (server-side) → diganti `VITE_TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID` (server-side) → diganti `VITE_TELEGRAM_CHAT_ID`

## 📋 Cara Set Secrets di GitHub

1. Buka: `https://github.com/devPSA-Business/PSA-Business-Suite/settings/secrets/actions`
2. Klik **New repository secret**
3. Isi **Name** dan **Value**
4. Klik **Add secret**

**Urutkan dari yang WAJIB dulu** — tanpa 9 secrets wajib di atas, deploy akan gagal.

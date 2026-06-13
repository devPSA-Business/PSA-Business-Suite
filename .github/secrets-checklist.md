# GitHub Secrets Checklist — PSA Business Suite
> Update: 2026-06-13 | Arsitektur: Firebase Hosting Only (Spark Plan — Rp 0/bulan)

## 🔴 STATUS SAAT INI (2026-06-13)
Secrets yang **sudah ada** di repo: `PAT_SECRETS_WRITE`, `VITE_CRYPTO_PEPPER`  
Secrets yang **belum diset** (menyebabkan deploy gagal): semua 8 secrets WAJIB di bawah ini.

**PRIORITAS:** Set `FIREBASE_SERVICE_ACCOUNT` + `VITE_FIREBASE_*` dulu. Deploy akan berjalan otomatis setelah itu.

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

## ❌ SUDAH TIDAK DIPERLUKAN (Dihapus / Deprecated)

Secrets ini **TIDAK PERLU lagi** dan bisa dihapus dari GitHub Secrets:
- `FIREBASE_DEPLOY_TOKEN` → **DEPRECATED** — deploy.yml kini menggunakan `FIREBASE_SERVICE_ACCOUNT` (via `GOOGLE_APPLICATION_CREDENTIALS`) untuk firestore rules. Tidak perlu generate token via `firebase login:ci` lagi.
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

---

## 📱 Secrets untuk APK Build (Opsional — diperlukan jika ingin build APK)

| Secret | Deskripsi | Cara Mendapatkan |
|---|---|---|
| `KEYSTORE_BASE64` | Android signing keystore di-encode base64 | `keytool -genkey -v -keystore psa.keystore -alias psa-signing-key -keyalg RSA -keysize 2048 -validity 10000` lalu `base64 psa.keystore` |
| `KEYSTORE_PASSWORD` | Password keystore | Nilai yang diset saat `keytool -genkey` |
| `KEYSTORE_KEY_ALIAS` | Alias key di keystore | `psa-signing-key` (default) |
| `KEYSTORE_KEY_PASSWORD` | Password key (bisa sama dengan KEYSTORE_PASSWORD) | Nilai yang diset saat `keytool -genkey` |
| `APK_TESTER_EMAILS` | Email penerima APK (koma-pisah) | Contoh: `owner@gmail.com,pasangan@gmail.com` |
| `PAT_SECRETS_WRITE` | Fine-grained PAT untuk Bootstrap workflow | github.com/settings/tokens → Secrets: Read & Write |

## 📋 Langkah Generate Keystore Android (Sekali Seumur Hidup)

```bash
# Jalankan di terminal — simpan psa.keystore di tempat AMAN (bukan di repo!)
keytool -genkey -v \
  -keystore psa.keystore \
  -alias psa-signing-key \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=PSA Jewellery, OU=Mobile, O=PSA, L=Sampit, ST=Kalteng, C=ID"

# Encode ke base64 untuk disimpan sebagai secret
base64 psa.keystore | tr -d '\n'
# Copy output → set sebagai secret KEYSTORE_BASE64
```

⚠️ **JANGAN commit file psa.keystore ke git.** Simpan di tempat aman (Google Drive terkunci, USB khusus).

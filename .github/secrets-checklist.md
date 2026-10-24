# GitHub Secrets Checklist — PSA Business Suite
> Diperbarui: 2026-10-24 (sesuai `deploy.yml` terbaru) | Firebase Hosting, Spark Plan

## ✅ WAJIB (8 secret) — deploy DIBATALKAN (merah) jika ada yang kosong

| Secret | Nilai | Sumber |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Seluruh JSON service account | Console → Project Settings → Service Accounts → Generate key |
| `VITE_FIREBASE_PROJECT_ID` | `psa-business-suite` | Console → Project Settings → General |
| `VITE_FIREBASE_API_KEY` | `AIza...` (39 karakter) | Config web app |
| `VITE_FIREBASE_AUTH_DOMAIN` | `psa-business-suite.firebaseapp.com` | Config web app |
| `VITE_FIREBASE_STORAGE_BUCKET` | `*.appspot.com` atau `*.firebasestorage.app` | Salin persis dari config web app |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | angka saja | Config web app |
| `VITE_FIREBASE_APP_ID` | `1:<angka>:web:<hex>` | Config web app |
| `VITE_CRYPTO_PEPPER` | ≥ 32 karakter acak | Dibuat sekali; JANGAN diganti (hash PIN lama jadi tidak valid) |

Service account perlu peran **Firebase Hosting Admin** (dan **Firebase Rules Admin** bila rules dideploy via workflow).

## 🟡 OPSIONAL (fitur nonaktif jika kosong)

| Secret | Fungsi |
|---|---|
| `VITE_GEMINI_PROXY_URL` | URL Cloudflare Worker untuk fitur AI (tambahkan domain Worker ke `connect-src` CSP di `firebase.json`) |
| `VITE_RECAPTCHA_SITE_KEY` | Site key reCAPTCHA Enterprise untuk App Check |
| `VITE_SENTRY_DSN` | Error tracking |
| `VITE_TELEGRAM_BOT_TOKEN`, `VITE_TELEGRAM_CHAT_ID` | Alert Telegram |
| `MAIL_USERNAME`, `MAIL_PASSWORD` | Email notifikasi deploy (Gmail App Password) |

> ⚠️ Semua nilai `VITE_*` ikut masuk ke bundle JavaScript dan **terlihat publik** di browser.
> `VITE_CRYPTO_PEPPER` dan `VITE_TELEGRAM_BOT_TOKEN` BUKAN rahasia sungguhan; jangan simpan nilai sensitif di variabel `VITE_*`.
> Jika token Telegram pernah dipakai di produksi, anggap bocor dan buat ulang lewat @BotFather.

## ❌ JANGAN ISI / HAPUS
`FIREBASE_PROJECT_ID`, `FIREBASE_DEPLOY_TOKEN`, `VITE_GEMINI_API_KEY`, `GEMINI_API_KEY`, `CRYPTO_PEPPER`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `VITE_FIREBASE_DATABASE_ID` (kecuali memang membuat database Firestore bernama khusus; default `(default)`).

## 📋 Cara set
`https://github.com/devPSA-Business/PSA-Business-Suite/settings/secrets/actions` → **New repository secret**.
Tempel nilai tanpa spasi/baris baru di awal atau akhir.

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

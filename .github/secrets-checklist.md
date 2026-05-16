# PSA Business Suite — GitHub Secrets Checklist

> **Lokasi:** `https://github.com/devPSA-Business/PSA-Business-Suite/settings/secrets/actions`
> **Update terakhir:** Setelah audit komprehensif (Mei 2026)

## ✅ GitHub Actions Secrets (WAJIB)

### Firebase Core (untuk build produksi)
| Secret | Sumber | Keterangan |
|--------|--------|------------|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings | Public-ish, aman di env |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console | Format: `project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console | `psa-business-suite` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console | Format: `project-id.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console | Sender ID numerik |
| `VITE_FIREBASE_APP_ID` | Firebase Console | Format: `1:xxx:web:xxx` |

### Security & Deploy
| Secret | Sumber | Keterangan |
|--------|--------|------------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Service Accounts → JSON key | JSON key lengkap, SENSITIF |
| `FIREBASE_PROJECT_ID` | Firebase Console | Sama dengan `VITE_FIREBASE_PROJECT_ID` |
| `FIREBASE_DEPLOY_TOKEN` | `firebase login:ci` di terminal | Token untuk CLI deploy |
| `VITE_CRYPTO_PEPPER` | Generate random: `openssl rand -hex 32` | **JANGAN GANTI setelah produksi!** |
| `VITE_RECAPTCHA_SITE_KEY` | Google reCAPTCHA Console | Untuk Firebase App Check |

### Monitoring
| Secret | Sumber | Keterangan |
|--------|--------|------------|
| `VITE_SENTRY_DSN` | Sentry.io → Project Settings | Format DSN Sentry |
| `MAIL_USERNAME` | Gmail akun PSA | Untuk notifikasi deploy |
| `MAIL_PASSWORD` | Gmail → App Passwords (bukan password utama) | App-specific password |

## ✅ Firebase Secrets (Cloud Functions — via `firebase functions:secrets:set`)

```bash
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set CRYPTO_PEPPER  # sama nilai dengan VITE_CRYPTO_PEPPER
```

## ⚠️ Yang TIDAK boleh ada sebagai GitHub Secret
- `VITE_FIREBASE_DATABASE_ID` — Firebase Realtime Database tidak digunakan di PSA
- Token atau key produksi di `.env` atau file yang di-commit

## 📋 Cara Set Secret via GitHub CLI
```bash
gh secret set VITE_FIREBASE_API_KEY --body "your-api-key"
gh secret set FIREBASE_SERVICE_ACCOUNT < service-account.json
```

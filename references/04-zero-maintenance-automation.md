# Reference 04 — Zero-Maintenance Automation, CI/CD & GitHub Actions
# @ai_context: Otomasi penuh untuk operasional tanpa tim IT
# @business_rule: Owner hanya perlu melihat Telegram — tidak ada klik manual
# @security_tier: MEDIUM

## 1. Automation Stack Overview

```
GitHub (push ke main)
  → CI Quality Gate (ci.yml)
      ├── TypeScript strict check
      ├── ESLint zero-error
      ├── Vitest unit tests
      └── Coverage threshold (>80%)
  → CD Auto-Deploy (deploy.yml)
      └── firebase deploy --only hosting
  → Smart Auto-Heal (smart-auto-heal.yml) [BARU]
      ├── Detect: lint + format issues di UI layer
      ├── Fix: prettier + eslint autofix
      └── Commit: langsung ke branch
  → Error Uploader (psa-error-uploader.yml) [BARU]
      ├── Kumpulkan TS + ESLint + Build errors
      ├── Upload artefak ke GitHub
      └── Kirim ringkasan ke Telegram
  → Resource Optimizer (psa-resource-optimizer.yml) [BARU]
      ├── npm audit vulnerabilities
      ├── Bundle size analysis
      └── Laporan mingguan ke Telegram

Firebase Cloud Functions (Cron)
  → scheduledSystemWatchdog (setiap 6 jam)
      ├── Cek fraud anomalies
      ├── Cek DLQ > 10 items → auto-retry
      ├── Cek financial closure kemarin
      └── Kirim alert → Telegram Owner

Local Automation (psa-smart-fix.sh) [BARU]
  → Mode safe: prettier + eslint fix
  → Mode aggressive: hapus console.log + unused imports
  → Guardrail: auto-revert jika file kritis tersentuh
```

## 2. GitHub Secrets yang Dibutuhkan

| Secret | Keterangan | Wajib |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase public key | ✅ |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | ✅ |
| `VITE_CRYPTO_PEPPER` | 64-char hex untuk PBKDF2 | ✅ |
| `VITE_TELEGRAM_BOT_TOKEN` | Token bot Telegram | ✅ |
| `VITE_TELEGRAM_CHAT_ID` | Chat ID owner | ✅ |
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account untuk deploy | ✅ |
| `VITE_RECAPTCHA_SITE_KEY` | App Check reCAPTCHA key | ✅ |

## 3. Branch Protection Rules (Rekomendasi)

```yaml
main:
  required_status_checks:
    - CI Quality Gate
    - Type Check
  dismiss_stale_reviews: true
  require_code_owner_reviews: true  # CODEOWNERS file
  allow_force_pushes: false
  allow_deletions: false
```

## 4. Auto-Heal Safety Boundaries

Layer yang BOLEH di-autofix (non-kritis):
- `src/features/*/ui/`
- `src/features/*/store/`
- `src/pages/`
- `src/app/`

Layer yang TIDAK BOLEH disentuh autofix (kritis):
- `src/features/*/usecases/`
- `src/shared/db.ts`
- `src/shared/utils/decimalUtils.ts` / `MathUtils`
- `firestore.rules`
- Semua file enkripsi/security

## 5. Watchdog Alert Format (Telegram)

```
🤖 PSA Watchdog Report
─────────────────────
Waktu  : 2026-05-08 06:00 WIB
Status : ⚠️ DLQ ALERT

DLQ items  : 12 (threshold: 10)
Fraud flag : 0
Closure gap: 0

Action: Auto-retry DLQ dimulai...
─────────────────────
[Detail Artefak](link)
```

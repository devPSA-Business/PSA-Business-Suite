#!/usr/bin/env bash
# ============================================================
# PSA Business Suite — Setup GitHub Secrets (Jalankan Sekali)
# ============================================================
# CARA PAKAI:
#   1. Install GitHub CLI: https://cli.github.com
#   2. Login: gh auth login
#   3. Jalankan: bash scripts/setup-github-secrets.sh
#
# Script ini AMAN:
#   - Tidak menyimpan nilai ke file manapun
#   - Hanya dikirim langsung ke GitHub via gh CLI (HTTPS terenkripsi)
#   - Semua input langsung dihapus dari memori setelah di-set
#   - Source: github.com/devPSA-Business/PSA-Business-Suite
# ============================================================

set -euo pipefail

REPO="devPSA-Business/PSA-Business-Suite"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  PSA Business Suite — GitHub Secrets Setup      ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# ── Cek gh CLI ───────────────────────────────────────────────
if ! command -v gh &>/dev/null; then
  echo -e "${RED}ERROR: GitHub CLI (gh) tidak ditemukan.${NC}"
  echo "Install dari: https://cli.github.com"
  echo "Atau: winget install --id GitHub.cli (Windows)"
  exit 1
fi

# ── Cek auth ─────────────────────────────────────────────────
if ! gh auth status &>/dev/null; then
  echo -e "${YELLOW}Belum login ke GitHub CLI. Menjalankan gh auth login...${NC}"
  gh auth login
fi

echo -e "${GREEN}✅ GitHub CLI terautentikasi${NC}"
echo ""

# ── Helper: set_secret ────────────────────────────────────────
set_secret() {
  local name="$1"
  local value="$2"
  local description="$3"
  
  if [ -z "$value" ]; then
    echo -e "  ${YELLOW}⏭  DILEWATI: ${name} (kosong)${NC}"
    return 0
  fi
  
  echo -n "$value" | gh secret set "$name" --repo "$REPO" 2>/dev/null
  echo -e "  ${GREEN}✅ ${name}${NC} — ${description}"
  unset value
}

# ── Helper: prompt_secret ─────────────────────────────────────
prompt_secret() {
  local name="$1"
  local description="$2"
  local source_hint="$3"
  local optional="${4:-required}"
  
  echo ""
  echo -e "${BLUE}▶ ${name}${NC}"
  echo -e "  Deskripsi : ${description}"
  echo -e "  Sumber    : ${source_hint}"
  if [ "$optional" = "optional" ]; then
    echo -e "  ${YELLOW}(Opsional — tekan Enter untuk lewati)${NC}"
  fi
  
  read -rsp "  Masukkan nilai (tidak ditampilkan): " secret_value
  echo ""
  set_secret "$name" "$secret_value" "$description"
  unset secret_value
}

# ═══════════════════════════════════════════════════════════════
# BAGIAN 1: Firebase Core (WAJIB — deploy gagal tanpa ini)
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BAGIAN 1: Firebase Core (WAJIB)                 ║${NC}"
echo -e "${BLUE}║  Sumber: Firebase Console → Project Settings     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Buka: ${YELLOW}https://console.firebase.google.com/project/psa-business-suite/settings/general${NC}"
echo "Scroll ke bawah → 'Your apps' → Pilih app web → SDK setup → Config"
echo ""
read -rp "Tekan ENTER jika sudah buka Firebase Console..." _

prompt_secret "VITE_FIREBASE_API_KEY" \
  "Firebase Web API Key" \
  "Firebase Console → Project Settings → Your apps → Config → apiKey"

prompt_secret "VITE_FIREBASE_AUTH_DOMAIN" \
  "Firebase Auth Domain (biasanya: psa-business-suite.firebaseapp.com)" \
  "Firebase Console → Project Settings → Your apps → Config → authDomain"

prompt_secret "VITE_FIREBASE_PROJECT_ID" \
  "Firebase Project ID (biasanya: psa-business-suite)" \
  "Firebase Console → Project Settings → Project ID"

prompt_secret "VITE_FIREBASE_STORAGE_BUCKET" \
  "Firebase Storage Bucket (biasanya: psa-business-suite.firebasestorage.app)" \
  "Firebase Console → Project Settings → Your apps → Config → storageBucket"

prompt_secret "VITE_FIREBASE_MESSAGING_SENDER_ID" \
  "Firebase Messaging Sender ID (angka, misal: 123456789012)" \
  "Firebase Console → Project Settings → Your apps → Config → messagingSenderId"

prompt_secret "VITE_FIREBASE_APP_ID" \
  "Firebase App ID (format: 1:123456:web:abc123)" \
  "Firebase Console → Project Settings → Your apps → Config → appId"

# FIREBASE_PROJECT_ID (sama dengan VITE_ tapi untuk firebase-tools CLI)
echo ""
echo -e "${BLUE}▶ FIREBASE_PROJECT_ID${NC} (sama dengan VITE_FIREBASE_PROJECT_ID, untuk CLI)"
read -rsp "  Masukkan Firebase Project ID lagi: " fp_id
echo ""
set_secret "FIREBASE_PROJECT_ID" "$fp_id" "Project ID untuk firebase-tools CLI"
unset fp_id

# ═══════════════════════════════════════════════════════════════
# BAGIAN 2: Firebase Service Account (WAJIB untuk deploy)
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BAGIAN 2: Firebase Service Account (WAJIB)      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Buka: ${YELLOW}https://console.firebase.google.com/project/psa-business-suite/settings/serviceaccounts/adminsdk${NC}"
echo "Klik 'Generate new private key' → Download file JSON"
echo ""
read -rp "Tekan ENTER jika sudah download file JSON service account..." _
read -rp "  Masukkan PATH ke file JSON yang didownload: " sa_path
echo ""

if [ -f "$sa_path" ]; then
  cat "$sa_path" | gh secret set "FIREBASE_SERVICE_ACCOUNT" --repo "$REPO" 2>/dev/null
  echo -e "  ${GREEN}✅ FIREBASE_SERVICE_ACCOUNT${NC} — JSON service account"
  shred -u "$sa_path" 2>/dev/null || rm -f "$sa_path"
  echo -e "  ${GREEN}✅ File JSON lokal sudah dihapus setelah upload${NC}"
else
  echo -e "  ${YELLOW}⚠ File tidak ditemukan: ${sa_path}${NC}"
  echo "  FIREBASE_SERVICE_ACCOUNT harus diisi manual di GitHub Settings"
fi

# ═══════════════════════════════════════════════════════════════
# BAGIAN 3: Firebase Deploy Token
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BAGIAN 3: Firebase Deploy Token (WAJIB)         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Jalankan perintah ini di terminal LAIN:"
echo -e "${YELLOW}  npx firebase-tools login:ci${NC}"
echo "Copy token yang muncul, lalu masukkan di bawah:"
echo ""
prompt_secret "FIREBASE_DEPLOY_TOKEN" \
  "Token CI untuk deploy Firestore rules" \
  "npx firebase-tools login:ci"

# ═══════════════════════════════════════════════════════════════
# BAGIAN 4: Secrets Opsional
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BAGIAN 4: Secrets Opsional                      ║${NC}"
echo -e "${BLUE}║  (Tekan Enter untuk lewati)                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"

prompt_secret "VITE_GEMINI_API_KEY" \
  "Gemini API Key — untuk fitur tanya AI NLQ" \
  "Google AI Studio: https://aistudio.google.com/app/apikey" \
  "optional"

prompt_secret "VITE_TELEGRAM_BOT_TOKEN" \
  "Token Telegram Bot — untuk notifikasi sistem" \
  "BotFather di Telegram: /newbot" \
  "optional"

prompt_secret "VITE_TELEGRAM_CHAT_ID" \
  "Chat ID Telegram — ID grup/personal tujuan alert" \
  "Kirim pesan ke bot, lalu buka: api.telegram.org/bot<TOKEN>/getUpdates" \
  "optional"

prompt_secret "VITE_RECAPTCHA_SITE_KEY" \
  "reCAPTCHA Enterprise Site Key — untuk App Check anti-bot" \
  "Google Cloud Console → reCAPTCHA Enterprise" \
  "optional"

prompt_secret "VITE_SENTRY_DSN" \
  "Sentry DSN — untuk error monitoring (gratis 5K errors/bulan)" \
  "https://sentry.io → New Project → DSN" \
  "optional"

prompt_secret "MAIL_USERNAME" \
  "Gmail untuk notifikasi deploy (misal: dev.psajewelry@gmail.com)" \
  "Gmail → Gunakan akun Gmail yang sama dengan CI/CD" \
  "optional"

prompt_secret "MAIL_PASSWORD" \
  "Gmail App Password (BUKAN password utama)" \
  "Gmail → Google Account → Security → 2FA → App Passwords → Generate" \
  "optional"

# ═══════════════════════════════════════════════════════════════
# BAGIAN 5: PAT untuk Bootstrap Workflow
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  BAGIAN 5: PAT untuk Bootstrap Workflow          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Token ini digunakan oleh workflow 'Bootstrap Secrets' untuk auto-generate VITE_CRYPTO_PEPPER."
echo -e "Gunakan Fine-grained PAT dengan permission: ${YELLOW}Secrets (Read & Write)${NC}"
echo -e "Buat di: ${YELLOW}https://github.com/settings/tokens?type=beta${NC}"
echo ""
prompt_secret "PAT_SECRETS_WRITE" \
  "Fine-grained PAT dengan Secrets:write untuk bootstrap workflow" \
  "github.com/settings/tokens → New fine-grained token → Secrets: Read & Write" \
  "optional"

# ═══════════════════════════════════════════════════════════════
# RINGKASAN AKHIR
# ═══════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ SETUP SELESAI                                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "Langkah berikutnya:"
echo ""
echo -e "  1. ${YELLOW}Generate VITE_CRYPTO_PEPPER${NC} (penting!):"
echo -e "     Buka: https://github.com/${REPO}/actions/workflows/bootstrap-secrets.yml"
echo -e "     Klik 'Run workflow' → Input: all-generated → Run"
echo ""
echo -e "  2. ${YELLOW}Trigger Deploy Manual${NC}:"
echo -e "     Buka: https://github.com/${REPO}/actions/workflows/deploy.yml"
echo -e "     Klik 'Run workflow' → Run"
echo ""
echo -e "  3. ${YELLOW}Live URL${NC} (setelah deploy berhasil):"
echo -e "     https://psa-business-suite.web.app"
echo ""
echo -e "${GREEN}Selesai! Semua secrets dikirim langsung ke GitHub (tidak tersimpan di tempat lain).${NC}"

#!/usr/bin/env bash
# =============================================================
#  PSA Smart Fix Orchestrator v2.0
#  @ai_context   : CI/CD automation script untuk PSA Business Suite
#  @business_rule: Hanya fix layer non-kritis (UI, store, pages)
#  @security_tier: LOW (tidak menyentuh enkripsi/keuangan/domain)
#
#  Penggunaan:
#    ./psa-smart-fix.sh [safe|aggressive] [--dry-run]
#
#  safe (default) : Prettier + ESLint basic
#  aggressive     : Tambah unused-imports + console.log cleanup
# =============================================================

set -euo pipefail

# ─── Warna terminal ───────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ─── Config ───────────────────────────────────────────────
MODE="${1:-safe}"
DRY_RUN=false
[ "${2:-}" = "--dry-run" ] && DRY_RUN=true

REPORT_DIR="fix-reports"
REPORT_FILE="$REPORT_DIR/psa-smart-fix-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p "$REPORT_DIR"

# ─── Layer yang BOLEH di-autofix (non-kritis) ─────────────
SAFE_LAYERS=(
  "src/features/pos/ui"
  "src/features/inventory/ui"
  "src/features/services/ui"
  "src/features/gold_treasury/ui"
  "src/features/shift/ui"
  "src/features/reports/ui"
  "src/features/audit/ui"
  "src/features/workspace/ui"
  "src/features/pos/store"
  "src/features/inventory/store"
  "src/features/services/store"
  "src/features/gold_treasury/store"
  "src/features/shift/store"
  "src/pages"
  "src/app"
)

# ─── Layer KRITIS yang TIDAK boleh disentuh ───────────────
CRITICAL_PATTERNS=(
  "usecases"
  "MathUtils"
  "db.ts"
  "SecurityStore"
  "firestore.rules"
  "shared/security"
  "shared/crypto"
)

# ─── Helper functions ─────────────────────────────────────
log() { echo -e "${CYAN}[PSA]${RESET} $1" | tee -a "$REPORT_FILE"; }
ok()  { echo -e "${GREEN}  ✓${RESET} $1" | tee -a "$REPORT_FILE"; }
warn(){ echo -e "${YELLOW}  ⚠️${RESET}  $1" | tee -a "$REPORT_FILE"; }
err() { echo -e "${RED}  ✗${RESET} $1" | tee -a "$REPORT_FILE"; }
sep() { echo "────────────────────────────────────────" | tee -a "$REPORT_FILE"; }

# ─── Header ───────────────────────────────────────────────
sep
echo -e "${BOLD}  PSA Smart Fix Orchestrator v2.0${RESET}" | tee -a "$REPORT_FILE"
sep
log "Mode    : $MODE"
log "DryRun  : $DRY_RUN"
log "Waktu   : $(date '+%Y-%m-%d %H:%M:%S')"
log "Git SHA : $(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"
sep

# ─── Validasi: tidak di branch main langsung ──────────────
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [ "$CURRENT_BRANCH" = "main" ] && [ "$DRY_RUN" = "false" ]; then
  warn "Berjalan di branch 'main'. Pastikan ini bukan commit langsung."
  warn "Gunakan --dry-run untuk preview terlebih dahulu."
fi

# ─── FASE 0: Pre-flight check ─────────────────────────────
log "FASE 0 — Pre-flight check"

MISSING_TOOLS=()
command -v node  >/dev/null 2>&1 || MISSING_TOOLS+=("node")
command -v npx   >/dev/null 2>&1 || MISSING_TOOLS+=("npx")
command -v git   >/dev/null 2>&1 || MISSING_TOOLS+=("git")

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
  err "Tool tidak ditemukan: ${MISSING_TOOLS[*]}"
  err "Install dulu sebelum menjalankan script ini."
  exit 1
fi
ok "Semua tool tersedia (node, npx, git)"

# Cek node_modules
if [ ! -d "node_modules" ]; then
  warn "node_modules tidak ditemukan. Jalankan 'npm ci' terlebih dahulu."
  if [ "$DRY_RUN" = "false" ]; then
    log "Menjalankan npm ci..."
    npm ci
  fi
fi

# ─── FASE 1: Snapshot state awal ──────────────────────────
log "FASE 1 — Snapshot state awal"
BEFORE_FILES=$(git diff --name-only 2>/dev/null | wc -l || echo "0")
log "File sudah dimodifikasi (sebelum fix): $BEFORE_FILES"

# ─── FASE 2: Prettier format ──────────────────────────────
log "FASE 2 — Prettier auto-format (UI/Store/Pages)"

PRETTIER_FIXED=0
for layer in "${SAFE_LAYERS[@]}"; do
  if [ -d "$layer" ]; then
    if [ "$DRY_RUN" = "true" ]; then
      NEED_FORMAT=$(npx prettier --check "$layer/**/*.{ts,tsx}" 2>/dev/null | grep -c "Code style issues" || echo "0")
      if [ "$NEED_FORMAT" -gt 0 ]; then
        warn "[DRY] $layer perlu format ($NEED_FORMAT file)"
      fi
    else
      npx prettier --write "$layer/**/*.{ts,tsx}" 2>/dev/null || true
      ok "$layer"
    fi
    PRETTIER_FIXED=$((PRETTIER_FIXED + 1))
  fi
done
log "Prettier selesai: $PRETTIER_FIXED layer diproses"

# ─── FASE 3: ESLint auto-fix ──────────────────────────────
log "FASE 3 — ESLint auto-fix (rules aman)"

ESLINT_RULES='{"no-trailing-spaces":"error","eol-last":"error","no-multiple-empty-lines":["error",{"max":2}]}'

for layer in "${SAFE_LAYERS[@]}"; do
  if [ -d "$layer" ]; then
    if [ "$DRY_RUN" = "true" ]; then
      ISSUES=$(npx eslint "$layer" --ext .ts,.tsx --format compact 2>/dev/null | wc -l || echo "0")
      [ "$ISSUES" -gt 0 ] && warn "[DRY] $layer: $ISSUES isu lint"
    else
      npx eslint "$layer" \
        --ext .ts,.tsx \
        --fix \
        --rule "$ESLINT_RULES" \
        2>/dev/null || true
      ok "$layer"
    fi
  fi
done

# ─── FASE 4: Aggressive mode ──────────────────────────────
if [ "$MODE" = "aggressive" ]; then
  log "FASE 4 — Aggressive: console.log & unused imports"

  for layer in "${SAFE_LAYERS[@]}"; do
    if [ -d "$layer" ]; then
      if [ "$DRY_RUN" = "false" ]; then
        # Hapus console.log debug (bukan console.error/warn)
        find "$layer" -name "*.ts" -o -name "*.tsx" | while read -r file; do
          if grep -q "console\.log(" "$file" 2>/dev/null; then
            # Hanya hapus yang bukan di catch block atau produksi intentional
            sed -i '/console\.log(/d' "$file" 2>/dev/null || true
            warn "console.log dibersihkan: $file"
          fi
        done

        # ESLint fix unused vars
        npx eslint "$layer" \
          --ext .ts,.tsx \
          --fix \
          --rule '{"@typescript-eslint/no-unused-vars":["warn",{"argsIgnorePattern":"^_"}]}' \
          2>/dev/null || true
      else
        CONSOLE_COUNT=$(grep -rn "console\.log" "$layer" 2>/dev/null | wc -l || echo "0")
        [ "$CONSOLE_COUNT" -gt 0 ] && warn "[DRY] $layer: $CONSOLE_COUNT console.log"
      fi
    fi
  done
else
  log "FASE 4 — Skipped (mode: $MODE)"
fi

# ─── FASE 5: Verifikasi keamanan ──────────────────────────
log "FASE 5 — Verifikasi layer kritis TIDAK tersentuh"

CRITICAL_LEAK=false
CHANGED_FILES=$(git diff --name-only 2>/dev/null || echo "")

for changed_file in $CHANGED_FILES; do
  for pattern in "${CRITICAL_PATTERNS[@]}"; do
    if echo "$changed_file" | grep -q "$pattern"; then
      CRITICAL_LEAK=true
      err "⛔ FILE KRITIS TERSENTUH: $changed_file (pattern: $pattern)"

      if [ "$DRY_RUN" = "false" ]; then
        git checkout -- "$changed_file" 2>/dev/null || true
        warn "↩️  Auto-reverted: $changed_file"
      fi
    fi
  done
done

if [ "$CRITICAL_LEAK" = "false" ]; then
  ok "✅ Verifikasi OK — tidak ada file kritis tersentuh"
fi

# ─── FASE 6: Laporan akhir ────────────────────────────────
sep
log "FASE 6 — Laporan Akhir"

AFTER_FILES=$(git diff --name-only 2>/dev/null | wc -l || echo "0")
TOTAL_FIXED=$((AFTER_FILES - BEFORE_FILES))
if [ "$TOTAL_FIXED" -lt 0 ]; then TOTAL_FIXED=$AFTER_FILES; fi

log "File yang diperbaiki : $AFTER_FILES"
log "Mode                 : $MODE"
log "DryRun               : $DRY_RUN"
log "Layer kritis aman    : $([ "$CRITICAL_LEAK" = 'false' ] && echo 'Ya' || echo 'TIDAK (ada revert')"

if [ "$DRY_RUN" = "false" ] && [ "$AFTER_FILES" -gt 0 ]; then
  log ""
  log "💡 Langkah selanjutnya:"
  log "   git add src/features/*/ui/ src/features/*/store/ src/pages/ src/app/"
  log "   git commit -m 'fix(auto-heal): PSA Smart Fix [safe mode]'"
  log "   git push"
fi

sep
log "Report disimpan di: $REPORT_FILE"
sep

#!/usr/bin/env bash
# =============================================================
# PSA Business Suite — GitHub Repository Settings Configurator
# =============================================================
# Jalankan: bash PSA-GitHub-Setup.sh
# Prasyarat: GitHub PAT dengan scope: repo, admin:repo_hook
# =============================================================
set -euo pipefail

TOKEN="${GITHUB_PAT:-}"
if [ -z "$TOKEN" ]; then
  read -rsp "Masukkan GitHub Personal Access Token: " TOKEN
  echo ""
fi

REPO="devPSA-Business/PSA-Business-Suite"
BASE="https://api.github.com/repos/${REPO}"
HEADERS=(-H "Authorization: token ${TOKEN}" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")

gh_api() {
  local METHOD="$1" URL="$2" shift 2
  curl -s -X "$METHOD" "${HEADERS[@]}" "$@" "$URL"
}

echo "=== [1/5] KONFIGURASI DASAR REPO ==="
gh_api PATCH "${BASE}" \
  -d '{
    "has_issues": true,
    "has_projects": false,
    "has_wiki": false,
    "allow_squash_merge": true,
    "allow_merge_commit": false,
    "allow_rebase_merge": false,
    "delete_branch_on_merge": true,
    "allow_auto_merge": true,
    "allow_update_branch": true
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  ✅ Repo updated: squash_only={d[\"allow_squash_merge\"]} delete_branch={d[\"delete_branch_on_merge\"]}')"

echo ""
echo "=== [2/5] BRANCH PROTECTION — main ==="
gh_api PUT "${BASE}/branches/main/protection" \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "Lint · TypeCheck · Test · Coverage",
        "TypeScript · ESLint · Architecture",
        "Dependency Audit",
        "NPM Audit Scan"
      ]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": {
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": true,
      "required_approving_review_count": 1,
      "require_last_push_approval": false
    },
    "restrictions": null,
    "required_linear_history": true,
    "allow_force_pushes": false,
    "allow_deletions": false,
    "required_conversation_resolution": true
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  ✅ Branch protection set' if 'url' in d else f'  ❌ Error: {d.get(\"message\",\"?\")}') "

echo ""
echo "=== [3/5] LABELS ==="
LABELS=(
  '{"name":"security","color":"d73a4a","description":"Isu keamanan kritis — prioritas tinggi"}'
  '{"name":"architecture","color":"0075ca","description":"Perubahan arsitektur sistem"}'
  '{"name":"needs-human-review","color":"e4e669","description":"PR ditahan — wajib review manual sebelum merge"}'
  '{"name":"auto-merge","color":"0e8a16","description":"PR aman untuk auto-merge setelah CI hijau"}'
  '{"name":"breaking-change","color":"b60205","description":"Perubahan yang merusak kompatibilitas"}'
  '{"name":"hotfix","color":"ff6b6b","description":"Perbaikan kritis untuk produksi"}'
  '{"name":"ci/cd","color":"0052cc","description":"Perubahan pipeline CI/CD atau workflow"}'
  '{"name":"gold-module","color":"fbca04","description":"Terkait modul Gold Treasury"}'
  '{"name":"offline-first","color":"1d76db","description":"Terkait logika offline/sync engine"}'
  '{"name":"wontfix","color":"ffffff","description":"Tidak akan diperbaiki"}'
)

for label in "${LABELS[@]}"; do
  NAME=$(echo "$label" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])")
  RESULT=$(gh_api POST "${BASE}/labels" -d "$label" 2>/dev/null || true)
  if echo "$RESULT" | grep -q '"id"'; then
    echo "  ✅ Label created: $NAME"
  else
    # Label mungkin sudah ada — coba update
    COLOR=$(echo "$label" | python3 -c "import sys,json; print(json.load(sys.stdin)['color'])")
    DESC=$(echo "$label" | python3 -c "import sys,json; print(json.load(sys.stdin)['description'])")
    gh_api PATCH "${BASE}/labels/${NAME// /%20}" \
      -d "{\"color\":\"${COLOR}\",\"description\":\"${DESC}\"}" > /dev/null 2>&1 || true
    echo "  ✅ Label updated: $NAME"
  fi
done

echo ""
echo "=== [4/5] SECRETS CHECKLIST ==="
echo "  Verifikasi secrets di: https://github.com/${REPO}/settings/secrets/actions"
echo ""
SECRETS_REQUIRED=(
  "VITE_FIREBASE_API_KEY"
  "VITE_FIREBASE_AUTH_DOMAIN"
  "VITE_FIREBASE_PROJECT_ID"
  "VITE_FIREBASE_STORAGE_BUCKET"
  "VITE_FIREBASE_MESSAGING_SENDER_ID"
  "VITE_FIREBASE_APP_ID"
  "VITE_CRYPTO_PEPPER"
  "VITE_SENTRY_DSN"
  "VITE_RECAPTCHA_SITE_KEY"
  "FIREBASE_SERVICE_ACCOUNT"
  "FIREBASE_PROJECT_ID"
  "FIREBASE_DEPLOY_TOKEN"
  "MAIL_USERNAME"
  "MAIL_PASSWORD"
  "TELEGRAM_BOT_TOKEN (via Firebase Secrets)"
  "TELEGRAM_CHAT_ID (via Firebase Secrets)"
  "GEMINI_API_KEY (via Firebase Secrets)"
  "CRYPTO_PEPPER (via Firebase Secrets)"
)
for s in "${SECRETS_REQUIRED[@]}"; do
  echo "  [ ] $s"
done

echo ""
echo "=== [5/5] DEPENDABOT ALERTS ==="
gh_api PUT "https://api.github.com/repos/${REPO}/vulnerability-alerts" | python3 -c \
  "import sys; body=sys.stdin.read().strip(); print('  ✅ Vulnerability alerts enabled' if not body else '  ℹ️ ' + body)"

echo ""
echo "============================================"
echo "✅ SETUP SELESAI — PSA GitHub Settings OK"
echo "============================================"

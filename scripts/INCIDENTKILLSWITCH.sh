#!/bin/bash
# TARGET: /scripts/INCIDENTKILLSWITCH.sh
# MENGHENTIKAN AKSES BACA/TULIS PADA FIRESTORE SECARA GLOBAL
# Otorisasi: Harus dijalankan oleh CISO/Owner

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
    echo "Usage: ./scripts/INCIDENTKILLSWITCH.sh [dry-run] <env> <projectid>"
    exit 1
fi

DRY_RUN=false
if [ "$1" == "dry-run" ]; then
    DRY_RUN=true
    shift
fi

ENV="$1"
PROJECT_ID="$2"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DENYRULESFILE="/tmp/firestore-deny-$ENV.rules"

echo "[$TIMESTAMP] WARNING: INITIATING GLOBAL FREEZE PROTOCOL for $ENV"

# Create global deny rules file
cat > "$DENYRULESFILE" <<'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
EOF

if [ "$DRY_RUN" = true ]; then
    echo "[$TIMESTAMP] DRY-RUN: Rules file created at $DENYRULESFILE. No changes applied."
    cat "$DENYRULESFILE"
    exit 0
fi

# Apply deny rules
echo "[$TIMESTAMP] Applying global deny rules from $DENYRULESFILE"
gcloud firestore security-rules update --rules="$DENYRULESFILE" --project="$PROJECT_ID"

echo "[$TIMESTAMP] All access frozen. IMMEDIATE ROTATION OF KEYS REQUIRED."
exit 0

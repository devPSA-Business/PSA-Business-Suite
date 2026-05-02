#!/usr/bin/env bash
# scripts/setup-labels.sh
set -euo pipefail

if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is not installed. Please install it first."
    exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "Setting up standard labels in $REPO..."

# Delete default labels to clean up
DEFAULT_LABELS=("bug" "documentation" "duplicate" "enhancement" "good first issue" "help wanted" "invalid" "question" "wontfix")
for label in "${DEFAULT_LABELS[@]}"; do
    gh label delete "$label" --yes 2>/dev/null || true
done

# Create new semantic labels
gh label create "type: bug" --color d73a4a --description "Something isn't working" --force
gh label create "type: feature" --color 0e8a16 --description "New feature or request" --force
gh label create "type: maintenance" --color fbca04 --description "Refactoring, testing, or chores" --force
gh label create "type: security" --color b60205 --description "Security vulnerability or enhancement" --force
gh label create "area: core" --color 1d76db --description "Core business logic" --force
gh label create "area: ui" --color c2e0c6 --description "User interface components" --force
gh label create "area: infrastructure" --color 0052cc --description "Database, CI/CD, and scripts" --force
gh label create "priority: high" --color d93f0b --description "Needs immediate attention" --force
gh label create "priority: medium" --color e99695 --description "Standard priority task" --force

echo "Label setup complete."

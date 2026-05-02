#!/usr/bin/env bash
# scripts/setup-branch-protection.sh
set -euo pipefail

# Require GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is not installed. Please install it first."
    exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "Setting up branch protection for main branch in $REPO..."

# Create or update branch protection rules using GitHub GraphQL API
gh api graphql -f query='
mutation UpdateBranchProtection($repositoryId: ID!, $branch: String!) {
  createBranchProtectionRule(input: {
    repositoryId: $repositoryId,
    pattern: $branch,
    requiresApprovingReviews: true,
    requiredApprovingReviewCount: 1,
    requiresCodeOwnerReviews: true,
    requiresStatusChecks: true,
    requiresStrictStatusChecks: true,
    requiredStatusCheckContexts: ["build-and-test", "typecheck"],
    enforceAdmins: true
  }) {
    clientMutationId
  }
}
' -f repositoryId="$(gh api /repos/$REPO | jq -r .node_id)" -f branch="main" || echo "Branch protection may already exist or requires admin rights. Check GitHub UI."

echo "Branch protection setup complete for $REPO."

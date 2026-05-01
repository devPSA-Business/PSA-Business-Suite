# Release Notes: Checkout Concurrency Fix

**Release Date:** TBD
**Version:** TBD

## Overview
This release introduces Optimistic Concurrency Control to the checkout process to prevent race conditions that could lead to negative stock or duplicate transactions.

## Changes
- Added a `version` field to the `StockItem` entity.
- Implemented `updateIfVersionMatches` in the stock repository to ensure atomic updates.
- Updated `CheckoutUseCase` to retry transactions up to 3 times with exponential backoff if a version conflict occurs.
- Added Dexie schema migration (v12) to initialize the `version` field for existing stock items.

## Risks
- **Database Migration:** The Dexie schema upgrade runs automatically on the client side. If it fails, the transaction is rolled back, but users might experience issues loading the app.
- **Sync Conflicts:** If offline changes conflict with server state, the sync mechanism needs to handle version mismatches (to be addressed in a follow-up).

## Rollback Plan
If critical issues are discovered post-deployment:
1. Instruct users to restore their local IndexedDB from the JSON backup taken prior to the release (using the snippet in `docs/runbook-indexeddb.md`).
2. Rollback the deployment to the previous stable tag.
3. Revert the PR in the repository.

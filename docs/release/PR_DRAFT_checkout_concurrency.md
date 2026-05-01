# Release Candidate: Checkout Concurrency Fix and Migration

## Summary
This PR merges the fixes for the checkout race condition (PR B) and the associated documentation/CI updates (PR C) into the release candidate branch. It introduces Optimistic Concurrency Control using a `version` field on `StockItem`, retry logic in `CheckoutUseCase`, and a Dexie schema migration (v12). It also includes PoCs for observability metrics and client-side IndexedDB encryption.

## Migration Steps
1. The Dexie database will automatically upgrade to version 12 upon opening the app.
2. Existing `stock` records will be assigned `version: 1`.

## Staging Test Checklist
- [ ] **CRITICAL:** Manual backup of staging IndexedDB has been taken.
- [ ] Application deployed successfully to staging.
- [ ] Existing stock items have `version: 1` in IndexedDB.
- [ ] Concurrency test passed: Two simultaneous checkouts for an item with quantity=1 result in exactly one success and one failure (`VersionConflictError`).
- [ ] Smoke tests passed: POS flows, receive stock, reports.
- [ ] Metrics are emitted to the console/endpoint on version conflicts.

## Rollback Instructions
If the staging deployment or migration fails:
1. Restore the IndexedDB from the JSON backup using the `importDB` snippet documented in `docs/runbook-indexeddb.md`.
2. Rollback the deployment to the previous stable tag.

## Contacts
- **Release Owner:** [Name]
- **On-call SRE:** [Name]
- **Security Lead:** [Name]

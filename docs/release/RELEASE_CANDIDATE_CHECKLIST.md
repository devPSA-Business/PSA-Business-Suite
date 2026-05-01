# Release Candidate Checklist

## Pre-Merge
- [ ] PR B (Checkout Concurrency) has been reviewed and approved by at least 1 Backend and 1 Frontend engineer.
- [ ] All CI checks (Lint, Type Check, Unit Tests) pass on the PR branch.
- [ ] Security review sign-off obtained for the database schema change (adding `version` to `StockItem`).
- [ ] `docs/runbook-indexeddb.md` and `FEATURE_MAPPING.md` are updated and accurate.

## Staging Deployment
- [ ] Staging environment is available and stable.
- [ ] **CRITICAL:** Manual backup of staging IndexedDB has been taken using the browser console snippet.
- [ ] `scripts/deploy-staging.sh` executed successfully.
- [ ] Health check endpoint returns 200 OK.

## Staging Verification
- [ ] Open staging app, verify existing stock items have `version: 1` in IndexedDB.
- [ ] Perform manual concurrency test:
  - Set an item's quantity to 1.
  - Open two tabs and attempt to checkout the item simultaneously.
  - Verify exactly one checkout succeeds and the other fails with a version conflict or insufficient stock error.
- [ ] Verify audit logs and sync events are recorded correctly for the successful transaction.

## Production Release
- [ ] Release window scheduled during low-traffic hours.
- [ ] Operations and Customer Support teams notified of the release and potential rollback procedures.
- [ ] Production deployment executed.
- [ ] Post-deployment verification (smoke tests) passed in production.

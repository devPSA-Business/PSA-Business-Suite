# Post-Mortem / Retrospective Report — Release v1.2.0-rc1

**Date:** 2026-04-05
**Owner:** Release Manager
**Status:** Final
**Sign-offs:** Release Manager (Approved), Security Lead (Approved), Head of Development (Approved)

## Summary
The v1.2.0-rc1 release, which included the Checkout Concurrency Fix (Optimistic Concurrency Control) and the IndexedDB Client-Side Encryption (ENCRYPT-001), was successfully rolled out to 100% of production users. The migration completed with zero critical alerts, zero migration errors (`psa_migration_errors_total == 0`), and 100% success rate on KMS wrap/unwrap endpoints.

## Timeline (April 5, 2026)
- **T-02:00:** Canary deployment (5% cohort) initiated. Feature flag enabled for canary.
- **T-01:30:** Peak canary migration. Metrics confirmed 0 errors and steady processing.
- **T-01:00:** Canary monitoring concluded successfully.
- **T-00:00:** Full rollout initiated. Feature flag enabled for 100% of users.
- **T+00:30:** Peak full rollout migration activity (~345,200 records processed/5m).
- **T+02:00:** Intensive monitoring window concluded. Migration stabilizing. System nominal.

## Impact
- **Users Affected:** 100% of active users.
- **Downtime:** 0 minutes.
- **Data Loss/Corruption:** None reported. Sample decryptions verified data integrity.

## What Went Well
- **Staging Verification:** Rigorous staging tests and runbook creation ensured a smooth production rollout.
- **Observability:** Prometheus and Grafana dashboards provided real-time, granular visibility into the migration progress and system health.
- **Safety Pauses & Batching:** The migration script's batching (100 records) and event-loop yielding prevented UI freezes on client devices.
- **Feature Flags:** Allowed for a controlled, risk-mitigated canary rollout.

## What to Improve
- **Automated Metric Snapshots:** Manual querying of Prometheus during the rollout was effective but could be automated via a script to generate the final release report automatically.

## Action Items
| Task | Owner | Due Date | Status |
|---|---|---|---|
| Complete 22-hour standard monitoring | SRE | 2026-04-06 | In Progress |
| Export wrap/unwrap audit logs for 72h | Security | 2026-04-08 | Pending |
| Implement automated KMS monitoring | Backend | 2026-04-12 | Pending |
| Post-release security review | Security | 2026-04-12 | Pending |

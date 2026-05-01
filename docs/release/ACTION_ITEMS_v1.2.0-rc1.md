# Post-Release Action Items — v1.2.0-rc1

**Release:** v1.2.0-rc1 (Checkout Concurrency & IndexedDB Encryption)
**Status:** Active tracking

## 1. Immediate Actions (24 - 72 Hours)

### 1.1. Rotate Service Keys for Wrap/Unwrap Audit Tokens
- **Owner:** Security Lead
- **Due Date:** 2026-04-06 (24 hours post-release)
- **Description:** Rotate any short-lived service keys or tokens used by the frontend/backend to authenticate wrap/unwrap requests during the rollout phase.
- **Checklist:**
  - [ ] Generate new service keys.
  - [ ] Update backend KMS integration configuration.
  - [ ] Revoke old rollout tokens.
  - [ ] Verify wrap/unwrap endpoints still function correctly.

### 1.2. Export & Archive Audit Logs
- **Owner:** Security Lead
- **Due Date:** 2026-04-08 (72 hours post-release)
- **Description:** Export the first 72 hours of KMS wrap/unwrap audit logs and store them securely in the compliance cold-storage vault.
- **Checklist:**
  - [ ] Query logs for `/api/keys/wrap` and `/api/keys/unwrap` from deployment time (T=0) to T+72h.
  - [ ] Verify logs contain `userId`, `keyId`, and `timestamp` without leaking key material.
  - [ ] Compress and upload to compliance vault.

---

## 2. Medium-Term Actions (1 Week)

### 2.1. Implement Automated KMS Monitoring
- **Owner:** Backend Team
- **Due Date:** 2026-04-12 (1 week post-release)
- **Description:** Set up automated alerting for the KMS endpoints to detect anomalous behavior (e.g., high unwrap error rates or unexpected spikes in unwrap volume).
- **Checklist:**
  - [ ] Define Prometheus metrics for KMS endpoint latency and error rates.
  - [ ] Create Grafana alert for `KmsUnwrapErrorSpike`.
  - [ ] Create Grafana alert for `AnomalousUnwrapVolume`.
  - [ ] Update Alert Runbook with mitigation steps for these new alerts.

### 2.2. Post-Release Security Review
- **Owner:** Security Lead
- **Due Date:** 2026-04-12 (1 week post-release)
- **Description:** Conduct a follow-up review of the production environment to ensure no security regressions have occurred and that the encryption architecture is holding up as designed.
- **Checklist:**
  - [ ] Review recent penetration test or vulnerability scan results.
  - [ ] Audit a random sample of production IndexedDB payloads (via user screen-share or staging replication) to ensure `_encrypted: true` is enforced.
  - [ ] Sign off on long-term stability in the ENCRYPT-001 ticket.

---

## 3. Notification Drafts

### Message to Security Lead
**Subject:** Action Required: Post-Release Security Tasks for v1.2.0-rc1

Hi [Security Lead Name],

The v1.2.0-rc1 release (IndexedDB Encryption) has been successfully rolled out. As part of our post-mortem and security audit, we have a few follow-up action items assigned to you:

1. **[Due in 24h]** Rotate service keys used for wrap/unwrap audit tokens.
2. **[Due in 72h]** Export and archive the 72-hour KMS audit logs to the compliance vault.
3. **[Due in 1 week]** Conduct the 1-week post-release security review.

You can find the full checklist and details here: `docs/release/ACTION_ITEMS_v1.2.0-rc1.md`.
Please let me know if you need any assistance.

Thanks,
[Your Name]

### Message to Backend Team
**Subject:** Action Required: Automated KMS Monitoring for v1.2.0-rc1

Hi Backend Team,

Great work on the KMS endpoints for the v1.2.0-rc1 release! The rollout was a success. 
To ensure long-term stability, we have one medium-term action item assigned to your team:

1. **[Due in 1 week]** Implement automated KMS monitoring (alerting on unwrap error rates and anomalous unwrap volumes).

Details and the checklist are available here: `docs/release/ACTION_ITEMS_v1.2.0-rc1.md`.
Please coordinate with SRE to get the alerts added to our production Grafana.

Thanks,
[Your Name]

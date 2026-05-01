---
name: "ENCRYPT-001: Enforce encryption at rest for sensitive tables"
about: "Production key management design, PoC hardening, and migration plan for IndexedDB"
title: "[ENCRYPT-001] Enforce encryption at rest for transactions and audit_logs"
labels: ["security", "high-priority"]
assignees: []
---

## Description
Following the successful PoC of client-side encryption using the Web Crypto API, we need to harden the implementation for production. This involves finalizing the key management strategy, ensuring keys cannot be easily exfiltrated, and executing the migration on production data.

## Deliverables
- [ ] Finalized production key management design (Server-wrapped keys vs. Platform Secure Storage).
- [ ] Hardened `cryptoIndexedDB.ts` implementation.
- [ ] Tested migration plan for `transactions` and `audit_logs` tables.
- [ ] Security review sign-off.

## Owner
Security Team

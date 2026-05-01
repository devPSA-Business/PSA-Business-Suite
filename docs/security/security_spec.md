# Security Specification

## Data Invariants
- Users have roles: ADMIN, MANAGER, USER.
- Stock items must have cost, price, and quantity.
- Transactions are immutable after creation.
- Shifts must verify user access.

## The "Dirty Dozen" (Attack Payloads)
1. Identity Spoofing: Attempt to update user role to ADMIN.
2. State Shortcutting: Update transaction status directly.
3. Resource Poisoning: Inject 10KB string into barcode field.
4. Orphaned Record: Create transaction without branchId.
5. Insecure Read: Read all users.
6. Email Spoofing: Payload with admin email but email_verified: false.
7. PII Leak: Get user details as non-owner.
8. Query Scraping: List transactions without filtering by owner/branch.
9. Ghost Field Injection: Add unexpected field during update.
10. System Field Tampering: Modify createdAt timestamp.
11. Admin Lockout: Deny manager access to stock.
12. Denial of Wallet: Update shift with 1,000,000 array elements.

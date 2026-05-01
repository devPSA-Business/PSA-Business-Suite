# ADR 002: Serverless Offline-First Security (PIN-Wrapped AES-GCM)

## Status
Accepted (2026-04-24)

## Context
The application targets small jewelry retailers who need high data integrity, privacy, and zero monthly operational costs. Initially, the system used a hybrid approach with potential server-side KMS (Key Management Service) dependencies. However, to fulfill the "Zero-Cost & Zero-Maintenance" philosophy, the security architecture must operate entirely on the client-side while maintaining "Tank-Proof" resilience.

## Decision
We decided to implement a **Full Local Cryptography Architecture** with the following pillars:

1.  **Identity-Linked Key Wrapping**: The master database encryption key (DAK or Device Access Key) is generated locally and never leaves the device. It is wrapped using `AES-GCM` with a key derived from the user's PIN via `PBKDF2`.
2.  **Hardened PIN Hashing**: PINs are hashed using `PBKDF2` (100,000 iterations) with a unique, random UUID salt for each user. This mitigates Rainbow Table attacks and ensures that the same PIN across different users/devices results in different hashes.
3.  **Nuclear Lockout Resilience**: Security state (failed attempts, system lock status) is moved from `localStorage` to `IndexedDB` (`keyval` table). This prevents users/attackers from bypassing lockouts by simply clearing browser cache or using developer tools.
4.  **Local Rate-Limiting**: A "Brute-Force Delay" (2s) and "Lockout Period" (30 min) are enforced at the app level for both user login and manager authorization prompts.
5.  **Offline Backup Strategy**: Encrypted backups use a user-provided passphrase (Master PIN) to wrap the database export via `AES-GCM` inside a Web Worker. Backups are stored as `.psa` files.

## Consequences
-   **Positive**:
    -   Zero monthly server costs for security or KMS.
    -   100% offline functionality; stores can operate without internet indefinitely.
    -   Privacy-by-design: Neither the developer nor the platform provider can decrypt user data.
-   **Negative**:
    -   Forgotten PINs/Recovery Keys result in permanent data loss if no unencrypted backup exists.
    -   Device-specific enrollment: Users must be "delegated" access by a Manager on a new device.

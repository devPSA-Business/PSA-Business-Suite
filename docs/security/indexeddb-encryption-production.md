# IndexedDB Client-Side Encryption: Production Design

## Final Recommendation: Server-Wrapped Per-Device AES Key
To balance security and user experience, we will use a **server-wrapped per-device AES key**. 
- A unique AES-GCM key is generated on the device.
- The key is sent to the server (over TLS, authenticated) to be wrapped (encrypted) using a master KMS key.
- The server returns the `wrappedKeyBlob` and a `wrappedKeyId`.
- The device stores ONLY the `wrappedKeyBlob` and `wrappedKeyId` in IndexedDB. The plaintext key is never persisted to disk.
- On application startup, the device authenticates with the server, sends the `wrappedKeyId`, and the server returns the unwrapped key (or the device unwraps it if asymmetric wrapping is used). The unwrapped key is kept in memory as a non-extractable `CryptoKey`.

## Key Lifecycle
1. **Generation:** Device generates a 256-bit AES-GCM key using Web Crypto API.
2. **Wrap:** Device calls `POST /api/keys/wrap` with the raw key material (over secure TLS). Server encrypts it and returns `wrappedKeyBlob`.
3. **Storage:** Device stores `{ keyId, wrappedKeyBlob }` in a local `keys_meta` IndexedDB table.
4. **Unwrap (Startup):** Device calls `POST /api/keys/unwrap` with `keyId`. Server validates the user's session and returns the ephemeral key material. Device imports it as a non-extractable `CryptoKey` in memory.
5. **Rotation:** Server can force rotation by invalidating a `keyId`. The client must generate a new key, re-encrypt all local data, and wrap the new key.
6. **Revocation:** If a device is lost, the server deletes the wrapped key mapping. The local data becomes permanently inaccessible.

## Threat Model and Mitigations
- **Physical Device Theft:** Attacker extracts IndexedDB files. *Mitigation:* Files are encrypted with AES-GCM. The plaintext key is not on disk. The attacker cannot unwrap the key without the user's active session token.
- **XSS Attack:** Malicious script tries to steal the key. *Mitigation:* The unwrapped key is stored as a `non-extractable` CryptoKey in memory. It cannot be exported by JS.
- **Network Interception:** *Mitigation:* All wrap/unwrap calls must use strict HTTPS/TLS and require a valid `Authorization: Bearer <token>`.

## UX Fallback
For fully offline devices that cannot reach the unwrap endpoint on startup, a **User Passphrase Fallback** can be implemented. The device key is wrapped using a key derived from the user's PIN/passphrase (e.g., using PBKDF2) instead of the server KMS.

## Performance and Migration
- **Algorithm:** AES-GCM is hardware-accelerated.
- **Batching:** Migration of existing plaintext data will be done in configurable batches (e.g., 100 records) to prevent UI blocking and memory spikes.
- **Checkpointing:** Migration progress is tracked so it can resume if interrupted.

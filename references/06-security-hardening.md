# Reference 06 — Security Hardening, Enkripsi, RBAC & App Check
# @ai_context: Panduan keamanan lengkap PSA Business Suite
# @business_rule: Zero-Trust Architecture — tidak ada yang dipercaya tanpa verifikasi
# @security_tier: CRITICAL

## 1. Enkripsi Lokal — AES-GCM + PBKDF2

```typescript
// SecurityStore menggunakan:
// - Algoritma: AES-GCM (256-bit)
// - KDF: PBKDF2 dengan 310.000 iterasi (OWASP 2024 recommendation)
// - Salt: UUID v4 unik per instalasi (disimpan di db.keyval)
// - Pepper: VITE_CRYPTO_PEPPER (64-char hex, disimpan di GitHub Secrets)

// Data yang WAJIB dienkripsi:
// - PIN kasir (hash + salt)
// - Token sesi
// - Data buyback yang sensitif
// - Backup export Dexie
```

## 2. RBAC — Role-Based Access Control

| Role | Akses | Batasan |
|---|---|---|
| `kasir` | POS, inventory baca, shift | Tidak bisa void tanpa manager auth |
| `owner` | Semua fitur | Akses penuh + laporan keuangan |
| `admin` | Konfigurasi sistem | Hanya via Firebase Console |

```typescript
// Custom Claims Firebase Auth
interface PSAAuthClaims {
  role: 'kasir' | 'owner' | 'admin';
  branchId: string;  // Isolasi data per cabang
}

// Setiap protected action cek claims:
function requireRole(minRole: 'kasir' | 'owner') {
  const claims = getCurrentUserClaims();
  if (!claims || !hasMinimumRole(claims.role, minRole)) {
    throw new AuthorizationError('Akses ditolak');
  }
}
```

## 3. Firebase App Check

```typescript
// Wajib aktif di production
// Provider: reCAPTCHA v3 (web) atau DeviceCheck (iOS) / Play Integrity (Android)
// Di firestore.rules: isHardened() = request.app.token.app_check_valid

// Testing: gunakan debug token di dev environment
// JANGAN disable App Check di production — ini line of defense pertama
```

## 4. Manager Auth Dialog — Untuk Aksi Sensitif

Aksi berikut WAJIB konfirmasi Manager PIN:
- Void transaksi
- Diskon > threshold (default: 20%)
- Ubah harga produk
- Export data
- Reset shift

## 5. PII Handling Rules

```typescript
// Sebelum kirim ke: AI, log eksternal, Telegram, Sentry
const PII_FIELDS = ['name', 'phone', 'email', 'nik', 'address'];

function sanitizePII<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) =>
      PII_FIELDS.includes(k) ? [k, '<<PII_REMOVED>>'] : [k, v]
    )
  ) as T;
}
```

## 6. Security Checklist (Sebelum Deploy)

- [ ] App Check aktif dan hardened
- [ ] firestore.rules tidak ada rule `allow read, write: if true`
- [ ] Tidak ada API key di source code frontend
- [ ] PBKDF2 iterations ≥ 310.000
- [ ] Semua secrets di GitHub Secrets, bukan .env yang di-commit
- [ ] Gitleaks CI aktif (secrets scanning)
- [ ] Manager Auth Dialog aktif untuk aksi kritis

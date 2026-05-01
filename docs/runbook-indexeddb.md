# Runbook: IndexedDB (Dexie) Backup & Restore

Dokumen ini berisi panduan operasional untuk mengelola database lokal (IndexedDB) menggunakan Dexie.js pada PSA Business Suite.

## 1. Backup Data (Export)
Karena aplikasi bersifat offline-first, data krusial tersimpan di browser. Untuk melakukan backup manual:

```javascript
// Jalankan di Console Browser (DevTools)
import { importDB, exportDB } from "dexie-export-import";
import { db } from "./src/shared/api/db";

async function backupDatabase() {
  try {
    const blob = await exportDB(db, { prettyJson: true });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `psa-backup-${new Date().toISOString()}.json`;
    a.click();
    console.log("Backup berhasil diunduh.");
  } catch (error) {
    console.error("Gagal melakukan backup:", error);
  }
}
backupDatabase();
```

## 2. Restore Data (Import)
Untuk memulihkan data dari file JSON hasil backup:

```javascript
// Jalankan di Console Browser (DevTools)
import { importDB } from "dexie-export-import";

async function restoreDatabase(file) {
  try {
    await db.delete(); // Hapus DB lama
    await importDB(file);
    console.log("Restore berhasil. Silakan muat ulang halaman.");
    window.location.reload();
  } catch (error) {
    console.error("Gagal melakukan restore:", error);
  }
}
// Gunakan input type="file" untuk mendapatkan objek 'file'
```

## 3. Penanganan Korupsi Database
Jika IndexedDB mengalami korupsi (misal: `QuotaExceededError` atau `DatabaseClosedError`):
1. **Cek Kuota:** Pastikan penyimpanan perangkat tidak penuh.
2. **Clear Site Data:** Buka DevTools -> Application -> Storage -> Clear site data (Pastikan data sudah tersinkronisasi ke server sebelum melakukan ini).
3. **Re-sync:** Setelah data lokal dihapus, login kembali untuk memicu sinkronisasi awal (Initial Pull) dari server.

## 4. Migrasi Skema dan Pembaruan Versi (Schema Migration)
Dexie.js menangani migrasi skema secara otomatis jika versi database dinaikkan.

### Contoh: Menambahkan Optimistic Concurrency Control (Version Field)
Pada versi 12, kita menambahkan field `version` pada tabel `stock` untuk mencegah *race condition* saat checkout.

```typescript
// src/shared/api/db.ts
this.version(12).stores({
  stock: 'id, name, category, barcode, quantity'
}).upgrade(async (tx) => {
  await tx.table('stock').toCollection().modify((item: any) => {
    if (item.version == null) {
      item.version = 1;
    }
  });
});
```

**Langkah-langkah Migrasi Dexie versi 12:**
1. **Backup:** Lakukan backup data menggunakan skrip ekspor di atas. Simpan file JSON hasil backup.
2. **Deploy:** Deploy aplikasi dengan versi Dexie yang baru (versi 12).
3. **Verifikasi:** Saat pengguna membuka aplikasi, Dexie akan otomatis menjalankan fungsi `upgrade` di latar belakang. Buka DevTools -> Application -> IndexedDB -> `psa_db` -> `stock`, dan pastikan item lama sekarang memiliki field `version: 1`.
4. **Rollback:** Jika terjadi error saat migrasi atau aplikasi tidak berfungsi normal, ikuti langkah Restore Data di atas menggunakan file JSON backup, lalu rollback deployment ke versi sebelumnya.

**Contoh Perintah Restore dari JSON Backup:**
```javascript
// Jalankan di Console Browser (DevTools)
import { importDB } from "dexie-export-import";
import { db } from "./src/shared/api/db";

async function restoreDatabase(file) {
  try {
    await db.delete(); // Hapus DB lama
    await importDB(file);
    console.log("Restore berhasil. Silakan muat ulang halaman.");
    window.location.reload();
  } catch (error) {
    console.error("Gagal melakukan restore:", error);
  }
}

// Untuk menggunakan:
// 1. Buat elemen input file: const input = document.createElement('input'); input.type = 'file';
// 2. Tambahkan event listener: input.onchange = (e) => restoreDatabase(e.target.files[0]);
// 3. Klik input: input.click();
```

## 5. Production IndexedDB Encryption Migration

This section outlines the procedure for migrating plaintext sensitive tables (`transactions`, `audit_logs`) to encrypted storage using the server-wrapped key approach.

### Pre-Migration
1. **Full Export Backup:** Ensure a full JSON export of the production IndexedDB is taken and securely stored.
2. **Verify Backup Integrity:** Test restoring the backup on an isolated staging instance.
3. **Deploy Server Endpoints:** Ensure the KMS wrap/unwrap endpoints (`/api/keys/wrap`, `/api/keys/unwrap`) are deployed and accessible.

### Migration Execution
1. **Deploy Frontend:** Deploy the frontend application containing the `cryptoIndexedDB` and migration scripts.
2. **Execute Migration Script:** Run the migration script (e.g., via a hidden admin UI or browser console snippet).
   ```javascript
   import { migrateToEncryptedDB } from '/src/shared/api/db-encryption-migration.js';
   await migrateToEncryptedDB(100); // Batch size 100
   ```
3. **Monitor Metrics:** Observe application logs and metrics for any errors during the batch processing.

### Post-Migration
1. **Verify Decryptability:** Perform a test transaction and verify it can be read back successfully.
2. **Inspect Storage:** Open DevTools -> Application -> IndexedDB and verify that new and migrated records in `transactions` and `audit_logs` only show `ciphertext`, `iv`, and `_encrypted: true`.

### Rollback
If the migration fails or data becomes inaccessible:
1. Stop the application.
2. Restore the IndexedDB from the JSON backup taken in the Pre-Migration step.
3. Rollback the frontend deployment to the previous version.

---

## 6. Security Review Checklist for Encryption Rollout

Before deploying the encryption feature to production, the following must be reviewed and signed off by the Security Team:

- [ ] **Key Management:** The server-side KMS integration securely wraps and unwraps keys.
- [ ] **Authentication:** The `/api/keys/unwrap` endpoint strictly requires a valid, unexpired user session token.
- [ ] **Key Material:** The plaintext device key is never persisted to `localStorage`, `sessionStorage`, or `IndexedDB`.
- [ ] **Extractability:** The unwrapped key in memory is marked as `extractable: false` in the Web Crypto API.
- [ ] **Algorithm:** AES-GCM with a 256-bit key and a 12-byte random IV is used for all record encryption.
- [ ] **Fallback:** If a passphrase fallback is implemented, it uses a strong KDF (e.g., PBKDF2 with >= 100,000 iterations).

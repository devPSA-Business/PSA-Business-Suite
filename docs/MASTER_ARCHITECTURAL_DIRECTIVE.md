# 📘 MASTER ARCHITECTURAL DIRECTIVE: PSA BUSINESS SUITE

**Version:** 1.5.0-Final  
**Status:** Execution Blueprint — Active Governance Document  
**Priority:** Critical Hardening  
**Dibuat:** 2026-05-21  
**Oleh:** PSA AI Engineer (Principal Architect Session)  
**Referensi:** Audit forensik 80+ file | 6 batch atomic commit | AI_TRACK_RECORD.md

> **Catatan Visibilitas:** Directive ini disusun berdasarkan audit dengan akses terbatas pada runtime environment produksi.
> Setiap Executing AI **WAJIB memverifikasi kondisi aktual file sebelum menerapkan perubahan** — jangan eksekusi buta.

---

## SECTION 1 — PROJECT IDENTITY & CORE PHILOSOPHY

**Project:** PSA Business Suite  
**Jenis:** Offline-First PWA ERP untuk Toko Perhiasan UMKM (PSA Jewellery, Sampit, Kalteng)  
**Tim:** 2 orang founder/owner — tanpa tim IT dedicated  
**Target Biaya Operasional:** Rp 0/bulan (Firebase Spark + Cloudflare Free Tier)

### 🏛️ Empat Pilar Arsitektur

| # | Pilar | Deskripsi | Non-Negotiable |
|---|-------|-----------|----------------|
| 1 | **Absolute Offline-First** | UI → Dexie (IndexedDB) → SyncQueue → Firestore. Tablet kasir WAJIB berjalan tanpa internet. | ✅ |
| 2 | **Financial Precision** | Zero tolerance floating-point error. Semua kalkulasi uang/berat WAJIB `Decimal.js` via `MathUtils`. | ✅ |
| 3 | **Cryptographic Integrity** | AES-GCM 256-bit, PBKDF2-v2 (600k iterations), HKDF-SHA256 untuk Recovery Key. Tidak boleh di-downgrade. | ✅ |
| 4 | **Clean Architecture (FSD)** | Strict separation: Domain → Application → Infrastructure → Feature. Cross-feature import HANYA via `shared/`. | ✅ |

### Filosofi Zero-Maintenance

```
Owner tidak perlu intervensi teknis apapun dalam kondisi normal.
Semua alert → Telegram. Semua deploy → GitHub Actions otomatis.
AI executing WAJIB mengimplementasikan otomasi, bukan prosedur manual.
```

---

## SECTION 2 — CRITICAL AUDIT FINDINGS (REMEDIATION TARGETS)

Status per **2026-05-21**: C-01, C-02, C-03, M-02, M-04 **telah diselesaikan** dalam session ini.

### 🚨 P0/P1 — Critical Vulnerabilities

| ID | Issue | Root Cause | Status | Strategic Fix |
|----|-------|-----------|--------|---------------|
| **C-01** | Direct Firestore Write | `setDoc` ditemukan di `timeUtils.ts` — melanggar Rule of Truth | ✅ **FIXED** | Read-only approach. Dokumen `serverInfo/timestamp` dikelola eksklusif Cloud Functions. |
| **C-02** | Data Loss Risk | `localStorage.clear()` di `LockedPage.tsx` — wipe semua kunci browser | ✅ **FIXED** | Selective removal: hanya kunci berprefix `psa_`/`PSA_`. Kunci browser lain tidak tersentuh. |
| **C-03** | Sync Failure | `branchId` tidak diisi saat `SetupStoreUseCase` — menyebabkan isolasi Firestore gagal | ✅ **FIXED** | `branchId: 'main'` ditambahkan. `@ts-expect-error` dihapus — type-safe. |

### ⚠️ P2 — Stability & Type-Safety

| ID | Issue | Root Cause | Status | Strategic Fix |
|----|-------|-----------|--------|---------------|
| **M-02** | Crypto Type Erasure | `any` di `cryptoIndexedDB.ts` untuk `encryptRecord`/`decryptRecord` | ✅ **FIXED** | Generic `<T extends object>` — caller menentukan tipe output secara eksplisit. |
| **M-04** | Schema Fragility | Tidak ada template migrasi Dexie — risiko schema drift saat scale | ✅ **FIXED** | Template `version(2).stores().upgrade()` dengan dokumentasi komprehensif di `db.ts`. |
| **M-03** | Registry Drift | TD-03 status mismatch di `TD.md` | 🟡 PENDING | Verifikasi guard `GOLD_BUYBACK` di codebase, update `TD.md` sesuai kondisi aktual. |

### 📉 P3 — Quality Assurance

| ID | Issue | Root Cause | Status | Strategic Fix |
|----|-------|-----------|--------|---------------|
| **M-01** | Low Test Coverage | ~14% coverage — "The Money Path" tidak terlindungi | 🔴 OPEN | 100% coverage untuk: `MathUtils` → `CheckoutUseCase` → `BuybackUseCase` → `cryptoDB`. |

---

## SECTION 3 — EXECUTION FRAMEWORK (THE "VERIFY-THEN-EXECUTE" LOOP)

Executing AI **dilarang** menerapkan perubahan secara buta. Loop ini adalah **mandatory**:

```
1. DISCOVERY        → Deep-scan target file + semua dependencies-nya
2. IMPACT ANALYSIS  → Map semua fungsi yang memanggil / dipanggil target
3. PROPOSAL         → Ajukan change proposal line-by-line ke User/Architect
4. ATOMIC COMMIT    → Satu commit = satu issue. Jangan gabungkan multi-issue dalam satu commit.
5. FORENSIC VERIFY  → Berikan bukti fix (Before vs After, console output, diff)
6. DOCUMENTATION    → Update AI_TRACK_RECORD.md + TD.md setelah setiap perubahan
```

### Aturan Jumlah File per Eksekusi

> **Maksimal 3 file kritis per sesi eksekusi.**  
> Jika scope lebih besar: buat Execution Plan dulu, tunggu approval owner, baru eksekusi bertahap.

---

## SECTION 4 — ARCHITECTURAL GOLDEN RULES

Setiap implementasi yang melanggar rules ini dianggap **DEFECTIVE** — tidak peduli apakah kodenya "berjalan".

| Rule | Deskripsi | Contoh Pelanggaran |
|------|-----------|-------------------|
| **Rule of Truth** | Dexie = Single Source of Truth. Firestore = mirror. Bisnis logic TIDAK boleh bergantung Firestore langsung. | Query Firestore dari dalam UseCase tanpa melewati Dexie |
| **Rule of Precision** | Currency & Weight WAJIB `Decimal` atau `string`. `JS number` (float) dilarang keras untuk data finansial. | `total = price * qty` tanpa `MathUtils` |
| **Rule of Isolation** | Kas Gold Treasury **wajib terisolasi** dari kas toko umum. Cross-contamination = bug kritis. | Menghitung net cash toko dengan menyertakan modal emas |
| **Rule of Immutability** | `audit_logs` adalah append-only. Tidak ada `update` atau `delete`. | `db.audit_logs.delete(id)` |
| **Rule of Least Privilege** | Firestore Rules: izin minimum yang diperlukan. Tidak ada wildcard `allow read, write: if true`. | `allow read: if true` di rules produksi |

---

## SECTION 5 — ARCHITECTURAL RED FLAGS (DETECTION GUIDE)

Jika pola berikut ditemukan, **flag dan refactor sebelum merge**:

| 🚩 Nama | Pattern | Tindakan |
|---------|---------|----------|
| **The Shortcut** | `localStorage` untuk state kritis atau security key | Pindahkan ke `db.keyval` (IndexedDB) |
| **The Leak** | `setDoc`, `collection`, `getDocs` di `pages/` atau `components/` | Pindahkan ke Repository / UseCase layer |
| **The Silent Fail** | Empty `try-catch` atau `console.log(e)` tanpa `logger.fatal` / Telegram alert | Implementasikan `ErrorMapper` dengan severity level |
| **The Type-Erasure** | `as any`, `@ts-ignore`, `@ts-expect-error` di layer financial atau crypto | Definisikan Interface/Generic yang ketat |
| **The God Import** | Feature A mengimport langsung dari Feature B (bukan via `shared/`) | Refactor ke interface di `shared/` |

---

## SECTION 6 — QUALITY ASSURANCE & STRESS TESTING

### "The Money Path" — Wajib 100% Coverage

```
MathUtils → CheckoutUseCase → BuybackUseCase → cryptoDB.encryptRecord
```

Scenario stress test yang WAJIB dilakukan sebelum setiap rilis produksi:

| # | Test | Target |
|---|------|--------|
| 1 | **Money Path** | Nilai transaksi Rp 0.01 s/d Rp 1 Triliun — zero rounding error |
| 2 | **Intermittent Connectivity** | Gagal jaringan saat SyncQueue berjalan — idempotency terjaga, tidak ada duplikat |
| 3 | **Concurrency Conflict** | Update stok bersamaan dari 2 perangkat — CRDT versioning menang tanpa data loss |
| 4 | **Security Breach Simulation** | Bypass PIN/Recovery Key — lockout terpicu setelah N percobaan gagal |
| 5 | **Schema Migration** | Upgrade dari `version(1)` ke `version(2)` — semua data termigrasi tanpa corrupt |

---

## SECTION 7 — PENDING ITEMS (NEXT SESSION)

| Priority | Item | File Target | Blocker |
|----------|------|-------------|---------|
| P2 | Verifikasi M-03: Guard `GOLD_BUYBACK` di TD.md | `docs/TD.md`, fitur gold | Perlu runtime check |
| P3 | Implementasi "The Money Path" unit tests | `src/__tests__/` | M-01 coverage gap |
| P3 | Verifikasi `serverInfo/timestamp` dikelola Cloud Functions | `functions/` atau Cloud console | Audit Firestore rules |

---

## SECTION 8 — FINAL MANDATE

> **Kepada Executing AI:**
>
> Anda bukan programmer — Anda adalah **Systems Engineer**.
> Tujuan utama bukan "membuat kode berjalan", melainkan **menjaga integritas sistem**.
>
> Jika ada konflik antara directive ini dan codebase aktual, **prioritaskan Golden Rules dan Architectural Pillars**.
>
> **Integritas data adalah prioritas mutlak. Jika ragu — STOP dan minta klarifikasi owner.**

---

*PSA Business Suite — Master Architectural Directive v1.5.0-Final*  
*Dihasilkan dari audit forensik mendalam · 2026-05-21*

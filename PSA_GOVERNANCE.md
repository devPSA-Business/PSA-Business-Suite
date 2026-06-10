# PSA_GOVERNANCE.md — Tata Kelola Project PSA Business Suite
# Versi 1.0 · Dibuat 2026-06-10 · Otoritatif per HEAD a6dbc70

Dokumen ini adalah **sumber kebenaran tunggal** untuk semua pihak yang terlibat di project ini:
AI (Claude/Gemini/dll), GitHub Bots (Dependabot/Actions), dan Owner/Kasir (manusia).

---

## BAGIAN A — KONTEKS BISNIS (WAJIB DIPAHAMI AI)

### A1. Siapa PSA Jewellery?
- Toko perhiasan **imitasi** kecil di Sampit, Kalimantan Tengah
- 2 orang: Owner (non-developer) + 1 asisten kasir
- **Tidak ada IT team** — semua pengembangan dibantu AI

### A2. Tiga Sumber Pendapatan (Penting untuk Business Logic)
| Stream | Produk | Catatan Kritis |
|--------|--------|----------------|
| **Retail Imitasi** | Cincin/Anting/Gelang/Kalung/Bros/Set/Couple | Brand: Xuping, Yaxiya, Titanium, SS |
| **Jasa** | Perawatan, Restorasi, Reparasi, Sepuh, Patri, Custom Order | Ada repair_services table |
| **Buyback Emas** | Beli dari konsumen, jual ke pengepul | **PSA TIDAK stok/jual emas** |

### A3. Prinsip Operasional (Mempengaruhi Keputusan Teknis)
- **Biaya Minimum:** Hanya Firebase Spark (free tier) + Cloudflare Workers free
- **Otomasi Maksimal:** Bot/AI ambil alih tugas teknis berulang
- **Offline-First:** 3 hari survive tanpa internet wajib
- **Zero-Maintenance:** Deploy otomatis, tidak butuh terminal oleh owner

### A4. SKU Format
`[Kategori][Warna][Motif][Kode]` — contoh: `CNC-G-001` = Cincin Emas Motif 001

---

## BAGIAN B — ATURAN YANG TIDAK BOLEH BERUBAH (IMMUTABLE)

> 🔴 Aturan ini tidak bisa diubah oleh siapapun tanpa ADR + approval owner.

### B1. File Restricted (Butuh ADR Tertulis)
```
src/shared/api/db.ts              — Schema database utama
src/shared/api/firebase.ts        — Koneksi Firebase
src/lib/cryptoIndexedDB.ts        — Enkripsi AES-GCM lokal
src/stores/useSecurityStore.ts    — State autentikasi PIN
```
**Mengapa:** Perubahan file ini bisa menghapus data enkripsi semua kasir atau merusak offline sync.

### B2. Aritmatika Uang dan Berat
```typescript
// ❌ DILARANG — floating point error pada uang
const total = harga * jumlah + diskon;

// ✅ WAJIB — via MathUtils (Decimal.js internally)
const total = MathUtils.add(MathUtils.multiply(harga, jumlah), diskon);
```
**Mengapa:** Rp 1 error × 1000 transaksi = Rp 1.000 selisih kas yang tidak terjelaskan.

### B3. Dexie sebagai Single Source of Truth
- Data **SELALU** dibaca dari Dexie (IndexedDB lokal), bukan Firestore langsung
- Firebase Firestore = mirror/backup, BUKAN primary store
- Exception: `createDailyClosure()` validasi online + pendingSyncCount=0 dulu, baru baca Dexie

### B4. Operasi Keamanan yang Sengaja Bypass UseCase
```
LockedPage.tsx:247-248  — db.close() + db.delete()  → Factory reset (nuclear option)
LockedPage.tsx:127,212  — db.users.update (PIN hash) → Security bootstrap
```
**JANGAN** pindahkan ini ke UseCase biasa. Komentar `@security_bypass_required` adalah intentional.

### B5. npm Install
```bash
# SELALU pakai flag ini — peer conflict @firebase/rules-unit-testing vs firebase@11
npm install --legacy-peer-deps
```

### B6. Test Requirements Sebelum Push ke Main
- `npx tsc --noEmit` → 0 errors
- `npx vitest run` → semua hijau (minimal count saat ini: 252)
- Tidak ada `any` baru di area money/security (14 yang sudah ada di LiveQueriesImpl.ts adalah warisan)

---

## BAGIAN C — ATURAN UNTUK BOT GITHUB (AUTOMATION RULES)

### C1. Dependabot — Auto-Merge Rules

| Kondisi | Tindakan Bot |
|---------|-------------|
| Minor/patch update, bukan dep kritis | ✅ Auto-approve + auto-merge setelah CI hijau |
| Major update (semua dep) | 🔴 Label `needs-human-review`, komentar ke owner |
| Dep kritis: firebase, dexie, @firebase/* | 🔴 Tahan meskipun patch — minta review manual |

**Dep kritis saat ini:** `firebase`, `dexie`, `@firebase/app`, `@firebase/auth`, `firebase-admin`

**Mengapa firebase dan dexie kritis:**
- Firebase: menyentuh auth + sync — update bisa break offline handshake
- Dexie: menyentuh skema IndexedDB — update bisa corrupt data lokal

### C2. CI Workflow — Quality Gate
CI **HARUS** lulus semua langkah ini sebelum merge diizinkan:
1. `npm run lint` — ESLint (hooks/exhaustive-deps = error)
2. `npx tsc --noEmit` — 0 errors
3. `npx vitest run --coverage` — semua test hijau
4. Coverage threshold: Lines ≥21%, Statements ≥20%, Branches ≥15%, Functions ≥13%
5. Architecture guard (`EnterpriseArchitecture.test.ts`) — TIDAK boleh ada pelanggaran FSD

### C3. Auto-Deploy Rules
- **Push ke main** → otomatis deploy ke Firebase Hosting via `deploy.yml`
- **Push tag `v*.*.*`** → build APK TWA via `twa-build.yml` + distribusi ke tester email
- **PR ke main dari branch selain dependabot** → harus CI hijau + 1 approval

### C4. Bootstrap Secrets (Workflow Manual)
- `bootstrap-secrets.yml` → hanya owner yang boleh trigger (workflow_dispatch)
- Menghasilkan `VITE_CRYPTO_PEPPER` yang tersimpan sebagai GitHub Secret
- **JANGAN** run ini lebih dari sekali tanpa alasan — semua PIN kasir akan invalid

---

## BAGIAN D — PANDUAN UNTUK OWNER (NON-TEKNIS)

> 💡 Bagian ini khusus untuk Anda sebagai pemilik toko. Tidak perlu paham koding.

### D1. Tindakan yang HANYA Anda Bisa Lakukan (Bot Tidak Bisa)

| Tindakan | Di Mana | Kapan Dibutuhkan |
|---------|---------|-----------------|
| Set GitHub Secrets | github.com → Settings → Secrets | Saat setup awal atau rotasi credentials |
| Approve PR berlabel `needs-human-review` | Tab Pull Requests di GitHub | Saat Dependabot update deps kritis |
| Run Bootstrap Secrets | GitHub → Actions → Bootstrap Secrets | Saat setup awal (1x saja) |
| Reset keystore Android | Lokal + GitHub Secrets | Saat keystore hilang/expired |

### D2. Notifikasi dari Bot yang Perlu Perhatian

Jika Anda menerima komentar seperti ini di PR:
```
Auto-merge DITAHAN
Alasan: Update dependensi kritis 'firebase' - menyentuh auth/DB...
```
**Artinya:** Update otomatis ditahan karena berisiko. Anda perlu:
1. Buka link PR yang disebut
2. Tanya AI (Claude/Gemini) apakah aman: *"Ini PR dependabot untuk update firebase, apakah aman di-merge?"*
3. Jika AI bilang aman → klik Merge. Jika tidak → klik Close.

### D3. Lampu Hijau / Merah GitHub Actions

Di setiap commit di GitHub, ada tanda di sebelah commit:
- ✅ Hijau = semua otomatis berjalan normal, tidak perlu tindakan
- ❌ Merah = ada masalah, perlu perhatian — tanya AI untuk analisis

---

## BAGIAN E — STATUS TEKNIS SNAPSHOT (Update Per Sprint)

### E1. State Per 2026-06-10 (HEAD: ff0f8e8 + governance branch)

| Metrik | Nilai |
|--------|-------|
| Test files | 39 |
| Tests passing | 282 |
| TypeScript errors | 0 |
| Coverage (Lines) | ~23.6% |
| Coverage (Statements) | ~22.08% |
| Vite version | 8.0.16 (upgraded dari 6.4.2) |
| PSA IT Team Skill | v4.0.0 (installed /mnt/skills/user/psa-it-team/) |
| Dependabot PRs pending | 9 (minor/patch + major GitHub Actions) |

### E2. Technical Debt Register

| ID | Deskripsi | Status | Prioritas |
|----|-----------|--------|-----------|
| TD-01 | CheckoutUseCase guard Rp 0 | ✅ RESOLVED | — |
| TD-03 | AutoArchiver 90-day prune + buyback exclude | ✅ RESOLVED | — |
| TD-04 | LockedPage db.keyval.3 | ✅ RESOLVED | — |
| TD-05 | Hardcoded PBKDF2 salt | 🟡 OPEN P1 | Sprint +1 |
| NT-01 | EmployeesPage direct db.users write (butuh ManageUserUseCase) | 🟡 OPEN | Sprint +1 |
| NT-02 | AuditIntegrityService 0% coverage | ✅ RESOLVED 2026-06-10 | — |
| NT-03 | SyncServiceImpl anyOf swallowed error | ✅ RESOLVED 2026-06-10 | — |

### E3. File yang Sering Jadi Sumber Konflik AI

| File | Mengapa Rawan Salah Paham | Catatan Benar |
|------|--------------------------|---------------|
| `EmployeesPage.tsx:82,109,132` | Direct db.users writes — terlihat seperti bug tapi masih OPEN karena butuh UseCase baru | NT-01, Sprint +1 |
| `LockedPage.tsx:247-248` | `db.delete()` terlihat seperti security hole | Intentional factory reset, `@security_bypass_required` |
| `dataArchiver.ts` | Prune 90 hari + buyback exclude | BUKAN 30 hari, buyback memang di-exclude by design |
| `SyncStatusPage.tsx:41` | Direct sync_events update | Intentional admin repair operation |
| `DeadLetterQueueViewer.tsx` | Direct DLQ operations | Admin tool, tidak ada di audit trail by design |
| `AuditIntegrityService.ts` | `crypto.subtle` tidak di-mock | Gunakan real SHA-256 di test — ini validasi end-to-end |
| `LiveQueriesImpl.ts` | Ada 14 `as any` cast | Warisan Dexie v4 type inference — BUKAN pelanggaran baru |
| `ReportQueryImpl.ts` | `getCustomerSegmentation` pernah pakai native `+` | FIXED 2026-06-10: sekarang pakai MathUtils.add() |

---

## BAGIAN F — PROSEDUR SPRINT DAN DELIVERY

### F1. Urutan Kerja Per Sesi AI

```
1. git pull origin main (selalu dari HEAD terbaru)
2. npm install --legacy-peer-deps
3. npx tsc --noEmit (baseline 0 errors)
4. npx vitest run (baseline semua hijau)
5. Baca file yang relevan DARI SOURCE (jangan asumsikan dari memory)
6. Eksekusi max 3 file per PR/eksekusi
7. Verifikasi: tsc + vitest
8. Update AI_TRACK_RECORD.md
9. Commit + push
```

### F2. Format Commit Message
```
type(scope): deskripsi singkat (#issue-number)

type: fix | feat | refactor | test | chore | docs | ci
scope: pos | sync | audit | security | report | ui | deps | ci
```

### F3. Branch Strategy
```
main           → production (auto-deploy)
feature/xxx    → fitur baru (PR ke main, butuh CI hijau)
fix/xxx        → bug fix urgent
dependabot/*   → auto PR dari dependabot
```

---

## BAGIAN G — RISIKO YANG SERING TERJADI & MITIGASINYA

### G1. Masalah Berulang dari AI Sessions Sebelumnya

| Masalah | Penyebab | Mitigasi |
|---------|---------|---------|
| AI membuat UseCase baru tapi lupa update IUnitOfWork interface | Kurang cek interface contract | Selalu baca `IUnitOfWork.ts` dulu |
| AI mengganti `MathUtils` dengan native JS | Default coding habit | Grep untuk `+= \|* \|/ ` di money area sebelum commit |
| AI menulis test yang mock `crypto.subtle` | Tidak tahu bahwa jsdom support Web Crypto | Lihat AuditIntegrityService.spec.ts sebagai referensi |
| AI menghapus `@security_bypass_required` comment | Dianggap komentar stale | Komentar ini adalah dokumentasi arsitektur, JANGAN hapus |
| AI pakai `mockReturnValue` tunggal untuk Dexie chain | Chain query Dexie tidak linear | Lihat pola `mockImplementation` di SyncServiceImpl.spec.ts |
| AI merge dependabot PR vite tanpa review | Vite 6→8 pernah break build | Vite termasuk kritis meski bukan di daftar resmi |

### G2. Dependabot PRs yang Saat Ini Pending (Per 2026-06-10 post-PR#150)

**Vite 8.0.16 sudah di-merge ke main (PR#138)** — build kompatibel, vite.config.ts sudah di-update.

**Safe auto-merge** (minor/patch — tunggu CI hijau):
- `sharp` v0.34.5 (dev dep, image processing)
- `@tanstack/react-virtual` v3.14.2 (minor, virtual list)
- `@typescript-eslint/parser` v8.60.1 (patch, linter)
- `github/codeql-action` v4.36.2 (patch, CI)

**Major — butuh review manual** (label `needs-human-review`):
- `@types/node` 22→25 (major types, cek TSC dulu sebelum merge)
- `actions/checkout` 4→6 (major GitHub Action)
- `actions/upload-artifact` 4→7 (major GitHub Action)
- `android-actions/setup-android` 3→4 (major, TWA build)
- `softprops/action-gh-release` 2→3 (major, release action)

---

*Dokumen ini diupdate otomatis oleh AI setiap sprint selesai.*
*Owner tidak perlu membaca bagian teknis (B, C, F, G) — cukup bagian A dan D.*

---

## BAGIAN H — REFERENSI TEKNIS CEPAT UNTUK AI (ANTI-FOOTGUN)

> Bagian ini mencegah kesalahan berulang yang paling sering terjadi saat AI menulis kode/test.

### H1. Domain Model — Enum Values yang Benar

```typescript
// UserRole (enum, BUKAN string literal)
import { UserRole } from 'src/domain/models/User'
UserRole.ADMIN     // ✅ — bukan 'ADMIN' atau 'admin' atau UserRole.OWNER
UserRole.MANAGER   // ✅
UserRole.CASHIER   // ✅ — BUKAN UserRole.KASIR

// StockCategory (enum)
import { StockCategory } from 'src/domain/models/StockCategory'
StockCategory.IMITATION  // ✅ — BUKAN StockCategory.IMITASI
StockCategory.GOLD       // ✅
StockCategory.SERVICE    // ✅ (untuk jasa)
```

### H2. Repository Interface — Return Types (Kesalahan Umum)

| Repository | Method | Return Type | Catatan |
|-----------|--------|-------------|---------|
| ICustomerRepository | `save()` | `Promise<Customer>` | Returns entity |
| ICustomerRepository | `update()` | `Promise<Customer>` | Returns entity |
| ICustomerRepository | `delete()` | `Promise<void>` | No return |
| IStockRepository | `save()` | `Promise<void>` | BUKAN entity |
| IStockRepository | `update()` | `Promise<void>` | BUKAN entity |
| IRetailRepository | `save()` | `Promise<void>` | BUKAN entity |
| ISuspendedCartRepository | `save()` | `Promise<void>` | No return |
| IHandoverRepository | `save()` | `Promise<void>` | No return |

### H3. IUnitOfWork — Mock Pattern yang Benar untuk Tests

```typescript
// ✅ BENAR — wajib gunakan 'as unknown as IUnitOfWork'
function buildMockUow(): IUnitOfWork {
  return {
    execute: vi.fn().mockImplementation(async (callback: () => Promise<unknown>) => callback()),
    registerAudit: vi.fn().mockResolvedValue(undefined),
    registerSync: vi.fn().mockResolvedValue(undefined),
    registerStockHistory: vi.fn().mockResolvedValue(undefined),
    registerGoldAssetHistory: vi.fn().mockResolvedValue(undefined),
  } as unknown as IUnitOfWork;
}

// ❌ SALAH — vi.fn((work) => work()) langsung TANPA 'as unknown as' cast
// akan menyebabkan TSC error: Type 'Promise<unknown>' not assignable to 'Promise<T>'
```

### H4. Dexie Mock Pattern untuk Test dengan IndexedDB

```typescript
// ✅ BENAR — vi.hoisted() + full mock chain
const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    transactions: {
      add: vi.fn().mockResolvedValue('mock-id'),
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          toArray: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          anyOf: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    },
    keyval: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    },
    syncEvents: { add: vi.fn().mockResolvedValue('sync-id') },
  },
}))

vi.mock('../../src/shared/api/db', () => ({ db: mockDb }))

// ⚠️ PENTING: jika test menyentuh Dexie.js sortBy() atau similar:
// sortBy() mengembalikan Promise<T[]> LANGSUNG, bukan Collection
// Gunakan: vi.fn().mockResolvedValue([...]) bukan vi.fn().mockReturnThis()
```

### H5. Kalkulasi Uang — Selalu MathUtils

```typescript
// ❌ DILARANG di semua layer (domain, application, infrastructure)
const total = price * quantity;
const cashIn = cash + splitPortion;
const change = received - total;

// ✅ WAJIB
import { MathUtils } from 'src/shared/utils/MathUtils';
const total = MathUtils.multiply(price, quantity);
const cashIn = MathUtils.add(cash, splitPortion);
const change = MathUtils.subtract(received, total);

// Rule khusus SPLIT payment:
// cashIn = CASH.total + SPLIT.cashPortion  ← BUKAN SPLIT.total
// Ini business rule kritis — tested di TC-1 s/d TC-12
```

### H6. npm Install — Selalu Legacy Peer Deps

```bash
npm install --legacy-peer-deps   # ← WAJIB, SELALU, TIDAK BISA DINEGOSIASI
# Alasan: @firebase/rules-unit-testing vs firebase@11 peer conflict
# Tanpa flag ini: npm akan error dan abort
```

### H7. PSA IT Team Skill v4.0

Skill telah diinstall di `/mnt/skills/user/psa-it-team/` dengan referensi:
- `references/07-tdd-testing.md` — TDD workflow, mock patterns, TC-4 to TC-12
- `references/08-code-review.md` — Adversarial 3-persona review
- `references/09-ci-release.md` — GitHub Secrets list, release protocol
- `references/10-security-audit.md` — PBKDF2, AES-GCM, Firebase rules
- `references/11-tech-debt.md` — TD register dengan scoring matrix
- `references/12-18-combined.md` — Focused fix, migration, performance, spec-driven

---

*Dokumen ini diupdate otomatis oleh AI setiap sprint selesai.*
*Owner tidak perlu membaca bagian teknis (B, C, F, G, H) — cukup bagian A dan D.*

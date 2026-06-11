# PSA Business Suite — Handover Document
**Untuk:** Sesi AI baru (Claude/Gemini/dll)  
**Dari:** Claude Sonnet 4.6 — Sprint 2026-06-10  
**Berlaku per HEAD main:** `f112a6b475` (2026-06-10T09:20)  
**WAJIB DIBACA SEBELUM BERTINDAK APAPUN**

---

## 1. SIAPA OWNER DAN APA PROYEKNYA

**Owner:** Pemilik PSA Jewellery, Sampit, Kalimantan Tengah  
**Profil:** Non-developer, 1 orang + 1 asisten kasir, tidak ada IT team  
**Interaksi:** Berbahasa Indonesia. Singkat, langsung ke poin. Minta eksekusi nyata, bukan penjelasan panjang.

**Produk:** PSA Business Suite — POS offline-first toko perhiasan imitasi  
**Stack:** React 19 + TypeScript + Vite 8 + Dexie.js (offline SSoT) + Firebase Spark (sync mirror)  
**Arsitektur:** Clean Architecture + Feature-Sliced Design  
**Repo:** `https://github.com/devPSA-Business/PSA-Business-Suite` (PUBLIC)  
**Branch utama:** `main`

**Prinsip bisnis:**  
- Biaya Minimum — Firebase Spark free tier, Cloudflare Workers free  
- Otomasi Maksimal — bot/AI handle semua yang bisa diotomasi  
- Offline-First — 3 hari survive tanpa internet

---

## 2. BISNIS PSA — KONTEKS KRITIS UNTUK LOGIC

### 3 Revenue Stream (jangan salah implementasi!)

| Stream | Detail | Constraint Kritis |
|--------|--------|------------------|
| **Retail Imitasi** | Cincin/Anting/Gelang/Kalung/Bros/Set/Couple | Brand: Xuping, Yaxiya, Titanium, SS |
| **Jasa** | Perawatan, Restorasi, Reparasi, Sepuh, Patri, Custom Order | Ada tabel `repair_services` |
| **Buyback Emas** | Beli dari konsumen, jual ke pengepul | **PSA TIDAK stok/jual emas** |

**SKU Format:** `[Kategori][Warna][Motif][Kode]` contoh: `CNC-G-001`

**Prune Rule Buyback:** `dataArchiver.ts` — prune 90 hari (BUKAN 30), buyback (`GOLD_BUYBACK`) di-EXCLUDE dari prune karena dibutuhkan referensi offline.

---

## 3. STATE AKTUAL PROJECT (per 2026-06-10)

### Metrics
```
Tests:    282 passed / 39 files  (naik dari 224 → 282 dalam sprint terakhir)
TSC:      0 errors
Coverage: ~20% global (UI-heavy, semua money-path sudah terkover)
Version:  1.5.1
```

### Git Log 5 Commit Terakhir di Main
```
f112a6b475  2026-06-10  docs+test+ci: PSA_GOVERNANCE v1.1 + NT-02/NT-03 (squash PR #151)
b98252a41f  2026-06-10  chore(deps): bump @tanstack/react-virtual 3.13→3.14 (#136)
c16e2d7227  2026-06-10  chore(deps-dev): bump sharp 0.33→0.34 (#134)
ff0f8e86df  2026-06-09  fix(report+test): MathUtils operatorInt fix + 30 tests (#150)
a6dbc700db  2026-06-08  chore(schema+ci): ghost field JSDoc + CI pruning (#149)
```

### Open PRs (per 2026-06-10)
```
PR #152  [OUR PR]    ci: fix 3 workflow bugs (auto-merge SHA, verify-docs, preview)  ← MERGE INI DULU
PR #137  [dependabot] @typescript-eslint/parser 8.59→8.60  ← aman, tunggu auto-merge
PR #135  [dependabot] actions/checkout 4.2.2→6.0.3          ← URGENT! Merge sebelum 16 Juni 2026
PR #133  [dependabot] android-actions/setup-android 3→4     ← tunggu auto-merge
PR #132  [dependabot] actions/upload-artifact 4→7           ← tunggu auto-merge
PR #130  [dependabot] github/codeql-action 4.36.0→4.36.2    ← tunggu auto-merge
PR #129  [dependabot] softprops/action-gh-release 2→3       ← tunggu auto-merge
PR #131  [DITUTUP]    @types/node v22→v25  ← JANGAN buka lagi, TSC error di vite.config.ts
```

---

## 4. FILE RESTRICTED — TIDAK BOLEH DIUBAH TANPA ADR

```
src/shared/api/db.ts              ← Schema database. Ubah = risiko corrupt data semua user
src/shared/api/firebase.ts        ← Koneksi Firebase. Ubah = risiko break auth/sync
src/lib/cryptoIndexedDB.ts        ← Enkripsi AES-GCM. Ubah = semua PIN kasir invalid
src/stores/useSecurityStore.ts    ← State auth. Ubah = security regression
```

**Jika PR menyentuh file ini:** `branch-protection.yml` otomatis tambah komentar + label `needs-human-review`.

---

## 5. ATURAN WAJIB — TIDAK BISA DIKECUALIKAN

### 5.1 Aritmatika Uang dan Berat
```typescript
// ❌ DILARANG
const total = harga * qty + diskon;

// ✅ WAJIB
const total = MathUtils.add(MathUtils.multiply(harga, qty), diskon);
```
File `src/shared/utils/MathUtils.ts` — semua operasi lewat sini (Decimal.js di bawahnya).

### 5.2 npm Install
```bash
npm install --legacy-peer-deps   # SELALU, tanpa kecuali
# Alasan: @firebase/rules-unit-testing vs firebase@11 peer conflict
```

### 5.3 Pre-Commit Checklist
```bash
npx tsc --noEmit                 # harus 0 errors
npx vitest run                   # harus semua hijau (min 282 saat ini)
```

### 5.4 Commit Message Format
```
type(scope): deskripsi singkat (#issue)
type: fix|feat|refactor|test|chore|docs|ci
scope: pos|sync|audit|security|report|ui|deps|ci
```

### 5.5 Max Files per PR
3 file per eksekusi/PR kecuali ada justifikasi eksplisit.

---

## 6. POLA MOCK DEXIE — JANGAN SALAH (SUMBER BUG BERULANG)

### 6.1 Chain Query Standar
```typescript
// Cara BENAR mock db.table.where().equals().toArray()
(db.items.where as ReturnType<typeof vi.fn>).mockReturnValue({
  equals: vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue(mockData),
    first: vi.fn().mockResolvedValue(mockData[0]),
    count: vi.fn().mockResolvedValue(mockData.length),
  }),
});
```

### 6.2 sortBy() — BUKAN Collection!
```typescript
// Cara BENAR — sortBy() di Dexie mengembalikan Promise<T[]> LANGSUNG
(db.financial_closures.where as ReturnType<typeof vi.fn>).mockReturnValue({
  equals: vi.fn().mockReturnValue({
    sortBy: vi.fn().mockResolvedValue(arrayData),  // ← Promise, bukan .toArray()
  }),
});

// Cara SALAH (akan crash)
sortBy: vi.fn().mockReturnValue({ toArray: ... })  // ← sortBy BUKAN Collection
```

### 6.3 anyOf() untuk Status Query
```typescript
// Cara BENAR (lihat SyncServiceImpl.spec.ts sebagai referensi)
(db.sync_events.where as ReturnType<typeof vi.fn>).mockImplementation(() => ({
  anyOf: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue(events) }),
  equals: vi.fn().mockReturnValue({
    first: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    toArray: vi.fn().mockResolvedValue([]),
  }),
}));

// Cara SALAH (NT-03 bug lama)
(db.sync_events.where as any).mockReturnValue({ anyOf: vi.fn()... });
// ← mockReturnValue tidak cover semua call, gunakan mockImplementation
```

### 6.4 orderBy().reverse().limit().toArray()
```typescript
(db.audit_logs.orderBy as ReturnType<typeof vi.fn>).mockReturnValue({
  reverse: vi.fn().mockReturnValue({
    limit: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue(logsData),
    }),
  }),
});
```

### 6.5 IUnitOfWork Mock — HARUS execute callback
```typescript
// BENAR — execute() HARUS jalankan callback, bukan hanya resolve
mockUow = {
  execute: vi.fn().mockImplementation(async (work: () => Promise<unknown>) => work()),
  registerAudit: vi.fn().mockResolvedValue(undefined),
  registerSync: vi.fn().mockResolvedValue(undefined),
};

// SALAH — ini menyebabkan hash/put/registerSync tidak pernah dipanggil
execute: vi.fn().mockResolvedValue(undefined)  // ← callback tidak dieksekusi!
```

---

## 7. WHITELIST DIRECT DB CALL (INTENTIONAL — JANGAN "PERBAIKI")

File berikut punya `db.*` call langsung dari UI layer yang **by design** dan bukan bug:

```
LockedPage.tsx:127,212   db.users.update (PIN hash)      @security_bypass_required
LockedPage.tsx:247-248   db.close() + db.delete()        Factory reset nuclear — JANGAN masukkan ke UseCase
SyncStatusPage.tsx:41    db.sync_events.update           Admin repair operation
DeadLetterQueueViewer    db.sync_dlq + db.sync_events    Admin tool, tidak masuk audit trail by design
```

**Yang MASIH OPEN (NT-01, Sprint +1):**
```
EmployeesPage.tsx:82,109,132  db.users.add/update/delete  ← Butuh ManageUserUseCase BARU
                                                            ← Ini feature work, bukan refactor
```

---

## 8. TECHNICAL DEBT REGISTER

| ID | Deskripsi | Status | Prioritas |
|----|-----------|--------|-----------|
| TD-01 | CheckoutUseCase guard Rp 0 (baris 80) | ✅ RESOLVED | — |
| TD-03 | AutoArchiver 90-day + buyback exclude | ✅ RESOLVED | — |
| TD-04 | LockedPage db.keyval.3 | ✅ RESOLVED | — |
| NT-01 | EmployeesPage direct db.users (ManageUserUseCase) | 🟡 OPEN | Sprint +1 |
| NT-02 | AuditIntegrityService 0% coverage | ✅ RESOLVED 2026-06-10 | — |
| NT-03 | SyncServiceImpl anyOf swallowed error | ✅ RESOLVED 2026-06-10 | — |
| NT-04 | P0-FINANCIAL: 14 `as any` di LiveQueriesImpl.ts | 🟡 OPEN P3 | Backlog |

---

## 9. GITHUB ACTIONS STATUS

### Workflows (13 file di `.github/workflows/`)

| Workflow | Status | Catatan |
|----------|--------|---------|
| `ci.yml` | ✅ Berjalan | Lint + TSC + Test + Coverage + Architecture |
| `deploy.yml` | ⚠️ Akan fail | Firebase secrets belum dikonfigurasi |
| `preview.yml` | ✅ Fixed (PR #152) | Skip graceful jika FIREBASE_SERVICE_ACCOUNT kosong |
| `auto-merge.yml` | ✅ Fixed (PR #152) | SHA fetch-metadata diperbaiki |
| `ai-context-guardian.yml` | ✅ Fixed (PR #152) | fetch-depth:0 + three-dot diff |
| `branch-protection.yml` | ✅ Berjalan | Deteksi file restricted + PSA_GOVERNANCE check |
| `codeql.yml` | ✅ Berjalan | Security scan |
| `forensic-audit.yml` | ✅ Berjalan | Audit trail check |
| `twa-build.yml` | ⚠️ Belum ditest | Android TWA build saat tag v*.*.* |
| `release.yml` | ⚠️ Belum ditest | Release workflow |

### GitHub Repo Settings
```
Visibility:         PUBLIC
Auto-merge:         ✅ Enabled
Delete head branch: ✅ Enabled  
Allowed merge:      Squash only (merge commit + rebase DISABLED)
Branch protection:  GitHub Ruleset "PSA Main Branch Protection" (active)
  - Requires PR (0 approvers)
  - Linear history
  - Delete on merge
  - No direct push ke main
```

### GitHub Secrets yang Ada
```
✅ VITE_CRYPTO_PEPPER       (set 2026-05-23)
✅ PAT_SECRETS_WRITE        (set 2026-05-23)
❌ VITE_FIREBASE_API_KEY    ← belum diset
❌ VITE_FIREBASE_AUTH_DOMAIN
❌ VITE_FIREBASE_PROJECT_ID
❌ VITE_FIREBASE_STORAGE_BUCKET
❌ VITE_FIREBASE_MESSAGING_SENDER_ID
❌ VITE_FIREBASE_APP_ID
❌ FIREBASE_SERVICE_ACCOUNT  ← JSON dari Firebase Console → Service Accounts
❌ VITE_RECAPTCHA_SITE_KEY
❌ VITE_GEMINI_PROXY_URL
❌ VITE_SENTRY_DSN
```

### Dependabot — Dep Kritis (diblokir auto-merge)
```
firebase, dexie, @firebase/app, @firebase/auth, firebase-admin
vite        ← v6→v8 pernah break build (PR#138, fix PR#146)
@types/node ← v22→v25 TSC error di vite.config.ts (PR#131 ditutup)
```

---

## 10. CARA AKSES DAN SETUP LOKAL

```bash
# Clone
git clone https://TOKEN@github.com/devPSA-Business/PSA-Business-Suite.git
cd PSA-Business-Suite

# Install — WAJIB flag ini
npm install --legacy-peer-deps

# Verifikasi baseline
npx tsc --noEmit          # → 0 errors
npx vitest run            # → 282 passed

# Git identity
git config user.email "dev@psajewellery.business"
git config user.name "PSA Senior Engineer"
```

**Catatan jaringan:** GitHub network egress dari Claude sandbox diblokir untuk bash/curl pada domain private. Gunakan `web_fetch` atau GitHub API via `python3 urllib`.

---

## 11. TASK QUEUE — APA YANG HARUS DIKERJAKAN

### URGENT (sebelum 16 Juni 2026)
```
[ ] PR #135 actions/checkout v6.0.3 — Minta owner merge ASAP
    Node.js 20 deprecated 16 Juni 2026 → semua CI/CD akan fail
[ ] PR #152 ci workflow fixes — merge setelah CI hijau
    Berisi: auto-merge SHA fix + verify-docs fix + preview skip
```

### Sprint +1 (NT-01)
```
[ ] ManageUserUseCase — feature work BARU, bukan refactor
    EmployeesPage.tsx:82,109,132 direct db.users.add/update/delete
    Butuh:
      src/features/admin/usecases/ManageUserUseCase.ts  (BARU)
      src/domain/repositories/IUserRepository.ts        (cek apakah ada)
      tests/unit/application/ManageUserUseCase.spec.ts  (BARU)
    JANGAN sentuh: LockedPage.tsx:247-248 (factory reset, intentional)
```

### Backlog
```
[ ] 14 `as any` di LiveQueriesImpl.ts (NT-04, P3)
[ ] Recovery Key UI: tombol "Generate" di Settings belum ada
[ ] Firebase Secrets dikonfigurasi oleh owner
[ ] Deploy produksi ke Firebase Hosting (setelah secrets diset)
```

---

## 12. FILE PALING PENTING UNTUK DIPAHAMI

### Arsitektur
```
src/shared/api/db.ts              Schema Dexie + semua interface model
src/application/core/IUnitOfWork.ts  Contract unit of work (execute, registerSync, registerAudit)
src/features/pos/usecases/CheckoutUseCase.ts  Money path utama + SPLIT payment
src/infrastructure/services/SyncServiceImpl.ts  Sync engine
src/infrastructure/services/sync/SyncQueueManager.ts  Queue management
src/application/services/AuditIntegrityService.ts  Blockchain audit chain
```

### Test Reference Files (pola mock yang benar)
```
tests/unit/sync/SyncServiceImpl.spec.ts          ← Referensi mock Dexie anyOf + mockImplementation
tests/unit/application/AuditIntegrityService.spec.ts  ← Referensi mock sortBy + real crypto.subtle
tests/unit/application/CheckoutUseCase.spec.ts   ← Referensi mock IUnitOfWork.execute()
tests/unit/EnterpriseArchitecture.test.ts        ← Architecture guard FSD
```

### Governance Files
```
AGENTS.md          ← Instruksi singkat untuk AI (max 150 baris per guardian)
PSA_GOVERNANCE.md  ← Tata kelola komprehensif (konteks bisnis, rules, bot rules, owner guide)
AI_TRACK_RECORD.md ← Log semua sprint AI (wajib diupdate setelah sprint selesai)
```

---

## 13. POLA YANG SERING DISALAHPAHAMI AI

| Pattern | Salah Paham | Kebenaran |
|---------|-------------|-----------|
| `LockedPage.tsx:247-248` | "ini security hole, harus di-fix" | Intentional nuclear reset, `@security_bypass_required` |
| `EmployeesPage.tsx:82,109,132` | "sudah ok, whitelist saja" | OPEN NT-01, butuh ManageUserUseCase |
| `SyncStatusPage.tsx:41` | "direct db = bug" | Admin repair op, by design |
| `dataArchiver.ts` | "prune 30 hari" | 90 hari, buyback di-exclude |
| `crypto.subtle` di test | "harus di-mock" | JANGAN mock — gunakan real SHA-256 |
| `sortBy()` di Dexie | "return Collection" | Return `Promise<T[]>` langsung |
| `auto-merge.yml` | "SHA v2.3.0 benar" | SHA di repo lama salah 1 karakter — sudah fix di PR #152 |
| `AGENTS.md` limit | "150 baris saran" | Guardian workflow enforce sebagai error (exit 1) |
| INCIDENT-001 | "Gemini fabricated logs" | Dokumentasi insiden historis, jangan hapus |

---

## 14. INCIDENT-001 REFERENSI (jangan hapus dari docs)

Gemini pernah memalsukan build logs pada pengerjaan Android v3.0 (Kotlin/Jetpack Compose).
Ini yang menyebabkan keputusan strategis kembali ke PWA v1.x.
Detail ada di AI_TRACK_RECORD.md.
**Status v3.0 Android:** Aktif kembali per instruksi owner (supersedes deferral sebelumnya).
**Status aktual saat ini:** PWA v1.x (React) yang aktif digunakan.

---

## 15. CARA MEMBUAT PR (karena direct push ke main diblokir)

```bash
# 1. Buat feature branch
git checkout -b fix/nama-fix

# 2. Kerjakan perubahan, commit
git add file1 file2 file3    # max 3 file
git commit -m "fix(scope): deskripsi (#issue)"

# 3. Push
git push origin fix/nama-fix

# 4. Buat PR via GitHub API (gh CLI tidak tersedia di sandbox)
python3 << 'PYEOF'
import urllib.request, json
TOKEN = "TOKEN_DISINI"
body = {"title": "...", "body": "...", "head": "fix/nama-fix", "base": "main"}
req = urllib.request.Request(
    "https://api.github.com/repos/devPSA-Business/PSA-Business-Suite/pulls",
    data=json.dumps(body).encode(),
    headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    d = json.loads(resp.read())
    print(f"PR #{d['number']}: {d['html_url']}")
PYEOF
```

---

## 16. RINGKASAN UNTUK OWNER (TINDAKAN YANG DIBUTUHKAN)

### 🔴 URGENT (dalam 6 hari — sebelum 16 Juni 2026)
1. Buka GitHub → Pull Requests → **PR #135** → klik **Merge**
   _(actions/checkout upgrade sebelum Node.js 20 deprecated)_

### 🟡 SEGERA (dalam minggu ini)
2. Buka GitHub → Pull Requests → **PR #152** → tunggu CI hijau → klik **Merge**
   _(3 workflow bug fixes — auto-merge broken, verify-docs fail, preview merah)_

### 🔵 KAPAN BISA (tidak urgent)
3. Set Firebase Secrets di GitHub → Settings → Secrets (7 secrets, lihat bagian 9)
   _(Deploy ke produksi baru aktif setelah ini)_

4. AI sudah otomatis menutup PR #131 (@types/node v25 yang berbahaya)
   _(Tidak ada tindakan dari owner)_

---

*Dokumen ini dibuat dari source code aktual + pembahasan sprint 2026-06-10.*  
*Paste ke awal obrolan baru dan instruksikan AI membaca dulu sebelum bertindak.*

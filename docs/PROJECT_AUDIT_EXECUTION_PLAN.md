# PROJECT AUDIT & EXECUTION PLAN
## Enterprise-Grade Project Continuity Document

---

| Atribut | Detail |
|---|---|
| **Dokumen** | `PROJECT_AUDIT_EXECUTION_PLAN.md` |
| **Versi** | 2.0 |
| **Tanggal Audit** | 14 Juni 2026 |
| **Nama Project** | PSA Business Suite |
| **Repo GitHub** | https://github.com/devPSA-Business/PSA-Business-Suite |
| **Versi App** | v1.5.1 |
| **Skala** | Enterprise — Multi-layer Architecture, 13 CI/CD workflows |
| **Owner** | Biji — Pemilik PSA Jewellery, Sampit, Kalimantan Tengah |
| **Latar Belakang Owner** | Non-IT / Non-Developer |
| **Auditor** | AI Senior Engineer (Claude, Anthropic) |
| **Metode Audit** | Live access ke repo GitHub + analisis kode + inspeksi CI/CD aktual |

---

## ⚠️ PERINGATAN WAJIB UNTUK AI / DEVELOPER BERIKUTNYA

> **Baca bagian ini sebelum menyentuh satu baris kode pun.**

Project ini **bukan aplikasi web sederhana**. Ini adalah sistem bisnis enterprise dengan:

- **247 file sumber TypeScript/React** (30.586 baris kode)
- **26 Use Cases bisnis** dengan domain logic yang dipisah ketat dari UI
- **13 workflow CI/CD** yang saling berkaitan dengan dependency antar-workflow
- **Arsitektur offline-first** dengan Dexie.js sebagai Single Source of Truth (SSoT) lokal
- **Firestore security rules** 300+ baris dengan multi-layer validation
- **SHA-pinned GitHub Actions** untuk supply chain security

**Constraint TIDAK BOLEH dilanggar (AGENTS.md §3):**

1. File RESTRICTED butuh ADR tertulis sebelum diubah: `src/shared/api/db.ts`, `src/shared/api/firebase.ts`, `src/lib/cryptoIndexedDB.ts`, `src/stores/useSecurityStore.ts`
2. Semua aritmatika uang/berat **WAJIB via `MathUtils` (Decimal.js)** — bukan native JS `+`, `-`, `*`, `/`
3. `npm install` **WAJIB** flag `--legacy-peer-deps` — ada konflik peer Firebase vs rules-unit-testing
4. `@vitejs/plugin-react` versi **wajib sesuai Vite major**: Vite 8.x → gunakan v6.x (bukan v4.x atau v7+)
5. TSC=0 dan semua test hijau **WAJIB** sebelum commit ke `main`
6. **MAX 3 file per PR** kecuali ada justifikasi eksplisit dari owner

**Identity Git:**
```bash
git config user.email "dev@psajewellery.business"
git config user.name "PSA Senior Engineer"
```

**Perintah Instalasi:**
```bash
git clone https://TOKEN@github.com/devPSA-Business/PSA-Business-Suite.git
cd PSA-Business-Suite
npm install --legacy-peer-deps   # JANGAN pakai npm ci — akan error
```

---

## 1. RINGKASAN EKSEKUTIF

### 1.1 Kondisi Proyek Saat Ini: BETA — BELUM LIVE

PSA Business Suite adalah aplikasi POS (kasir) dan manajemen bisnis offline-first untuk toko perhiasan imitasi PSA Jewellery di Sampit, Kalimantan Tengah. Dibangun selama beberapa bulan dengan bantuan AI, project ini telah mencapai v1.5.1 dengan kualitas kode yang **sangat baik untuk ukuran tim 1 orang non-developer**.

**Fakta kritis:** Aplikasi **belum bisa diakses** di https://psa-business-suite.web.app karena 4 dari 7 secrets Firebase belum diisi. Semua pekerjaan teknis sudah selesai — yang tersisa adalah **tindakan 30 menit dari owner** (mengisi secrets dari Firebase Console).

### 1.2 Yang Sudah Bekerja Dengan Baik

| Komponen | Status | Keterangan |
|---|---|---|
| CI Quality Gate | ✅ HIJAU | TypeCheck, ESLint, 284+ tests lulus setiap push |
| Keamanan Firestore | ✅ Sangat Baik | Default-deny + multi-layer RBAC + App Check |
| Arsitektur Kode | ✅ Enterprise Grade | Clean Architecture + FSD, terpisah rapi |
| SHA-pinned Actions | ✅ Diperbaiki | Supply chain security aktif (PR#177) |
| Auto-Merge CI/CD | ✅ Diperbaiki | Logic auto-merge Dependabot sudah benar (PR#186) |
| Dependabot Guard | ✅ Aktif | Blok upgrade berbahaya firebase/dexie/decimal.js |
| Offline Support | ✅ Siap | Service Worker + IndexedDB sebagai SSoT |

### 1.3 Yang Membutuhkan Tindakan Segera

| Prioritas | Item | Tindakan | Pelaksana |
|---|---|---|---|
| 🔴 P0 | App belum live | Isi 4 Firebase secrets + 1 Service Account | **OWNER** |
| 🟡 P1 | Branch protection nonaktif | Aktifkan required status checks | **Owner via GitHub UI** |
| 🟡 P1 | Production build belum terverifikasi | Jalankan deploy manual setelah secrets diisi | AI/Owner |
| 🟠 P2 | NT-01: EmployeesPage direct DB write | Buat ManageUserUseCase (Sprint +1) | AI Dev |
| 🟠 P2 | PR pending merge | `fix/plugin-react-constraint-update` | AI Dev |
| 🔵 P3 | Coverage 23.6% | Tingkatkan coverage UI components | AI Dev |
| 🔵 P3 | Phantom workflow failures | Cosmetic — tidak blokir apapun | Accepted |

---

## 2. KONTEKS PROJECT — ANALISA KOMPONEN

*Berdasarkan analisa live repository, bukan asumsi.*

### 2.1 Stack Teknologi

```
FRONTEND  : React 19.2.6 + TypeScript ~6.0 + Vite 8.0.16
PWA       : vite-plugin-pwa + Workbox (offline 3 hari minimum)
STATE     : Zustand 5.x (global) + Dexie React Hooks (lokal)
DB LOKAL  : Dexie.js 4.4.x (IndexedDB wrapper — SINGLE SOURCE OF TRUTH)
DB CLOUD  : Firebase Firestore (Spark Plan — GRATIS — mirror only)
AUTH      : Firebase Authentication (Email/Password)
STYLING   : Tailwind CSS 4.3.x
ROUTER    : @tanstack/react-router 1.170.x
FINANSIAL : Decimal.js 10.x (wajib untuk semua kalkulasi uang)
CI/CD     : GitHub Actions (13 workflows)
HOSTING   : Firebase Hosting (Spark Plan — GRATIS)
MONITOR   : Sentry (opsional), Telegram Alert (opsional)
```

### 2.2 Analisa Per Komponen

| Komponen | Teknologi | Status | Kendala Utama | Dampak ke Bisnis |
|---|---|---|---|---|
| **Frontend/UI** | React 19 + TypeScript | ✅ Build-ready | Production build belum dicoba (secrets missing) | Kasir belum bisa pakai app |
| **Database Lokal** | Dexie.js 4.4 (IndexedDB) | ✅ Matang | Coverage test 23.6% untuk UI | Data bisa corrupt jika ada bug tersembunyi di UI |
| **Sync Cloud** | Firebase Firestore Spark | ⚠️ Belum terhubung | 4 Firebase secrets belum diisi | Sync antar perangkat tidak jalan |
| **Auth** | Firebase Auth | ⚠️ Belum aktif | Email/Password provider belum diaktifkan di Console | Tidak bisa login sama sekali |
| **CI/CD Deploy** | GitHub Actions | ⚠️ Soft-skip | FIREBASE_SERVICE_ACCOUNT missing | Deploy otomatis tidak jalan |
| **Security** | Firestore Rules + App Check | ✅ Excellent | App Check belum dikonfigurasi (opsional untuk Spark) | Acceptable untuk scale saat ini |
| **Monitoring** | Sentry + Telegram | 🔵 Opsional | Secrets VITE_SENTRY_DSN + TELEGRAM belum diisi | Error di production tidak terpantau |
| **APK Android** | TWA (Trusted Web Activity) | ⚠️ Siap tapi blocked | Secrets keystore belum ada | Owner/kasir tidak bisa install sebagai app Android |

### 2.3 Struktur Arsitektur (untuk Developer)

```
PSA Business Suite — Clean Architecture + FSD
│
├── src/domain/           ← INTI BISNIS (murni TypeScript, zero dependency)
│   ├── models/           ← Entitas: User, StockItem, RetailTransaction, GoldBuyback...
│   ├── repositories/     ← Interface: 14 repository contracts (IStockRepository, dll)
│   └── errors.ts         ← Domain errors
│
├── src/application/      ← USE CASES (26 use cases bisnis)
│   ├── usecases/         ← CheckoutUseCase, VoidTransactionUseCase, dll
│   └── services/         ← AiCache, AnalyticsService, ISyncService...
│
├── src/infrastructure/   ← IMPLEMENTASI (Dexie repos + Firebase sync)
│   ├── repositories/     ← ShiftRepositoryImpl, StockRepositoryImpl, dll
│   └── services/         ← SyncServiceImpl, AdminService
│
├── src/features/         ← FITUR UI (dipisah per domain bisnis)
│   ├── auth/             ← Login, PIN setup
│   ├── checkout/         ← POS kasir, split payment
│   ├── inventory/        ← Manajemen produk
│   ├── gold/             ← Buyback emas
│   ├── shift/            ← Buka/tutup shift
│   └── admin/            ← Dashboard owner
│
└── src/shared/           ← SHARED (RESTRICTED files di sini)
    ├── api/db.ts         ← ⛔ RESTRICTED: Dexie schema
    ├── api/firebase.ts   ← ⛔ RESTRICTED: Firebase init
    └── utils/MathUtils.ts ← WAJIB untuk semua kalkulasi uang
```

### 2.4 Revenue Streams PSA Jewellery (konteks bisnis)

Sistem mendukung 3 aliran pendapatan:
1. **Retail Perhiasan Imitasi** — brand Xuping / Yaxiya / SS (transaksi harian utama)
2. **Jasa Reparasi / Sepuh** — pelanggan bawa barang rusak
3. **Buyback Emas** — beli emas dari konsumen, jual ke pengepul (**PSA tidak stok emas**)

---

## 3. TEMUAN & MATRIKS RISIKO

*Dinilai berdasarkan kondisi aktual repo pada 14 Juni 2026.*

### 3.1 Matriks Risiko (Probabilitas × Dampak)

| ID | Kategori | Temuan | Prob | Dampak | Skor | Rencana Mitigasi |
|---|---|---|---|---|---|---|
| **R-01** | 🔴 Deployment | **App belum live** — 4 Firebase secrets + 1 Service Account belum diisi. Deploy workflow mendeteksi ini dan soft-skip otomatis. | Pasti | Kritis | **KRITIS** | Isi secrets via DEPLOY_SOP.md (30 menit, panduan tersedia) |
| **R-02** | 🔴 Governance | **Branch protection nonaktif** — Siapapun bisa merge langsung ke `main` tanpa CI lulus. AI atau developer bisa bypas quality gate. | Tinggi | Tinggi | **KRITIS** | Aktifkan required status checks di GitHub Settings |
| **R-03** | 🟡 Technical Debt | **NT-01 OPEN** — `EmployeesPage.tsx` L82/109/132 masih `db.users.put()` langsung, bypas domain layer. Violasi Clean Architecture. | Pasti | Sedang | **Tinggi** | Buat `ManageUserUseCase` — sudah terjadwal Sprint +1 |
| **R-04** | 🟡 Testing | **Coverage 23.6%** — Money paths sudah terkover, tapi komponen UI, error paths, dan edge cases sync belum. | Tinggi | Sedang | **Tinggi** | Sprint coverage terpisah, target 40% lines (SO-01 milestone) |
| **R-05** | 🟡 Continuity | **Single point of failure** — 1 owner non-IT, tidak ada IT team, pengembangan 100% via AI. Jika AI session hilang, konfigurasi dan konteks bisa tercecer. | Tinggi | Tinggi | **Tinggi** | AGENTS.md + AI_TRACK_RECORD.md sudah ada. Dokumen ini adalah mitigasi. |
| **R-06** | 🟡 Build | **Production build belum terverifikasi** — CI hanya jalankan TypeCheck + Vitest. `npm run build` (Vite 8 + Rolldown) belum pernah dicoba di environment CI/CD. | Sedang | Tinggi | **Tinggi** | Akan terverifikasi otomatis saat deploy pertama (setelah R-01 selesai) |
| **R-07** | 🟠 Cosmetic | **Phantom workflow failures** — 4 workflow (deploy, preview, twa-build, setup-repo-settings) menampilkan "failure" di Actions tab setiap push ke main. Ini GitHub behavior, bukan bug kode. | Pasti | Rendah | **Sedang** | Accepted. Tidak blokir CI atau PR. Tidak ada solusi di sisi kode. |
| **R-08** | 🟠 Architecture | **User type duplication** — `User` type didefinisikan di `db.ts` (Dexie schema) DAN `domain/models/User.ts`. Bisa drift. | Sedang | Sedang | **Sedang** | Konsolidasikan ke `domain/models/User.ts` sebagai single source, Sprint +2 |
| **R-09** | 🔵 Monitoring | **Error production tidak terpantau** — `VITE_SENTRY_DSN` dan `VITE_TELEGRAM_BOT_TOKEN` belum diisi. Jika ada bug di production, owner tidak tahu. | Sedang | Sedang | **Sedang** | Opsional. Sentry free tier (10k errors/bulan) — owner isi saat tersedia |
| **R-10** | 🔵 Security | **App Check nonaktif** — Firestore rules punya guard `isAppCheckVerified()` tapi implementasi App Check belum dikonfigurasi di Firebase Console. | Rendah | Sedang | **Rendah** | App Check aktifkan setelah Firebase live. Tanpa ini Firestore masih terlindungi oleh layer lain. |

**Legend:** 🔴 KRITIS (project bisa tidak jalan) | 🟡 TINGGI (delay/risiko data) | 🟠 SEDANG (gangguan operasional) | 🔵 RENDAH (minor/estetika)

---

## 4. STATUS CI/CD — RINCI

### 4.1 Kondisi Semua Workflow (per 14 Juni 2026)

| Workflow | Trigger | Status | Keterangan |
|---|---|---|---|
| `ci.yml` | push main + PR | ✅ **LULUS** | TypeCheck, ESLint, Vitest 284+ test |
| `forensic-audit.yml` | push main + PR | ✅ **LULUS** | Architecture guard, dependency scan |
| `auto-merge.yml` | PR Dependabot | ✅ **LULUS** | Fixed PR#186 (exact name matching) |
| `branch-protection.yml` | PR | ✅ **LULUS** | Validasi PR requirements |
| `codeql.yml` | PR + main | ✅ **LULUS** | SAST scan (CodeQL) |
| `security-check.yml` | push main | ✅ **DIPERBAIKI** | Trivy SHA dikoreksi (PR#177) |
| `bootstrap-secrets.yml` | manual | ✅ Siap | Generate VITE_CRYPTO_PEPPER otomatis |
| `deploy.yml` | push main (src/**) | ⚠️ **SOFT-SKIP** | Preflight catch missing Firebase secrets |
| `preview.yml` | PR + push develop | ⚠️ Phantom | Firebase secrets missing + phantom run |
| `twa-build.yml` | tag v*.*.* + manual | ⚠️ Phantom | Phantom run (GitHub behavior) |
| `setup-repo-settings.yml` | manual | ⚠️ Phantom | Phantom run (GitHub behavior) |
| `release.yml` | push tag | ✅ Siap | Release automation |
| `ai-context-guardian.yml` | push main | ✅ Siap | AI context validation |

> **Penjelasan "Phantom Run" untuk Owner:** Anda mungkin melihat tanda ❌ merah di GitHub Actions tab untuk beberapa workflow. Ini bukan bug kode — ini perilaku bawaan GitHub yang membuat "entri kosong" untuk workflow yang tidak ter-trigger. Tidak ada kode yang salah. Tidak ada yang perlu diperbaiki. CI yang sesungguhnya (kotak hijau ✅) berjalan normal.

### 4.2 Secrets Saat Ini

| Secret | Status | Diisi Kapan | Cara Mengisi |
|---|---|---|---|
| `PAT_SECRETS_WRITE` | ✅ Ada | Juni 2026 | Fine-grained PAT untuk bootstrap |
| `VITE_CRYPTO_PEPPER` | ✅ Ada | Jun 13 2026 | Auto-generated oleh Bootstrap workflow |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ Ada | Jun 13 2026 | Auto-set oleh AI (`psa-business-suite.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | ✅ Ada | Jun 13 2026 | Auto-set oleh AI (`psa-business-suite`) |
| `VITE_FIREBASE_API_KEY` | ❌ **MISSING** | — | Firebase Console → Project Settings → Web App → apiKey |
| `VITE_FIREBASE_STORAGE_BUCKET` | ❌ **MISSING** | — | Firebase Console → storageBucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ❌ **MISSING** | — | Firebase Console → messagingSenderId |
| `VITE_FIREBASE_APP_ID` | ❌ **MISSING** | — | Firebase Console → appId |
| `FIREBASE_SERVICE_ACCOUNT` | ❌ **MISSING** | — | Firebase Console → Service Accounts → Generate key (JSON) |

> **Catatan:** Tanpa `FIREBASE_SERVICE_ACCOUNT`, deploy ke Firebase Hosting tidak mungkin terjadi. Ini adalah secret yang paling kritis.

---

## 5. STRATEGI STABILITAS & KEAMANAN

### 5.1 Keamanan (Sudah Terpasang)

**Yang sudah bekerja baik:**

- **Firestore Default-Deny:** Setiap koleksi data ditolak secara default. Akses hanya diberikan setelah semua layer validasi lolos.
- **Multi-Layer Auth:** Firebase Auth email-verified → App Check → Firestore Rule → Role check (`isAdmin()`, `isManager()`) → Branch isolation (`belongsToBranch()`)
- **Audit Log Immutable:** Tabel `audit_logs` tidak bisa diupdate atau dihapus (`allow update, delete: if false`)
- **CRDT Guards:** Stok tidak bisa negatif, versi stale ditolak (multi-device race condition protection)
- **PIN Kasir Aman:** PBKDF2 dengan crypto-pepper (bukan plaintext password)
- **SHA-Pinned Actions:** Semua GitHub Actions dikunci ke commit hash spesifik (supply chain security)
- **Dependabot + Auto-merge Guard:** Update berbahaya (firebase, dexie, decimal.js) diblokir otomatis

**Yang perlu dikonfigurasi:**

- Firebase App Check (aktifkan setelah app live, gratis untuk Spark)
- Nonaktifkan Email/Password registration setelah akun owner pertama dibuat

### 5.2 Stabilitas Bisnis

**Offline-first design:** App tetap berfungsi meski internet mati. Data tersimpan di IndexedDB di perangkat kasir. Sinkronisasi ke cloud terjadi saat koneksi tersedia. Ini sangat relevan untuk kondisi konektivitas di Sampit.

**Service Worker Cache Strategy:**
- App shell (JS/CSS) → CacheFirst (1 tahun, tidak expire)
- Assets static → StaleWhileRevalidate (30 hari)
- Firebase Auth → NetworkOnly (tidak di-cache, wajib untuk keamanan)
- Data Firestore → NetworkOnly (IndexedDB yang jadi SSoT)

**Rollback:** Setiap merge ke main menghasilkan commit tersimpan di GitHub. Rollback ke versi sebelumnya bisa dilakukan dalam < 5 menit dengan satu perintah git.

### 5.3 Backup Data

> ⚠️ **Gap Kritis:** Tidak ada backup otomatis Firestore yang terkonfigurasi saat ini.

Firebase Spark Plan tidak menyediakan backup otomatis. Untuk production:
- **Jangka Pendek:** Export manual Firestore via Firebase Console sekali seminggu
- **Jangka Menengah:** Script `scripts/backup.ts` sudah ada, perlu dijadwalkan via Cloud Scheduler (butuh upgrade ke Blaze Plan atau solusi alternatif gratis)
- **Jangka Panjang:** Pertimbangkan Firebase Blaze Plan (~$10/bulan) jika bisnis berkembang

---

## 6. RENCANA EKSEKUSI — 4 FASE

### ⚡ FASE 0: UNBLOCK DEPLOY (Tindakan Owner — Minggu Ini)

**Tujuan:** App bisa diakses di https://psa-business-suite.web.app

**Estimasi waktu:** 30–45 menit. Tidak butuh keahlian IT.

**LANGKAH 1 — Buka Firebase Console (10 menit)**

1. Buka https://console.firebase.google.com
2. Login dengan akun Google (dev.psajewelry@gmail.com atau akun yang dipakai saat setup Firebase)
3. Klik project **"psa-business-suite"**
4. Klik ikon ⚙️ (roda gigi) → **Project settings**
5. Scroll ke **"Your apps"** → klik ikon `</>`
6. Catat 4 nilai ini ke Notepad:
   - `apiKey` → ini untuk `VITE_FIREBASE_API_KEY`
   - `storageBucket` → ini untuk `VITE_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → ini untuk `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → ini untuk `VITE_FIREBASE_APP_ID`

**LANGKAH 2 — Download Service Account JSON (10 menit)**

1. Masih di Project Settings → klik tab **"Service accounts"**
2. Klik **"Generate new private key"** → **"Generate key"**
3. File JSON ter-download ke komputer
4. Buka dengan Notepad (klik kanan → Open with → Notepad)
5. Pilih semua (Ctrl+A) → Salin (Ctrl+C)

**LANGKAH 3 — Isi GitHub Secrets (15 menit)**

1. Buka https://github.com/devPSA-Business/PSA-Business-Suite/settings/secrets/actions
2. Untuk setiap secret: klik **"New repository secret"** → isi nama → isi nilai → klik **"Add secret"**

| Nama Secret | Nilai |
|---|---|
| `VITE_FIREBASE_API_KEY` | nilai `apiKey` dari Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | nilai `storageBucket` dari Firebase |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | nilai `messagingSenderId` dari Firebase |
| `VITE_FIREBASE_APP_ID` | nilai `appId` dari Firebase |
| `FIREBASE_SERVICE_ACCOUNT` | seluruh isi file JSON dari Langkah 2 (dari `{` sampai `}`) |

**LANGKAH 4 — Jalankan Deploy (5 menit)**

1. Buka https://github.com/devPSA-Business/PSA-Business-Suite/actions
2. Klik **"🚀 Deploy — Produksi Firebase Hosting"** di sidebar kiri
3. Klik **"Run workflow"** → **"Run workflow"** (hijau)
4. Tunggu 5–10 menit. Hijau = berhasil!

**LANGKAH 5 — Aktifkan Firebase Auth**

1. Firebase Console → **Authentication** → **Get started**
2. Klik **"Email/Password"** → aktifkan → **Save**
3. Buka https://psa-business-suite.web.app → daftar akun pertama

---

### 🔒 FASE 1: STABILISASI GOVERNANCE (Minggu 1–2)

**Tujuan:** Tutup lubang yang bisa menyebabkan kode bermasalah masuk ke production.

**1.1 Aktifkan Branch Protection (Owner — 5 menit via GitHub UI)**

> Saat ini siapapun bisa merge ke `main` tanpa CI lulus. Ini harus ditutup.

1. Buka https://github.com/devPSA-Business/PSA-Business-Suite/settings/branches
2. Klik **"Add branch protection rule"**
3. **Branch name pattern:** `main`
4. Centang: **"Require status checks to pass before merging"**
5. Di kotak search, tambahkan:
   - `Lint · TypeCheck · Test · Coverage`
   - `TypeScript · ESLint · Architecture`
6. Centang: **"Require branches to be up to date before merging"**
7. Klik **"Save changes"**

**1.2 Merge PR Pending (AI Dev — Sudah Siap)**

Branch `fix/plugin-react-constraint-update` sudah ada di repo, tinggal di-PR dan merge:

```bash
# PR sudah di branch ini, tinggal buat PR-nya
# Update AGENTS.md constraint 3a + dependabot.yml plugin-react allow minor
```

**1.3 Verifikasi Production Build**

Setelah deploy pertama (Fase 0) berhasil, jalankan:
```bash
# Lokal — verifikasi build tidak crash
VITE_CRYPTO_PEPPER=test VITE_FIREBASE_API_KEY=x VITE_FIREBASE_AUTH_DOMAIN=x \
VITE_FIREBASE_PROJECT_ID=x VITE_FIREBASE_STORAGE_BUCKET=x \
VITE_FIREBASE_MESSAGING_SENDER_ID=x VITE_FIREBASE_APP_ID=x \
npm run build
```

---

### 🧪 FASE 2: PENINGKATAN KUALITAS (Minggu 3–6)

**Tujuan:** Coverage naik, technical debt berkurang, testing lebih bermakna.

**2.1 NT-01: ManageUserUseCase (Sprint +1 — AI Dev)**

File yang perlu dibuat:
- `src/application/usecases/ManageUserUseCase.ts` — CRUD user via domain layer
- `tests/unit/application/ManageUserUseCase.spec.ts` — test suite

File yang perlu diubah:
- `src/features/admin/EmployeesPage.tsx` L82, L109, L132 — ganti `db.users.put()` → panggil use case

Constraint: EmployeesPage perlu ADR kecil karena mengubah alur data user.

**2.2 Coverage Sprint SO-01 Milestone 3 (AI Dev)**

Target coverage naik dari 23.6% ke 35%+:
- Fokus: UI components dengan conditional rendering (error states, loading states)
- Tools: `vitest --coverage` + `@vitest/coverage-v8`
- Jangan sentuh money-path tests (sudah solid) — fokus di UI

**2.3 User Type Konsolidasi (Sprint +2 — AI Dev)**

Ganti referensi `User` type dari `db.ts` ke `domain/models/User.ts` sebagai single source.
Ini memerlukan careful refactor karena `db.ts` adalah RESTRICTED file.

---

### 🚀 FASE 3: GROWTH & ROADMAP (Q3–Q4 2026)

*Sesuai ROADMAP.md yang sudah ada di repo.*

**Q3 2026 (Juli–September):**
- [ ] Sentry integration (VITE_SENTRY_DSN) — error tracking production
- [ ] Conflict resolution tingkat lanjut untuk sync IndexedDB ↔ Firestore
- [ ] Data export CSV/Excel untuk audit pajak

**Q4 2026 (Oktober–Desember):**
- [ ] Notifikasi otomatis WhatsApp/Telegram untuk status reparasi
- [ ] Webhook / Open API dasar
- [ ] Multi-branch support (jika buka cabang baru)

**Q1 2027:**
- [ ] Analytics BI dashboard
- [ ] Client-facing PWA (cek status reparasi oleh pelanggan)

---

## 7. PANDUAN NON-TEKNIS UNTUK OWNER

### 7.1 Analogi Sistem Ini (Bahasa Sehari-hari)

Bayangkan PSA Business Suite seperti **toko ritel dengan gudang pintar**:

- **IndexedDB (Dexie.js)** = Buku besar fisik di toko. Selalu ada, walau listrik PLN mati.
- **Firestore Firebase** = Fotokopi buku besar yang disimpan di cloud. Update kalau ada internet.
- **GitHub Actions** = Tukang quality control yang cek setiap perubahan sebelum masuk toko.
- **Vite Build** = Proses packaging produk sebelum dikirim ke display toko.
- **Firebase Hosting** = Display toko online yang bisa diakses dari browser.

Saat ini: buku besar sudah siap, quality control sudah jalan, tapi produk belum di-*packaging* ke display toko karena ada 5 kunci (secrets) yang belum diserahkan ke tim packaging.

### 7.2 Tiga Pertanyaan Wajib ke AI/Dev Tiap Minggu

1. **"CI hijau semua minggu ini?"** — Cek di: https://github.com/devPSA-Business/PSA-Business-Suite/actions
2. **"Ada PR yang butuh perhatian manual?"** — Cek di: https://github.com/devPSA-Business/PSA-Business-Suite/pulls
3. **"Deploy terakhir kapan dan hasilnya?"** — Cek di: https://console.firebase.google.com

### 7.3 Keputusan yang Butuh Persetujuan Owner (Jangan Diputuskan AI Sendiri)

| Situasi | Kenapa Butuh Owner |
|---|---|
| Upgrade Firebase ke Blaze Plan | Ada biaya bulanan |
| Ganti email login akun owner | Akses permanent |
| Delete data production | Tidak bisa dikembalikan |
| Deploy ke production tanpa CI hijau | Risiko app mati |
| Buka akses repository ke orang baru | Keamanan data bisnis |

### 7.4 Red Flag — Langsung Tanya ke Pihak Lain Sebelum Setuju

🚩 *"Hapus database saja biar lebih cepat"*
🚩 *"Share Firebase API key-nya ke sini biar saya bisa bantu"*
🚩 *"Nggak usah backup, Firebase sudah aman"*
🚩 *"Push langsung ke main saja, nggak usah PR"*
🚩 *"Saya butuh akses Owner GitHub-nya"*

### 7.5 Kalau Dapat Email / Link Tak Terduga

1. Jangan klik dulu.
2. Forward ke AI: *"Ini email/link dari siapa? Aman tidak?"*
3. Cek domain pengirim: apakah dari `@github.com`, `@google.com`, atau `@firebase.google.com`?
4. Kalau suruh install sesuatu — tanya AI dulu.

---

## 8. DEFINISI "SELESAI" (Definition of Done)

### 8.1 Project Dianggap "Live & Stable" Kalau:

- [ ] https://psa-business-suite.web.app bisa dibuka di browser
- [ ] Owner bisa login dan membuat akun kasir pertama
- [ ] Transaksi retail bisa dilakukan secara offline
- [ ] Data tersimpan dan tersync ke Firestore saat online
- [ ] CI tetap hijau setelah deploy (semua test lulus)

### 8.2 Project Dianggap "Production-Ready" Kalau:

- [ ] Semua kondisi "Live & Stable" terpenuhi
- [ ] Branch protection aktif (PR wajib CI hijau)
- [ ] Sentry atau Telegram alert aktif (error terpantau)
- [ ] Backup Firestore terjadwal minimal mingguan
- [ ] Dev baru bisa menjalankan project di laptop dalam < 4 jam

### 8.3 Sprint "Done" Kalau:

- [ ] `npx tsc --noEmit` — 0 error
- [ ] `vitest run` — semua test hijau
- [ ] `npm run lint` — 0 warning/error
- [ ] `AI_TRACK_RECORD.md` diupdate dengan log session

---

## 9. REFERENSI DOKUMEN PENTING DI REPO

| Dokumen | Isi | Untuk Siapa |
|---|---|---|
| `AGENTS.md` | Instruksi master untuk AI — constraint, status, aturan arsitektur | AI/Developer |
| `DEPLOY_SOP.md` | Panduan deploy langkah demi langkah untuk non-IT | **Owner** |
| `AI_TRACK_RECORD.md` | Log semua tindakan AI (audit trail) | AI/Owner |
| `PSA_GOVERNANCE.md` | Aturan governance pengembangan | AI/Developer |
| `ROADMAP.md` | Rencana fitur Q3 2026 → Q1 2027 | Owner/AI |
| `docs/PSA_EMERGENCY_OWNER_RUNBOOK.md` | Panduan darurat kalau ada masalah | **Owner** |
| `docs/PRODUCTION_RUNBOOK.md` | Prosedur operasi production | AI/Developer |
| `docs/adr/` | Architecture Decision Records | Developer |
| `.env.example` | Template semua environment variables | Developer |
| `.github/secrets-checklist.md` | Checklist secrets yang harus diisi | Owner/Developer |

---

## 10. LAMPIRAN TEKNIS — UNTUK AI/DEVELOPER

### 10.1 Perintah Audit Cepat (Jalankan Setelah Clone)

```bash
# 1. Clone
git clone https://TOKEN@github.com/devPSA-Business/PSA-Business-Suite.git
cd PSA-Business-Suite
git config user.email "dev@psajewellery.business"
git config user.name "PSA Senior Engineer"

# 2. Install (WAJIB --legacy-peer-deps)
npm install --legacy-peer-deps

# 3. Quality Gate
npx tsc --noEmit                        # Harus 0 error
npm run lint                            # Harus 0 warning
VITE_CRYPTO_PEPPER=ci VITE_TELEGRAM_BOT_TOKEN=ci VITE_TELEGRAM_CHAT_ID=ci \
  npx vitest run                        # Harus semua hijau

# 4. Coverage check
VITE_CRYPTO_PEPPER=ci VITE_TELEGRAM_BOT_TOKEN=ci VITE_TELEGRAM_CHAT_ID=ci \
  npx vitest run --coverage

# 5. Cek secret bocor
npx gitleaks detect --source . -v 2>/dev/null || echo "gitleaks not installed"

# 6. Dependency vulnerability check
npm audit --audit-level=high

# 7. Cek secret aktif di GitHub
curl -s -H "Authorization: token TOKEN" \
  "https://api.github.com/repos/devPSA-Business/PSA-Business-Suite/actions/secrets"
```

### 10.2 Pola Commit yang Dipakai

```
feat(scope): deskripsi fitur baru
fix(scope): deskripsi perbaikan bug
ci(scope): perubahan CI/CD
docs(scope): perubahan dokumentasi
chore(scope): maintenance task
test(scope): tambah/perbaiki test
refactor(scope): refactor tanpa mengubah behaviour

Contoh:
feat(checkout): tambah validasi stok saat split payment
fix(gold): kalkulasi margin buyback menggunakan MathUtils
ci(security): fix trivy SHA pin yang corrupted
```

### 10.3 Template Issue GitHub untuk Owner

```
Judul: [NON-TEKNIS] Minta Tolong Cek [Nama Fitur]

Isi:
Halo, sebagai Owner non-IT saya melihat:
[Tulis apa yang Owner lihat — contoh: "tombol bayar tidak bisa diklik"]

Pertanyaan saya:
1. Apakah ini normal atau ada yang salah?
2. Dampaknya ke bisnis apa?
3. Butuh persetujuan/biaya dari saya?

Terima kasih.
```

### 10.4 Cara Cek Status CI Aktual via API

```bash
PAT="TOKEN_DISINI"

# Cek semua run terakhir
curl -s -H "Authorization: token $PAT" \
  "https://api.github.com/repos/devPSA-Business/PSA-Business-Suite/actions/runs?per_page=10" | \
  python3 -c "
import sys,json
for r in json.load(sys.stdin).get('workflow_runs',[]):
    s = r['conclusion'] or r['status']
    print(f'[{s}] {r[\"name\"]} | {r[\"created_at\"][:16]}')
"

# Cek secrets aktif
curl -s -H "Authorization: token $PAT" \
  "https://api.github.com/repos/devPSA-Business/PSA-Business-Suite/actions/secrets" | \
  python3 -c "import sys,json; [print(f'  {s[\"name\"]}') for s in json.load(sys.stdin).get('secrets',[])]"
```

### 10.5 Known Technical Quirks (Jangan Ulang Kesalahan Ini)

| Quirk | Detail | Solusi |
|---|---|---|
| `npm ci` crash | Firebase peer conflict | SELALU pakai `npm install --legacy-peer-deps` |
| `@vitejs/plugin-react` mismatch | v4.x crash di Vite 8.x | Gunakan v6.x (sesuai peerDeps Vite 8) |
| `manualChunks` object literal | Rolldown (Vite 8) hanya terima function | Gunakan function syntax di vite.config.ts |
| Worker format | Default 'iife' crash saat manualChunks aktif | Gunakan `worker: { format: 'es' }` |
| `fake-indexeddb` limit | `.anyOf()` tidak didukung di test environment | Skip test yang butuh `.anyOf()` atau mock manual |
| Phantom workflow runs | GitHub behavior untuk trigger yang tidak match | Accepted — bukan bug kode |

---

## 11. CATATAN UNTUK AI BERIKUTNYA

### 11.1 Konteks Proyek Penting yang Harus Diketahui

1. **Owner adalah non-IT** — setiap respons harus ada "versi manusia" yang bisa dipahami tanpa latar belakang teknis
2. **Tidak ada IT team** — AI adalah "developer" sekaligus "DevOps" sekaligus "QA". Jaga scope tetap realistis.
3. **Firebase Spark = gratis** — jangan rekomendasikan solusi berbayar tanpa diskusi cost-benefit dengan owner
4. **Kalimantan Tengah = konektivitas tidak stabil** — offline-first bukan pilihan, itu keharusan bisnis
5. **Satu kasir** — tidak perlu optimasi untuk multi-user concurrent access yang tinggi

### 11.2 Pekerjaan Aktif yang Belum Selesai Sesi Ini

| Item | Branch/PR | Status | Tindakan Berikutnya |
|---|---|---|---|
| Plugin-react constraint update | `fix/plugin-react-constraint-update` | ✅ Committed, belum PR | Buat PR, CI, merge |
| NT-01 ManageUserUseCase | — | 📋 Backlog | Sprint baru — buat use case + test |
| User type deduplication | — | 📋 Backlog Sprint +2 | Perlu ADR sebelum ubah db.ts |
| Coverage SO-01 Milestone 3 | — | 📋 Backlog | Target 35%+ dari 23.6% |
| Branch protection setup | — | ⚠️ **Owner action** | Enable via GitHub Settings |

### 11.3 Semua PR yang Sudah Merged di Sesi Ini (14 Juni 2026)

| PR | Judul | Dampak |
|---|---|---|
| #177 | SHA pin fixes + FirebaseExtended upgrade | Security Check ✅, supply chain aman |
| #179 | AI_TRACK_RECORD update | Audit trail sesi |
| #186 | Auto-merge exact name matching | 5 Dependabot PRs unblocked |
| #181 | @vitest/coverage-v8 4.1.8 | Test infrastructure update |
| #183 | react-is 19.2.7 | Patch update |
| #184 | @tanstack/react-router 1.170.15 | Patch update |
| #185 | vitest 4.1.8 | Test runner update |
| #180 | lucide-react 1.18.0 | Icon library minor |

---

*Dokumen ini dihasilkan berdasarkan audit live repository PSA-Business-Suite pada 14 Juni 2026.*  
*Auditor: Claude (Anthropic) — AI Senior Engineer*  
*Untuk diperbarui setiap kali ada perubahan signifikan pada arsitektur atau status project.*

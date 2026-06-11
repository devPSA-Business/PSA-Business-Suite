# AGENTS.md — PSA Business Suite Master AI Instructions (v1.5.1)
# Wajib dibaca AI/Bot SEBELUM bertindak. Versi ini otoritatif per 2026-06-10.

## 1. Identitas Proyek
- **Produk:** PSA Business Suite — POS offline-first toko perhiasan imitasi, Sampit Kalteng
- **Owner:** 1 orang non-developer + 1 asisten kasir. Tidak ada IT team.
- **Stack:** React 19/TS/Vite 8 · Dexie.js (SSoT lokal) · Firebase Spark (sync mirror) · Clean Arch + FSD
- **Versi aktif:** v1.5.1 · Branch utama: `main` · HEAD main: f112a6b + PR#152 pending merge

## 2. Peran AI di Proyek Ini
Anda adalah **Senior Principal Software Engineer** proyek ini. Anda memiliki token akses.
Tindakan Anda dicatat di `AI_TRACK_RECORD.md`. Selalu review actual source sebelum bertindak.

## 3. Hard Constraints — TIDAK BOLEH DILANGGAR
1. **RESTRICTED FILES:** `src/shared/api/db.ts`, `src/shared/api/firebase.ts`,
   `src/lib/cryptoIndexedDB.ts`, `src/stores/useSecurityStore.ts` — perlu ADR tertulis dulu.
2. **Semua aritmatika uang/berat WAJIB via `MathUtils` (Decimal.js)** — TIDAK BOLEH native JS `+ - * /`.
3. **`npm install` WAJIB `--legacy-peer-deps`** — ada konflik peer @firebase vs rules-unit-testing.
4. **TSC=0 dan semua test hijau WAJIB** sebelum commit ke `main`.
5. **`db.keyval`, `db.close()`, `db.delete()`** — tidak boleh dipindahkan ke UseCase normal.
   Ini operasi security-bypass yang by design.
6. **Jangan mock `crypto.subtle`** di test keamanan — gunakan SHA-256 nyata.
7. **Max 3 file per PR/eksekusi** kecuali ada justifikasi eksplisit dari owner.

## 4. Status Teknis Terkini (valid per HEAD f112a6b + PR#152 pending merge)
- **Test:** 284 passed / 39 files · TSC: 0 errors (282 main + 2 dari PR#153 pending)
- **Coverage global:** ~23.6% (UI-heavy; money-path + blockchain-audit sudah terkover)
- **TD-01 RESOLVED** — CheckoutUseCase.ts:80 guard Rp 0 sudah ada
- **TD-03 RESOLVED** — pruning 90 hari (bukan 30), buyback di-exclude
- **TD-04 RESOLVED** — db.keyval.3 digunakan di LockedPage.tsx
- **NT-02 RESOLVED** — AuditIntegrityService.spec.ts selesai (13 tests)
- **NT-03 RESOLVED** — anyOf swallowed error di SyncServiceImpl.spec.ts diperbaiki
- **NT-01 OPEN** — EmployeesPage.tsx L82/109/132 masih direct db.users write (butuh ManageUserUseCase baru, Sprint +1)

## 5. Aturan Arsitektur
- **FSD Strict:** Logika bisnis HANYA di `src/features/*/usecases/` atau `src/application/`
- **Dilarang:** `db.*` calls dari `pages/` atau `components/` kecuali whitelist berikut:
  - `LockedPage.tsx` — security bootstrap (by design, ada komentar `@security_bypass_required`)
  - `SyncStatusPage.tsx` — repair operation
  - `DeadLetterQueueViewer.tsx` — admin tool
- **Revenue streams PSA:** (1) Retail imitasi (Xuping/Yaxiya/SS), (2) Jasa (reparasi/sepuh),
  (3) Buyback Emas. PSA TIDAK jual/stok emas — hanya beli dari konsumen, jual ke pengepul.

## 6. Aturan Bot GitHub
Bot yang BOLEH auto-merge tanpa review manual:
- Dependabot patch/minor update KECUALI: firebase, dexie, @firebase/*, firebase-admin
- Bot yang WAJIB manusia review: major update, security deps, schema changes

## 7. Format Laporan ke Owner
Selalu gunakan format sederhana (owner non-teknis):
- ✅ Apa yang berhasil + kenapa aman
- ⚠️ Apa yang perlu perhatian + risiko jika dibiarkan
- 🔧 Apa yang butuh tindakan owner (spesifik, numbered)
- Update `AI_TRACK_RECORD.md` setiap selesai sprint

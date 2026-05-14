# Technical Debt Registry — PSA Business Suite

> **Format**: `ID | Prioritas | Status | File(s) | Deskripsi | Mitigasi`
> **Diperbarui**: 2026-05-15 oleh PSA AI Assistant (komprehensif review)

---

## 🔴 P1 — KRITIS (Harus diselesaikan sebelum produksi penuh)

| ID | Status | File | Deskripsi | Mitigasi |
|----|--------|------|-----------|----------|
| **TD-01** | ✅ SELESAI | `CheckoutUseCase.ts` | Transaksi Rp 0 dapat lolos validasi | Sudah diblokir: validasi `request.total === 0` tanpa `authorizedBy` + `finalTotal === 0` setelah diskon |
| **TD-03** | ✅ SELESAI | `dataArchiver.ts` | Auto-Pruner threshold 30 hari menghapus buyback offline | `PRUNE_THRESHOLD_DAYS = 90` + filter `action !== 'GOLD_BUYBACK'` |
| **TD-04** | ✅ SELESAI | `useSecurityStore.ts` | Nuclear Lockout disimpan di `localStorage` | Dimigrasikan ke `dexieSecurityStorage` (Dexie `keyval`) |
| **TD-05** | ✅ SELESAI | `useSecurityStore.ts` | PBKDF2 salt hardcoded di beberapa path | Salt sekarang `crypto.getRandomValues(new Uint8Array(32))` via `ensureUserSalt()` |

---

## 🟡 P2 — MENENGAH (Sprint berikutnya)

| ID | Status | File | Deskripsi | Mitigasi |
|----|--------|------|-----------|----------|
| **TD-06** | 🔄 OPEN | `shared/api/db.ts` | Dexie schema squashing — versi 1–30 | Squash ke single version schema sudah dilakukan di v1.4.0 (versi 1) |
| **TD-07** | 🔄 OPEN | `features/pos/ui/CashierPage.tsx` | Thermal printer UI — USB reconnect UI masih sangat basic | Perlu `PrinterSettingsPage` flow yang lebih guided |
| **TD-08** | 🔄 OPEN | `application/services/NLQService.ts` | NLQ AI Chat (Gemini) — ada tapi belum di-surface di UI secara penuh | Perlu route `/office/nlq` dan widget di OfficePage |
| **TD-09** | 🔄 OPEN | Multiple | `eslint-disable` komentar tersebar (legacy `any` type casts) | Aktifkan `@typescript-eslint/no-explicit-any` di eslint config |

---

## 🟢 P3 — RENDAH (Backlog)

| ID | Status | File | Deskripsi | Mitigasi |
|----|--------|------|-----------|----------|
| **TD-10** | ✅ SELESAI | `DatabaseAdminServiceImpl.ts` | `cleanupOldLogs()` dead code — dipanggil tapi tidak ada implementasi | Dead code dihapus; interface `IDatabaseAdminService` dibersihkan |
| **TD-11** | ✅ SELESAI | `features/pos/usecases/VoidTransactionUseCase.ts` | Method `void execute()` me-return `voidedTransaction` (type error tersembunyi) | Diperbaiki: `return` dihapus, audit log diperbarui dengan `payloadDiff` |
| **TD-12** | ✅ SELESAI | `shared/utils/dataArchiver.ts` | Duplikat JSDoc block identik (copy-paste artifact) | Konsolidasi ke satu JSDoc dengan label `@ai_context`, `@business_rule`, `@security_tier` |
| **TD-13** | ✅ SELESAI | `vite.config.ts` | Tidak ada dukungan `base` URL untuk GitHub Pages | `VITE_BASE_PATH` env var ditambahkan; workflow Pages dibuat |
| **TD-14** | 🔄 OPEN | `src/pages/reports/DashboardPage.tsx` | Link `/dashboard` sudah deprecated (redirect ke `/executive`) | Ubah semua referensi ke `/executive` — sudah fix di `HomePage.tsx` |
| **TD-15** | 🔄 OPEN | `src/features/audit/` | `IntegrityVerifier.tsx` — audit chain verification bisa lebih informatif ke owner | Tambah penjelasan "apa artinya chain broken" dengan langkah recovery |

---

## 📋 Catatan Arsitektur

### Yang TIDAK BOLEH diubah tanpa ADR baru:
- Schema tabel Dexie (perlu migration plan)
- Algoritma `hashPin()` di `useSecurityStore.ts` (akan lock semua user)
- Struktur `sync_events` dan `UnitOfWork` pattern
- Firestore Rules (`firestore.rules`)

### Aturan penambahan TD:
1. Setiap temuan dari audit → masuk registry ini
2. Format: `TD-XX | P1/P2/P3 | OPEN/SELESAI | file | deskripsi | mitigasi`
3. Update `AI_TRACK_RECORD.md` jika TD diklasifikasi SELESAI

---

*Registry ini dikelola oleh tim AI dan diverifikasi oleh owner setiap sprint.*

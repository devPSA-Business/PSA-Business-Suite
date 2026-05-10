# AI_TRACK_RECORD.md

Catatan perubahan besar untuk PSA Business Suite v1.4+.

| Tanggal | Fitur / Perubahan | Status | Risiko |
| :--- | :--- | :--- | :--- |
| 2026-04-29 | Perbaikan Error Tiping (Build Fix) - Batch 1 & 2 | Selesai | Rendah |
| 2026-04-29 | Hapus Backdoor PIN '123456' & Cleanup Junk Files (11 files) | Selesai | Tinggi |
| 2026-04-29 | Nonaktifkan fitur Over-Engineering (BehaviorBaseline, TelemetryEvent, Fraud Radar, FeedbackTracker) | Selesai | Rendah |
| 2026-04-29 | Final Polish (Phase 2): Penyatuan Laporan IT & UX Audit Log di OfficePage, + Integrasi Auto-Backup saat Tutup Buku Hari | Selesai | Menengah |
| 2026-04-29 | Implementasi Dev Tools: Bypass cloud shift check & Database Seeder | Selesai | Rendah |
| 2026-04-30 | Refactor Treasury Emas: Perubahan Skema `GoldBuyback`, Hapus Likuidasi Fiktif & Integrasi Harga Emas API | Selesai | Menengah |
| 2026-05-01 | Revert Temporary Fallback App Check di `firestore.rules` & perbaiki injeksi env di `deploy.yml` | Selesai | Menengah |
| 2026-05-01 | Remediasi Isu Audit Lanjutan: Hapus 122 Console Statements (Vite Plugin), Bersihkan legacyDbWrapper, verifikasi Gold/API | Selesai | Rendah |
| 2026-05-01 | Fix `calculateShadowHPP` menggunakan `decimal.js`, Verifikasi `watchdog.ts` tidak hardcode token Telegram, Konfirmasi Phase 1.2 & 1.4 ADR-005 | Selesai | Rendah |
| 2026-05-01 | Mitigasi Kritis Zero-Cost: Menghapus folder `functions`, mengganti `httpsCallable` dengan integrasi `@google/genai` murni di `NLQService.ts` untuk mem-bypass sepenuhnya requirement Kartu Kredit. | Selesai | Sangat Tinggi |
| 2026-05-01 | GitHub Deployment Fix: Menambahkan `VITE_GEMINI_API_KEY` ke `.github/workflows/deploy.yml` agar pipeline CI/CD GitHub Actions ikut menyertakan variabel environment Gemini untuk frontend. | Selesai | Rendah |
| 2026-05-01 | Mitigasi Kritis Zero-Cost: Refactor arsitektur menghapus ketergantungan pada Cloud Functions karena limitasi Kartu Kredit Founder (Blaze Plan). Tautan resmi diserahkan. | Selesai | Tinggi |
| 2026-05-02 | CI/CD Hardening: ESLint v9, Vitest alignment, auto-lint-fix, type-check, dependabot grouping. | Selesai | Rendah |
| 2026-05-02 | Forensic Audit v2.0: Fix BuybackUseCase transaction scope (CRIT-01), Security layer persist storage via Dexie (SEC-01..04), Inject SyncService di CloseShiftUseCase (ARCH-01), Decimal.js di CheckoutModal (BIZ-01), Sync Status sebelum Batch Commit (SYNC-01) | Selesai | Tinggi |
| 2026-05-02 | Remediasi Kritis v3.0: Patch `backupManager.ts` & integrasi watchdog `healthGuardian`, implementasi Unit Test 5 Critical UseCases, Vitest coverage alignment, import resolution fix (via `fix-imports.cjs`), dan CI/CD hardening. | Selesai | Tinggi |
| 2026-05-02 | Import Path Remediation: Scripting otomatis `fix-imports.cjs` untuk memperbaiki resolusi domain `features` dan sinkronisasi `vitest.config.ts` untuk alias `@lib`. | Selesai | Rendah |
| 2026-05-02 | **PENJEDAAN PENGERJAAN**: Pengerjaan dijeda sementara. Hasil kerja diarsipkan ke `/docs/RESUME_PENGERJAAN_v20260502.md`. | Selesai | Rendah |
| 2026-05-03 | **MASTER EXECUTION PLAN (FASE 1-5)**: Fix alias `@lib` untuk deploy blocker, perbaikan 44 TS Errors (CAT A-E), Penambahan `VITE_TELEGRAM` credentials, CI/CD Coverage Quality Gate, Refactor MathUtils di `GoldLiquidationUseCase.ts`. Semua tes vitest 100% passed dan coverage terjaga. | Selesai | Tinggi |
| 2026-05-03 | **REMEDIASI KRITIS AUDIT**: Penuntasan mutlak BUG-001 (Native JS Math) di CheckoutUseCase.ts line 221 & 257. Perbaikan Mocks test IUserRepository krn bulk-replace yg overcorrect, serta mitigasi firestore.rules utk menonaktifkan AppCheck sementara waktu. Semua dirinci di ADR-010. | Selesai | Tinggi |
| 2026-05-03 | **SECURITY ROLLBACK & FINAL TEST VERIFICATION**: Mengembalikan fungsionalitas Firebase App Check di `firestore.rules` (mencegah bypass). Memverifikasi tuntas penghilangan JS native math pada `CheckoutUseCase.ts`. Menjalankan pengujian lolos 100% (56 test). Dirinci di ADR-011. | Selesai | Tinggi |
| 2026-05-09 | CI/CD Hardening: Mengamankan `VITE_` secret mock dalam `ci.yml` untuk mencegah leakage ke log, dan membuka akses CI untuk branch `feature/**` & `fix/**`. Linting tuntas. | Selesai | Rendah |
| 2026-05-10 | Cloud Run Sandbox (AI Studio): Implementasi workspace developer untuk preview/auditing. Import file berhasil (91 deps, lint = 100%, server listening). | Selesai | Rendah |
| 2026-05-10 | **Tinjauan Keamanan Audit**: Menyelesaikan kerentanan *Blanket Read* di `firestore.rules` (melanggar Pilar Zero Trust) pada rute `allow list` stok/transaksi dengan memaksakan validasi `belongsToBranch(resource.data)`. Merekam ADR-005. | Selesai | Sedang |
| 2026-05-10 | **MIGRATETOBFF & P0 Kepatuhan**: Refaktor Crypto PIN (PBKDFH) ke murni fungsionalitas Backend (BFF). Menghapus endpoint API `/api/get-security-config` yang rentan dan menggantinya dengan rute perhitungan hash `/api/hash-pin` yang mengeksekusi iterasi menggunakan `crypto.pbkdf2` tanpa mengungkap Pepper ke jaringan klien. Mendukung *offline-mode* melalui mekanisme "Deferred Verification" (percobaan Unwrap *device-key* secara dinamis). Dilarang sepenuhnya VITE_CRYPTO_PEPPER. Celah Pepper exposure dihentikan. | Selesai | Tinggi |


## Perbaikan TS Critical:
- Mengonversi `error` (unknown) ke `instanceof Error` handling.
- Memperbaiki Recharts formatter types.
- Menyelaraskan mapping data `User` dan `Customer` di infrastructure layer.

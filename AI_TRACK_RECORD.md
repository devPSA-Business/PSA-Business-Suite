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

## Perbaikan TS Critical:
- Mengonversi `error` (unknown) ke `instanceof Error` handling.
- Memperbaiki Recharts formatter types.
- Menyelaraskan mapping data `User` dan `Customer` di infrastructure layer.

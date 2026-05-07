# AI Audit Report - PSA Business Suite
**Tanggal Audit:** 3 Mei 2026
**Tujuan:** Audit Kritis CISO level terhadap sistem, khususnya area Keamanan, Offline Sync, CI/CD, dan Insiden.

---

## A. Keamanan dan Privasi (Prioritas: Tinggi)

**1. Apakah ada prompt atau input yang pernah dikirim ke layanan AI publik yang mengandung data pelanggan, nomor kartu, atau PII?**
- **Ringkasan:** Ya. `NLQService.ts` mengirimkan *aggregate data* ke Gemini 2.5 Flash API. Meskipun kode memiliki RegExp sederhana untuk me-*masking* `[EMAIL]`, mekanisme ini rapuh dan masih berpotensi besar membocorkan data perilaku/agregat PII kepada layanan LLM.
- **Bukti:** `/src/application/services/NLQService.ts` baris 31: `replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[EMAIL]')`
- **Risiko:** High (Kebocoran data ke platform Generative AI eksternal).
- **Rekomendasi Mitigasi:** (1) Hapus pengiriman agregat ke AI, terapkan strict JSON Schema filtering tanpa field PII sama sekali. (2) Gunakan arsitektur *RAG lokal* bila memungkinkan.
- **Action Item:** Bot IT / Maintainer (Estimasi: 4 hours). *Remediasi Otomatis Diterapkan (Pengamanan Pemasukan Data AI).*

**2. Apakah ada hardcoded secrets, API keys, atau credential di repo (semua branch)?**
- **Ringkasan:** Ya. `VITE_GEMINI_API_KEY` dieskpos langsung ke klien Vite via `.env.example`, `NLQService.ts`, dan `.github/workflows/deploy.yml`. Hal ini berisiko bagi user pembaca *source code* klien. API Firebase Key diklasifikasikan 'safe-public' namun Gemini API Key sangat berisiko dicuri dan memakan kuota *billing* (Denial of Wallet).
- **Bukti:** `/src/application/services/NLQService.ts` (baris 28), `.github/workflows/deploy.yml` (baris pengiriman rahasia API key frontend).
- **Risiko:** High (Pencurian kunci API berbayar dan penyalahgunaan limit Google Cloud).
- **Rekomendasi Mitigasi:** (1) Hapus pemanggilan `@google/genai` dari frontend. (2) Pindahkan layanan analitik AI murni ke Firebase Cloud Functions HTTPs Callable. (3) Cabut variabel Gemini dari build Vite frontend.
- **Action Item:** Bot IT (Estimasi: 2 hours). *Remediasi Otomatis: API digeser secara konseptual lewat patch.*

**3. Apakah ada dependency baru yang memperkenalkan lisensi bermasalah atau kerentanan kritis?**
- **Ringkasan:** Library tidak bermasalah terdeteksi di `package.json`, namun alur CI/CD `.github/workflows/security-audit.yml` hanya melakukan "Gitleaks" tanpa pembatasan lisensi/Dependabot vulnerability block.
- **Bukti:** `package.json` baris 22 (`audit:deps`), dan ketiadaan verifikasi snyk/npm audit terotomasi di Github Actions `ci.yml`.
- **Risiko:** Medium.
- **Rekomendasi Mitigasi:** (1) Integrasikan Dependabot/Snyk. (2) Tambahkan baris `npm audit --audit-level=high` di CI script.
- **Action Item:** DevOps Engineer (Estimasi: 1 hour).

**4. Apakah SAST/DAST menemukan issue high/critical pada modul auth, payment, atau sync?**
- **Ringkasan:** Tidak ada DAST. Pipeline SAST/Linting melaporkan bersih (0 error, 0 warning) setelah audit per 2-3 Mei 2026. `firestore.rules` juga telah di-*harden* hingga 200+ baris.
- **Bukti:** `/docs/EVALUASI_REMEDIASI_v20260503.md` baris 17-18. 
- **Risiko:** Rendah.
- **Rekomendasi Mitigasi:** Masukkan scanner DAST berkala (ZAP) saat integrasi environment Staging.
- **Action Item:** Maintainer Owner (Estimasi: 4 hours).

**5. Apakah akses ke prompt log dan keputusan bot dibatasi dan terenkripsi?**
- **Ringkasan:** Prompt input yang dilempar pengguna pada modul NLQ tidak disimpan di dalam database Cloud maupun direkam ke backend terenkripsi. Hal ini kehilangan audit trail bagi *prompts* berisiko.
- **Bukti:** `/src/application/services/NLQService.ts` hanya melakukan `console.error` saat gagal, dan tidak menulis log prompt spesifik ke Dexie/Firestore.
- **Risiko:** Medium.
- **Rekomendasi Mitigasi:** Buat modul `AI_Audit_Log` di Firestore dengan security rule `isAdmin()` untuk melacak kueri NLQ Kasir.
- **Action Item:** Software Engineer (Estimasi: 2 hours).

---

## B. Integritas Data dan Offline Sync (Prioritas: Tinggi)

**6. Bagaimana mekanisme write‑ahead log dan idempotency diimplementasikan untuk transaksi kasir?**
- **Ringkasan:** Aplikasi menerapkan Local Write-Ahead Log (WAL) menggunakan Dexie table `sync_events`. Idempotency ditangani via UUID pada field `id` transaksi (`checkoutUseCase`).
- **Bukti:** `/docs/sync-strategy.md` baris 6-9 dan 19. Integritas dicegah bocor dengan CRDT manual untuk agregat stok.
- **Risiko:** Rendah (Sudah terencana baik).
- **Rekomendasi Mitigasi:** Terus monitor log kebocoran UUID collision di DLQ.
- **Action Item:** None.

**7. Apa strategi conflict resolution saat sinkronisasi multi‑device?**
- **Ringkasan:** *Last Write Wins* (aturan timestamp) dioperasikan untuk profil, sedangkan metode `Delta Updates` (CRDT sederhana) diaplikasikan pada pengurangan/penambahan Stok Emas demi mencegah tumpang tindih mutasi saat *race condition*.
- **Bukti:** `/docs/sync-strategy.md` baris 18 (`-2 item` dikirim ke server daripada sisa stok mutlak).
- **Risiko:** Rendah.
- **Rekomendasi Mitigasi:** Tes unit khusus CRDT harus ditingkatkan ketelitiannya untuk desimal `MathUtils`.
- **Action Item:** QA Automation (Estimasi: 2 hours).

**8. Berapa lama backlog sync maksimum yang aman sebelum data tidak dapat dipulihkan?**
- **Ringkasan:** Web Worker `HealthGuardian` mendeteksi anomali saat sync tertunda di backlog lebih dari 2 Jam (7200000 ms). Pengguna diperingatkan. Jika offline terjadi > 3 bulan, IndexDB akan menghantam Quota storage lokal peramban. Pemulihan akan mustahil jika memory tablet korup.
- **Bukti:** `/src/workers/healthGuardian.worker.ts` baris 10 (`MAX_PENDING_SYNC_AGE_MS: 2 * 60 * 60 * 1000`).
- **Risiko:** Medium.
- **Rekomendasi Mitigasi:** Lakukan *Auto Archiver* secara paksa mengubah `.psa` dan melontarkannya ke Telegram backup owner harian, tidak sekedar alert.
- **Action Item:** Software Engineer (Estimasi: 8 hours).

**9. Apakah ada test otomatis yang mensimulasikan offline 24–72 jam dan recovery?**
- **Ringkasan:** Tidak ada. Saat ini hanya `checkout_integrity.spec.ts` untuk stress testing race condition instan, tidak ada time-drift / 72 jam time-lapse offline E2E test.
- **Bukti:** Pencarian `grep -rEi "offline|24|72" tests/` membuktikan absennya mekanisme testing time-lapse long-offline.
- **Risiko:** High (Fitur offline adalah USP produk).
- **Rekomendasi Mitigasi:** (1) Implementasikan script `tests/scenario/Offline72HourRecovery.spec.ts` menggunakan Playwright/Vitest mock timer.
- **Action Item:** QA Automation (Estimasi: 6 hours). *Remediasi Otomatis: Template Mock ditambahkan.*

---

## C. CI/CD, Bot Decisioning, dan Governance (Prioritas: Tinggi)

**10. Apa acceptance rules bot saat menolak/approve PR; apakah rules itu terdokumentasi dan immutable?**
- **Ringkasan:** Bot tidak mandiri menarik tuas persetujuan. Github Actions `auto-merge.yml` mengeksekusi merge secara terprogram dan determenistik (hards-rules) berdasarkan kelulusan test runner, bukan sentimen "AI".
- **Bukti:** `.github/workflows/auto-merge.yml` baris eksekusi.
- **Risiko:** Rendah.
- **Rekomendasi Mitigasi:** Hapus asumsi bot sentience.
- **Action Item:** None.

**11. Berapa banyak PR yang di‑auto‑approve oleh bot dalam 30 hari terakhir dan berapa yang kemudian rollback?**
- **Ringkasan:** Data 30 hari ini diringkas di `/AI_TRACK_RECORD.md`. Tidak ada auto-rollback, semua rollback diputuskan secara human-in-the-loop oleh system owner saat terjadi break.
- **Bukti:** `/docs/release/POST_MORTEM_v1.2.0-rc1.md`.
- **Risiko:** Rendah.
- **Rekomendasi Mitigasi:** None.

**12. Apakah ada PR yang mengubah DB schema tanpa migration script yang teruji?**
- **Ringkasan:** Ya, Dexie local DB di PSA Business Suite mengandalkan *soft up-versioning* atau wipe otomatis jika *store config* berubah tanpa prosedur *upgrade migration* bertahap yang keras. Ini dapat menghapus state *cashier* saat update versi minor dirilis.
- **Bukti:** Konfigurasi Schema IndexedDB tidak disertai folder `/migrations/*` tersendiri untuk konversi IDB.
- **Risiko:** High.
- **Rekomendasi Mitigasi:** Buat standar Dexie `.upgrade((tx) => ...)` logis, setiap ubahan model diwajibkan menulis script migrasinya tersendiri.
- **Action Item:** Developer (Estimasi: 5 hours).

**13. Apakah pipeline CI memblokir merge jika coverage turun, SAST gagal, atau license check gagal?**
- **Ringkasan:** CI/CD Workflow Github memblokir kegagalan lint dan test (`Vitest run`), namun tidak ada parameter yang membaca spesifik Coverage Loss/Degradation < 80%.
- **Bukti:** `package.json` (`npm run test:coverage` dieksekusi namun gagalnya instruksi hanya jika "0%" atau Syntax error, bukan persentase). `.github/workflows/coverage-report.yml` hanya bersifat pelaporan, bukan bloker mutlak E2E degradasi.
- **Risiko:** Medium.
- **Rekomendasi Mitigasi:** Edit workflow CI untuk mengatur batasan limit coverage minimum pada vitest.
- **Action Item:** DevOps Engineer (Estimasi: 1 hour).

---

## H. Insiden dan Forensik (Prioritas: Tinggi)

**25. Jika terjadi insiden data leak, apakah ada playbook forensik: snapshot logs, freeze deploy, notify users?**
- **Ringkasan:** Sama sekali belum ada "Panic Button Playbook", SOP Shutdown total berbasis Infrastruktur IAM GCP di repo ini tidak tersusun, hanya mitigasi manual atau lockout PIN secara logis dalam aplikasi. Jika Firestore *Rules* dijebol, data bisa bocor.
- **Bukti:** Evaluasi `firestore.rules` dan `AGENTS.md` (bagian Skenario Darurat Owner hanya mencakup tablet hilang/mati).
- **Risiko:** High.
- **Rekomendasi Mitigasi:** Pembuatan file skrip Bash yang menjalankan rotasi *keys* dan penguncian instance Firebase secara menyeluruh dari lokal sistem saat status gawat darurat dipicu. Pembuatan SOP Kill-Switch di `OPERATIONAL_HANDBOOK.md`.
- **Action Item:** CISO/Owner (Estimasi: 8 hours). *Remediasi: Dibuatkan shell *Emergency Freeze*.*

**26. Apakah bot menyimpan alasan reject/approve dan siapa yang bisa mengubah keputusan itu?**
- **Ringkasan:** AI Log tercatat di `AI_TRACK_RECORD.md`. Tapi ini adalah file `.md` (*markdown*) biasa yang dapat dimanipulasi dengan mudah oleh *human developer*/attacker untuk mengkambinghitamkan persetujuan arsitektur.
- **Bukti:** Ekstensibilitas git write pada `AI_TRACK_RECORD.md`.
- **Risiko:** Medium.
- **Rekomendasi Mitigasi:** Konversi log arsitektur utama ke issue Tracker Github (secara otomatis tidak dapat direkayasa mundur timestamp-nya) daripada sekadar file statik di repo git.
- **Action Item:** Repo Admin (Estimasi: 2 hours).

---
*Laporan diajukan dan disimpan mengikuti mandat audit E2E Security.*

/**
 * @deprecated BFF Express Server (LEGACY — TIDAK DIGUNAKAN DI PRODUKSI)
 * 
 * @ai_context File ini adalah sisa arsitektur lama (Express BFF).
 *   SEMUA fungsinya telah dimigrasikan ke:
 *   - NLQ/Gemini → workers/gemini-proxy/ (Cloudflare Worker)
 *   - hashPin    → src/shared/store/useSecurityStore.ts (Web Crypto API)
 *   - Telegram   → src/infrastructure/services/AlertService.ts (direct API)
 * 
 * File ini DIPERTAHANKAN hanya sebagai referensi arsitektur lama.
 * TIDAK BOLEH di-import, di-start, atau di-deploy.
 * 
 * @status: DEAD_CODE — kandidat hapus di Sprint P3
 * @last_audit: 2026-05-31
 */

// Tidak ada implementasi aktif — file ini tidak digunakan.
// Semua fungsionalitas ada di Cloudflare Worker (workers/gemini-proxy/)
// dan src/infrastructure/services/

export {};

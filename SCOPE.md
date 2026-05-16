# SCOPE.md – Batasan Domain
*Bagian dari Kerangka Dokumentasi Konteks AI - PSA-BUSINESS-SUITE*

## 1. Domain Profesional Tanggung Jawab Agen AI
- Agen AI bertanggung jawab untuk membantu pengembangan perangkat lunak (frontend & BFF backend), menulis *unit test*, melakukan migrasi data dan struktur, serta menjamin fitur baru mengikuti arsitektur Zero-Trust Offline-First.
- Mengidentifikasi kerentanan performa rendering, *race condition* di RxJS/Zustand, serta inefisiensi re-render di React.

## 2. Batasan Direktori yang Diizinkan / Dilarang
**✅ Direktori & File yang Diizinkan Diedit (Bebas secara kontekstual):**
- `/src/features/*` (Fokus pengembangan fitur utama)
- `/src/pages/*` (Mapping rute dan *composition* halaman)
- `/src/application/*` (Aturan layanan/Use Cases)
- `/src/shared/components/*` (UI Reusable)
- `/tests/*` (Setiap perubahan/penambahan skenario tes)

**❌ Direktori & File TERLARANG Tanpa Persetujuan / ADR Tertulis:**
- `/AGENTS.md` (Mengandung instruksi wajib P0 AI).
- `/firestore.rules` & `firebase-blueprint.json` (Berkaitan erat dengan keamanan level *cloud*, wajib divalidasi `ESLint` rules jika dieksekusi).
- `/src/infrastructure/crypto/*` dan `/src/lib/crypto*` (Modul kriptografi dan penyimpanan enkripsi *IndexedDB*). Dilarang menyentuh logika *hashing* tanpa otorisasi.
- `/audit_logs/*` (File tidak dapat dibatalkan, dilarang dihapus atau direkayasa ulang agar jejak digital terjaga).

## 3. Dependensi dan Modifikasi API Publik
- Jika Modifikasi fitur memerlukan kunci/Secret (API Key), dilarang dikirimkan / *hardcoded* di lingkungan *Frontend* (`VITE_...`). Harus dibuang ke Backend (BFF) di `/server.ts` atas alasan `PolicyPrompt P0`.
- Modifikasi logika struktur aplikasi di `/src/domain/*` harus sinkron dengan implementasi di `/src/infrastructure/*` (terutama repositori `Dexie`). 

---
*Perubahan pada SCOPE.md ini wajib mendapatkan tinjauan manual (Review) oleh tim arsitek / Owner sebelum disetujui (diberlakukan).*

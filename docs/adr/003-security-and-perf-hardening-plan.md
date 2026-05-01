# ADR 003: Security & Performance Hardening Plan

**Date**: 2026-04-25
**Status**: VERIFIED & COMPLETED

## Latar Belakang & Konteks
Setelah dilakukan pengamatan mendalam terhadap kode sumber (source code) langsung ke dalam file proyek yang sebenarnya (pasca perbaikan-perbaikan sebelumnya), kami menemukan bahwa:

1. **`firestore.rules` (P0) TELAH SELESAI**: Rule Firestore sudah dikonfigurasi untuk hanya menerima *request* yang diverifikasi oleh `appCheck != null`.
2. **`useSecurityStore.ts` (P0) TELAH SELESAI**: Kunci enkripsi sudah menggunakan sistem `salt` UUID kriptografis murni secara lokal dan tidak lagi menggunakan hardcoded string `psa-business-suite-salt`.
3. **Ekspos API Key (P1) TELAH SELESAI**: Semua panggilan LLM Gemini sudah diarahkan melalui *HTTPS Callable* milik Cloud Function backend, dan variabel environment `process.env.GEMINI_API_KEY` tidak diekspos oleh Vite ke klien lokal.
4. **Memory Leak Listeners (P1) TELAH SELESAI**: Aplikasi tidak menggunakan `onSnapshot` yang rawan kebocoran (stale listener). Aplikasi modern ini sudah dimigrasi ke sistem *polling interval* periodik yang lebih aman dan menggunakan *Web Worker* di latar belakang (`healthGuardian.worker.ts`).

## Keputusan Strategis Berhenti Refactoring Teknis
Oleh karena seluruh isu di atas terbukti telah beres, tim menetapkan bahwa status eksekutif TI aplikasi saat ini berada di tier **Enterprise-Grade** (bersih, kencang, terenkripsi, offline-first). Refactoring lebih jauh pada level core-engine tidak disarankan karena akan *over-engineering* untuk skala UMKM. Fokus beralih kembali ke **Fitur Bisnis Lapangan (UX/UI)**.

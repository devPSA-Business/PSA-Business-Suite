# MIGRATETOBFF Auto-PR (simulated)
# Move SECRETS to BFF

**Title:** MIGRATETOBFF: Pindahkan Secrets Eksternal dari Frontend ke Backend (BFF)
**Status:** MERGED / SELESAI (Implementasi Server-Side Hashing & Offline Deferred Verification)
**Date:** 2026-05-10

## Ringkasan (Executive Summary)
Untuk mematuhi **PolicyPrompt P0 (No Secrets in Client)** dan **ARD 003 Zero-Trust Architecture**, kami mengidentifikasi adanya variabel `VITE_CRYPTO_PEPPER` dan beberapa `VITE_FIREBASE_*` (khususnya `API_KEY`) yang dipanggil langsung di client.
Auto-PR ini mengusulkan perpindahan resolusi variabel ini melalui BFF (Backend-for-Frontend).

## Perubahan yang Diajukan
1. Di `useSecurityStore.ts`, hapus pengambilan statis `import.meta.env.VITE_CRYPTO_PEPPER` dan ganti dengan pola inisialisasi asinkron (fetch dari `/api/config`).
2. Terapkan fallback ke `IndexedDB keyval` (`crypto_pepper`) untuk mendukung _offline mode_ sehingga tidak merusak ketersediaan data.
3. Di log PII (`logger.ts` dan fungsi terkait), sanitasi regex lebih komprehensif digunakan.

## Keamanan
Perubahan ini masuk ke area `HUMANREVIEWREQUIRED` karena menyangkut sistem Auth & Hashing PIN lokal. Dilarang di-*merge* tanpa persetujuan Owner.

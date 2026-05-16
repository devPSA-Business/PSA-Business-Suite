# Kebijakan Privasi & Kepatuhan Perlindungan Data (Kebijakan P0)

PSA Business Suite sangat memprioritaskan keamanan data dan privasi pengguna. Panduan ini menjelaskan bagaimana kami mengelola data pelanggan sesuai dengan **GDPR (Eropa)** dan **Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022 di Indonesia)**.

Secara spesifik, aturan ini sejalan dengan mandat **Zero-Trust & PII Sanitization** pada dokumen `AGENTS.md`.

## Prinsip Utama Pengumpulan Data

1. **Minimisasi Data (Data Minimization)**: Aplikasi ini hanya mencatat data yang absolut relevan untuk transaksi, operasional toko, dan keamanan sistem. Kami tidak mengambil data biometrik atau pelacakan tersembunyi (*stealth tracking*).
2. **Kerahasiaan Secara Otomatis (Privacy by Default)**: Detail pelanggan (Personally Identifiable Information/PII) seperti alamat email, NIK, atau nomor telepon hanya disinkronisasi ke server melalui jalur enkripsi dan telah disanitasi pada audit trail (e.g. diganti dengan `<<PII_REMOVED>>`).

## Pengelolaan Personally Identifiable Information (PII)

Setiap kontributor atau agen eksternal (**wajib**) memperhatikan area berikut:
- **Client-side Sanitization**: Setiap parameter log, debugging, atau analitik yang dikirim ke *third-party service* (misal: Sentry, LogRocket, atau LLM eksternal) **HARUS** di-scrub dan dibersihkan dari PII klien (contoh: nomor resi yang mengaitkan ke alamat klien).
- **Log Audit Terenkripsi**: Log transaksi asli untuk PII tetap diarsipkan di Endpoint `/audit_logs` pada backend secara rahasia dan dilengkapi Role-Based Access Control (RBAC) yang ketat (Hanya untuk `isAdmin`). Administrator di lingkungan produksi adalah **Pemilik Bisnis (Owner)** itu sendiri, dan developer platform ini tidak memiliki akses ke data tersebut pada instalasi lokal pengguna/owner toko.

## Pemenuhan Hak Privasi Subjek Data (Sesuai UU PDP & GDPR)

Sebagai aplikasi penyedia Enterprise Point of Sale, platform harus menyediakan fasilitas agar *Owner* dapat memberikan kapabilitas pemenuhan hak berikut untuk pelanggan akhirnya:
1. **Hak untuk Mengetahui (Right to be Informed)**: Owner harus memberi tahu bahwa transaksi akan tercatat di aplikasi ini untuk keperluan resi dan layanan purna jual.
2. **Hak untuk Dihapus (Right to Erasure / Right to be Forgotten)**: Pada modul CRM (Customer), disediakan fitur **Soft Delete** dan/atau **Hard Delete** (Berdasarkan kebutuhan audit hukum) jika klien meminta penghapusan profil pelanggan.
3. **Hak Portabilitas Data (Right to Data Portability)**: Klien yang melakukan perbaikan atau pembelian dapat meminta cetak/unduh Riwayat Transaksi kapan pun melalui Owner.

## Penggunaan *Secret Keys* dan Kredensial

Aplikasi ini menggunakan teknologi Backend-for-Frontend (BFF) atau lingkungan terisolasi untuk kunci kredensial atau rahasia token layanan. **Tidak ada Secret Key (AWS, GCP, OTP Service, API Eksternal) yang boleh masuk dalam source code Repositori ini.**

Bila ditemukan adanya kebocoran secret atau kerentanan enkripsi, segera buat permohonan keamanan (*Security Vulnerability Issue*) atau e-mail kami di `dev.psajewelry@gmail.com`.

## Audit Kepatuhan (Compliance Audit)

Dalam instalasi mandiri, audit di-generate ke dalam format komprehensif *(Audit Log Viewer Feature)* dengan tujuan membantu Pelaku Usaha membuktikan kepatuhan integritas data secara independen dan akuntabel di hadapan hukum dan regulator lokal terkait.

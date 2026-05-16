# PSA Business Suite

![Build Status](https://img.shields.io/github/actions/workflow/status/devPSA-Business/PSA-Business-Suite/ci.yml?branch=main)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.4.0-green.svg)

Aplikasi Point of Sale (POS), ERP, dan CRM kelas Enterprise yang dirancang khusus untuk toko perhiasan imitasi. Aplikasi ini dibangun dengan arsitektur **Offline-First PWA**, memastikan operasional toko tetap berjalan lancar meskipun koneksi internet terputus, dengan prioritas keamanan, integritas data, dan *zero-maintenance*.

## Status Proyek: SIAP PRODUKSI

Seluruh modul utama telah berhasil dimigrasikan ke **Clean Architecture** dan **Feature-Sliced Design (FSD)**. Sistem telah melewati pengujian menyeluruh (*end-to-end stress test*, *forensic integrity audit*) dan siap untuk *deployment* di lingkungan produksi.

---

## Arsitektur & Pola Desain (Architecture)

Aplikasi ini menggunakan **Modular Monolith** dengan pendekatan **Domain-Driven Design (DDD)** yang diimplementasikan melalui struktur **Feature-Sliced Design (FSD)**:

- **Offline-First**: Menggunakan `Dexie.js` (IndexedDB) sebagai *Master Source of Truth* secara lokal saat offline. Data disinkronisasikan ke Firebase Firestore ketika *online* melalui mekanisme *Sync Queue* yang tahan banting.
- **Microservices-inspired Modularity**: Domain terpisahkan ke dalam modul mandiri di `/src/features/` (Mis: `auth`, `inventory`, `pos`, `gold`, `shift`).
- **Security & Zero-Trust**: PII (Personally Identifiable Information) disanitasi. *Secret key* dipisahkan dengan sangat ketat (Tidak ada *secrets* di Frontend). Otentikasi dan izin akses (*authorization*) dilindungi berbasis Role-Based Access Control (RBAC).

---

## Modul Utama (Core Modules)

| Modul | Fungsionalitas Utama | Tingkat Keamanan & Integritas |
|-------|----------------------|-------------------------------|
| **Auth** | Otorisasi RBAC, *Morning Readiness*, *Pin Gate*. | Menggunakan hash lokal PBKDF2; integrasi Firebase Auth. |
| **POS & Checkout**| Transaksi ritel, *Cart Management*, Kasir, Retur. | Transaksi atomatik (ACID via Dexie), anti-race condition. |
| **Inventory** | Pelacakan stok real-time, scan *barcode*, import batch. | Audit mutasi (*Stock History*), Hash SKU terenkripsi. |
| **Shift** | Manajemen buka/tutup toko, Rekonsiliasi serah terima. | Validasi uang kas terintegrasi, mencegah fraud (*Cash difference*).|
| **Gold & Buyback**| Pembelian emas bekas/retur, Perhitungan valuasi. | Integritas valuasi algoritmik, audit *forensic buyback*. |
| **Services (Reparasi)**| Penerimaan barang rusak, status pengerjaan reparasi. | *Tracking* nota dan SLA perbaikan pelanggan. |
| **Reports & Analytics**| Dasbor omzet, laba kotor, KPI, sinkronisasi status. | Akses ketat level *Owner* & *Executive*, laporan tervalidasi. |

---

## Teknologi yang Digunakan

- **Frontend**: React 19, TypeScript, Vite
- **Architecture/State**: Zustand (Local State), Clean Architecture (Repositories, UseCases).
- **Routing**: TanStack Router (Type-safe routing).
- **Styling**: Tailwind CSS v4, Lucide Icons.
- **Local Database**: Dexie.js (IndexedDB wrapper).
- **Cloud Database (BaaS)**: Firebase Firestore & Firebase Auth.
- **PWA**: `vite-plugin-pwa` untuk *offline execution*.
- **CI/CD & DevOps**: GitHub Actions (CI/CD workflows), Dependabot.

---

## Panduan Instalasi (Development Setup)

### Prasyarat:
- Node.js versi 18+ atau 20+ (Direkomendasikan menggunakan NVM).
- Git.
- Koneksi internet stabil untuk unduh dependensi.

### Langkah-langkah:

1. **Kloning Repositori**:
   ```bash
   git clone https://github.com/devPSA-Business/PSA-Business-Suite.git
   cd PSA-Business-Suite
   ```

2. **Instal Dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**:
   Salin file konfigurasi *environment* (*JANGAN PERNAH COMMIT file `.env.local`*).
   ```bash
   cp .env.example .env.local
   ```
   *Isi `.env.local` dengan kredensial Firebase Anda.*

4. **Jalankan Development Server**:
   ```bash
   npm run dev
   ```
   Akses di `http://localhost:3000` atau URL yang ditampilkan di terminal.

---

## Cara Menginstal PWA di Tablet Kasir

Aplikasi ini sangat dioptimalkan untuk perangkat Tablet Point of Sale.
1. Buka aplikasi melalui Google Chrome di tablet kasir.
2. Klik tombol **"Install App"** di pojok kanan atas aplikasi atau di tautan navigasi browser.
3. Aplikasi akan masuk ke *home screen* layaknya aplikasi Native. 
4. Aplikasi sudah otomatis menyimpan *cache* agar bisa berjalan meskipun koneksi putus tiba-tiba (*Drop-connection resilient*).

---

## Kepatuhan Privasi, Keamanan, & Audit (Security & Compliance)

Berdasarkan *Best Practices* OWASP dan UU Kepatuhan Privasi Data (GDPR / UU PDP No.27 Th 2022 Indonesia):
- **PII Scrubbing**: PII dihapus atau dienkripsi dengan standar (menggunakan placeholder `<<PII_REMOVED>>` dalam audit logs).
- **Log Audit Otomatis**: Setiap operasi (Buat/Ubah/Hapus) di-_hash_ dan disimpan di modul `audit_logs` untuk pelacakan forensik yang anti-ubah. 
- **Secret Management**: Aplikasi didesain agar TIDAK ADA token atau secret key terekspos di browser client.

*(Lihat `SECURITY.md` dan `PRIVACY.md` untuk pedoman detail).*

---

## Kebijakan Kontribusi & Komunitas

Kami sangat menghargai kontributor! Silakan periksa:
- [PANDUAN KONTRIBUSI (CONTRIBUTING.md)](CONTRIBUTING.md) untuk cara mengirimkan *Pull Request*.
- [KODE ETIK (CODE_OF_CONDUCT.md)](CODE_OF_CONDUCT.md) untuk aturan berperilaku dalam komunitas ini.
- **Roadmap Proyek**: Lihat `ROADMAP.md` untuk mengetahui rencana pengembangan kami ke depannya.

---

## Panduan AI-Assisted Development (Antigravity/Gemini)

Proyek ini telah dikonfigurasi dengan *Master System Instructions* di dalam `AGENTS.md` untuk mencegah *over-engineering* dan menjaga keselarasan dengan *PolicyPrompt P0*.

Setiap kali menggunakan agen AI (Github Copilot/AI Studio):
1. Izinkan AI membaca `AGENTS.md` terlebih dahulu.
2. AI **WAJIB** menerapkan kebijakan zero-trust dan validasi otorisasi.
3. Gunakan *rules* pada `deny_rules.rules` sebagai rujukan jika mengubah keamanan akses Firestore.

---

## Lisensi

Didistribusikan di bawah lisensi MIT. Lihat file `LICENSE` untuk informasi lebih lanjut.

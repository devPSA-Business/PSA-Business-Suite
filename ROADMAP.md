# Roadmap Pengembangan - PSA Business Suite

Berikut adalah peta jalan (*roadmap*) pengembangan proyek ke depannya. Rencana ini disusun berdasarkan prioritas stabilitas, kepatuhan (compliance), dan umpan balik pengguna.

## Fase 1: Kesiapan Produksi Inti & Observabilitas (Q3 2026)
*Fokus: Mengukuhkan pilar operasional dasar, menutup kerentanan sisa, dan menambah lapisan monitoring.*

- [x] Migrasi modul fundamental (Inventaris, Reparasi, POS, Shift) ke arsitektur PWA offline-first.
- [x] Penambahan fitur Zero-Trust, *Data Integrity*, dan *Role-Based Access Control* (RBAC).
- [ ] **Observability & Logging**: Integrasi dengan layanan observabilitas eksternal (Sentry/Datadog) untuk mendeteksi error di lingkungan produksi.
- [ ] **Stabilitas Sinkronisasi**: Pengembangan mekanisme deteksi dan perbaikan inkonsistensi (*conflict resolution*) tingkat lanjut untuk sinkronisasi IndexedDB dengan Firestore.
- [ ] **Data Export/Import Ekstensif**: Utilitas untuk ekspor seluruh data ke CSV/Excel secara bulk (untuk audit pajak).

## Fase 2: Peningkatan Ekosistem & Ekstensibilitas (Q4 2026)
*Fokus: Ekspansi kemampuan perangkat lunak ke eksternal dan otomasi.*

- [ ] **Webhook & Open API**: Peluncuran Open API publik dengan mekanisme *Rate Limiting* dan otentikasi ketat agar dapat berintegrasi dengan pihak ke-3 (Payment gateway, jasa logistik/pengiriman).
- [ ] **Pemberitahuan Otomatis (Notifikasi)**: Modifikasi modul komunikasi integrasi multi-kanal (WhatsApp, SMS, Telegram) untuk otomatis memberitahu klien misal jika "Reparasi sudah selesai".
- [ ] **Manajemen Promosi & Diskon Terpusat**: Engine promosi tingkat mahir (syarat Beli 2 gratis 1, voucher, member loyalty).

## Fase 3: Skalabilitas Analitik & AI (Q1 2027)
*Fokus: Wawasan prediktif dan laporan agregasi performa tinggi untuk bisnis menengah ke atas.*

- [ ] **Analitik Big Data**: Dasbor Business Intelligence canggih berbasis tren (emisalnya memprediksi tren pembelian emas di musim tertentu).
- [ ] **Sistem Rantai Pasok Lanjut**: Pendukung operasional pergudangan untuk banyak cabang (Multi-Tenant & Multi-Branching Warehouse).
- [ ] **Ekosistem Aplikasi Klien (Client-facing PWA)**: Sub-aplikasi yang memungkinkan pelanggan mencek status reparasi mereka secara personal, tanpa masuk ke halaman utama kasir.

---

> *Catatan: Jadwal ini dapat berubah sewaktu-waktu tergantung prioritas perbaikan bug, partisipasi kontributor, serta dinamika operasional toko ritel target.*

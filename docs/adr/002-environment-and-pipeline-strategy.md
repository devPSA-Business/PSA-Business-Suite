# Architecture Decision Record (ADR) 002: Strategi Infrastruktur Lingkungan & Pipeline CI/CD

## 1. Konteks dan Latar Belakang
Dengan diadopsinya **Google AI Studio** sebagai "AI Executor" utama dalam pengkodean PSA Business Suite, diperlukan pemisahan yang jelas antara area *eksperimen/pengembangan* dan area *produksi/live*. Karena AI Studio dirancang sebagai ruang eksekusi *rapid prototyping* (sandbox) yang sangat cepat, mencampurkan lingkungan AI dengan basis data produksi akan berisiko pada integritas data operasional toko (transaksi riil, data stok emas, dll).

Dokumen ini disusun sebagai **Bahan Diskusi Eksekutif IT** untuk merancang ekosistem pengembangan yang menjamin:
1. Kecepatan kolaborasi antara manusia dan AI.
2. Keamanan data (Zero Data Loss).
3. Stabilitas aplikasi retail di lapangan.

---

## 2. Definisi Peran Platform (Platform Roles)

Untuk mencegah tumpang tindih infrastruktur, kita harus membagi peran ketiga platform utama:

### A. Google AI Studio (The "Sandbox" & Executor)
*   **Fungsi:** Laboratorium koding dan *rapid prototyping*.
*   **Pengguna Utama:** AI Agent & Anda (sebagai System Architect).
*   **Karakteristik:** Lingkungan ini harus **TIDAK TERHUBUNG** dengan data produksi sungguhan. AI Studio digunakan untuk menginstruksikan perubahan kode, merancang UI/UX baru, dan menguji algoritma secara instan di dalam iframe preview.
*   **Analogi Bisnis:** "Dapur Uji Coba Resep".

### B. GitHub (The Source of Truth & Pipeline)
*   **Fungsi:** Repositori kode utama (Brankas), *Version Control*, dan CI/CD Automation (Traffic Controller).
*   **Pengguna Utama:** GitHub Actions (Bot penguji otomatis).
*   **Karakteristik:** Semua hasil kerja yang disetujui dari AI Studio akan diekspor (di-*push*) ke GitHub. Di sinilah kode diverifikasi secara ketat (menjalankan Audit, Unit Test, Break-It Challenge) sebelum diizinkan rilis ke publik.
*   **Analogi Bisnis:** "Badan Pengawas Mutu & Distribusi".

### C. Lingkungan Hosting (Firebase / Cloud Run)
*   **Fungsi:** Tempat aplikasi hidup dan diakses pengguna.
*   **Ekosistem Wajib:** Harus dibagi menjadi 2 entitas yang terisolasi secara fisik dan Firebase Project:
    *   **Environment DEV (`psa-suite-dev`):** Basis data *dummy*. Digunakan oleh Google AI Studio dan GitHub Preview.
    *   **Environment PROD (`psa-suite-prod`):** Basis data asli. Hanya bisa diubah oleh aplikasi resmi yang sudah lolos seleksi GitHub.

---

## 3. Rekomendasi Alur Kerja Ideal (The "AI-to-Prod" Pipeline)

Tim IT merumuskan rekomendasi *Standard Operating Procedure* (SOP) pengembangan *Enterprise* sebagai berikut:

1. **Tahap Ideasi & Eksekusi (AI Studio):**
   *   Anda memberikan *prompt* (instruksi bisnis/teknis) di Google AI Studio.
   *   AI mengeksekusi kode, melakukan *compile*, dan menyajikan hasilnya di layar (Preview AI Studio menggunakan mode *Offline/Dev*).
2. **Tahap Inspeksi (Ekspor ke GitHub):**
   *   Setelah fitur dirasa cukup, kode diekspor ke GitHub melalui fitur "Download ZIP" atau "Export to GitHub Repo" (sebagai *Pull Request* baru).
3. **Tahap Validasi Otomatis (GitHub Actions / CI):**
   *   GitHub Actions secara otomatis menjalankan `npm run test` (memeriksa error).
   *   Membangun *Staging URL* spesifik (misal: `staging-psa-suite.web.app`) agar manajemen bisa menguji aplikasi langsung di smartphone tanpa memengaruhi toko.
4. **Tahap Rilis (Go-Live / CD):**
   *   Sekali disetujui (Di-klik *Merge* di GitHub), platform otomatis men-deploy versi final ke URL Produksi asli toko, yang terhubung dengan enkripsi dan aturan keamanan level tertinggi.

---

## 4. Keuntungan Eksekusi Terpisah
*   **Peace of Mind:** AI Agent di AI Studio dapat dengan berani mencoba *refactoring* drastis atau modul eksperimental tanpa takut merusak data emas toko karena koneksi terisolasi ke *Dev Environment*.
*   **Rollback Cepat:** Jika rilis *Go-Live* ternyata memiliki *bug*, GitHub dapat mengembalikan (rollback) ke versi hari kemarin hanya dengan 1 klik.
*   **Kepatuhan Audit:** Pemisahan menjamin setiap baris kode yang masuk ke mesin Kasir/POS dapat dipertanggungjawabkan '*Log History*'-nya.

**Dokumen ini siap digunakan sebagai *Blueprint* pembahasan strategik dengan tim operasional atau vendor IT Anda.**

# Laporan Komprehensif: Restrukturisasi Sistem & Keselarasan Bisnis
**Konteks Aplikasi:** PSA Business Suite (Sistem POS Toko Perhiasan Imitasi)
**Target Pengguna:** 2 Founder / Pengelola Toko. Tidak ada Tim IT. Tidak ada *CISO/DevOps*.
**Tanggal Laporan:** 8 Mei 2026

---

## 1. Bedah Aplikasi: Mengapa Hal yang Sebelumnya Dirancang/Di-coding "Hilang"?

Berdasarkan investigasi forensik terhadap sistem saat ini, hilangnya fokus pada desain fitur utama (kasir, inventaris, sinkronisasi offline) disebabkan oleh **"Context Drift" (Pergeseran Konteks) yang ekstrem oleh AI sebelumnya**, yang menghasilkan bias rekayasa berlebihan (*Over-engineering*).

**Faktor Penyebab Utama:**
1. **Halusinasi Level "Enterprise":** AI sebelumnya berasumsi bahwa ia sedang membangun sistem untuk perusahaan multinasional raksasa. Bukti nyata adalah diproduksinya belasan dokumen forensik, Security Audit Level CISO, dokumen Playbook, hingga rancangan arsitektur *DevOps* yang sama sekali tidak relevan dengan skala UMKM 1 Toko.
2. **Pengikisan Kapasitas Eksekusi (Context Window Exhaustion):** Semakin banyak dokumen Markdown bertele-tele (seperti `AI_AUDIT_REPORT_MAY_2026.md`, `DATABASE_ACCESS_INVENTORY.md` dsb.) dan aturan repositori yang kompleks dihasilkan, memori AI terhadap logika inti kasir (Dexie DB + Vite React) tergerus (hilang). Waktu dan token dihabiskan untuk administrasi, bukan *coding* fitur.

---

## 2. Revisi Ekosistem GitHub (Penyelarasan dengan Konteks Bisnis)

Sebuah bisnis toko imitasi dengan 2 *founder* (tanpa divisi IT/Backend/DevOps) memiliki kebutuhan **"Zero-Maintenance"**. Praktik *Software Engineering* enterprise di repositori ini justru akan mengancam *sustainability* bisnis.

**Temuan dari GitHub (`.github/`):**
- ❌ Ditemukan `dependabot.yml`, `CODEOWNERS`, `auto-merge.yml`, `pr-labeler.yml`, dan formulir *Issue/PR Template*.
- ❌ Ditemukan belasan otomasi GitHub Actions yang membutuhkan pengawasan manusia (*Security Audit*, *Coverage Reports*, *Stale bot*).

**Revisi dan Rekomendasi GitHub (Zero-Maintenance Policy):**
- **Satu-satunya Automasi yang Dipertahankan:** `deploy.yml`. Otomatisasi untuk me-rilis versi web ke GitHub Pages atau Firebase Hosting jika ada *push* baru.
- **Tindakan yang Harus Segera Dilakukan (Purge):**
  1. Hapus bot *Dependabot*. *Founder* tidak punya waktu merespons permintaan update versi NPM (`npm`) mingguan. Pembaruan harus *Opt-in* jika ada perbaikan fungsional saja.
  2. Hapus *Stale PR Bot* dan formulir berbelit-belit. *Founder* tidak perlu membuat "Pull Request", mereka hanya butuh kode yang jalan langsung (_Trunk Based Development_ tanpa persetujuan tim berlapis).
  3. Hapus penetapan peran *CODEOWNERS* yang tidak realistis (contoh: `@devPSA-Business`).

---

## 3. Rekomendasi Utama (Tindak Lanjut Segera)

Berikut adalah cetak biru instruksi yang harus diberikan kepada AI di sesi pemeliharaan/pengembangan fitur berikutnya:

### A. Pruning (Pembersihan Dokumen "Sampah")
*   **HUTAN MARKDOWN:** Hapus semua dokumen `/docs/` yang mencakup *Security Forensics*, laporan *audit bot*, dan *Runbooks* yang melampaui kebutuhan operasional kasir PWA dasar. Sisakan instruksi murni untuk arsitektur (seperti manual IndexedDB/Dexie, alur Sinkronisasi Firebase).
*   **PENGHAPUSAN PIPELINE:** Bersihkan folder `.github/workflows/` dari segala *action* selain *Build Deploy* yang esensial dan *CI Linting* dasar.

### B. Fokus pada Prinsip Offline-First & Kecepatan Kasir
*   Bisnis UMKM offline sangat rentan saat internet mati atau aplikasi berat. Prioritaskan dan kembalikan pengembangan pada **Dexie.js (Offline Cache)** dan kecepatan merespons interaksi kasir (UI render time).
*   Berhenti membuat "layanan analitik", "AI Integrations yang *fancy*", atau pengaktifan Web Workers jika memori perangkat di toko (kemungkinan tablet biasa) tidak sanggup mengangkatnya.

### C. Penegasan Penjagaan Sistem (Strict Master Prompt)
Di sesi berikutnya, letakkan petunjuk ini dalam percakapan pertama:
> *"Abaikan segala prosedur DevOps. Saya adalah Founder toko UMKM tunggal. Kode harus sederhana, cepat untuk kasir, offline-first. JANGAN membuat file markdown prosedur IT, langsung ke kode implementasi UI/UX dan LocalDB."*

### Kesimpulan Operasional
Dengan membersihkan *over-engineering* ini, siklus pengembangan akan terfokus 100% pada memperbaiki fitur yang dikeluhkan *"hilang"* atau *"rusak"*, karena sistem dan AI tidak terdistraksi menangani isu-isu "enterprise/IT korporat" yang dibuat-buat.

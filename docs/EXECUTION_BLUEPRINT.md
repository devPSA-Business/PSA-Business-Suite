# 📄 PSA BUSINESS SUITE: MASTER EXECUTION BLUEPRINT & AI GUARDRAILS
**Dokumen ID:** PSA-ARCH-EXEC-FINAL
**Tanggal Audit:** 23 April 2026
**Fokus Bisnis:** Ritel Perhiasan Emas & Imitasi (Offline-First, Zero Maintenance)
**Otoritas:** Senior Enterprise Architect & AI Auditor

---

## 🎯 RINGKASAN EKSEKUTIF
Dokumen ini adalah cetak biru (*blueprint*) arsitektur dan panduan eksekusi mutlak untuk penyempurnaan **PSA Business Suite v1.3.5**. Dokumen ini dirancang untuk memitigasi *Technical Debt*, mencegah kebocoran finansial, mengamankan data kriptografi lokal, serta menetapkan batas aman (*guardrails*) agar *AI Agent* tidak mengalami halusinasi atau merusak sistem saat melakukan pengembangan lanjutan.

---

## 🛑 BAB I: KONSTITUSI PENGEMBANGAN (STRICT AI POLICIES)
*Aturan ini bersifat MUTLAK. Setiap AI yang membaca dokumen ini WAJIB mematuhi protokol berikut tanpa terkecuali.*

1. **Zero Data Loss Policy:** Modifikasi pada `db.ts` (Dexie) dan `useSecurityStore.ts` (Kriptografi) **WAJIB** memiliki kompatibilitas mundur (*backward compatibility*). Pengguna lama tidak boleh kehilangan akses ke data mereka.
2. **Strict FSD (Feature-Sliced Design):** Komponen, *Store*, dan *UseCase* harus berada di dalam folder fiturnya masing-masing (`src/features/[nama-fitur]/`). Dilarang meletakkan logika spesifik fitur di folder `shared/`.
3. **Financial Precision:** Semua kalkulasi uang (Total, Diskon, HPP, Profit) **WAJIB** dibungkus dengan `Math.round()` sebelum disimpan ke database atau ditampilkan ke UI.
4. **No Direct Cloud Writes:** Semua mutasi data **WAJIB** masuk ke IndexedDB lokal terlebih dahulu dan didaftarkan ke `sync_events` via `UnitOfWork`. Dilarang melakukan `setDoc` atau `updateDoc` langsung dari UI ke Firebase.
5. **Atomic Execution & Execution Plan:** AI dilarang mengedit lebih dari 3 file kritis secara bersamaan. Sebelum menulis kode, AI **WAJIB** memberikan *Execution Plan* (Rencana Eksekusi) dan menunggu persetujuan User.
6. **A.D.R Compliance:** Setiap perubahan arsitektur besar wajib dicatat dalam folder `docs/adr/` (Architecture Decision Records).

---

## 🔍 BAB II: HASIL AUDIT MENDALAM & IDENTIFIKASI MASALAH

Berikut adalah 11 temuan kritis dan *edge-cases* yang wajib diselesaikan:

### A. Integritas Finansial & Logika Bisnis
1. **Celah Transaksi Rp 0:** Kasir dapat memasukkan diskon 100% pada barang fisik. Sistem hanya memberi *flag*, namun transaksi tetap lolos. *(Risiko: Penggelapan barang).*
2. **Stale HPP saat Offline:** Barang baru yang masuk saat offline tidak mendapat kalkulasi *Moving Average* hingga online. *(Risiko: Laporan laba kotor tidak akurat).*
3. **Konflik Auto-Pruner vs Buyback:** Skrip pembersih data menghapus transaksi > 30 hari. *(Risiko: Kasir tidak bisa memverifikasi nota lama saat pelanggan melakukan Buyback di kondisi offline).*

### B. Keamanan Kriptografi & Privasi
4. **Kelemahan Nuclear Lockout:** Status sistem terkunci (gagal PIN 20x) hanya disimpan di `localStorage` yang mudah dihapus via DevTools. *(Risiko: Brute-force berlanjut).*
5. **Predictable & Hardcoded Salt:** Penggunaan `user.id` dan string statis `'psa-business-suite-salt'` untuk PBKDF2 sangat rentan terhadap serangan *Rainbow Table*. *(Risiko: Pembobolan PIN).*

### C. Ketahanan Offline & Sinkronisasi
6. **Echo Effect & Race Condition:** Tarik-ulur data via `LiveSyncProvider` dan `SyncServiceImpl` dapat saling menimpa jika koneksi tidak stabil. *(Risiko: Data loss pada tabel non-stok).*
7. **Memory Leak LiveSyncProvider:** *Listener* Firestore tidak dibersihkan dengan sempurna saat komponen mati paksa. *(Risiko: Kuota Firebase bocor).*
8. **DLQ Bloat:** Dead Letter Queue menyimpan foto Base64 gagal sync tanpa batas ukuran. *(Risiko: QuotaExceededError pada IndexedDB).*

### D. Hardware, UX, & AI Management
9. **Kerapuhan WebUSB Printer:** Izin USB sering dicabut OS saat tablet *restart*. *(Risiko: Kasir panik printer mati, butuh UI Auto-Reconnect).*
10. **Zero-Click Scanner Delay:** Buffer scanner 100ms tidak cocok untuk scanner murah yang lambat. *(Risiko: Barcode terpotong).*
11. **Dexie Schema Bloat:** 36 versi migrasi Dexie memperlambat *booting*. *(Risiko: Performa lambat).*
12. **AI Context Overflow:** Export Feedback Triage menggabungkan puluhan tiket sekaligus. *(Risiko: AI kelebihan beban memori dan berhalusinasi).*

---

## 🛠️ BAB III: MASTER EXECUTION ROADMAP (PETA JALAN EKSEKUSI)

*AI hanya boleh mengeksekusi SATU FASE dalam satu waktu.*

### 📦 TOPIK 1: CORE FIXES (LOGIKA BISNIS & KEAMANAN)

*   **FASE 1.1: Penambalan Celah Finansial**
    *   Blokir transaksi Rp 0 di `CheckoutUseCase.ts` (kecuali kategori JASA atau dengan PIN Admin).
    *   Terapkan *Shadow HPP Calculation* di `ReceiveStockUseCase.ts` untuk mode offline.
*   **FASE 1.2: Hardening Kriptografi & Anti-Brute Force**
    *   Pindahkan state `isSystemLocked` ke IndexedDB (`db.keyval`).
    *   Implementasi UUID Salt acak untuk user baru, pertahankan *legacy check* untuk user lama di `useSecurityStore.ts`.
*   **FASE 1.3: Optimasi Performa & Sinkronisasi**
    *   Lakukan *Schema Squashing* di `db.ts` (gabungkan versi 1-30).
    *   Perbaiki *Memory Leak* di `LiveSyncProvider.tsx`.
    *   Tambahkan limitasi/kompresi pada `SyncServiceImpl.ts` untuk DLQ.
*   **FASE 1.4: Revisi Auto-Pruner & PWA State Persistence**
    *   Ubah `dataArchiver.ts`: Jangan hapus tabel `transactions`, hanya hapus `audit_logs` dan `sync_events` lama.
    *   Tambahkan listener `visibilitychange` dan `pagehide` di `dexieCartStorage.ts` agar keranjang kasir tidak hilang saat aplikasi di-*minimize* (Mobile App Kill).
*   **FASE 1.5: Hardware UX & Scanner**
    *   Ubah logika Zero-Click Scanner di `ProductList.tsx` menggunakan deteksi tombol `Enter`.
    *   Tambahkan UI *Auto-Reconnect* WebUSB di `CashierPage.tsx`.

### 🏗️ TOPIK 2: ARCHITECTURE & AI SOP

*   **FASE 2.1: FSD Realignment (Restrukturisasi Folder)**
    *   Pindahkan semua UseCase dari `src/application/usecases/` ke dalam folder fiturnya masing-masing (`src/features/pos/usecases/`, `src/features/gold/usecases/`, dll).
    *   Perbarui `DIContainer.ts`.
*   **FASE 2.2: Implementasi A.D.R & Pemecahan Konteks AI**
    *   Buat folder `docs/adr/` dan `docs/ai_rules/`.
    *   Pecah `AGENTS.md` menjadi `CORE_RULES.md`, `UI_RULES.md`, dan `DB_RULES.md`.
    *   Pindahkan riwayat lama ke `docs/adr/001-legacy-track-record.md`.
*   **FASE 2.3: Limitasi Batch Prompt AI**
    *   Ubah `FeedbackTriagePage.tsx` agar fungsi export membatasi maksimal 5 tiket per *batch* untuk mencegah *Context Overflow* pada AI.

---

## 📂 BAB IV: TARGET STRUKTUR FOLDER FINAL (FSD)

Setelah Fase 2.1 dan 2.2 selesai, struktur folder harus terlihat seperti ini:

```text
📦 psa-business-suite
 ┣ 📂 docs/
 ┃ ┣ 📂 adr/                 <-- Catatan keputusan arsitektur (Riwayat AI)
 ┃ ┣ 📂 ai_rules/            <-- Pecahan prompt spesifik (CORE, UI, DB)
 ┃ ┗ 📜 EXECUTION_BLUEPRINT.md <-- (Dokumen ini)
 ┣ 📂 src/
 ┃ ┣ 📂 app/                 <-- Inisialisasi global (Router, MainLayout, App.tsx)
 ┃ ┣ 📂 features/            <-- FOKUS AI: Isolasi per fitur
 ┃ ┃ ┣ 📂 pos/
 ┃ ┃ ┃ ┣ 📂 ui/
 ┃ ┃ ┃ ┣ 📂 store/
 ┃ ┃ ┃ ┗ 📂 usecases/        <-- CheckoutUseCase, SuspendCartUseCase
 ┃ ┃ ┣ 📂 gold_treasury/     <-- BuybackUseCase, GoldLiquidationUseCase
 ┃ ┃ ┣ 📂 inventory/         <-- ReceiveStockUseCase
 ┃ ┃ ┗ 📂 ...
 ┃ ┣ 📂 shared/              <-- Komponen/Fungsi lintas fitur (Button, DB, Utils)
 ┃ ┗ 📂 pages/               <-- HANYA berisi routing view (Memanggil Features)
```

---

## 🤝 BAB V: PROTOKOL EKSEKUSI (CARA PENGGUNAAN)

Untuk memulai pengerjaan, User cukup memberikan perintah (prompt) kepada AI dengan format berikut:

> *"AI, silakan baca `docs/EXECUTION_BLUEPRINT.md`. Berikan saya Execution Plan untuk **FASE 1.1**."*

**Kewajiban AI saat menerima perintah di atas:**
1. AI membaca dokumen ini.
2. AI menganalisis file yang berkaitan dengan Fase yang diminta.
3. AI membalas dengan *bullet points* langkah-langkah yang akan dilakukan (Execution Plan).
4. AI **BERHENTI** dan menunggu User membalas *"Setuju, eksekusi sekarang"*.
5. Setelah dieksekusi, AI melaporkan hasilnya dan meminta izin untuk lanjut ke Fase berikutnya.

***
*(Akhir Dokumen)*
***

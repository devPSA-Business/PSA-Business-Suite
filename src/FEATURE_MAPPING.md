# Feature Mapping: PSA Jewellery POS

Dokumen ini memetakan fitur utama aplikasi ke struktur file saat ini (Feature-Sliced Design) dan mengidentifikasi kebutuhan fitur yang tersisa.

| Fitur Utama | Modul/File Terkait | Status |
| :--- | :--- | :--- |
| **Penjualan Ritel (Imitasi)** | `src/features/pos` | **Selesai** |
| **Layanan Reparasi/Sepuh** | `src/features/services` | **Selesai** |
| **Transaksi Emas (Buyback/Jual-Beli)** | `src/features/gold` | **Selesai** |
| **Keamanan & Audit** | `src/features/audit`, `src/lib/cryptoIndexedDB.ts` | **Selesai (P0)** |
| **Manajemen Shift** | `src/features/shift` | **Selesai** |
| **Pencatatan HPP** | `src/shared/api/dbService.ts`, `src/features/pos/usecases/CheckoutUseCase.ts` | **Hardened** |
| **Printer Thermal (ESC/POS)** | `src/shared/application/services/IPrintService.ts` | **Interface Ready** |

---

## 🛠️ Analisis Kebutuhan Fitur Tertunda

Berdasarkan audit, berikut adalah fitur yang perlu segera dikembangkan:

1.  **Modul Transaksi Emas:** Perlu pembuatan modul baru di `src/features/gold` untuk menangani logika buyback dan jual-beli emas dengan perhitungan per karat/gram.
2.  **Penyempurnaan Logika HPP:** Memperbarui `src/shared/api/dbService.ts` untuk membedakan logika *Moving Average* (Imitasi) dan *Specific Identification* (Emas).
3.  **Integrasi Printer Thermal:** Menghubungkan `src/shared/api/printService.ts` ke alur transaksi di `src/features/pos` dan `src/features/services`.

---

## 🚀 Rekomendasi Urutan Pengerjaan (FSD Approach)

Untuk menjaga arsitektur tetap bersih, berikut urutan pengerjaan yang direkomendasikan:

1.  **Tahap 1: Penyempurnaan Core (HPP)**
    *   Fokus: Memperbaiki logika `dbService.ts` agar perhitungan HPP akurat. Ini adalah fondasi agar laporan keuangan di `src/features/reports` valid.
2.  **Tahap 2: Implementasi Modul Emas**
    *   Fokus: Membuat `src/features/gold`. Modul ini harus independen dari `pos` ritel.
3.  **Tahap 3: Integrasi Hardware (Printer)**
    *   Fokus: Menghubungkan `printService.ts` ke modul `pos`, `services`, dan `gold`.

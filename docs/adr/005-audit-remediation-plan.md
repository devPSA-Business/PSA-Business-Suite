# Dokumen Eksekusi & Remediasi Audit (v1.3.5)
**Status:** DRAFT (Menunggu Eksekusi)
**Konteks:** Laporan Audit Independen v1.3.5 terhadap sistem PSA Business Suite.

## 1. Konteks dan Objektif
Dokumen ini disusun untuk merespons temuan dari Laporan Audit Independen v1.3.5. Objektif utama adalah meremediasi **1 kerentanan kritis, 3 isu tingkat medium**, menetapkan langkah sistematis untuk integrasi pemantauan (Watchdog), dan peningkatan kualitas antarmuka pengguna tanpa mengorbankan keamanan serta prinsip *offline-first* yang wajib ditegakkan berdasarkan otoritas dokumen arsitektur dan kebijakan Founder.

## 2. Kebijakan dan Prosedur Eksekusi (Rules of Engagement)
Selama pengerjaan *roadmap* ini, AI dan *engineer* **WAJIB** mematuhi pedoman mutlak berikut:
1. **Security-First & Zero-Trust:** Validasi akses tak tergantikan. Semua pengetatan harus direpresentasikan lewat uji tipe dan Firestore Rules (`firestore.rules`). Dilarang mencampuradukkan domain data dan tampilan antarmuka.
2. **Atomic Implementation:** Setiap *patch* (khususnya Fase 1/Kritis) dilakukan bertahap dan diuji kemandiriannya guna meminimalisasi *side effects*. Perbaikan *back-end* tidak boleh menghentikan daya operasional kasir secara tiba-tiba.
3. **Boy Scout Rule:** Pembersihan kode TypeScript `any` (Sisa 160 terdeteksi) disatukan sebagai proses bertahap seiring modifikasi antarmuka yang berkaitan.
4. **Audit Trail Wajib:** Setelah setiap fase selesai dikerjakan, langkah tindakan HARUS dicatat dalam `/AI_TRACK_RECORD.md`.

## 3. Rencana Eksekusi Terukur (Action Plan)

### FASE 1: Remediasi Back-End Kritis & Menengah (Prioritas: Puncak - Sprint 1)
Fase ini berfokus menutup celah kerentanan seketika sebelum fitur pergeseran cabang beroperasi lebih luas.

*   **[1.1] Perbaikan Kritis `assignBranchToUser` (Cloud Function)**
    *   **Permasalahan:** Parameter penentuan fungsi menghapus bersih *Custom Claims* lain seperti penanda otorisasi *role* `ADMIN`.
    *   **Tindakan Eksekusi:** Modifikasi `functions/src/index.ts`. Ambil objek klaim sebelumnya melalui `admin.auth().getUser(targetUserId).customClaims`, aplikasikan *merge state* ke dalam objek baru agar parameter tambahan tidak merusak _role_ yang sah.
*   **[1.2] Perbaikan Kill-Switch Firestore Rule (`system_lock`)**
    *   **Permasalahan:** Aturan mengekang pembacaan _lock_ hanya untuk anggota _branch_. Pada instansi _global lock_, agen terautentikasi akan ditolak *Firestore* & fungsi membatalkan perintah kunci keamanan secara *silent*.
    *   **Tindakan Eksekusi:** Di `firestore.rules`, buat pengecualian eksklusif khusus entitas dokumen global `device_controls/system_lock` sehingga terbaca lepas asalkan pengguna sudah `isVerified()`.
*   **[1.3] Pengetatan Otoritas Rule `sync_events`**
    *   **Permasalahan:** Siapapun dengan status _Verified_ dapat mengekstrak informasi antrian singkronisasi dari semua gerai silang aplikasi.
    *   **Tindakan Eksekusi:** Implementasikan relasi filter konkrit pada Firestore Rules; `allow read, write: if isVerified() && belongsToBranch(incoming());`.
*   **[1.4] Penghapusan Sinkronisasi `store_profile` Palsu**
    *   **Permasalahan:** Memberikan pemicu kerusakan di *Dead Letter Queue (DLQ)*. *Store_profile* murni bersifat lokal dan tidak perlu diteruskan via sinkronisasi ke DB Awan.
    *   **Tindakan Eksekusi:** Hapus perintah fungsi `unitOfWork.registerSync('store_profile', ...)` yang tercantum dalam *Use Case* `SetupStoreUseCase.ts`.

### FASE 2: Integrasi Observabilitas (Prioritas: Tinggi - Sprint 2)
Fokus transisi sistem otonomus dan ketahanan sistem (resiliensi).

*   **[2.1] Setup dan Aktivasi Telegram Watchdog**
    *   **Tindakan Eksekusi:** Bantu tim administratif menciptakan Telegram Bot melalui panduan intervensi `@BotFather`. Pandu integrasi pengamanan kunci token otentikasi melalui jalur perintah resmi CLI `firebase functions:secrets:set` guna mendaftarkan `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` (*dilarang keras* ditanam pada `/.env`). Pengejawantahan script `watchdog.ts` yang diformulasi dapat diaktivasi permanen.

### FASE 3: Pembersihan Antarmuka & Tech Debt (Prioritas: Menengah - Sprint 3)
Fokus ke hal keeleganan UX & kehandalan struktur tipedata.

*   **[3.1] Redesign LoginPage & Onboarding Phase**
    *   **Tindakan Eksekusi:** Rekonstruksi struktur estetika orientasi (onboarding) yang menyesuaikan _Tailwind guidelines_ ("high-end POS enterprise"). Transisi yang rapi serta UX sederhana menarget 2 perintis Founder untuk pengalaman gerai inisiasi awal (*First-time run*).
*   **[3.2] Standarisasi Eliminasi Tipe TypeScript `any` (Gradual)**
    *   **Tindakan Eksekusi:** Di sela optimisasi fase 3.1 & refaktorisasi antarmuka/use-cases, hapus penggunaan struktur data lemah (`any`), kembalikan penstrukturan tipe kepada definisi di dalam parameter `domain/dtos` yang legal di tipe-tipe fungsional (160 instans tersisa).

## 4. Standar Keberhasilan (Definition of Done)
1. **Keamanan Maksimal:** Cloud Function `assignBranchToUser` lulus uji dengan mempertahankan nilai autentikatif `role="ADMIN"`.
2. **Isolasi Cabang:** Aturan proteksi basis data (`firestore.rules`) mencegah kebocoran log `sync_events` membusuk ke akses cabang lain secara mutlak di konsol eksekusi emulator.
3. **Log Kinerja Etis:** Pantauan DLQ sistem telah bebas notifikasi cacat _ghost-calls_ sinkronisasi dari utilitas proksi profil toko (`store_profile`).
4. **UI Refined:** Halaman _Onboarding_ dan *Login Area* menunjukkan representasi _dashboard_ premium tanpa interupsi _layout-shift_.
5. **Aman TypeScript:** Jumlah notasi variabel tipe generik `any` berkurang secara eksponensial di target revisi skema fungsional dan model.

## 5. Mitigasi Risiko Potensial

### A. Potensial Kerusakan Selama Proses (Execution Process)
1.  **Risiko Modifikasi Custom Claims Mengganggu Sesi Berjalan:** Penggantian klaim otoritas bisa melepas masa berlaku token secara paksa pada operasi _mid-transactions_.
    *   **Mitigasi:** Pengerjaan rilis *backend* Fase 1 direkomendasikan ditempatkan pada fase _Maintenance Window_ alias sewaktu pergantian _shift_ (_End of Day_) guna menahan kepanikan kasir.
2.  **Risiko Salah Konfigurasi `system_lock` Menutup Global:**
    *   **Mitigasi:** Membutuhkan unit tes Firebase Emulator/Review sintaks rules bertingkat pada fungsi kompilasi standar sebelum _live-deployment_.
3.  **Kesalahan Pengosongan Obyek DLQ/Sync:**
    *   **Mitigasi:** *Backup* Snapshot data lokal melalui enkripsi standar (SOP Founder: `.psa`) terlebih dulu apabila mengotak-atik sistem logika Sinkronisasi (*Unit of Work*).

### B. Potensial Halangan Setelah Eksekusi Selesai (Post-Deployment)
1.  **Eksposur Token Telegram (Data Breach):**
    *   **Mitigasi:** Menanamkan kewajiban pengecekan (linter/grep verification) bahwa tidak pernah ada format Token Telegram keras masuk lewat _github branch_ & _source-code_ murni tertutup *Firebase Secret Manager* secara spesifik.
2.  **Transisi User Interface Tidak Lazim/Membingungkan:**
    *   **Mitigasi:** Menahan penambahan *over-engineering* antarmuka, menyisakan tata letak familiar (posisi numpad dll) agar adopsi sistematis dari kedua Founder berjalan ringan dengan waktu adaptasi kurang dari semenit per tugas.

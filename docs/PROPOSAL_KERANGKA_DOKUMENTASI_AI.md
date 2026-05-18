---
# **PROPOSAL**  
**KERANGKA DOKUMENTASI KONTEKS UNTUK AGEN AI PADA PROYEK PERANGKAT LUNAK PSA-BUSINESS-SUITE**  
**Versi 1.0**

---

## 1. LATAR BELAKANG
Dalam pengembangan perangkat lunak skala besar, inkonsistensi agen AI sering muncul akibat kurangnya konteks terstruktur yang dapat dibaca mesin. Dokumen seperti `README.md` dan komentar kode tidak dirancang untuk konsumsi agen AI secara efisien.  

Proposal ini mendefinisikan kerangka dokumentasi empat file inti yang memastikan agen AI beroperasi sesuai standar teknis, batasan domain, dan kontrak antar modul tanpa memerlukan klarifikasi berulang.

---

## 2. TUJUAN
1. Menjamin konsistensi perilaku agen AI di seluruh siklus pengembangan.  
2. Mengurangi waktu onboarding agen AI baru dari ±40 jam menjadi <4 jam.  
3. Mencegah pelanggaran batasan domain dan kontrak antar modul.  
4. Meminimalkan konsumsi token konteks melalui struktur informasi bertingkat.  

---

## 3. RUANG LINGKUP PENERAPAN
Kerangka ini wajib diterapkan pada repositori dengan kriteria:  
- >500 berkas kode sumber, atau  
- >50.000 baris kode, atau  
- >5 tim pengembang aktif.  

---

## 4. ARSITEKTUR DOKUMENTASI
Kerangka terdiri dari empat dokumen wajib di root repositori:

| Dokumen         | Fungsi                                      | Batas Maksimal |
|-----------------|---------------------------------------------|----------------|
| `AGENTS.md`     | Standar teknis dan kualitas global          | 150 baris      |
| `CONTEXT.md`    | Indeks bertingkat konteks bisnis, data, kode| 200 baris      |
| `SCOPE.md`      | Batasan domain dan otorisasi perubahan      | 100 baris      |
| `INTERFACES.md` | Kontrak API publik dan tipe data antar modul| 150 baris      |

Detail panjang dipindahkan ke direktori `/docs` dan dirujuk melalui tautan relatif.

---

## 5. SPESIFIKASI ISI DOKUMEN
**5.1 `AGENTS.md` – Standar Operasional Teknis**  
- Arsitektur teknologi dan versi lingkungan.  
- Prosedur operasional: dev, build, test, lint, deployment.  
- Standar kualitas kode dan larangan teknis.  
- Manajemen dependensi dan kontrol versi.  
- Organisasi direktori dan penempatan modul.  

**5.2 `CONTEXT.md` – Indeks Konteks Bertingkat**  
- Tujuan proyek, pengguna akhir, indikator keberhasilan.  
- 4–5 fungsi inti yang mewakili 80% nilai bisnis.  
- Alur proses bisnis end-to-end.  
- Model data esensial: 3–5 entitas inti, relasi, kebijakan RLS.  
- Peta sumber kode Level 1–3: direktori utama, entry point, perintah `tree`.  
- Model peran, hak akses, integrasi eksternal.  

**5.3 `SCOPE.md` – Batasan Domain**  
- Domain fungsional yang menjadi tanggung jawab agen AI.  
- Direktori yang diizinkan/dilarang untuk dimodifikasi.  
- Dependensi antar domain dan API publik yang dapat diakses.  

**5.4 `INTERFACES.md` – Kontrak Antar Modul**  
- Endpoint, fungsi, dan event yang dipublikasikan tiap modul.  
- Tipe data shared di direktori `/types`.  
- SLA format data dan protokol komunikasi antar modul.  

---

## 6. PROTOKOL PEMBUATAN DAN PEMUTAKHIRAN
**6.1 Prompt Pembuatan Awal**  
Gunakan prompt berikut untuk menghasilkan empat dokumen secara simultan:  

> *Anda adalah technical writer. Hasilkan 4 file: AGENTS.md, CONTEXT.md, SCOPE.md, INTERFACES.md untuk proyek skala besar.*  

**Input:**  
- Struktur folder (`tree -L 2 -I node_modules`)  
- `package.json`  
- Skema basis data inti  
- Deskripsi bisnis dan peran pengguna  

**Aturan:**  
1. `AGENTS.md`: Maks 150 baris, fokus standar teknis global.  
2. `CONTEXT.md`: Maks 200 baris, gunakan struktur indeks Level 1/2/3.  
3. `SCOPE.md`: Maks 100 baris, definisikan direktori boleh/tidak boleh diedit.  
4. `INTERFACES.md`: Maks 150 baris, definisikan kontrak API publik antar modul.  
5. Bahasa: Inggris, format deklaratif, ringkas, dapat diverifikasi.  
6. Detail >200 baris dipindahkan ke `/docs` dengan tautan relatif.  
7. Output: 4 blok kode markdown terpisah.  

**6.2 Protokol Pemutakhiran**  
- Setiap perubahan arsitektur, modul, atau kontrak antar modul wajib diperbarui dalam 48 jam.  
- Perubahan pada `SCOPE.md` memerlukan tinjauan manual oleh tech lead.  

---

## 7. INDIKATOR KEBERHASILAN
1. Reduksi pertanyaan klarifikasi agen AI >80%.  
2. Tingkat kegagalan tugas akibat konteks tidak lengkap <5%.  
3. Waktu rata-rata agen AI menyelesaikan tugas >200 baris <15 menit.  
4. Kepatuhan terhadap batasan domain pada `SCOPE.md` 100%.  

---

## 8. RISIKO DAN MITIGASI
| Risiko                        | Dampak                          | Mitigasi                                |
|-------------------------------|---------------------------------|-----------------------------------------|
| Dokumen tidak dipelihara      | Agen AI menghasilkan kode usang | Integrasi cek pemutakhiran pada CI/CD   |
| Informasi berlebihan          | Token konteks habis, biaya naik | Penegakan batas baris & struktur indeks |
| Definisi `SCOPE.md` ambigu    | Pelanggaran batasan domain      | Tinjauan wajib oleh tech lead            |

---

## 9. RENCANA IMPLEMENTASI
**Fase 1: Persiapan**  
Hari 1–2: Ekstraksi metadata proyek (struktur folder, skema DB, `package.json`).  

**Fase 2: Pembuatan Dokumen**  
Hari 3: Eksekusi prompt master, tinjauan & finalisasi oleh tech lead.  

**Fase 3: Integrasi**  
Hari 4: Integrasi dokumen ke pipeline agen AI, sosialisasi ke tim.  

**Fase 4: Pemeliharaan**  
Berkelanjutan: Pemutakhiran dokumen sebagai bagian dari *Definition of Done* tiap sprint.  

---

## 10. PENUTUP
Kerangka dokumentasi ini mengurangi ketergantungan agen AI pada asumsi dan komunikasi ad-hoc. Konsistensi, akurasi, dan kecepatan pengembangan akan meningkat secara terukur. Dokumen ini menjadi *single source of truth* untuk konteks agen AI, memastikan operasi yang konsisten, efisien, dan bebas dari halusinasi.  

**Disusun oleh:** Tim Arsitektur Perangkat Lunak  
**Tanggal:**  8 Mei 2026

---

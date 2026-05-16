# Pedoman Kontribusi (Contributing Guidelines)

Terima kasih telah tertarik untuk berkontribusi pada PSA Business Suite! Kami menyambut baik kontribusi dari siapa pun, mulai dari perbaikan bug, penambahan fitur, perbaikan dokumentasi, hingga ulasan kode.

## Cara Berkontribusi

### 1. Melaporkan Bug
Jika Anda menemukan bug, silakan buat _issue_ baru dengan format berikut:
- **Deskripsi Bug**: Jelaskan bug yang terjadi dengan jelas.
- **Langkah Reproduksi**: Langkah-langkah untuk mereproduksi bug.
- **Perilaku yang Diharapkan**: Apa yang seharusnya terjadi.
- **Screenshots**: (Jika ada) Lampirkan screenshot.
- **Environment**: OS, Browser, versi Node.js.

### 2. Mengajukan Fitur Baru
Kami sangat terbuka dengan ide-fitur baru! Silakan buat _issue_ dengan label `enhancement` dan jelaskan:
- **Masalah**: Masalah apa yang ingin diselesaikan oleh fitur ini?
- **Usulan Solusi**: Bagaimana fitur ini akan menyelesaikan masalah tersebut?
- **Alternatif**: Apakah ada alternatif lain yang sudah dipertimbangkan?

### 3. Mengirimkan Pull Request (PR)
1. *Fork* repositori ini.
2. Buat _branch_ baru dari `main` (misalnya: `feat/adding-new-dashboard` atau `fix/inventory-bug`).
3. Tulis kode Anda, pastikan mengikuti standar gaya kode (Linting, dll).
4. Pastikan menambahkan _Unit Test_ (jika memungkinkan) dan semua tes berhasil dijalankan (`npm run test`).
5. Jangan commit variabel environment (*secrets*).
6. Commit perubahan Anda dengan *Commit Message Convention* (misal: `feat: add new dashboard`, `fix: error on checkout`).
7. _Push_ ke branch Anda dan buat Pull Request ke branch `main`.

## Standar Kode (Code Standards)
- Kami menggunakan **TypeScript** secara ketat. Jangan gunakan `any` kecuali benar-benar mendesak.
- Patuhi arsitektur **Feature-Sliced Design (FSD)** (lihat dokumentasi struktur folder).
- Sanitasi semua data sensitif pelanggan (PII) ketika logging/debugging sebelum dikirim ke remote logging.

## Komunikasi
Semua diskusi teknis utama terjadi di GitHub Issues dan Pull Requests. Pastikan untuk menjaga nada yang ramah dan inklusif sesuai dengan `CODE_OF_CONDUCT.md`.

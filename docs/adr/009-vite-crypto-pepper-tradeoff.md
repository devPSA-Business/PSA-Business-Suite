# ADR 009: VITE_CRYPTO_PEPPER sebagai Application-Level Entropy

**Tanggal:** 2026-05-02
**Status:** DITERIMA
**Konteks:** Sistem Enkripsi Lokal & PBKDF2 Password Hashing

## Latar Belakang
Pada sistem PSA Business Suite v1.4+, autentikasi PIN menggunakan algoritma PBKDF2 (hingga 600K iterasi) yang dikombinasikan dengan random UUID salt per pengguna, serta `VITE_CRYPTO_PEPPER`. Karena aplikasi dirancang *Offline-First* dan *Serverless* murni pada perangkat klien pembaca, seluruh environmental variable yang diawali dengan `VITE_` (termasuk `VITE_CRYPTO_PEPPER`) disertakan di dalam bundle frontend. Akibatnya, `pepper` dapat dibaca dari *source code* pada browser.

*Static forensic audit* menemukan bahwa exposure ini menghapus satu properti dari "pepper" secara definisi kriptografi klasik (yaitu secret yang hanya diketahui oleh server).

## Keputusan
Kita **SEPAKAT** untuk mempertahankan `VITE_CRYPTO_PEPPER` sebagai *Application-Level Entropy*, bukan sebagai rahasia server tersembunyi.

Keputusan ini diambil berdasarkan pertimbangan berikut:
1. **Tidak Ada Backend Rahasia:** Dengan arsitektur yang tidak memiliki backend khusus (hanya Firebase SDK langsung), secara fisik tidak ada lokasi yang "sepenuhnya aman dan kebal" dari klien untuk menyimpan rahasia di runtime.
2. **Pertahanan Utama adalah Iteration Count & Salt:** Komponen utama pelindung *Rainbow Table* atau *Brute-force attack* adalah `user.salt` (UUID v4) ditambah 600.000 iterasi PBKDF2. Keberadaan pepper pada source code klien bertindak sebagai *Site-Specific Constant* yang mencegah *rainbow table* pre-komputasi standar (misal NTLM/MD5 list), meskipun bukan penangkal *targetted rainbow table* jika penyerang membaca memori klien.
3. **Pemisahan Instansi:** Kita sepakat bahwa nilai `VITE_CRYPTO_PEPPER` **diwajibkan unik per-toko deployment**.

## Konsekuensi
- **Positif:** Tidak ada tambahan latency network saat memverifikasi PIN/mengakses sistem Offline-First. Kinerja dan stabilitas saat internet mati tetap optimal (Zero Maintenance Backend).
- **Negatif:** `VITE_CRYPTO_PEPPER` tidak sekuat pepper server tradisional. Jika *malicious string extraction* terhadap bundle frontend dilakukan, pepper ini ketahuan oleh *attacker*.
- **Mitigasi Teknis yang Tetap Dipertahankan:** Parameter iterasi 600.000 memaksa penyerang (yang sudah mensintesis pepper dan salt dari db) tetap membutuhkan waktu yang luar biasa lama per percobaan PIN. *Rate limiting* juga telah diterapkan di layer UI.

## Referensi Terkait
- Laporan Audit Forensik Statis Komprehensif (PSA-AUDIT-2026-v2.0)
- `shared/store/useSecurityStore.ts`

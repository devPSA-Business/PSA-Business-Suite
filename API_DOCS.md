# Dokumentasi API & Firebase Callables (API Docs)

Karena PSA Business Suite ini sangat bergantung pada arsitektur **BaaS (Backend-as-a-Service)** dengan **Firebase Firestore** sebagai database, mayoritas proses komunikasi data dilakukan menggunakan SDK Client via Firestore Queries (dengan aturan keamanan ketat di `firestore.rules`).

Namun, ada beberapa operasi backend eksklusif yang dieksekusi melalui **Firebase Callable Functions** (BFF - Backend for Frontend) untuk merahasiakan *secrets* atau melakukan tugas tingkat lanjut.

## Daftar Callable Functions

Fungsi-fungsi ini dapat dipanggil menggunakan *method* `httpsCallable` dari Firebase Functions SDK dari client.

### 1. `hashPin`
Digunakan untuk melakukan enkripsi PIN secara asinkron atau memvalidasi PIN dengan standar enkripsi di server. Tujuannya adalah untuk tidak pernah mengenkripsi/dekripsi secara murni di *client-side* apabila dirasa rawan (walaupun *current architecture* mendukung enkripsi *offline-first* lokal via PBKDF2 WebCrypto, fungsi ini disiapkan untuk sinkronisasi tingkat admin).

- **Input Payload**:
  ```json
  {
    "pin": "123456",
    "salt": "rand0mSaltString"
  }
  ```
- **Output**:
  ```json
  {
    "hash": "pbkdf2_hashed_string..."
  }
  ```

### 2. `queryGemini`
Digunakan untuk mem-proxy permintaan NLQ (Natural Language Query) ke Google Cloud Gemini (AI AI). 
- **Mengapa di Backend?**: Menyimpan kunci API (`GEMINI_API_KEY`) di server sehingga kerahasiannya terjamin dan terhindar dari *scraping* / *abuse* oleh pihak tak bertanggung jawab di front-end.
- **Input Payload**:
  ```json
  {
    "prompt": "Tampilkan laporan penjualan minggu ini",
    "context": {
      "userRole": "admin"
    }
  }
  ```
- **Output**:
  ```json
  {
    "reply": "Format JSON query Dexie/Firestore hasil AI..."
  }
  ```

### 3. `sendTelegramAlert`
Digunakan untuk mengirimkan notifikasi *alert* keamanan (seperti gagal login berkali-kali, atau deteksi anomali saat shift) secara otomatis ke grup atau e-mail sistem.
- **Input Payload**:
  ```json
  {
    "message": "Peringatan keamanan: Gagal buka brankas 3x",
    "severity": "high",
    "shopId": "toko_utama"
  }
  ```
- **Output**:
  ```json
  {
    "success": true,
    "deliveredAt": 1699994994
  }
  ```

## Aturan Rate Limiting & Auth
Setiap *Callable Function* pada *backend* ini tunduk pada aturan:
1. **Authenticated Context**: Hanya memproses _request_ dari _user_ yang sedang memiliki sesi yang valid (melalui context `auth`).
2. **Rate Limiting**: Secara default akan memblokir bila jumlah pemanggilan mencapai anomali berkat perlindungan dari Google Cloud Load Balancer (opsional jika App Check diaktifkan).
3. **P0 Policy**: Tidak ada log dari payload yang mencantumkan *PII mentah* ke Cloud Logging. Data PII disanitasi secara seragam sebelum dilempar.

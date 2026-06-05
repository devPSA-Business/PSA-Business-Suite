# Panduan Deploy PSA Business Suite
## Untuk Pemilik — Tanpa Perlu Keahlian Pemrograman

> **Estimasi waktu:** 30–45 menit (sekali saja, setelah ini deploy otomatis)  
> **Biaya:** Rp 0 / bulan (Firebase Spark Plan gratis)  
> **Yang dibutuhkan:** Akun Google (Gmail), akun GitHub

---

## Ringkasan Proses

```
Langkah 1 → Buka Firebase Console → Salin 6 nilai konfigurasi
Langkah 2 → Buat Service Account → Download file JSON
Langkah 3 → Masukkan 7 nilai ke GitHub Secrets
Langkah 4 → Jalankan "Bootstrap Secrets" (1 klik)
Langkah 5 → Jalankan Deploy (1 klik)
```

Setelah selesai: **setiap kali ada update kode, deploy berjalan otomatis.**

---

## LANGKAH 1 — Ambil Konfigurasi Firebase (6 nilai)

### 1.1 Buka Firebase Console

1. Buka browser → kunjungi **https://console.firebase.google.com**
2. Login dengan akun Google **dev.psajewelry@gmail.com**
3. Klik project **"psa-business-suite"**

   > ⚠️ Jika project belum ada, lihat bagian "Membuat Project Firebase" di bawah.

### 1.2 Ambil Konfigurasi Web App

1. Di Firebase Console, klik ikon **⚙️ (roda gigi)** → **Project settings**
2. Scroll ke bawah ke bagian **"Your apps"**
3. Cari app dengan ikon **`</>`** (Web app). Klik iconnya.
4. Kamu akan lihat kode seperti ini:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "psa-business-suite.firebaseapp.com",
  projectId: "psa-business-suite",
  storageBucket: "psa-business-suite.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

5. **Catat 6 nilai ini** (kamu akan butuhkan di Langkah 3):

| Nama Secret di GitHub | Nilai dari Firebase |
|---|---|
| `VITE_FIREBASE_API_KEY` | nilai `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | nilai `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | nilai `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | nilai `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | nilai `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | nilai `appId` |

> 💡 **Tips:** Buka Notepad/Notes, ketik nama secret-nya, paste nilainya di sebelahnya. Jangan tutup halaman ini dulu.

---

## LANGKAH 2 — Buat Service Account (file JSON)

Service Account adalah "kunci" yang digunakan oleh GitHub untuk deploy ke Firebase atas nama kamu.

### 2.1 Generate Service Account Key

1. Masih di **Firebase Console → Project Settings**
2. Klik tab **"Service accounts"**
3. Klik tombol **"Generate new private key"** (berwarna biru)
4. Klik **"Generate key"** di dialog konfirmasi
5. File JSON akan **ter-download otomatis** ke komputer kamu (contoh nama: `psa-business-suite-firebase-adminsdk-xxxxx.json`)

### 2.2 Buka Isi File JSON

1. Buka **File Explorer** (Windows) / **Finder** (Mac)
2. Cari file JSON yang baru di-download (biasanya di folder **Downloads**)
3. Klik kanan file tersebut → **"Open with" → "Notepad"** (Windows) atau **"TextEdit"** (Mac)
4. Kamu akan lihat teks panjang yang dimulai dengan `{` dan diakhiri dengan `}`
5. **Pilih semua teks** (Ctrl+A di Windows / Cmd+A di Mac) → **Salin** (Ctrl+C / Cmd+C)

> ⚠️ **PENTING:** File JSON ini sangat sensitif. Jangan share ke siapapun. Setelah dimasukkan ke GitHub Secrets, hapus file ini dari komputer.

---

## LANGKAH 3 — Masukkan ke GitHub Secrets

### 3.1 Buka Halaman Secrets GitHub

1. Buka browser → kunjungi **https://github.com/devPSA-Business/PSA-Business-Suite**
2. Klik **"Settings"** (di menu atas, paling kanan)
3. Di sidebar kiri, klik **"Secrets and variables"** → **"Actions"**
4. Kamu akan lihat halaman "Actions secrets"

### 3.2 Tambahkan Secret Satu per Satu

Untuk setiap secret, caranya sama:
1. Klik tombol **"New repository secret"** (hijau)
2. Isi **Name** dengan nama secret (contoh: `VITE_FIREBASE_API_KEY`)
3. Isi **Secret** dengan nilainya
4. Klik **"Add secret"**

**Tambahkan 7 secrets berikut (urutan bebas):**

| No | Name | Value | Dari mana |
|---|---|---|---|
| 1 | `VITE_FIREBASE_API_KEY` | `AIzaSy...` | Langkah 1.2 |
| 2 | `VITE_FIREBASE_AUTH_DOMAIN` | `psa-business-suite.firebaseapp.com` | Langkah 1.2 |
| 3 | `VITE_FIREBASE_PROJECT_ID` | `psa-business-suite` | Langkah 1.2 |
| 4 | `VITE_FIREBASE_STORAGE_BUCKET` | `psa-business-suite.appspot.com` | Langkah 1.2 |
| 5 | `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789` | Langkah 1.2 |
| 6 | `VITE_FIREBASE_APP_ID` | `1:123:web:abc` | Langkah 1.2 |
| 7 | `FIREBASE_SERVICE_ACCOUNT` | *(seluruh isi file JSON dari Langkah 2.2)* | Langkah 2.2 |

> ✅ Setelah 7 secrets ini diisi, kamu sudah 90% selesai.

---

## LANGKAH 4 — Jalankan Bootstrap Secrets (1 klik)

Langkah ini akan otomatis membuat `VITE_CRYPTO_PEPPER` — kunci kriptografi untuk keamanan PIN kasir.

### 4.1 Buat PAT (Personal Access Token) untuk Bootstrap

Ini hanya diperlukan sekali untuk Langkah 4.

1. Buka **https://github.com/settings/tokens?type=beta** (pastikan login sebagai pemilik repo)
2. Klik **"Generate new token"**
3. Isi **Token name**: `PSA-Bootstrap-OneTime`
4. Di **"Repository access"**, pilih **"Only select repositories"** → pilih `PSA-Business-Suite`
5. Di **"Permissions"**, cari **"Secrets"** → set ke **"Read and write"**
6. Klik **"Generate token"** → **salin token yang muncul** (hanya tampil sekali!)
7. Kembali ke **GitHub → Settings → Secrets → Actions**
8. Tambahkan secret baru:
   - **Name:** `PAT_SECRETS_WRITE`
   - **Value:** token yang baru disalin
9. Klik **"Add secret"**

### 4.2 Jalankan Workflow Bootstrap

1. Di GitHub, klik tab **"Actions"**
2. Di sidebar kiri, cari dan klik **"🔐 Bootstrap — Auto-Generate Secrets"**
3. Klik tombol **"Run workflow"** (di kanan)
4. Pilih **"all-generated"** → klik **"Run workflow"** (hijau)
5. Tunggu 1–2 menit hingga muncul tanda ✅ hijau

> ✅ `VITE_CRYPTO_PEPPER` sudah otomatis dibuat dan disimpan di Secrets.

---

## LANGKAH 5 — Deploy Pertama (1 klik)

1. Di GitHub, klik tab **"Actions"**
2. Di sidebar kiri, klik **"🚀 Deploy — Produksi Firebase Hosting"**
3. Klik tombol **"Run workflow"** → **"Run workflow"** (hijau)
4. Tunggu **5–10 menit**

### Cara Cek Hasil:
- Tanda ✅ hijau = **BERHASIL** → Buka https://psa-business-suite.web.app
- Tanda ❌ merah = **GAGAL** → Klik run yang merah → klik "deploy" → scroll untuk lihat error

---

## Langkah Selanjutnya Setelah Deploy Berhasil

### A. Aktifkan Firebase Authentication

1. Firebase Console → **Authentication** → **Sign-in method**
2. Klik **"Email/Password"** → aktifkan toggle → klik **"Save"**

### B. Buat Akun Pertama (Owner/Admin)

1. Buka **https://psa-business-suite.web.app**
2. Klik **"Daftar Akun Baru"**
3. Masukkan email: `owner.psajewelry@gmail.com` (atau email pilihan)
4. Buat password yang kuat
5. Setelah masuk, ikuti proses **Onboarding** untuk setup toko pertama

---

## Membuat Project Firebase (Jika Belum Ada)

Jika project `psa-business-suite` belum ada di Firebase Console:

1. Buka **https://console.firebase.google.com**
2. Klik **"Add project"**
3. **Project name:** `psa-business-suite`
4. **Project ID:** `psa-business-suite` (pastikan sama persis!)
5. Matikan Google Analytics (tidak diperlukan)
6. Klik **"Create project"**
7. Setelah project dibuat:
   - Klik **"Web"** (`</>`) untuk tambah web app
   - **App nickname:** `PSA Business Suite`
   - Centang **"Also set up Firebase Hosting"**
   - Klik **"Register app"**
8. Lanjutkan ke Langkah 1.2 di atas

---

## Deploy Otomatis Setelah Setup Selesai

Setelah Langkah 1–5 selesai, **kamu tidak perlu melakukan apapun lagi** untuk deploy:

- Setiap kali ada perubahan kode → GitHub Actions otomatis menjalankan CI + Deploy
- Kamu akan terima email notifikasi ke `dev.psajewelry@gmail.com` dan `owner.psajewelry@gmail.com` setiap deploy

---

## Troubleshooting — Masalah Umum

### Deploy gagal dengan error "Unable to create credential"
**Penyebab:** `FIREBASE_SERVICE_ACCOUNT` salah atau tidak lengkap  
**Solusi:** Ulangi Langkah 2 — pastikan **seluruh isi** file JSON disalin (dari `{` sampai `}`)

### Deploy gagal dengan error "Project not found"
**Penyebab:** `VITE_FIREBASE_PROJECT_ID` salah  
**Solusi:** Pastikan nilainya persis `psa-business-suite` (huruf kecil semua, ada tanda hubung)

### App terbuka tapi tidak bisa login
**Penyebab:** Firebase Authentication belum diaktifkan  
**Solusi:** Lihat bagian "Aktifkan Firebase Authentication" di atas

### Tidak ada tombol "Daftar" di halaman login
**Penyebab:** Versi app lama yang di-cache  
**Solusi:** Tekan **Ctrl+Shift+R** (Windows) atau **Cmd+Shift+R** (Mac) untuk hard refresh

---

*Dokumen ini dibuat untuk PSA Jewellery — Sampit, Kalimantan Tengah*  
*Diperbarui: Juni 2026 | Versi App: 1.5.0*

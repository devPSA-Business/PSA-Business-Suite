/**
 * @business_rule: Centralized Error Dictionary (Indonesian)
 * Menyediakan pesan error yang ramah pengguna dan non-teknis.
 */

export const ERROR_MESSAGES = {
  // Database & Sync
  DATABASE_RESET_FAILED: 'Gagal mereset data lokal. Silakan muat ulang halaman.',
  SYNC_FAILED: 'Gagal sinkronisasi data ke awan. Periksa koneksi internet Anda.',
  SYNC_CONFLICT: 'Ditemukan perbedaan data di server. Silakan pilih versi yang akan disimpan.',
  
  // Security & Auth
  PIN_INVALID: 'PIN yang Anda masukkan salah.',
  LOGIN_FAILED: 'Gagal masuk. Silakan periksa kembali email & password Anda.',
  AUTH_METHOD_DISABLED: 'Metode otentikasi belum aktif. Hubungi Administrator.',
  AUTH_INVALID_CREDENTIALS: 'Email atau password salah. Akses ditolak.',
  AUTH_NETWORK_ERROR: 'Koneksi terputus. Pastikan perangkat memiliki koneksi internet.',
  UNAUTHORIZED_ACTION: 'Anda tidak memiliki wewenang untuk melakukan tindakan ini.',
  CRYPTO_BOOT_FAILED: 'Modul keamanan gagal dimuat. Pastikan pengaturan browser mendukung WebCrypto.',
  FIREBASE_CONFIG_MISSING: 'Konfigurasi Cloud tidak ditemukan. Aplikasi berjalan dalam Mode Offline.',
  
  // Financial & Form
  INVALID_NUMERIC: 'Nilai angka tidak valid atau di luar batas yang diizinkan.',
  CUSTOMER_REQUIRED: 'Silakan pilih pelanggan terlebih dahulu.',
  ITEM_DESCRIPTION_REQUIRED: 'Deskripsi barang wajib diisi.',
  WEIGHT_INVALID: 'Berat harus berupa angka positif (0 - 1000g).',
  PRICE_INVALID: 'Harga harus berupa angka positif (Min Rp 1).',
  
  // System & Workers
  WORKER_TIMEOUT: 'Sistem pemantau kesehatan (Health Check) tidak merespons. Mencoba memulai ulang...',
  HEALTH_CHECK_CRITICAL: 'Ditemukan masalah stabilitas pada perangkat ini. Segera hubungi IT Support.',
  GENERAL_ERROR: 'Terjadi kesalahan sistem. Silakan coba beberapa saat lagi.'
};

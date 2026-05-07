/**
 * @ai_context    : Mapping error teknis ke pesan yang aman untuk user.
 * @security_tier : HIGH
 * @business_rule : User TIDAK boleh melihat stack trace atau nama tabel internal.
 */

export interface MappedError {
  userMessage: string;   // Ditampilkan ke user via UI/Toast
  logMessage: string;    // Dikirim ke Logger (detail teknis)
  code: string;          // Error code unik untuk support
}

function generateSupportCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function mapErrorToUser(error: unknown): MappedError {
  const err = error instanceof Error ? error : new Error(String(error));
  const msg = err.message.toLowerCase();

  // 1. Firebase Auth errors
  if (msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential')) {
    return {
      userMessage: 'Email atau password tidak valid.',
      logMessage: err.message,
      code: 'AUTH_001',
    };
  }
  if (msg.includes('auth/too-many-requests')) {
    return {
      userMessage: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa saat.',
      logMessage: err.message,
      code: 'AUTH_002',
    };
  }

  // 2. Network / Offline errors
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline') || msg.includes('failed to fetch')) {
    return {
      userMessage: 'Tidak dapat terhubung ke server. Data tetap tersimpan aman di perangkat lokal.',
      logMessage: err.message,
      code: 'NET_001',
    };
  }

  // 3. Firestore Permission errors
  if (msg.includes('permission-denied') || msg.includes('insufficient permissions') || msg.includes('missing or insufficient permissions')) {
    return {
      userMessage: 'Anda tidak memiliki akses untuk melakukan tindakan ini.',
      logMessage: err.message,
      code: 'PERM_001',
    };
  }

  // 4. Encryption / Crypto errors
  if (msg.includes('pin salah') || msg.includes('unwrap') || msg.includes('decryption failed') || msg.includes('mac check failed')) {
    return {
      userMessage: 'PIN tidak valid atau sesi enkripsi telah berakhir.',
      logMessage: err.message,
      code: 'CRYPTO_001',
    };
  }

  // 5. Business Logic errors (Aman ditampilkan)
  if (msg.includes('stok') || msg.includes('stock') || msg.includes('quantity') || msg.includes('insufficient')) {
    return {
      userMessage: err.message, 
      logMessage: err.message,
      code: 'STOCK_001',
    };
  }
  
  // 6. Race Condition / Sync errors
  if (msg.includes('version conflict')) {
    return {
      userMessage: 'Data telah diubah oleh perangkat lain. Silakan muat ulang dan coba lagi.',
      logMessage: err.message,
      code: 'SYNC_001',
    };
  }

  // Default: Pesan generik untuk mencegah kebocoran Stack Trace
  const supportCode = generateSupportCode();
  return {
    userMessage: `Terjadi kesalahan sistem. Silakan coba lagi atau hubungi admin. (Kode: ${supportCode})`,
    logMessage: `[${supportCode}] ${err.stack ?? err.message}`,
    code: 'GENERIC_001',
  };
}

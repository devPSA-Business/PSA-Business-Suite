/**
 * @ai_context    : Mapping error teknis ke pesan yang aman untuk user.
 * @security_tier : HIGH
 * @business_rule : User TIDAK boleh melihat stack trace atau nama tabel internal.
 */

export class MappedError extends Error {
  userMessage: string;
  logMessage: string;
  code: string;

  constructor(userMessage: string, logMessage: string, code: string) {
    super(userMessage);
    this.name = 'MappedError';
    this.userMessage = userMessage;
    this.logMessage = logMessage;
    this.code = code;
  }
}

function generateSupportCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function mapErrorToUser(error: unknown): MappedError {
  const err = error instanceof Error ? error : new Error(String(error));
  const msg = err.message.toLowerCase();

  // 1. Firebase Auth errors
  if (msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential')) {
    return new MappedError(
      'Email atau password tidak valid.',
      err.message,
      'AUTH_001'
    );
  }
  if (msg.includes('auth/too-many-requests')) {
    return new MappedError(
      'Terlalu banyak percobaan login. Coba lagi dalam beberapa saat.',
      err.message,
      'AUTH_002'
    );
  }

  // 2. Network / Offline errors
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline') || msg.includes('failed to fetch')) {
    return new MappedError(
      'Tidak dapat terhubung ke server. Data tetap tersimpan aman di perangkat lokal.',
      err.message,
      'NET_001'
    );
  }

  // 3. Firestore Permission errors
  if (msg.includes('permission-denied') || msg.includes('insufficient permissions') || msg.includes('missing or insufficient permissions')) {
    return new MappedError(
      'Anda tidak memiliki akses untuk melakukan tindakan ini.',
      err.message,
      'PERM_001'
    );
  }

  // 4. Encryption / Crypto errors
  if (msg.includes('pin salah') || msg.includes('unwrap') || msg.includes('decryption failed') || msg.includes('mac check failed')) {
    return new MappedError(
      'PIN tidak valid atau sesi enkripsi telah berakhir.',
      err.message,
      'CRYPTO_001'
    );
  }

  // 5. Business Logic errors (Aman ditampilkan)
  if (msg.includes('stok') || msg.includes('stock') || msg.includes('quantity') || msg.includes('insufficient') || msg.includes('akses ditolak') || msg.includes('tidak ada shift') || msg.includes('shift lain masih terbuka') || msg.includes('keranjang belanja kosong') || msg.includes('shift tidak ditemukan') || msg.includes('ditemukan') || msg.includes('diblokir')) {
    // Preserve literal logic errors
    return new MappedError(
      err.message,
      err.message,
      'BIZ_001'
    );
  }
  
  // 6. Race Condition / Sync errors
  if (msg.includes('version conflict')) {
    return new MappedError(
      'Data telah diubah oleh perangkat lain. Silakan muat ulang dan coba lagi.',
      err.message,
      'SYNC_001'
    );
  }

  // Default: Pesan generik untuk mencegah kebocoran Stack Trace
  const supportCode = generateSupportCode();
  return new MappedError(
    `Terjadi kesalahan sistem. Silakan coba lagi atau hubungi admin. (Kode: ${supportCode})`,
    `[${supportCode}] ${err.stack ?? err.message}`,
    'GENERIC_001'
  );
}

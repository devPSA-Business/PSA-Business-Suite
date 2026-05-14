/**
 * @ai_context Interface layanan administrasi database lokal.
 * @security_tier HIGH
 * @business_rule Semua method di interface ini wajib diotorisasi ADMIN/MANAGER sebelum dipanggil dari UI.
 */
export interface IDatabaseAdminService {
  /** Export seluruh data lokal ke JSON string (untuk backup manual). */
  exportDatabase(): Promise<string>;

  /** Import data dari JSON string (untuk restore backup). */
  importDatabase(jsonData: string): Promise<void>;

  /** Pulihkan data dari Cloud Firestore ke Dexie lokal. */
  recoverFromCloud(): Promise<void>;

  /** Hapus SEMUA data lokal. BERBAHAYA — hanya untuk reset perangkat baru. */
  clearDatabase(): Promise<void>;
}

/**
 * @ai_context Interface untuk operasi admin database: export, import, recovery cloud, clear.
 * @security_tier HIGH
 * @business_rule Semua operasi ini bersifat destruktif atau ireversibel.
 *               Hanya boleh dipanggil dari UI yang sudah terproteksi role ADMIN.
 * @changelog:
 *   2026-05-21 — BATCH E: Sinkronisasi interface dengan DatabaseAdminServiceImpl
 *                (tambah recoverFromCloud yang sudah ada di impl tapi missing di interface)
 */
export interface IDatabaseAdminService {
  exportDatabase(): Promise<string>;
  importDatabase(jsonData: string): Promise<void>;
  /** Pulihkan data stock & transaksi dari Firestore Cloud ke IndexedDB lokal. */
  recoverFromCloud(): Promise<void>;
  clearDatabase(): Promise<void>;
}

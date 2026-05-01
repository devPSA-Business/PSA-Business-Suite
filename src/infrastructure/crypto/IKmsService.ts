/**
 * IKmsService mendefinisikan kontrak interface untuk layanan KMS (Key Management Service)
 * yang menangani enkripsi dan dekripsi (wrap/unwrap) kunci perangkat.
 */

export interface IKmsService {
  /**
   * Membungkus (wrap) kunci perangkat menggunakan enkripsi KMS sisi server.
   * Digunakan untuk mengamankan kunci master perangkat sebelum disimpan.
   * 
   * @param key - Raw ArrayBuffer dari kunci yang akan dibungkus.
   * @param context - Informasi konteks tambahan untuk keperluan audit dan keamanan (misalnya deviceId).
   * @returns Promise yang berisi kunci yang telah dibungkus (wrappedKey).
   */
  wrapKey(key: ArrayBuffer, context: string): Promise<ArrayBuffer>;

  /**
   * Membuka (unwrap) kunci perangkat yang dibungkus menggunakan layanan KMS.
   * Digunakan saat aplikasi perlu memuat kembali kunci enkripsi perangkat yang aman.
   * 
   * @param wrappedKey - ArrayBuffer dari kunci yang terbungkus.
   * @param context - Informasi konteks tambahan yang harus sesuai dengan saat kunci dibungkus.
   * @returns Promise yang berisi raw kunci yang telah dibuka (unwrappedKey).
   */
  unwrapKey(wrappedKey: ArrayBuffer, context: string): Promise<ArrayBuffer>;
}

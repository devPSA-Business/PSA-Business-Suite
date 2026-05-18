/**
 * @lockdown_status: CRITICAL_CRYPTO_MODULE
 * @ai_context Sistem Manajer Database Enkripsi Lokal (IndexedDB AES-GCM).
 * @security_tier HIGH
 * @business_rule LOGIKA AKAN DIROMBAK DI FASE 1 (Menjadi FULL LOCAL, Serverless).
 * Dilarang mengubah ALGO atau KEY_LENGTH untuk menjaga integritas data lintas-generasi.
 * @warning: DO NOT MODIFY without thorough context review.
 * @last_audit: 2026-04-19
 */
import { logger } from './logger';
import { Dexie } from 'dexie';

export class CryptoIndexedDB {
  private key: CryptoKey | null = null;
  private rawDeviceKey: ArrayBuffer | null = null;
  private currentKeyId: string | null = null;
  private readonly ALGO = 'AES-GCM';
  private readonly KEY_LENGTH = 256;

  /**
   * @ai_context: PBKDF2 v2 Upgrade (OWASP 2023) with Seamless Migration
   * Konfigurasi iterasi PBKDF2. v1 (100k) digunakan untuk data lama, v2 (600k) untuk data baru.
   */
  private readonly PBKDF2_CONFIG = {
    v1: { iterations: 100000 },
    v2: { iterations: 600000 },
  } as const;
  private readonly CURRENT_PBKDF2_VERSION = 'v2';

  // 1. Generate a new ephemeral device key
  async generateDeviceKey(): Promise<CryptoKey> {
    const key = await window.crypto.subtle.generateKey(
      { name: this.ALGO, length: this.KEY_LENGTH },
      true, // extractable temporarily for wrapping
      ['encrypt', 'decrypt']
    );
    return key;
  }

  // KMS Server Wrap/Unwrap completely removed (FASE 1 - Serverless PWA)

  private async _deriveKeyFromPin(
    pin: string, 
    salt: Uint8Array, 
    iterations: number = this.PBKDF2_CONFIG.v2.iterations
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as Uint8Array<ArrayBuffer>,
        iterations: iterations,
        hash: 'SHA-256',
      },
      baseKey,
      { name: this.ALGO, length: this.KEY_LENGTH },
      true, // Key must be extractable to be used for wrapping/unwrapping other keys
      ['wrapKey', 'unwrapKey']
    );
  }

  async wrapKeyWithPin(deviceKey: CryptoKey, pin: string, salt: Uint8Array): Promise<string> {
    const iterations = this.PBKDF2_CONFIG[this.CURRENT_PBKDF2_VERSION].iterations;
    const wrappingKey = await this._deriveKeyFromPin(pin, salt, iterations);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const wrappedKeyBuffer = await window.crypto.subtle.wrapKey(
      'raw',
      deviceKey,
      wrappingKey,
      { name: this.ALGO, iv: iv } 
    );
    const ivBase64 = this.arrayBufferToBase64(iv.buffer);
    const wrappedBase64 = this.arrayBufferToBase64(wrappedKeyBuffer);
    return `${this.CURRENT_PBKDF2_VERSION}|${ivBase64}.${wrappedBase64}`;
  }

  async wrapRawKeyWithPin(rawKeyMaterial: ArrayBuffer, pin: string, salt: Uint8Array): Promise<string> {
    const iterations = this.PBKDF2_CONFIG[this.CURRENT_PBKDF2_VERSION].iterations;
    const wrappingKey = await this._deriveKeyFromPin(pin, salt, iterations);
    // Import rawKeyMaterial as extractable just for wrapping
    const extractableDeviceKey = await window.crypto.subtle.importKey(
      'raw',
      rawKeyMaterial,
      { name: this.ALGO },
      true,
      ['encrypt', 'decrypt']
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const wrappedKeyBuffer = await window.crypto.subtle.wrapKey(
      'raw',
      extractableDeviceKey,
      wrappingKey,
      { name: this.ALGO, iv: iv }
    );
    const ivBase64 = this.arrayBufferToBase64(iv.buffer);
    const wrappedBase64 = this.arrayBufferToBase64(wrappedKeyBuffer);
    return `${this.CURRENT_PBKDF2_VERSION}|${ivBase64}.${wrappedBase64}`;
  }

  async unwrapKeyWithPin(wrappedKeyByPin: string, pin: string, salt: Uint8Array): Promise<void> {
    const temporaryKey = await this._unwrapInternal(wrappedKeyByPin, pin, salt, true);
    // F-02: Segera impor ulang kunci sebagai kunci operasional dengan extractable: false
    const keyData = await window.crypto.subtle.exportKey('raw', temporaryKey);
    this.rawDeviceKey = keyData.slice(0); // Menyimpan salinan untuk keperluan auto-backup sesuai rekomendasi
    
    const secureOperationalKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: this.ALGO },
      false, // NOT EXTRACTABLE
      ['encrypt', 'decrypt']
    );
    this.key = secureOperationalKey;
    logger.info('Successfully unwrapped key with PIN.');
  }

  // Phase 1.2: Seamless Re-encryption Pipeline
  async reWrapKeyWithPin(wrappedKeyByPin: string, currentPin: string, oldSalt: Uint8Array, newPin: string, newSalt: Uint8Array): Promise<string> {
    // Unwrap as extractable (internal logic will handle iterations)
    const extractableKey = await this._unwrapInternal(wrappedKeyByPin, currentPin, oldSalt, true);
    // Wrap again with new pin/salt (will use current v2 config)
    return await this.wrapKeyWithPin(extractableKey, newPin, newSalt);
  }

  private async _unwrapInternal(wrappedKeyByPin: string, pin: string, salt: Uint8Array, extractable: boolean): Promise<CryptoKey> {
    let iterations: number = this.PBKDF2_CONFIG.v1.iterations; // Default fallback for v1 legacy
    let cleanWrappedKey = wrappedKeyByPin;

    // Detect version prefix
    if (wrappedKeyByPin.startsWith('v2|')) {
      iterations = this.PBKDF2_CONFIG.v2.iterations;
      cleanWrappedKey = wrappedKeyByPin.substring(3);
    }

    const unwrappingKey = await this._deriveKeyFromPin(pin, salt, iterations);
    
    let iv: Uint8Array;
    let wrappedKeyBuffer: ArrayBuffer;
    
    // Check if format containing random IV, else fallback to legacy
    if (cleanWrappedKey.includes('.')) {
      const parts = cleanWrappedKey.split('.');
      iv = new Uint8Array(this.base64ToArrayBuffer(parts[0]));
      wrappedKeyBuffer = this.base64ToArrayBuffer(parts[1]);
    } else {
      iv = new Uint8Array(salt.buffer as ArrayBuffer, 0, 12);
      wrappedKeyBuffer = this.base64ToArrayBuffer(cleanWrappedKey);
    }
    
    try {
      return await window.crypto.subtle.unwrapKey(
        'raw',
        wrappedKeyBuffer,
        unwrappingKey,
        { name: this.ALGO, iv: iv as unknown as Uint8Array<ArrayBuffer> },
        { name: this.ALGO, length: this.KEY_LENGTH },
        extractable, 
        extractable ? ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'] : ['encrypt', 'decrypt']
      );
    } catch (error) {
      logger.error('Failed to unwrap key with PIN. PIN may be incorrect.', { error });
      throw new Error('PIN salah.');
    }
  }

  // For testing purposes only
  setKey(key: CryptoKey, keyId: string = 'test-key') {
    this.key = key;
    this.currentKeyId = keyId;
  }

  getKey(): CryptoKey | null {
    return this.key;
  }

  getKeyId(): string | null {
    return this.currentKeyId;
  }

  getRawDeviceKey(): ArrayBuffer | null {
    return this.rawDeviceKey;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async encryptRecord(record: any): Promise<{ ciphertext: string; iv: string; keyId: string }> {
    if (!this.key || !this.currentKeyId) throw new Error('Encryption key not initialized');

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(record));

    const ciphertextBuffer = await Dexie.waitFor(window.crypto.subtle.encrypt(
      { name: this.ALGO, iv: iv },
      this.key,
      encodedData
    ));

    return {
      ciphertext: this.arrayBufferToBase64(ciphertextBuffer),
      iv: this.arrayBufferToBase64(iv.buffer),
      keyId: this.currentKeyId
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async decryptRecord(encryptedRecord: { ciphertext: string; iv: string; keyId?: string }): Promise<any> {
    if (!this.key) throw new Error('Encryption key not initialized');
    if (encryptedRecord.keyId && encryptedRecord.keyId !== this.currentKeyId) {
      throw new Error(`Key mismatch. Record encrypted with ${encryptedRecord.keyId}, current key is ${this.currentKeyId}`);
    }

    const ivBuffer = this.base64ToArrayBuffer(encryptedRecord.iv);
    const ciphertextBuffer = this.base64ToArrayBuffer(encryptedRecord.ciphertext);

    const decryptedBuffer = await Dexie.waitFor(window.crypto.subtle.decrypt(
      { name: this.ALGO, iv: new Uint8Array(ivBuffer) },
      this.key,
      ciphertextBuffer
    ));

    const decodedData = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decodedData);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const cryptoDB = new CryptoIndexedDB();

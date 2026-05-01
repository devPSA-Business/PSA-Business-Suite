/**
 * @file validate_backup.ts
 * @description Node.js CLI script untuk memvalidasi integritas backup dengan Checksum SHA-256 dan skenario PIN Rotasi.
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

async function mockBackup(data: string, passphrase: string): Promise<{ data: string, checksum: string }> {
  // Simulasi enkripsi AES-256-GCM
  const iv = randomBytes(12);
  const key = createHash('sha256').update(passphrase).digest();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  const payload = JSON.stringify({ iv: iv.toString('hex'), authTag, encrypted });
  const checksum = createHash('sha256').update(payload).digest('hex');
  
  return { data: payload, checksum };
}

async function mockRestore(payload: string, checksum: string, passphrase: string): Promise<string> {
  // Validasi Checksum
  const currentChecksum = createHash('sha256').update(payload).digest('hex');
  if (currentChecksum !== checksum) throw new Error('ERR_CHECKSUM_MISMATCH');
  
  const { iv, authTag, encrypted } = JSON.parse(payload);
  const key = createHash('sha256').update(passphrase).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

async function runTests() {
  console.log('--- Fase 2: Validasi Integritas & Rotasi ---');
  const PIN_LAMA = '123456';
  const PIN_BARU = '654321';
  const DATA = '{"transaksi_id": "T123", "jumlah": 1000000}';

  // Skenario 1: Backup & Restore Normal
  const { data, checksum } = await mockBackup(DATA, PIN_LAMA);
  const restored = await mockRestore(data, checksum, PIN_LAMA);
  console.log(restored === DATA ? '✅ Test 1: Backup/Restore Standard [Pass]' : '❌ Test 1: Backup/Restore Standard [Fail]');

  // Skenario 2: Korupsi Data
  try {
    await mockRestore(data + 'corrupted', checksum, PIN_LAMA);
    console.log('❌ Test 2: Deteksi Korupsi Data [Fail]');
  } catch {
    console.log('✅ Test 2: Deteksi Korupsi Data [Pass]');
  }

  // Skenario 3: PIN Rotasi
  const { data: dataBaru, checksum: checkBaru } = await mockBackup(DATA, PIN_BARU);
  try {
    await mockRestore(dataBaru, checkBaru, PIN_LAMA);
    console.log('❌ Test 3: Rotasi PIN/Kunci (Pencegahan Akses) [Fail]');
  } catch {
    console.log('✅ Test 3: Rotasi PIN/Kunci (Pencegahan Akses) [Pass]');
  }

  console.log('--- Validasi Backup Selesai ---');
}

runTests().catch(console.error);

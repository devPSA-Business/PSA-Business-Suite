/// <reference lib="webworker" />
import { db } from '../shared/api/db';

self.onmessage = async (e) => {
  const { action, keyMaterial: keyMaterialBuffer, passphrase } = e.data;
  
  if (action === 'export') {
    try {
      // 1. Extract all data
      const tables = db.tables;
      const EXCLUDED_TABLES = ['keys_meta'];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allData: Record<string, any[]> = {};
      
      for (const table of tables) {
        if (!EXCLUDED_TABLES.includes(table.name)) {
          allData[table.name] = await table.toArray();
        }
      }
      
      const stringified = JSON.stringify(allData);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(stringified);
      
      // 2. Compress via CompressionStream (GZIP)
      const compressedStream = new Blob([dataBuffer]).stream().pipeThrough(new CompressionStream('gzip'));
      const compressedBuffer = await new Response(compressedStream).arrayBuffer();
      
      // 3. Key Derivation with PBKDF2 (600k iterations)
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        keyMaterialBuffer || encoder.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 600000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      // 4. Encrypt with AES-GCM
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        compressedBuffer
      );
      
      // 5. Package standard blob: 16 byte SALT | 12 byte IV | Ciphertext
      const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      result.set(salt, 0);
      result.set(iv, salt.length);
      result.set(new Uint8Array(encrypted), salt.length + iv.length);
      
      const blob = new Blob([result], { type: 'application/octet-stream' });
      
      self.postMessage({ status: 'success', blob });
    } catch (err) {
      self.postMessage({ status: 'error', error: (err instanceof Error ? err.message : String(err)) || 'Encryption failed' });
    }
  } else if (action === 'import') {
      try {
        const { fileData } = e.data; // ArrayBuffer
        const dataArr = new Uint8Array(fileData);
        
        // Extract Parts
        const salt = dataArr.slice(0, 16);
        const iv = dataArr.slice(16, 28);
        const ciphertext = dataArr.slice(28);
        
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode(passphrase),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt,
            iterations: 600000,
            hash: 'SHA-256'
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['decrypt']
        );
        
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          ciphertext
        );
        
        // Decompress GZIP
        const decompressedStream = new Blob([decrypted]).stream().pipeThrough(new DecompressionStream('gzip'));
        const decompressedBuffer = await new Response(decompressedStream).arrayBuffer();
        
        const stringified = new TextDecoder().decode(decompressedBuffer);
        const allData = JSON.parse(stringified);
        
        // Restore to indexedDB
        const tables = db.tables;
        await db.transaction('rw', tables, async () => {
          for (const table of tables) {
            if (allData[table.name]) {
              await table.clear();
              await table.bulkAdd(allData[table.name]);
            }
          }
        });
        
        self.postMessage({ status: 'success' });
      } catch (err) {
        self.postMessage({ status: 'error', error: (err instanceof Error ? err.message : String(err)) || 'Decryption failed (Invalid Passphrase?)' });
      }
  }
};

import * as functions from 'firebase-functions';
import * as crypto from 'crypto';

/**
 * @ai_context Layanan hashing PIN server-side via PBKDF2.
 * @security_tier CRITICAL
 * @business_rule Hanya pengguna TERAUTENTIKASI yang boleh memanggil fungsi ini.
 *                Iterasi dibatasi max 650.000 untuk mencegah DoS.
 */
export const hashPin = functions
  .runWith({ secrets: ['CRYPTO_PEPPER'] })
  .https.onCall(async (data, context) => {

    // ─── AUTH GUARD (P0) ────────────────────────────────────────────────────
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Fungsi ini hanya dapat dipanggil oleh pengguna yang telah terautentikasi.',
      );
    }

    // ─── INPUT VALIDATION ───────────────────────────────────────────────────
    const { pin, saltHex, usePepper, iterations } = data as {
      pin?: string;
      saltHex?: string;
      usePepper?: boolean;
      iterations?: number;
    };

    if (!pin || !saltHex || !iterations) {
      throw new functions.https.HttpsError('invalid-argument', 'Field pin, saltHex, dan iterations wajib diisi.');
    }

    const safeIterations = Math.min(Number(iterations), 650000);
    if (safeIterations < 100000) {
      throw new functions.https.HttpsError('invalid-argument', 'Iterasi minimum adalah 100.000.');
    }

    let finalPin = pin;
    if (usePepper) {
      const pepper = process.env.CRYPTO_PEPPER;
      if (!pepper) {
        throw new functions.https.HttpsError('internal', 'Konfigurasi sistem error.');
      }
      finalPin = pin + pepper;
    }

    const salt = Buffer.from(saltHex, 'hex');

    return new Promise<{ hash: string }>((resolve, reject) => {
      crypto.pbkdf2(finalPin, salt, safeIterations, 32, 'sha256', (err, derivedKey) => {
        if (err) {
          reject(new functions.https.HttpsError('internal', 'Hash computation failed'));
        } else {
          resolve({ hash: derivedKey.toString('hex') });
        }
      });
    });
  });

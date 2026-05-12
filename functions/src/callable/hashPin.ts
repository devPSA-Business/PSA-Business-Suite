import * as functions from 'firebase-functions';
import * as crypto from 'crypto';

export const hashPin = functions.runWith({ secrets: ['CRYPTO_PEPPER'] }).https.onCall(
  async (data, context) => {
    const { pin, saltHex, usePepper, iterations } = data;
    
    if (!pin || !saltHex || !iterations) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing fields');
    }

    const safeIterations = Math.min(Number(iterations), 650000);

    let finalPin = pin;
    if (usePepper) {
      const pepper = process.env.CRYPTO_PEPPER;
      if (!pepper) {
        throw new functions.https.HttpsError('internal', 'System configuration error');
      }
      finalPin = pin + pepper;
    }

    const salt = Buffer.from(saltHex, 'hex');

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(finalPin, salt, safeIterations, 32, 'sha256', (err, derivedKey) => {
        if (err) {
          reject(new functions.https.HttpsError('internal', 'Hash computation failed'));
        } else {
          resolve({ hash: derivedKey.toString('hex') });
        }
      });
    });
  }
);

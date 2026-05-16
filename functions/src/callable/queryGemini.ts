import * as functions from 'firebase-functions';
import fetch from 'node-fetch';

/**
 * @ai_context Proxy aman untuk query Gemini AI — melewati API Key ke client dilarang.
 * @security_tier CRITICAL
 * @business_rule Hanya user TERAUTENTIKASI yang boleh memanggil fungsi ini.
 *                Semua data PII dimask sebelum dikirim ke Gemini.
 */

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

const SYSTEM_PROMPT = `Kamu adalah asisten analitik bisnis untuk toko perhiasan PSA di Sampit, Kalimantan Tengah.
Tugasmu: menganalisis data agregat transaksi, inventaris, dan layanan untuk menjawab pertanyaan owner/manajer.
- Gunakan Bahasa Indonesia yang ringkas dan profesional.
- Jangan pernah menyebut nama pelanggan atau data pribadi.
- Fokus pada insight bisnis yang actionable.
- Format angka dalam Rupiah (Rp) bila relevan.`;

export const queryGemini = functions
  .runWith({ secrets: ['GEMINI_API_KEY'] })
  .https.onCall(async (data, context) => {

    // ─── AUTH GUARD (P0) ────────────────────────────────────────────────────
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Fungsi ini hanya dapat dipanggil oleh pengguna yang telah terautentikasi.',
      );
    }

    // ─── INPUT VALIDATION ───────────────────────────────────────────────────
    const { question, aggregates, userId } = data as {
      question?: string;
      aggregates?: Record<string, unknown>;
      userId?: string;
    };

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Field "question" wajib diisi.');
    }
    if (!aggregates || typeof aggregates !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Field "aggregates" wajib berupa objek.');
    }
    if (!userId || userId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'userId tidak cocok dengan sesi aktif.');
    }

    // ─── API KEY GUARD ──────────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'Konfigurasi sistem: API Key tidak tersedia.');
    }

    // ─── PII MASKING (ARD P0) ───────────────────────────────────────────────
    let payloadString = JSON.stringify(aggregates);
    payloadString = payloadString.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, '<<PII_EMAIL>>');
    payloadString = payloadString.replace(/(08|\+62)[0-9]{8,11}/g, '<<PII_PHONE>>');
    payloadString = payloadString.replace(/\d{16}/g, '<<PII_CARD>>');
    payloadString = payloadString.replace(/"customerName"\s*:\s*"([^"]{2,})"/g, '"customerName":"<<PII>>"');

    // ─── GEMINI API CALL ────────────────────────────────────────────────────
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const prompt = `${SYSTEM_PROMPT}\n\n---\nPertanyaan: ${question.trim()}\n\nData Agregat:\n${payloadString}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        functions.logger.error('[queryGemini] API error', { status: response.status, uid: context.auth!.uid, body: errText.slice(0, 200) });
        throw new functions.https.HttpsError('internal', `Gemini API error: ${response.status}`);
      }

      const result = (await response.json()) as GeminiResponse;
      const answer = result.candidates?.[0]?.content?.parts?.[0]?.text;

      functions.logger.info('[queryGemini] Success', { uid: context.auth!.uid });
      return { answer: answer?.trim() || 'AI tidak dapat memberikan respons untuk pertanyaan ini.' };
    } catch (error) {
      if (error instanceof functions.https.HttpsError) throw error;
      functions.logger.error('[queryGemini] Unexpected error', error);
      throw new functions.https.HttpsError('internal', 'Gagal berkomunikasi dengan AI. Coba lagi.');
    }
  });

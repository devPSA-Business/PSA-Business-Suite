import * as functions from 'firebase-functions/v2';
import fetch from 'node-fetch';

export const queryGemini = functions.https.onCall(
  { secrets: ['GEMINI_API_KEY'], cors: true },
  async (request) => {
    const { question, aggregates, userId } = request.data;
    
    if (!question || !aggregates || !userId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing fields');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError('internal', 'API Key missing');
    }

    let payloadString = JSON.stringify(aggregates);
    // Masking basic PII based on ARD P0
    payloadString = payloadString.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, '<<PII_REMOVED>>');
    payloadString = payloadString.replace(/(08|\+62)[0-9]{8,11}/g, '<<PII_REMOVED>>');
    payloadString = payloadString.replace(/\d{16}/g, '<<PII_REMOVED>>');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `Question: ${question}. Context: ${payloadString}` }] }]
        })
      });

      if (!response.ok) {
        throw new functions.https.HttpsError('internal', `Gemini API Error: ${response.status}`);
      }

      const data = await response.json() as any;
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

      return { answer: answer || 'Tidak ada respons dari AI.' };
    } catch (error) {
      throw new functions.https.HttpsError('internal', 'Failed to communicate with AI', error);
    }
  }
);

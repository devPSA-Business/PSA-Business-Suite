import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

app.post('/api/ask-gemini', async (req, res) => {
  const { question, aggregates, userId } = req.body;
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts:[{ text: `Question: ${question}. Context: ${JSON.stringify(aggregates)}` }] }]
      })
    });

    if (!response.ok) throw new Error('Gemini API Error');
    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada respons.';
    res.json({ answer });
  } catch (error) {
    console.error('[AI_GATEWAY_ERROR]', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/hash-pin', (req, res) => {
  const { pin, saltHex, usePepper, iterations } = req.body;
  if (!pin || !saltHex || !iterations) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let finalPin = pin;
  if (usePepper) {
    const pepper = process.env.CRYPTO_PEPPER || process.env.VITE_CRYPTO_PEPPER || 'FALLBACK_SERVER_PEPPER';
    finalPin = pin + pepper;
  }

  const salt = Buffer.from(saltHex, 'hex');
  
  crypto.pbkdf2(finalPin, salt, iterations, 32, 'sha256', (err, derivedKey) => {
    if (err) {
      console.error('[BFF_CRYPTO_ERROR]', err);
      return res.status(500).json({ error: 'Hash computation failed' });
    }
    res.json({ hash: derivedKey.toString('hex') });
  });
});

export default app;

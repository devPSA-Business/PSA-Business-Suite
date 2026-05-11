/**
 * @deprecated BFF Express Server - Ditandai untuk dihapus (Phase 2 Migration).
 * Semua layanan dialihkan ke Firebase Cloud Functions (functions/).
 */
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

app.post('/api/ask-gemini', async (req, res) => {
  const { question, aggregates, userId } = req.body;
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

    // P0: SANITIZE PII Mentah
    let payloadString = JSON.stringify(aggregates);
    // Masking basic PII based on ARD P0
    payloadString = payloadString.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi, '<<PII_REMOVED>>'); // Email
    payloadString = payloadString.replace(/(08|\+62)[0-9]{8,11}/g, '<<PII_REMOVED>>'); // No HP
    payloadString = payloadString.replace(/\d{16}/g, '<<PII_REMOVED>>'); // NIK / CC

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts:[{ text: `Question: ${question}. Context: ${payloadString}` }] }]
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

  // HARD LIMIT CAP INTERATIONS untuk Mencegah CPU Exhaustion / Denial of Service
  const safeIterations = Math.min(Number(iterations), 650000); // Batas maksimal 650K

  let finalPin = pin;
  if (usePepper) {
    const pepper = process.env.CRYPTO_PEPPER || process.env.VITE_CRYPTO_PEPPER;
    if (!pepper) {
      console.error('[BFF_CRYPTO_ERROR] CRYPTO_PEPPER environment variable is missing!')
      return res.status(500).json({ error: 'System configuration error: CRYPTO_PEPPER must be set' });
    }
    finalPin = pin + pepper;
  }

  const salt = Buffer.from(saltHex, 'hex');
  
  crypto.pbkdf2(finalPin, salt, safeIterations, 32, 'sha256', (err, derivedKey) => {
    if (err) {
      console.error('[BFF_CRYPTO_ERROR]', err);
      return res.status(500).json({ error: 'Hash computation failed' });
    }
    res.json({ hash: derivedKey.toString('hex') });
  });
});

app.post('/api/telegram-alert', async (req, res) => {
  const { action, message, level } = req.body;
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return res.status(400).json({ error: 'Telegram configuration is missing on server.' });
  }
  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  let emoji = "ℹ️";
  if (level === "error" || level === "fatal") emoji = "🚨";
  else if (level === "warn") emoji = "⚠️";

  const text = `${emoji} [${action || "SYSTEM"}] ${message}`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
      }
    );

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.statusText}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[TELEGRAM_ALERT_ERROR]', error);
    res.status(500).json({ error: 'Failed to send Telegram alert' });
  }
});

export default app;

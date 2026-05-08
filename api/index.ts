import express from 'express';

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

export default app;

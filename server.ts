import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for Gemini proxy
  app.post('/api/ask-gemini', async (req, res) => {
    const { question, aggregates, userId } = req.body;
    
    // Robust Recursive Sanitization for PII protection (P0 Compliance)
    const SANITIZE_KEYS = ['email', 'phone', 'address', 'customerName', 'nik', 'pin', 'password', 'phoneNumber'];
    
    const sanitize = (obj: any): any => {
      if (!obj || typeof obj !== 'object') {
        if (typeof obj === 'string') {
          // Identify potential phone numbers, emails, or NIKs in strings
          let s = obj;
          s = s.replace(/\b\d{12,19}\b/g, '<<PII_REMOVED>>'); // NIK/Credit Card patterns
          s = s.replace(/\+?\d{8,15}/g, '<<PII_REMOVED>>');   // Phone number patterns
          s = s.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '<<PII_REMOVED>>'); // Email patterns
          return s;
        }
        return obj;
      }
      
      const newObj = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        if (SANITIZE_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
          (newObj as any)[key] = '<<PII_REMOVED>>';
        } else if (typeof obj[key] === 'object') {
          (newObj as any)[key] = sanitize(obj[key]);
        } else {
          (newObj as any)[key] = sanitize(obj[key]);
        }
      }
      return newObj;
    };

    const sanitizedQuestion = sanitize(question);
    const sanitizedAggregates = sanitize(aggregates);
    const context = JSON.stringify(sanitizedAggregates);

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: [{ role: 'user', parts: [{ text: `Question: ${sanitizedQuestion}. Context: ${context}` }] }],
      });
      res.json({ answer: response.text });
    } catch (e) {
      console.error('[AI_GATEWAY_ERROR]', e);
      res.status(500).json({ error: 'Error calling Gemini' });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();

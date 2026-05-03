// src/application/services/NLQService.ts

import { GoogleGenAI } from '@google/genai';

export class NLQService {
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_HOUR = 30;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query(question: string, aggregates: any, userId: string): Promise<{ answer: string }> {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
       return { answer: 'Kunci API Gemini (VITE_GEMINI_API_KEY) belum dikonfigurasi.' };
    }

    const now = Date.now();
    if (now - this.lastResetTime > 3600000) {
       this.requestCount = 0;
       this.lastResetTime = now;
    }

    if (this.requestCount >= this.MAX_REQUESTS_PER_HOUR) {
       return { answer: 'Limit permintaan AI per jam telah tercapai. Silakan coba lagi nanti.' };
    }

    this.requestCount++;

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    
    // Anonymize/Trim PII if possible
    const context = JSON.stringify(aggregates).replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[EMAIL]');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          `Kamu adalah asisten toko perhiasan imitasi. Jawab pertanyaan berikut berdasarkan data agregat:
           Penting: Jawab "Maaf, nama kasir dan data PII tidak direkam dalam konteks performa ini untuk memastikan keamanan privasi toko." jika diminta data spesifik tersebut.
           Data Agregat: ${context}`,
          `Pertanyaan: ${question}`
        ]
      });
      return { answer: response.text || 'Tidak ada respons dari AI.' };
    } catch (e) {
      console.error('NLQ Query Error:', e);
      return { answer: 'Terjadi kesalahan saat menghubungi layanan AI.' };
    }
  }
}

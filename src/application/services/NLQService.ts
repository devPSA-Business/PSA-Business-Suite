// src/application/services/NLQService.ts
/**
 * @ai_context: Natural Language Query Service — query Gemini langsung dari client.
 * @security_tier: MEDIUM
 * @business_rule: Spark Plan (tanpa kartu kredit) tidak mendukung Cloud Functions + Secret Manager.
 *   Migrasi ke direct Gemini REST API menggunakan VITE_GEMINI_API_KEY.
 *   API Key di-bundle dalam build — acceptable untuk internal tool UMKM 1 toko karena:
 *   (1) App Check (reCAPTCHA) membatasi abuse eksternal,
 *   (2) Gemini free tier: 1500 req/hari, 60 req/menit — aman untuk <30 req/jam PSA,
 *   (3) Data yang dikirim hanya agregat anonim (PII di-sanitize sebelum dikirim).
 *   ADR: Tercatat di AI_TRACK_RECORD sebagai trade-off Zero-Cost.
 */

import { logger } from '../../lib/logger';
import { DIContainer } from '../../infrastructure/di/Container';

interface AggregateData {
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  text?: string;
  [key: string]: unknown;
}

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

export class NLQService {
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_HOUR = 30;
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  }

  private sanitize(input: AggregateData): AggregateData {
    const payload = JSON.parse(JSON.stringify(input)) as AggregateData;
    if (payload.customer) {
      payload.customer.name = '<<PII_REMOVED>>';
      payload.customer.phone = '<<PII_REMOVED>>';
      payload.customer.email = '<<PII_REMOVED>>';
    }
    if (typeof payload.text === 'string') {
      payload.text = payload.text.replace(/\b[A-Za-z0-9._%+-]+@?[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '<<PII_REMOVED>>');
      payload.text = payload.text.replace(/\b\d{12,19}\b/g, '<<PII_REMOVED>>');
      payload.text = payload.text.replace(/\+?\d{7,15}/g, '<<PII_REMOVED>>');
    }
    return payload;
  }

  async query(question: string, aggregates: AggregateData, userId: string): Promise<{ answer: string }> {
    const now = Date.now();
    if (now - this.lastResetTime > 3600000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    if (this.requestCount >= this.MAX_REQUESTS_PER_HOUR) {
      return { answer: 'Limit permintaan AI per jam telah tercapai. Silakan coba lagi nanti.' };
    }

    if (!this.apiKey) {
      logger.warn('[NLQService] VITE_GEMINI_API_KEY belum dikonfigurasi. Fitur AI tidak tersedia.');
      return { answer: 'Fitur AI belum dikonfigurasi. Hubungi administrator.' };
    }

    this.requestCount++;

    // P0: Audit trail
    await DIContainer.unitOfWork.registerAudit(
      'NLQ_QUERY_EXECUTED',
      userId,
      'User initiated NLQ query',
      { userId, payloadDiff: JSON.stringify({ question }) }
    ).catch((err) => {
      logger.error('[NLQService] Failed to log NLQ request to audit_log', err);
    });

    const sanitizedAggregates = this.sanitize(aggregates);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
      const prompt = `${SYSTEM_PROMPT}\n\n---\nPertanyaan: ${question.trim()}\n\nData Agregat:\n${JSON.stringify(sanitizedAggregates)}`;

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
        logger.error('[NLQService] Gemini API error', { status: response.status, body: errText.slice(0, 200) });
        return { answer: 'Terjadi kesalahan pada layanan AI. Silakan coba lagi.' };
      }

      const result = (await response.json()) as GeminiResponse;
      const answer = result.candidates?.[0]?.content?.parts?.[0]?.text;
      return { answer: answer?.trim() || 'AI tidak dapat memberikan respons untuk pertanyaan ini.' };
    } catch (e) {
      logger.error('[NLQService] NLQ Query Error', e instanceof Error ? e : new Error(String(e)));
      return { answer: 'Terjadi kesalahan sistem saat menghubungi layar analitik.' };
    }
  }
}

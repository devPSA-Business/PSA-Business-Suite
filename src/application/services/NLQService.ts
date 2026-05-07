// src/application/services/NLQService.ts

import { logger } from '../../lib/logger';

interface AggregateData {
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  text?: string;
  [key: string]: unknown;
}

export class NLQService {
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_HOUR = 30;

  private sanitize(input: AggregateData): AggregateData {
    const payload = JSON.parse(JSON.stringify(input)) as AggregateData;
    if (payload.customer) {
      payload.customer.name = '<<PII_REMOVED>>';
      payload.customer.phone = '<<PII_REMOVED>>';
      payload.customer.email = '<<PII_REMOVED>>';
    }
    if (typeof payload.text === 'string') {
      payload.text = payload.text.replace(/\b\d{12,19}\b/g, '<<PII_REMOVED>>');
      payload.text = payload.text.replace(/\+?\d{7,15}/g, '<<PII_REMOVED>>');
    }
    return payload;
  }

  async query(question: string, aggregates: AggregateData, userId: string): Promise<{ answer: string }> {
    try {
      const response = await fetch('/api/ask-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, aggregates, userId }),
      });
      if (!response.ok) throw new Error('Backend proxy error');
      const data = await response.json();
      return { answer: data.answer || 'Tidak ada respons dari AI.' };
    } catch (e) {
      logger.error('NLQ Query Error', e instanceof Error ? e : new Error(String(e)));
      return { answer: 'Terjadi kesalahan sistem saat menghubungi layar analitik.' };
    }
  }
}

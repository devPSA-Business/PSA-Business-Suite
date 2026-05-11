// src/application/services/NLQService.ts

import { logger } from '../../lib/logger';
import { functions } from '../../shared/api/firebase';
import { httpsCallable } from 'firebase/functions';

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
      payload.text = payload.text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '<<PII_REMOVED>>');
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

    this.requestCount++;
    const sanitizedAggregates = this.sanitize(aggregates);

    try {
      if (!functions) throw new Error('Firebase functions not initialized');
      const queryGeminiCall = httpsCallable(functions, 'queryGemini');
      const response = await queryGeminiCall({ question, aggregates: sanitizedAggregates, userId });
      const data = response.data as { answer: string };
      return { answer: data.answer || 'Tidak ada respons dari AI.' };
    } catch (e) {
      logger.error('NLQ Query Error', e instanceof Error ? e : new Error(String(e)));

      return { answer: 'Terjadi kesalahan sistem saat menghubungi layar analitik.' };
    }
  }
}

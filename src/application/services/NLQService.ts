// src/application/services/NLQService.ts
/**
 * @ai_context: Natural Language Query Service — Gemini via BFF proxy.
 * @security_tier: HIGH (P0 Compliant setelah migrasi ke Cloudflare Worker proxy)
 * @business_rule:
 *   PRODUKSI: VITE_GEMINI_PROXY_URL → Cloudflare Worker → Gemini API
 *     - API key tersimpan di Cloudflare Secrets, TIDAK di bundle JS
 *     - Free tier Cloudflare Workers: 100.000 req/hari (margin aman 138x dari kebutuhan PSA)
 *     - ADR: Fix P0 violation "NO SECRETS IN CLIENT" dari AGENTS.md
 *
 *   DEV LOKAL: VITE_GEMINI_API_KEY (fallback) → direct Gemini API
 *     - Hanya untuk development lokal tanpa proxy
 *     - TIDAK boleh di-commit ke .env atau di-set di GitHub Secrets produksi
 *     - Gunakan .env.local (di-gitignore) untuk dev lokal
 *
 * @worker: workers/gemini-proxy/ — deploy sekali via `wrangler deploy`
 */

import { logger } from '../../lib/logger';
import { DIContainer } from '../../infrastructure/di/Container';

interface AggregateData {
  customer?: { name?: string; phone?: string; email?: string };
  text?: string;
  [key: string]: unknown;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

// System prompt khusus PSA — Bahasa Indonesia, fokus bisnis perhiasan
const SYSTEM_PROMPT = `Kamu adalah asisten analitik bisnis untuk PSA Jewellery di Sampit, Kalimantan Tengah.
Toko bergerak di 3 bidang: (1) perhiasan imitasi (Xuping/Titanium/Stainless), (2) jasa perawatan & reparasi, (3) buyback emas.
Tugasmu: analisis data agregat transaksi & inventaris untuk menjawab pertanyaan Owner/Manajer.
- Gunakan Bahasa Indonesia ringkas dan profesional.
- JANGAN sebut nama pelanggan atau data pribadi apapun.
- Fokus pada insight bisnis yang actionable.
- Format angka dalam Rupiah (Rp) dengan titik sebagai pemisah ribuan.
- Jika data tidak cukup untuk menjawab, katakan dengan jelas.`;

const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
const DEFAULT_MODEL = 'gemini-2.5-flash';

export class NLQService {
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_HOUR = 30;

  // PRODUKSI: pakai proxy (API key di server)
  private readonly proxyUrl: string | undefined;
  // DEV LOKAL: fallback direct (hanya .env.local, tidak di GitHub Secrets)
  private readonly devApiKey: string | undefined;

  constructor() {
    this.proxyUrl  = import.meta.env.VITE_GEMINI_PROXY_URL || undefined;
    this.devApiKey = (!this.proxyUrl && import.meta.env.DEV)
      ? import.meta.env.VITE_GEMINI_API_KEY || undefined
      : undefined;
  }

  /** Apakah fitur AI tersedia? */
  get isAvailable(): boolean {
    return Boolean(this.proxyUrl || this.devApiKey);
  }

  /** Bangun URL endpoint Gemini sesuai lingkungan */
  private buildUrl(model: string): string {
    const path = `/v1beta/models/${model}:generateContent`;
    if (this.proxyUrl) {
      return `${this.proxyUrl.replace(/\/$/, '')}${path}`;
    }
    if (this.devApiKey) {
      logger.warn('[NLQService] DEV MODE: Menggunakan direct Gemini API. Jangan gunakan di produksi.');
      return `${GEMINI_BASE}${path}?key=${this.devApiKey}`;
    }
    return '';
  }

  /** Sanitasi PII wajib sebelum data dikirim ke AI (P0 AGENTS.md) */
  private sanitize(input: AggregateData): AggregateData {
    const payload = JSON.parse(JSON.stringify(input)) as AggregateData;
    if (payload.customer) {
      payload.customer.name  = '<<PII_REMOVED>>';
      payload.customer.phone = '<<PII_REMOVED>>';
      payload.customer.email = '<<PII_REMOVED>>';
    }
    if (typeof payload.text === 'string') {
      // Email
      payload.text = payload.text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '<<PII_REMOVED>>');
      // Nomor kartu / NIK / rekening (12-19 digit)
      payload.text = payload.text.replace(/\b\d{12,19}\b/g, '<<PII_REMOVED>>');
      // Nomor telepon (7-15 digit, opsional +)
      payload.text = payload.text.replace(/\+?\d[\d\s-]{6,14}\d/g, '<<PII_REMOVED>>');
    }
    return payload;
  }

  async query(
    question: string,
    aggregates: AggregateData,
    userId: string
  ): Promise<{ answer: string }> {
    // ── Rate limit ────────────────────────────────────────────────────────
    const now = Date.now();
    if (now - this.lastResetTime > 3_600_000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    if (this.requestCount >= this.MAX_REQUESTS_PER_HOUR) {
      return { answer: 'Limit 30 permintaan AI per jam tercapai. Coba lagi setelah 1 jam.' };
    }

    // ── Ketersediaan ──────────────────────────────────────────────────────
    if (!this.isAvailable) {
      logger.warn('[NLQService] Tidak ada konfigurasi Gemini (proxy/key). Fitur AI dinonaktifkan.');
      return { answer: 'Fitur AI belum dikonfigurasi. Hubungi administrator.' };
    }

    this.requestCount++;

    // ── Audit trail P0 ────────────────────────────────────────────────────
    await DIContainer.unitOfWork.registerAudit(
      'NLQ_QUERY_EXECUTED',
      userId,
      'NLQ query dikirim ke AI',
      { userId, question: question.slice(0, 200) }
    ).catch((err) => logger.error('[NLQService] Audit log gagal', err));

    const sanitized = this.sanitize(aggregates);
    const url = this.buildUrl(DEFAULT_MODEL);
    if (!url) return { answer: 'Konfigurasi AI tidak valid.' };

    const prompt = [
      SYSTEM_PROMPT,
      '---',
      `Pertanyaan: ${question.trim()}`,
      '',
      `Data Agregat:\n${JSON.stringify(sanitized, null, 2)}`,
    ].join('\n');

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
        }),
      });

      if (res.status === 429) {
        return { answer: 'Layanan AI sedang sibuk. Coba lagi dalam beberapa menit.' };
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        logger.error('[NLQService] Gemini error', { status: res.status, body: errBody.slice(0, 200) });
        return { answer: 'Layanan AI mengalami gangguan. Coba lagi nanti.' };
      }

      const data = (await res.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return { answer: text || 'AI tidak dapat memberikan respons untuk pertanyaan ini.' };

    } catch (err) {
      logger.error('[NLQService] Fetch error', err instanceof Error ? err : new Error(String(err)));
      return { answer: 'Koneksi ke layanan AI gagal. Periksa jaringan dan coba lagi.' };
    }
  }
}

/**
 * PSA Gemini Proxy — Cloudflare Worker
 * 
 * @architecture: BFF (Backend-for-Frontend) ringan untuk menyembunyikan
 *   GEMINI_API_KEY dari bundle client. Menggantikan VITE_GEMINI_API_KEY (P0 violation).
 *
 * @cost: Cloudflare Workers Free Tier = 100.000 req/hari GRATIS, tanpa kartu kredit.
 *   PSA maksimal ~30 req/jam = ~720 req/hari → margin aman 138x.
 *
 * @security:
 *   1. GEMINI_API_KEY tersimpan di Cloudflare Secret (tidak pernah ke browser)
 *   2. CORS dibatasi hanya dari domain resmi PSA
 *   3. Rate limit 60 req/menit per IP (sama dengan Gemini free tier limit)
 *   4. Request body dibatasi 50KB untuk mencegah abuse
 *   5. Tidak ada logging konten permintaan (privasi)
 *
 * @deploy:
 *   1. npm install -g wrangler
 *   2. wrangler login
 *   3. wrangler secret set GEMINI_API_KEY   ← masukkan API key Gemini
 *   4. wrangler deploy
 *   5. Copy URL worker → set sebagai VITE_GEMINI_PROXY_URL di GitHub Secrets
 */

export interface Env {
  GEMINI_API_KEY: string;
}

// Domain yang diizinkan mengakses proxy ini
const ALLOWED_ORIGINS = [
  'https://psa-business-suite.web.app',
  'https://psa-business-suite.firebaseapp.com',
  // Preview channels Firebase (pattern: https://psa-business-suite--*.web.app)
];

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';
const MAX_BODY_SIZE = 50 * 1024; // 50KB — lebih dari cukup untuk NLQ
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 menit
const RATE_LIMIT_MAX = 60; // sesuai Gemini free tier

// In-memory rate limiter per IP (reset saat worker instance di-recycle)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  // Cek exact match dulu
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Cek Firebase preview channel pattern
  if (/^https:\/\/psa-business-suite--[a-z0-9-]+\.web\.app$/.test(origin)) return true;
  return false;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true; // allowed
  }

  if (entry.count >= RATE_LIMIT_MAX) return false; // blocked

  entry.count++;
  return true; // allowed
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');

    // ── CORS preflight ─────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      if (!isOriginAllowed(origin)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin!) });
    }

    // ── Hanya POST ──────────────────────────────────────────────────────────
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // ── Validasi origin ─────────────────────────────────────────────────────
    if (!isOriginAllowed(origin)) {
      return new Response('Forbidden', { status: 403 });
    }

    // ── Rate limit per IP ───────────────────────────────────────────────────
    const clientIP = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (!checkRateLimit(clientIP)) {
      return new Response('Rate Limit Exceeded', {
        status: 429,
        headers: {
          ...corsHeaders(origin!),
          'Retry-After': '60',
        },
      });
    }

    // ── Validasi ukuran body ─────────────────────────────────────────────────
    const contentLength = parseInt(request.headers.get('Content-Length') ?? '0', 10);
    if (contentLength > MAX_BODY_SIZE) {
      return new Response('Payload Too Large', { status: 413 });
    }

    // ── Ekstrak model dari URL path ──────────────────────────────────────────
    // Client memanggil: POST /v1beta/models/gemini-2.5-flash:generateContent
    const url = new URL(request.url);
    const geminiPath = url.pathname; // /v1beta/models/...

    if (!geminiPath.includes('/models/')) {
      return new Response('Invalid Path', { status: 400 });
    }

    // ── Forward ke Gemini API (dengan API key dari secret) ──────────────────
    const targetUrl = `${GEMINI_BASE_URL}${geminiPath}?key=${env.GEMINI_API_KEY}`;

    let body: string;
    try {
      body = await request.text();
      if (!body) return new Response('Empty Body', { status: 400 });
    } catch {
      return new Response('Invalid Body', { status: 400 });
    }

    try {
      const geminiResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const responseBody = await geminiResponse.text();

      return new Response(responseBody, {
        status: geminiResponse.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin!),
        },
      });
    } catch (err) {
      console.error('[PSA Gemini Proxy] Upstream error:', err);
      return new Response('Bad Gateway', { status: 502, headers: corsHeaders(origin!) });
    }
  },
};

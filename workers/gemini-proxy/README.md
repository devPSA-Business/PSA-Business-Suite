# PSA Gemini Proxy — Cloudflare Worker

BFF (Backend-for-Frontend) ringan untuk menyembunyikan Gemini API Key dari bundle client.

## Kenapa Cloudflare Workers?

| | Cloud Functions | Cloudflare Workers |
|---|---|---|
| Kartu kredit | **WAJIB** (Blaze Plan) | **TIDAK PERLU** |
| Free tier | 2M req/bulan (tapi butuh Blaze) | **100K req/hari** |
| API Key lokasi | Secret Manager (berbayar) | **Cloudflare Secrets** (gratis) |
| Cold start | ~1-3 detik | **~0ms** (V8 isolate) |
| Setup | Kompleks | **3 perintah** |

## Deploy (3 Perintah)

```bash
# 1. Masuk ke folder worker
cd workers/gemini-proxy

# 2. Install dependencies
npm install

# 3. Login ke Cloudflare (gratis, tidak perlu kartu kredit)
npx wrangler login

# 4. Set API Key Gemini sebagai secret (input interaktif, tidak masuk history)
npx wrangler secret set GEMINI_API_KEY
# → Paste nilai API Key Gemini kamu, tekan Enter

# 5. Deploy
npx wrangler deploy
# → Output: https://psa-gemini-proxy.{your-account}.workers.dev
```

## Setelah Deploy

Copy URL worker, set sebagai GitHub Secret:
- **Name**: `VITE_GEMINI_PROXY_URL`
- **Value**: `https://psa-gemini-proxy.{your-account}.workers.dev`

## Regenerate API Key dengan Aman

```bash
# Update secret tanpa deploy ulang
npx wrangler secret set GEMINI_API_KEY
# Masukkan nilai baru → otomatis berlaku dalam hitungan detik
```

Nilai lama langsung tidak berlaku. Worker tidak perlu di-redeploy.

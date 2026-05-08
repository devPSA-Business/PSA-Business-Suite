# Reference 05 — Gemini AI Integration, NLQ & AI Cache
# @ai_context: Integrasi AI untuk Natural Language Query di PSA
# @business_rule: API Key HANYA di backend; PII wajib di-strip sebelum dikirim ke AI
# @security_tier: HIGH

## 1. Arsitektur AI — Zero-Trust

```
Kasir (UI)
  │ query teks bebas
  ▼
NLQService.ts (client)
  │ strip PII → SafeAggregateData
  │ cek AI Cache (IndexedDB, TTL 1 jam)
  │ cache miss →
  ▼
Cloud Function: queryGemini (BFF)
  │ GEMINI_API_KEY (hanya di Functions env)
  │ rate limit: 60 req/mnt per branchId
  ▼
Gemini 2.1 Flash API
  │
  ▼
Hasil → simpan ke AI Cache → tampil ke Kasir
```

**DILARANG:** Memanggil Gemini API langsung dari frontend.
**WAJIB:** Semua request ke Gemini via Cloud Function `queryGemini`.

## 2. PII Sanitization (Wajib Sebelum Kirim ke AI)

```typescript
// @business_rule: PII wajib dihapus sebelum dikirim ke AI
function sanitizeForAI(data: BusinessData): SafeAggregateData {
  return {
    // ✅ BOLEH: Agregat numerik, produk, stok
    totalRevenue: data.totalRevenue,
    topProducts: data.topProducts.map(p => ({ 
      name: p.name, 
      count: p.count 
    })),
    
    // ❌ DILARANG: Nama pelanggan, telepon, NIK, email
    // Ganti dengan <<PII_REMOVED>>
    customerNotes: '<<PII_REMOVED>>',
  };
}
```

## 3. AI Cache Strategy (IndexedDB, TTL 1 Jam)

```typescript
interface AICacheEntry {
  queryHash: string;    // SHA-256 dari query normalized
  result: string;
  createdAt: number;
  ttlMs: number;        // Default: 3_600_000 (1 jam)
}

// Cache key = hash(query + branchId + date)
// TTL berbeda per query type:
//   - Laporan harian: 1 jam
//   - Analitik mingguan: 6 jam
//   - Insight produk: 12 jam
```

## 4. Rate Limiting & Fallback

```typescript
// Rate limit: 60 req/menit per branchId (Gemini free tier)
// Jika quota tercapai → aktifkan FALLBACK_LOCAL_MODE:
//   1. Tampilkan pesan "AI sedang tidak tersedia"
//   2. Gunakan cached result terakhir jika ada
//   3. Catat ke audit_logs dengan flag 'AI_QUOTA_EXCEEDED'
//   4. Kirim alert Telegram ke owner

const GEMINI_RATE_LIMIT = {
  requestsPerMinute: 60,
  requestsPerDay: 1500,
  modelId: 'gemini-2.1-flash',
};
```

## 5. Prompt Engineering untuk Konteks Toko Perhiasan

```typescript
const SYSTEM_PROMPT = `
Kamu adalah asisten analitik untuk toko perhiasan PSA.
Analisis data agregat berikut dan berikan insight bisnis.

Konteks bisnis:
- Jenis produk: perhiasan emas (24K, 22K, 18K), perak, berlian
- Layanan: jual, buyback, reparasi, sepuh
- Mata uang: Rupiah Indonesia (IDR)
- Satuan berat: gram (untuk emas)

PENTING: Jangan minta atau sebut data pribadi pelanggan.
Fokus pada tren bisnis, stok, dan rekomendasi operasional.
`;
```

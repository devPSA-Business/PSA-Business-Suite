/**
 * TELEMETRY & MONITORING SCRIPT (NLQ SPRINT 7.4)
 * 
 * Berikut adalah skenario ringan yang dapat dijalankan lewat Chrome DevTools (Console)
 * atau diintegrasikan sebagai Worker/Cron job lokal untuk melihat rasio utilitas Gemini API
 * dan memastikan cost tetap efisien.
 */

export async function checkNlqHealth(dbInstance: any) {
  console.log("=== 🛡️ MULAI AUDIT KESEHATAN NLQ ===");
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);

  // 1. Ambil Telemetri Event
  const telemetry = await dbInstance.telemetry_events
    .where('timestamp')
    .between(oneDayAgo, now)
    .toArray();

  const nlqEvents = telemetry.filter((e: any) => e.eventType === 'NLQ_QUERY');
  let cacheHits = 0;
  let cacheMisses = 0;
  let totalLatency = 0;
  let fallbackHits = 0;

  nlqEvents.forEach((t: any) => {
    if (t.metadata?.cache_hit) cacheHits++;
    else cacheMisses++;
    
    if (t.metadata?.is_fallback) fallbackHits++;

    if (t.metadata?.latency_ms) totalLatency += t.metadata.latency_ms;
  });

  const totalCalls = nlqEvents.length;
  const avgLatency = totalCalls > 0 ? (totalLatency / totalCalls) : 0;
  const hitRate = totalCalls > 0 ? (cacheHits / totalCalls) * 100 : 0;

  // 2. Audit Akses Mentah (Security HIGH)
  const auditLogs = await dbInstance.ai_access_logs
    .where('timestamp')
    .between(oneDayAgo, now)
    .toArray();
    
  const rawViews = auditLogs.filter((a: any) => a.action === 'manual-view' && a.resource === 'raw-aggregates');

  console.table({
    "Total Kueri NLQ (24j)": totalCalls,
    "Cache Hits": cacheHits,
    "Gemini API Calls (Cache Miss)": cacheMisses,
    "Fallback Lokal": fallbackHits,
    "Cache Hit Rate (%)": hitRate.toFixed(2) + " %",
    "Average Latency (ms)": avgLatency.toFixed(0) + " ms",
    "Akses Data Mentah (Audit)": rawViews.length
  });

  if (hitRate < 30 && totalCalls > 10) {
    console.warn("⚠️ PERINGATAN: Cache Hit Rate rendah (<30%). Founder mungkin mengajukan pertanyaan yang terlalu bervariasi asimetris.");
  } else if (totalCalls > 0) {
    console.log("✅ STATUS: Sistem berjalan optimal. Cost Protection aktif.");
  }
}

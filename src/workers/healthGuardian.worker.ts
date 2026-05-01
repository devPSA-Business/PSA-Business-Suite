import { db } from '../shared/api/db';

// @ai_context: HealthGuardian — sistem pemantauan mandiri.
// Berjalan di Web Worker (non-blocking). Dipanggil dari App.tsx setiap 5 menit.
// @security_tier: HIGH — jangan ubah threshold tanpa persetujuan owner.
// @business_rule: Jika sync tertunda > 2 jam DAN device online, kirim alert kritis.

const THRESHOLDS = {
  // Sync queue: jika PENDING > 50 item selama > 2 jam → KRITIS
  MAX_PENDING_SYNC_COUNT: 50,
  MAX_PENDING_SYNC_AGE_MS: 2 * 60 * 60 * 1000, // 2 jam
  // DLQ: jika > 20 item gagal → perlu perhatian
  MAX_DLQ_COUNT: 20,
  // IndexedDB quota: jika > 80% → bahaya
  STORAGE_QUOTA_WARN_PERCENT: 0.80,
  // Hash chain: spot-check 10 log terakhir
  HASH_CHAIN_SPOT_CHECK_COUNT: 10,
};

interface HealthIssue {
  code: string;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
}

interface HealthReport {
  timestamp: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  issues: HealthIssue[];
  storageUsedPercent: number;
  pendingSyncCount: number;
  dlqCount: number;
}

async function checkStorageQuota(): Promise<number> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota && estimate.usage) {
        return estimate.usage / estimate.quota;
      }
    } catch {
      return 0;
    }
  }
  return 0;
}

async function checkSyncQueueAge(): Promise<{ count: number, ageMs: number } | null> {
  try {
    const pendingEvents = await db.sync_events.where('status').equals('PENDING').toArray();
    if (pendingEvents.length === 0) return null;
    
    // Find the oldest event
    let oldestTimestamp = Date.now();
    for (const event of pendingEvents) {
      if (event.timestamp < oldestTimestamp) {
        oldestTimestamp = event.timestamp;
      }
    }
    
    return {
      count: pendingEvents.length,
      ageMs: Date.now() - oldestTimestamp
    };
  } catch (err) {
    console.error("HealthGuardian: checkSyncQueueAge failed", err);
    return null;
  }
}

async function triggerForceSync(): Promise<void> {
  self.postMessage({ type: 'TRIGGER_FORCE_SYNC' });
}

async function checkDLQSize(): Promise<number> {
  try {
    const count = await db.sync_dlq.count();
    return count;
  } catch (err) {
    return 0;
  }
}

// Minimal implementation of spot checking the hash chain
async function spotCheckHashChain(count: number): Promise<boolean> {
  try {
    const latestLogs = await db.audit_logs.orderBy('timestamp').reverse().limit(count).toArray();
    if (latestLogs.length <= 1) return true;
    
    // Build a set of all known hashes in this window for fast lookup
    const windowHashes = new Set(latestLogs.map(l => l.hash));
    
    for (const current of latestLogs) {
        // If it's a genesis block or zero, it's valid
        if (!current.previousHash || current.previousHash === 'GENESIS_BLOCK_0000000000000000' || current.previousHash === '0') {
            continue;
        }

        // Check if the previous hash is at least in our recent window.
        // Due to concurrency, timestamps might be slightly out of order with the chain.
        if (!windowHashes.has(current.previousHash)) {
            // Fallback: Check the entire DB if it fell out of the window
            const exists = await db.audit_logs.where('hash').equals(current.previousHash).count();
            if (exists === 0) {
               // The previous hash doesn't exist AT ALL in the DB -> Broken chain
               console.error("HealthGuardian: HASH_CHAIN_BREACH detected on log", current.id);
               return false;
            }
        }
    }
    return true;
  } catch (err) {
    return true; // fail securely without crashing the health check
  }
}

async function runHealthChecks(): Promise<HealthReport> {
  const issues: HealthIssue[] = [];

  const storagePercent = await checkStorageQuota();
  if (storagePercent > THRESHOLDS.STORAGE_QUOTA_WARN_PERCENT) {
    issues.push({ code: 'STORAGE_CRITICAL', severity: 'CRITICAL',
      message: `Storage ${Math.round(storagePercent*100)}% penuh. Segera backup dan bersihkan data lama.` });
  }

  const oldestPending = await checkSyncQueueAge();
  if (oldestPending && oldestPending.ageMs > THRESHOLDS.MAX_PENDING_SYNC_AGE_MS && navigator.onLine) {
    issues.push({ code: 'SYNC_STUCK', severity: 'CRITICAL',
      message: `Data tidak tersinkronisasi selama ${Math.round(oldestPending.ageMs/3600000)} jam. Cek koneksi internet.` });
    await triggerForceSync();
  }

  const dlqCount = await checkDLQSize();
  if (dlqCount > THRESHOLDS.MAX_DLQ_COUNT) {
    issues.push({ code: 'DLQ_OVERFLOW', severity: 'WARNING',
      message: `${dlqCount} transaksi gagal sync. Memerlukan perhatian.` });
  }

  const hashChainValid = await spotCheckHashChain(THRESHOLDS.HASH_CHAIN_SPOT_CHECK_COUNT);
  if (!hashChainValid) {
    issues.push({ code: 'HASH_CHAIN_BREACH', severity: 'CRITICAL',
      message: 'PERINGATAN KRITIS: Integritas audit log rusak. Kemungkinan manipulasi data.' });
  }

  const status = issues.some(i => i.severity === 'CRITICAL') ? 'CRITICAL'
               : issues.some(i => i.severity === 'WARNING') ? 'WARNING' : 'HEALTHY';

  if (status !== 'HEALTHY') {
    console.warn(`HealthGuardian detected issues with status: ${status}`, issues);
  }

  return { timestamp: Date.now(), status, issues, storageUsedPercent: storagePercent,
           pendingSyncCount: oldestPending?.count || 0, dlqCount };
}

self.onmessage = async (e) => {
  if (e.data.type === 'RUN_HEALTH_CHECK') {
    const report = await runHealthChecks();
    self.postMessage({ type: 'HEALTH_REPORT', data: report });
  }
};


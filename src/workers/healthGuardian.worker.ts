import { db } from '../shared/api/db';
import { logger } from '../lib/logger';

// @ai_context: HealthGuardian — sistem pemantauan mandiri.
// Berjalan di Web Worker (non-blocking). Dipanggil dari App.tsx setiap 5 menit.
// @security_tier: HIGH — jangan ubah threshold tanpa persetujuan owner.
// @business_rule: Jika sync tertunda > 2 jam DAN device online, kirim alert kritis.

const THRESHOLDS = {
  MAX_PENDING_SYNC_COUNT: 50,
  MAX_PENDING_SYNC_AGE_MS: 2 * 60 * 60 * 1000, // 2 jam
  MAX_DLQ_COUNT: 20,
  STORAGE_QUOTA_WARN_PERCENT: 0.80,
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

async function spotCheckHashChain(count: number): Promise<boolean> {
  try {
    const latestLogs = await db.audit_logs.orderBy('timestamp').reverse().limit(count).toArray();
    if (latestLogs.length <= 1) return true;
    
    const windowHashes = new Set(latestLogs.map(l => l.hash));
    
    for (const current of latestLogs) {
        if (!current.previousHash || current.previousHash === 'GENESIS_BLOCK_0000000000000000' || current.previousHash === '0') {
            continue;
        }

        if (!windowHashes.has(current.previousHash)) {
            const exists = await db.audit_logs.where('hash').equals(current.previousHash).count();
            if (exists === 0) {
               logger.error("HealthGuardian: HASH_CHAIN_BREACH detected on log", { logId: current.id });
               return false;
            }
        }
    }
    return true;
  } catch (err) {
    return true; 
  }
}

/**
 * G-01 FIX: Kirim alert via postMessage ke main thread.
 * Main thread memanggil AlertService -> Cloud Function -> Telegram.
 * Worker TIDAK pernah menyentuh token apapun.
 * @security_tier: CRITICAL — JANGAN kembalikan logika token ke sini.
 */
function sendAlert(message: string): void {
  // Fallback browser notification jika diizinkan
  if ('Notification' in self && Notification.permission === 'granted') {
    new Notification('PSA Health Guardian', { body: message.substring(0, 200) });
  }
  // Delegasi ke main thread -> AlertService -> Cloud Function proxy
  self.postMessage({ type: 'SEND_ALERT', message });
}

// FUNGSI BARU: Penerjemah Bahasa Manusia untuk Notifikasi Owner
function formatHumanAlert(issueCode: string, rawMessage: string): string {
  let untukApa = rawMessage;
  let positif = "";
  let negatif = "";
  let risikoIya = "";
  let risikoTidak = "";

  switch(issueCode) {
    case 'STORAGE_CRITICAL':
      untukApa = "Memori tablet kasir hampir penuh (>80%). Sistem perlu membersihkan riwayat transaksi lama yang sudah aman di Cloud (Auto-Prune).";
      positif = "Aplikasi kasir akan kembali sangat cepat dan tidak akan hang/lag saat melayani pelanggan.";
      negatif = "Kasir tidak bisa melihat nota transaksi 3 bulan lalu jika internet mati (tapi data tetap aman di Cloud).";
      risikoIya = "Proses pembersihan memakan waktu ~10 detik, kasir mungkin melihat layar loading sebentar.";
      risikoTidak = "Besok atau lusa, aplikasi kasir bisa crash (layar putih) di tengah transaksi karena memori tablet benar-benar habis.";
      break;
    case 'SYNC_STUCK':
      untukApa = "Data penjualan tertahan di tablet selama lebih dari 2 jam dan belum masuk ke server pusat, padahal internet menyala.";
      positif = "Laporan keuangan di pusat akan kembali akurat dan up-to-date.";
      negatif = "Sistem akan memaksa pengiriman data secara agresif di latar belakang.";
      risikoIya = "Koneksi internet tablet akan sedikit melambat selama 1-2 menit saat pengiriman paksa.";
      risikoTidak = "Data penjualan hari ini tidak akan masuk ke laporan pusat, berisiko selisih kas saat tutup buku.";
      break;
    case 'HASH_CHAIN_BREACH':
      untukApa = "Sistem mendeteksi adanya kerusakan atau potensi manipulasi pada catatan log keamanan (Audit Log) di tablet ini.";
      positif = "Mencegah kecurangan atau kebocoran data lebih lanjut.";
      negatif = "Membutuhkan intervensi Owner untuk mereset atau memverifikasi data.";
      risikoIya = "Operasional kasir mungkin harus dijeda sementara untuk investigasi.";
      risikoTidak = "Celah keamanan tetap terbuka dan data toko tidak bisa dipercaya keakuratannya.";
      break;
    default:
      untukApa = rawMessage;
      positif = "Sistem kembali berjalan normal.";
      negatif = "Tidak ada.";
      risikoIya = "Sistem melakukan perbaikan otomatis di latar belakang.";
      risikoTidak = "Aplikasi mungkin mengalami kendala minor.";
  }

  return `🤖 **PERMINTAAN OTORISASI SISTEM (DARI AI IT TEAM)**\n\n` +
         `📌 **Untuk Apa Ini?**\n${untukApa}\n\n` +
         `🟢 **Dampak Positif:**\n${positif}\n\n` +
         `🔴 **Dampak Negatif:**\n${negatif}\n\n` +
         `⚠️ **Risiko Jika "IYA" (Eksekusi):**\n${risikoIya}\n\n` +
         `🚨 **Risiko Jika "TIDAK" (Abaikan):**\n${risikoTidak}\n\n` +
         `**Tindakan Anda:** Buka menu Pengaturan Sistem di aplikasi untuk mengeksekusi perbaikan.`;
}

async function runHealthChecks(): Promise<HealthReport> {
  const issues: HealthIssue[] =[];

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
    logger.warn(`HealthGuardian detected issues with status: ${status}`, { issues });
    if (status === 'CRITICAL') {
      // Mengirimkan notifikasi menggunakan format Bahasa Manusia
      for (const issue of issues.filter(i => i.severity === 'CRITICAL')) {
        const humanMessage = formatHumanAlert(issue.code, issue.message);
        sendAlert(humanMessage);
      }
    }
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

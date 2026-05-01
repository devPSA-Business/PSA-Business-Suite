import { db } from '../shared/api/db';
import { MathUtils } from '../shared/utils/decimalUtils';

/**
 * @ai_context Web Worker untuk kalkulasi aggregasi data Analytics.
 * Memisahkan komputasi berat dari Main Thread agar UI (Recharts) tidak lag.
 */

self.onmessage = async (e: MessageEvent) => {
  const { type, startDateMs, endDateMs, id } = e.data;

  try {
    if (type === 'CALCULATE_DAILY_METRICS') {
      const result = await calculateDailyMetrics(startDateMs, endDateMs);
      self.postMessage({ id, status: 'SUCCESS', data: result });
    } else if (type === 'CALCULATE_PRODUCT_METRICS') {
      const result = await calculateProductMetrics(startDateMs, endDateMs);
      self.postMessage({ id, status: 'SUCCESS', data: result });
    } else if (type === 'SCAN_MISSING_COST') {
      const result = await scanMissingCost(startDateMs, endDateMs);
      self.postMessage({ id, status: 'SUCCESS', data: result });
    } else if (type === 'CALCULATE_PRODUCT_RANKING') {
      const result = await calculateProductRanking(startDateMs, endDateMs);
      self.postMessage({ id, status: 'SUCCESS', data: result });
    } else if (type === 'SCAN_FRAUD_ANOMALIES') {
      const newFlagsCount = await runFraudWatchdogScanner(startDateMs, endDateMs);
      self.postMessage({ id, status: 'SUCCESS', data: newFlagsCount });
    } else if (type === 'BUILD_NLQ_CONTEXT') {
      const result = await buildNlqContext(startDateMs, endDateMs);
      self.postMessage({ id, status: 'SUCCESS', data: result });
    } else {
      self.postMessage({ id, status: 'ERROR', error: 'Unknown message type' });
    }
  } catch (err) {
    self.postMessage({ id, status: 'ERROR', error: (err instanceof Error ? err.message : String(err)) });
  }
};

// SPRINT 7.3: Fraud Watchdog Engine
async function runFraudWatchdogScanner(startDateMs: number, endDateMs: number) {
   const transactions = await db.transactions
      .where('date')
      .between(startDateMs, endDateMs)
      .toArray();

   // Sort array chronological to build sliding windows naturally.
   transactions.sort((a,b) => a.date - b.date);

   let newAnomaliesCount = 0;

   // Gunakan bulk read/write u meminimalkan trip I/O
   const existingAnomalies = await db.fraud_anomalies.toArray();
   const existingTxIds = new Set(existingAnomalies.map(a => a.txId));

   const newAnomaliesToInsert = [];

   // --- Setup Sliding Window for Sequence Detection in this batch ---
   const sequenceWindowSize = 10;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const cashierSequences = new Map<string, any[]>();

   for (const tx of transactions) {
      // Manage Sliding Window
      const userSeq = cashierSequences.get(tx.user) || [];
      userSeq.push(tx);
      if (userSeq.length > sequenceWindowSize) {
         userSeq.shift(); // Remove oldest
      }
      cashierSequences.set(tx.user, userSeq);

      if (existingTxIds.has(tx.id)) continue; // Sudah pernah diproses

      let score = 0;
      const rulesTriggered: string[] = [];

      // Aturan 1: Total 0 secara tidak wajar (Bukan Trade In Biasa)
      if (tx.total === 0 && Array.isArray(tx.items) && tx.items.length > 0) {
         score += 80;
         rulesTriggered.push("TOTAL_IS_ZERO_POTENTIAL_THEFT");
      }

      // Aturan 2: Nota VOID atau REFUNDED
      if (tx.status === 'VOIDED' || tx.isVoided) {
         score += 70;
         rulesTriggered.push("NOTE_VOIDED");
      }

      // Aturan 3: Diskon Manual yang sangat besar (> 15% dari total)
      if (tx.manualDiscountAmount && tx.total > 0) {
          const discountRatio = tx.manualDiscountAmount / (tx.total + tx.manualDiscountAmount);
          if (discountRatio > 0.15) {
             score += 40;
             rulesTriggered.push("HIGH_MANUAL_DISCOUNT");
          }
      }

      // Aturan 4: Price Override ekstrem (Jual Emas di bawah HPP)
      let isUnderCost = false;
      if (Array.isArray(tx.items)) {
          tx.items.forEach(item => {
             if (item.unitCost && item.price < item.unitCost && item.price > 0) {
                isUnderCost = true;
             }
          });
      }
      if (isUnderCost) {
         score += 90;
         rulesTriggered.push("PRICE_BELOW_COST_ANOMALY");
      }

      // Aturan 5: Time of Day Anomalies (Misal transaksi di luar jam operasional 08:00 - 22:00)
      const txHour = new Date(tx.date).getHours();
      if (txHour < 8 || txHour > 22) {
         score += 30;
         rulesTriggered.push("TIME_OF_DAY_ANOMALY");
      }

      // Aturan 6: Sequence Detection (Repeated Voids in short window)
      const recentVoids = userSeq.filter(t => t.status === 'VOIDED' || t.isVoided).length;
      if (recentVoids >= 3) {
         score += 60;
         rulesTriggered.push("MULTIPLE_VOIDS_IN_SEQUENCE");
      }

      if (score > 0) {
          // Dual-Path Alerting: >=70 HIGH (Audit), <70 MEDIUM (Operational Anomaly)
          let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
          if (score >= 70) severity = 'HIGH';

          newAnomaliesToInsert.push({
             id: crypto.randomUUID(),
             txId: tx.id,
             cashierId: tx.user,
             score: Math.min(100, score),
             severity,
             rulesTriggered,
             status: 'OPEN',
             timestamp: tx.date
          });
          newAnomaliesCount++;
      }
   }

   if (newAnomaliesToInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.fraud_anomalies.bulkAdd(newAnomaliesToInsert as any[]);
   }

   return newAnomaliesCount;
}

async function calculateDailyMetrics(startDateMs: number, endDateMs: number) {
  const transactions = await db.transactions
    .where('date')
    .between(startDateMs, endDateMs)
    .toArray();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metricsMap = new Map<string, any>();

  transactions.forEach((tx) => {
    if (tx.status !== 'SUCCESS') return;

    const dateStr = new Date(tx.date).toISOString().split('T')[0];
    
    if (!metricsMap.has(dateStr)) {
      metricsMap.set(dateStr, {
        date: dateStr,
        omzetTotal: 0,
        grossProfitTotal: 0,
        netProfitTotal: 0,
        txCount: 0
      });
    }
    
    const metric = metricsMap.get(dateStr)!;
    metric.txCount += 1;
    metric.omzetTotal += tx.total;

    let txTotalCost = 0;
    if (Array.isArray(tx.items)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tx.items.forEach((item: any) => {
            const cost = item.unitCost || 0;
            txTotalCost += cost * item.quantity;
        });
    }

    const grossProfit = MathUtils.sub(tx.total, txTotalCost);
    metric.grossProfitTotal += grossProfit;
    metric.netProfitTotal += grossProfit;
  });

  return Array.from(metricsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function calculateProductMetrics(startDateMs: number, endDateMs: number) {
  const transactions = await db.transactions
    .where('date')
    .between(startDateMs, endDateMs)
    .toArray();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productMap = new Map<string, any>();
  const uniqueStockIds = new Set<string>();

  transactions.forEach((tx) => {
    if (tx.status !== 'SUCCESS' || !Array.isArray(tx.items)) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx.items.forEach((item: any) => {
        uniqueStockIds.add(item.stockId);
        
        if (!productMap.has(item.stockId)) {
            productMap.set(item.stockId, {
                productId: item.stockId,
                productName: item.name || 'Unknown',
                qtySold: 0,
                revenue: 0,
                costTotal: 0,
                marginPct: 0,
                stockCategory: 'ACCESSORIES', // default
                baselineMargin: 40, // default
            });
        }
        
        const p = productMap.get(item.stockId)!;
        const cost = item.unitCost || 0;
        const itemRevenue = item.price * item.quantity;
        const itemTotalCost = cost * item.quantity;

        p.qtySold += item.quantity;
        p.revenue += itemRevenue;
        p.costTotal += itemTotalCost;
    });
  });

  // Batch query to find stock categories
  const stockItems = await db.stock.where('id').anyOf(Array.from(uniqueStockIds)).toArray();
  stockItems.forEach(stock => {
      const p = productMap.get(stock.id);
      if (p) {
          p.stockCategory = stock.category || 'ACCESSORIES';
          p.currentStock = stock.quantity || 1; // used for turnover
          
          // Determine baseline
          if (p.stockCategory === 'GOLD_BAR') {
              p.baselineMargin = 3;
          } else if (p.stockCategory === 'GOLD_JEWELLERY') {
              p.baselineMargin = 20;
          } else if (p.stockCategory === 'IMITATION' || p.stockCategory === 'ACCESSORIES') {
              p.baselineMargin = 40;
          } else {
              p.baselineMargin = 50; // JASA or other
          }
      }
  });

  const result = Array.from(productMap.values()).map(p => {
    const profit = p.revenue - p.costTotal;
    p.marginPct = p.revenue > 0 ? parseFloat(((profit / p.revenue) * 100).toFixed(2)) : 0;
    
    // Normalize Margin
    p.normalizedMarginPct = parseFloat((p.marginPct / (p.baselineMargin || 50)).toFixed(2));
    
    // Turnover Approximation: qtySold / (currentStock + qtySold * 0.5) to avoid Infinity
    const avgStockProx = (p.currentStock || 1) + (p.qtySold * 0.5);
    p.turnover = parseFloat((p.qtySold / avgStockProx).toFixed(2));
    
    return p;
  });

  return result.sort((a, b) => b.qtySold - a.qtySold);
}

// SPRINT 7.2: Scan transaksi yang HPP-nya kosong/0
async function scanMissingCost(startDateMs: number, endDateMs: number) {
  const transactions = await db.transactions
    .where('date')
    .between(startDateMs, endDateMs)
    .toArray();

  const flaggedTxs = [];
  
  // Chunking to prevent event loop block if txs > 5000
  for (const tx of transactions) {
    if (tx.status !== 'SUCCESS') continue;
    
    let hasMissing = false;
    const itemsWithSuggestion = [];

    for (const item of tx.items) {
      if (!item.unitCost || item.unitCost === 0) {
        hasMissing = true;
        // Fetch dari current stock cost (Sebagai suggestion, bisa jadi kurang akurat u/ emas)
        const stockItem = await db.stock.get(item.stockId);
        itemsWithSuggestion.push({
          ...item,
          suggestedCost: stockItem ? stockItem.cost : 0
        });
      } else {
        itemsWithSuggestion.push(item);
      }
    }

    if (hasMissing) {
      flaggedTxs.push({
        ...tx,
        items: itemsWithSuggestion
      });
    }
  }

  // Sort dari terbaru
  return flaggedTxs.sort((a, b) => b.date - a.date);
}

// SPRINT 7.2: Intelligence Item Categorization
async function calculateProductRanking(startDateMs: number, endDateMs: number) {
  const metrics = await calculateProductMetrics(startDateMs, endDateMs);
  
  // Agregat average untuk menentukan Fast Mover
  // Kami hitung average per kategori (misal emas batangan mutasinya lebih tinggi dari cincin berlian)
  const categoryQtyMap = new Map<string, { totalQty: number, count: number }>();
  metrics.forEach(m => {
      const cat = m.stockCategory || 'ACCESSORIES';
      if (!categoryQtyMap.has(cat)) categoryQtyMap.set(cat, { totalQty: 0, count: 0 });
      const entry = categoryQtyMap.get(cat)!;
      entry.totalQty += m.qtySold;
      entry.count += 1;
  });

  const categorized = metrics.map(p => {
    let category = "STANDARD";
    
    const catTotal = categoryQtyMap.get(p.stockCategory || 'ACCESSORIES');
    const averageSoldInCategory = catTotal && catTotal.count > 0 ? (catTotal.totalQty / catTotal.count) : 0;

    // Gunakan Normalized Margin. >= 1 berarti mencapai baseline harapan. > 1.2 berarti tinggi.
    const isHighMargin = (p.normalizedMarginPct || 0) >= 1.0;
    const isLowMargin = (p.normalizedMarginPct || 0) <= 0.6; // Di bawah 60% baseline = low
    const isFastMover = p.qtySold >= averageSoldInCategory;

    if (isFastMover && isHighMargin) category = "STAR (Fast Mover - Margin Optimal)";
    else if (isFastMover && !isHighMargin) category = "TRAFFIC-BUILDER (Fast Mover - Margin Tipis)";
    else if (!isFastMover && isHighMargin) category = "SLEEPING-GIANT (Slow Mover - Margin Lebar)";
    else category = "DEAD-STOCK (Slow Mover - Margin Minus/Kecil)";

    return { ...p, category };
  });

  return categorized;
}

// SPRINT 7.4: NLQ Context Builder
async function buildNlqContext(startDateMs: number, endDateMs: number) {
  // 1. Get raw metrics
  const dailyMetrics = await calculateDailyMetrics(startDateMs, endDateMs);
  let totalOmzet = 0;
  let totalProfit = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dailyMetrics.forEach((d: any) => {
    totalOmzet += d.totalOmzet;
    totalProfit += d.totalGrossProfit;
  });

  // 2. Get top product metrics
  const productRanking = await calculateProductRanking(startDateMs, endDateMs);
  
  // 3. Select top N (default 10)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topProducts = productRanking.slice(0, 10).map((p: any) => ({
    name: p.name,
    qtySold: p.qtySold,
    category: p.category,
    normalizedMargin: (p.normalizedMarginPct && !isNaN(p.normalizedMarginPct)) ? p.normalizedMarginPct.toFixed(2) : '-1'
  }));

  // Strip anything that looks like Cost or PII
  return {
    totalOmzet,
    totalProfit,
    topProducts,
    period: { start: new Date(startDateMs).toISOString(), end: new Date(endDateMs).toISOString() }
  };
}

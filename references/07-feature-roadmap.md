# Reference 07 — Feature Roadmap & Backlog Pending
# @ai_context: Status fitur dan prioritas pengembangan PSA Business Suite
# @business_rule: Prioritas berdasarkan ROI bisnis dan risiko operasional
# @security_tier: LOW

## Status Produksi Saat Ini (Mei 2026)

| Modul | Status | Catatan |
|---|---|---|
| POS Ritel | ✅ Production Ready | CheckoutUseCase, VoidTransaction |
| Manajemen Shift | ✅ Production Ready | OpenShift, CloseShift, auto-backup |
| Inventaris + Barcode | ✅ Production Ready | BulkReceive, ReceiveStock |
| Audit Trail | ✅ Production Ready | Immutable log, AES-GCM |
| Laporan Keuangan | ✅ Production Ready | FinanceReport, DashboardPage |
| Reparasi/Sepuh | ✅ Production Ready | CreateRepair, UpdateRepairStatus |
| CI/CD Auto-Deploy | ✅ Aktif | ci.yml, deploy.yml |
| Smart Auto-Heal | ✅ Baru Aktif | smart-auto-heal.yml |
| Error Uploader | ✅ Baru Aktif | psa-error-uploader.yml |
| Resource Optimizer | ✅ Baru Aktif | psa-resource-optimizer.yml |

---

## P1 — Gold Treasury (BELUM ADA — PRIORITAS TERTINGGI)

### Business Case
Toko perhiasan tanpa modul buyback = kehilangan segmen bisnis utama (estimasi 30-40% revenue dari buyback emas).

### Fitur yang Dibutuhkan
1. **Buyback Emas** — kasir beli emas dari pelanggan
   - Input: karatase (24K/22K/18K), berat (gram), kondisi
   - Kalkulasi: harga pasar × faktor karatase × kondisi
   - HPP Emas: Specific Identification (setiap lot berbeda)
   
2. **Jual Emas ke Pengepul** — likuidasi gold treasury ke pengepul (BUKAN ke konsumen)
   - Emas hasil buyback dari pelanggan dikumpulkan → dijual ke pengepul dalam jumlah tertentu
   - Tracking: lot number, HPP beli dari pelanggan, harga jual ke pengepul, margin per lot
   
3. **Gold Treasury Dashboard** — stok emas real-time
   - Total berat per karatase
   - Nilai buku vs nilai pasar
   - P&L per lot

4. **Integrasi Harga Emas** — API harga emas real-time
   - Sumber: logam-mulia.com atau goldprice.org API
   - Cache: 1 jam di IndexedDB (kurangi API calls)
   - Fallback: input manual jika API down

### Lokasi Kode Target
```
src/features/gold_treasury/
├── ui/
│   ├── BuybackForm.tsx
│   ├── GoldDashboard.tsx
│   └── GoldLotList.tsx
├── store/
│   └── goldTreasuryStore.ts
└── usecases/
    ├── BuybackUseCase.ts       ← SUDAH ADA (perlu UI)
    ├── GoldLiquidationUseCase.ts ← SUDAH ADA (perlu UI)
    └── GetGoldPriceUseCase.ts  ← BELUM ADA
```

**Catatan:** Folder di repo saat ini bernama `gold/` — perlu rename ke `gold_treasury/` sesuai canonical FSD.

---

## P2 — Workspace Redesign (Petty Cash, Pengeluaran)

### Business Case
Owner butuh kontrol pengeluaran harian (petty cash, operasional) tanpa harus masuk ke laporan keuangan yang kompleks.

### Fitur yang Dibutuhkan
1. Petty Cash tracking
2. Kategori pengeluaran (listrik, sewa, gaji, dll)
3. Summary harian untuk owner

**Proposal ada di:** `docs/WORKSPACE_PROPOSAL.md`

---

## P2 — NLQ AI (Natural Language Query) — UI Belum Ada

### Status
- `NLQService.ts` ✅ Ada
- AI Cache via IndexedDB ✅ Ada
- UI untuk kasir query ❌ Belum ada

### Target UI
```
src/features/reports/ui/NLQQueryBox.tsx
```

---

## P3 — Thermal Printer Integration

### Status
- `PrintServiceImpl.ts` ✅ Ada
- `PrintButton.tsx` ✅ Ada
- Koneksi ke printer fisik ❌ Belum ditest end-to-end

### Target
- Test dengan Epson TM-T82 (paling umum di toko perhiasan Indonesia)
- Format struk: transaksi, shift closure, gold certificate

---

## Backlog Teknis (Non-Fitur)

| Item | Prioritas | Estimasi |
|---|---|---|
| Rename `features/gold/` → `features/gold_treasury/` | Tinggi | 30 menit |
| NLQ UI component | Menengah | 2-3 jam |
| E2E test untuk buyback flow | Menengah | 4 jam |
| Thermal printer E2E test | Rendah | 2 jam |

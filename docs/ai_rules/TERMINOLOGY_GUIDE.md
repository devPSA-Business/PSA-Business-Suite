# PANDUAN TERMINOLOGI & RISIKO AMBIGUITAS — PSA BUSINESS SUITE
## AI & Developer Reference · Versi 1.0

> **Tanggal:** 9 Mei 2026
> **Audiens:** Developer, AI Agent, Code Reviewer
> **Sumber Utama:** `docs/BUSINESS_CONTEXT.md` v3.1
> **Status:** Dokumen Normatif — wajib dibaca sebelum mengerjakan fitur `service_order`, `buyback_order`, atau `gold_treasury`

---

## 1. Tujuan Dokumen

Dokumen ini menjawab satu pertanyaan spesifik yang sering menjadi sumber bug arsitektur:

> **"Apa bedanya item titipan, produk, dan stok — dan bagaimana sistem harus memperlakukan ketiganya secara berbeda?"**

Ambiguitas istilah, terutama kata **"titipan"**, telah terbukti menyebabkan tiga kelas bug berulang di PSA Business Suite:
- Stok produk berkurang akibat service order yang salah dihubungkan ke `stock_ledger`
- Label UI yang tidak jelas membuat staf menyamakan "barang titipan untuk jasa" dengan "barang titipan untuk dijual"
- Laporan keuangan tercampur antara pendapatan jasa dan penjualan produk

---

## 2. Peta Terminologi Lengkap

### 2.1 Tiga Entitas yang TIDAK Boleh Dikacaukan

| Entitas | Kode DB | Arti Bisnis | Memengaruhi Stok? | Memengaruhi Kas? |
|---|---|---|---|---|
| Produk Toko | `product` | Item perhiasan imitasi milik PSA, dijual kepada konsumen | ✅ Ya — berkurang saat terjual | ✅ Ya — kas masuk |
| Item Titipan Pelanggan | `service_item` | Item milik pelanggan, dititipkan untuk dirawat/diperbaiki | ❌ **Tidak pernah** | ✅ Ya — kas masuk setelah selesai |
| Aset Emas Buyback | `gold_treasury entry` | Emas milik PSA hasil beli dari konsumen | ❌ Tidak (bukan produk) | ❌ Kas sudah keluar saat beli |

### 2.2 Tiga Jenis Transaksi yang TIDAK Boleh Digabungkan

| Transaksi | Entitas DB | Sumber Kas | Arah Kas |
|---|---|---|---|
| Penjualan Produk | `transaction` | `cash_ledger` | Masuk |
| Pembayaran Jasa | `service_order` | `cash_ledger` | Masuk (saat diambil) |
| Pembelian Emas (Buyback) | `buyback_order` | `cash_ledger` atau `gold_treasury` | **Keluar** |

---

## 3. Aturan Kode — `service_item.affects_stock`

```typescript
// @business_rule: service_item TIDAK PERNAH mengurangi stok
// @security_tier: HIGH — validasi di domain layer dan Firestore rules

interface ServiceItem {
  id: string;
  service_order_id: string;
  desc: string;                   // Deskripsi bebas dari staf — BUKAN nama produk dari katalog
  affects_stock: false;           // Literal false — bukan boolean
  customer_item: true;            // Flag eksplisit: ini milik pelanggan
}

// UseCase validation — wajib ada assertion ini:
function validateServiceItem(item: Partial<ServiceItem>): void {
  if (item.affects_stock !== false) {
    throw new DomainError(
      'SERVICE_ITEM_STOCK_VIOLATION',
      'Item titipan pelanggan tidak boleh memengaruhi stok toko. ' +
      'Pastikan affects_stock = false pada semua service_item.'
    );
  }
}
```

---

## 4. Standar Label UI — Quick Reference

Gunakan tabel ini saat membuat atau me-review komponen React untuk fitur jasa.

| Elemen UI | Label yang WAJIB | Yang DILARANG |
|---|---|---|
| Header layar terima jasa | `Jasa Perawatan — Item Titipan Pelanggan` | "Terima Produk", "Input Stok", "Barang Masuk" |
| Checkbox konfirmasi | `✓ Item Titipan — Tidak Mengurangi Stok Produk` | Tidak ada checkbox / checkbox opsional |
| Tooltip checkbox | `"Item ini milik pelanggan dan akan dikembalikan setelah pengerjaan."` | Tooltip kosong atau generik |
| Field input item | Placeholder: `"Contoh: Cincin emas putih, kondisi memudar"` | Placeholder: "Nama Produk" atau "SKU" |
| Badge status | `TITIPAN` + sublabel status | "STOK", "PRODUK", "BARANG" |
| Kolom laporan | `Item Titipan` | "Produk", "SKU", "Nama Barang" |

---

## 5. Standar Label UI — Buyback Quick Reference

| Elemen UI | Label yang WAJIB | Yang DILARANG |
|---|---|---|
| Header layar buyback | `BUYBACK — Pembelian Emas dari Konsumen (Bukan Stok)` | "Terima Emas", "Stok Emas Masuk" |
| Badge warna header | `#E74C3C` (merah) | Warna hijau (kesan penjualan) |
| Field total bayar | Label: `PSA membayar ke konsumen:` (warna merah) | "Total Penjualan", "Pendapatan" |
| Dropdown sumber dana | `Kas Laci (Operasional)` / `Gold Treasury (Aset Emas)` | "Rekening", "Dana Toko" tanpa klarifikasi |

---

## 6. Regression Test Wajib — Terminologi & Stok

```typescript
// @ai_context: Test ini memvalidasi bahwa ambiguitas terminologi tidak menyebabkan bug stok
// @security_tier: HIGH

describe('ServiceOrder — tidak memengaruhi stok', () => {
  it('menolak service_item dengan affects_stock = true', () => {
    expect(() => validateServiceItem({ affects_stock: true as any }))
      .toThrow('SERVICE_ITEM_STOCK_VIOLATION');
  });

  it('tidak membuat entri StockLedger saat service_order dibuat', async () => {
    const stockBefore = await stockLedger.count();
    await createServiceOrder({ /* ... valid service order */ });
    const stockAfter = await stockLedger.count();
    expect(stockAfter).toBe(stockBefore); // Tidak ada perubahan
  });

  it('label header UI mengandung kata "Item Titipan Pelanggan"', () => {
    render(<ServiceOrderForm />);
    expect(screen.getByRole('heading')).toHaveTextContent('Item Titipan Pelanggan');
  });
});
```

---

## 7. Checklist Code Review — Fitur Jasa & Buyback

Gunakan checklist ini setiap kali me-review PR yang menyentuh `service_order`, `service_item`, `buyback_order`, atau `gold_treasury`.

**Service Order:**
- [ ] `service_item.affects_stock` selalu `false` — ada assertion di domain layer
- [ ] Tidak ada foreign key dari `service_item` ke tabel `product` atau `stock_ledger`
- [ ] Label header UI mengandung `"Item Titipan Pelanggan"` — bukan hanya "Titipan"
- [ ] Checkbox konfirmasi ada dan tidak bisa dinonaktifkan kasir
- [ ] Ada tooltip pada setiap kemunculan kata "titipan" di UI

**Buyback Order:**
- [ ] `total_paid` adalah computed field — tidak ada input manual
- [ ] Dropdown sumber dana menampilkan dua opsi dengan label lengkap
- [ ] Layar konfirmasi wajib tampil sebelum `submit`
- [ ] Header menggunakan badge merah `#E74C3C`
- [ ] Data buyback tidak masuk ke laporan penjualan atau laporan jasa

**Gold Treasury:**
- [ ] Tidak ada JOIN atau agregasi lintas `gold_treasury` dan `cash_ledger`
- [ ] Laporan Gold Treasury hanya mengambil data dari `gold_treasury` + `buyback_order`

---

## 8. Glosarium Ringkas untuk Briefing Staf Non-Teknis

Gunakan teks ini sebagai bahan briefing staf baru (10–15 menit):

**Tiga jenis pekerjaan di kasir PSA:**

**1. Jual Produk** — produk milik toko dijual ke pelanggan. Stok berkurang. Kas bertambah. Contoh: pelanggan beli cincin `CIN-GOLD-SOL-UK17-0001`.

**2. Jasa Perawatan** — pelanggan menitipkan perhiasan miliknya untuk disepuh, dipatri, atau direparasi. Barang ini bukan produk toko. Stok toko tidak berubah. Kasir mencatat di layar **"Jasa Perawatan — Item Titipan Pelanggan"**. Kas bertambah saat pelanggan ambil barang dan bayar.

**3. Buyback Emas** — owner membeli emas dari pengunjung. Ini bukan penjualan — PSA yang membayar. Emas tidak masuk etalase. Dicatat di layar **"BUYBACK — Pembelian Emas"** (badge merah).

**Aturan yang paling penting untuk staf:** jika barang milik pelanggan → gunakan layar Jasa, jangan gunakan layar Penjualan Produk.

---

*Panduan ini adalah bagian dari `docs/BUSINESS_CONTEXT.md` v3.1. Perubahan di sini wajib sinkron dengan dokumen induk.*

# DOKUMENTASI KONTEKS BISNIS RESMI — PSA JEWELLERY
## Ground Truth Document · Versi 3.1

> **Tanggal Efektif:** 9 Mei 2026
> **Lokasi Operasional:** Sampit, Kalimantan Tengah
> **Disusun oleh:** Manajemen PSA Jewellery
> **Status:** Dokumen Referensi Wajib — semua kontributor proyek (developer, AI agent, konsultan) wajib membaca dan memahami dokumen ini sebelum menyentuh kode atau desain sistem apapun.

---

## ⚠️ PERINGATAN UNTUK DEVELOPER & AI AGENT

Dokumen ini adalah **sumber kebenaran tunggal (single source of truth)** tentang bisnis PSA Jewellery. Kesalahan memahami konteks bisnis di bawah ini akan berdampak langsung pada logika kode, laporan keuangan, dan keamanan data toko.

| Asumsi Salah | Kebenaran |
|---|---|
| PSA menjual emas | ❌ PSA **tidak** menjual emas kepada pelanggan dalam bentuk apapun |
| Buyback emas = stok toko | ❌ Emas yang dibeli **tidak** masuk display atau etalase |
| Produk = perhiasan asli | ❌ Semua produk adalah **perhiasan imitasi** (fashion jewelry) |
| Buyback = penjualan | ❌ Buyback adalah **pembelian dari konsumen** — PSA yang membayar |
| Satu laporan keuangan cukup | ❌ Gold Treasury **dikelola dan dilaporkan terpisah** dari kas toko utama |
| "Titipan" = barang untuk dijual | ❌ "Titipan" dalam konteks PSA = **item milik pelanggan untuk dirawat/diperbaiki** |

---

## 1. Ringkasan Eksekutif

PSA Jewellery adalah usaha mikro kecil menengah (UMKM) yang bergerak di dua bidang utama: **ritel perhiasan imitasi** (fashion jewelry berlapis/alloy) dan **jasa perawatan perhiasan**. Sebagai layanan tambahan yang tumbuh dari kebutuhan lapangan, PSA juga menjalankan **buyback emas** — yaitu pembelian emas milik konsumen atau pengunjung yang datang langsung ke toko.

Usaha beroperasi di **satu lokasi** di lingkungan pasar tradisional semi-modern Sampit, dikelola oleh **dua owner non-programmer** yang bekerja dari **perangkat mobile (ponsel/tablet)** tanpa akses kartu kredit atau debit untuk layanan berlangganan. Seluruh sistem wajib berjalan **offline-first** dengan biaya operasional mendekati nol.

### Ruang Lingkup Bisnis

Bisnis PSA Jewellery mencakup tiga domain yang sepenuhnya terpisah secara pengelolaan dan pelaporan. Ketiga domain ini **tidak boleh digabungkan** dalam laporan maupun logika kode.

| Domain | Jenis Aktivitas | Arah Kas |
|---|---|---|
| Ritel Perhiasan Imitasi | Penjualan produk stok kepada konsumen | Kas masuk |
| Jasa Perawatan | Pengerjaan item titipan pelanggan | Kas masuk (setelah selesai) |
| Buyback Emas | Pembelian emas dari konsumen/pengunjung | Kas keluar |

---

## 2. Glosarium Bisnis ↔ Teknis

Tabel ini memetakan istilah yang dipakai owner dan staf ke istilah teknis yang dipakai developer. Seluruh kontributor wajib mengacu pada tabel ini untuk mencegah ambiguitas istilah di seluruh lapisan sistem.

> **Catatan khusus untuk developer:** Kolom "Istilah Bisnis (UI / Owner)" adalah label yang **wajib muncul di UI** persis seperti tertulis atau sesuai panduan di Seksi 12. Kolom "Istilah Teknis (DB / Kode)" adalah nama entitas di lapisan data dan logika.

| Istilah Bisnis (UI / Owner) | Istilah Teknis (DB / Kode) | Penjelasan Singkat |
|---|---|---|
| Pembelian Emas / Buyback | `buyback_order` | PSA membeli emas dari konsumen; ini pengeluaran kas, bukan penjualan |
| Rekening Emas / Gold Treasury | `gold_treasury` | Modul aset emas terpisah; bukan kas operasional toko |
| Kas Laci / Kas Toko | `cash_ledger` | Kas operasional toko (tunai harian) |
| **Jasa Perawatan — Item Titipan Pelanggan** | `service_order` | Job-based; item titipan milik pelanggan; tidak mengurangi stok toko apapun |
| Produk / SKU | `product` | Item perhiasan imitasi yang dijual; memiliki stok tercatat |
| Transaksi Penjualan | `transaction` | Penjualan retail yang mengurangi stok produk |
| Sesi Kasir | `shift_session` | Sesi buka dan tutup kasir harian |
| Log Audit | `audit_log` | Jejak aktivitas kritis dengan SHA-256 hash chain |
| Pergerakan Stok | `stock_ledger` | Catatan masuk/keluar/koreksi stok produk |
| **Item Titipan Pelanggan** | `service_item` | Detail item **milik pelanggan** dalam satu service order; bukan produk toko; `affects_stock` selalu `false` |

### 2.1 Risiko Ambiguitas Terminologi "Titipan"

Kata **"titipan"** digunakan di kalangan staf toko dan terasa familier, namun memiliki potensi misunderstanding tinggi jika muncul di UI tanpa konteks.

| Tafsiran yang Mungkin | Benar/Salah | Klarifikasi |
|---|---|---|
| Barang titipan untuk dijual (konsinyasi) | ❌ Salah | PSA tidak menerima barang konsinyasi untuk dijual |
| Barang titipan untuk jasa/perawatan milik pelanggan | ✅ Benar | Ini makna yang dimaksud dalam sistem PSA |
| Barang titipan dari pihak ketiga / vendor | ❌ Salah | Tidak ada skema titipan dari vendor di PSA |

**Solusi terminologi** yang wajib diterapkan di UI dan semua komunikasi:

| Konteks Pemakaian | Label yang WAJIB Digunakan |
|---|---|
| Header layar penerimaan jasa | `Jasa Perawatan — Item Titipan Pelanggan` |
| Checkbox konfirmasi saat terima barang | `✓ Item Titipan — Tidak Mengurangi Stok Produk` |
| Badge status di daftar service order | `TITIPAN` + sublabel: `Diterima / Dikerjakan / Selesai / Diambil` |
| Tooltip penjelasan (satu kalimat) | _"Item ini milik pelanggan dan akan dikembalikan setelah pengerjaan. Tidak memengaruhi stok toko."_ |
| Pesan konfirmasi sebelum simpan | _"Konfirmasi: Anda menerima item milik pelanggan. Sistem mencatat ini sebagai Item Titipan dan tidak akan mengurangi stok produk."_ |
| Nama kolom di laporan jasa | `Item Titipan` (bukan "Produk" atau "Stok") |

---

## 3. Model Bisnis & Alur Pendapatan

### 3.1 Ritel Perhiasan Imitasi

PSA menjual perhiasan imitasi per item (satuan) maupun dalam bentuk paket atau set. Margin keuntungan berkisar **50–70%** dari harga modal. Merek dan pemasok utama meliputi Xuping, Yaxia, Meilyn, AMK, dan Rhodium, dengan bahan dasar berupa alloy berlapis emas, Titanium, Stainless Steel, dan Monel.

Semua produk **wajib** dilabeli sebagai imitasi, fashion jewelry, atau lapis emas. Dilarang keras mencantumkan klaim logam mulia tanpa keterangan lapis, karena bertentangan dengan identitas bisnis dan berpotensi menyesatkan konsumen.

### 3.2 Jasa Perawatan & Reparasi

Layanan diberikan terhadap perhiasan **milik pelanggan** yang dititipkan ke toko — bukan terhadap stok toko. Karena itu, seluruh transaksi jasa **tidak memengaruhi inventori stok** dan harus diperlakukan sebagai entitas `service_order` yang terpisah sepenuhnya dari entitas `product`.

> **Aturan absolut:** `service_item.affects_stock` **SELALU `false`** tanpa pengecualian. Sistem wajib menolak nilai `true` pada field ini di layer validasi UseCase dan Firestore Rules.

| Jenis Layanan | Keterangan |
|---|---|
| Sepuh Ulang | Melapisi ulang perhiasan yang memudar dengan lapisan emas, rhodium, atau warna lain |
| Patri | Penyambungan atau pengelasan komponen perhiasan yang putus atau retak |
| Reparasi Ringan | Perbaikan gesper, pengait, rantai, atau mata perhiasan yang lepas |
| Custom / Modifikasi | Penyesuaian ukuran atau penggantian komponen atas permintaan pelanggan |
| Restorasi | Pemulihan tampilan perhiasan lama ke kondisi yang lebih baik |

### 3.3 Buyback Emas (Layanan Tambahan)

Buyback adalah aktivitas PSA **membeli emas** dari konsumen atau pengunjung pasar yang datang langsung ke toko. Layanan ini tumbuh secara organik dari tingginya permintaan di lokasi pasar dan **bukan** merupakan bisnis inti perdagangan emas.

**Alur transaksi buyback:**

```
Konsumen datang membawa emas
        ↓
Owner melakukan verifikasi kepemilikan & kondisi fisik emas
        ↓
Negosiasi & kesepakatan harga antara kedua pihak
        ↓
Transaksi pembelian dicatat — PSA membayar konsumen (kas keluar)
        ↓
Emas masuk ke custody owner — BUKAN stok display toko
        ↓
Owner memutuskan satu dari dua opsi tindak lanjut:
  [A] Dijual ke pengepul → catat sebagai penjualan aset
  [B] Disimpan → catat sebagai entri Gold Treasury
```

Poin yang paling sering disalahpahami: buyback adalah sisi **pengeluaran** kas. Laporan buyback tidak boleh bercampur dengan laporan penjualan produk imitasi maupun laporan jasa.

---

## 4. Struktur Produk & Katalog

### 4.1 Kategori Satuan (Per Item)

| Kategori | Atribut Wajib | Contoh Model |
|---|---|---|
| Cincin | Ukuran (nomor); Bahan; Warna | Solitaire; Polos; Bermotif |
| Anting | Tipe model; Bahan; Warna | Tusuk; Hoop; Dangle; Clip |
| Gelang Tangan | Panjang (cm); Tipe; Bahan | Rantai; Bangle; Tennis |
| Gelang Kaki | Panjang (cm); Bahan; Warna | Rantai; Elastis |
| Kalung | Panjang (cm); Tipe; Bahan | Rantai Polos; Liontin; Choker |
| Liontin | Bahan; Warna; Motif | Inisial; Karakter; Batu |
| Bros | Bahan; Warna; Jenis | Bros Dagu; Bros Dada; Peniti |

### 4.2 Kategori Paket / Set

| Tipe Paket | Isi Minimal | Ketentuan |
|---|---|---|
| Satu Set | 2–3 item | Komposisi wajib tercantum di judul SKU |
| Full Set | Kalung + Anting + Gelang + Cincin | Semua item seragam motif dan warna |
| Couple Set | 2 item identik atau saling melengkapi | Target pasar wajib dicantumkan |

---

## 5. Standar Atribut Produk & Layanan

### 5.1 Atribut Produk Imitasi

| Atribut | Nilai Valid |
|---|---|
| Bahan Dasar | Alloy; Xuping; Titanium; Stainless Steel; Monel; Rhodium |
| Warna / Finishing | Gold; Rose Gold; Silver; Black; Rainbow; Multi |
| Ukuran | Cincin: nomor standar; Gelang/Kalung: angka cm; tulis `Adjustable` jika tidak fixed |
| Tipe Model | Bangle; Rantai; Hoop; Tusuk; Choker; Liontin; Clip; Dangle |
| Jenis Mata | Tanpa Mata; Zircon; Mutiara Sintetis; Permata Imitasi; Batu Akrilik |
| Target Pengguna | Wanita Dewasa; Pria; Anak; Unisex; Hijab Friendly |
| Occasion | Harian; Pesta; Kantor; Kondangan; Nikah |
| Status Stok | Tersedia; Habis; Indent; Tidak Aktif |

### 5.2 Atribut Layanan Jasa (Service Order)

> **Penting untuk developer:** Semua field di bawah adalah milik entitas `service_order` dan `service_item`. Field ini **tidak terhubung dengan tabel `product` atau `stock_ledger`** dalam kondisi apapun.

| Atribut | Nilai Valid | Catatan Developer |
|---|---|---|
| Jenis Layanan | Sepuh; Patri; Reparasi; Custom; Restorasi | Enum di layer domain |
| Warna Sepuh | Gold; Rose Gold; Silver; Black; Rhodium; Rainbow | Hanya relevan untuk jenis Sepuh |
| Estimasi Durasi | Dalam hari kerja — contoh: `1–3 hari` | Format string, bukan integer |
| Status Pekerjaan | `Diterima`; `Dikerjakan`; `Selesai`; `Diambil`; `Ditunda` | Enum — alur searah, tidak bisa mundur |
| Biaya Jasa | Nominal Rupiah | Wajib `Decimal.js` via `MathUtils` |
| **Item Titipan** | Deskripsi singkat item milik pelanggan | **Bukan nama produk dari katalog** — field bebas |
| `affects_stock` | **Selalu `false`** | Sistem wajib reject nilai lain; hardcoded di domain |

**Panduan label UI untuk status Service Order:**

```
DITERIMA    → Badge biru    #3498DB  — "Diterima, menunggu pengerjaan"
DIKERJAKAN  → Badge kuning  #F39C12  — "Sedang diproses"
SELESAI     → Badge hijau   #27AE60  — "Siap diambil pelanggan"
DIAMBIL     → Badge abu     #95A5A6  — "Transaksi selesai"
DITUNDA     → Badge merah   #E74C3C  — "Ada kendala, hubungi pelanggan"
```

### 5.3 Atribut Layanan Buyback Emas

| Atribut | Nilai Valid | Catatan Developer |
|---|---|---|
| Jenis Emas Diterima | Rusak/Patah; Tanpa Nota; Dari Toko Tutup; Dengan Nota Aktif | Enum opsional, default `Tanpa Nota` |
| Kadar Emas | `24K`; `22K`; `18K`; `Tidak Diketahui` | Wajib catatan verifikasi jika `Tidak Diketahui` |
| Berat (gram) | Desimal | Wajib `Decimal.js` |
| Harga Beli per Gram | Nominal Rupiah | Wajib `Decimal.js` |
| Total Dibayarkan | **Kalkulasi otomatis:** `berat × harga_per_gram` | **Dilarang diisi manual** — computed field |
| Sumber Dana | `cash_ledger`; `gold_treasury` | Enum — dropdown di UI |
| Tindak Lanjut | `sell_to_buyer`; `store_in_gold_treasury` | Enum — wajib diisi sebelum simpan |
| Status Verifikasi | `Terverifikasi Owner`; `Perlu Konfirmasi` | Hanya owner yang bisa set `Terverifikasi` |

---

## 6. Standar Penamaan SKU

### 6.1 Format Terstruktur

```
[CAT]-[MAT]-[MODEL]-[ATTRS]-[SEQ]
```

| Komponen | Keterangan | Contoh Nilai |
|---|---|---|
| `CAT` | 3 huruf kode kategori | `CIN`, `ANT`, `KAL`, `GLG`, `LNT`, `BRO`, `STS` |
| `MAT` | Singkatan bahan atau brand | `GOLD`, `XUP`, `TIT`, `SS`, `RHD`, `ROSE` |
| `MODEL` | Kode motif atau model | `SOL`, `BUNGA`, `HOOP`, `POLOS` |
| `ATTRS` | Atribut penting singkat | `UK17`, `45CM`, `ADJ` |
| `SEQ` | 4–5 digit nomor urut unik | `0001`, `00042` |

Contoh SKU valid: `CIN-GOLD-SOL-UK17-0001` · `SET-ROSE-BUNGA-1XKAL+1XANT-0002`

### 6.2 Aturan Validasi

Regex referensi untuk implementasi validator:
```
^[A-Z]{3}-[A-Z0-9]{2,6}-[A-Z0-9]{2,10}-[A-Z0-9\+]{2,20}-[0-9]{4,5}$
```

Aturan tambahan yang wajib ditegakkan oleh sistem: semua karakter uppercase tanpa spasi dan hanya ASCII; *uniqueness check* dijalankan otomatis saat pembuatan SKU baru; jika komposisi paket berubah, buat SKU baru dan tandai SKU lama sebagai `status: Tidak Aktif`; deskripsi *human-readable* wajib memuat kata `Imitasi` atau `Fashion Jewelry` di dua baris pertama.

---

## 7. Contoh JSON Entitas Kunci

> Semua nilai numerik uang dan berat **wajib** menggunakan `Decimal.js` di sisi aplikasi. Contoh JSON di bawah merepresentasikan data tersimpan dalam format string desimal.

**Product:**
```json
{
  "id": "product_0001",
  "sku": "CIN-GOLD-SOL-UK17-0001",
  "name": "Cincin Gold Solitaire Imitasi",
  "category": "Cincin",
  "material": "Alloy Lapis Emas",
  "price_retail": "125000.00",
  "cost_price": "60000.00",
  "stock": 12,
  "status": "Tersedia",
  "attributes": { "size": "17", "finish": "Gold" },
  "description": "Imitasi; Fashion Jewelry. Diameter 17mm; Adjustable."
}
```

**ServiceOrder:**
```json
{
  "id": "service20260509001",
  "customer_name": "Siti",
  "items": [
    {
      "desc": "Cincin lama ukuran 17 — kondisi memudar, batu masih utuh",
      "item_id": "custitem_01",
      "affects_stock": false
    }
  ],
  "service_type": "Sepuh",
  "color": "Gold",
  "estimated_days": 3,
  "status": "Diterima",
  "fee": "75000.00",
  "affects_stock": false,
  "notes": "Sepuh ulang; cek batu imitasi. Item titipan pelanggan — bukan produk toko."
}
```

**BuybackOrder:**
```json
{
  "id": "buyback20260509001",
  "customer_name": "Budi",
  "gold_type": "24K",
  "weight_gram": "3.45",
  "price_per_gram": "950000.00",
  "total_paid": "3277500.00",
  "payment_method": "Tunai",
  "source_fund": "cash_ledger",
  "verification_status": "Terverifikasi Owner",
  "follow_up": "store_in_gold_treasury",
  "notes": "Emas rusak, tanpa nota"
}
```

**GoldTreasury Entry:**
```json
{
  "id": "gold20260509001",
  "source_buyback_id": "buyback20260509001",
  "weight_gram": "3.45",
  "kadar": "24K",
  "valuation_idr": "3277500.00",
  "storage_status": "Disimpan",
  "owner_note": "Simpan sebagai aset"
}
```

---

## 8. Alur Proses (Flowchart Tekstual)

**Alur Penjualan Produk (Retail):** Kasir memilih produk → sistem membuat `transaction` → stok berkurang via entri `StockLedger` → `CashLedger` bertambah → `ShiftSession` mencatat mutasi → data masuk ke Laporan Penjualan Harian.

**Alur Service Order (Jasa):** Owner atau staf membuat `service_order` → **item titipan pelanggan dicatat dengan label "Jasa Perawatan — Item Titipan Pelanggan"** → checkbox `✓ Item Titipan — Tidak Mengurangi Stok Produk` wajib aktif → status berjalan: Diterima → Dikerjakan → Selesai → Diambil → biaya jasa masuk `CashLedger` saat pembayaran diambil → `StockLedger` tidak berubah sama sekali.

**Alur Buyback Emas:** Konsumen datang → owner verifikasi → negosiasi → buat `buyback_order` → pilih `source_fund` → `CashLedger` atau `GoldTreasury` berkurang sesuai pilihan → pilih tindak lanjut: jual ke pengepul (buat entri penjualan aset) atau simpan (buat entri `gold_treasury`) → stok produk tidak berubah.

---

## 9. ERD Ringkas (Relasi Antar Entitas)

```
Product           1 ── N   StockLedger
Product           1 ── N   Transaction
Transaction       N ── 1   ShiftSession
ServiceOrder      1 ── N   ServiceItem        ← ServiceItem.affects_stock ALWAYS false
BuybackOrder      1 ── 0/1 GoldTreasuryEntry
CashLedger        1 ── N   CashLedgerEntry
ShiftSession      1 ── N   CashLedgerEntry
[Semua entitas]   N ── 1   AuditLog           ← SHA-256 hash chain, immutable
```

> **Garis tebal pemisah:** `ServiceOrder` dan `BuybackOrder` **tidak pernah** memiliki relasi ke tabel `Product` atau `StockLedger`. Jika ada foreign key ke sana, itu bug arsitektur.

---

## 10. Gold Treasury — Modul Aset Emas Terpisah

Gold Treasury adalah modul pencatatan aset emas yang **sepenuhnya terpisah** dari kas operasional toko. Modul ini tidak berhubungan langsung dengan penjualan produk imitasi maupun kas laci kasir, dan dikelola secara mandiri oleh owner.

Yang masuk ke Gold Treasury: emas hasil buyback yang tidak langsung dijual ke pengepul, serta catatan dana dari penjualan emas ke pengepul bila owner ingin merekamnya sebagai aset. Yang tidak masuk: pendapatan penjualan perhiasan imitasi, pendapatan jasa, dan stok perhiasan imitasi.

> **Peringatan mutlak untuk developer:** jangan pernah mengagregasi atau menggabungkan data `gold_treasury` dengan `cash_ledger`. Keduanya adalah entitas keuangan yang terpisah dengan logika, laporan, dan lifecycle data masing-masing.

### Tindak Lanjut Emas Setelah Buyback

| Opsi | Keterangan | Dampak di Sistem |
|---|---|---|
| Dijual ke Pengepul | Owner menjual emas ke pengepul di luar toko | Catat sebagai penjualan aset → kas bertambah |
| Disimpan | Emas disimpan sebagai aset cadangan | Buat entri baru di `gold_treasury` |

---

## 11. Template Laporan (Kolom Wajib)

Laporan-laporan berikut **tidak boleh dicampur** satu sama lain. Setiap laporan hanya mengambil data dari entitas sumbernya masing-masing.

**Laporan Penjualan Harian** — sumber: `transaction`
`Tanggal · TransactionID · SKU · Nama Produk · Qty · Harga Satuan · Total · Kasir · ShiftSessionID`

**Laporan Jasa** — sumber: `service_order`
`Tanggal Terima · ServiceOrderID · Customer · Jenis Layanan · Item Titipan · Estimasi Hari · Biaya · Status · Tanggal Selesai`

**Laporan Buyback** — sumber: `buyback_order`
`Tanggal · BuybackID · Customer · Kadar · Berat (g) · Harga/gram · Total Dibayarkan · Sumber Dana · Tindak Lanjut · Status Verifikasi`

**Laporan Gold Treasury** — sumber: `gold_treasury` + `buyback_order`
`EntryID · Tanggal · Sumber BuybackID · Berat (g) · Kadar · Valuasi (IDR) · Status Penyimpanan · Catatan Owner`

---

## 12. Panduan UI/UX untuk Owner Non-Teknis

Antarmuka wajib menerapkan prinsip **mobile-first**, bahasa sederhana, serta warna dan badge yang secara aktif mencegah kesalahan operasional.

### 12.1 Standar Label & Warna per Domain

| Domain | Warna Utama | Hex | Contoh Teks Header |
|---|---|---|---|
| Penjualan Produk | Hijau | `#27AE60` | "Transaksi Penjualan" |
| Jasa Perawatan | Biru | `#3498DB` | "Jasa Perawatan — Item Titipan Pelanggan" |
| Buyback Emas | Merah/Oranye | `#E74C3C` | "BUYBACK — Pembelian Emas (Bukan Stok)" |

### 12.2 Standar Komponen UI — Service Order

Layar penerimaan jasa wajib menyertakan elemen-elemen berikut secara berurutan:

1. **Header** dengan label `Jasa Perawatan — Item Titipan Pelanggan` (warna biru, font bold)
2. **Checkbox besar** bertuliskan `✓ Item Titipan — Tidak Mengurangi Stok Produk` — checked by default, disabled (tidak bisa diubah kasir)
3. **Tooltip ikon `?`** di samping checkbox: _"Item ini milik pelanggan dan akan dikembalikan setelah pengerjaan. Tidak memengaruhi stok toko."_
4. **Field "Deskripsi Item Titipan"** — text area bebas, placeholder: _"Contoh: Cincin emas putih, ukuran 17, kondisi memudar di bagian atas"_
5. **Dropdown Status** dengan badge warna sesuai panduan di Seksi 5.2
6. **Layar konfirmasi** sebelum simpan: _"Konfirmasi: Anda menerima item milik pelanggan. Sistem mencatat ini sebagai Item Titipan dan tidak akan mengurangi stok produk. Lanjutkan?"_

### 12.3 Standar Komponen UI — Buyback

1. **Header** `BUYBACK — Pembelian Emas dari Konsumen (Bukan Stok)` dengan badge merah `#E74C3C`
2. **Dropdown Sumber Dana** — dua opsi dengan label eksplisit:
   - `Kas Laci (Operasional)` — tooltip: _"Uang tunai operasional toko harian"_
   - `Gold Treasury (Aset Emas)` — tooltip: _"Rekening aset emas terpisah dari kas toko"_
3. **Total Dibayarkan** — calculated field, tidak bisa diedit manual, nilai merah dengan label `PSA membayar ke konsumen:`
4. **Layar konfirmasi wajib** sebelum selesaikan — menampilkan ringkasan: berat, harga/gram, total dibayarkan, sumber dana, tindak lanjut — tombol `Selesaikan` dan `Batal`

### 12.4 Panduan Tombol Bantuan

Setiap layar utama menyertakan tombol **?** (biru, pojok kanan atas) yang membuka modal satu–dua kalimat dalam bahasa awam. Hindari istilah teknis di dalam teks bantuan ini.

---

## 13. Aturan Teknis Mutlak (Developer)

Poin-poin berikut bersifat mutlak dan tidak dapat dikecualikan dalam kondisi apapun.

1. **Kalkulasi Decimal:** Semua kalkulasi uang dan berat wajib menggunakan `Decimal.js` via `MathUtils` — tidak ada pengecualian.
2. **Alur Mutasi Data:** Semua mutasi wajib melalui `UnitOfWork → sync_events → Cloud Functions`; tidak ada direct write dari UI ke Firestore.
3. **Audit Trail:** Setiap perubahan pada entitas kritis wajib menulis entri ke `AuditLog` dengan SHA-256 hash chain.
4. **Offline-First:** Aplikasi menyimpan semua event secara lokal terlebih dahulu; sinkronisasi saat koneksi tersedia; resolusi konflik menggunakan owner override yang dicatat di audit trail.
5. **SKU Validation:** Validator SKU mengimplementasikan regex dan uniqueness check di sisi domain/usecase.
6. **`service_item.affects_stock`:** Nilai `true` wajib ditolak di layer UseCase dan Firestore Rules — tambahkan assertion test untuk ini.
7. **Pemisahan Laporan:** Query laporan tidak boleh melakukan `JOIN` atau agregasi lintas `cash_ledger` dan `gold_treasury`.

---

## 14. Checklist QA & Test Case Prioritas

Seluruh skenario berikut wajib lulus sebelum setiap rilis ke produksi.

1. **Buyback sebagai pengeluaran** — buat buyback, pilih `cash_ledger`, verifikasi kas berkurang dan `product.stock` tidak berubah.
2. **ServiceOrder tidak mengurangi stok** — buat service order dengan deskripsi item yang mirip SKU produk, pastikan `StockLedger` tidak mengalami perubahan apapun.
3. **Validasi `affects_stock`** — coba set `service_item.affects_stock = true` via API, pastikan sistem menolak dengan error yang jelas.
4. **Gold Treasury terpisah** — buat buyback → simpan ke `gold_treasury`, pastikan laporan kas toko sama sekali tidak berubah.
5. **Presisi Decimal.js** — uji kalkulasi `weight × price_per_gram` untuk nilai-nilai rentan floating point (contoh: `0.1 × 0.2`).
6. **Offline sync** — buat transaksi dalam kondisi offline, aktifkan koneksi, verifikasi `UnitOfWork` events dan `AuditLog` terisi dengan benar.
7. **SKU collision** — coba buat SKU yang sudah ada, pastikan sistem menolak dengan pesan error yang jelas.
8. **Audit tamper detection** — ubah record secara langsung di DB, pastikan hash chain mismatch terdeteksi saat verifikasi.
9. **Label UI Service Order** — pastikan header layar menampilkan `Jasa Perawatan — Item Titipan Pelanggan` dan checkbox `Item Titipan` tidak bisa diubah kasir.

---

## 15. Contoh Kasus Salah Implementasi & Langkah Koreksi

**Kasus A — Buyback tercatat sebagai penjualan.**
Dampak: stok produk berkurang padahal tidak ada produk yang dijual, laporan penjualan menjadi tidak akurat, saldo kas tidak sesuai kenyataan. Koreksi: buat reversing transaction untuk stok; buat `buyback_order` yang benar; perbaiki entri `CashLedger`; catat seluruh koreksi di `AuditLog` dengan alasan yang tercantum jelas.

**Kasus B — Gold Treasury digabungkan ke laporan kas toko.**
Dampak: laporan kas operasional dan laporan aset emas sama-sama tidak akurat. Koreksi: pisahkan entri; rekonstruksi entri `gold_treasury` dari histori buyback; perbarui kedua laporan; seluruh proses koreksi wajib tercatat di audit trail.

**Kasus C — Service Order mengurangi stok produk.**
Dampak: stok produk berkurang tanpa penjualan nyata; laporan stok tidak akurat; rekonsiliasi stok menjadi tidak bisa dipercaya. Koreksi: identifikasi semua `service_order` yang salah terhubung ke `stock_ledger`; buat adjustment entry stok dengan catatan alasan; perbaiki constraint `affects_stock = false` di layer domain; tambahkan regression test (Test Case #3 di atas).

**Kasus D — Label "Titipan" tanpa konteks di UI.**
Dampak: staf baru salah mengartikan service order sebagai konsinyasi atau stok masuk; produk tidak dicatat dengan benar. Koreksi: perbarui semua label UI sesuai Seksi 12.2; tambahkan tooltip pada setiap kemunculan kata "titipan"; laksanakan briefing staf 10–15 menit menggunakan SOP cetak (lihat Seksi 16).

---

## 16. SOP Singkat untuk Staf — Jasa Perawatan (Cetak & Tempel di Meja Kasir)

```
╔══════════════════════════════════════════════════════════╗
║  SOP TERIMA ITEM TITIPAN PELANGGAN (JASA PERAWATAN)      ║
╠══════════════════════════════════════════════════════════╣
║  1. Tanya pelanggan: jenis layanan & kondisi barang      ║
║  2. Buka layar "Jasa Perawatan — Item Titipan Pelanggan" ║
║  3. Tulis deskripsi barang di field "Item Titipan"       ║
║     (nama, kondisi, warna, perkiraan bahan)              ║
║  4. Pastikan checkbox ✓ "Item Titipan" sudah centang     ║
║  5. Isi estimasi hari & biaya jasa                       ║
║  6. Baca konfirmasi layar, lalu klik "Lanjutkan"         ║
║  7. Berikan nomor order kepada pelanggan                 ║
║                                                          ║
║  ⚠️  PENTING: Barang pelanggan TIDAK masuk stok toko.    ║
║     Kasir TIDAK perlu scan barcode produk untuk jasa.    ║
╚══════════════════════════════════════════════════════════╝
```

---

## 17. Lampiran Teknis

Nilai-nilai referensi berikut digunakan secara konsisten di seluruh lapisan sistem.

```
SKU Regex              : ^[A-Z]{3}-[A-Z0-9]{2,6}-[A-Z0-9]{2,10}-[A-Z0-9\+]{2,20}-[0-9]{4,5}$
Badge Buyback (UI)     : "BUYBACK — Pembelian dari Konsumen (Bukan Stok)"
Badge Jasa (UI)        : "Jasa Perawatan — Item Titipan Pelanggan"
Badge color — Buyback  : #E74C3C
Badge color — Jasa     : #3498DB
Badge color — Penjualan: #27AE60
Enum source_fund       : ["cash_ledger", "gold_treasury"]
Enum follow_up         : ["sell_to_buyer", "store_in_gold_treasury"]
Enum service_status    : ["Diterima", "Dikerjakan", "Selesai", "Diambil", "Ditunda"]
Decimal fields         : weight_gram, price_per_gram, total_paid, fee, valuation_idr
service_item.affects_stock : ALWAYS false — no exceptions
```

---

## 18. Profil Pengguna & Konteks Operasional

| Parameter | Detail |
|---|---|
| Jumlah Owner | 2 orang (Founder / Owner aktif) |
| Latar Teknis | Non-programmer; tidak familiar dengan kode |
| Perangkat Utama | Ponsel (mobile-first); tablet sebagai kasir sekunder |
| Koneksi Internet | Tidak selalu tersedia — sistem wajib offline-first 100% |
| Langganan Berbayar | Tidak tersedia — sistem wajib berjalan di free tier |
| Jam Operasional | Mengikuti jam pasar; terdapat sesi shift buka dan tutup harian |

---

## 19. Batasan Bisnis — Daftar Verifikasi Cepat

Bagian ini digunakan sebagai daftar periksa saat code review atau desain fitur baru.

- [ ] PSA tidak menjual emas kepada konsumen dalam bentuk apapun
- [ ] PSA tidak memiliki stok emas yang dipajang atau diperdagangkan kepada pelanggan toko
- [ ] Buyback adalah pembelian — PSA adalah pihak yang membayar, bukan menerima pembayaran
- [ ] Layanan jasa tidak menghasilkan produk baru dan tidak menambah stok
- [ ] Semua produk adalah imitasi — tidak ada produk logam mulia dalam katalog toko
- [ ] Gold Treasury bukan rekening bank — ini catatan aset emas fisik yang dipegang owner
- [ ] Tidak ada sistem online cart atau marketplace — semua transaksi tatap muka langsung
- [ ] Label "Titipan" di UI selalu disertai konteks lengkap (lihat Seksi 2.1 dan Seksi 12.2)
- [ ] `service_item.affects_stock` tidak pernah bernilai `true`

---

## 20. Prosedur Perubahan Dokumen & Governance

Semua perubahan pada dokumen ini diajukan melalui `docs/adr/` dengan mencantumkan alasan perubahan, dampak teknis yang ditimbulkan, dan persetujuan tertulis dari owner. Versi dokumen diperbarui di tabel revisi di bawah. Sosialisasi perubahan minimal satu jam untuk owner dan staf, serta satu sprint review untuk developer.

---

## 21. Riwayat Revisi

| Versi | Tanggal | Ringkasan Perubahan |
|---|---|---|
| 1.0 | 17 Apr 2026 | Dokumen awal disusun oleh manajemen |
| 2.0 | 9 Mei 2026 | Penyempurnaan menyeluruh: atribut layanan jasa & buyback, klarifikasi Gold Treasury, panduan entitas untuk developer, tabel batasan bisnis |
| 3.0 | 9 Mei 2026 | Penambahan glosarium bisnis ↔ teknis, format SKU terstruktur dengan regex, contoh JSON entitas kunci, ERD ringkas, flowchart tekstual, template laporan, panduan UI/UX, checklist QA, contoh kasus salah implementasi, dan lampiran teknis |
| 3.1 | 9 Mei 2026 | Integrasi panduan terminologi "titipan" (Seksi 2.1 & 12.2), standar label warna per domain, komponen UI service order terstandarisasi, SOP cetak staf (Seksi 16), test case tambahan validasi `affects_stock`, kasus C & D di Seksi 15, catatan developer di Seksi 5.2, peringatan baru di tabel asumsi salah |

---

*Dokumen ini adalah referensi wajib. Setiap perubahan harus mendapat persetujuan owner dan wajib direkam di `docs/adr/` beserta alasan dan dampak perubahannya.*

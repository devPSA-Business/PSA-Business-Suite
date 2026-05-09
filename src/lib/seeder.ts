/**
 * @ai_context: Database seeder untuk mode development — simulasi operasional harian toko perhiasan imitasi PSA
 * @business_rule: Toko menjual perhiasan IMITASI (bukan emas asli). Layanan: sepuh, perbaikan, custom.
 *                 Buyback emas dari pelanggan dijual ke PENGEPUL, bukan dipajang/dijual ke konsumen.
 * @security_tier: LOW (hanya dev, tidak berjalan di production)
 */
import { db } from '../shared/api/db';
import { StockCategory } from '../domain/models/StockCategory';
import { isDevEnvironment } from '../shared/utils/devUtils';

export const seedDatabase = async () => {
  if (!isDevEnvironment()) return;
  const stockCount = await db.stock.count();
  if (stockCount > 0) return; // Already seeded

  console.log('Seeding database with PSA sample data (perhiasan imitasi)...');

  // 1. Seed Stock — Produk sesuai konteks bisnis: perhiasan imitasi pasar tradisional-modern
  const dummyStock = [
    {
      id: 'STK-001-',
      name: 'Kalung Xuping Permata Zirconia Putih',
      category: StockCategory.IMITATION,
      price: 125000,
      cost: 55000,
      quantity: 40,
      barcode: 'PSA-100001',
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-002-',
      name: 'Gelang Rantai Imitasi Gold Plated 3 Lapis',
      category: StockCategory.IMITATION,
      price: 85000,
      cost: 35000,
      quantity: 60,
      barcode: 'PSA-100002',
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-003-',
      name: 'Cincin Imitasi Batu Akik Oval',
      category: StockCategory.IMITATION,
      price: 45000,
      cost: 18000,
      quantity: 80,
      barcode: 'PSA-100003',
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-004-',
      name: 'Anting Permata Zirconia Merah Rose Gold',
      category: StockCategory.IMITATION,
      price: 65000,
      cost: 25000,
      quantity: 55,
      barcode: 'PSA-100004',
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-005-',
      name: 'Kotak Cincin Beludru Merah Premium',
      category: StockCategory.ACCESSORIES,
      price: 25000,
      cost: 10000,
      quantity: 100,
      barcode: 'PSA-100005',
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-006-',
      name: 'Gelang Tangan Bangle Imitasi Ukir',
      category: StockCategory.IMITATION,
      price: 95000,
      cost: 40000,
      quantity: 35,
      barcode: 'PSA-100006',
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-007-',
      name: 'Kalung Liontin Hati Silver Imitasi',
      category: StockCategory.IMITATION,
      price: 110000,
      cost: 48000,
      quantity: 45,
      barcode: 'PSA-100007',
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-008-',
      name: 'Set Perhiasan Imitasi (Kalung + Anting)',
      category: StockCategory.IMITATION,
      price: 185000,
      cost: 75000,
      quantity: 20,
      barcode: 'PSA-100008',
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-009-',
      name: 'Kotak Penyimpan Perhiasan Kayu Kecil',
      category: StockCategory.ACCESSORIES,
      price: 55000,
      cost: 22000,
      quantity: 30,
      barcode: 'PSA-100009',
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-010-',
      name: 'Cincin Couple Imitasi Silver Minimalis',
      category: StockCategory.IMITATION,
      price: 75000,
      cost: 28000,
      quantity: 50,
      barcode: 'PSA-100010',
      version: 1,
      branchId: 'HQ'
    }
  ].map(item => ({ ...item, id: item.id + crypto.randomUUID().substring(0, 8) }));

  await db.stock.bulkAdd(dummyStock);

  // 2. Seed Gold Price — Harga acuan pasar untuk layanan buyback (dibeli dari pelanggan → dijual ke pengepul)
  await db.gold_price.put({
    id: 'CURRENT',
    pricePerGram: 1350000, // Harga acuan pasar emas saat ini (bukan harga jual ke konsumen)
    lastUpdated: Date.now()
  });

  // 3. Seed Store Profile
  const existingProfile = await db.store_profile.get('default');
  if (!existingProfile) {
    await db.store_profile.put({
      id: 'default',
      name: 'PSA Perhiasan Imitasi',
      address: 'Pasar Tradisional PSA, Kios No. A-01',
      receiptFooter: 'Terima kasih telah berbelanja di PSA!\nHubungi kami: 0812-XXXX-XXXX',
      isSetupComplete: false,
      updatedAt: Date.now()
    });
  }

  console.log('Seeding PSA DB complete: 10 produk imitasi + harga acuan emas + profil toko.');
};

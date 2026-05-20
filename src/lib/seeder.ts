/**
 * @ai_context: Database seeder untuk lingkungan DEV / Preview.
 * @business_rule: Data seed WAJIB mencerminkan fakta lapangan PSA Jewellery Sampit:
 *   - Produk IMITASI: Xuping, Yaxiya, Titanium, Stainless Steel
 *   - 3 revenue stream: (1) Jual imitasi, (2) Jasa perawatan/reparasi/sepuh, (3) Buyback emas
 *   - Buyback: BELI dari pelanggan, JUAL ke pengepul — PSA TIDAK stok emas
 *   - SKU format: [Kategori][Warna][Motif][Kode]
 * @security_tier: LOW — hanya berjalan di dev, tidak pernah ke produksi
 */

import { db } from '../shared/api/db';
import { StockCategory } from '../domain/models/StockCategory';
import { isDevEnvironment } from '../shared/utils/devUtils';

const BRANCH = 'HQ';
const NOW = Date.now();
const DAY = 86_400_000;

export const seedDatabase = async () => {
  if (!isDevEnvironment()) return;
  const stockCount = await db.stock.count();
  if (stockCount > 0) return;

  console.info('[Seeder] Menyemai data contoh PSA Jewellery...');

  const dummyStock = [
    // Xuping
    { sku: 'XP-KN-BUL-001', name: 'Kalung Xuping Bulir Padi Emas', category: StockCategory.IMITATION, price: 85_000, cost: 42_000, quantity: 35, barcode: 'PSA-XP-001' },
    { sku: 'XP-GT-ZRK-002', name: 'Gelang Tangan Xuping Zirkonia Full', category: StockCategory.IMITATION, price: 120_000, cost: 58_000, quantity: 28, barcode: 'PSA-XP-002' },
    { sku: 'XP-AN-POL-003', name: 'Anting Xuping Polos Bulat Silver', category: StockCategory.IMITATION, price: 45_000, cost: 22_000, quantity: 60, barcode: 'PSA-XP-003' },
    { sku: 'XP-CN-HT-004', name: 'Cincin Xuping Hati Zirkonia Merah', category: StockCategory.IMITATION, price: 65_000, cost: 30_000, quantity: 42, barcode: 'PSA-XP-004' },
    { sku: 'XP-SET-PND-005', name: 'Set Xuping Pengantin Kalung+Anting+Gelang', category: StockCategory.IMITATION, price: 350_000, cost: 165_000, quantity: 12, barcode: 'PSA-XP-005' },
    // Yaxiya
    { sku: 'YX-KN-RNT-006', name: 'Kalung Yaxiya Rantai Singapur Emas', category: StockCategory.IMITATION, price: 150_000, cost: 72_000, quantity: 20, barcode: 'PSA-YX-006' },
    { sku: 'YX-CN-PKR-007', name: 'Cincin Yaxiya Paku Rivoli', category: StockCategory.IMITATION, price: 95_000, cost: 45_000, quantity: 30, barcode: 'PSA-YX-007' },
    { sku: 'YX-PND-SLB-008', name: 'Liontin Yaxiya Salib Ukir Silver', category: StockCategory.IMITATION, price: 75_000, cost: 35_000, quantity: 25, barcode: 'PSA-YX-008' },
    // Titanium
    { sku: 'TI-CN-POL-009', name: 'Cincin Titanium Polos Hitam Pria', category: StockCategory.IMITATION, price: 180_000, cost: 90_000, quantity: 18, barcode: 'PSA-TI-009' },
    { sku: 'TI-GL-RNT-010', name: 'Gelang Titanium Rantai Kotak Pria', category: StockCategory.IMITATION, price: 220_000, cost: 108_000, quantity: 15, barcode: 'PSA-TI-010' },
    { sku: 'TI-SET-CPL-011', name: 'Set Couple Titanium Ukir Nama', category: StockCategory.IMITATION, price: 380_000, cost: 185_000, quantity: 10, barcode: 'PSA-TI-011' },
    // Stainless Steel
    { sku: 'SS-KN-BXB-012', name: 'Kalung Stainless Box Chain Silver 50cm', category: StockCategory.IMITATION, price: 95_000, cost: 45_000, quantity: 40, barcode: 'PSA-SS-012' },
    { sku: 'SS-AN-HUP-013', name: 'Anting Stainless Hoop Besar Gold', category: StockCategory.IMITATION, price: 55_000, cost: 25_000, quantity: 55, barcode: 'PSA-SS-013' },
    { sku: 'SS-GL-KRP-014', name: 'Gelang Stainless Kulit Rempel Hitam', category: StockCategory.IMITATION, price: 130_000, cost: 62_000, quantity: 22, barcode: 'PSA-SS-014' },
    { sku: 'SS-FSET-PKN-015', name: 'Full Set Stainless Pernikahan 5pcs', category: StockCategory.IMITATION, price: 485_000, cost: 230_000, quantity: 8, barcode: 'PSA-SS-015' },
  ].map(item => ({
    ...item,
    id: item.sku + '-' + crypto.randomUUID().slice(0, 6),
    version: 1,
    branchId: BRANCH,
  }));

  await db.stock.bulkAdd(dummyStock);

  await db.gold_price.put({ id: 'CURRENT', pricePerGram: 1_620_000, lastUpdated: NOW });

  // Transaksi demo — tanpa client_txn_id (bukan bagian dari Transaction interface)
  await db.transactions.add({
    id: 'TXN-DEMO-A',
    date: NOW - 3_600_000,
    items: [{ stockId: dummyStock[0].id, name: dummyStock[0].name, quantity: 2, price: dummyStock[0].price, subtotal: dummyStock[0].price * 2 }],
    total: dummyStock[0].price * 2,
    paymentMethod: 'CASH',
    status: 'SUCCESS',
    user: 'Owner',
    branchId: BRANCH,
  });

  await db.transactions.add({
    id: 'TXN-DEMO-B',
    date: NOW - 7_200_000,
    items: [{ stockId: dummyStock[4].id, name: dummyStock[4].name, quantity: 1, price: dummyStock[4].price, subtotal: dummyStock[4].price }],
    total: dummyStock[4].price,
    paymentMethod: 'QRIS',
    status: 'SUCCESS',
    user: 'Owner',
    branchId: BRANCH,
  });

  // Jasa reparasi — status VALID: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED'
  await db.repair_services.add({
    id: 'REP-DEMO-A',
    date: NOW - DAY,
    customerName: 'Ibu Sari',
    phoneNumber: '082112345678',
    itemDescription: 'Kalung Xuping kusam, minta disepuh ulang warna gold',
    serviceType: 'SEPUH',
    initialWeight: 0.5,
    price: 75_000,
    status: 'IN_PROGRESS',
    paymentMethod: 'CASH',
    user: 'Owner',
    branchId: BRANCH,
  });

  await db.repair_services.add({
    id: 'REP-DEMO-B',
    date: NOW - 2 * DAY,
    customerName: 'Pak Hendra',
    phoneNumber: '081398765432',
    itemDescription: 'Cincin stainless bengkok, minta dibentuk ulang dan dipoles',
    serviceType: 'REPARASI',
    initialWeight: 1.2,
    price: 50_000,
    status: 'COMPLETED', // fix: 'DONE' tidak valid → gunakan 'COMPLETED'
    paymentMethod: 'TRANSFER',
    user: 'Owner',
    branchId: BRANCH,
  });

  await db.petty_cash.add({
    id: 'PC-DEMO-A',
    date: NOW - 3 * DAY,
    category: 'OPERASIONAL',
    amount: 120_000,
    description: 'Beli larutan pembersih perhiasan + kain poles',
    user: 'Owner',
  });

  await db.petty_cash.add({
    id: 'PC-DEMO-B',
    date: NOW - DAY,
    category: 'OPERASIONAL',
    amount: 35_000,
    description: 'Print struk + tinta printer kasir',
    user: 'Owner',
  });

  console.info('[Seeder] Selesai: 15 SKU imitasi, 2 jasa, 2 transaksi, 2 petty cash.');
};

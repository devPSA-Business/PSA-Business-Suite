import { db } from '../shared/api/db';
import { StockCategory } from '../domain/models/StockCategory';
import { cryptoKeyStore } from './cryptoKeyStore';
import { isDevEnvironment } from '../shared/utils/devUtils';

export const seedDatabase = async () => {
  if (!isDevEnvironment()) return;
  const stockCount = await db.stock.count();
  if (stockCount > 0) return; // Already seeded

  console.log('Seeding database with sample operational data...');

  // 1. Seed Stock
  const dummyStock = [
    {
      id: 'STK-001-',
      name: 'Cincin Emas Kuning 70% Polos (2g)',
      category: StockCategory.GOLD_JEWELLERY,
      price: 2100000,
      cost: 1850000,
      quantity: 12,
      barcode: 'PSA-100001',
      specificCost: 1850000,
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-002-',
      name: 'Gelang Rantai Emas Putih 75% (5g)',
      category: StockCategory.GOLD_JEWELLERY,
      price: 5250000,
      cost: 4800000,
      quantity: 5,
      barcode: 'PSA-100002',
      specificCost: 4800000,
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-003-',
      name: 'Kalung Xuping Permata Zirconia',
      category: StockCategory.IMITATION,
      price: 150000,
      cost: 85000,
      quantity: 50,
      barcode: 'PSA-100003',
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-004-',
      name: 'LM Antam 1 Gram CertiEye',
      category: StockCategory.GOLD_BAR,
      price: 1450000,
      cost: 1390000,
      quantity: 8,
      barcode: 'PSA-100004',
      specificCost: 1390000,
      version: 1,
      branchId: 'HQ'
    },
    {
      id: 'STK-005-',
      name: 'Kotak Cincin Beludru Merah',
      category: StockCategory.ACCESSORIES,
      price: 35000,
      cost: 15000,
      quantity: 100,
      barcode: 'PSA-100005',
      version: 1,
      branchId: 'HQ'
    }
  ].map(item => ({...item, id: item.id + crypto.randomUUID().substring(0, 8)}));

  await db.stock.bulkAdd(dummyStock);

  // 2. Seed Gold Price
  await db.gold_price.put({
    id: 'CURRENT',
    pricePerGram: 1350000, // Harga patokan
    lastUpdated: Date.now()
  });

  // 3. Seed A Custom Order & Repair Service to make dashboard look alive
  await db.repair_services.add({
    id: 'REP-DEMO-1',
    date: Date.now() - 86400000, // 1 day ago
    customerName: 'Ibu Ratna',
    phoneNumber: '081234567890',
    itemDescription: 'Cincin putus perlu disambung dan disepuh',
    serviceType: 'REPARASI',
    initialWeight: 2.5,
    price: 150000,
    status: 'IN_PROGRESS',
    paymentMethod: 'CASH',
    user: 'Administrator',
    branchId: 'HQ'
  });

  await db.petty_cash.add({
    id: 'PC-DEMO-1',
    date: Date.now() - 3600000,
    category: 'OPERASIONAL',
    amount: 50000,
    description: 'Beli air galon dan tissue',
    user: 'Administrator'
  });

  // 4. Seed Retail Transaction
  await db.transactions.add({
    id: 'TXN-DEMO-1',
    date: Date.now() - 7200000,
    items: [{ 
      stockId: dummyStock[0].id, 
      name: dummyStock[0].name, 
      quantity: 1, 
      price: dummyStock[0].price, 
      subtotal: dummyStock[0].price 
    }],
    total: dummyStock[0].price,
    paymentMethod: 'CASH',
    status: 'SUCCESS',
    user: 'Administrator',
    branchId: 'HQ'
  });

  console.log('Database seeded successfully.');
};

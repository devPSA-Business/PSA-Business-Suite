import { IDatabaseAdminService } from '../../application/services/IDatabaseAdminService';
import { db, StockItem, Transaction, RepairService, Customer } from '../../shared/api/db';

export class DatabaseAdminServiceImpl implements IDatabaseAdminService {
  async exportDatabase(): Promise<string> {
    const data = {
      stock: await db.stock.toArray(),
      transactions: await db.transactions.toArray(),
      repair_services: await db.repair_services.toArray(),
      audit_logs: await db.audit_logs.toArray(),
    };
    return JSON.stringify(data);
  }

  async importDatabase(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);
    
    await db.transaction('rw', db.stock, db.transactions, db.repair_services, db.audit_logs, async () => {
      await db.stock.clear();
      await db.transactions.clear();
      await db.repair_services.clear();
      await db.audit_logs.clear();

      if (data.stock && data.stock.length > 0) await db.stock.bulkAdd(data.stock);
      if (data.transactions && data.transactions.length > 0) await db.transactions.bulkAdd(data.transactions);
      if (data.repair_services && data.repair_services.length > 0) await db.repair_services.bulkAdd(data.repair_services);
      if (data.audit_logs && data.audit_logs.length > 0) await db.audit_logs.bulkAdd(data.audit_logs);
    });
  }

  async recoverFromCloud(): Promise<void> {
    // FIX BUG-04: bulkAdd → bulkPut (idempotent: tidak crash jika dipanggil 2x)
    // FIX NEW-02: tambah recovery untuk repair_services dan customers (sebelumnya hilang)
    //
    // Tabel yang dipulihkan (sinkron dengan importDatabase()):
    //   stock, transactions, repair_services, customers
    //   audit_logs TIDAK dipulihkan dari Cloud — append-only, hindari overwrite trail audit
    //
    // @changelog: 2026-05-22 — BUG-04 + NEW-02 fix. recoverFromCloud sekarang idempoten.
    const { collection, getDocs } = await import('firebase/firestore');
    const { firestoreDb, isConfigValid } = await import('../../shared/api/firebase');

    if (!isConfigValid) throw new Error('Fitur pemulihan Cloud tidak tersedia: Firebase API Key tidak dikonfigurasi.');

    // Ambil semua snapshot secara paralel (lebih cepat dari sequential)
    const [stockSnapshot, transactionsSnapshot, repairSnapshot, customersSnapshot] = await Promise.all([
      getDocs(collection(firestoreDb, 'stock')),
      getDocs(collection(firestoreDb, 'transactions')),
      getDocs(collection(firestoreDb, 'repair_services')),
      getDocs(collection(firestoreDb, 'customers')),
    ]);

    await db.transaction('rw', db.stock, db.transactions, db.repair_services, db.customers, async () => {
      await db.stock.clear();
      await db.transactions.clear();
      await db.repair_services.clear();
      await db.customers.clear();

      // Firestore DocumentData diverifikasi oleh collection name — double-cast (unknown → entity)
      // adalah idiom TS yang aman di sini karena data berasal dari koleksi Firestore yang typed
      const toData = <T>(snap: typeof stockSnapshot): T[] =>
        snap.docs.map(doc => doc.data() as unknown as T);

      if (!stockSnapshot.empty)        await db.stock.bulkPut(toData<StockItem>(stockSnapshot));
      if (!transactionsSnapshot.empty) await db.transactions.bulkPut(toData<Transaction>(transactionsSnapshot));
      if (!repairSnapshot.empty)       await db.repair_services.bulkPut(toData<RepairService>(repairSnapshot));
      if (!customersSnapshot.empty)    await db.customers.bulkPut(toData<Customer>(customersSnapshot));
    });
  }

  async clearDatabase(): Promise<void> {
    await db.transaction('rw', db.stock, db.transactions, db.repair_services, db.audit_logs, async () => {
      await db.stock.clear();
      await db.transactions.clear();
      await db.repair_services.clear();
      await db.audit_logs.clear();
    });
  }
}

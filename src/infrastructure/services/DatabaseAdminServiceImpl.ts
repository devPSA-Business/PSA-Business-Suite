import { IDatabaseAdminService } from '../../application/services/IDatabaseAdminService';
import { db } from '../../shared/api/db';

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
    const { collection, getDocs } = await import('firebase/firestore');
    const { firestoreDb, isConfigValid } = await import('../../shared/api/firebase');

    if (!isConfigValid) throw new Error("Fitur pemulihan Cloud tidak tersedia: Firebase API Key tidak dikonfigurasi.");

    const stockSnapshot = await getDocs(collection(firestoreDb, 'stock'));
    const transactionsSnapshot = await getDocs(collection(firestoreDb, 'transactions'));

    await db.transaction('rw', db.stock, db.transactions, async () => {
      await db.stock.clear();
      await db.transactions.clear();

      if (!stockSnapshot.empty) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.stock.bulkAdd(stockSnapshot.docs.map(doc => doc.data() as any));
      }
      if (!transactionsSnapshot.empty) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.transactions.bulkAdd(transactionsSnapshot.docs.map(doc => doc.data() as any));
      }
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

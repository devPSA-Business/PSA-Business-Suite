import { IDatabaseAdminService } from '../../application/services/IDatabaseAdminService';
import { db, StockItem, Transaction, RepairService, AuditLog } from '../../shared/api/db';
import { logger } from '../../lib/logger';

/**
 * @ai_context Implementasi layanan administrasi database lokal (Dexie).
 * @security_tier HIGH
 * @business_rule Import/Export hanya boleh dilakukan oleh ADMIN/MANAGER.
 * clearDatabase() BERBAHAYA — hanya untuk reset perangkat baru.
 */
export class DatabaseAdminServiceImpl implements IDatabaseAdminService {
  async exportDatabase(): Promise<string> {
    const [stock, transactions, repair_services, audit_logs] = await Promise.all([
      db.stock.toArray(),
      db.transactions.toArray(),
      db.repair_services.toArray(),
      db.audit_logs.toArray(),
    ]);

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: '1.4.0',
      stock,
      transactions,
      repair_services,
      audit_logs,
    });
  }

  async importDatabase(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData) as {
      stock?: StockItem[];
      transactions?: Transaction[];
      repair_services?: RepairService[];
      audit_logs?: AuditLog[];
    };

    await db.transaction('rw', db.stock, db.transactions, db.repair_services, db.audit_logs, async () => {
      await Promise.all([
        db.stock.clear(),
        db.transactions.clear(),
        db.repair_services.clear(),
        db.audit_logs.clear(),
      ]);

      const ops: Promise<unknown>[] = [];
      if (data.stock?.length) ops.push(db.stock.bulkAdd(data.stock));
      if (data.transactions?.length) ops.push(db.transactions.bulkAdd(data.transactions));
      if (data.repair_services?.length) ops.push(db.repair_services.bulkAdd(data.repair_services));
      if (data.audit_logs?.length) ops.push(db.audit_logs.bulkAdd(data.audit_logs));
      await Promise.all(ops);
    });

    logger.info('[DatabaseAdmin] Import selesai.', {
      stock: data.stock?.length ?? 0,
      transactions: data.transactions?.length ?? 0,
    });
  }

  async recoverFromCloud(): Promise<void> {
    const { collection, getDocs } = await import('firebase/firestore');
    const { firestoreDb, isConfigValid } = await import('../../shared/api/firebase');

    if (!isConfigValid) {
      throw new Error('Fitur pemulihan Cloud tidak tersedia: Firebase API Key tidak dikonfigurasi.');
    }

    const [stockSnapshot, transactionsSnapshot] = await Promise.all([
      getDocs(collection(firestoreDb, 'stock')),
      getDocs(collection(firestoreDb, 'transactions')),
    ]);

    await db.transaction('rw', db.stock, db.transactions, async () => {
      await Promise.all([db.stock.clear(), db.transactions.clear()]);

      if (!stockSnapshot.empty) {
        await db.stock.bulkAdd(stockSnapshot.docs.map(doc => doc.data() as StockItem));
      }
      if (!transactionsSnapshot.empty) {
        await db.transactions.bulkAdd(transactionsSnapshot.docs.map(doc => doc.data() as Transaction));
      }
    });

    logger.info('[DatabaseAdmin] Pemulihan cloud selesai.', {
      stock: stockSnapshot.size,
      transactions: transactionsSnapshot.size,
    });
  }

  async clearDatabase(): Promise<void> {
    logger.warn('[DatabaseAdmin] clearDatabase() dipanggil — data lokal akan dihapus!');
    await db.transaction('rw', db.stock, db.transactions, db.repair_services, db.audit_logs, async () => {
      await Promise.all([
        db.stock.clear(),
        db.transactions.clear(),
        db.repair_services.clear(),
        db.audit_logs.clear(),
      ]);
    });
  }
}

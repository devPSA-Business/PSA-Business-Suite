import { StateStorage } from 'zustand/middleware';
import { db } from '../../shared/api/db';

export const dexieSecurityStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const record = await db.keyval.get(name);
    return record ? JSON.stringify(record.value) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await db.keyval.put({ key: name, value: JSON.parse(value) });
  },
  removeItem: async (name: string): Promise<void> => {
    await db.keyval.delete(name);
  },
};

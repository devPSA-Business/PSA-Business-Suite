import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { archiveOldLogsAndEvents } from '../../../src/shared/utils/dataArchiver';
import { db } from '../../../src/shared/api/db';

describe('AutoArchiver', () => {
  beforeEach(async () => {
    // Clear relevant tables before each test
    await db.audit_logs.clear();
    await db.sync_events.clear();
    await db.gold_buyback.clear();
    await db.transactions.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should remove old audit logs and synced events > 90 days, but keep the latest audit log', async () => {
    const now = Date.now();
    const hundredDaysAgo = now - 100 * 24 * 60 * 60 * 1000;
    const eightyDaysAgo = now - 80 * 24 * 60 * 60 * 1000;

    // Add old audit logs
    await db.audit_logs.add({
      id: 'log1',
      timestamp: hundredDaysAgo,
      action: 'LOGIN',
      user: 'Admin',
      details: 'Old log 1',
      hash: 'hash1',
      previousHash: '0'
    });
    
    await db.audit_logs.add({
      id: 'log2',
      timestamp: hundredDaysAgo + 1000,
      action: 'LOGIN',
      user: 'Admin',
      details: 'Old log 2',
      hash: 'hash2',
      previousHash: 'hash1'
    });

    // Add a new audit log
    await db.audit_logs.add({
      id: 'log3',
      timestamp: eightyDaysAgo,
      action: 'LOGIN',
      user: 'Admin',
      details: 'Newer log 3',
      hash: 'hash3',
      previousHash: 'hash2'
    });

    // Add old sync events (SYNCED vs PENDING)
    await db.sync_events.add({
      // @ts-ignore
      id: 1,
      entity_type: 'transactions',
      action: 'INSERT',
      payload: {},
      status: 'SYNCED',
      timestamp: hundredDaysAgo
    });

    await db.sync_events.add({
      // @ts-ignore
      id: 2,
      entity_type: 'transactions',
      action: 'INSERT',
      payload: {},
      status: 'PENDING',
      timestamp: hundredDaysAgo
    });

    // Action
    const result = await archiveOldLogsAndEvents();

    // Verify Audit Logs
    const remainingLogs = await db.audit_logs.toArray();
    // log1 and log2 should be deleted because they are > 90 days
    // log3 should be kept because it is < 90 days
    // A new LOCAL_PRUNE log should be added
    expect(remainingLogs.some(log => log.id === 'log1')).toBe(false);
    expect(remainingLogs.some(log => log.id === 'log2')).toBe(false);
    expect(remainingLogs.some(log => log.id === 'log3')).toBe(true);
    expect(remainingLogs.some(log => log.action === 'LOCAL_PRUNE')).toBe(true);

    // Verify Sync Events
    const remainingEvents = await db.sync_events.toArray();
    // Old SYNCED event should be deleted
    // Old PENDING event should be kept
    expect(remainingEvents.some(event => event.id === 1)).toBe(false);
    expect(remainingEvents.some(event => event.id === 2)).toBe(true);
  });

  it('should not delete other domain data like gold_buyback or transactions', async () => {
    const hundredDaysAgo = Date.now() - 100 * 24 * 60 * 60 * 1000;

    await db.gold_buyback.add({
      id: 'gb1',
      date: hundredDaysAgo,
      customerName: 'Test',
      weightGram: 10,
      kadar: 0.75,
      pricePerGram: 1000000,
      margin: 0.1,
      buybackPrice: 9000000,
      paymentMethod: 'CASH',
      cashSource: 'gold_cash',
      status: 'stored',
      user: 'Admin'
    });

    await db.transactions.add({
      id: 'tx1',
      date: hundredDaysAgo,
      total: 10000,
      paymentMethod: 'CASH',
      items: [],
      status: 'SUCCESS',
      user: 'Admin'
    });

    await archiveOldLogsAndEvents();

    const buybacks = await db.gold_buyback.toArray();
    const transactions = await db.transactions.toArray();

    expect(buybacks.length).toBe(1);
    expect(transactions.length).toBe(1);
  });

  it('should keep the last audit log of the chain even if it is older than threshold', async () => {
    const hundredDaysAgo = Date.now() - 100 * 24 * 60 * 60 * 1000;

    await db.audit_logs.add({
      id: 'log_only_one',
      timestamp: hundredDaysAgo,
      action: 'LOGIN',
      user: 'Admin',
      details: 'Old lonely log',
      hash: 'hash_test',
      previousHash: '0'
    });

    await archiveOldLogsAndEvents();

    const remainingLogs = await db.audit_logs.toArray();
    // It should keep the log to preserve the chain, plus add LOCAL_PRUNE
    expect(remainingLogs.some(l => l.id === 'log_only_one')).toBe(true);
  });
});

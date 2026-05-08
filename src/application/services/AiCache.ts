import { db } from '../../shared/api/db';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export const aiCacheService = {
  async getResponse(queryHash: string): Promise<string | null> {
    const cached = await db.ai_cache.get(queryHash);
    if (cached) {
      if (Date.now() > cached.expiresAt) {
        await db.ai_cache.delete(queryHash);
        return null;
      }
      return cached.response;
    }
    return null;
  },

  async setResponse(queryHash: string, response: string): Promise<void> {
    const now = Date.now();
    await db.ai_cache.put({
      queryHash,
      response,
      createdAt: now,
      expiresAt: now + CACHE_TTL_MS
    });
  },

  async logAccess(
    queryHash: string,
    responseHash: string,
    aggregatesUsed: number,
    userId: string,
    action: 'NLQ_QUERY' | 'NLQ_VIEW_RAW' = 'NLQ_QUERY'
  ) {
    await db.ai_access_logs.put({
      id: crypto.randomUUID(),
      queryHash,
      responseHash,
      aggregatesUsed,
      timestamp: Date.now(),
      userId,
      action
    });
  }
};

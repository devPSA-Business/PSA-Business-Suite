import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { metrics } from '../../../src/lib/metrics';
import { logger } from '../../../src/lib/logger';

describe('Metrics Helper', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    vi.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response()));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should emit increment metric and log it', () => {
    metrics.increment('test_counter', { label1: 'value1' });
    
    expect(logger.info).toHaveBeenCalledWith('Metric emitted', expect.objectContaining({
      metric: expect.objectContaining({
        type: 'counter',
        name: 'test_counter',
        value: 1,
        labels: { env: 'production', service: 'frontend', label1: 'value1' }
      })
    }));
  });

  it('should emit gauge metric and log it', () => {
    metrics.gauge('test_gauge', 42, { label2: 'value2' });
    
    expect(logger.info).toHaveBeenCalledWith('Metric emitted', expect.objectContaining({
      metric: expect.objectContaining({
        type: 'gauge',
        name: 'test_gauge',
        value: 42,
        labels: { env: 'production', service: 'frontend', label2: 'value2' }
      })
    }));
  });
});

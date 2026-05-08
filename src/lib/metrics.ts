import { logger } from './logger';

class MetricsEmitter {
  private endpoint: string | undefined;
  private defaultLabels: Record<string, string>;

  constructor() {
    // In a real app, this would be injected or read from env
    this.endpoint = import.meta.env?.VITE_METRICS_ENDPOINT;
    this.defaultLabels = {
      env: import.meta.env?.VITE_APP_ENV || 'production',
      service: 'frontend'
    };
  }

  increment(name: string, labels?: Record<string, string>) {
    const metric = { 
      type: 'counter', 
      name, 
      value: 1, 
      labels: { ...this.defaultLabels, ...labels }, 
      timestamp: Date.now() 
    };
    this.emit(metric);
  }

  gauge(name: string, value: number, labels?: Record<string, string>) {
    const metric = { 
      type: 'gauge', 
      name, 
      value, 
      labels: { ...this.defaultLabels, ...labels }, 
      timestamp: Date.now() 
    };
    this.emit(metric);
  }

  histogram(name: string, valueMs: number, labels?: Record<string, string>) {
    const metric = { 
      type: 'histogram', 
      name, 
      value: valueMs, 
      labels: { ...this.defaultLabels, ...labels }, 
      timestamp: Date.now(),
      unit: 'milliseconds'
    };
    this.emit(metric);
  }

  // Utility to easily measure async function durations
  async measure<T>(name: string, operation: () => Promise<T>, labels?: Record<string, string>): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      this.histogram(`${name}_duration_ms`, duration, { ...labels, status: 'success' });
      this.increment(`${name}_success_total`, labels);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.histogram(`${name}_duration_ms`, duration, { ...labels, status: 'error' });
      this.increment(`${name}_errors_total`, { ...labels, errorType: error instanceof Error ? error.name : 'unknown' });
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit(metric: any) {
    // Log to console for PoC (we filter noisy metrics in development if needed)
    if (import.meta.env?.DEV && metric.type !== 'histogram') {
      logger.info('Metric emitted', { metric });
    }

    // Optionally push to HTTP endpoint
    if (this.endpoint) {
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      }).catch(_err => {
        // Silent catch to prevent cascade failures on telemetry fail
      });
    }
  }
}

export const metrics = new MetricsEmitter();

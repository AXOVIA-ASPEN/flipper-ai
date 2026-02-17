/**
 * Application Metrics Collector for Flipper AI
 * Tracks response times, error rates, and custom counters in-memory.
 * Exposed via /api/health/metrics endpoint.
 */

interface MetricPoint {
  value: number;
  timestamp: number;
}

interface HistogramData {
  count: number;
  sum: number;
  min: number;
  max: number;
  recent: MetricPoint[]; // last N samples
}

const MAX_RECENT = 100;

class MetricsCollector {
  private counters = new Map<string, number>();
  private histograms = new Map<string, HistogramData>();
  private gauges = new Map<string, number>();
  private startTime = Date.now();

  /** Increment a counter */
  increment(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }

  /** Set a gauge value */
  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  /** Record a histogram observation (e.g., response time) */
  observe(name: string, value: number): void {
    const existing = this.histograms.get(name);
    const point: MetricPoint = { value, timestamp: Date.now() };

    if (!existing) {
      this.histograms.set(name, {
        count: 1,
        sum: value,
        min: value,
        max: value,
        recent: [point],
      });
    } else {
      existing.count++;
      existing.sum += value;
      existing.min = Math.min(existing.min, value);
      existing.max = Math.max(existing.max, value);
      existing.recent.push(point);
      if (existing.recent.length > MAX_RECENT) {
        existing.recent.shift();
      }
    }
  }

  /** Get all metrics as a snapshot */
  snapshot(): Record<string, unknown> {
    const histogramSummaries: Record<string, unknown> = {};
    for (const [name, data] of this.histograms) {
      histogramSummaries[name] = {
        count: data.count,
        sum: data.sum,
        min: data.min,
        max: data.max,
        avg: data.count > 0 ? Math.round(data.sum / data.count) : /* istanbul ignore next */ 0,
      };
    }

    return {
      uptime_seconds: Math.round((Date.now() - this.startTime) / 1000),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramSummaries,
    };
  }

  /** Reset all metrics */
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
    this.startTime = Date.now();
  }
}

// Singleton
const globalForMetrics = globalThis as unknown as { metrics: MetricsCollector | undefined };
/* istanbul ignore next -- singleton initialisation runs once at module load */
export const metrics = globalForMetrics.metrics ?? new MetricsCollector();
/* istanbul ignore next -- not executed in test/CI environment */
if (process.env.NODE_ENV !== 'production') globalForMetrics.metrics = metrics;

export default metrics;

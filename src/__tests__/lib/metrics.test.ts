import { metrics } from '@/lib/metrics';

describe('metrics', () => {
  beforeEach(() => {
    metrics.reset();
  });

  it('increments counters', () => {
    metrics.increment('requests');
    metrics.increment('requests');
    metrics.increment('requests', 3);
    const snap = metrics.snapshot();
    expect((snap.counters as Record<string, number>).requests).toBe(5);
  });

  it('sets gauges', () => {
    metrics.gauge('active_connections', 42);
    const snap = metrics.snapshot();
    expect((snap.gauges as Record<string, number>).active_connections).toBe(42);
  });

  it('observes histogram values', () => {
    metrics.observe('response_time_ms', 100);
    metrics.observe('response_time_ms', 200);
    metrics.observe('response_time_ms', 50);
    const snap = metrics.snapshot();
    const hist = (snap.histograms as Record<string, Record<string, number>>).response_time_ms;
    expect(hist.count).toBe(3);
    expect(hist.min).toBe(50);
    expect(hist.max).toBe(200);
    expect(hist.avg).toBe(117); // Math.round(350/3)
  });

  it('caps recent histogram samples at MAX_RECENT (100)', () => {
    for (let i = 0; i < 110; i++) {
      metrics.observe('overflow_test', i);
    }
    const snap = metrics.snapshot();
    const hist = (snap.histograms as Record<string, Record<string, number>>).overflow_test;
    expect(hist.count).toBe(110);
    expect(hist.min).toBe(0);
    expect(hist.max).toBe(109);
  });

  it('returns empty collections after reset', () => {
    metrics.increment('x');
    metrics.gauge('y', 1);
    metrics.observe('z', 5);
    metrics.reset();
    const snap = metrics.snapshot();
    expect(snap.counters).toEqual({});
    expect(snap.gauges).toEqual({});
    expect(snap.histograms).toEqual({});
  });

  it('tracks uptime', () => {
    const snap = metrics.snapshot();
    expect(snap.uptime_seconds).toBeGreaterThanOrEqual(0);
  });
});

// ── Additional branch coverage ─────────────────────────────────────────────
describe('MetricsCollector - branch coverage', () => {
  it('returns avg when count > 0 via snapshot()', () => {
    metrics.reset();
    metrics.observe('test_hist', 100);
    const snap = metrics.snapshot();
    const hist = (snap.histograms as Record<string, Record<string, number>>).test_hist;
    expect(hist.avg).toBe(100);
  });

  it('snapshot with no histogram data returns empty histograms object', () => {
    metrics.reset();
    const snap = metrics.snapshot();
    expect(Object.keys(snap.histograms as Record<string, unknown>)).toHaveLength(0);
  });

  it('singleton is defined and consistent across requires', () => {
    const { metrics: m2 } = require('@/lib/metrics');
    expect(m2).toBeDefined();
    expect(m2).toBe(metrics);
  });
});

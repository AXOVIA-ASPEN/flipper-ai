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

  it('tracks uptime', () => {
    const snap = metrics.snapshot();
    expect(snap.uptime_seconds).toBeGreaterThanOrEqual(0);
  });
});

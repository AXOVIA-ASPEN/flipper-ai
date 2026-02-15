import { GET } from '@/app/api/health/metrics/route';

jest.mock('@/lib/metrics', () => ({
  metrics: {
    snapshot: jest.fn().mockReturnValue({
      counters: { requests: 42 },
      histograms: {},
    }),
  },
}));

jest.mock('@/lib/error-tracker', () => ({
  getRecentErrors: jest.fn().mockReturnValue([
    {
      message: 'Test error',
      context: { route: '/api/test' },
      timestamp: '2026-02-15T00:00:00Z',
    },
  ]),
}));

describe('GET /api/health/metrics', () => {
  it('returns metrics snapshot with memory info', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.counters).toBeDefined();
    expect(data.recent_errors).toHaveLength(1);
    expect(data.recent_errors[0].message).toBe('Test error');
    expect(data.memory).toBeDefined();
    expect(data.memory.heapUsedMB).toBeGreaterThan(0);
    expect(data.memory.rssMB).toBeGreaterThan(0);
  });
});

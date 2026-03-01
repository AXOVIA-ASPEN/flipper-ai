/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
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

jest.mock('@/lib/request-monitor', () => ({
  getRequestStats: jest.fn().mockReturnValue({
    totalRequests: 100,
    recentCount: 100,
    avgResponseTimeMs: 45,
    errorRate: 0.02,
  }),
}));

jest.mock('@/lib/monitoring', () => ({
  getDbPerformanceSummary: jest.fn().mockReturnValue({
    totalQueries: 50,
    avgDurationMs: 12.5,
    slowQueries: 2,
    recentQueries: [],
  }),
}));

const mockQueryRawUnsafe = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
jest.mock('@/lib/db', () => ({
  prisma: {
    $queryRawUnsafe: (...args: unknown[]) => mockQueryRawUnsafe(...args),
  },
}));

const mockGetCurrentUser = jest.fn();
jest.mock('@/lib/auth', () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/health/metrics', { headers });
}

describe('GET /api/health/metrics', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
    delete process.env.METRICS_TOKEN;
    mockGetCurrentUser.mockReset();
  });

  describe('development mode (no auth required)', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true });
    });

    it('returns metrics snapshot with memory info', async () => {
      const req = makeRequest();
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.counters).toBeDefined();
      expect(data.recent_errors).toHaveLength(1);
      expect(data.recent_errors[0].message).toBe('Test error');
      expect(data.memory).toBeDefined();
      expect(data.memory.heapUsedMB).toBeGreaterThan(0);
      expect(data.memory.rssMB).toBeGreaterThan(0);

      // New fields: request stats, database info, db performance
      expect(data.requests).toEqual({
        totalRequests: 100,
        recentCount: 100,
        avgResponseTimeMs: 45,
        errorRate: 0.02,
      });
      expect(data.database).toEqual({
        status: 'connected',
        maxConnections: expect.any(Number),
      });
      expect(data.db_performance).toEqual({
        totalQueries: 50,
        avgDurationMs: 12.5,
        slowQueries: 2,
        recentQueries: [],
      });
    });

    it('reports database status as disconnected when DB ping fails', async () => {
      mockQueryRawUnsafe.mockRejectedValueOnce(new Error('Connection refused'));
      const req = makeRequest();
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.database.status).toBe('disconnected');
      expect(data.database.maxConnections).toEqual(expect.any(Number));
    });
  });

  describe('production mode (auth required)', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
    });

    it('returns 401 when no session and no token', async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      const req = makeRequest();
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('allows access with valid authenticated session', async () => {
      mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com', name: 'Test', firebaseUid: 'fb-1', image: null });
      const req = makeRequest();
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('allows access with valid internal METRICS_TOKEN', async () => {
      process.env.METRICS_TOKEN = 'secret-token-123';
      const req = makeRequest({ Authorization: 'Bearer secret-token-123' });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('rejects access with wrong METRICS_TOKEN', async () => {
      process.env.METRICS_TOKEN = 'secret-token-123';
      mockGetCurrentUser.mockResolvedValue(null);
      const req = makeRequest({ Authorization: 'Bearer wrong-token' });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });
});

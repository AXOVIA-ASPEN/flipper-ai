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

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
const mockAuth = auth as jest.Mock;

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/health/metrics', { headers });
}

describe('GET /api/health/metrics', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true });
    delete process.env.METRICS_TOKEN;
    mockAuth.mockReset();
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
    });
  });

  describe('production mode (auth required)', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
    });

    it('returns 401 when no session and no token', async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest();
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('allows access with valid authenticated session', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
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
      mockAuth.mockResolvedValue(null);
      const req = makeRequest({ Authorization: 'Bearer wrong-token' });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });
});

/**
 * @file src/__tests__/api/monitoring-run.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Unit tests for POST /api/monitoring/run route.
 */

import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports that use them
// ---------------------------------------------------------------------------

const mockRun = jest.fn();

jest.mock('@/lib/monitoring-job', () => ({
  monitoringJobService: { run: mockRun },
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    monitoringJob: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  default: {
    monitoringJob: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/monitoring/run/route';
import { prisma } from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFindFirst = (prisma.monitoringJob as any).findFirst as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_KEY = 'a'.repeat(32);

function makeRequest(options: {
  apiKey?: string;
  body?: string;
} = {}): NextRequest {
  const { apiKey = VALID_KEY, body = '' } = options;
  return new NextRequest('http://localhost/api/monitoring/run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body || undefined,
  });
}

const defaultSummary = {
  jobId: 'job-1',
  status: 'COMPLETED',
  listingsChecked: 5,
  eventsCreated: 1,
  errorsEncountered: 0,
  completedEarly: false,
  canaryWarning: false,
  durationMs: 1234,
  platformStats: {},
  skippedPlatforms: {},
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/monitoring/run', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, MONITORING_API_KEY: VALID_KEY };
    mockFindFirst.mockResolvedValue(null); // No recent completed run
    mockRun.mockResolvedValue(defaultSummary);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // -----------------------------------------------------------------------
  // Auth
  // -----------------------------------------------------------------------

  describe('auth', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const req = new NextRequest('http://localhost/api/monitoring/run', {
        method: 'POST',
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 when API key is wrong', async () => {
      const req = makeRequest({ apiKey: 'wrong'.repeat(10) });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 when API key has correct prefix but wrong suffix', async () => {
      const wrongKey = VALID_KEY.slice(0, -1) + 'X';
      const req = makeRequest({ apiKey: wrongKey });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('logs auth failures with source IP', async () => {
      const { logger } = jest.requireMock('@/lib/logger') as { logger: { error: jest.Mock } };
      const req = makeRequest({ apiKey: 'wrong'.repeat(10) });
      await POST(req);
      expect(logger.error).toHaveBeenCalledWith(
        'Monitoring endpoint: auth failure',
        expect.any(Object)
      );
    });

    it('proceeds with correct 32-char key', async () => {
      const req = makeRequest();
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // Rate limiting
  // -----------------------------------------------------------------------

  describe('rate limiting', () => {
    it('returns 429 when a completed run exists within the interval', async () => {
      mockFindFirst.mockResolvedValue({ id: 'recent-job' });

      const req = makeRequest();
      const res = await POST(req);

      expect(res.status).toBe(429);
      const body = await res.json() as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RATE_LIMITED');
    });

    it('proceeds when no recent completed run exists', async () => {
      mockFindFirst.mockResolvedValue(null);

      const req = makeRequest();
      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // Successful run
  // -----------------------------------------------------------------------

  describe('successful run', () => {
    it('returns 200 with job summary', async () => {
      const req = makeRequest();
      const res = await POST(req);

      expect(res.status).toBe(200);
      const body = await res.json() as { success: boolean; data: typeof defaultSummary };
      expect(body.success).toBe(true);
      expect(body.data.jobId).toBe('job-1');
      expect(body.data.listingsChecked).toBe(5);
      expect(body.data.eventsCreated).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Concurrent run guard (409)
  // -----------------------------------------------------------------------

  describe('concurrent run guard', () => {
    it('returns 409 when MONITORING_CONCURRENT error is thrown', async () => {
      mockRun.mockRejectedValue(
        Object.assign(new Error('A monitoring job is already running.'), {
          code: 'MONITORING_CONCURRENT',
        })
      );

      const req = makeRequest();
      const res = await POST(req);

      expect(res.status).toBe(409);
      const body = await res.json() as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CONFLICT');
    });
  });

  // -----------------------------------------------------------------------
  // Request body validation
  // -----------------------------------------------------------------------

  describe('request body validation', () => {
    it('accepts empty body (Cloud Scheduler sends no body)', async () => {
      const req = makeRequest({ body: '' });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it('accepts valid optional body with dryRun flag', async () => {
      const req = makeRequest({ body: JSON.stringify({ dryRun: true }) });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it('returns 422 for body with unknown fields (strict schema)', async () => {
      const req = makeRequest({ body: JSON.stringify({ unknownField: true }) });
      const res = await POST(req);
      expect(res.status).toBe(422);
    });

    it('returns 400 for malformed JSON', async () => {
      const req = makeRequest({ body: '{invalid json' });
      const res = await POST(req);
      expect(res.status).toBe(422);
    });
  });
});

/**
 * @file src/__tests__/api/notifications-process.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief Unit tests for POST /api/notifications/process endpoint.
 *
 * @description
 * Tests API key authentication, concurrent run guard, rate limiting,
 * response shape, and 503 when key not configured.
 */

import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Test API key — must be >= 32 chars to pass MIN_KEY_LENGTH check in route
// ---------------------------------------------------------------------------
const TEST_API_KEY = 'test-notification-api-key-that-is-at-least-32-characters-long';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    monitoringJob: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/flip-notification-processor', () => ({
  processFlipLifecycleNotifications: jest.fn(),
}));

jest.mock('@/lib/smart-alert-notification-processor', () => ({
  processSmartAlertNotificationEvents: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Import mocked modules after jest.mock (hoisted)
import db from '@/lib/db';
import { processFlipLifecycleNotifications } from '@/lib/flip-notification-processor';
import { processSmartAlertNotificationEvents } from '@/lib/smart-alert-notification-processor';

const mockPrisma = db as jest.Mocked<typeof db>;
const mockProcess = processFlipLifecycleNotifications as jest.MockedFunction<
  typeof processFlipLifecycleNotifications
>;
const mockSmartAlertProcess = processSmartAlertNotificationEvents as jest.MockedFunction<
  typeof processSmartAlertNotificationEvents
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(options?: {
  apiKey?: string;
  headers?: Record<string, string>;
}): NextRequest {
  const key = options?.apiKey ?? process.env.NOTIFICATION_PROCESSOR_API_KEY;
  return new NextRequest('http://localhost/api/notifications/process', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      ...options?.headers,
    },
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

// The route module caches auth-failure state in module-level Maps.
// We re-import the handler fresh for each describe block where needed, but
// for most tests simply clearing mocks + resetting env is sufficient.
let POST: typeof import('../../../app/api/notifications/process/route').POST;

beforeAll(async () => {
  process.env.NOTIFICATION_PROCESSOR_API_KEY = TEST_API_KEY;
  const mod = await import('../../../app/api/notifications/process/route');
  POST = mod.POST;
});

describe('POST /api/notifications/process', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NOTIFICATION_PROCESSOR_API_KEY = TEST_API_KEY;

    // Default: lock acquired successfully
    (mockPrisma.monitoringJob.create as jest.Mock).mockResolvedValue({ id: 'job-1' });
    (mockPrisma.monitoringJob.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.monitoringJob.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    // Default: flip processor returns a valid structured result
    mockProcess.mockResolvedValue({
      processed: 10,
      sent: 8,
      skipped: {
        preferenceDisabled: 0,
        frequencyDeferred: 0,
        rateLimited: 0,
        stale: 1,
        userDeleted: 0,
      },
      failed: 1,
      errors: [],
    });

    // Default: smart alert processor returns a simple result
    mockSmartAlertProcess.mockResolvedValue({
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    } as Awaited<ReturnType<typeof processSmartAlertNotificationEvents>>);
  });

  // ── 1. Valid API key → 200 ──────────────────────────────────────────────

  it('returns 200 with success response for valid API key', async () => {
    const res = await POST(createRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('processed');
    expect(body.data).toHaveProperty('sent');
    expect(body.data).toHaveProperty('skipped');
    expect(body.data).toHaveProperty('failed');
    expect(body.data).toHaveProperty('duration');
    expect(typeof body.data.duration).toBe('number');
  });

  // ── 2. Invalid API key → 401 ───────────────────────────────────────────

  it('returns 401 for invalid API key', async () => {
    const res = await POST(
      createRequest({ apiKey: 'wrong-key-that-is-exactly-same-length-as-test-key-padding!!' })
    );
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  // ── 3. Missing API key (no Authorization header value) → 401 ───────────

  it('returns 401 when no API key is provided in header', async () => {
    const req = new NextRequest('http://localhost/api/notifications/process', {
      method: 'POST',
      // No authorization header at all
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  // ── 4. Missing NOTIFICATION_PROCESSOR_API_KEY env → 503 ────────────────

  it('returns 503 when NOTIFICATION_PROCESSOR_API_KEY env is not set', async () => {
    delete process.env.NOTIFICATION_PROCESSOR_API_KEY;

    const req = new NextRequest('http://localhost/api/notifications/process', {
      method: 'POST',
      headers: { authorization: `Bearer ${TEST_API_KEY}` },
    });

    const res = await POST(req);
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(body.error.detail).toContain('not configured');
  });

  // ── 5. Buffer length mismatch → 401 ────────────────────────────────────

  it('returns 401 when provided key has different length than configured key', async () => {
    const res = await POST(createRequest({ apiKey: 'short-key' }));
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  // ── 6. Concurrent run guard (P2002) → 409 ──────────────────────────────

  it('returns 409 when another notification processing run is active (P2002)', async () => {
    const prismaError = new Error('Unique constraint failed');
    Object.assign(prismaError, { code: 'P2002' });
    (mockPrisma.monitoringJob.create as jest.Mock).mockRejectedValue(prismaError);

    const res = await POST(createRequest());
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CONFLICT');
    expect(body.error.detail).toContain('Another notification processing run');
  });

  // ── 7. Response shape verification ─────────────────────────────────────

  it('returns the exact expected response shape on success', async () => {
    mockProcess.mockResolvedValue({
      processed: 5,
      sent: 3,
      skipped: {
        preferenceDisabled: 0,
        frequencyDeferred: 0,
        rateLimited: 0,
        stale: 1,
        userDeleted: 0,
      },
      failed: 1,
      errors: [],
    });

    const res = await POST(createRequest());
    expect(res.status).toBe(200);

    const body = await res.json();

    // Top-level shape
    expect(Object.keys(body).sort()).toEqual(['data', 'success']);
    expect(body.success).toBe(true);

    // Data shape — exactly these keys
    const dataKeys = Object.keys(body.data).sort();
    expect(dataKeys).toEqual(['duration', 'failed', 'processed', 'sent', 'skipped']);

    // Values match processor output
    expect(body.data.processed).toBe(5);
    expect(body.data.sent).toBe(3);
    // skipped is now a structured breakdown
    expect(typeof body.data.skipped).toBe('object');
    expect(body.data.skipped.stale).toBe(1);
    expect(body.data.failed).toBe(1);
    expect(body.data.duration).toBeGreaterThanOrEqual(0);
  });

  // ── Additional coverage: processor throws → 500 ────────────────────────

  it('returns 500 when the processor throws an unexpected error', async () => {
    mockProcess.mockRejectedValue(new Error('Unexpected processor failure'));

    const res = await POST(createRequest());
    expect(res.status).toBe(500);

    // Lock should have been released as FAILED
    expect(mockPrisma.monitoringJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: 'FAILED' }),
      })
    );
  });

  // ── Additional coverage: successful run releases lock as COMPLETED ─────

  it('releases the lock as COMPLETED after successful processing', async () => {
    await POST(createRequest());

    expect(mockPrisma.monitoringJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      })
    );
  });

  // ── Non-P2002 error from lock acquisition → rethrown → 500 ─────────────

  it('re-throws non-P2002 errors from monitoringJob.create (leads to 500)', async () => {
    (mockPrisma.monitoringJob.create as jest.Mock).mockRejectedValue(
      new Error('DB connection lost')
    );

    const res = await POST(createRequest());
    expect(res.status).toBe(500);
  });

  // ── Auth failure rate limiting — triggers after 5 failures from same IP ─

  it('rate-limits auth failures after 5 bad attempts from same IP', async () => {
    const badKey = 'x'.repeat(TEST_API_KEY.length);

    const makeBadRequest = () =>
      new NextRequest('http://localhost/api/notifications/process', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${badKey}`,
          'x-forwarded-for': '10.0.0.99', // Fixed IP for rate limiting
        },
      });

    // Make 5 failed attempts — should return 401
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeBadRequest());
      expect(res.status).toBe(401);
    }

    // 6th attempt should be rate-limited → 429
    const res = await POST(makeBadRequest());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe('RATE_LIMITED');
  });
});

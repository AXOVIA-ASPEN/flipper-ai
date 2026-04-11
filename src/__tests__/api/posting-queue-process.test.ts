/**
 * file: src/__tests__/api/posting-queue-process.test.ts
 * author: Stephen Boyett
 * company: Axovia AI
 * date: 2026-03-31
 * version: 1.0
 * brief: Tests for POST /api/posting-queue/process.
 *
 * description:
 *     Covers auth (401), feature gating (403), rate limiting (429), stub
 *     registration invocation, empty-queue response, and the ProcessResult
 *     breakdown returned from processQueue().
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    postingQueueItem: { findFirst: jest.fn() },
  },
}));

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('@/lib/tier-enforcement', () => ({
  checkFeatureAccess: jest.fn(),
}));

jest.mock('@/lib/posting-queue-processor', () => ({
  processQueue: jest.fn(),
}));

jest.mock('@/lib/platform-posters', () => ({
  ensurePostersRegistered: jest.fn(),
}));

import { POST } from '@/app/api/posting-queue/process/route';
import db from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { checkFeatureAccess } from '@/lib/tier-enforcement';
import { processQueue } from '@/lib/posting-queue-processor';
import { ensurePostersRegistered } from '@/lib/platform-posters';

const mockPrisma = db as jest.Mocked<typeof db>;

describe('POST /api/posting-queue/process', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue(null);

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when feature gate denies access', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'FREE',
    });
    (checkFeatureAccess as jest.Mock).mockReturnValue({
      allowed: false,
      reason: 'eBay Cross-listing is not available on the Free plan.',
    });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(processQueue).not.toHaveBeenCalled();
    expect(ensurePostersRegistered).not.toHaveBeenCalled();
  });

  it('returns 429 when a queue item was touched within the rate-limit window', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'PRO',
    });
    (checkFeatureAccess as jest.Mock).mockReturnValue({ allowed: true });
    (mockPrisma.postingQueueItem.findFirst as jest.Mock).mockResolvedValue({
      updatedAt: new Date(Date.now() - 10_000), // 10s ago → rate-limited
    });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(processQueue).not.toHaveBeenCalled();
  });

  it('processes queue when no recent activity and returns ProcessResult', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'PRO',
    });
    (checkFeatureAccess as jest.Mock).mockReturnValue({ allowed: true });
    (mockPrisma.postingQueueItem.findFirst as jest.Mock).mockResolvedValue(null);
    (processQueue as jest.Mock).mockResolvedValue({
      processed: 3,
      posted: 2,
      failed: 1,
    });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ processed: 3, posted: 2, failed: 1 });
    expect(ensurePostersRegistered).toHaveBeenCalledTimes(1);
    expect(processQueue).toHaveBeenCalledWith('user-1');
  });

  it('processes queue when last item activity is outside the rate-limit window', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'PRO',
    });
    (checkFeatureAccess as jest.Mock).mockReturnValue({ allowed: true });
    (mockPrisma.postingQueueItem.findFirst as jest.Mock).mockResolvedValue({
      updatedAt: new Date(Date.now() - 120_000), // 2 min ago
    });
    (processQueue as jest.Mock).mockResolvedValue({
      processed: 0,
      posted: 0,
      failed: 0,
    });

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ processed: 0, posted: 0, failed: 0 });
  });

  it('returns 500 on unexpected error', async () => {
    (getAuthUserId as jest.Mock).mockRejectedValue(new Error('db down'));

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  // Branch coverage: exercise the `user?.subscriptionTier` optional chain
  // when the user row is missing (soft-deleted or race with account delete).
  it('treats a missing user row as tier=undefined and defers to the feature gate', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (checkFeatureAccess as jest.Mock).mockReturnValue({
      allowed: false,
      reason: 'Unknown tier',
    });

    const res = await POST();
    const body = await res.json();

    expect(checkFeatureAccess).toHaveBeenCalledWith(undefined, 'ebayCrossListing');
    expect(res.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });
});

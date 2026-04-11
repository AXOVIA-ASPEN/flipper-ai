/**
 * file: src/__tests__/api/user-tier.test.ts
 * author: Stephen Boyett
 * company: Axovia AI
 * date: 2026-03-31
 * version: 1.0
 * brief: Tests for GET /api/user/tier.
 */

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(),
}));

import { GET } from '@/app/api/user/tier/route';
import db from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

const mockPrisma = db as jest.Mocked<typeof db>;

describe('GET /api/user/tier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns the tier for the authenticated user', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      subscriptionTier: 'PRO',
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: { tier: 'PRO' } });
  });

  it('defaults to FREE when user row is missing', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-1');
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.tier).toBe('FREE');
  });

  it('returns 500 on unexpected error', async () => {
    (getAuthUserId as jest.Mock).mockRejectedValue(new Error('db down'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

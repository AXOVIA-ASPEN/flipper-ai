/**
 * @file src/__tests__/api/usage.test.ts
 * @author Stephen Boyett
 * @company Silverline Software
 * @date 2026-03-08
 * @version 1.0
 * @brief Unit tests for the GET /api/usage endpoint.
 *
 * @description
 * Tests the usage API route for authenticated and unauthenticated access,
 * correct response shape, tier-based formatting, and error handling.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/usage/route';

const mockUserFindUnique = jest.fn();
const mockUsageRecordFindMany = jest.fn();
const mockScraperJobCount = jest.fn();

function makeRequest() {
  return new NextRequest('http://localhost:3000/api/usage', { method: 'GET' });
}

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    usageRecord: {
      findMany: (...args: unknown[]) => mockUsageRecordFindMany(...args),
    },
    scraperJob: {
      count: (...args: unknown[]) => mockScraperJobCount(...args),
    },
  },
}));

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn().mockResolvedValue(null),
}));

import { getAuthUserId } from '@/lib/auth-middleware';

describe('GET /api/usage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthUserId as jest.Mock).mockResolvedValue(null);
    mockScraperJobCount.mockResolvedValue(0);
  });

  it('returns 401 when not authenticated', async () => {
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns usage data for authenticated FREE user', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'FREE' });
    mockUsageRecordFindMany.mockResolvedValue([
      { type: 'SCAN', count: 3 },
      { type: 'ANALYSIS', count: 1 },
    ]);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.scans.usedThisMonth).toBe(3);
    expect(data.data.scans.usedToday).toBe(0);
    expect(data.data.scans.limitPerDay).toBe(10);
    expect(data.data.analyses.usedThisMonth).toBe(1);
    expect(data.data.analyses.limit).toBeNull();
    expect(data.data.tier).toBe('FREE');
    expect(data.data.periodStart).toBeDefined();
    expect(data.data.periodEnd).toBeDefined();
  });

  it('returns usage data for FLIPPER user with null scan limit', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-456');
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'FLIPPER' });
    mockUsageRecordFindMany.mockResolvedValue([
      { type: 'SCAN', count: 25 },
    ]);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.scans.usedThisMonth).toBe(25);
    expect(data.data.scans.limitPerDay).toBeNull();
    expect(data.data.tier).toBe('FLIPPER');
  });

  it('defaults to FREE tier when user not found', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-unknown');
    mockUserFindUnique.mockResolvedValue(null);
    mockUsageRecordFindMany.mockResolvedValue([]);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.tier).toBe('FREE');
    expect(data.data.scans.limitPerDay).toBe(10);
  });

  it('returns zeros when no usage records exist', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'FREE' });
    mockUsageRecordFindMany.mockResolvedValue([]);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.scans.usedThisMonth).toBe(0);
    expect(data.data.analyses.usedThisMonth).toBe(0);
  });

  it('returns 500 on database error', async () => {
    (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
    mockUserFindUnique.mockRejectedValue(new Error('Database error'));

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });
});

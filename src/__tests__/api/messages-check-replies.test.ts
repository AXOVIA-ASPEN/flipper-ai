/**
 * @file src/__tests__/api/messages-check-replies.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Unit tests for POST /api/messages/check-replies route.
 *
 * @description
 * Tests authentication, tier enforcement, request validation,
 * listing ownership, and successful check-replies execution.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/messages/check-replies/route';

// Mock auth
const mockGetAuthUserId = jest.fn();
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: (...args: unknown[]) => mockGetAuthUserId(...args),
}));

// Mock prisma
const mockUserFindUnique = jest.fn();
const mockListingFindFirst = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    listing: {
      findFirst: (...args: unknown[]) => mockListingFindFirst(...args),
    },
  },
}));

// Mock tier enforcement
const mockCheckFeatureAccess = jest.fn();
jest.mock('@/lib/tier-enforcement', () => ({
  checkFeatureAccess: (...args: unknown[]) => mockCheckFeatureAccess(...args),
}));

// Mock inbound message checker
const mockCheckForReplies = jest.fn();
jest.mock('@/lib/inbound-message-checker', () => ({
  checkForReplies: (...args: unknown[]) => mockCheckForReplies(...args),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const createRequest = (body: Record<string, unknown>) =>
  new NextRequest(new URL('/api/messages/check-replies', 'http://localhost:3000'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const sampleListing = {
  id: 'listing-1',
  platform: 'CRAIGSLIST',
  sellerName: 'John',
  sellerContact: 'john@example.com',
  url: 'https://craigslist.org/123',
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/messages/check-replies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('test-user-id');
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'FLIPPER' });
    mockCheckFeatureAccess.mockReturnValue({ allowed: true, tier: 'FLIPPER', limits: {} });
    mockListingFindFirst.mockResolvedValue(sampleListing);
    mockCheckForReplies.mockResolvedValue({
      checked: true,
      newMessages: 0,
      conversationStatus: 'pending',
    });
  });

  // ── Auth ────────────────────────────────────────────────────────────────

  it('returns 401 when user is not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await POST(createRequest({ listingId: 'listing-1' }));
    expect(res.status).toBe(401);
  });

  // ── Tier enforcement ──────────────────────────────────────────────────

  it('returns 403 when user tier lacks messaging access', async () => {
    mockCheckFeatureAccess.mockReturnValue({
      allowed: false,
      reason: 'Messaging requires FLIPPER tier or higher',
      tier: 'FREE',
      limits: {},
    });
    const res = await POST(createRequest({ listingId: 'listing-1' }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('checks feature access with the user subscription tier', async () => {
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'PRO' });
    await POST(createRequest({ listingId: 'listing-1' }));
    expect(mockCheckFeatureAccess).toHaveBeenCalledWith('PRO', 'messaging');
  });

  // ── Validation ────────────────────────────────────────────────────────

  it('returns 422 when listingId is missing', async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  // ── Listing lookup ────────────────────────────────────────────────────

  it('returns 404 when listing not found', async () => {
    mockListingFindFirst.mockResolvedValue(null);
    const res = await POST(createRequest({ listingId: 'nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('scopes listing query to the authenticated user', async () => {
    await POST(createRequest({ listingId: 'listing-1' }));
    expect(mockListingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-1', userId: 'test-user-id' },
      })
    );
  });

  // ── Successful check ─────────────────────────────────────────────────

  it('returns 200 with check result when no messages found', async () => {
    const res = await POST(createRequest({ listingId: 'listing-1' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual({
      checked: true,
      newMessages: 0,
      conversationStatus: 'pending',
    });
  });

  it('returns 200 with new messages count when messages found', async () => {
    mockCheckForReplies.mockResolvedValue({
      checked: true,
      newMessages: 2,
      conversationStatus: 'responded',
    });
    const res = await POST(createRequest({ listingId: 'listing-1' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.newMessages).toBe(2);
    expect(json.data.conversationStatus).toBe('responded');
  });

  it('passes listing and userId to checkForReplies', async () => {
    await POST(createRequest({ listingId: 'listing-1' }));
    expect(mockCheckForReplies).toHaveBeenCalledWith(sampleListing, 'test-user-id');
  });

  // ── Error handling ────────────────────────────────────────────────────

  it('returns 500 when checkForReplies throws', async () => {
    mockCheckForReplies.mockRejectedValue(new Error('Service unavailable'));
    const res = await POST(createRequest({ listingId: 'listing-1' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
  });
});

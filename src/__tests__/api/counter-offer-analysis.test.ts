/**
 * @file src/__tests__/api/counter-offer-analysis.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Unit tests for POST /api/listings/[id]/counter-offer-analysis route.
 *
 * @description
 * Tests the counter-offer analysis API endpoint covering authentication,
 * tier enforcement, listing ownership, request body validation (counterOfferPrice,
 * ourPreviousOffer), malformed JSON handling, and successful analysis paths.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/listings/[id]/counter-offer-analysis/route';

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

// Mock negotiation strategy
const mockAnalyzeCounterOffer = jest.fn();
jest.mock('@/lib/negotiation-strategy', () => ({
  analyzeCounterOffer: (...args: unknown[]) => mockAnalyzeCounterOffer(...args),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const createRequest = (body: Record<string, unknown>) =>
  new NextRequest(
    new URL('/api/listings/listing-1/counter-offer-analysis', 'http://localhost:3000'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

const createBadJsonRequest = () =>
  new NextRequest(
    new URL('/api/listings/listing-1/counter-offer-analysis', 'http://localhost:3000'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{{{',
    }
  );

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const sampleListing = {
  id: 'listing-1',
  askingPrice: 100,
  verifiedMarketValue: 130,
  estimatedValue: 120,
  condition: 'Good',
  daysListed: 10,
  negotiable: true,
  demandLevel: 'medium',
  sellabilityScore: 70,
  platform: 'EBAY',
  recommendedOffer: 85,
  marketDataDate: null,
};

const sampleAnalysis = {
  recommendation: 'counter' as const,
  suggestedCounterPrice: 88,
  reasoning: 'Counter at midpoint',
  confidence: 'medium' as const,
  profitAtThisPrice: 23,
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/listings/[id]/counter-offer-analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('test-user-id');
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'FLIPPER' });
    mockCheckFeatureAccess.mockReturnValue({ allowed: true, tier: 'FLIPPER', limits: {} });
    mockListingFindFirst.mockResolvedValue(sampleListing);
    mockAnalyzeCounterOffer.mockResolvedValue(sampleAnalysis);
  });

  // ── Auth ────────────────────────────────────────────────────────────────

  it('returns 401 when user is not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await POST(
      createRequest({ counterOfferPrice: 95, ourPreviousOffer: 80 }),
      makeParams('listing-1')
    );
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
    const res = await POST(
      createRequest({ counterOfferPrice: 95, ourPreviousOffer: 80 }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(403);
  });

  // ── Body validation ───────────────────────────────────────────────────

  it('returns 422 for invalid JSON body', async () => {
    const res = await POST(createBadJsonRequest(), makeParams('listing-1'));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 422 when counterOfferPrice is missing', async () => {
    const res = await POST(
      createRequest({ ourPreviousOffer: 80 }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(422);
  });

  it('returns 422 when counterOfferPrice is negative', async () => {
    const res = await POST(
      createRequest({ counterOfferPrice: -10, ourPreviousOffer: 80 }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(422);
  });

  it('returns 422 when counterOfferPrice is zero', async () => {
    const res = await POST(
      createRequest({ counterOfferPrice: 0, ourPreviousOffer: 80 }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(422);
  });

  it('returns 422 when counterOfferPrice exceeds 999999', async () => {
    const res = await POST(
      createRequest({ counterOfferPrice: 1000000, ourPreviousOffer: 80 }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(422);
  });

  it('returns 422 when ourPreviousOffer is missing', async () => {
    const res = await POST(
      createRequest({ counterOfferPrice: 95 }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(422);
  });

  it('returns 422 when ourPreviousOffer is not a valid number', async () => {
    const res = await POST(
      createRequest({ counterOfferPrice: 95, ourPreviousOffer: 'abc' }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(422);
  });

  // ── Listing lookup ────────────────────────────────────────────────────

  it('returns 404 when listing not found', async () => {
    mockListingFindFirst.mockResolvedValue(null);
    const res = await POST(
      createRequest({ counterOfferPrice: 95, ourPreviousOffer: 80 }),
      makeParams('nonexistent')
    );
    expect(res.status).toBe(404);
  });

  it('returns 422 when listing has no asking price', async () => {
    mockListingFindFirst.mockResolvedValue({ ...sampleListing, askingPrice: 0 });
    const res = await POST(
      createRequest({ counterOfferPrice: 95, ourPreviousOffer: 80 }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(422);
  });

  it('scopes listing query to the authenticated user', async () => {
    await POST(
      createRequest({ counterOfferPrice: 95, ourPreviousOffer: 80 }),
      makeParams('listing-1')
    );
    expect(mockListingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-1', userId: 'test-user-id' },
      })
    );
  });

  // ── Successful analysis ───────────────────────────────────────────────

  it('returns 200 with analysis result', async () => {
    const res = await POST(
      createRequest({ counterOfferPrice: 95, ourPreviousOffer: 80 }),
      makeParams('listing-1')
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(sampleAnalysis);
  });

  it('passes correct arguments to analyzeCounterOffer', async () => {
    await POST(
      createRequest({ counterOfferPrice: 95, ourPreviousOffer: 80 }),
      makeParams('listing-1')
    );
    expect(mockAnalyzeCounterOffer).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: 'listing-1',
        askingPrice: 100,
        platform: 'EBAY',
        marketDataDate: null,
      }),
      95,
      80
    );
  });
});

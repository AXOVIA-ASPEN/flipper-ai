/**
 * @file src/__tests__/api/negotiation-strategy.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Unit tests for POST /api/listings/[id]/negotiation-strategy route.
 *
 * @description
 * Tests the negotiation strategy API endpoint covering authentication,
 * tier enforcement, listing ownership, askingPrice validation, strategy
 * generation, and error handling paths.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/listings/[id]/negotiation-strategy/route';

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
const mockGenerateNegotiationStrategy = jest.fn();
jest.mock('@/lib/negotiation-strategy', () => ({
  generateNegotiationStrategy: (...args: unknown[]) => mockGenerateNegotiationStrategy(...args),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const createRequest = () =>
  new NextRequest(
    new URL('/api/listings/listing-1/negotiation-strategy', 'http://localhost:3000'),
    { method: 'POST' }
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

const sampleStrategy = {
  initialOfferPrice: 80,
  walkAwayPrice: 95,
  negotiationTactics: ['cite comparable prices'],
  counterOfferSuggestions: [],
  confidence: 'high' as const,
  reasoning: 'Good deal',
  isFallback: false,
  disclaimer: 'AI-generated suggestion for informational purposes only. Not financial advice.',
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/listings/[id]/negotiation-strategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('test-user-id');
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'FLIPPER' });
    mockCheckFeatureAccess.mockReturnValue({ allowed: true, tier: 'FLIPPER', limits: {} });
    mockListingFindFirst.mockResolvedValue(sampleListing);
    mockGenerateNegotiationStrategy.mockResolvedValue(sampleStrategy);
  });

  // ── Auth ────────────────────────────────────────────────────────────────

  it('returns 401 when user is not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await POST(createRequest(), makeParams('listing-1'));
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
    const res = await POST(createRequest(), makeParams('listing-1'));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('checks feature access with the user subscription tier', async () => {
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'PRO' });
    await POST(createRequest(), makeParams('listing-1'));
    expect(mockCheckFeatureAccess).toHaveBeenCalledWith('PRO', 'messaging');
  });

  // ── Listing lookup ────────────────────────────────────────────────────

  it('returns 404 when listing not found', async () => {
    mockListingFindFirst.mockResolvedValue(null);
    const res = await POST(createRequest(), makeParams('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('scopes listing query to the authenticated user', async () => {
    await POST(createRequest(), makeParams('listing-1'));
    expect(mockListingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-1', userId: 'test-user-id' },
      })
    );
  });

  // ── Validation ────────────────────────────────────────────────────────

  it('returns 422 when listing has no asking price', async () => {
    mockListingFindFirst.mockResolvedValue({ ...sampleListing, askingPrice: 0 });
    const res = await POST(createRequest(), makeParams('listing-1'));
    expect(res.status).toBe(422);
  });

  it('returns 422 when listing has null asking price', async () => {
    mockListingFindFirst.mockResolvedValue({ ...sampleListing, askingPrice: null });
    const res = await POST(createRequest(), makeParams('listing-1'));
    expect(res.status).toBe(422);
  });

  // ── Successful generation ─────────────────────────────────────────────

  it('returns 200 with strategy and isFallback flag', async () => {
    const res = await POST(createRequest(), makeParams('listing-1'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.strategy).toEqual(sampleStrategy);
    expect(json.data.isFallback).toBe(false);
  });

  it('passes correct input to generateNegotiationStrategy', async () => {
    await POST(createRequest(), makeParams('listing-1'));
    expect(mockGenerateNegotiationStrategy).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: 'listing-1',
        askingPrice: 100,
        verifiedMarketValue: 130,
        platform: 'EBAY',
        marketDataDate: null,
      })
    );
  });

  it('converts Decimal fields to numbers', async () => {
    mockListingFindFirst.mockResolvedValue({
      ...sampleListing,
      askingPrice: '250.00',
      verifiedMarketValue: '300.00',
      estimatedValue: '280.00',
      recommendedOffer: '220.00',
    });
    await POST(createRequest(), makeParams('listing-1'));
    expect(mockGenerateNegotiationStrategy).toHaveBeenCalledWith(
      expect.objectContaining({
        askingPrice: 250,
        verifiedMarketValue: 300,
        estimatedValue: 280,
        recommendedOffer: 220,
      })
    );
  });

  it('passes null for missing optional Decimal fields', async () => {
    mockListingFindFirst.mockResolvedValue({
      ...sampleListing,
      verifiedMarketValue: null,
      estimatedValue: null,
      recommendedOffer: null,
    });
    await POST(createRequest(), makeParams('listing-1'));
    expect(mockGenerateNegotiationStrategy).toHaveBeenCalledWith(
      expect.objectContaining({
        verifiedMarketValue: null,
        estimatedValue: null,
        recommendedOffer: null,
      })
    );
  });

  it('returns isFallback true when strategy is fallback', async () => {
    mockGenerateNegotiationStrategy.mockResolvedValue({
      ...sampleStrategy,
      isFallback: true,
    });
    const res = await POST(createRequest(), makeParams('listing-1'));
    const json = await res.json();
    expect(json.data.isFallback).toBe(true);
  });

  // ── Null user (optional chaining on subscriptionTier) ────────────────────

  it('uses undefined subscriptionTier when user record is null', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    // checkFeatureAccess is still allowed — verifies the undefined tier is passed through
    await POST(createRequest(), makeParams('listing-1'));
    expect(mockCheckFeatureAccess).toHaveBeenCalledWith(undefined, 'messaging');
  });

  // ── Non-null marketDataDate ──────────────────────────────────────────────

  it('passes marketDataDate when it is non-null', async () => {
    const marketDate = new Date('2026-01-15T00:00:00.000Z');
    mockListingFindFirst.mockResolvedValue({
      ...sampleListing,
      marketDataDate: marketDate,
    });
    await POST(createRequest(), makeParams('listing-1'));
    expect(mockGenerateNegotiationStrategy).toHaveBeenCalledWith(
      expect.objectContaining({ marketDataDate: marketDate })
    );
  });

  // ── Missing listing ID ───────────────────────────────────────────────────

  it('returns 422 when listing ID param is empty string', async () => {
    const res = await POST(createRequest(), makeParams(''));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.success).toBe(false);
  });
});

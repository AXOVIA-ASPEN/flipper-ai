/**
 * @file src/__tests__/api/optimal-price.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Tests for /api/listings/[id]/optimal-price (Story 9.2 / FR-RELIST-03).
 *
 * @description
 * Validates auth, feature gating (priceHistory), listing ownership,
 * default + custom margin paths, the single-platform POST branch, and
 * error mapping (NotFound, Validation, Forbidden, Unauthorized).
 */

jest.mock('@/lib/auth', () => ({
  getCurrentUserId: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    // calculator imports prisma but its calls are mocked at the module
    // boundary below; user lookup is the only direct call this route makes.
    listing: { findFirst: jest.fn() },
    userSettings: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/listing-price-calculator', () => ({
  calculateOptimalListingPrice: jest.fn(),
  calculateMultiPlatformPrices: jest.fn(),
  SUPPORTED_PLATFORMS: ['ebay', 'mercari', 'facebook', 'offerup', 'craigslist'],
}));

import { GET, POST } from '@/app/api/listings/[id]/optimal-price/route';
import { NextRequest } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  calculateOptimalListingPrice,
  calculateMultiPlatformPrices,
} from '@/lib/listing-price-calculator';
import { NotFoundError, ValidationError } from '@/lib/errors';

const mockGetCurrentUserId = getCurrentUserId as jest.Mock;
const mockUserFindUnique = prisma.user.findUnique as jest.Mock;
const mockCalculateOptimal = calculateOptimalListingPrice as jest.Mock;
const mockCalculateMulti = calculateMultiPlatformPrices as jest.Mock;

function makeReq(url: string, body?: Record<string, unknown>): NextRequest {
  if (body) {
    return new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new NextRequest(url);
}

const params = (id = 'listing-1') => ({ params: Promise.resolve({ id }) });

const SAMPLE_PRICE = {
  targetPlatform: 'ebay',
  recommendedPrice: 101.75,
  estimatedFees: 13.23,
  estimatedProfit: 30.52,
  estimatedShippingCost: 8,
  targetMarginPercent: 30,
  feeRatePercent: 13,
  verifiedMarketValue: 200,
  costBasis: 58,
  isProjected: false,
  marketDataAvailable: true,
  lossWarning: false,
  aiRecommendedPrice: 105,
  priceBreakdown: { cappedByMarket: false, freeItemPricing: false },
  impossible: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentUserId.mockResolvedValue('user-1');
  mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'FLIPPER' });
  mockCalculateMulti.mockResolvedValue({
    prices: [SAMPLE_PRICE],
    bestPlatform: 'ebay',
    isProjected: false,
  });
  mockCalculateOptimal.mockResolvedValue(SAMPLE_PRICE);
});

describe('GET /api/listings/[id]/optimal-price', () => {
  it('returns multi-platform prices for an authenticated FLIPPER user', async () => {
    const res = await GET(
      makeReq('http://localhost/api/listings/listing-1/optimal-price'),
      params()
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.prices).toHaveLength(1);
    expect(json.data.bestPlatform).toBe('ebay');
    expect(json.data.isProjected).toBe(false);
    expect(mockCalculateMulti).toHaveBeenCalledWith({
      listingId: 'listing-1',
      userId: 'user-1',
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await GET(
      makeReq('http://localhost/api/listings/listing-1/optimal-price'),
      params()
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is on FREE tier (priceHistory not available)', async () => {
    mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'FREE' });
    const res = await GET(
      makeReq('http://localhost/api/listings/listing-1/optimal-price'),
      params()
    );
    expect(res.status).toBe(403);
  });

  it('maps NotFoundError to 404', async () => {
    mockCalculateMulti.mockRejectedValue(new NotFoundError('Listing'));
    const res = await GET(
      makeReq('http://localhost/api/listings/missing/optimal-price'),
      params('missing')
    );
    expect(res.status).toBe(404);
  });
});

describe('POST /api/listings/[id]/optimal-price', () => {
  it('returns multi-platform prices when no targetPlatform supplied', async () => {
    const res = await POST(
      makeReq('http://localhost/api/listings/listing-1/optimal-price', {
        targetMarginPercent: 25,
      }),
      params()
    );
    expect(res.status).toBe(200);
    expect(mockCalculateMulti).toHaveBeenCalledWith(
      expect.objectContaining({ targetMarginPercent: 25 })
    );
  });

  it('returns single-platform price when targetPlatform supplied', async () => {
    const res = await POST(
      makeReq('http://localhost/api/listings/listing-1/optimal-price', {
        targetPlatform: 'ebay',
        targetMarginPercent: 30,
      }),
      params()
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.prices).toHaveLength(1);
    expect(json.data.bestPlatform).toBe('ebay');
    expect(mockCalculateOptimal).toHaveBeenCalledWith(
      expect.objectContaining({
        targetPlatform: 'ebay',
        targetMarginPercent: 30,
      })
    );
  });

  it('returns 422 for invalid targetPlatform', async () => {
    const res = await POST(
      makeReq('http://localhost/api/listings/listing-1/optimal-price', {
        targetPlatform: 'amazon',
      }),
      params()
    );
    expect(res.status).toBe(422);
  });

  it('returns 422 for negative targetMarginPercent', async () => {
    const res = await POST(
      makeReq('http://localhost/api/listings/listing-1/optimal-price', {
        targetMarginPercent: -5,
      }),
      params()
    );
    expect(res.status).toBe(422);
  });

  it('returns 422 for marketCapPercent outside (0,1]', async () => {
    const res = await POST(
      makeReq('http://localhost/api/listings/listing-1/optimal-price', {
        marketCapPercent: 1.5,
      }),
      params()
    );
    expect(res.status).toBe(422);
  });

  it('propagates ValidationError from calculator (margin+fee >= 100%)', async () => {
    mockCalculateOptimal.mockRejectedValue(
      new ValidationError('Target margin plus platform fees cannot equal or exceed 100%')
    );
    const res = await POST(
      makeReq('http://localhost/api/listings/listing-1/optimal-price', {
        targetPlatform: 'ebay',
        targetMarginPercent: 90,
      }),
      params()
    );
    expect(res.status).toBe(422);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await POST(
      makeReq('http://localhost/api/listings/listing-1/optimal-price', {}),
      params()
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when user lookup returns null (no subscriptionTier)', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const res = await POST(
      makeReq('http://localhost/api/listings/listing-1/optimal-price', {}),
      params()
    );
    expect(res.status).toBe(403);
  });

  it('handles a malformed POST body by treating it as an empty object', async () => {
    // Construct a request with an invalid JSON body so request.json() throws
    // and the route falls back to {}.
    const req = new NextRequest(
      'http://localhost/api/listings/listing-1/optimal-price',
      {
        method: 'POST',
        body: 'not-json',
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const res = await POST(req, params());
    expect(res.status).toBe(200);
  });

  it('rejects non-numeric targetMarginPercent', async () => {
    const res = await POST(
      makeReq('http://localhost/api/listings/listing-1/optimal-price', {
        targetMarginPercent: 'abc' as unknown as number,
      }),
      params()
    );
    expect(res.status).toBe(422);
  });

  it('rejects non-numeric marketCapPercent', async () => {
    const res = await POST(
      makeReq('http://localhost/api/listings/listing-1/optimal-price', {
        marketCapPercent: 'low' as unknown as number,
      }),
      params()
    );
    expect(res.status).toBe(422);
  });
});

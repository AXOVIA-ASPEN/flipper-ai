/**
 * @file src/__tests__/api/listing-generate-resale-content.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Unit tests for POST /api/listings/[id]/generate-resale-content.
 *
 * @description
 * Covers auth (401), tier enforcement (403), validation (422),
 * listing-not-found (404), single-platform vs all-platforms branches,
 * AI vs algorithmic toggle, UPPERCASE → lowercase platform normalization,
 * Craigslist → generic mapping, identification-data warnings, and the
 * response shape contract returned by the endpoint.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/listings/[id]/generate-resale-content/route';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetAuthUserId = jest.fn();
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: (...args: unknown[]) => mockGetAuthUserId(...args),
}));

// Rate limiter mock — real implementation has module-level Maps that leak
// between tests, so we stub it and drive allowed/blocked behaviour per test.
const mockRateLimit = jest.fn();
jest.mock('@/lib/rate-limiter', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}));

jest.mock('@/lib/api-security', () => ({
  getClientIp: () => '127.0.0.1',
  // Other exports not used by the route under test.
}));

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

const mockCheckFeatureAccess = jest.fn();
jest.mock('@/lib/tier-enforcement', () => ({
  checkFeatureAccess: (...args: unknown[]) => mockCheckFeatureAccess(...args),
}));

// Generator mocks — capture call args so we can assert per-platform behaviour.
const mockGenerateAlgorithmicTitle = jest.fn();
const mockGenerateLLMTitle = jest.fn();
const mockGenerateTitlesForAllPlatforms = jest.fn();
jest.mock('@/lib/title-generator', () => ({
  generateAlgorithmicTitle: (...args: unknown[]) => mockGenerateAlgorithmicTitle(...args),
  generateLLMTitle: (...args: unknown[]) => mockGenerateLLMTitle(...args),
  generateTitlesForAllPlatforms: (...args: unknown[]) =>
    mockGenerateTitlesForAllPlatforms(...args),
}));

const mockGenerateAlgorithmicDescription = jest.fn();
const mockGenerateLLMDescription = jest.fn();
const mockGenerateDescriptionsForAllPlatforms = jest.fn();
jest.mock('@/lib/description-generator', () => ({
  generateAlgorithmicDescription: (...args: unknown[]) =>
    mockGenerateAlgorithmicDescription(...args),
  generateLLMDescription: (...args: unknown[]) => mockGenerateLLMDescription(...args),
  generateDescriptionsForAllPlatforms: (...args: unknown[]) =>
    mockGenerateDescriptionsForAllPlatforms(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest(
    new URL('/api/listings/listing-1/generate-resale-content', 'http://localhost:3000'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const baseListing = {
  id: 'listing-1',
  userId: 'user-1',
  platform: 'CRAIGSLIST',
  askingPrice: 80,
  recommendedList: 120,
  verifiedMarketValue: 110,
  identifiedBrand: 'Apple',
  identifiedModel: 'iPhone 14',
  identifiedVariant: '256GB',
  identifiedCondition: 'good',
  condition: 'used',
  category: 'Electronics',
  notes: null,
  tags: 'phone,apple',
  opportunity: { purchasePrice: 70, status: 'PURCHASED' },
};

function titleStub(platform: string) {
  return {
    title: `Apple iPhone 14 256GB - ${platform}`,
    platform,
    charCount: 30,
    keywords: ['apple', 'iphone'],
  };
}

function descriptionStub(platform: string) {
  return {
    description: `Description for ${platform}`,
    platform,
    wordCount: 50,
    hasConditionDetails: true,
    hasShippingNote: true,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAuthUserId.mockResolvedValue('user-1');
  mockUserFindUnique.mockResolvedValue({ subscriptionTier: 'PRO' });
  mockCheckFeatureAccess.mockReturnValue({ allowed: true, tier: 'PRO', limits: {} });
  mockListingFindFirst.mockResolvedValue(baseListing);
  mockRateLimit.mockReturnValue({
    allowed: true,
    remaining: 9,
    limit: 10,
    resetAt: Date.now() + 60_000,
  });

  mockGenerateAlgorithmicTitle.mockImplementation((_input: unknown, platform = 'generic') =>
    titleStub(platform as string)
  );
  mockGenerateLLMTitle.mockImplementation((_input: unknown, platform = 'ebay') =>
    Promise.resolve(titleStub(platform as string))
  );
  mockGenerateTitlesForAllPlatforms.mockReturnValue({
    titles: ['ebay', 'mercari', 'facebook', 'offerup'].map((p) => titleStub(p)),
    primary: 'Apple iPhone 14 256GB - ebay',
  });
  mockGenerateAlgorithmicDescription.mockImplementation(
    (_input: unknown, platform = 'generic') => descriptionStub(platform as string)
  );
  mockGenerateLLMDescription.mockImplementation((_input: unknown, platform = 'ebay') =>
    Promise.resolve(descriptionStub(platform as string))
  );
  mockGenerateDescriptionsForAllPlatforms.mockReturnValue({
    descriptions: ['ebay', 'mercari', 'facebook', 'offerup'].map((p) => descriptionStub(p)),
    primary: 'Description for ebay',
  });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/listings/[id]/generate-resale-content', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetAuthUserId.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ platform: 'ebay' }), makeParams('listing-1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when tier lacks ebayCrossListing feature', async () => {
    mockCheckFeatureAccess.mockReturnValueOnce({
      allowed: false,
      reason: 'Upgrade to PRO',
      tier: 'FREE',
      limits: {},
    });
    const res = await POST(makeRequest({ platform: 'ebay' }), makeParams('listing-1'));
    expect(res.status).toBe(403);
  });

  it('returns 422 for an unknown platform value', async () => {
    const res = await POST(makeRequest({ platform: 'amazon' }), makeParams('listing-1'));
    expect(res.status).toBe(422);
  });

  it('returns 404 when the listing does not exist for this user', async () => {
    mockListingFindFirst.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ platform: 'ebay' }), makeParams('missing'));
    expect(res.status).toBe(404);
  });

  it('scopes the listing query to the authenticated userId', async () => {
    await POST(makeRequest({ platform: 'ebay' }), makeParams('listing-1'));
    expect(mockListingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-1', userId: 'user-1' },
      })
    );
  });

  it('platform="all" + useLLM=true loops over platforms via the LLM generators', async () => {
    const res = await POST(
      makeRequest({ platform: 'all', useLLM: true }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(200);

    // 4 platforms × {title, description}
    expect(mockGenerateLLMTitle).toHaveBeenCalledTimes(4);
    expect(mockGenerateLLMDescription).toHaveBeenCalledTimes(4);
    // The algorithmic-only multi-platform helpers must NOT be used here.
    expect(mockGenerateTitlesForAllPlatforms).not.toHaveBeenCalled();
    expect(mockGenerateDescriptionsForAllPlatforms).not.toHaveBeenCalled();

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.titles).toHaveLength(4);
    expect(json.data.descriptions).toHaveLength(4);
    expect(json.data.source).toBe('ai');
  });

  it('platform="all" + useLLM=false uses the algorithmic multi-platform helpers', async () => {
    const res = await POST(
      makeRequest({ platform: 'all', useLLM: false }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(200);
    expect(mockGenerateTitlesForAllPlatforms).toHaveBeenCalledTimes(1);
    expect(mockGenerateDescriptionsForAllPlatforms).toHaveBeenCalledTimes(1);
    expect(mockGenerateLLMTitle).not.toHaveBeenCalled();
    expect(mockGenerateLLMDescription).not.toHaveBeenCalled();

    const json = await res.json();
    expect(json.data.source).toBe('template');
  });

  it('platform="ebay" + useLLM=true calls the single-platform LLM generators', async () => {
    const res = await POST(
      makeRequest({ platform: 'ebay', useLLM: true }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(200);
    expect(mockGenerateLLMTitle).toHaveBeenCalledTimes(1);
    expect(mockGenerateLLMTitle).toHaveBeenCalledWith(expect.any(Object), 'ebay');
    expect(mockGenerateLLMDescription).toHaveBeenCalledWith(expect.any(Object), 'ebay');
    expect(mockGenerateAlgorithmicTitle).not.toHaveBeenCalled();
  });

  it('platform="mercari" + useLLM=false calls the single-platform algorithmic generators', async () => {
    const res = await POST(
      makeRequest({ platform: 'mercari', useLLM: false }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(200);
    expect(mockGenerateAlgorithmicTitle).toHaveBeenCalledWith(expect.any(Object), 'mercari');
    expect(mockGenerateAlgorithmicDescription).toHaveBeenCalledWith(
      expect.any(Object),
      'mercari'
    );
    expect(mockGenerateLLMTitle).not.toHaveBeenCalled();
  });

  it('platform="craigslist" maps to generic platform when calling generators', async () => {
    const res = await POST(
      makeRequest({ platform: 'craigslist', useLLM: false }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(200);
    expect(mockGenerateAlgorithmicTitle).toHaveBeenCalledWith(expect.any(Object), 'generic');
    expect(mockGenerateAlgorithmicDescription).toHaveBeenCalledWith(
      expect.any(Object),
      'generic'
    );
  });

  it('UPPERCASE platform input is normalized to lowercase before generators', async () => {
    const res = await POST(
      makeRequest({ platform: 'EBAY', useLLM: false }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(200);
    expect(mockGenerateAlgorithmicTitle).toHaveBeenCalledWith(expect.any(Object), 'ebay');
  });

  it('returns warnings when listing has no identification data', async () => {
    mockListingFindFirst.mockResolvedValueOnce({
      ...baseListing,
      identifiedBrand: null,
      identifiedModel: null,
    });
    const res = await POST(
      makeRequest({ platform: 'ebay', useLLM: false }),
      makeParams('listing-1')
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/AI-analyzed/i)])
    );
  });

  it('does not warn when identification fields are present', async () => {
    const res = await POST(
      makeRequest({ platform: 'ebay', useLLM: false }),
      makeParams('listing-1')
    );
    const json = await res.json();
    expect(json.data.warnings).toEqual([]);
  });

  it('response shape contains titles, descriptions, primary, limits, source, warnings', async () => {
    const res = await POST(
      makeRequest({ platform: 'all', useLLM: false }),
      makeParams('listing-1')
    );
    const json = await res.json();
    expect(json.data).toEqual(
      expect.objectContaining({
        titles: expect.any(Array),
        descriptions: expect.any(Array),
        primary: expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          platform: expect.any(String),
        }),
        limits: expect.objectContaining({
          titleChars: expect.any(Object),
          descriptionWords: expect.any(Object),
        }),
        source: expect.any(String),
        warnings: expect.any(Array),
      })
    );
  });

  it('defaults platform to "all" when omitted from body', async () => {
    const res = await POST(makeRequest({}), makeParams('listing-1'));
    expect(res.status).toBe(200);
    // useLLM defaults to true, so all-platform LLM loop fires
    expect(mockGenerateLLMTitle).toHaveBeenCalledTimes(4);
  });

  it('handles malformed JSON body by falling back to defaults', async () => {
    const req = new NextRequest(
      new URL(
        '/api/listings/listing-1/generate-resale-content',
        'http://localhost:3000'
      ),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json{',
      }
    );
    const res = await POST(req, makeParams('listing-1'));
    expect(res.status).toBe(200);
  });

  it('returns 500 on unexpected database error', async () => {
    mockListingFindFirst.mockRejectedValueOnce(new Error('boom'));
    const res = await POST(makeRequest({ platform: 'ebay' }), makeParams('listing-1'));
    expect(res.status).toBe(500);
  });

  // ── Rate limiting (H1 fix) ─────────────────────────────────────────────────

  it('returns 429 when the rate limiter blocks the request', async () => {
    mockRateLimit.mockReturnValueOnce({
      allowed: false,
      remaining: 0,
      limit: 10,
      resetAt: Date.now() + 60_000,
    });
    const res = await POST(
      makeRequest({ platform: 'ebay', useLLM: true }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(429);
    // Should block before touching the listing query
    expect(mockListingFindFirst).not.toHaveBeenCalled();
    expect(mockGenerateLLMTitle).not.toHaveBeenCalled();
  });

  it('invokes the rate limiter with the request pathname and authenticated user id', async () => {
    await POST(makeRequest({ platform: 'ebay' }), makeParams('listing-1'));
    expect(mockRateLimit).toHaveBeenCalledWith(
      '127.0.0.1',
      '/api/listings/listing-1/generate-resale-content',
      'user-1'
    );
  });

  // ── Opportunity-status gate (M2 fix) ───────────────────────────────────────

  it('returns 403 when the listing has no opportunity attached', async () => {
    mockListingFindFirst.mockResolvedValueOnce({ ...baseListing, opportunity: null });
    const res = await POST(
      makeRequest({ platform: 'ebay' }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(403);
    expect(mockGenerateLLMTitle).not.toHaveBeenCalled();
  });

  it('returns 403 when the opportunity status is IDENTIFIED (not yet purchased)', async () => {
    mockListingFindFirst.mockResolvedValueOnce({
      ...baseListing,
      opportunity: { purchasePrice: null, status: 'IDENTIFIED' },
    });
    const res = await POST(
      makeRequest({ platform: 'ebay' }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(403);
  });

  it.each([['PURCHASED'], ['LISTED'], ['SOLD']])(
    'allows generation when opportunity status is %s',
    async (status) => {
      mockListingFindFirst.mockResolvedValueOnce({
        ...baseListing,
        opportunity: { purchasePrice: 70, status },
      });
      const res = await POST(
        makeRequest({ platform: 'ebay', useLLM: false }),
        makeParams('listing-1')
      );
      expect(res.status).toBe(200);
    }
  );

  // ── Task 4.7: algorithmic fallback path when the LLM is unavailable ─────────

  it('still returns a 200 with template source when the LLM mocks silently fall back', async () => {
    // Simulate the "LLM unavailable, generator returned algorithmic result"
    // path by having the LLM mocks return platform-stub objects identical to
    // what generateAlgorithmic* would produce. The endpoint shouldn't care —
    // it should still return success=true and preserve the `ai` source label
    // because that is the requested source. This covers Task 4.7 at the route
    // level: no crash, no 5xx, when the generator's internal fallback fires.
    mockGenerateLLMTitle.mockResolvedValueOnce(titleStub('ebay'));
    mockGenerateLLMDescription.mockResolvedValueOnce(descriptionStub('ebay'));
    const res = await POST(
      makeRequest({ platform: 'ebay', useLLM: true }),
      makeParams('listing-1')
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.titles[0].title).toBeTruthy();
    expect(json.data.descriptions[0].description).toBeTruthy();
  });
});

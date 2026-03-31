/**
 * Unit tests for preFilterListings(), deduplicateListings(), getPlatformFeeRate(),
 * enrichWithVerifiedMarketPrice(), enrichWithSellabilityAnalysis(), and formatForStorage()
 * in src/lib/marketplace-scanner.ts
 */

// Mock dependencies before importing marketplace-scanner
jest.mock('@/lib/value-estimator', () => ({
  estimateValue: jest.fn(),
  detectCategory: jest.fn(),
  generatePurchaseMessage: jest.fn(),
  buildComparableUrls: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findMany: (...args: unknown[]) => mockListingFindMany(...args),
    },
  },
}));

jest.mock('@/lib/market-value-calculator', () => ({
  lookupVerifiedMarketPrice: (...args: unknown[]) => mockLookupVerifiedMarketPrice(...args),
}));

jest.mock('@/lib/market-price', () => ({
  fetchMarketPrice: (...args: unknown[]) => mockFetchMarketPrice(...args),
  closeBrowser: () => mockCloseBrowser(),
}));

jest.mock('@/lib/llm-identifier', () => ({
  identifyItem: (...args: unknown[]) => mockIdentifyItem(...args),
}));

jest.mock('@/lib/llm-analyzer', () => ({
  analyzeSellability: (...args: unknown[]) => mockAnalyzeSellability(...args),
  quickDiscountCheck: (...args: unknown[]) => mockQuickDiscountCheck(...args),
}));

jest.mock('@/lib/sse-emitter', () => ({
  sseEmitter: { emit: jest.fn() },
}));

jest.mock('@/lib/claude-analyzer', () => ({
  analyzeListingData: (...args: unknown[]) => mockAnalyzeListingData(...args),
}));

jest.mock('@/lib/item-completeness-analyzer', () => ({
  analyzeItemCompleteness: (...args: unknown[]) => mockAnalyzeItemCompleteness(...args),
}));

jest.mock('@/lib/seller-reputation-analyzer', () => ({
  analyzeSellerReputation: (...args: unknown[]) => mockAnalyzeSellerReputation(...args),
}));

jest.mock('@/lib/demand-analyzer', () => ({
  analyzeDemandTrend: (...args: unknown[]) => mockAnalyzeDemandTrend(...args),
}));

jest.mock('@/lib/comp-matcher', () => ({
  findComparableSales: (...args: unknown[]) => mockFindComparableSales(...args),
}));

jest.mock('@/lib/logistics-analyzer', () => ({
  analyzeLogistics: (...args: unknown[]) => mockAnalyzeLogistics(...args),
}));

const mockListingFindMany = jest.fn();
const mockEstimateValue = jest.fn();
const mockDetectCategory = jest.fn();
const mockLookupVerifiedMarketPrice = jest.fn();
const mockFetchMarketPrice = jest.fn();
const mockCloseBrowser = jest.fn();
const mockIdentifyItem = jest.fn();
const mockAnalyzeSellability = jest.fn();
const mockQuickDiscountCheck = jest.fn();
const mockAnalyzeListingData = jest.fn();
const mockAnalyzeItemCompleteness = jest.fn();
const mockAnalyzeSellerReputation = jest.fn();
const mockAnalyzeDemandTrend = jest.fn();
const mockFindComparableSales = jest.fn();
const mockAnalyzeLogistics = jest.fn();

import {
  preFilterListings,
  deduplicateListings,
  getPlatformFeeRate,
  PLATFORM_FEE_DEFAULTS,
  enrichWithVerifiedMarketPrice,
  enrichWithSellabilityAnalysis,
  enrichWithDemandAnalysis,
  enrichWithCompMatches,
  enrichOpportunitiesWithClaudeTier2,
  enrichWithCompletenessAndReputation,
  enrichWithLogisticsAnalysis,
  formatForStorage,
  type FreeItemHandling,
  type AnalyzedListing,
} from '@/lib/marketplace-scanner';
import { estimateValue, detectCategory } from '@/lib/value-estimator';

// Cast to jest mocks for type-safe usage
const mockEstimateValueTyped = estimateValue as jest.Mock;
const mockDetectCategoryTyped = detectCategory as jest.Mock;

// Silence unused variable warnings — the named refs above are for type-safe .mockX() calls
void mockEstimateValue;
void mockDetectCategory;

// Helper to build a minimal RawListing
function makeRawListing(overrides: Partial<{
  externalId: string;
  title: string;
  askingPrice: number;
  description: string | null;
  condition: string | null;
  location: string | null;
}> = {}) {
  return {
    externalId: overrides.externalId ?? 'ext-001',
    url: 'https://example.com/listing/1',
    title: overrides.title ?? 'Vintage Bicycle',
    description: overrides.description ?? null,
    askingPrice: overrides.askingPrice ?? 150,
    condition: overrides.condition ?? null,
    location: overrides.location ?? 'Tampa, FL',
    sellerName: null,
    sellerContact: null,
    imageUrls: [],
    category: null,
    postedAt: null,
  };
}

// Default estimation stub for auto_analyze tests
const highValueEstimation = {
  valueScore: 80,
  estimatedValue: 300,
  estimatedLow: 250,
  estimatedHigh: 350,
  profitPotential: 150,
  profitLow: 100,
  profitHigh: 200,
  discountPercent: 50,
  resaleDifficulty: 'MEDIUM',
  comparableUrls: [],
  reasoning: '',
  notes: '',
  shippable: true,
  negotiable: false,
  tags: [],
};

const lowValueEstimation = { ...highValueEstimation, valueScore: 40 };

describe('preFilterListings()', () => {
  const userId = 'user-abc';

  beforeEach(() => {
    jest.clearAllMocks();
    mockEstimateValueTyped.mockReturnValue(highValueEstimation);
    mockDetectCategoryTyped.mockReturnValue('sporting');
  });

  describe('negative price', () => {
    it('skips listings with price < 0', () => {
      const listing = makeRawListing({ askingPrice: -5 });
      const result = preFilterListings('CRAIGSLIST', [listing], {
        userId,
        freeItemHandling: 'include_review',
      });

      expect(result.accepted).toHaveLength(0);
      expect(result.flaggedForReview).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('negative_price');
    });
  });

  describe('sponsored listings', () => {
    it('skips listings whose title contains "sponsored" (case-insensitive)', () => {
      const listing = makeRawListing({ title: 'SPONSORED: Nike Shoes' });
      const result = preFilterListings('EBAY', [listing], {
        userId,
        freeItemHandling: 'include_review',
      });

      expect(result.accepted).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('sponsored');
    });

    it('skips sponsored even if mid-sentence', () => {
      const listing = makeRawListing({ title: 'Great deal — sponsored post' });
      const result = preFilterListings('FACEBOOK', [listing], {
        userId,
        freeItemHandling: 'skip',
      });

      expect(result.skipped[0].reason).toBe('sponsored');
    });

    it('does not skip listings whose title contains "sponsor" but not "sponsored"', () => {
      const listing = makeRawListing({ title: 'Find a sponsor for your event' });
      const result = preFilterListings('CRAIGSLIST', [listing], {
        userId,
        freeItemHandling: 'include_review',
      });

      expect(result.accepted).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
    });
  });

  describe('free items — include_review', () => {
    it('puts $0 items into flaggedForReview', () => {
      const listing = makeRawListing({ askingPrice: 0 });
      const result = preFilterListings('OFFERUP', [listing], {
        userId,
        freeItemHandling: 'include_review',
      });

      expect(result.accepted).toHaveLength(0);
      expect(result.flaggedForReview).toHaveLength(1);
      expect(result.flaggedForReview[0]).toBe(listing);
      expect(result.skipped).toHaveLength(0);
    });
  });

  describe('free items — auto_analyze', () => {
    it('accepts $0 items scoring >= 70', () => {
      mockEstimateValueTyped.mockReturnValue(highValueEstimation); // valueScore: 80

      const listing = makeRawListing({ askingPrice: 0 });
      const result = preFilterListings('MERCARI', [listing], {
        userId,
        freeItemHandling: 'auto_analyze',
      });

      expect(result.accepted).toHaveLength(1);
      expect(result.flaggedForReview).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('skips $0 items scoring < 70', () => {
      mockEstimateValueTyped.mockReturnValue(lowValueEstimation); // valueScore: 40

      const listing = makeRawListing({ askingPrice: 0 });
      const result = preFilterListings('MERCARI', [listing], {
        userId,
        freeItemHandling: 'auto_analyze',
      });

      expect(result.accepted).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('free_item_below_threshold');
    });

    it('calls estimateValue with correct args', () => {
      const listing = makeRawListing({ askingPrice: 0, description: 'Nice bike', condition: 'good' });
      mockDetectCategoryTyped.mockReturnValue('sporting');

      preFilterListings('CRAIGSLIST', [listing], {
        userId,
        freeItemHandling: 'auto_analyze',
      });

      expect(mockDetectCategoryTyped).toHaveBeenCalledWith(listing.title, listing.description);
      expect(mockEstimateValueTyped).toHaveBeenCalledWith(
        listing.title,
        listing.description,
        0,
        listing.condition,
        'sporting'
      );
    });
  });

  describe('free items — skip', () => {
    it('discards $0 items entirely', () => {
      const listing = makeRawListing({ askingPrice: 0 });
      const result = preFilterListings('CRAIGSLIST', [listing], {
        userId,
        freeItemHandling: 'skip',
      });

      expect(result.accepted).toHaveLength(0);
      expect(result.flaggedForReview).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('free_item_skipped');
    });
  });

  describe('normal listings', () => {
    it('accepts listings with price > 0 that are not sponsored', () => {
      const listings = [
        makeRawListing({ externalId: 'a', askingPrice: 50 }),
        makeRawListing({ externalId: 'b', askingPrice: 200 }),
        makeRawListing({ externalId: 'c', askingPrice: 1 }),
      ];

      const result = preFilterListings('OFFERUP', listings, {
        userId,
        freeItemHandling: 'include_review',
      });

      expect(result.accepted).toHaveLength(3);
      expect(result.flaggedForReview).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });
  });

  describe('mixed batch', () => {
    it('correctly partitions a mixed set of listings', () => {
      const listings = [
        makeRawListing({ externalId: 'normal', askingPrice: 100 }),
        makeRawListing({ externalId: 'neg', askingPrice: -1 }),
        makeRawListing({ externalId: 'free', askingPrice: 0 }),
        makeRawListing({ externalId: 'spon', title: 'Sponsored Nike Air Max' }),
      ];

      const result = preFilterListings('CRAIGSLIST', listings, {
        userId,
        freeItemHandling: 'include_review',
      });

      expect(result.accepted.map((l) => l.externalId)).toEqual(['normal']);
      expect(result.flaggedForReview.map((l) => l.externalId)).toEqual(['free']);
      expect(result.skipped.map((l) => l.listing.externalId)).toEqual(['neg', 'spon']);
    });

    it('handles empty input gracefully', () => {
      const result = preFilterListings('FACEBOOK', [], {
        userId,
        freeItemHandling: 'skip',
      });

      expect(result.accepted).toHaveLength(0);
      expect(result.flaggedForReview).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });
  });
});

describe('deduplicateListings()', () => {
  const userId = 'user-xyz';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty results for empty input without querying DB', async () => {
    const result = await deduplicateListings('CRAIGSLIST', [], userId);

    expect(result.unique).toHaveLength(0);
    expect(result.duplicates).toHaveLength(0);
    expect(mockListingFindMany).not.toHaveBeenCalled();
  });

  it('marks all listings as unique when none exist in DB', async () => {
    mockListingFindMany.mockResolvedValue([]);

    const listings = [
      makeRawListing({ externalId: 'new-1' }),
      makeRawListing({ externalId: 'new-2' }),
    ];

    const result = await deduplicateListings('EBAY', listings, userId);

    expect(result.unique).toHaveLength(2);
    expect(result.duplicates).toHaveLength(0);
    expect(result.unique.map((l) => l.externalId)).toEqual(['new-1', 'new-2']);
  });

  it('marks existing listings as duplicates', async () => {
    mockListingFindMany.mockResolvedValue([
      { externalId: 'existing-1' },
      { externalId: 'existing-2' },
    ]);

    const listings = [
      makeRawListing({ externalId: 'existing-1' }),
      makeRawListing({ externalId: 'existing-2' }),
      makeRawListing({ externalId: 'new-3' }),
    ];

    const result = await deduplicateListings('FACEBOOK', listings, userId);

    expect(result.unique).toHaveLength(1);
    expect(result.unique[0].externalId).toBe('new-3');
    expect(result.duplicates).toHaveLength(2);
    expect(result.duplicates.map((l) => l.externalId)).toEqual(['existing-1', 'existing-2']);
  });

  it('queries DB with correct platform, userId, and externalIds', async () => {
    mockListingFindMany.mockResolvedValue([]);

    const listings = [
      makeRawListing({ externalId: 'item-a' }),
      makeRawListing({ externalId: 'item-b' }),
    ];

    await deduplicateListings('OFFERUP', listings, 'user-123');

    expect(mockListingFindMany).toHaveBeenCalledWith({
      where: {
        platform: 'OFFERUP',
        userId: 'user-123',
        externalId: { in: ['item-a', 'item-b'] },
      },
      select: { externalId: true },
    });
  });

  it('handles all listings being duplicates', async () => {
    mockListingFindMany.mockResolvedValue([
      { externalId: 'dup-1' },
      { externalId: 'dup-2' },
      { externalId: 'dup-3' },
    ]);

    const listings = [
      makeRawListing({ externalId: 'dup-1' }),
      makeRawListing({ externalId: 'dup-2' }),
      makeRawListing({ externalId: 'dup-3' }),
    ];

    const result = await deduplicateListings('MERCARI', listings, userId);

    expect(result.unique).toHaveLength(0);
    expect(result.duplicates).toHaveLength(3);
  });

  it('is scoped per-platform (same externalId on different platform is not a duplicate)', async () => {
    // DB has a CRAIGSLIST listing with this id
    mockListingFindMany.mockResolvedValue([]); // OFFERUP query returns nothing

    const listings = [makeRawListing({ externalId: 'item-123' })];

    // Deduplicating for OFFERUP — not a duplicate even if CRAIGSLIST has the same id
    const result = await deduplicateListings('OFFERUP', listings, userId);

    expect(result.unique).toHaveLength(1);
    expect(result.duplicates).toHaveLength(0);
    expect(mockListingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ platform: 'OFFERUP' }),
      })
    );
  });

  it('is scoped per-user (same externalId for different user is not a duplicate)', async () => {
    // DB query for user-A returns nothing (user-B owns it but user-A does not)
    mockListingFindMany.mockResolvedValue([]);

    const listings = [makeRawListing({ externalId: 'shared-item' })];

    const result = await deduplicateListings('CRAIGSLIST', listings, 'user-A');

    expect(result.unique).toHaveLength(1);
    expect(mockListingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-A' }),
      })
    );
  });
});

// Story 4.2: getPlatformFeeRate() tests
describe('getPlatformFeeRate()', () => {
  describe('PLATFORM_FEE_DEFAULTS', () => {
    it('exports correct default fee rates', () => {
      expect(PLATFORM_FEE_DEFAULTS['EBAY']).toBeCloseTo(0.13);
      expect(PLATFORM_FEE_DEFAULTS['MERCARI']).toBeCloseTo(0.10);
      expect(PLATFORM_FEE_DEFAULTS['FACEBOOK_MARKETPLACE']).toBeCloseTo(0.05);
      expect(PLATFORM_FEE_DEFAULTS['OFFERUP']).toBeCloseTo(0.129);
      expect(PLATFORM_FEE_DEFAULTS['CRAIGSLIST']).toBe(0);
    });
  });

  describe('no userSettings', () => {
    it('returns default rate for EBAY when userSettings is null', () => {
      const rate = getPlatformFeeRate('EBAY', null);
      expect(rate).toBeCloseTo(0.13);
    });

    it('returns default rate for MERCARI when userSettings is undefined', () => {
      const rate = getPlatformFeeRate('MERCARI', undefined);
      expect(rate).toBeCloseTo(0.10);
    });

    it('returns default rate for CRAIGSLIST when userSettings is null', () => {
      const rate = getPlatformFeeRate('CRAIGSLIST', null);
      expect(rate).toBe(0);
    });

    it('returns 0.13 fallback for unknown platform', () => {
      const rate = getPlatformFeeRate('UNKNOWN_PLATFORM', null);
      expect(rate).toBeCloseTo(0.13);
    });
  });

  describe('with userSettings overrides', () => {
    it('converts user percentage to decimal for EBAY', () => {
      const rate = getPlatformFeeRate('EBAY', { feeRateEbay: 10.0 });
      expect(rate).toBeCloseTo(0.10);
    });

    it('converts user percentage to decimal for MERCARI', () => {
      const rate = getPlatformFeeRate('MERCARI', { feeRateMercari: 8.5 });
      expect(rate).toBeCloseTo(0.085);
    });

    it('converts user percentage to decimal for FACEBOOK_MARKETPLACE', () => {
      const rate = getPlatformFeeRate('FACEBOOK_MARKETPLACE', { feeRateFacebook: 3.0 });
      expect(rate).toBeCloseTo(0.03);
    });

    it('converts user percentage to decimal for OFFERUP', () => {
      const rate = getPlatformFeeRate('OFFERUP', { feeRateOfferup: 12.0 });
      expect(rate).toBeCloseTo(0.12);
    });

    it('converts user percentage to decimal for CRAIGSLIST (0%)', () => {
      const rate = getPlatformFeeRate('CRAIGSLIST', { feeRateCraigslist: 0.0 });
      expect(rate).toBe(0);
    });

    it('falls back to default when user rate is null', () => {
      const rate = getPlatformFeeRate('EBAY', { feeRateEbay: null });
      expect(rate).toBeCloseTo(0.13);
    });

    it('falls back to default when user rate is undefined (field absent)', () => {
      const rate = getPlatformFeeRate('EBAY', {});
      expect(rate).toBeCloseTo(0.13);
    });

    it('rejects rates above 50% (> 0.5 decimal)', () => {
      const rate = getPlatformFeeRate('EBAY', { feeRateEbay: 55.0 });
      expect(rate).toBeCloseTo(0.13);
    });

    it('rejects negative rates', () => {
      const rate = getPlatformFeeRate('MERCARI', { feeRateMercari: -5.0 });
      expect(rate).toBeCloseTo(0.10);
    });
  });
});

// ─── Helpers for enrichment tests ─────────────────────────────────────────────

function makeAnalyzedListing(overrides: Partial<AnalyzedListing> = {}): AnalyzedListing {
  return {
    externalId: 'ext-analyzed-001',
    url: 'https://example.com/listing/1',
    title: 'Apple iPhone 14 Pro',
    description: 'Good condition',
    askingPrice: 200,
    condition: 'good',
    location: 'New York',
    sellerName: null,
    sellerContact: null,
    imageUrls: [],
    category: 'electronics',
    postedAt: null,
    platform: 'EBAY',
    estimation: {
      estimatedValue: 400,
      estimatedLow: 350,
      estimatedHigh: 450,
      profitPotential: 200,
      profitLow: 150,
      profitHigh: 250,
      valueScore: 80,
      discountPercent: 50,
      resaleDifficulty: 'EASY',
      confidence: 'high',
      reasoning: 'Good deal',
      notes: 'Original estimation notes',
      comparableUrls: [],
      shippable: true,
      negotiable: false,
      tags: [],
    },
    requestToBuy: 'Would you take $180?',
    isOpportunity: true,
    ...overrides,
  };
}

// ─── enrichWithVerifiedMarketPrice() ──────────────────────────────────────────

describe('enrichWithVerifiedMarketPrice()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCloseBrowser.mockResolvedValue(undefined);
  });

  it('returns empty array for empty input and calls closeBrowser', async () => {
    const result = await enrichWithVerifiedMarketPrice([]);
    expect(result).toEqual([]);
    expect(mockCloseBrowser).toHaveBeenCalledTimes(1);
  });

  it('enriches listing with verifiedPrice on successful lookup', async () => {
    const listing = makeAnalyzedListing();
    const verifiedPrice = {
      verifiedMarketValue: 350,
      trueDiscountPercent: 57,
      marketDataSource: 'ebay_sold',
      marketDataDate: new Date(),
      comparableSalesJson: '[]',
    };
    mockLookupVerifiedMarketPrice.mockResolvedValue(verifiedPrice);

    const result = await enrichWithVerifiedMarketPrice([listing]);

    expect(result).toHaveLength(1);
    expect(result[0].verifiedPrice).toBe(verifiedPrice);
    expect(mockCloseBrowser).toHaveBeenCalledTimes(1);
  });

  it('returns original listing when lookup throws an error', async () => {
    const listing = makeAnalyzedListing();
    mockLookupVerifiedMarketPrice.mockRejectedValue(new Error('lookup failed'));

    const result = await enrichWithVerifiedMarketPrice([listing]);

    expect(result).toHaveLength(1);
    expect(result[0].verifiedPrice).toBeNull();
    expect(result[0].title).toBe(listing.title);
    expect(mockCloseBrowser).toHaveBeenCalledTimes(1);
  });

  it('uses llmIdentification.searchQuery when available', async () => {
    const listing = makeAnalyzedListing({
      title: 'Good deal on phone',
      llmIdentification: {
        searchQuery: 'Apple iPhone 14 Pro 256GB',
        brand: 'Apple',
        model: 'iPhone 14 Pro',
        variant: '256GB',
        condition: 'good',
        conditionNotes: '',
        category: 'electronics',
        worthInvestigating: true,
      },
    });
    mockLookupVerifiedMarketPrice.mockResolvedValue(null);

    await enrichWithVerifiedMarketPrice([listing]);

    expect(mockLookupVerifiedMarketPrice).toHaveBeenCalledWith(
      'Apple iPhone 14 Pro 256GB',
      listing.askingPrice,
      'electronics'
    );
  });

  it('falls back to listing title when llmIdentification is absent', async () => {
    const listing = makeAnalyzedListing({ title: 'Random Phone' });
    mockLookupVerifiedMarketPrice.mockResolvedValue(null);

    await enrichWithVerifiedMarketPrice([listing]);

    expect(mockLookupVerifiedMarketPrice).toHaveBeenCalledWith(
      'Random Phone',
      listing.askingPrice,
      listing.category
    );
  });

  it('processes multiple listings and calls closeBrowser once', async () => {
    const listing1 = makeAnalyzedListing({ externalId: 'a', title: 'iPhone' });
    const listing2 = makeAnalyzedListing({ externalId: 'b', title: 'MacBook' });
    const verifiedPrice = {
      verifiedMarketValue: 300,
      trueDiscountPercent: 40,
      marketDataSource: 'db',
      marketDataDate: new Date(),
      comparableSalesJson: '[]',
    };
    mockLookupVerifiedMarketPrice
      .mockResolvedValueOnce(verifiedPrice)
      .mockRejectedValueOnce(new Error('fail'));

    const result = await enrichWithVerifiedMarketPrice([listing1, listing2]);

    expect(result).toHaveLength(2);
    expect(result[0].verifiedPrice).toBe(verifiedPrice);
    expect(result[1].verifiedPrice).toBeNull();
    expect(mockCloseBrowser).toHaveBeenCalledTimes(1);
  });
});

// ─── enrichWithSellabilityAnalysis() ──────────────────────────────────────────

describe('enrichWithSellabilityAnalysis()', () => {
  const defaultIdentification = {
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    variant: '256GB',
    condition: 'good',
    conditionNotes: 'minor scratches',
    category: 'electronics',
    searchQuery: 'Apple iPhone 14 Pro 256GB',
    worthInvestigating: true,
  };
  const defaultMarketData = {
    medianPrice: 400,
    salesCount: 10,
    averagePrice: 420,
    minPrice: 350,
    maxPrice: 500,
    recentSales: [],
  };
  const defaultQuickCheck = { passesQuickCheck: true, estimatedDiscount: 50 };
  const defaultSellabilityAnalysis = {
    verifiedMarketValue: 400,
    trueDiscountPercent: 55,
    sellabilityScore: 80,
    demandLevel: 'high' as const,
    expectedDaysToSell: 7,
    authenticityRisk: 'low' as const,
    conditionRisk: 'low' as const,
    recommendedOfferPrice: 175,
    recommendedListPrice: 350,
    resaleStrategy: 'Sell on eBay',
    resalePlatform: 'eBay',
    comparableSales: [],
    confidence: 'high' as const,
    reasoning: 'Strong demand',
    meetsThreshold: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCloseBrowser.mockResolvedValue(undefined);
    mockIdentifyItem.mockResolvedValue(defaultIdentification);
    mockFetchMarketPrice.mockResolvedValue(defaultMarketData);
    mockQuickDiscountCheck.mockReturnValue(defaultQuickCheck);
    mockAnalyzeSellability.mockResolvedValue(defaultSellabilityAnalysis);
  });

  it('returns empty array for empty input and calls closeBrowser', async () => {
    const result = await enrichWithSellabilityAnalysis([]);
    expect(result).toEqual([]);
    expect(mockCloseBrowser).toHaveBeenCalledTimes(1);
  });

  it('skips listings with askingPrice <= 0', async () => {
    const listing = makeAnalyzedListing({ askingPrice: 0 });
    const result = await enrichWithSellabilityAnalysis([listing]);
    expect(result).toHaveLength(0);
    expect(mockIdentifyItem).not.toHaveBeenCalled();
  });

  it('skips when identifyItem returns null', async () => {
    mockIdentifyItem.mockResolvedValue(null);
    const result = await enrichWithSellabilityAnalysis([makeAnalyzedListing()]);
    expect(result).toHaveLength(0);
    expect(mockFetchMarketPrice).not.toHaveBeenCalled();
  });

  it('skips when identifyItem.worthInvestigating is false', async () => {
    mockIdentifyItem.mockResolvedValue({ ...defaultIdentification, worthInvestigating: false });
    const result = await enrichWithSellabilityAnalysis([makeAnalyzedListing()]);
    expect(result).toHaveLength(0);
    expect(mockFetchMarketPrice).not.toHaveBeenCalled();
  });

  it('skips when fetchMarketPrice returns null', async () => {
    mockFetchMarketPrice.mockResolvedValue(null);
    const result = await enrichWithSellabilityAnalysis([makeAnalyzedListing()]);
    expect(result).toHaveLength(0);
    expect(mockQuickDiscountCheck).not.toHaveBeenCalled();
  });

  it('skips when fetchMarketPrice returns salesCount=0', async () => {
    mockFetchMarketPrice.mockResolvedValue({ ...defaultMarketData, salesCount: 0 });
    const result = await enrichWithSellabilityAnalysis([makeAnalyzedListing()]);
    expect(result).toHaveLength(0);
    expect(mockQuickDiscountCheck).not.toHaveBeenCalled();
  });

  it('skips when quickDiscountCheck fails', async () => {
    mockQuickDiscountCheck.mockReturnValue({ passesQuickCheck: false, estimatedDiscount: 20 });
    const result = await enrichWithSellabilityAnalysis([makeAnalyzedListing()]);
    expect(result).toHaveLength(0);
    expect(mockAnalyzeSellability).not.toHaveBeenCalled();
  });

  it('skips when analyzeSellability returns null', async () => {
    mockAnalyzeSellability.mockResolvedValue(null);
    const result = await enrichWithSellabilityAnalysis([makeAnalyzedListing()]);
    expect(result).toHaveLength(0);
  });

  it('skips when sellabilityAnalysis.meetsThreshold is false', async () => {
    mockAnalyzeSellability.mockResolvedValue({ ...defaultSellabilityAnalysis, meetsThreshold: false });
    const result = await enrichWithSellabilityAnalysis([makeAnalyzedListing()]);
    expect(result).toHaveLength(0);
  });

  it('skips when trueDiscountPercent is below discountThreshold', async () => {
    mockAnalyzeSellability.mockResolvedValue({
      ...defaultSellabilityAnalysis,
      meetsThreshold: true,
      trueDiscountPercent: 30,
    });
    const result = await enrichWithSellabilityAnalysis([makeAnalyzedListing()], 50);
    expect(result).toHaveLength(0);
  });

  it('returns enriched listing when all checks pass', async () => {
    const listing = makeAnalyzedListing();
    const result = await enrichWithSellabilityAnalysis([listing]);
    expect(result).toHaveLength(1);
    expect(result[0].sellabilityAnalysis).toBe(defaultSellabilityAnalysis);
    expect(mockCloseBrowser).toHaveBeenCalledTimes(1);
  });

  it('catches errors per-listing and continues to next', async () => {
    const listing1 = makeAnalyzedListing({ externalId: 'a' });
    const listing2 = makeAnalyzedListing({ externalId: 'b' });
    mockIdentifyItem
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce(defaultIdentification);

    const result = await enrichWithSellabilityAnalysis([listing1, listing2]);
    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe('b');
    expect(mockCloseBrowser).toHaveBeenCalledTimes(1);
  });

  it('passes discountThreshold to analyzeSellability', async () => {
    const listing = makeAnalyzedListing();
    await enrichWithSellabilityAnalysis([listing], 60);
    expect(mockAnalyzeSellability).toHaveBeenCalledWith(
      listing.title,
      listing.askingPrice,
      defaultIdentification,
      defaultMarketData,
      60,
      undefined // feeRate not provided
    );
  });
});

// ─── formatForStorage() – sellabilityAnalysis and verifiedPrice branches ──────

describe('formatForStorage() - Story 4.2/4.4/4.5 branches', () => {
  const baseSellabilityAnalysis = {
    verifiedMarketValue: 400,
    trueDiscountPercent: 55,
    sellabilityScore: 85,
    demandLevel: 'high' as const,
    expectedDaysToSell: 7,
    authenticityRisk: 'low' as const,
    conditionRisk: 'low' as const,
    recommendedOfferPrice: 175,
    recommendedListPrice: 350,
    resaleStrategy: 'Sell on eBay for best return',
    resalePlatform: 'eBay',
    comparableSales: [],
    confidence: 'high' as const,
    reasoning: 'Strong market demand',
    meetsThreshold: true,
  };

  const baseVerifiedPrice = {
    verifiedMarketValue: 500,
    trueDiscountPercent: 60,
    marketDataSource: 'ebay_sold',
    marketDataDate: new Date('2026-01-01'),
    comparableSalesJson: '[{"price":500}]',
  };

  it('sets status=OPPORTUNITY and llmAnalyzed=true when sellabilityAnalysis is set', () => {
    const listing = makeAnalyzedListing({ isOpportunity: false, sellabilityAnalysis: baseSellabilityAnalysis });
    const stored = formatForStorage(listing);
    expect(stored.status).toBe('OPPORTUNITY');
    expect(stored.llmAnalyzed).toBe(true);
    expect(stored.analysisDate).not.toBeNull();
  });

  it('uses resaleStrategy as notes when sellabilityAnalysis is set', () => {
    const listing = makeAnalyzedListing({ sellabilityAnalysis: baseSellabilityAnalysis });
    const stored = formatForStorage(listing);
    expect(stored.notes).toBe('Sell on eBay for best return');
  });

  it('maps all sellabilityAnalysis fields', () => {
    const listing = makeAnalyzedListing({ sellabilityAnalysis: baseSellabilityAnalysis });
    const stored = formatForStorage(listing);
    expect(stored.sellabilityScore).toBe(85);
    expect(stored.demandLevel).toBe('high');
    expect(stored.expectedDaysToSell).toBe(7);
    expect(stored.authenticityRisk).toBe('low');
    expect(stored.recommendedOffer).toBe(175);
    expect(stored.recommendedList).toBe(350);
    expect(stored.resaleStrategy).toBe('Sell on eBay for best return');
    expect(stored.analysisConfidence).toBe('high');
    expect(stored.analysisReasoning).toBe('Strong market demand');
    expect(stored.verifiedMarketValue).toBe(400);
    expect(stored.trueDiscountPercent).toBe(55);
    expect(stored.marketDataSource).toBe('ebay_scrape');
    expect(stored.marketDataDate).not.toBeNull();
  });

  it('uses verifiedPrice fields when set (no sellabilityAnalysis)', () => {
    const listing = makeAnalyzedListing({ verifiedPrice: baseVerifiedPrice });
    const stored = formatForStorage(listing);
    expect(stored.verifiedMarketValue).toBe(500);
    expect(stored.trueDiscountPercent).toBe(60);
    expect(stored.marketDataSource).toBe('ebay_sold');
    expect(stored.comparableSalesJson).toBe('[{"price":500}]');
    expect(stored.marketDataDate).not.toBeNull();
  });

  it('verifiedPrice takes priority over sellabilityAnalysis in ?? chains', () => {
    const listing = makeAnalyzedListing({
      sellabilityAnalysis: baseSellabilityAnalysis,
      verifiedPrice: baseVerifiedPrice,
    });
    const stored = formatForStorage(listing);
    expect(stored.verifiedMarketValue).toBe(500);
    expect(stored.trueDiscountPercent).toBe(60);
    expect(stored.marketDataSource).toBe('ebay_sold');
    expect(stored.comparableSalesJson).toBe('[{"price":500}]');
  });

  it('sets marketDataSource=null when neither verifiedPrice nor sellabilityAnalysis', () => {
    const listing = makeAnalyzedListing();
    const stored = formatForStorage(listing);
    expect(stored.marketDataSource).toBeNull();
    expect(stored.marketDataDate).toBeNull();
    expect(stored.llmAnalyzed).toBe(false);
    expect(stored.analysisDate).toBeNull();
  });
});

// ─── enrichOpportunitiesWithClaudeTier2() — Story 5.1 ─────────────────────────

const defaultClaudeAnalysis = {
  category: 'electronics',
  subcategory: 'smartphones',
  brand: 'Apple',
  condition: 'good',
  estimatedAge: '1-2 years',
  keyFeatures: ['Face ID', '48MP camera'],
  potentialIssues: [],
  flippabilityScore: 85,
  confidence: 'high' as const,
  reasoning: 'High demand Apple product with strong resale value',
  marketTrends: 'Stable demand',
  targetBuyer: 'Consumer electronics buyer',
};

describe('enrichOpportunitiesWithClaudeTier2()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyzeListingData.mockResolvedValue(defaultClaudeAnalysis);
  });

  it('returns empty array unchanged for empty input', async () => {
    const result = await enrichOpportunitiesWithClaudeTier2([]);
    expect(result).toEqual([]);
    expect(mockAnalyzeListingData).not.toHaveBeenCalled();
  });

  it('enriches each listing with claudeAnalysis on success', async () => {
    const listing = makeAnalyzedListing({ externalId: 'ext-001' });
    const result = await enrichOpportunitiesWithClaudeTier2([listing]);

    expect(result).toHaveLength(1);
    expect(result[0].claudeAnalysis).toBe(defaultClaudeAnalysis);
    expect(mockAnalyzeListingData).toHaveBeenCalledWith(
      listing.title,
      listing.description,
      listing.askingPrice,
      listing.imageUrls,
      undefined
    );
  });

  it('passes userId through for usage metering', async () => {
    const listing = makeAnalyzedListing({ externalId: 'ext-user' });
    await enrichOpportunitiesWithClaudeTier2([listing], 'user-meter-99');
    expect(mockAnalyzeListingData).toHaveBeenCalledWith(
      listing.title,
      listing.description,
      listing.askingPrice,
      listing.imageUrls,
      'user-meter-99'
    );
  });

  it('sets claudeAnalysis=null and continues when analyzeListingData throws', async () => {
    mockAnalyzeListingData.mockRejectedValue(new Error('Claude API error'));
    const listing = makeAnalyzedListing({ externalId: 'ext-err' });

    const result = await enrichOpportunitiesWithClaudeTier2([listing]);
    expect(result).toHaveLength(1);
    expect(result[0].claudeAnalysis).toBeNull();
    expect(result[0].externalId).toBe('ext-err');
  });

  it('processes multiple listings in parallel, enriching all', async () => {
    const listing1 = makeAnalyzedListing({ externalId: 'a', title: 'iPhone 14 Pro' });
    const listing2 = makeAnalyzedListing({ externalId: 'b', title: 'MacBook Air' });
    mockAnalyzeListingData
      .mockResolvedValueOnce({ ...defaultClaudeAnalysis, brand: 'Apple' })
      .mockResolvedValueOnce({ ...defaultClaudeAnalysis, brand: 'Apple', subcategory: 'laptops' });

    const result = await enrichOpportunitiesWithClaudeTier2([listing1, listing2]);

    expect(result).toHaveLength(2);
    expect(result[0].claudeAnalysis?.brand).toBe('Apple');
    expect(result[1].claudeAnalysis?.subcategory).toBe('laptops');
    expect(mockAnalyzeListingData).toHaveBeenCalledTimes(2);
  });

  it('handles mix of success and failure across listings', async () => {
    const listing1 = makeAnalyzedListing({ externalId: 'ok' });
    const listing2 = makeAnalyzedListing({ externalId: 'fail' });
    mockAnalyzeListingData
      .mockResolvedValueOnce(defaultClaudeAnalysis)
      .mockRejectedValueOnce(new Error('rate limited'));

    const result = await enrichOpportunitiesWithClaudeTier2([listing1, listing2]);

    expect(result).toHaveLength(2);
    expect(result[0].claudeAnalysis).toBe(defaultClaudeAnalysis);
    expect(result[1].claudeAnalysis).toBeNull();
  });

  it('preserves all other listing fields unchanged', async () => {
    const listing = makeAnalyzedListing({
      externalId: 'preserve-test',
      title: 'Test Item',
      askingPrice: 500,
    });
    const result = await enrichOpportunitiesWithClaudeTier2([listing]);

    const enriched = result[0];
    expect(enriched.externalId).toBe('preserve-test');
    expect(enriched.title).toBe('Test Item');
    expect(enriched.askingPrice).toBe(500);
    expect(enriched.estimation).toBe(listing.estimation);
  });
});

// ─── formatForStorage() — claudeAnalysis priority (Story 5.1) ─────────────────

describe('formatForStorage() - claudeAnalysis priority (Story 5.1)', () => {
  const baseSellabilityAnalysis = {
    verifiedMarketValue: 400,
    trueDiscountPercent: 55,
    sellabilityScore: 85,
    demandLevel: 'high' as const,
    expectedDaysToSell: 7,
    authenticityRisk: 'low' as const,
    conditionRisk: 'low' as const,
    recommendedOfferPrice: 175,
    recommendedListPrice: 350,
    resaleStrategy: 'Sell on eBay',
    resalePlatform: 'eBay',
    comparableSales: [],
    confidence: 'medium' as const,
    reasoning: 'Sellability reasoning',
    meetsThreshold: true,
  };

  it('uses claudeAnalysis confidence/reasoning when claudeAnalysis is set', () => {
    const listing = makeAnalyzedListing({
      sellabilityAnalysis: baseSellabilityAnalysis,
      claudeAnalysis: defaultClaudeAnalysis,
    });
    const stored = formatForStorage(listing);
    expect(stored.analysisConfidence).toBe('high');
    expect(stored.analysisReasoning).toBe('High demand Apple product with strong resale value');
  });

  it('falls back to sellabilityAnalysis confidence/reasoning when claudeAnalysis is null', () => {
    const listing = makeAnalyzedListing({
      sellabilityAnalysis: baseSellabilityAnalysis,
      claudeAnalysis: null,
    });
    const stored = formatForStorage(listing);
    expect(stored.analysisConfidence).toBe('medium');
    expect(stored.analysisReasoning).toBe('Sellability reasoning');
  });

  it('returns null for both when claudeAnalysis and sellabilityAnalysis are both null', () => {
    const listing = makeAnalyzedListing({ claudeAnalysis: null });
    const stored = formatForStorage(listing);
    expect(stored.analysisConfidence).toBeNull();
    expect(stored.analysisReasoning).toBeNull();
  });

  it('uses claudeAnalysis over sellabilityAnalysis even when sellabilityAnalysis has higher confidence', () => {
    const listing = makeAnalyzedListing({
      sellabilityAnalysis: { ...baseSellabilityAnalysis, confidence: 'high', reasoning: 'Sell reasoning' },
      claudeAnalysis: { ...defaultClaudeAnalysis, confidence: 'low', reasoning: 'Claude reasoning' },
    });
    const stored = formatForStorage(listing);
    expect(stored.analysisConfidence).toBe('low');
    expect(stored.analysisReasoning).toBe('Claude reasoning');
  });
});

// ─── formatForStorage() — comp match fields (Story 5.2) ──────────────────────

describe('formatForStorage() - comp match fields (Story 5.2)', () => {
  const fakeCompResult = {
    comps: [
      {
        title: 'Sony WH-1000XM5',
        soldPrice: 180,
        soldDate: new Date('2024-10-15'),
        condition: 'Used',
        platform: 'ebay' as const,
        url: 'https://www.ebay.com/itm/1234',
      },
    ],
    confidence: 'low' as const,
    insufficientData: false,
    totalFetched: 3,
    searchQuery: 'Sony WH-1000XM5',
  };

  const baseVerifiedPriceWithComps = {
    verifiedMarketValue: 300,
    trueDiscountPercent: 50,
    marketDataSource: 'ebay_sold',
    marketDataDate: new Date(),
    confidence: 'high' as const,
    dataPoints: 5,
    soldPriceRange: { min: 250, max: 350, median: 300, average: 300 },
    comparableSalesJson: '[{"price":300}]',
  };

  it('maps compMatches.comps to comparableSalesJson as JSON string', () => {
    const listing = makeAnalyzedListing({ compMatches: fakeCompResult });
    const stored = formatForStorage(listing);
    expect(stored.comparableSalesJson).toBe(JSON.stringify(fakeCompResult.comps));
  });

  it('maps compMatches.confidence to compMatchConfidence', () => {
    const listing = makeAnalyzedListing({ compMatches: fakeCompResult });
    const stored = formatForStorage(listing);
    expect(stored.compMatchConfidence).toBe('low');
  });

  it('maps high confidence correctly', () => {
    const listing = makeAnalyzedListing({
      compMatches: { ...fakeCompResult, confidence: 'high' as const },
    });
    const stored = formatForStorage(listing);
    expect(stored.compMatchConfidence).toBe('high');
  });

  it('sets compMatchConfidence=null when compMatches is null', () => {
    const listing = makeAnalyzedListing({ compMatches: null });
    const stored = formatForStorage(listing);
    expect(stored.compMatchConfidence).toBeNull();
  });

  it('falls back to verifiedPrice.comparableSalesJson when compMatches is null', () => {
    const listing = makeAnalyzedListing({
      compMatches: null,
      verifiedPrice: baseVerifiedPriceWithComps,
    });
    const stored = formatForStorage(listing);
    expect(stored.comparableSalesJson).toBe('[{"price":300}]');
  });

  it('sets comparableSalesJson=null when compMatches is null and verifiedPrice has no comps', () => {
    const listing = makeAnalyzedListing({ compMatches: null });
    const stored = formatForStorage(listing);
    expect(stored.comparableSalesJson).toBeNull();
  });

  it('compMatches.comps overrides verifiedPrice.comparableSalesJson', () => {
    const listing = makeAnalyzedListing({
      compMatches: fakeCompResult,
      verifiedPrice: baseVerifiedPriceWithComps,
    });
    const stored = formatForStorage(listing);
    expect(stored.comparableSalesJson).toBe(JSON.stringify(fakeCompResult.comps));
    expect(stored.comparableSalesJson).not.toBe('[{"price":300}]');
  });
});

// ─── formatForStorage() — completeness & seller reputation fields (Story 5.4) ──

describe('formatForStorage() - completeness and seller reputation fields (Story 5.4)', () => {
  const fakeCompleteness = {
    completenessLabel: 'Missing charger',
    hasOriginalPackaging: false,
    missingParts: ['charger'],
    cosmeticDamage: null,
    functionalDamage: null,
    analysisConfidence: 'high' as const,
  };

  const fakeSellerReputation = {
    sellerRating: 98.5,
    sellerReviewCount: 800,
    sellerAccountAgeDays: null,
    isLowReputation: false,
    riskEscalation: false,
  };

  it('maps completenessAnalysis.completenessLabel to completenessLabel', () => {
    const listing = makeAnalyzedListing({ completenessAnalysis: fakeCompleteness });
    const stored = formatForStorage(listing);
    expect(stored.completenessLabel).toBe('Missing charger');
  });

  it('sets completenessLabel=null when completenessAnalysis is null', () => {
    const listing = makeAnalyzedListing({ completenessAnalysis: null });
    const stored = formatForStorage(listing);
    expect(stored.completenessLabel).toBeNull();
  });

  it('sets completenessLabel=null when completenessAnalysis is undefined', () => {
    const listing = makeAnalyzedListing({});
    const stored = formatForStorage(listing);
    expect(stored.completenessLabel).toBeNull();
  });

  it('maps sellerReputation.sellerRating to sellerRating', () => {
    const listing = makeAnalyzedListing({ sellerReputation: fakeSellerReputation });
    const stored = formatForStorage(listing);
    expect(stored.sellerRating).toBe(98.5);
  });

  it('falls back to listing.sellerRating when sellerReputation is null (skip-platform listing)', () => {
    const listing = makeAnalyzedListing({
      sellerRating: 4.8,
      sellerReputation: null,
    });
    const stored = formatForStorage(listing);
    expect(stored.sellerRating).toBe(4.8);
  });

  it('sets sellerRating=null when both sellerReputation and listing.sellerRating are absent', () => {
    const listing = makeAnalyzedListing({});
    const stored = formatForStorage(listing);
    expect(stored.sellerRating).toBeNull();
  });

  it('maps sellerReputation.sellerReviewCount to sellerReviewCount', () => {
    const listing = makeAnalyzedListing({ sellerReputation: fakeSellerReputation });
    const stored = formatForStorage(listing);
    expect(stored.sellerReviewCount).toBe(800);
  });

  it('falls back to listing.sellerReviewCount when sellerReputation is null', () => {
    const listing = makeAnalyzedListing({
      sellerReviewCount: 250,
      sellerReputation: null,
    });
    const stored = formatForStorage(listing);
    expect(stored.sellerReviewCount).toBe(250);
  });

  it('sets sellerReviewCount=null when neither source is available', () => {
    const listing = makeAnalyzedListing({});
    const stored = formatForStorage(listing);
    expect(stored.sellerReviewCount).toBeNull();
  });

  it('reflects escalated authenticityRisk when sellabilityAnalysis was updated by enrichment', () => {
    const escalatedSellability = {
      verifiedMarketValue: 400,
      trueDiscountPercent: 55,
      sellabilityScore: 85,
      demandLevel: 'high' as const,
      expectedDaysToSell: 7,
      authenticityRisk: 'high' as const,  // escalated from 'low' by Story 5.4 enrichment
      conditionRisk: 'low' as const,
      recommendedOfferPrice: 175,
      recommendedListPrice: 350,
      resaleStrategy: 'Sell on eBay',
      resalePlatform: 'eBay',
      comparableSales: [],
      confidence: 'high' as const,
      reasoning: 'Strong demand',
      meetsThreshold: true,
    };
    const listing = makeAnalyzedListing({ sellabilityAnalysis: escalatedSellability });
    const stored = formatForStorage(listing);
    expect(stored.authenticityRisk).toBe('high');
  });

  it('sets authenticityRisk=high via riskEscalation even when sellabilityAnalysis is null (AC #4 — LLM not configured)', () => {
    // Critical path: low-reputation seller flagged but LLM analysis never ran.
    // formatForStorage() reads sellerReputation.riskEscalation directly rather than relying
    // on sellabilityAnalysis having been mutated (which enrichWithCompletenessAndReputation
    // cannot do when sellabilityAnalysis is null).
    const listing = makeAnalyzedListing({
      sellabilityAnalysis: null,
      sellerReputation: { ...fakeSellerReputation, isLowReputation: true, riskEscalation: true, sellerRating: 93 },
    });
    const stored = formatForStorage(listing);
    expect(stored.authenticityRisk).toBe('high');
  });

  it('returns authenticityRisk=null when riskEscalation is false and sellabilityAnalysis is null', () => {
    const listing = makeAnalyzedListing({ sellabilityAnalysis: null, sellerReputation: fakeSellerReputation });
    const stored = formatForStorage(listing);
    expect(stored.authenticityRisk).toBeNull();
  });

  it('returns authenticityRisk from sellabilityAnalysis when riskEscalation is false', () => {
    const sellabilityWithMediumRisk = {
      verifiedMarketValue: 300,
      trueDiscountPercent: 50,
      sellabilityScore: 75,
      demandLevel: 'medium' as const,
      expectedDaysToSell: 14,
      authenticityRisk: 'medium' as const,
      conditionRisk: 'low' as const,
      recommendedOfferPrice: 120,
      recommendedListPrice: 280,
      resaleStrategy: 'Sell on eBay',
      resalePlatform: 'eBay',
      comparableSales: [],
      confidence: 'medium' as const,
      reasoning: 'Moderate demand',
      meetsThreshold: true,
    };
    const listing = makeAnalyzedListing({
      sellabilityAnalysis: sellabilityWithMediumRisk,
      sellerReputation: fakeSellerReputation,  // riskEscalation: false
    });
    const stored = formatForStorage(listing);
    expect(stored.authenticityRisk).toBe('medium');
  });
});

// ─── enrichWithCompletenessAndReputation() — Story 5.4 ────────────────────────

const defaultCompletenessAnalysis = {
  completenessLabel: 'Complete with box',
  hasOriginalPackaging: true,
  missingParts: [],
  cosmeticDamage: null,
  functionalDamage: null,
  analysisConfidence: 'high' as const,
};

const defaultSellerReputation = {
  sellerRating: 99.5,
  sellerReviewCount: 1200,
  sellerAccountAgeDays: null,
  isLowReputation: false,
  riskEscalation: false,
};

const lowReputationSeller = {
  ...defaultSellerReputation,
  sellerRating: 94.0,
  isLowReputation: true,
  riskEscalation: true,
};

const baseSellabilityForReputation = {
  verifiedMarketValue: 400,
  trueDiscountPercent: 55,
  sellabilityScore: 85,
  demandLevel: 'high' as const,
  expectedDaysToSell: 7,
  authenticityRisk: 'low' as const,
  conditionRisk: 'low' as const,
  recommendedOfferPrice: 175,
  recommendedListPrice: 350,
  resaleStrategy: 'Sell on eBay',
  resalePlatform: 'eBay',
  comparableSales: [],
  confidence: 'high' as const,
  reasoning: 'Strong demand',
  meetsThreshold: true,
};

describe('enrichWithCompletenessAndReputation()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyzeItemCompleteness.mockResolvedValue(defaultCompletenessAnalysis);
    mockAnalyzeSellerReputation.mockReturnValue(defaultSellerReputation);
  });

  it('returns empty array for empty input', async () => {
    const result = await enrichWithCompletenessAndReputation([]);
    expect(result).toEqual([]);
    expect(mockAnalyzeItemCompleteness).not.toHaveBeenCalled();
    expect(mockAnalyzeSellerReputation).not.toHaveBeenCalled();
  });

  it('calls analyzeItemCompleteness with correct args', async () => {
    const listing = makeAnalyzedListing({
      imageUrls: ['https://example.com/img.jpg'],
      description: 'Good condition',
      category: 'electronics',
    });

    await enrichWithCompletenessAndReputation([listing]);

    expect(mockAnalyzeItemCompleteness).toHaveBeenCalledWith(
      ['https://example.com/img.jpg'],
      listing.title,
      'Good condition',
      'electronics'
    );
  });

  it('passes empty array to analyzeItemCompleteness when imageUrls is undefined', async () => {
    const listing = makeAnalyzedListing({ imageUrls: undefined });
    await enrichWithCompletenessAndReputation([listing]);

    expect(mockAnalyzeItemCompleteness).toHaveBeenCalledWith(
      [],
      expect.any(String),
      expect.anything(),
      expect.any(String)
    );
  });

  it('calls analyzeSellerReputation with correct args', async () => {
    const listing = makeAnalyzedListing({
      platform: 'EBAY',
      sellerRating: 99.2,
      sellerReviewCount: 500,
      sellerAccountAgeDays: null,
    });

    await enrichWithCompletenessAndReputation([listing]);

    expect(mockAnalyzeSellerReputation).toHaveBeenCalledWith('EBAY', 99.2, 500, null);
  });

  it('sets completenessAnalysis on the enriched listing', async () => {
    const listing = makeAnalyzedListing();
    const [enriched] = await enrichWithCompletenessAndReputation([listing]);
    expect(enriched.completenessAnalysis).toBe(defaultCompletenessAnalysis);
  });

  it('sets sellerReputation on the enriched listing', async () => {
    const listing = makeAnalyzedListing();
    const [enriched] = await enrichWithCompletenessAndReputation([listing]);
    expect(enriched.sellerReputation).toBe(defaultSellerReputation);
  });

  it('sets completenessAnalysis=null when analyzeItemCompleteness returns null', async () => {
    mockAnalyzeItemCompleteness.mockResolvedValue(null);
    const listing = makeAnalyzedListing();
    const [enriched] = await enrichWithCompletenessAndReputation([listing]);
    expect(enriched.completenessAnalysis).toBeNull();
  });

  it('sets sellerReputation=null when analyzeSellerReputation returns null (skip platform)', async () => {
    mockAnalyzeSellerReputation.mockReturnValue(null);
    const listing = makeAnalyzedListing({ platform: 'CRAIGSLIST' });
    const [enriched] = await enrichWithCompletenessAndReputation([listing]);
    expect(enriched.sellerReputation).toBeNull();
  });

  it('escalates authenticityRisk to "high" when riskEscalation=true and sellabilityAnalysis exists', async () => {
    mockAnalyzeSellerReputation.mockReturnValue(lowReputationSeller);
    const listing = makeAnalyzedListing({
      sellabilityAnalysis: { ...baseSellabilityForReputation, authenticityRisk: 'low' },
    });

    const [enriched] = await enrichWithCompletenessAndReputation([listing]);

    expect(enriched.sellabilityAnalysis?.authenticityRisk).toBe('high');
  });

  it('does NOT escalate when riskEscalation=false', async () => {
    mockAnalyzeSellerReputation.mockReturnValue({ ...defaultSellerReputation, riskEscalation: false });
    const listing = makeAnalyzedListing({
      sellabilityAnalysis: { ...baseSellabilityForReputation, authenticityRisk: 'low' },
    });

    const [enriched] = await enrichWithCompletenessAndReputation([listing]);

    expect(enriched.sellabilityAnalysis?.authenticityRisk).toBe('low');
  });

  it('does NOT escalate when sellabilityAnalysis is null (no data to escalate)', async () => {
    mockAnalyzeSellerReputation.mockReturnValue(lowReputationSeller);
    const listing = makeAnalyzedListing({ sellabilityAnalysis: null });

    const [enriched] = await enrichWithCompletenessAndReputation([listing]);

    // sellabilityAnalysis stays null — no escalation possible
    expect(enriched.sellabilityAnalysis).toBeNull();
  });

  it('returns original listing unchanged when an error is thrown', async () => {
    mockAnalyzeItemCompleteness.mockRejectedValue(new Error('OpenAI timeout'));
    const listing = makeAnalyzedListing({ externalId: 'err-listing' });

    const [result] = await enrichWithCompletenessAndReputation([listing]);

    expect(result.externalId).toBe('err-listing');
    expect(result.completenessAnalysis).toBeUndefined();
    expect(result.sellerReputation).toBeUndefined();
  });

  it('processes multiple listings and returns all enriched', async () => {
    const listing1 = makeAnalyzedListing({ externalId: 'a' });
    const listing2 = makeAnalyzedListing({ externalId: 'b' });

    const result = await enrichWithCompletenessAndReputation([listing1, listing2]);

    expect(result).toHaveLength(2);
    expect(result[0].externalId).toBe('a');
    expect(result[1].externalId).toBe('b');
    expect(mockAnalyzeItemCompleteness).toHaveBeenCalledTimes(2);
    expect(mockAnalyzeSellerReputation).toHaveBeenCalledTimes(2);
  });

  it('preserves all original listing fields', async () => {
    const listing = makeAnalyzedListing({ title: 'MacBook Pro', askingPrice: 999 });
    const [enriched] = await enrichWithCompletenessAndReputation([listing]);

    expect(enriched.title).toBe('MacBook Pro');
    expect(enriched.askingPrice).toBe(999);
    expect(enriched.estimation).toBe(listing.estimation);
  });
});

// ─── enrichWithDemandAnalysis() ───────────────────────────────────────────────

describe('enrichWithDemandAnalysis()', () => {
  const fakeDemandResult = {
    soldVolume30Days: 10,
    soldVolume60Days: 18,
    soldVolume90Days: 22,
    demandTrend: 'stable' as const,
    isLowLiquidity: false,
    analysisDate: new Date(),
  };

  const fakeSoldListings = [
    { title: 'Item A', price: 100, condition: 'Used', url: null, soldDate: null },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchMarketPrice.mockResolvedValue({
      verifiedMarketValue: 300,
      salesCount: 5,
      soldListings: fakeSoldListings,
    });
    mockAnalyzeDemandTrend.mockReturnValue(fakeDemandResult);
  });

  it('returns empty array for empty input', async () => {
    const result = await enrichWithDemandAnalysis([]);
    expect(result).toEqual([]);
  });

  it('attaches demandAnalysis from analyzeDemandTrend when fetchMarketPrice returns data', async () => {
    const listing = makeAnalyzedListing({ title: 'MacBook Pro' });
    const result = await enrichWithDemandAnalysis([listing]);

    expect(result).toHaveLength(1);
    expect(mockFetchMarketPrice).toHaveBeenCalledWith('MacBook Pro', 'electronics');
    expect(mockAnalyzeDemandTrend).toHaveBeenCalledWith(fakeSoldListings);
    expect(result[0].demandAnalysis).toEqual(fakeDemandResult);
  });

  it('sets demandAnalysis to null when fetchMarketPrice returns null', async () => {
    mockFetchMarketPrice.mockResolvedValue(null);
    const listing = makeAnalyzedListing();
    const result = await enrichWithDemandAnalysis([listing]);

    expect(result[0].demandAnalysis).toBeNull();
    expect(mockAnalyzeDemandTrend).not.toHaveBeenCalled();
  });

  it('sets demandAnalysis to null when fetchMarketPrice returns no soldListings', async () => {
    mockFetchMarketPrice.mockResolvedValue({ verifiedMarketValue: 300, salesCount: 0, soldListings: null });
    const listing = makeAnalyzedListing();
    const result = await enrichWithDemandAnalysis([listing]);

    expect(result[0].demandAnalysis).toBeNull();
  });

  it('reuses comparableSalesJson from verifiedPrice when array length >= 5', async () => {
    const parsedSales = Array.from({ length: 5 }, (_, i) => ({
      title: `Item ${i}`, price: 100, condition: null, url: null, soldDate: null,
    }));
    const listing = makeAnalyzedListing({
      verifiedPrice: {
        verifiedMarketValue: 350,
        trueDiscountPercent: 50,
        marketDataSource: 'ebay_sold',
        marketDataDate: new Date(),
        comparableSalesJson: JSON.stringify(parsedSales),
        compMatchConfidence: null,
        comparableCount: 5,
      },
    });
    const result = await enrichWithDemandAnalysis([listing]);

    // Should NOT call fetchMarketPrice — already has data
    expect(mockFetchMarketPrice).not.toHaveBeenCalled();
    expect(mockAnalyzeDemandTrend).toHaveBeenCalledWith(parsedSales);
    expect(result[0].demandAnalysis).toEqual(fakeDemandResult);
  });

  it('falls back to fetchMarketPrice when comparableSalesJson has < 5 items', async () => {
    const parsedSales = [{ title: 'Item 1', price: 100, condition: null, url: null, soldDate: null }];
    const listing = makeAnalyzedListing({
      verifiedPrice: {
        verifiedMarketValue: 350,
        trueDiscountPercent: 50,
        marketDataSource: 'ebay_sold',
        marketDataDate: new Date(),
        comparableSalesJson: JSON.stringify(parsedSales),
        compMatchConfidence: null,
        comparableCount: 1,
      },
    });
    await enrichWithDemandAnalysis([listing]);

    expect(mockFetchMarketPrice).toHaveBeenCalled();
  });

  it('sets demandAnalysis to null on fetch error and continues', async () => {
    const listing1 = makeAnalyzedListing({ externalId: 'ok', title: 'iPhone' });
    const listing2 = makeAnalyzedListing({ externalId: 'fail', title: 'Error Item' });

    mockFetchMarketPrice
      .mockResolvedValueOnce({ soldListings: fakeSoldListings, salesCount: 5 })
      .mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await enrichWithDemandAnalysis([listing1, listing2]);
    consoleSpy.mockRestore();

    expect(result).toHaveLength(2);
    expect(result[0].demandAnalysis).toEqual(fakeDemandResult);
    expect(result[1].demandAnalysis).toBeNull();
  });

  it('processes multiple listings independently', async () => {
    const demandA = { ...fakeDemandResult, soldVolume30Days: 5, demandTrend: 'rising' as const };
    const demandB = { ...fakeDemandResult, soldVolume30Days: 1, demandTrend: 'declining' as const };
    const soldA = [{ title: 'A', price: 100, condition: null, url: null, soldDate: null }];
    const soldB = [{ title: 'B', price: 200, condition: null, url: null, soldDate: null }];

    mockFetchMarketPrice
      .mockResolvedValueOnce({ soldListings: soldA, salesCount: 5 })
      .mockResolvedValueOnce({ soldListings: soldB, salesCount: 3 });
    mockAnalyzeDemandTrend
      .mockReturnValueOnce(demandA)
      .mockReturnValueOnce(demandB);

    const listing1 = makeAnalyzedListing({ externalId: 'a', title: 'iPhone 14' });
    const listing2 = makeAnalyzedListing({ externalId: 'b', title: 'MacBook Air' });
    const result = await enrichWithDemandAnalysis([listing1, listing2]);

    expect(result[0].demandAnalysis).toEqual(demandA);
    expect(result[1].demandAnalysis).toEqual(demandB);
  });
});

// ─── enrichWithCompMatches() ──────────────────────────────────────────────────

describe('enrichWithCompMatches()', () => {
  const fakeCompResult = {
    comps: [
      {
        title: 'Sony WH-1000XM5',
        soldPrice: 180,
        soldDate: new Date('2024-10-15'),
        condition: 'Used',
        platform: 'ebay',
        url: 'https://www.ebay.com/itm/1234',
      },
    ],
    confidence: 'low' as const,
    insufficientData: false,
    totalFetched: 1,
    searchQuery: 'Sony WH-1000XM5',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindComparableSales.mockResolvedValue(fakeCompResult);
  });

  it('returns empty array for empty input', async () => {
    const result = await enrichWithCompMatches([]);
    expect(result).toEqual([]);
  });

  it('attaches compMatches from findComparableSales', async () => {
    const listing = makeAnalyzedListing({
      title: 'Sony WH-1000XM5',
      llmIdentification: {
        searchQuery: 'Sony WH-1000XM5',
        brand: 'Sony',
        model: 'WH-1000XM5',
        category: 'electronics',
        worthInvestigating: true,
        estimatedValue: 200,
        confidence: 'high',
        reasoning: 'Popular headphones',
      },
    });

    const result = await enrichWithCompMatches([listing]);

    expect(result).toHaveLength(1);
    expect(mockFindComparableSales).toHaveBeenCalledWith(
      'Sony WH-1000XM5',
      'Sony',
      'WH-1000XM5',
      'electronics',
      undefined
    );
    expect(result[0].compMatches).toEqual(fakeCompResult);
  });

  it('falls back to listing title when llmIdentification is absent', async () => {
    const listing = makeAnalyzedListing({ title: 'Vintage Camera', category: 'cameras' });

    await enrichWithCompMatches([listing]);

    expect(mockFindComparableSales).toHaveBeenCalledWith(
      'Vintage Camera',
      null,
      null,
      'cameras',
      undefined
    );
  });

  it('passes rawSoldListings from verifiedPrice to avoid duplicate Playwright call', async () => {
    const rawSoldListings = [
      { title: 'Sony WH-1000XM5', price: 175, condition: 'Used', url: null, soldDate: null },
    ];
    const listing = makeAnalyzedListing({
      verifiedPrice: {
        verifiedMarketValue: 200,
        trueDiscountPercent: 50,
        marketDataSource: 'ebay_sold',
        marketDataDate: new Date(),
        comparableSalesJson: null,
        compMatchConfidence: null,
        comparableCount: 0,
        rawSoldListings,
      } as AnalyzedListing['verifiedPrice'],
    });

    await enrichWithCompMatches([listing]);

    expect(mockFindComparableSales).toHaveBeenCalledWith(
      expect.any(String),
      null,
      null,
      expect.any(String),
      rawSoldListings
    );
  });

  it('sets compMatches to null on error and continues processing', async () => {
    const listing1 = makeAnalyzedListing({ externalId: 'ok', title: 'iPhone 14' });
    const listing2 = makeAnalyzedListing({ externalId: 'fail', title: 'Bad Item' });

    mockFindComparableSales
      .mockResolvedValueOnce(fakeCompResult)
      .mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await enrichWithCompMatches([listing1, listing2]);
    consoleSpy.mockRestore();

    expect(result).toHaveLength(2);
    expect(result[0].compMatches).toEqual(fakeCompResult);
    expect(result[1].compMatches).toBeNull();
  });

  it('processes multiple listings independently', async () => {
    const compA = { ...fakeCompResult, searchQuery: 'iPhone 14' };
    const compB = { ...fakeCompResult, searchQuery: 'MacBook Air', confidence: 'high' as const };

    mockFindComparableSales
      .mockResolvedValueOnce(compA)
      .mockResolvedValueOnce(compB);

    const listing1 = makeAnalyzedListing({ externalId: 'a', title: 'iPhone 14' });
    const listing2 = makeAnalyzedListing({ externalId: 'b', title: 'MacBook Air' });
    const result = await enrichWithCompMatches([listing1, listing2]);

    expect(result[0].compMatches).toEqual(compA);
    expect(result[1].compMatches).toEqual(compB);
  });
});

// ─── Story 5.5: enrichWithLogisticsAnalysis() ────────────────────────────────

const fakeLogisticsResult = {
  sizeCategory: 'small_shippable' as const,
  shippingEstimates: { usps: 10, ups: 14, fedex: 15, lowestCost: 10, currency: 'USD' },
  estimatedShippingCost: 10,
  pickupDistanceMiles: null,
  outsidePickupRadius: false,
  adjustedProfitMargin: 190,
  estimatedWeightLbs: 3,
  analysisDate: new Date('2026-01-01'),
};

describe('enrichWithLogisticsAnalysis()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array for empty input', async () => {
    const result = await enrichWithLogisticsAnalysis([], null, 50);
    expect(result).toEqual([]);
    expect(mockAnalyzeLogistics).not.toHaveBeenCalled();
  });

  it('attaches logisticsAnalysis to each listing', async () => {
    mockAnalyzeLogistics.mockResolvedValue(fakeLogisticsResult);
    const listing = makeAnalyzedListing({ externalId: 'L1' });

    const result = await enrichWithLogisticsAnalysis([listing], 'Tampa, FL', 50);

    expect(result).toHaveLength(1);
    expect(result[0].logisticsAnalysis).toEqual(fakeLogisticsResult);
  });

  it('passes userLocation and maxPickupRadiusMiles to analyzeLogistics', async () => {
    mockAnalyzeLogistics.mockResolvedValue(fakeLogisticsResult);
    const listing = makeAnalyzedListing();

    await enrichWithLogisticsAnalysis([listing], 'Austin, TX', 30);

    expect(mockAnalyzeLogistics).toHaveBeenCalledWith(listing, 'Austin, TX', 30);
  });

  it('uses default maxPickupRadiusMiles of 50 when not provided', async () => {
    mockAnalyzeLogistics.mockResolvedValue(fakeLogisticsResult);
    const listing = makeAnalyzedListing();

    await enrichWithLogisticsAnalysis([listing], null);

    expect(mockAnalyzeLogistics).toHaveBeenCalledWith(listing, null, 50);
  });

  it('processes listings sequentially (one analyzeLogistics call per listing)', async () => {
    const logisticsA = { ...fakeLogisticsResult, estimatedShippingCost: 8 };
    const logisticsB = { ...fakeLogisticsResult, estimatedShippingCost: 15 };

    mockAnalyzeLogistics
      .mockResolvedValueOnce(logisticsA)
      .mockResolvedValueOnce(logisticsB);

    const listing1 = makeAnalyzedListing({ externalId: 'a' });
    const listing2 = makeAnalyzedListing({ externalId: 'b' });
    const result = await enrichWithLogisticsAnalysis([listing1, listing2], null, 50);

    expect(mockAnalyzeLogistics).toHaveBeenCalledTimes(2);
    expect(result[0].logisticsAnalysis).toEqual(logisticsA);
    expect(result[1].logisticsAnalysis).toEqual(logisticsB);
  });

  it('sets logisticsAnalysis to null on per-listing error and continues processing', async () => {
    mockAnalyzeLogistics
      .mockResolvedValueOnce(fakeLogisticsResult)
      .mockRejectedValueOnce(new Error('API timeout'));

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const listing1 = makeAnalyzedListing({ externalId: 'ok' });
    const listing2 = makeAnalyzedListing({ externalId: 'fail' });

    const result = await enrichWithLogisticsAnalysis([listing1, listing2], null, 50);
    consoleSpy.mockRestore();

    expect(result).toHaveLength(2);
    expect(result[0].logisticsAnalysis).toEqual(fakeLogisticsResult);
    expect(result[1].logisticsAnalysis).toBeNull();
  });

  it('preserves all other listing fields when attaching logisticsAnalysis', async () => {
    mockAnalyzeLogistics.mockResolvedValue(fakeLogisticsResult);
    const listing = makeAnalyzedListing({ externalId: 'keep-fields', title: 'Test Item', askingPrice: 99 });

    const result = await enrichWithLogisticsAnalysis([listing], null, 50);

    expect(result[0].externalId).toBe('keep-fields');
    expect(result[0].title).toBe('Test Item');
    expect(result[0].askingPrice).toBe(99);
  });
});

// ─── Story 5.5: formatForStorage() logistics fields ──────────────────────────

describe('formatForStorage() — logistics fields', () => {
  it('uses logisticsAnalysis.sizeCategory when present', () => {
    const listing = makeAnalyzedListing({
      logisticsAnalysis: { ...fakeLogisticsResult, sizeCategory: 'large_local_only' as const },
    });

    const stored = formatForStorage(listing);
    expect(stored.sizeCategory).toBe('large_local_only');
  });

  it('sets sizeCategory to null when logisticsAnalysis is absent', () => {
    const listing = makeAnalyzedListing({ logisticsAnalysis: undefined });
    const stored = formatForStorage(listing);
    expect(stored.sizeCategory).toBeNull();
  });

  it('serializes shippingEstimates to JSON when present', () => {
    const listing = makeAnalyzedListing({ logisticsAnalysis: fakeLogisticsResult });
    const stored = formatForStorage(listing);
    expect(stored.shippingEstimatesJson).toBe(JSON.stringify(fakeLogisticsResult.shippingEstimates));
  });

  it('sets shippingEstimatesJson to null when shippingEstimates is null', () => {
    const listing = makeAnalyzedListing({
      logisticsAnalysis: { ...fakeLogisticsResult, shippingEstimates: null },
    });
    const stored = formatForStorage(listing);
    expect(stored.shippingEstimatesJson).toBeNull();
  });

  it('overrides estimation.shippable with false when sizeCategory is large_local_only', () => {
    const listing = makeAnalyzedListing({
      logisticsAnalysis: { ...fakeLogisticsResult, sizeCategory: 'large_local_only' as const },
      estimation: { ...makeAnalyzedListing().estimation, shippable: true },
    });

    const stored = formatForStorage(listing);
    expect(stored.shippable).toBe(false);
  });

  it('overrides estimation.shippable with true when sizeCategory is small_shippable', () => {
    const listing = makeAnalyzedListing({
      logisticsAnalysis: { ...fakeLogisticsResult, sizeCategory: 'small_shippable' as const },
      estimation: { ...makeAnalyzedListing().estimation, shippable: false },
    });

    const stored = formatForStorage(listing);
    expect(stored.shippable).toBe(true);
  });

  it('falls back to estimation.shippable when logisticsAnalysis is absent', () => {
    const listing = makeAnalyzedListing({
      logisticsAnalysis: undefined,
      estimation: { ...makeAnalyzedListing().estimation, shippable: false },
    });

    const stored = formatForStorage(listing);
    expect(stored.shippable).toBe(false);
  });

  it('stores adjustedProfitMargin from logisticsAnalysis', () => {
    const listing = makeAnalyzedListing({
      logisticsAnalysis: { ...fakeLogisticsResult, adjustedProfitMargin: 175 },
    });

    const stored = formatForStorage(listing);
    expect(stored.adjustedProfitMargin).toBe(175);
  });

  it('stores outsidePickupRadius from logisticsAnalysis', () => {
    const listing = makeAnalyzedListing({
      logisticsAnalysis: { ...fakeLogisticsResult, outsidePickupRadius: true },
    });

    const stored = formatForStorage(listing);
    expect(stored.outsidePickupRadius).toBe(true);
  });

  it('stores estimatedWeight from logisticsAnalysis.estimatedWeightLbs', () => {
    const listing = makeAnalyzedListing({
      logisticsAnalysis: { ...fakeLogisticsResult, estimatedWeightLbs: 12 },
    });

    const stored = formatForStorage(listing);
    expect(stored.estimatedWeight).toBe(12);
  });
});

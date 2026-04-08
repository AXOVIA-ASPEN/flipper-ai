/**
 * @file src/__tests__/lib/listing-price-calculator.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Unit tests for the optimal listing price calculator (Story 9.2).
 *
 * @description
 * Validates the price formula, fee/margin guards, market-cap behaviour,
 * free-item fallback, projected pricing for pre-purchase items, multi-
 * platform comparison, and the LLM-vs-formula discrepancy note. Mocks the
 * Prisma singleton at @/lib/db so the calculator can be exercised in
 * isolation without a database.
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findFirst: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
    },
  },
}));

import {
  calculateOptimalListingPrice,
  calculateMultiPlatformPrices,
  DEFAULT_MARKET_CAP_PERCENT,
  DEFAULT_TARGET_MARGIN_PERCENT,
  type ListingPriceResult,
} from '@/lib/listing-price-calculator';
import prisma from '@/lib/db';
import { ValidationError, ConfigurationError, NotFoundError } from '@/lib/errors';

const mockListingFindFirst = prisma.listing.findFirst as jest.Mock;
const mockSettingsFindUnique = prisma.userSettings.findUnique as jest.Mock;

const DEFAULT_SETTINGS = {
  feeRateEbay: 13.0,
  feeRateMercari: 10.0,
  feeRateFacebook: 5.0,
  feeRateOfferup: 12.9,
  feeRateCraigslist: 0.0,
};

const baseListing = {
  id: 'listing-1',
  userId: 'user-1',
  askingPrice: 60,
  estimatedShippingCost: 8,
  verifiedMarketValue: 200,
  estimatedValue: 180,
  recommendedList: 105,
  compMatchConfidence: 'high',
  opportunity: {
    purchasePrice: 50,
    status: 'PURCHASED',
  },
};

function mockListing(overrides: Record<string, unknown> = {}) {
  mockListingFindFirst.mockResolvedValue({
    ...baseListing,
    ...overrides,
    opportunity: {
      ...baseListing.opportunity,
      ...((overrides.opportunity as Record<string, unknown>) ?? {}),
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSettingsFindUnique.mockResolvedValue(DEFAULT_SETTINGS);
});

describe('calculateOptimalListingPrice', () => {
  test('computes price for known inputs (ebay 13% fee, 30% margin, $50 + $8 shipping)', async () => {
    mockListing();
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    // ($50 + $8) / (1 - 0.13 - 0.30) = $58 / 0.57 ≈ $101.75
    // BUT verifiedMarketValue cap at 95% of $200 = $190 → no cap applied since 101.75 < 190
    expect(result.recommendedPrice).toBeCloseTo(101.75, 1);
    expect(result.estimatedFees).toBeCloseTo(13.23, 1);
    expect(result.estimatedProfit).toBeCloseTo(30.52, 1);
    expect(result.feeRatePercent).toBe(13);
    expect(result.targetMarginPercent).toBe(30);
    expect(result.costBasis).toBe(58);
    expect(result.isProjected).toBe(false);
    expect(result.lossWarning).toBe(false);
  });

  test('reads fee rate from UserSettings (mercari 10%)', async () => {
    mockSettingsFindUnique.mockResolvedValue({ ...DEFAULT_SETTINGS, feeRateMercari: 8.5 });
    mockListing();
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'mercari',
      targetMarginPercent: 30,
    });
    expect(result.feeRatePercent).toBe(8.5);
  });

  test('caps recommended price at 95% of verifiedMarketValue when comp confidence is high', async () => {
    mockListing({ verifiedMarketValue: 90 });
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    // Cap = $90 * 0.95 = $85.50; raw formula would yield ~$101.75
    expect(result.recommendedPrice).toBeCloseTo(85.5, 1);
    expect(result.priceBreakdown.cappedByMarket).toBe(true);
  });

  test('skips market cap when compMatchConfidence is "insufficient"', async () => {
    mockListing({ compMatchConfidence: 'insufficient' });
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    expect(result.priceBreakdown.cappedByMarket).toBe(false);
    expect(result.recommendedPrice).toBeCloseTo(101.75, 1);
  });

  test('falls back to listing.askingPrice and marks projected when no opportunity exists', async () => {
    mockListingFindFirst.mockResolvedValue({
      ...baseListing,
      opportunity: null,
    });
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    expect(result.isProjected).toBe(true);
    expect(result.costBasis).toBe(60 + 8); // askingPrice + shipping
  });

  test('marks projected when opportunity status is IDENTIFIED', async () => {
    mockListing({ opportunity: { purchasePrice: null, status: 'IDENTIFIED' } });
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    expect(result.isProjected).toBe(true);
    expect(result.costBasis).toBe(60 + 8);
  });

  test('throws ValidationError when target margin + fee >= 100%', async () => {
    mockListing();
    await expect(
      calculateOptimalListingPrice({
        listingId: 'listing-1',
        userId: 'user-1',
        targetPlatform: 'ebay',
        targetMarginPercent: 90, // 90 + 13 = 103
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('handles free items ($0 purchase price) with market-based pricing', async () => {
    mockListing({
      verifiedMarketValue: 100,
      opportunity: { purchasePrice: 0, status: 'PURCHASED' },
    });
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    // 100 * (1 - 0.13) * 0.85 = $73.95
    expect(result.recommendedPrice).toBeCloseTo(73.95, 1);
    expect(result.priceBreakdown.freeItemPricing).toBe(true);
  });

  test('flags lossWarning when market cap forces price below cost basis', async () => {
    mockListing({
      verifiedMarketValue: 60, // cap = $57
      opportunity: { purchasePrice: 50, status: 'PURCHASED' },
    });
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    // costBasis = 58, cap = 57 → loss
    expect(result.lossWarning).toBe(true);
    expect(result.priceBreakdown.lossAmount).toBeGreaterThan(0);
  });

  test('throws ConfigurationError when fee rate exceeds 100% after dividing by 100', async () => {
    // someone stored a decimal (0.13) by mistake → after /100 still > 1.0? actually NOT.
    // The guard fires when raw value is > 100 (e.g. 150 becomes 1.5 after /100).
    mockSettingsFindUnique.mockResolvedValue({ ...DEFAULT_SETTINGS, feeRateEbay: 150 });
    mockListing();
    await expect(
      calculateOptimalListingPrice({
        listingId: 'listing-1',
        userId: 'user-1',
        targetPlatform: 'ebay',
        targetMarginPercent: 30,
      })
    ).rejects.toBeInstanceOf(ConfigurationError);
  });

  test('deducts shipping cost from estimated profit', async () => {
    mockListing({ estimatedShippingCost: 12 });
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    expect(result.estimatedShippingCost).toBe(12);
    // profit = price - fees - purchasePrice - shipping
    const expectedProfit =
      result.recommendedPrice - result.estimatedFees - 50 - 12;
    expect(result.estimatedProfit).toBeCloseTo(expectedProfit, 1);
  });

  test('includes priceDiscrepancyNote when LLM price differs >15% from formula', async () => {
    mockListing({ recommendedList: 200 }); // >15% from ~$101.75
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    expect(result.aiRecommendedPrice).toBe(200);
    expect(result.priceBreakdown.priceDiscrepancyNote).toBeTruthy();
  });

  test('omits priceDiscrepancyNote when LLM price is within 15%', async () => {
    mockListing({ recommendedList: 105 });
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    expect(result.priceBreakdown.priceDiscrepancyNote).toBeUndefined();
  });

  test('throws NotFoundError when listing does not exist', async () => {
    mockListingFindFirst.mockResolvedValue(null);
    await expect(
      calculateOptimalListingPrice({
        listingId: 'missing',
        userId: 'user-1',
        targetPlatform: 'ebay',
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test('rounds monetary values to cents', async () => {
    mockListing();
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    expect(result.recommendedPrice).toBe(Math.round(result.recommendedPrice * 100) / 100);
    expect(result.estimatedFees).toBe(Math.round(result.estimatedFees * 100) / 100);
    expect(result.estimatedProfit).toBe(Math.round(result.estimatedProfit * 100) / 100);
  });

  test('uses default target margin when omitted', async () => {
    mockListing();
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
    });
    expect(result.targetMarginPercent).toBe(DEFAULT_TARGET_MARGIN_PERCENT);
  });

  test('zero-fee Craigslist computes correctly', async () => {
    mockListing();
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'craigslist',
      targetMarginPercent: 30,
    });
    // ($50 + $8) / (1 - 0.0 - 0.30) = $58 / 0.70 ≈ $82.86
    // verifiedMarketValue cap = $190; 82.86 < 190 → no cap
    expect(result.feeRatePercent).toBe(0);
    expect(result.recommendedPrice).toBeCloseTo(82.86, 1);
    expect(result.estimatedFees).toBeCloseTo(0, 2);
  });
});

describe('calculateMultiPlatformPrices', () => {
  test('returns one result per platform sorted by highest profit', async () => {
    mockListing();
    const result = await calculateMultiPlatformPrices({
      listingId: 'listing-1',
      userId: 'user-1',
      targetMarginPercent: 30,
    });
    expect(result.prices).toHaveLength(5);
    // Sorted descending by estimated profit
    for (let i = 1; i < result.prices.length; i++) {
      expect(result.prices[i - 1].estimatedProfit).toBeGreaterThanOrEqual(
        result.prices[i].estimatedProfit
      );
    }
    expect(result.bestPlatform).toBe(result.prices[0].targetPlatform);
  });

  test('flags impossible:true on platforms where margin+fee >= 100% rather than throwing', async () => {
    mockListing();
    const result = await calculateMultiPlatformPrices({
      listingId: 'listing-1',
      userId: 'user-1',
      targetMarginPercent: 92, // 92 + 13(ebay) = 105 → impossible
    });
    const ebay = result.prices.find((p) => p.targetPlatform === 'ebay');
    expect(ebay?.impossible).toBe(true);
    const craigslist = result.prices.find((p) => p.targetPlatform === 'craigslist');
    expect(craigslist?.impossible).toBe(false);
  });

  test('exposes isProjected at the top level when listing is pre-purchase', async () => {
    mockListingFindFirst.mockResolvedValue({ ...baseListing, opportunity: null });
    const result = await calculateMultiPlatformPrices({
      listingId: 'listing-1',
      userId: 'user-1',
      targetMarginPercent: 30,
    });
    expect(result.isProjected).toBe(true);
    expect(result.prices.every((p: ListingPriceResult) => p.isProjected)).toBe(true);
  });
});

describe('exported defaults', () => {
  test('DEFAULT_MARKET_CAP_PERCENT is 0.95', () => {
    expect(DEFAULT_MARKET_CAP_PERCENT).toBe(0.95);
  });

  test('DEFAULT_TARGET_MARGIN_PERCENT is 30', () => {
    expect(DEFAULT_TARGET_MARGIN_PERCENT).toBe(30);
  });
});

describe('edge case coverage', () => {
  test('treats null estimatedShippingCost as 0', async () => {
    mockListing({ estimatedShippingCost: null });
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    expect(result.estimatedShippingCost).toBe(0);
    // costBasis = $50 (purchase) + $0 (no shipping)
    expect(result.costBasis).toBe(50);
  });

  test('handles missing recommendedList (no AI price discrepancy check)', async () => {
    mockListing({ recommendedList: null });
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    expect(result.aiRecommendedPrice).toBeNull();
    expect(result.priceBreakdown.priceDiscrepancyNote).toBeUndefined();
  });

  test('falls back to default fee rates when UserSettings row is missing', async () => {
    mockSettingsFindUnique.mockResolvedValue(null);
    mockListing();
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    expect(result.feeRatePercent).toBe(13);
  });

  test('falls back to default fee rates when UserSettings is missing (multi-platform)', async () => {
    mockSettingsFindUnique.mockResolvedValue(null);
    mockListing();
    const result = await calculateMultiPlatformPrices({
      listingId: 'listing-1',
      userId: 'user-1',
      targetMarginPercent: 30,
    });
    expect(result.prices.find((p) => p.targetPlatform === 'mercari')?.feeRatePercent).toBe(10);
  });

  test('multi-platform returns null bestPlatform when every platform is impossible', async () => {
    // Bump every platform's fee high enough that even Craigslist (default 0%)
    // becomes impossible alongside the rest at any margin >= 80%.
    mockSettingsFindUnique.mockResolvedValue({
      feeRateEbay: 50,
      feeRateMercari: 50,
      feeRateFacebook: 50,
      feeRateOfferup: 50,
      feeRateCraigslist: 50,
    });
    mockListing();
    const result = await calculateMultiPlatformPrices({
      listingId: 'listing-1',
      userId: 'user-1',
      targetMarginPercent: 60,
    });
    expect(result.bestPlatform).toBeNull();
    expect(result.prices.every((p) => p.impossible)).toBe(true);
  });

  test('multi-platform impossible row carries through aiRecommendedPrice when null', async () => {
    mockListing({ recommendedList: null });
    const result = await calculateMultiPlatformPrices({
      listingId: 'listing-1',
      userId: 'user-1',
      targetMarginPercent: 99,
    });
    const ebay = result.prices.find((p) => p.targetPlatform === 'ebay');
    expect(ebay?.aiRecommendedPrice).toBeNull();
  });

  test('multi-platform handles CONTACTED status as projected', async () => {
    mockListing({ opportunity: { purchasePrice: null, status: 'CONTACTED' } });
    const result = await calculateMultiPlatformPrices({
      listingId: 'listing-1',
      userId: 'user-1',
      targetMarginPercent: 30,
    });
    expect(result.isProjected).toBe(true);
  });

  test('uses an explicit non-default marketCapPercent when supplied', async () => {
    mockListing({ verifiedMarketValue: 100 });
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
      marketCapPercent: 0.8, // Cap at 80% of market = $80
    });
    expect(result.recommendedPrice).toBeCloseTo(80, 1);
  });

  test('multi-platform passes through explicit marketCapPercent', async () => {
    mockListing({ verifiedMarketValue: 100 });
    const result = await calculateMultiPlatformPrices({
      listingId: 'listing-1',
      userId: 'user-1',
      targetMarginPercent: 30,
      marketCapPercent: 0.5,
    });
    const ebay = result.prices.find((p) => p.targetPlatform === 'ebay');
    expect(ebay?.recommendedPrice).toBeCloseTo(50, 1);
  });

  test('treats null verifiedMarketValue as no market data', async () => {
    mockListing({ verifiedMarketValue: null });
    const result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: 'ebay',
      targetMarginPercent: 30,
    });
    expect(result.verifiedMarketValue).toBeNull();
    expect(result.marketDataAvailable).toBe(false);
    expect(result.priceBreakdown.cappedByMarket).toBe(false);
  });
});

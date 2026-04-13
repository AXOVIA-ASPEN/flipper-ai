/**
 * @file src/__tests__/lib/cross-platform-price.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Unit tests for cross-platform price intelligence service.
 *
 * @description
 * Tests the weighted aggregation, confidence calculation, platform data building,
 * score override logic, and rescue pass functionality.
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock market-price (fetchMarketPrice is the eBay scraper)
const mockFetchMarketPrice = jest.fn();
jest.mock('@/lib/market-price', () => {
  const actual = jest.requireActual('@/lib/market-price') as Record<string, unknown>;
  return {
    ...actual,
    fetchMarketPrice: (...args: unknown[]) => mockFetchMarketPrice(...args),
  };
});

// Mock eBay scraper (Browse API fallback)
jest.mock('@/scrapers/ebay/scraper', () => ({
  fetchSoldListings: jest.fn().mockRejectedValue(new Error('No token')),
  getEbayToken: jest.fn().mockReturnValue('test-token'),
  parseEbayPrice: jest.fn((val: string | undefined) => parseFloat(val || '0')),
}));

// Mock prisma for caching tests
const mockFindMany = jest.fn().mockResolvedValue([] as unknown[]);
const mockCreateMany = jest.fn().mockResolvedValue({ count: 0 });
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    priceHistory: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      createMany: (...args: unknown[]) => mockCreateMany(...args),
    },
  },
}));

import {
  weightedMedian,
  calculateConfidence,
  buildPlatformData,
  fetchCrossPlatformPrice,
  applyPriceIntelligenceOverride,
  shouldRescueItem,
  type CrossPlatformPriceResult,
} from '@/lib/cross-platform-price';

describe('Cross-Platform Price Intelligence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================
  // weightedMedian
  // ==========================================================

  describe('weightedMedian', () => {
    test('returns weighted median favoring higher-weighted items', () => {
      // Sold items at $100 (weight 2) and active at $80 (weight 1)
      const result = weightedMedian([
        { price: 80, weight: 1 },
        { price: 100, weight: 2 },
      ]);
      // Total weight = 3. Need cumulative >= 1.5.
      // Sorted: 80(w1), 100(w2). cumulative after 80: 1 < 1.5. After 100: 3 >= 1.5.
      expect(result).toBe(100);
    });

    test('returns 0 for empty array', () => {
      expect(weightedMedian([])).toBe(0);
    });

    test('handles equal weights like a normal median', () => {
      const result = weightedMedian([
        { price: 50, weight: 1 },
        { price: 100, weight: 1 },
        { price: 150, weight: 1 },
      ]);
      expect(result).toBe(100);
    });

    test('handles all same weight', () => {
      const result = weightedMedian([
        { price: 10, weight: 2 },
        { price: 20, weight: 2 },
        { price: 30, weight: 2 },
      ]);
      expect(result).toBe(20);
    });

    test('handles zero total weight', () => {
      expect(weightedMedian([{ price: 100, weight: 0 }])).toBe(0);
    });
  });

  // ==========================================================
  // calculateConfidence
  // ==========================================================

  describe('calculateConfidence', () => {
    test('returns high for 10+ sold comps from 2+ platforms', () => {
      expect(calculateConfidence(12, 2)).toBe('high');
    });

    test('returns medium for 5+ comps from 1 platform', () => {
      expect(calculateConfidence(7, 1)).toBe('medium');
    });

    test('returns low for fewer than 5 comps from 1 platform', () => {
      // AC #3: fewer than 5 comps = low confidence
      expect(calculateConfidence(3, 1)).toBe('low');
    });

    test('returns low for 0 comps from 0 platforms', () => {
      expect(calculateConfidence(0, 0)).toBe('low');
    });

    test('returns medium for 10+ sold but only 1 platform', () => {
      expect(calculateConfidence(15, 1)).toBe('medium');
    });

    test('returns low for 4 comps from 0 platforms', () => {
      expect(calculateConfidence(4, 0)).toBe('low');
    });

    test('returns low for 4 comps from 1 platform', () => {
      // AC #3: fewer than 5 comps = low even with 1 platform
      expect(calculateConfidence(4, 1)).toBe('low');
    });
  });

  // ==========================================================
  // buildPlatformData
  // ==========================================================

  describe('buildPlatformData', () => {
    test('builds platform data with correct fee normalization', () => {
      const result = buildPlatformData('ebay', 'sold', [100, 110, 120, 130, 140], 500);

      expect(result).not.toBeNull();
      expect(result!.platform).toBe('ebay');
      expect(result!.dataType).toBe('sold');
      expect(result!.feeRate).toBe(0.13);
      expect(result!.medianPrice).toBe(120);
      expect(result!.netMedianPrice).toBe(Math.round(120 * 0.87)); // 104
      expect(result!.compCount).toBe(5);
    });

    test('returns null for empty prices', () => {
      expect(buildPlatformData('ebay', 'sold', [], 100)).toBeNull();
    });

    test('returns null for all-zero prices', () => {
      expect(buildPlatformData('ebay', 'sold', [0, 0, 0], 100)).toBeNull();
    });

    test('applies IQR filtering to remove outliers', () => {
      // 1 and 10000 are outliers relative to the 95-110 cluster
      const result = buildPlatformData('ebay', 'sold', [1, 95, 100, 105, 110, 98, 102, 10000], 500);

      expect(result).not.toBeNull();
      // After IQR filtering, 1 and 10000 should be removed
      expect(result!.compCount).toBeLessThan(8);
    });

    test('uses correct fee for each platform', () => {
      const mercari = buildPlatformData('mercari', 'sold', [100], 100);
      const fb = buildPlatformData('facebook', 'active', [100], 100);
      const cl = buildPlatformData('craigslist', 'active', [100], 100);

      expect(mercari!.feeRate).toBe(0.10);
      expect(fb!.feeRate).toBe(0.05);
      expect(cl!.feeRate).toBe(0.0);
      expect(cl!.netMedianPrice).toBe(100); // 0% fee
    });
  });

  // ==========================================================
  // fetchCrossPlatformPrice
  // ==========================================================

  describe('fetchCrossPlatformPrice', () => {
    test('returns aggregated data from eBay sold listings', async () => {
      mockFetchMarketPrice.mockResolvedValue({
        soldListings: [
          { title: 'Item', price: 100, shippingCost: 10, condition: 'Good', url: '', soldDate: null },
          { title: 'Item', price: 120, shippingCost: 0, condition: 'Good', url: '', soldDate: null },
          { title: 'Item', price: 130, shippingCost: 5, condition: 'Good', url: '', soldDate: null },
          { title: 'Item', price: 110, shippingCost: 0, condition: 'Good', url: '', soldDate: null },
          { title: 'Item', price: 115, shippingCost: 0, condition: 'Good', url: '', soldDate: null },
        ],
      });

      const result = await fetchCrossPlatformPrice('test item', 'electronics');

      expect(result).not.toBeNull();
      expect(result!.totalSoldComps).toBeGreaterThan(0);
      expect(result!.verifiedMarketValue).toBeGreaterThan(0);
      expect(result!.confidence).toBe('medium'); // 5 comps from 1 platform
    });

    test('returns null when no platforms return data', async () => {
      mockFetchMarketPrice.mockResolvedValue(null);

      const result = await fetchCrossPlatformPrice('nonexistent item');

      expect(result).toBeNull();
    });

    test('combines sold and active data with correct weighting', async () => {
      // eBay sold at $200
      mockFetchMarketPrice.mockResolvedValue({
        soldListings: [
          { title: 'Item', price: 200, shippingCost: 0, condition: 'Good', url: '', soldDate: null },
        ],
      });

      // FB active at $150
      const result = await fetchCrossPlatformPrice('test item', undefined, {
        facebookPricesFn: async () => [150],
      });

      expect(result).not.toBeNull();
      // eBay sold (w2) + FB active (w1) — sold should dominate
      expect(result!.totalSoldComps).toBe(1);
      expect(result!.totalActiveComps).toBe(1);
    });

    test('handles single platform failure gracefully', async () => {
      // eBay succeeds
      mockFetchMarketPrice.mockResolvedValue({
        soldListings: [
          { title: 'Item', price: 100, shippingCost: 0, condition: 'Good', url: '', soldDate: null },
        ],
      });

      const result = await fetchCrossPlatformPrice('test item', undefined, {
        // Mercari throws
        mercariSoldFn: async () => { throw new Error('Mercari down'); },
        // FB returns data
        facebookPricesFn: async () => [90, 95],
      });

      expect(result).not.toBeNull();
      // Should have eBay + FB data despite Mercari failure
      expect(result!.platformData.length).toBeGreaterThanOrEqual(1);
    });

    test('uses Mercari sold data when provided', async () => {
      mockFetchMarketPrice.mockResolvedValue(null); // eBay fails

      const result = await fetchCrossPlatformPrice('test item', undefined, {
        mercariSoldFn: async () => [
          { price: 80, name: 'Item', id: '1' } as never,
          { price: 90, name: 'Item', id: '2' } as never,
          { price: 85, name: 'Item', id: '3' } as never,
        ],
      });

      expect(result).not.toBeNull();
      expect(result!.totalSoldComps).toBeGreaterThan(0);
    });

    test('returns partial data when total timeout fires', async () => {
      // eBay returns fast
      mockFetchMarketPrice.mockResolvedValue({
        soldListings: [
          { title: 'Item', price: 100, shippingCost: 0, condition: 'Good', url: '', soldDate: null },
        ],
      });

      // Mercari hangs past the total timeout (simulated with a never-resolving promise)
      const result = await fetchCrossPlatformPrice('test item', undefined, {
        mercariSoldFn: () => new Promise(() => {}), // never resolves
        facebookPricesFn: async () => [80, 90], // returns fast
      });

      // Should still have eBay + FB data despite Mercari hanging
      expect(result).not.toBeNull();
      expect(result!.platformData.length).toBeGreaterThanOrEqual(1);
    }, 35_000);

    test('skips platforms with no fetcher provided', async () => {
      mockFetchMarketPrice.mockResolvedValue({
        soldListings: [
          { title: 'Item', price: 100, shippingCost: 0, condition: 'Good', url: '', soldDate: null },
        ],
      });

      // No optional fetchers — only eBay runs
      const result = await fetchCrossPlatformPrice('test item');

      expect(result).not.toBeNull();
      expect(result!.platformData.length).toBe(1);
      expect(result!.platformData[0].platform).toBe('ebay');
    });

    test('returns cached data without calling fetchers (cache hit)', async () => {
      // Simulate cache hit: prisma returns cached eBay sold prices
      mockFindMany.mockImplementation((args: Record<string, unknown>) => {
        const where = args.where as Record<string, unknown> | undefined;
        if (where?.platform === 'ebay' && where?.dataType === 'sold') {
          return Promise.resolve([
            { soldPrice: 200 },
            { soldPrice: 210 },
            { soldPrice: 220 },
            { soldPrice: 230 },
            { soldPrice: 240 },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await fetchCrossPlatformPrice('cached item', 'electronics');

      expect(result).not.toBeNull();
      expect(result!.verifiedMarketValue).toBeGreaterThan(0);
      // eBay Playwright scraper should NOT have been called
      expect(mockFetchMarketPrice).not.toHaveBeenCalled();

      // Reset mock for other tests
      mockFindMany.mockResolvedValue([]);
    });
  });

  // ==========================================================
  // applyPriceIntelligenceOverride
  // ==========================================================

  describe('applyPriceIntelligenceOverride', () => {
    const mockResult: CrossPlatformPriceResult = {
      verifiedMarketValue: 600,
      confidence: 'high',
      platformData: [],
      totalSoldComps: 15,
      totalActiveComps: 5,
      fetchedAt: new Date(),
      searchQuery: 'Fender Stratocaster',
    };

    test('overrides low Tier 1 score when verified data shows profit', () => {
      // Guitar at $300 scored 10 by Tier 1. Verified value = $600.
      const { valueScore, overridden, verifiedMarketValue } =
        applyPriceIntelligenceOverride(10, 300, mockResult);

      expect(overridden).toBe(true);
      expect(verifiedMarketValue).toBe(600);
      // Profit = 600 * 0.87 - 300 = 222 → should score well above 70
      expect(valueScore).toBeGreaterThan(70);
    });

    test('does not override when confidence is low', () => {
      const lowConfResult = { ...mockResult, confidence: 'low' as const };
      const { valueScore, overridden } =
        applyPriceIntelligenceOverride(10, 300, lowConfResult);

      expect(overridden).toBe(false);
      expect(valueScore).toBe(10); // unchanged
    });

    test('does not override when cross-platform result is null', () => {
      const { valueScore, overridden } =
        applyPriceIntelligenceOverride(50, 100, null);

      expect(overridden).toBe(false);
      expect(valueScore).toBe(50);
    });

    test('produces correct score for overpriced item', () => {
      // Item at $500, verified value only $300
      const cheapResult = { ...mockResult, verifiedMarketValue: 300 };
      const { valueScore, overridden } =
        applyPriceIntelligenceOverride(80, 500, cheapResult);

      expect(overridden).toBe(true);
      // Profit = 300 * 0.87 - 500 = -239 → should cap at 10
      expect(valueScore).toBeLessThanOrEqual(10);
    });

    test('applies high-value boost for large profit', () => {
      // Item at $100, verified value $800 → profit = $596
      const highResult = { ...mockResult, verifiedMarketValue: 800 };
      const { valueScore } =
        applyPriceIntelligenceOverride(30, 100, highResult);

      // $596 profit > $300 → +10 boost → should be very high
      expect(valueScore).toBeGreaterThan(85);
    });

    test('handles zero verified market value', () => {
      const zeroResult = { ...mockResult, verifiedMarketValue: 0 };
      const { valueScore, overridden } =
        applyPriceIntelligenceOverride(50, 100, zeroResult);

      expect(overridden).toBe(false);
      expect(valueScore).toBe(50);
    });
  });

  // ==========================================================
  // shouldRescueItem
  // ==========================================================

  describe('shouldRescueItem', () => {
    const mockResult: CrossPlatformPriceResult = {
      verifiedMarketValue: 600,
      confidence: 'high',
      platformData: [],
      totalSoldComps: 15,
      totalActiveComps: 5,
      fetchedAt: new Date(),
      searchQuery: 'test',
    };

    test('rescues item with 50%+ verified discount', () => {
      // Asking $300, verified $600 → 50% discount
      expect(shouldRescueItem(300, mockResult)).toBe(true);
    });

    test('does not rescue item with <40% discount', () => {
      // Asking $400, verified $600 → 33% discount
      expect(shouldRescueItem(400, mockResult)).toBe(false);
    });

    test('rescues at exactly 40% threshold', () => {
      // Asking $360, verified $600 → 40% discount
      expect(shouldRescueItem(360, mockResult)).toBe(true);
    });

    test('does not rescue when confidence is low', () => {
      const lowConf = { ...mockResult, confidence: 'low' as const };
      expect(shouldRescueItem(100, lowConf)).toBe(false);
    });

    test('does not rescue when result is null', () => {
      expect(shouldRescueItem(100, null)).toBe(false);
    });

    test('does not rescue when verified value is 0', () => {
      const zeroResult = { ...mockResult, verifiedMarketValue: 0 };
      expect(shouldRescueItem(100, zeroResult)).toBe(false);
    });

    test('supports custom rescue threshold', () => {
      // 50% discount, but threshold set to 60%
      expect(shouldRescueItem(300, mockResult, 60)).toBe(false);
      // Threshold set to 30%
      expect(shouldRescueItem(300, mockResult, 30)).toBe(true);
    });
  });
});

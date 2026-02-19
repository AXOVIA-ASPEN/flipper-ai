/**
 * Market Value Calculator Tests
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

// Mock prisma BEFORE imports
const mockPriceHistoryFindMany = jest.fn();
const mockListingFindMany = jest.fn();
const mockListingFindUnique = jest.fn();
const mockListingUpdate = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    priceHistory: {
      findMany: mockPriceHistoryFindMany,
    },
    listing: {
      findMany: mockListingFindMany,
      findUnique: mockListingFindUnique,
      update: mockListingUpdate,
    },
  },
}));

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  calculateVerifiedMarketValue,
  calculateTrueDiscount,
  updateListingWithVerifiedValue,
} from '@/lib/market-value-calculator';

describe('Market Value Calculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateVerifiedMarketValue', () => {
    test('returns null for insufficient data (< 3 sales)', async () => {
      mockPriceHistoryFindMany.mockResolvedValue([
        { soldPrice: 400 },
        { soldPrice: 420 },
      ]);

      const result = await calculateVerifiedMarketValue('iPhone 12', 'EBAY');
      expect(result).toBeNull();
    });

    test('calculates median market value from sold data', async () => {
      const prices = [300, 320, 330, 340, 350, 360, 370, 380, 400];
      mockPriceHistoryFindMany.mockResolvedValue(
        prices.map((p) => ({
          soldPrice: p,
          soldAt: new Date(),
          productName: 'MacBook Pro',
          platform: 'EBAY',
        }))
      );

      const result = await calculateVerifiedMarketValue('MacBook Pro', 'EBAY');

      expect(result).not.toBeNull();
      expect(result!.verifiedMarketValue).toBe(350); // Median of 9 prices
      expect(result!.dataPoints).toBe(9);
      expect(result!.marketDataSource).toBe('ebay_sold');
    });

    test('removes outliers using IQR method', async () => {
      const prices = [300, 320, 330, 340, 350, 360, 370, 380, 400, 100, 800];
      mockPriceHistoryFindMany.mockResolvedValue(
        prices.map((p) => ({
          soldPrice: p,
          soldAt: new Date(),
          productName: 'iPad Pro',
          platform: 'EBAY',
        }))
      );

      const result = await calculateVerifiedMarketValue('iPad Pro', 'EBAY');

      expect(result).not.toBeNull();
      expect(result!.outliers.removed).toBe(2);
      expect(result!.dataPoints).toBe(9);
      expect(result!.soldPriceRange.min).toBeGreaterThanOrEqual(300);
      expect(result!.soldPriceRange.max).toBeLessThanOrEqual(400);
    });

    test('provides high confidence for large datasets with low variance', async () => {
      const prices = Array.from({ length: 15 }, (_, i) => 480 + i * 3);
      mockPriceHistoryFindMany.mockResolvedValue(
        prices.map((p) => ({
          soldPrice: p,
          soldAt: new Date(),
          productName: 'PS5',
          platform: 'EBAY',
        }))
      );

      const result = await calculateVerifiedMarketValue('PS5', 'EBAY');

      expect(result).not.toBeNull();
      expect(result!.confidence).toBe('high');
      expect(result!.dataPoints).toBeGreaterThanOrEqual(10);
    });

    test('provides low confidence for small datasets with high variance', async () => {
      const prices = [200, 350, 550, 700];
      mockPriceHistoryFindMany.mockResolvedValue(
        prices.map((p) => ({
          soldPrice: p,
          soldAt: new Date(),
          productName: 'Nintendo Switch',
          platform: 'EBAY',
        }))
      );

      const result = await calculateVerifiedMarketValue('Nintendo Switch', 'EBAY');

      expect(result).not.toBeNull();
      expect(result!.confidence).toBe('low');
      expect(result!.dataPoints).toBeLessThan(5);
    });

    test('filters by age (maxAge parameter)', async () => {
      // Mock returns only recent sales (DB handles filtering)
      const recentPrices = [150, 155, 160];
      mockPriceHistoryFindMany.mockResolvedValue(
        recentPrices.map((p) => ({
          soldPrice: p,
          soldAt: new Date(),
          productName: 'AirPods',
          platform: 'EBAY',
        }))
      );

      const result = await calculateVerifiedMarketValue('AirPods', 'EBAY', 90);

      expect(result).not.toBeNull();
      expect(result!.dataPoints).toBe(3);
      expect(result!.soldPriceRange.max).toBeLessThanOrEqual(160);
    });

    test('returns statistics in soldPriceRange', async () => {
      const prices = [100, 110, 120, 130, 140];
      mockPriceHistoryFindMany.mockResolvedValue(
        prices.map((p) => ({
          soldPrice: p,
          soldAt: new Date(),
          productName: 'Headphones',
          platform: 'EBAY',
        }))
      );

      const result = await calculateVerifiedMarketValue('Headphones', 'EBAY');

      expect(result).not.toBeNull();
      expect(result!.soldPriceRange.min).toBe(100);
      expect(result!.soldPriceRange.max).toBe(140);
      expect(result!.soldPriceRange.median).toBe(120);
      expect(result!.soldPriceRange.average).toBe(120);
    });
  });

  describe('calculateTrueDiscount', () => {
    test('calculates positive discount when below market', () => {
      const discount = calculateTrueDiscount(500, 300);
      expect(discount).toBe(40);
    });

    test('calculates negative discount when above market', () => {
      const discount = calculateTrueDiscount(500, 600);
      expect(discount).toBe(-20);
    });

    test('returns 0 for equal prices', () => {
      const discount = calculateTrueDiscount(500, 500);
      expect(discount).toBe(0);
    });

    test('handles zero market value', () => {
      const discount = calculateTrueDiscount(0, 100);
      expect(discount).toBe(0);
    });

    test('rounds to nearest integer', () => {
      const discount = calculateTrueDiscount(333, 200);
      expect(discount).toBe(40);
    });
  });

  describe('batchUpdateVerifiedValues', () => {
    test('updates multiple listings and returns summary', async () => {
      const { batchUpdateVerifiedValues } = require('@/lib/market-value-calculator');

      const listings = [
        { id: 'l1', title: 'Item A', platform: 'EBAY', askingPrice: 100 },
        { id: 'l2', title: 'Item B', platform: 'EBAY', askingPrice: 200 },
      ];

      mockListingFindMany.mockResolvedValue(listings);

      // First listing: has market data → updated
      mockListingFindUnique
        .mockResolvedValueOnce(listings[0])
        .mockResolvedValueOnce(listings[1]);

      const prices5 = [90, 100, 110, 120, 130];
      mockPriceHistoryFindMany
        .mockResolvedValueOnce(prices5.map((p) => ({ soldPrice: p })))
        .mockResolvedValueOnce([]); // Second listing: no data → skipped

      mockListingUpdate.mockResolvedValue({
        ...listings[0],
        verifiedMarketValue: 110,
      });

      const result = await batchUpdateVerifiedValues('EBAY', 10);
      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toBe(0);
    });

    test('counts errors when update throws', async () => {
      const { batchUpdateVerifiedValues } = require('@/lib/market-value-calculator');

      mockListingFindMany.mockResolvedValue([
        { id: 'l1', title: 'Item', platform: 'EBAY', askingPrice: 100 },
      ]);
      mockListingFindUnique.mockRejectedValue(new Error('DB error'));

      const result = await batchUpdateVerifiedValues();
      expect(result.errors).toBe(1);
    });

    test('processes all platforms when none specified', async () => {
      const { batchUpdateVerifiedValues } = require('@/lib/market-value-calculator');

      mockListingFindMany.mockResolvedValue([]);
      const result = await batchUpdateVerifiedValues();
      expect(result).toEqual({ updated: 0, skipped: 0, errors: 0 });
      expect(mockListingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });
  });

  describe('updateListingWithVerifiedValue', () => {
    test('updates listing with verified market value', async () => {
      const testListing = {
        id: 'test-listing-1',
        title: 'MacBook Air',
        platform: 'EBAY',
        askingPrice: 600,
      };

      mockListingFindUnique.mockResolvedValue(testListing);

      const soldPrices = [750, 780, 800, 820, 850];
      mockPriceHistoryFindMany.mockResolvedValue(
        soldPrices.map((p) => ({
          soldPrice: p,
          soldAt: new Date(),
          productName: 'MacBook Air',
          platform: 'EBAY',
        }))
      );

      mockListingUpdate.mockResolvedValue({
        ...testListing,
        verifiedMarketValue: 800,
        marketDataSource: 'ebay_sold',
        trueDiscountPercent: 25,
      });

      const result = await updateListingWithVerifiedValue('test-listing-1');

      expect(result).not.toBeNull();
      expect(result!.verifiedMarketValue).toBeGreaterThan(0);
      expect(result!.marketDataSource).toBe('ebay_sold');
      expect(result!.trueDiscountPercent).toBeGreaterThan(0);
    });

    test('returns null when insufficient data', async () => {
      const testListing = {
        id: 'test-listing-2',
        title: 'Unknown Item XYZ',
        platform: 'EBAY',
        askingPrice: 100,
      };

      mockListingFindUnique.mockResolvedValue(testListing);
      mockPriceHistoryFindMany.mockResolvedValue([]);

      const result = await updateListingWithVerifiedValue('test-listing-2');
      expect(result).toBeNull();
    });

    test('throws error for non-existent listing', async () => {
      mockListingFindUnique.mockResolvedValue(null);

      await expect(updateListingWithVerifiedValue('invalid-id')).rejects.toThrow(
        'Listing not found'
      );
    });
  });
});

// ── Additional branch coverage ────────────────────────────────────────────────
describe('calculateVerifiedMarketValue - default platform parameter', () => {
  it('uses default platform (EBAY) when platform is not provided', async () => {
    // Covers the default parameter branch: platform: string = 'EBAY'
    mockPriceHistoryFindMany.mockResolvedValue([
      { soldPrice: 200, soldAt: new Date(), platform: 'EBAY', condition: 'Good' },
      { soldPrice: 220, soldAt: new Date(), platform: 'EBAY', condition: 'Good' },
      { soldPrice: 180, soldAt: new Date(), platform: 'EBAY', condition: 'Good' },
    ]);

    // Call WITHOUT the platform argument → uses default 'EBAY'
    const result = await calculateVerifiedMarketValue('Test Product');
    expect(result).not.toBeNull();
    expect(result!.marketDataSource).toBe('ebay_sold');
  });
});

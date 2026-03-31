/**
 * Unit tests for analyzeDemandTrend() in src/lib/demand-analyzer.ts
 * Story 5.3: Sold Volume & Demand Trend Analysis (FR-SCORE-18)
 */

import { analyzeDemandTrend } from '@/lib/demand-analyzer';
import type { SoldListing } from '@/lib/market-price';

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function makeSoldListing(soldDate: Date | null = null): SoldListing {
  return {
    title: 'Test Item',
    price: 100,
    condition: 'Used',
    url: 'https://example.com',
    soldDate,
  };
}

describe('analyzeDemandTrend()', () => {
  describe('empty input', () => {
    it('returns low_liquidity with all volumes = 0 for no listings', () => {
      const result = analyzeDemandTrend([]);
      expect(result.soldVolume30Days).toBe(0);
      expect(result.soldVolume60Days).toBe(0);
      expect(result.soldVolume90Days).toBe(0);
      expect(result.demandTrend).toBe('low_liquidity');
      expect(result.isLowLiquidity).toBe(true);
    });
  });

  describe('low_liquidity — no sales in 90 days', () => {
    it('returns low_liquidity when all items are older than 90 days', () => {
      const listings = [
        makeSoldListing(daysAgo(91)),
        makeSoldListing(daysAgo(120)),
        makeSoldListing(daysAgo(180)),
      ];
      const result = analyzeDemandTrend(listings);
      expect(result.demandTrend).toBe('low_liquidity');
      expect(result.isLowLiquidity).toBe(true);
      expect(result.soldVolume30Days).toBe(0);
      expect(result.soldVolume60Days).toBe(0);
      expect(result.soldVolume90Days).toBe(0);
    });
  });

  describe('null soldDate handling', () => {
    it('treats null soldDate as within last 30 days', () => {
      const listings = [
        makeSoldListing(null),
        makeSoldListing(null),
      ];
      const result = analyzeDemandTrend(listings);
      expect(result.soldVolume30Days).toBe(2);
      expect(result.soldVolume60Days).toBe(2);
      expect(result.soldVolume90Days).toBe(2);
      expect(result.isLowLiquidity).toBe(false);
    });
  });

  describe('cumulative volume buckets', () => {
    it('counts items in correct time windows', () => {
      const listings = [
        makeSoldListing(daysAgo(5)),   // within 30d
        makeSoldListing(daysAgo(15)),  // within 30d
        makeSoldListing(daysAgo(40)),  // within 60d (not 30d)
        makeSoldListing(daysAgo(75)),  // within 90d (not 60d)
        makeSoldListing(daysAgo(95)),  // outside 90d — excluded
      ];
      const result = analyzeDemandTrend(listings);
      expect(result.soldVolume30Days).toBe(2);
      expect(result.soldVolume60Days).toBe(3); // 2 + 1
      expect(result.soldVolume90Days).toBe(4); // 2 + 1 + 1
    });
  });

  describe('rising trend', () => {
    it('returns "rising" when 30-day rate > 60-day avg rate * 1.10', () => {
      // 20 items in last 30d, 5 in 31-60d, 5 in 61-90d
      // rate30 = 20/30 ≈ 0.667; rate60avg = 25/60 ≈ 0.417; 0.667 > 0.417 * 1.1 = 0.458 → rising
      const listings = [
        ...Array.from({ length: 20 }, () => makeSoldListing(daysAgo(5))),
        ...Array.from({ length: 5 }, () => makeSoldListing(daysAgo(45))),
        ...Array.from({ length: 5 }, () => makeSoldListing(daysAgo(80))),
      ];
      const result = analyzeDemandTrend(listings);
      expect(result.demandTrend).toBe('rising');
      expect(result.isLowLiquidity).toBe(false);
      expect(result.soldVolume30Days).toBe(20);
      expect(result.soldVolume60Days).toBe(25);
      expect(result.soldVolume90Days).toBe(30);
    });

    it('returns "rising" when all items are within last 30 days', () => {
      // All 5 in 30d: rate30 = 5/30; rate60avg = 5/60; ratio = 2.0 > 1.1 → rising
      const listings = Array.from({ length: 5 }, () => makeSoldListing(daysAgo(5)));
      const result = analyzeDemandTrend(listings);
      expect(result.demandTrend).toBe('rising');
    });
  });

  describe('declining trend', () => {
    it('returns "declining" when 30-day rate < 60-day avg rate * 0.90', () => {
      // 2 in last 30d, 15 in 31-60d, 5 in 61-90d
      // rate30 = 2/30 ≈ 0.067; rate60avg = 17/60 ≈ 0.283; 0.067 < 0.283 * 0.9 = 0.255 → declining
      const listings = [
        ...Array.from({ length: 2 }, () => makeSoldListing(daysAgo(5))),
        ...Array.from({ length: 15 }, () => makeSoldListing(daysAgo(45))),
        ...Array.from({ length: 5 }, () => makeSoldListing(daysAgo(80))),
      ];
      const result = analyzeDemandTrend(listings);
      expect(result.demandTrend).toBe('declining');
      expect(result.isLowLiquidity).toBe(false);
    });
  });

  describe('stable trend', () => {
    it('returns "stable" when rate is within ±10% of 60-day avg', () => {
      // 10 in last 30d, 11 in 31-60d
      // rate30 = 10/30 ≈ 0.333; rate60avg = 21/60 = 0.35
      // 0.333 < 0.35 * 1.1 = 0.385 AND 0.333 > 0.35 * 0.9 = 0.315 → stable
      const listings = [
        ...Array.from({ length: 10 }, () => makeSoldListing(daysAgo(5))),
        ...Array.from({ length: 11 }, () => makeSoldListing(daysAgo(45))),
      ];
      const result = analyzeDemandTrend(listings);
      expect(result.demandTrend).toBe('stable');
      expect(result.isLowLiquidity).toBe(false);
    });
  });

  describe('analysisDate', () => {
    it('returns a recent analysisDate', () => {
      const before = new Date();
      const result = analyzeDemandTrend([makeSoldListing(daysAgo(5))]);
      const after = new Date();
      expect(result.analysisDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.analysisDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});

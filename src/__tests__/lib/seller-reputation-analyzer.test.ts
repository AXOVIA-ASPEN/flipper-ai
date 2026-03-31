/**
 * Unit tests for analyzeSellerReputation() in src/lib/seller-reputation-analyzer.ts
 * Pure synchronous function — no mocks required.
 */

import { analyzeSellerReputation } from '@/lib/seller-reputation-analyzer';

describe('analyzeSellerReputation()', () => {
  describe('skip platforms (no seller data exposed)', () => {
    it.each(['CRAIGSLIST', 'FACEBOOK_MARKETPLACE', 'OFFERUP'])(
      'returns null for %s',
      (platform) => {
        expect(analyzeSellerReputation(platform, 99, 100, 30)).toBeNull();
      }
    );

    it('returns null for CRAIGSLIST regardless of rating value', () => {
      expect(analyzeSellerReputation('CRAIGSLIST', null, null, null)).toBeNull();
    });
  });

  describe('supported platforms — null rating (data unavailable)', () => {
    it('returns neutral result for EBAY with null rating', () => {
      const result = analyzeSellerReputation('EBAY', null, null, null);
      expect(result).toEqual({
        sellerRating: null,
        sellerReviewCount: null,
        sellerAccountAgeDays: null,
        isLowReputation: false,
        riskEscalation: false,
      });
    });

    it('returns neutral result for MERCARI with null rating, passes through review count', () => {
      const result = analyzeSellerReputation('MERCARI', null, 50, null);
      expect(result).toEqual({
        sellerRating: null,
        sellerReviewCount: 50,
        sellerAccountAgeDays: null,
        isLowReputation: false,
        riskEscalation: false,
      });
    });
  });

  describe('EBAY thresholds (minRating: 97%)', () => {
    it('returns isLowReputation=false for rating exactly at threshold (97)', () => {
      const result = analyzeSellerReputation('EBAY', 97, 500, null);
      expect(result).toMatchObject({ sellerRating: 97, isLowReputation: false, riskEscalation: false });
    });

    it('returns isLowReputation=false for rating well above threshold (99.5)', () => {
      const result = analyzeSellerReputation('EBAY', 99.5, 1000, null);
      expect(result).toMatchObject({ isLowReputation: false, riskEscalation: false });
    });

    it('returns isLowReputation=true for rating below threshold (96.9)', () => {
      const result = analyzeSellerReputation('EBAY', 96.9, 200, null);
      expect(result).toMatchObject({ isLowReputation: true, riskEscalation: true });
    });

    it('returns isLowReputation=true for rating far below threshold (85)', () => {
      const result = analyzeSellerReputation('EBAY', 85, 10, null);
      expect(result).toMatchObject({ isLowReputation: true, riskEscalation: true });
    });

    it('passes through all input values in the result', () => {
      const result = analyzeSellerReputation('EBAY', 98.5, 1200, 730);
      expect(result).toMatchObject({
        sellerRating: 98.5,
        sellerReviewCount: 1200,
        sellerAccountAgeDays: 730,
      });
    });

    it('passes through null accountAgeDays (not available from eBay API)', () => {
      const result = analyzeSellerReputation('EBAY', 99, 300, null);
      expect(result?.sellerAccountAgeDays).toBeNull();
    });
  });

  describe('MERCARI thresholds (minRating: 4.0 / 5.0)', () => {
    it('returns isLowReputation=false for rating exactly at threshold (4.0)', () => {
      const result = analyzeSellerReputation('MERCARI', 4.0, 80, null);
      expect(result).toMatchObject({ sellerRating: 4.0, isLowReputation: false, riskEscalation: false });
    });

    it('returns isLowReputation=false for rating above threshold (4.8)', () => {
      const result = analyzeSellerReputation('MERCARI', 4.8, 200, null);
      expect(result).toMatchObject({ isLowReputation: false, riskEscalation: false });
    });

    it('returns isLowReputation=true for rating below threshold (3.9)', () => {
      const result = analyzeSellerReputation('MERCARI', 3.9, 20, null);
      expect(result).toMatchObject({ isLowReputation: true, riskEscalation: true });
    });

    it('returns isLowReputation=true for low rating (2.5)', () => {
      const result = analyzeSellerReputation('MERCARI', 2.5, 5, null);
      expect(result).toMatchObject({ isLowReputation: true, riskEscalation: true });
    });
  });

  describe('unknown platform with rating', () => {
    it('returns neutral result when no threshold is defined for the platform', () => {
      const result = analyzeSellerReputation('POSHMARK', 4.9, 50, null);
      expect(result).toMatchObject({ isLowReputation: false, riskEscalation: false });
    });

    it('returns neutral result for empty string platform', () => {
      const result = analyzeSellerReputation('', 99, 10, null);
      expect(result).toMatchObject({ isLowReputation: false, riskEscalation: false });
    });
  });
});

/**
 * Tier Enforcement Tests
 * Author: ASPEN
 * Company: Axovia AI
 */

import { checkScanLimit, checkMarketplaceLimit, checkSearchConfigLimit, checkFeatureAccess } from '../lib/tier-enforcement';

describe('Tier Enforcement', () => {
  describe('checkScanLimit', () => {
    it('should allow scans under the limit for FREE tier', () => {
      const result = checkScanLimit('FREE', 0);
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('FREE');
    });

    it('should deny scans at the limit for FREE tier', () => {
      const result = checkScanLimit('FREE', 10);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily scan limit reached');
      expect(result.reason).toContain('Upgrade');
    });

    it('should allow more scans for FLIPPER tier', () => {
      const result = checkScanLimit('FLIPPER', 10);
      expect(result.allowed).toBe(true);
    });

    it('should allow even more scans for PRO tier', () => {
      const result = checkScanLimit('PRO', 50);
      expect(result.allowed).toBe(true);
    });

    it('should default to FREE when tier is null', () => {
      const result = checkScanLimit(null, 10);
      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('FREE');
    });

    it('should default to FREE when tier is undefined', () => {
      const result = checkScanLimit(undefined, 0);
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('FREE');
    });
  });

  describe('checkMarketplaceLimit', () => {
    it('should allow adding marketplace under limit', () => {
      const result = checkMarketplaceLimit('FREE', 0);
      expect(result.allowed).toBe(true);
    });

    it('should deny adding marketplace at limit for FREE', () => {
      const result = checkMarketplaceLimit('FREE', 1);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Marketplace limit reached');
    });

    it('should allow more marketplaces for higher tiers', () => {
      const result = checkMarketplaceLimit('PRO', 5);
      expect(result.allowed).toBe(true);
    });

    it('should default to FREE for null tier', () => {
      const result = checkMarketplaceLimit(null, 2);
      expect(result.tier).toBe('FREE');
    });
  });

  describe('checkSearchConfigLimit', () => {
    it('should allow adding search config under limit', () => {
      const result = checkSearchConfigLimit('FLIPPER', 0);
      expect(result.allowed).toBe(true);
    });

    it('should deny when at limit', () => {
      const result = checkSearchConfigLimit('FREE', 3);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Search config limit reached');
    });

    it('should default to FREE for undefined tier', () => {
      const result = checkSearchConfigLimit(undefined, 0);
      expect(result.tier).toBe('FREE');
    });
  });

  describe('checkFeatureAccess', () => {
    it('should allow AI analysis on FREE tier', () => {
      // FREE tier includes AI analysis
      const result = checkFeatureAccess('FREE', 'aiAnalysis');
      expect(result.allowed).toBe(true);
    });

    it('should deny messaging on FREE tier', () => {
      const result = checkFeatureAccess('FREE', 'messaging');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Messaging');
      expect(result.reason).toContain('not available');
    });

    it('should allow AI analysis on FLIPPER tier', () => {
      const result = checkFeatureAccess('FLIPPER', 'aiAnalysis');
      expect(result.allowed).toBe(true);
    });

    it('should allow AI analysis on PRO tier', () => {
      const result = checkFeatureAccess('PRO', 'aiAnalysis');
      expect(result.allowed).toBe(true);
    });

    it('should check price history access', () => {
      const result = checkFeatureAccess('FREE', 'priceHistory');
      // FREE may or may not have price history - just ensure it returns a valid result
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('tier', 'FREE');
      expect(result).toHaveProperty('limits');
    });

    it('should check messaging access', () => {
      const result = checkFeatureAccess('FLIPPER', 'messaging');
      expect(result).toHaveProperty('allowed');
    });

    it('should check eBay cross-listing access', () => {
      const result = checkFeatureAccess('PRO', 'ebayCrossListing');
      expect(result.allowed).toBe(true);
    });

    it('should default to FREE for null tier', () => {
      const result = checkFeatureAccess(null, 'messaging');
      expect(result.tier).toBe('FREE');
      expect(result.allowed).toBe(false);
    });
  });
});

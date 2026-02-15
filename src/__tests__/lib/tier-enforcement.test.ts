import {
  checkScanLimit,
  checkMarketplaceLimit,
  checkSearchConfigLimit,
  checkFeatureAccess,
} from '../../lib/tier-enforcement';

describe('tier-enforcement', () => {
  describe('checkScanLimit', () => {
    it('allows scans under the FREE limit', () => {
      const result = checkScanLimit('FREE', 5);
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('FREE');
      expect(result.reason).toBeUndefined();
    });

    it('blocks scans at the FREE limit', () => {
      const result = checkScanLimit('FREE', 10);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily scan limit reached');
      expect(result.reason).toContain('10 scans/day');
    });

    it('allows unlimited scans for FLIPPER tier', () => {
      const result = checkScanLimit('FLIPPER', 1000);
      expect(result.allowed).toBe(true);
    });

    it('allows unlimited scans for PRO tier', () => {
      const result = checkScanLimit('PRO', 99999);
      expect(result.allowed).toBe(true);
    });

    it('defaults to FREE when tier is null', () => {
      const result = checkScanLimit(null, 10);
      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('FREE');
    });

    it('defaults to FREE when tier is undefined', () => {
      const result = checkScanLimit(undefined, 10);
      expect(result.tier).toBe('FREE');
    });

    it('returns limits in the result', () => {
      const result = checkScanLimit('FREE', 0);
      expect(result.limits).toBeDefined();
      expect(result.limits.name).toBe('Free');
    });
  });

  describe('checkMarketplaceLimit', () => {
    it('allows adding marketplace under FREE limit', () => {
      const result = checkMarketplaceLimit('FREE', 0);
      expect(result.allowed).toBe(true);
    });

    it('blocks adding marketplace at FREE limit', () => {
      const result = checkMarketplaceLimit('FREE', 1);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Marketplace limit reached');
    });

    it('allows more marketplaces for FLIPPER', () => {
      const result = checkMarketplaceLimit('FLIPPER', 2);
      expect(result.allowed).toBe(true);
    });

    it('blocks at FLIPPER limit', () => {
      const result = checkMarketplaceLimit('FLIPPER', 3);
      expect(result.allowed).toBe(false);
    });

    it('allows unlimited for PRO', () => {
      const result = checkMarketplaceLimit('PRO', 100);
      expect(result.allowed).toBe(true);
    });

    it('defaults to FREE for null tier', () => {
      const result = checkMarketplaceLimit(null, 1);
      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('FREE');
    });
  });

  describe('checkSearchConfigLimit', () => {
    it('allows adding search config under FREE limit', () => {
      const result = checkSearchConfigLimit('FREE', 2);
      expect(result.allowed).toBe(true);
    });

    it('blocks at FREE limit', () => {
      const result = checkSearchConfigLimit('FREE', 3);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Search config limit reached');
    });

    it('allows more for FLIPPER', () => {
      const result = checkSearchConfigLimit('FLIPPER', 19);
      expect(result.allowed).toBe(true);
    });

    it('blocks at FLIPPER limit', () => {
      const result = checkSearchConfigLimit('FLIPPER', 20);
      expect(result.allowed).toBe(false);
    });

    it('allows unlimited for PRO', () => {
      const result = checkSearchConfigLimit('PRO', 1000);
      expect(result.allowed).toBe(true);
    });

    it('defaults to FREE for undefined tier', () => {
      const result = checkSearchConfigLimit(undefined, 3);
      expect(result.tier).toBe('FREE');
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkFeatureAccess', () => {
    it('allows aiAnalysis for FREE tier', () => {
      const result = checkFeatureAccess('FREE', 'aiAnalysis');
      expect(result.allowed).toBe(true);
    });

    it('blocks priceHistory for FREE tier', () => {
      const result = checkFeatureAccess('FREE', 'priceHistory');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Price History');
      expect(result.reason).toContain('Free plan');
    });

    it('blocks messaging for FREE tier', () => {
      const result = checkFeatureAccess('FREE', 'messaging');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Messaging');
    });

    it('blocks ebayCrossListing for FREE tier', () => {
      const result = checkFeatureAccess('FREE', 'ebayCrossListing');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('eBay Cross-listing');
    });

    it('allows priceHistory for FLIPPER tier', () => {
      const result = checkFeatureAccess('FLIPPER', 'priceHistory');
      expect(result.allowed).toBe(true);
    });

    it('allows messaging for FLIPPER tier', () => {
      const result = checkFeatureAccess('FLIPPER', 'messaging');
      expect(result.allowed).toBe(true);
    });

    it('blocks ebayCrossListing for FLIPPER tier', () => {
      const result = checkFeatureAccess('FLIPPER', 'ebayCrossListing');
      expect(result.allowed).toBe(false);
    });

    it('allows all features for PRO tier', () => {
      for (const feature of ['aiAnalysis', 'priceHistory', 'messaging', 'ebayCrossListing'] as const) {
        const result = checkFeatureAccess('PRO', feature);
        expect(result.allowed).toBe(true);
      }
    });

    it('defaults to FREE for null tier', () => {
      const result = checkFeatureAccess(null, 'messaging');
      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('FREE');
    });
  });
});

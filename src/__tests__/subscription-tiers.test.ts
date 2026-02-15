import {
  TIER_LIMITS,
  getTierLimits,
  isAtScanLimit,
  canAddMarketplace,
  canAddSearchConfig,
  hasFeatureAccess,
} from '../lib/subscription-tiers';
import {
  checkScanLimit,
  checkMarketplaceLimit,
  checkSearchConfigLimit,
  checkFeatureAccess,
} from '../lib/tier-enforcement';

describe('Subscription Tiers', () => {
  describe('TIER_LIMITS', () => {
    it('defines Free tier with 10 scans/day and 1 marketplace', () => {
      expect(TIER_LIMITS.FREE.scansPerDay).toBe(10);
      expect(TIER_LIMITS.FREE.maxMarketplaces).toBe(1);
    });

    it('defines Flipper tier with unlimited scans and 3 marketplaces', () => {
      expect(TIER_LIMITS.FLIPPER.scansPerDay).toBeNull();
      expect(TIER_LIMITS.FLIPPER.maxMarketplaces).toBe(3);
    });

    it('defines Pro tier with all features', () => {
      expect(TIER_LIMITS.PRO.scansPerDay).toBeNull();
      expect(TIER_LIMITS.PRO.maxMarketplaces).toBe(Infinity);
      expect(TIER_LIMITS.PRO.ebayCrossListing).toBe(true);
      expect(TIER_LIMITS.PRO.messaging).toBe(true);
      expect(TIER_LIMITS.PRO.priceHistory).toBe(true);
    });

    it('Free tier lacks premium features', () => {
      expect(TIER_LIMITS.FREE.priceHistory).toBe(false);
      expect(TIER_LIMITS.FREE.messaging).toBe(false);
      expect(TIER_LIMITS.FREE.ebayCrossListing).toBe(false);
    });
  });

  describe('getTierLimits', () => {
    it('returns correct limits for valid tiers', () => {
      expect(getTierLimits('FREE')).toBe(TIER_LIMITS.FREE);
      expect(getTierLimits('FLIPPER')).toBe(TIER_LIMITS.FLIPPER);
      expect(getTierLimits('PRO')).toBe(TIER_LIMITS.PRO);
    });

    it('defaults to FREE for unknown or null tier', () => {
      expect(getTierLimits(null)).toBe(TIER_LIMITS.FREE);
      expect(getTierLimits(undefined)).toBe(TIER_LIMITS.FREE);
      expect(getTierLimits('INVALID')).toBe(TIER_LIMITS.FREE);
    });
  });

  describe('isAtScanLimit', () => {
    it('returns true when Free user hits 10 scans', () => {
      expect(isAtScanLimit('FREE', 10)).toBe(true);
      expect(isAtScanLimit('FREE', 15)).toBe(true);
    });

    it('returns false when Free user is under limit', () => {
      expect(isAtScanLimit('FREE', 9)).toBe(false);
      expect(isAtScanLimit('FREE', 0)).toBe(false);
    });

    it('never limits Flipper or Pro users', () => {
      expect(isAtScanLimit('FLIPPER', 1000)).toBe(false);
      expect(isAtScanLimit('PRO', 1000)).toBe(false);
    });
  });

  describe('canAddMarketplace', () => {
    it('Free user limited to 1 marketplace', () => {
      expect(canAddMarketplace('FREE', 0)).toBe(true);
      expect(canAddMarketplace('FREE', 1)).toBe(false);
    });

    it('Flipper user limited to 3 marketplaces', () => {
      expect(canAddMarketplace('FLIPPER', 2)).toBe(true);
      expect(canAddMarketplace('FLIPPER', 3)).toBe(false);
    });

    it('Pro user has unlimited marketplaces', () => {
      expect(canAddMarketplace('PRO', 100)).toBe(true);
    });
  });

  describe('canAddSearchConfig', () => {
    it('Free user limited to 3 search configs', () => {
      expect(canAddSearchConfig('FREE', 2)).toBe(true);
      expect(canAddSearchConfig('FREE', 3)).toBe(false);
    });

    it('Flipper user limited to 20 search configs', () => {
      expect(canAddSearchConfig('FLIPPER', 19)).toBe(true);
      expect(canAddSearchConfig('FLIPPER', 20)).toBe(false);
    });
  });

  describe('hasFeatureAccess', () => {
    it('all tiers have AI analysis', () => {
      expect(hasFeatureAccess('FREE', 'aiAnalysis')).toBe(true);
      expect(hasFeatureAccess('FLIPPER', 'aiAnalysis')).toBe(true);
      expect(hasFeatureAccess('PRO', 'aiAnalysis')).toBe(true);
    });

    it('Free lacks price history, messaging, eBay cross-listing', () => {
      expect(hasFeatureAccess('FREE', 'priceHistory')).toBe(false);
      expect(hasFeatureAccess('FREE', 'messaging')).toBe(false);
      expect(hasFeatureAccess('FREE', 'ebayCrossListing')).toBe(false);
    });

    it('only Pro has eBay cross-listing', () => {
      expect(hasFeatureAccess('FLIPPER', 'ebayCrossListing')).toBe(false);
      expect(hasFeatureAccess('PRO', 'ebayCrossListing')).toBe(true);
    });
  });
});

describe('Tier Enforcement', () => {
  describe('checkScanLimit', () => {
    it('allows Free user under limit', () => {
      const result = checkScanLimit('FREE', 5);
      expect(result.allowed).toBe(true);
    });

    it('blocks Free user at limit', () => {
      const result = checkScanLimit('FREE', 10);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily scan limit');
    });

    it('defaults to FREE for null tier', () => {
      const result = checkScanLimit(null, 10);
      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('FREE');
    });
  });

  describe('checkMarketplaceLimit', () => {
    it('blocks Free user adding second marketplace', () => {
      const result = checkMarketplaceLimit('FREE', 1);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Marketplace limit');
    });
  });

  describe('checkSearchConfigLimit', () => {
    it('blocks Free user over config limit', () => {
      const result = checkSearchConfigLimit('FREE', 3);
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkFeatureAccess', () => {
    it('blocks Free user from messaging', () => {
      const result = checkFeatureAccess('FREE', 'messaging');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Messaging');
    });

    it('allows Pro user all features', () => {
      expect(checkFeatureAccess('PRO', 'messaging').allowed).toBe(true);
      expect(checkFeatureAccess('PRO', 'ebayCrossListing').allowed).toBe(true);
      expect(checkFeatureAccess('PRO', 'priceHistory').allowed).toBe(true);
    });
  });
});

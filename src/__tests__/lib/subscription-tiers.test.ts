import {
  TIER_LIMITS,
  ALL_MARKETPLACES,
  getTierLimits,
  isAtScanLimit,
  canAddMarketplace,
  canAddSearchConfig,
  hasFeatureAccess,
  type SubscriptionTier,
} from '@/lib/subscription-tiers';

describe('subscription-tiers', () => {
  describe('TIER_LIMITS', () => {
    it('defines limits for FREE, FLIPPER, and PRO', () => {
      expect(TIER_LIMITS.FREE).toBeDefined();
      expect(TIER_LIMITS.FLIPPER).toBeDefined();
      expect(TIER_LIMITS.PRO).toBeDefined();
    });

    it('FREE tier has 10 scans per day', () => {
      expect(TIER_LIMITS.FREE.scansPerDay).toBe(10);
      expect(TIER_LIMITS.FREE.maxMarketplaces).toBe(1);
    });

    it('FLIPPER and PRO have unlimited scans', () => {
      expect(TIER_LIMITS.FLIPPER.scansPerDay).toBeNull();
      expect(TIER_LIMITS.PRO.scansPerDay).toBeNull();
    });

    it('PRO has ebayCrossListing enabled', () => {
      expect(TIER_LIMITS.PRO.ebayCrossListing).toBe(true);
      expect(TIER_LIMITS.FLIPPER.ebayCrossListing).toBe(false);
      expect(TIER_LIMITS.FREE.ebayCrossListing).toBe(false);
    });
  });

  describe('ALL_MARKETPLACES', () => {
    it('includes expected platforms', () => {
      expect(ALL_MARKETPLACES).toContain('CRAIGSLIST');
      expect(ALL_MARKETPLACES).toContain('EBAY');
      expect(ALL_MARKETPLACES).toHaveLength(5);
    });
  });

  describe('getTierLimits', () => {
    it('returns FREE limits for null/undefined', () => {
      expect(getTierLimits(null).name).toBe('Free');
      expect(getTierLimits(undefined).name).toBe('Free');
    });

    it('returns correct limits for valid tier', () => {
      expect(getTierLimits('PRO').name).toBe('Pro');
      expect(getTierLimits('FLIPPER').maxSearchConfigs).toBe(20);
    });

    it('defaults to FREE for unknown tier string', () => {
      expect(getTierLimits('UNKNOWN').name).toBe('Free');
    });
  });

  describe('isAtScanLimit', () => {
    it('returns true when FREE at 10 scans', () => {
      expect(isAtScanLimit('FREE', 10)).toBe(true);
      expect(isAtScanLimit('FREE', 11)).toBe(true);
    });

    it('returns false when FREE under 10', () => {
      expect(isAtScanLimit('FREE', 9)).toBe(false);
    });

    it('returns false for FLIPPER and PRO regardless of count', () => {
      expect(isAtScanLimit('FLIPPER', 1000)).toBe(false);
      expect(isAtScanLimit('PRO', 1000)).toBe(false);
    });
  });

  describe('canAddMarketplace', () => {
    it('FREE can add 0, cannot add 1', () => {
      expect(canAddMarketplace('FREE', 0)).toBe(true);
      expect(canAddMarketplace('FREE', 1)).toBe(false);
    });

    it('FLIPPER can add up to 3', () => {
      expect(canAddMarketplace('FLIPPER', 2)).toBe(true);
      expect(canAddMarketplace('FLIPPER', 3)).toBe(false);
    });

    it('PRO can add many', () => {
      expect(canAddMarketplace('PRO', 10)).toBe(true);
    });
  });

  describe('canAddSearchConfig', () => {
    it('FREE can add up to 3', () => {
      expect(canAddSearchConfig('FREE', 2)).toBe(true);
      expect(canAddSearchConfig('FREE', 3)).toBe(false);
    });

    it('FLIPPER can add up to 20', () => {
      expect(canAddSearchConfig('FLIPPER', 19)).toBe(true);
      expect(canAddSearchConfig('FLIPPER', 20)).toBe(false);
    });
  });

  describe('hasFeatureAccess', () => {
    it('FREE has aiAnalysis, not priceHistory or messaging', () => {
      expect(hasFeatureAccess('FREE', 'aiAnalysis')).toBe(true);
      expect(hasFeatureAccess('FREE', 'priceHistory')).toBe(false);
      expect(hasFeatureAccess('FREE', 'messaging')).toBe(false);
    });

    it('PRO has all features', () => {
      expect(hasFeatureAccess('PRO', 'ebayCrossListing')).toBe(true);
      expect(hasFeatureAccess('PRO', 'messaging')).toBe(true);
    });
  });
});

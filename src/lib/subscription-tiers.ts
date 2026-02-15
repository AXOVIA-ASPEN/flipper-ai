/**
 * Subscription tier definitions for Flipper AI.
 *
 * Free:    10 scans/day, 1 marketplace
 * Flipper: Unlimited scans, 3 marketplaces
 * Pro:     All features, unlimited everything
 */

export type SubscriptionTier = 'FREE' | 'FLIPPER' | 'PRO';

export interface TierLimits {
  /** Display name */
  name: string;
  /** Max scans (scraper jobs) per day. null = unlimited */
  scansPerDay: number | null;
  /** Max marketplaces the user can configure */
  maxMarketplaces: number;
  /** Max saved search configs */
  maxSearchConfigs: number;
  /** Max active scraper jobs at once */
  maxActiveJobs: number;
  /** Access to AI analysis */
  aiAnalysis: boolean;
  /** Access to price history */
  priceHistory: boolean;
  /** Access to messaging / contact seller */
  messaging: boolean;
  /** Access to eBay cross-listing */
  ebayCrossListing: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  FREE: {
    name: 'Free',
    scansPerDay: 10,
    maxMarketplaces: 1,
    maxSearchConfigs: 3,
    maxActiveJobs: 1,
    aiAnalysis: true,
    priceHistory: false,
    messaging: false,
    ebayCrossListing: false,
  },
  FLIPPER: {
    name: 'Flipper',
    scansPerDay: null, // unlimited
    maxMarketplaces: 3,
    maxSearchConfigs: 20,
    maxActiveJobs: 5,
    aiAnalysis: true,
    priceHistory: true,
    messaging: true,
    ebayCrossListing: false,
  },
  PRO: {
    name: 'Pro',
    scansPerDay: null, // unlimited
    maxMarketplaces: Infinity,
    maxSearchConfigs: Infinity,
    maxActiveJobs: 20,
    aiAnalysis: true,
    priceHistory: true,
    messaging: true,
    ebayCrossListing: true,
  },
};

/**
 * All supported marketplace platform identifiers.
 */
export const ALL_MARKETPLACES = [
  'CRAIGSLIST',
  'FACEBOOK_MARKETPLACE',
  'EBAY',
  'OFFERUP',
  'MERCARI',
] as const;

export type Marketplace = (typeof ALL_MARKETPLACES)[number];

/**
 * Get the tier limits for a user's subscription tier.
 * Defaults to FREE if tier is unknown.
 */
export function getTierLimits(tier?: string | null): TierLimits {
  if (tier && tier in TIER_LIMITS) {
    return TIER_LIMITS[tier as SubscriptionTier];
  }
  return TIER_LIMITS.FREE;
}

/**
 * Check if a user has reached their daily scan limit.
 */
export function isAtScanLimit(tier: SubscriptionTier, scansToday: number): boolean {
  const limits = TIER_LIMITS[tier];
  if (limits.scansPerDay === null) return false;
  return scansToday >= limits.scansPerDay;
}

/**
 * Check if a user can add another marketplace.
 */
export function canAddMarketplace(tier: SubscriptionTier, currentCount: number): boolean {
  const limits = TIER_LIMITS[tier];
  return currentCount < limits.maxMarketplaces;
}

/**
 * Check if a user can create another search config.
 */
export function canAddSearchConfig(tier: SubscriptionTier, currentCount: number): boolean {
  const limits = TIER_LIMITS[tier];
  return currentCount < limits.maxSearchConfigs;
}

/**
 * Check if a user has access to a specific feature.
 */
export function hasFeatureAccess(
  tier: SubscriptionTier,
  feature: keyof Pick<TierLimits, 'aiAnalysis' | 'priceHistory' | 'messaging' | 'ebayCrossListing'>
): boolean {
  return TIER_LIMITS[tier][feature];
}

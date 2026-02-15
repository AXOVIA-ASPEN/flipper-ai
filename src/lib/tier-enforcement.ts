/**
 * Tier enforcement utilities.
 * Use these in API routes to check subscription limits before allowing actions.
 */

import { getTierLimits, isAtScanLimit, canAddMarketplace, canAddSearchConfig, hasFeatureAccess } from './subscription-tiers';
import type { SubscriptionTier, TierLimits } from './subscription-tiers';

export interface TierCheckResult {
  allowed: boolean;
  reason?: string;
  tier: string;
  limits: TierLimits;
}

/**
 * Check if a user can perform a scan based on their tier and today's usage.
 */
export function checkScanLimit(tier: string | undefined | null, scansToday: number): TierCheckResult {
  const resolvedTier = (tier || 'FREE') as SubscriptionTier;
  const limits = getTierLimits(resolvedTier);

  if (isAtScanLimit(resolvedTier, scansToday)) {
    return {
      allowed: false,
      reason: `Daily scan limit reached (${limits.scansPerDay} scans/day on ${limits.name} plan). Upgrade for more scans.`,
      tier: resolvedTier,
      limits,
    };
  }

  return { allowed: true, tier: resolvedTier, limits };
}

/**
 * Check if a user can add a marketplace.
 */
export function checkMarketplaceLimit(tier: string | undefined | null, currentCount: number): TierCheckResult {
  const resolvedTier = (tier || 'FREE') as SubscriptionTier;
  const limits = getTierLimits(resolvedTier);

  if (!canAddMarketplace(resolvedTier, currentCount)) {
    return {
      allowed: false,
      reason: `Marketplace limit reached (${limits.maxMarketplaces} on ${limits.name} plan). Upgrade for more marketplaces.`,
      tier: resolvedTier,
      limits,
    };
  }

  return { allowed: true, tier: resolvedTier, limits };
}

/**
 * Check if a user can create a search config.
 */
export function checkSearchConfigLimit(tier: string | undefined | null, currentCount: number): TierCheckResult {
  const resolvedTier = (tier || 'FREE') as SubscriptionTier;
  const limits = getTierLimits(resolvedTier);

  if (!canAddSearchConfig(resolvedTier, currentCount)) {
    return {
      allowed: false,
      reason: `Search config limit reached (${limits.maxSearchConfigs} on ${limits.name} plan). Upgrade for more.`,
      tier: resolvedTier,
      limits,
    };
  }

  return { allowed: true, tier: resolvedTier, limits };
}

/**
 * Check if a user has access to a feature.
 */
export function checkFeatureAccess(
  tier: string | undefined | null,
  feature: 'aiAnalysis' | 'priceHistory' | 'messaging' | 'ebayCrossListing'
): TierCheckResult {
  const resolvedTier = (tier || 'FREE') as SubscriptionTier;
  const limits = getTierLimits(resolvedTier);

  if (!hasFeatureAccess(resolvedTier, feature)) {
    const featureNames: Record<string, string> = {
      aiAnalysis: 'AI Analysis',
      priceHistory: 'Price History',
      messaging: 'Messaging',
      ebayCrossListing: 'eBay Cross-listing',
    };
    return {
      allowed: false,
      reason: `${featureNames[feature]} is not available on the ${limits.name} plan. Upgrade to access this feature.`,
      tier: resolvedTier,
      limits,
    };
  }

  return { allowed: true, tier: resolvedTier, limits };
}

/**
 * @file src/lib/tier-enforcement.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 2.0
 * @brief Subscription tier enforcement — scan limits, marketplace limits, feature gates.
 *
 * @description
 * Provides check functions (checkScanLimit, checkMarketplaceLimit,
 * checkSearchConfigLimit, checkFeatureAccess) that return TierCheckResult
 * objects, plus enforceTierLimits() which queries the database and throws
 * ForbiddenError when limits are exceeded. Used by all scraper and
 * feature-gated API routes.
 */

import { getTierLimits, isAtScanLimit, canAddMarketplace, canAddSearchConfig, hasFeatureAccess } from './subscription-tiers';
import type { SubscriptionTier, TierLimits } from './subscription-tiers';
import prisma from './db';
import { ForbiddenError } from './errors';

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
      reason: 'Daily scan limit reached. Upgrade to FLIPPER for unlimited scans.',
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
    const marketplaceMessages: Record<string, string> = {
      FREE: 'FREE plan supports 1 marketplace. Upgrade to FLIPPER for 3 marketplaces.',
      FLIPPER: 'FLIPPER plan supports 3 marketplaces. Upgrade to PRO for all 5 marketplaces.',
    };
    return {
      allowed: false,
      /* istanbul ignore next -- fallback is unreachable: all limit-enforced tiers (FREE, FLIPPER) are in the messages map */
      reason: marketplaceMessages[resolvedTier] || `Marketplace limit reached (${limits.maxMarketplaces} on ${limits.name} plan). Upgrade for more marketplaces.`,
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
  feature: 'aiAnalysis' | 'priceHistory' | 'messaging' | 'ebayCrossListing' | 'meetingLogistics'
): TierCheckResult {
  const resolvedTier = (tier || 'FREE') as SubscriptionTier;
  const limits = getTierLimits(resolvedTier);

  if (!hasFeatureAccess(resolvedTier, feature)) {
    const featureNames: Record<string, string> = {
      aiAnalysis: 'AI Analysis',
      priceHistory: 'Price History',
      messaging: 'Messaging',
      ebayCrossListing: 'eBay Cross-listing',
      meetingLogistics: 'Meeting & Logistics',
    };
    return {
      allowed: false,
      /* istanbul ignore next -- ?? fallback is unreachable: all TypeScript-enforced feature keys exist in featureNames */
      reason: `${featureNames[feature] ?? feature} is not available on the ${limits.name} plan. Upgrade to access this feature.`,
      tier: resolvedTier,
      limits,
    };
  }

  return { allowed: true, tier: resolvedTier, limits };
}

/**
 * Async version: look up user tier from DB and enforce feature access.
 * Throws ForbiddenError if user does not have the required feature.
 * Used in API routes where userId is available but tier is not pre-loaded.
 *
 * @param userId  - Prisma user ID (cuid)
 * @param feature - Feature key to check
 */
export async function enforceFeatureAccess(
  userId: string,
  feature: 'aiAnalysis' | 'priceHistory' | 'messaging' | 'ebayCrossListing' | 'meetingLogistics'
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  const tier = user?.subscriptionTier ?? 'FREE';
  const result = checkFeatureAccess(tier, feature);
  if (!result.allowed) {
    throw new ForbiddenError(result.reason, { tier });
  }
}

/**
 * Enforce scan and marketplace tier limits for a user before creating a scraper job.
 * Queries the database for user tier, today's scan count, and all-time distinct
 * marketplaces (durable state). Throws ForbiddenError if any limit is exceeded.
 *
 * NOTE: The check-then-act pattern here is not atomic — concurrent requests can
 * slip past the daily scan limit by a small margin. At current traffic volumes
 * this is acceptable; if high concurrency becomes an issue, wrap the count check
 * and job creation in a serializable transaction or use a Redis atomic counter.
 */
export async function enforceTierLimits(userId: string, platform: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  const tier = user?.subscriptionTier ?? 'FREE';

  // Check daily scan limit
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const scansToday = await prisma.scraperJob.count({
    where: { userId, createdAt: { gte: startOfDay } },
  });
  const scanCheck = checkScanLimit(tier, scansToday);
  if (!scanCheck.allowed) {
    throw new ForbiddenError(scanCheck.reason, { tier });
  }

  // Check marketplace limit using all-time distinct platforms (durable state)
  const distinctMarketplaces = await prisma.scraperJob.groupBy({
    by: ['platform'],
    where: { userId },
  });
  const existingPlatforms = distinctMarketplaces.map((g) => g.platform);

  if (!existingPlatforms.includes(platform)) {
    const marketplaceCheck = checkMarketplaceLimit(tier, existingPlatforms.length);
    if (!marketplaceCheck.allowed) {
      throw new ForbiddenError(marketplaceCheck.reason, { tier });
    }
  }
}

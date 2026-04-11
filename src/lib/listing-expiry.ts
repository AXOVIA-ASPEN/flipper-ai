/**
 * @file src/lib/listing-expiry.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief Platform-specific listing expiry computation and expiry detection queries.
 *
 * @description
 * Provides computeEstimatedExpiry() to compute a best-effort expiry date from
 * a listing's postedAt timestamp and platform-specific defaults, and
 * getExpiringListings() to query listings that are within a given time window
 * of their estimated expiry.
 *
 * Platform defaults are heuristic:
 *  - Craigslist: 7 days (consistent auto-expiry)
 *  - eBay: 30 days (GTC Buy It Now default)
 *  - Facebook Marketplace: 7 days (sellers can renew)
 *  - Mercari: null (no standard expiry)
 *  - OfferUp: null (no standard expiry)
 */

import { prisma } from '@/lib/db';
import { TRACKABLE_STATUSES } from '@/lib/listing-tracker';

// ---------------------------------------------------------------------------
// Platform expiry defaults
// ---------------------------------------------------------------------------

/** Days until expiry per platform. `null` means the platform has no standard expiry. */
export const PLATFORM_EXPIRY_DAYS: Record<string, number | null> = {
  CRAIGSLIST: 7,
  EBAY: 30,
  FACEBOOK_MARKETPLACE: 7,
  MERCARI: null,
  OFFERUP: null,
};

// ---------------------------------------------------------------------------
// computeEstimatedExpiry
// ---------------------------------------------------------------------------

/**
 * Compute an estimated expiry date for a listing based on its platform and post date.
 *
 * Returns `null` when:
 *  - The platform has no standard expiry (Mercari, OfferUp)
 *  - `postedAt` is null/undefined
 *  - The platform is unrecognised
 */
export function computeEstimatedExpiry(
  platform: string,
  postedAt: Date | null | undefined
): Date | null {
  if (!postedAt) return null;

  const days = PLATFORM_EXPIRY_DAYS[platform];
  if (days === null || days === undefined) return null;

  const expiry = new Date(postedAt.getTime());
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

// ---------------------------------------------------------------------------
// Listing shape returned by getExpiringListings
// ---------------------------------------------------------------------------

export interface ExpiringListing {
  id: string;
  title: string;
  platform: string;
  url: string;
  askingPrice: number;
  userId: string | null;
  estimatedExpiresAt: Date;
  postedAt: Date | null;
}

// ---------------------------------------------------------------------------
// getExpiringListings
// ---------------------------------------------------------------------------

/**
 * Return active listings whose `estimatedExpiresAt` falls within the next
 * `withinHours` hours (default 24).
 *
 * Only listings in TRACKABLE_STATUSES are returned — terminal listings
 * (SOLD, EXPIRED, PASSED) are excluded.
 */
export async function getExpiringListings(withinHours = 24): Promise<ExpiringListing[]> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + withinHours * 3_600_000);

  const rows = await prisma.listing.findMany({
    where: {
      estimatedExpiresAt: {
        not: null,
        gte: now,
        lte: windowEnd,
      },
      status: { in: TRACKABLE_STATUSES },
    },
    select: {
      id: true,
      title: true,
      platform: true,
      url: true,
      askingPrice: true,
      userId: true,
      estimatedExpiresAt: true,
      postedAt: true,
    },
  });

  // estimatedExpiresAt is guaranteed non-null by the `not: null` filter above,
  // but TypeScript doesn't narrow the generated type — cast to satisfy the interface.
  return rows.map((r) => ({
    ...r,
    estimatedExpiresAt: r.estimatedExpiresAt as Date,
  }));
}

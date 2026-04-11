/**
 * @file src/lib/listing-tracker.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 2.0
 * @brief Listing state detection primitives and monitoring utilities.
 *
 * @description
 * Provides detectSoldStatus(), extractCurrentPrice(), getTrackableListings(),
 * processListingCheck(), and runTrackingCycle() as building blocks for listing
 * monitoring.
 *
 * Story 10.1 additions:
 *  - updateListingStateWithEvent(tx, ...) — atomic listing-state-update + NotificationEvent
 *    insert inside a caller-supplied prisma.$transaction()
 *  - getTrackableListings() extended with cursor/take/userId options and lastMonitoredAt
 *  - classifyHttpResponse() — distinguishes genuine removal from rate-limit/access-denied
 *  - isPriceChangeMeaningful() — minimum-delta threshold to suppress noise
 *  - Anomaly detection helpers: updatePlatformParseStats() / isAnomalyThresholdExceeded()
 */

import { prisma } from './db';
import { RateLimitError } from '@/lib/errors';
import {
  createNotificationEvent,
  NotificationEventType,
  type NotificationEventInput,
  type NotificationEventPayload,
} from '@/lib/notification-events';
import { sseEmitter, type SseEventType } from '@/lib/sse-emitter';

// Derive the transaction client type from the prisma singleton to avoid
// dual-instance type conflicts between @prisma/client and the generated client.
export type PrismaTxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export interface ListingStatusChange {
  listingId: string;
  title: string;
  platform: string;
  previousStatus: string;
  newStatus: string;
  detectedAt: Date;
}

export interface PriceChange {
  listingId: string;
  title: string;
  platform: string;
  previousPrice: number;
  newPrice: number;
  changePercent: number;
  direction: 'increase' | 'decrease';
  detectedAt: Date;
}

export interface TrackingResult {
  checked: number;
  statusChanges: ListingStatusChange[];
  priceChanges: PriceChange[];
  errors: Array<{ listingId: string; error: string }>;
}

// Statuses that indicate a listing is still active and should be tracked
const TRACKABLE_STATUSES = ['NEW', 'ANALYZING', 'OPPORTUNITY', 'CONTACTED', 'PURCHASED', 'LISTED'];

// Statuses that indicate a listing is no longer available
const TERMINAL_STATUSES = ['SOLD', 'EXPIRED', 'PASSED'];

/**
 * Detect if a listing page indicates the item has sold.
 * This checks common patterns across marketplace platforms.
 */
export function detectSoldStatus(pageContent: string, platform: string): boolean {
  const lowerContent = pageContent.toLowerCase();

  const soldIndicators: Record<string, string[]> = {
    CRAIGSLIST: ['this posting has been deleted', 'this posting has expired', 'no longer available'],
    FACEBOOK_MARKETPLACE: ['sold', 'no longer available', 'this listing is unavailable'],
    EBAY: ['this listing has ended', 'winning bid', 'sold for'],
    OFFERUP: ['sold', 'this item is no longer available', 'item sold'],
    MERCARI: ['sold', 'item sold', 'this item has been sold'],
  };

  const indicators = soldIndicators[platform] || ['sold', 'no longer available'];
  return indicators.some((indicator) => lowerContent.includes(indicator));
}

/**
 * Extract current price from a listing page.
 * Returns null if price cannot be determined.
 */
export function extractCurrentPrice(pageContent: string, platform: string): number | null {
  // Common price patterns: $1,234.56 or $1234 or $1,234
  const pricePatterns = [
    /\$\s?([\d,]+(?:\.\d{2})?)/,
    /price[:\s]*\$?\s?([\d,]+(?:\.\d{2})?)/i,
    /asking[:\s]*\$?\s?([\d,]+(?:\.\d{2})?)/i,
  ];

  // Platform-specific patterns
  const platformPatterns: Record<string, RegExp[]> = {
    CRAIGSLIST: [/class="price"[^>]*>\$?([\d,]+)/],
    EBAY: [/prc"[^>]*>\$?([\d,]+(?:\.\d{2})?)</, /itemprop="price"[^>]*content="([\d.]+)"/],
    FACEBOOK_MARKETPLACE: [/price[^>]*>\$?([\d,]+)/],
    OFFERUP: [/price[^>]*>\$?([\d,]+)/],
    MERCARI: [/price[^>]*>\$?([\d,]+)/],
  };

  const allPatterns = [...(platformPatterns[platform] || []), ...pricePatterns];

  for (const pattern of allPatterns) {
    const match = pageContent.match(pattern);
    if (match) {
      const priceStr = match[1].replace(/,/g, '');
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }
  }

  return null;
}

export interface TrackableListingsOptions {
  /** Cursor ID for pagination — the ID of the last item returned in the previous page */
  cursor?: string;
  /** Maximum number of listings to return */
  take?: number;
  /** Scope results to a specific user */
  userId?: string;
}

export interface TrackableListing {
  id: string;
  title: string;
  platform: string;
  url: string;
  askingPrice: number;
  status: string;
  userId: string | null;
  lastMonitoredAt: Date | null;
}

/**
 * Get listings that should be actively tracked.
 *
 * Ordered by lastMonitoredAt ASC (nulls first) for round-robin fairness.
 * Supports cursor-based pagination and optional per-user scoping.
 */
export async function getTrackableListings(
  options: TrackableListingsOptions = {}
): Promise<TrackableListing[]> {
  const { cursor, take, userId } = options;

  const listings = await prisma.listing.findMany({
    where: {
      status: { in: TRACKABLE_STATUSES },
      ...(userId ? { userId } : {}),
    },
    select: {
      id: true,
      title: true,
      platform: true,
      url: true,
      askingPrice: true,
      status: true,
      userId: true,
      lastMonitoredAt: true,
    },
    orderBy: [{ lastMonitoredAt: 'asc' }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    ...(take ? { take } : {}),
  });

  return listings;
}

/**
 * Process a single listing check result.
 * Updates the listing in the database if changes are detected.
 */
export async function processListingCheck(
  listingId: string,
  isSold: boolean,
  currentPrice: number | null,
  currentAskingPrice: number
): Promise<{
  statusChange: ListingStatusChange | null;
  priceChange: PriceChange | null;
}> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    throw new Error(`Listing ${listingId} not found`);
  }

  let statusChange: ListingStatusChange | null = null;
  let priceChange: PriceChange | null = null;
  const now = new Date();

  // Check for sold status
  if (isSold && !TERMINAL_STATUSES.includes(listing.status)) {
    statusChange = {
      listingId: listing.id,
      title: listing.title,
      platform: listing.platform,
      previousStatus: listing.status,
      newStatus: 'SOLD',
      detectedAt: now,
    };

    await prisma.listing.update({
      where: { id: listingId },
      data: { status: 'SOLD' },
    });
  }

  // Check for price change (only if not sold)
  if (!isSold && currentPrice !== null && currentPrice !== currentAskingPrice) {
    const changePercent = ((currentPrice - currentAskingPrice) / currentAskingPrice) * 100;

    // Only record significant changes (> 1%)
    if (Math.abs(changePercent) > 1) {
      priceChange = {
        listingId: listing.id,
        title: listing.title,
        platform: listing.platform,
        previousPrice: currentAskingPrice,
        newPrice: currentPrice,
        changePercent: Math.round(changePercent * 100) / 100,
        direction: changePercent > 0 ? 'increase' : 'decrease',
        detectedAt: now,
      };

      await prisma.listing.update({
        where: { id: listingId },
        data: {
          askingPrice: currentPrice,
          notes: listing.notes
            ? `${listing.notes}\n[${now.toISOString()}] Price changed: $${currentAskingPrice} → $${currentPrice}`
            : `[${now.toISOString()}] Price changed: $${currentAskingPrice} → $${currentPrice}`,
        },
      });
    }
  }

  return { statusChange, priceChange };
}

/**
 * Run a full tracking cycle across all trackable listings.
 * Takes a fetcher function that retrieves page content for a URL.
 */
export async function runTrackingCycle(
  fetchPage: (url: string) => Promise<string | null>
): Promise<TrackingResult> {
  const listings = await getTrackableListings();
  const result: TrackingResult = {
    checked: 0,
    statusChanges: [],
    priceChanges: [],
    errors: [],
  };

  for (const listing of listings) {
    try {
      const pageContent = await fetchPage(listing.url);

      if (!pageContent) {
        result.errors.push({
          listingId: listing.id,
          error: 'Failed to fetch listing page',
        });
        continue;
      }

      const isSold = detectSoldStatus(pageContent, listing.platform);
      const currentPrice = extractCurrentPrice(pageContent, listing.platform);

      const { statusChange, priceChange } = await processListingCheck(
        listing.id,
        isSold,
        currentPrice,
        listing.askingPrice
      );

      if (statusChange) result.statusChanges.push(statusChange);
      if (priceChange) result.priceChanges.push(priceChange);
      result.checked++;
    } catch (error) {
      result.errors.push({
        listingId: listing.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

export { TRACKABLE_STATUSES, TERMINAL_STATUSES };

// ---------------------------------------------------------------------------
// Story 10.1 additions
// ---------------------------------------------------------------------------

/**
 * HTTP response classification result.
 * Distinguishes genuine listing removal from transient access-denied responses.
 */
export type HttpResponseClassification =
  | 'removed'        // HTTP 404/410, "deleted"/"flagged"/"removed" text → listing.unavailable
  | 'rate_limited'   // HTTP 403/429, CAPTCHA, "blocked"/"verify" text → RateLimitError, no event
  | 'ok';            // HTTP 200 with parseable content

/**
 * Classify an HTTP response status + body to determine whether the listing
 * has been genuinely removed, we're being rate-limited, or the check succeeded.
 */
export function classifyHttpResponse(
  status: number,
  body: string
): HttpResponseClassification {
  // Genuine removal
  if (status === 404 || status === 410) return 'removed';

  const lower = body.toLowerCase();
  if (
    lower.includes('this posting has been deleted') ||
    lower.includes('flagged for removal') ||
    lower.includes('listing has been removed') ||
    lower.includes('item has been deleted')
  ) {
    return 'removed';
  }

  // Transient access-denied / rate-limit
  if (status === 403 || status === 429) return 'rate_limited';
  if (
    lower.includes('captcha') ||
    lower.includes('verify you are human') ||
    lower.includes('access denied') ||
    lower.includes('you have been blocked') ||
    lower.includes('your access has been blocked') ||
    lower.includes('ip has been blocked')
  ) {
    return 'rate_limited';
  }

  return 'ok';
}

/**
 * Granular reason classification for listing.unavailable events.
 * Populated on the NotificationEvent payload so downstream processors can
 * distinguish between "genuinely removed" and "seller deleted" / "moderator
 * flagged" / "auto-expired" outcomes.
 *
 * Priority order (first match wins):
 *   HTTP 404/410            → 'removed'
 *   body contains 'deleted' → 'deleted'
 *   body contains 'flagged' → 'flagged'
 *   body contains 'expired' → 'expired'
 *   body contains 'removed' → 'removed'
 *   otherwise               → 'unknown'
 */
export type UnavailableReason = 'removed' | 'deleted' | 'flagged' | 'expired' | 'unknown';

export function classifyUnavailableReason(status: number, body: string): UnavailableReason {
  if (status === 404 || status === 410) return 'removed';

  const lower = body.toLowerCase();
  if (lower.includes('deleted')) return 'deleted';
  if (lower.includes('flagged')) return 'flagged';
  if (lower.includes('expired')) return 'expired';
  if (lower.includes('removed')) return 'removed';

  return 'unknown';
}

/**
 * Return true if the price delta is large enough to generate a notification.
 * Suppresses noise from minor rounding differences.
 */
export function isPriceChangeMeaningful(
  oldPrice: number,
  newPrice: number,
  minDeltaAbsolute: number,
  minDeltaPercent: number
): boolean {
  const absChange = Math.abs(newPrice - oldPrice);
  const threshold = Math.max(minDeltaAbsolute, oldPrice * minDeltaPercent / 100);
  return absChange >= threshold;
}

// ---------------------------------------------------------------------------
// Per-platform parse statistics (for canary / anomaly detection)
// ---------------------------------------------------------------------------

export interface PlatformParseStats {
  checked: number;
  parsed: number;    // non-null price extraction
  events: number;
  unavailable: number;
}

/**
 * Update a mutable stats map for a platform after checking one listing.
 */
export function updatePlatformParseStats(
  stats: Record<string, PlatformParseStats>,
  platform: string,
  parsed: boolean,
  hadEvent: boolean,
  wasUnavailable: boolean
): void {
  if (!stats[platform]) {
    stats[platform] = { checked: 0, parsed: 0, events: 0, unavailable: 0 };
  }
  stats[platform].checked++;
  if (parsed) stats[platform].parsed++;
  if (hadEvent) stats[platform].events++;
  if (wasUnavailable) stats[platform].unavailable++;
}

/**
 * Return true if the platform's unavailable ratio exceeds the threshold.
 * Requires at least 3 checks before triggering to avoid false positives on
 * very small batches.
 */
export function isAnomalyThresholdExceeded(
  stats: PlatformParseStats,
  thresholdPercent: number
): boolean {
  if (stats.checked < 3) return false;
  const ratio = (stats.unavailable / stats.checked) * 100;
  return ratio > thresholdPercent;
}

// ---------------------------------------------------------------------------
// Atomic listing state update + notification event (Story 10.1)
// ---------------------------------------------------------------------------

export type StateChangeType = NotificationEventType;

export interface StateChange {
  type: StateChangeType;
  // listing.sold
  soldIndicator?: string;
  // listing.price_changed
  oldPrice?: number;
  newPrice?: number;
  changePercent?: number;
  direction?: 'increase' | 'decrease';
  // listing.expiring
  estimatedExpiresAt?: string; // ISO-8601
  hoursRemaining?: number;
  /** @deprecated Use estimatedExpiresAt. */
  expiryDate?: string;
  // listing.unavailable
  reason?: string;
}

/**
 * Atomically update listing state and insert a NotificationEvent.
 *
 * This function MUST be called within a prisma.$transaction():
 *
 *   await prisma.$transaction(tx =>
 *     updateListingStateWithEvent(tx, listingId, listing, change, event)
 *   );
 *
 * Using the global prisma client instead of `tx` breaks atomicity — if the
 * event insert fails the listing update would not be rolled back.
 *
 * Also updates lastMonitoredAt on the listing.
 */
export async function updateListingStateWithEvent(
  tx: PrismaTxClient,
  listingId: string,
  listing: { userId: string | null; title: string; url: string; platform: string },
  change: StateChange
): Promise<void> {
  const now = new Date();

  // Determine which listing fields change
  const listingUpdate: Record<string, unknown> = {
    lastMonitoredAt: now,
  };

  if (change.type === NotificationEventType.LISTING_SOLD) {
    listingUpdate.status = 'SOLD';
  } else if (change.type === NotificationEventType.LISTING_UNAVAILABLE) {
    listingUpdate.status = 'EXPIRED';
  } else if (
    change.type === NotificationEventType.LISTING_PRICE_CHANGED &&
    change.newPrice !== undefined
  ) {
    listingUpdate.askingPrice = change.newPrice;
  }

  await tx.listing.update({
    where: { id: listingId },
    data: listingUpdate,
  });

  // Build and insert notification event (requires a real userId)
  const userId = listing.userId;
  if (userId) {
    const payload: NotificationEventPayload = {
      eventType: change.type,
      listingTitle: listing.title,
      listingUrl: listing.url,
      platform: listing.platform,
      // listing.sold
      ...(change.soldIndicator !== undefined ? { soldIndicator: change.soldIndicator } : {}),
      // listing.price_changed
      ...(change.oldPrice !== undefined ? { oldPrice: change.oldPrice } : {}),
      ...(change.newPrice !== undefined ? { newPrice: change.newPrice } : {}),
      ...(change.changePercent !== undefined ? { changePercent: change.changePercent } : {}),
      ...(change.direction !== undefined ? { direction: change.direction } : {}),
      // listing.expiring
      ...(change.estimatedExpiresAt !== undefined ? { estimatedExpiresAt: change.estimatedExpiresAt } : {}),
      ...(change.hoursRemaining !== undefined ? { hoursRemaining: change.hoursRemaining } : {}),
      ...(change.expiryDate !== undefined ? { expiryDate: change.expiryDate } : {}),
      // listing.unavailable
      ...(change.reason !== undefined ? { reason: change.reason } : {}),
    };

    await createNotificationEvent(tx as Parameters<Parameters<typeof prisma.$transaction>[0]>[0], {
      userId,
      listingId,
      eventType: change.type,
      payload,
    });
  }
}

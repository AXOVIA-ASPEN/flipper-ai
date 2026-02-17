// Listing Tracker Service
// Monitors tracked listings for status changes (SOLD) and price changes
// Runs periodically to re-check active listings on their source platforms

import { prisma } from './db';

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

/**
 * Get all listings that should be actively tracked.
 */
export async function getTrackableListings(): Promise<
  Array<{
    id: string;
    title: string;
    platform: string;
    url: string;
    askingPrice: number;
    status: string;
    userId: string | null;
  }>
> {
  const listings = await prisma.listing.findMany({
    where: {
      status: { in: TRACKABLE_STATUSES },
    },
    select: {
      id: true,
      title: true,
      platform: true,
      url: true,
      askingPrice: true,
      status: true,
      userId: true,
    },
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

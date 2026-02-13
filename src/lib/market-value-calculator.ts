/**
 * Market Value Calculator
 * Author: Stephen Boyett
 * Company: Axovia AI
 * 
 * Calculates verified market value from sold listing data.
 * Implements outlier handling and statistical analysis.
 */

import prisma from "@/lib/db";

export interface MarketValueResult {
  verifiedMarketValue: number;
  marketDataSource: string;
  trueDiscountPercent: number;
  dataPoints: number;
  confidence: "low" | "medium" | "high";
  soldPriceRange: { min: number; max: number; median: number; average: number };
  outliers: { removed: number; method: string };
}

/**
 * Calculate verified market value from sold price history.
 * Uses interquartile range (IQR) method to detect and remove outliers.
 * 
 * @param productName - Product title or keywords to search for
 * @param platform - Marketplace platform (default: EBAY)
 * @param maxAge - Maximum age of sold listings in days (default: 90)
 * @returns Market value result or null if insufficient data
 */
export async function calculateVerifiedMarketValue(
  productName: string,
  platform: string = "EBAY",
  maxAge: number = 90
): Promise<MarketValueResult | null> {
  // Fetch recent sold listings
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAge);

  const soldListings = await prisma.priceHistory.findMany({
    where: {
      productName: {
        contains: productName,
        mode: "insensitive",
      },
      platform,
      soldAt: {
        gte: cutoffDate,
      },
      soldPrice: {
        gt: 0,
      },
    },
    orderBy: {
      soldAt: "desc",
    },
    take: 100, // Limit to most recent 100 sales
  });

  if (soldListings.length < 3) {
    // Need at least 3 data points for meaningful analysis
    return null;
  }

  // Extract prices
  let prices = soldListings.map((listing) => listing.soldPrice);
  const originalCount = prices.length;

  // Remove outliers using IQR method
  prices.sort((a, b) => a - b);
  const q1Index = Math.floor(prices.length * 0.25);
  const q3Index = Math.floor(prices.length * 0.75);
  const q1 = prices[q1Index];
  const q3 = prices[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  // Filter outliers
  const filteredPrices = prices.filter((p) => p >= lowerBound && p <= upperBound);
  const outliersRemoved = originalCount - filteredPrices.length;

  // Calculate statistics
  const min = filteredPrices[0];
  const max = filteredPrices[filteredPrices.length - 1];
  const median = filteredPrices[Math.floor(filteredPrices.length / 2)];
  const average = filteredPrices.reduce((sum, p) => sum + p, 0) / filteredPrices.length;

  // Use median as verified market value (more robust to remaining outliers)
  const verifiedMarketValue = Math.round(median);

  // Determine confidence based on data points and price variance
  let confidence: "low" | "medium" | "high" = "medium";
  const priceRange = max - min;
  const variance = priceRange / average;

  if (filteredPrices.length >= 10 && variance < 0.3) {
    confidence = "high";
  } else if (filteredPrices.length < 5 || variance > 0.5) {
    confidence = "low";
  }

  const result: MarketValueResult = {
    verifiedMarketValue,
    marketDataSource: `${platform.toLowerCase()}_sold`,
    trueDiscountPercent: 0, // Will be calculated when comparing to asking price
    dataPoints: filteredPrices.length,
    confidence,
    soldPriceRange: {
      min: Math.round(min),
      max: Math.round(max),
      median: Math.round(median),
      average: Math.round(average),
    },
    outliers: {
      removed: outliersRemoved,
      method: "IQR (1.5x)",
    },
  };

  return result;
}

/**
 * Calculate true discount percentage given verified market value and asking price.
 * 
 * @param verifiedMarketValue - Verified market value from sold data
 * @param askingPrice - Current listing's asking price
 * @returns Discount percentage (positive means below market, negative means above)
 */
export function calculateTrueDiscount(
  verifiedMarketValue: number,
  askingPrice: number
): number {
  if (verifiedMarketValue === 0) return 0;
  return Math.round(((verifiedMarketValue - askingPrice) / verifiedMarketValue) * 100);
}

/**
 * Update a listing with verified market value data.
 * Fetches sold listings, calculates market value, and updates the database.
 * 
 * @param listingId - Listing ID to update
 * @returns Updated listing or null if insufficient data
 */
export async function updateListingWithVerifiedValue(
  listingId: string
): Promise<typeof listing | null> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    throw new Error(`Listing not found: ${listingId}`);
  }

  // Calculate verified market value
  const marketValue = await calculateVerifiedMarketValue(
    listing.title,
    listing.platform
  );

  if (!marketValue) {
    // Insufficient data - keep algorithmic estimates
    return null;
  }

  // Calculate true discount
  const trueDiscountPercent = calculateTrueDiscount(
    marketValue.verifiedMarketValue,
    listing.askingPrice
  );

  // Update listing
  const updatedListing = await prisma.listing.update({
    where: { id: listingId },
    data: {
      verifiedMarketValue: marketValue.verifiedMarketValue,
      marketDataSource: marketValue.marketDataSource,
      trueDiscountPercent,
    },
  });

  return updatedListing;
}

/**
 * Batch update all listings with verified market values.
 * Useful for backfilling existing listings or periodic refresh.
 * 
 * @param platform - Platform to update (default: all platforms)
 * @param batchSize - Number of listings to process per batch (default: 50)
 * @returns Summary of updates
 */
export async function batchUpdateVerifiedValues(
  platform?: string,
  batchSize: number = 50
): Promise<{ updated: number; skipped: number; errors: number }> {
  const where = platform ? { platform } : {};

  const listings = await prisma.listing.findMany({
    where,
    select: { id: true, title: true, platform: true, askingPrice: true },
    take: batchSize,
  });

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const listing of listings) {
    try {
      const result = await updateListingWithVerifiedValue(listing.id);
      if (result) {
        updated++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Error updating listing ${listing.id}:`, error);
      errors++;
    }
  }

  return { updated, skipped, errors };
}

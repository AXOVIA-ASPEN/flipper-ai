// Price History Service - Integrates eBay market price scraper with database
// Fetches sold listings and stores them for analysis

import { prisma } from "./db";
import {
  fetchMarketPrice,
  fetchMarketPricesBatch,
  type MarketPrice,
  type SoldListing,
} from "./market-price";

export interface PriceHistoryQuery {
  productName: string;
  category?: string;
  limit?: number;
}

/**
 * Fetch and store price history for a product
 * Returns the market price data and stores sold listings in database
 */
export async function fetchAndStorePriceHistory(
  productName: string,
  category?: string
): Promise<MarketPrice | null> {
  console.log(`Fetching price history for: ${productName}`);

  // Fetch from eBay sold listings
  const marketData = await fetchMarketPrice(productName, category);

  if (!marketData) {
    console.log(`No market data found for: ${productName}`);
    return null;
  }

  // Store each sold listing in PriceHistory
  const priceRecords = marketData.soldListings.map((listing: SoldListing) => ({
    productName,
    category: category || null,
    platform: "EBAY",
    soldPrice: listing.price + listing.shippingCost, // Total price
    condition: listing.condition,
    soldAt: listing.soldDate || new Date(), // Use fetch date if sold date unknown
  }));

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.priceHistory.createMany as any)({
      data: priceRecords,
      skipDuplicates: true,
    });

    console.log(
      `✅ Stored ${priceRecords.length} price history records for: ${productName}`
    );
  } catch (error) {
    console.error("Error storing price history:", error);
  }

  return marketData;
}

/**
 * Get price history from database for a product
 */
export async function getPriceHistory(
  query: PriceHistoryQuery
): Promise<{
  productName: string;
  category?: string;
  soldListings: Array<{
    platform: string;
    soldPrice: number;
    condition: string | null;
    soldAt: Date;
  }>;
  stats: {
    count: number;
    avgPrice: number;
    medianPrice: number;
    minPrice: number;
    maxPrice: number;
  };
}> {
  const { productName, category, limit = 50 } = query;

  // Get price history from database
  const priceRecords = await prisma.priceHistory.findMany({
    where: {
      productName: { contains: productName },
      ...(category && { category }),
    },
    orderBy: { soldAt: "desc" },
    take: limit,
  });

  if (priceRecords.length === 0) {
    return {
      productName,
      category,
      soldListings: [],
      stats: {
        count: 0,
        avgPrice: 0,
        medianPrice: 0,
        minPrice: 0,
        maxPrice: 0,
      },
    };
  }

  // Calculate statistics
  const prices = priceRecords.map((r) => r.soldPrice);
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sortedPrices.length / 2);
  const median =
    sortedPrices.length % 2 !== 0
      ? sortedPrices[mid]
      : (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;

  return {
    productName,
    category,
    soldListings: priceRecords.map((r) => ({
      platform: r.platform,
      soldPrice: r.soldPrice,
      condition: r.condition,
      soldAt: r.soldAt,
    })),
    stats: {
      count: priceRecords.length,
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      medianPrice: median,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    },
  };
}

/**
 * Update listing with verified market value from price history
 */
export async function updateListingWithMarketValue(
  listingId: string
): Promise<void> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    throw new Error(`Listing not found: ${listingId}`);
  }

  // Fetch and store price history
  const marketData = await fetchAndStorePriceHistory(
    listing.title,
    listing.category || undefined
  );

  if (!marketData) {
    console.log(`No market data available for listing: ${listingId}`);
    return;
  }

  // Update listing with verified market value
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      verifiedMarketValue: marketData.medianPrice,
      marketDataSource: "ebay_scrape",
      marketDataDate: new Date(),
      comparableSalesJson: JSON.stringify(marketData.soldListings),
      trueDiscountPercent:
        ((marketData.medianPrice - listing.askingPrice) /
          marketData.medianPrice) *
        100,
    },
  });

  console.log(
    `✅ Updated listing ${listingId} with verified market value: $${marketData.medianPrice}`
  );
}

/**
 * Batch update multiple listings with market values
 */
export async function batchUpdateListingsWithMarketValue(
  listingIds: string[]
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ listingId: string; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ listingId: string; error: string }>,
  };

  for (const listingId of listingIds) {
    try {
      await updateListingWithMarketValue(listingId);
      results.success++;

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      results.failed++;
      results.errors.push({
        listingId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

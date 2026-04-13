/**
 * @file src/lib/cross-platform-price.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Cross-platform price intelligence service for verified market value estimation.
 *
 * @description
 * Orchestrates parallel price lookups across eBay (sold), Mercari (sold),
 * Facebook Marketplace (active), Craigslist (active), and OfferUp (active)
 * to produce a weighted, IQR-filtered aggregate market value. Sold data
 * is weighted 2x vs active listings. Replaces hardcoded category multipliers
 * as the primary value estimation method when sufficient data is available.
 */

import { fetchMarketPrice, filterOutliers } from './market-price';
import type { MercariItem } from '@/scrapers/mercari/types';
import prisma from '@/lib/db';
import { fetchSoldListings, getEbayToken, parseEbayPrice } from '@/scrapers/ebay/scraper';

// --- Types ---

export interface PlatformPriceData {
  platform: 'ebay' | 'mercari' | 'facebook' | 'craigslist' | 'offerup';
  dataType: 'sold' | 'active';
  /** Raw IQR-filtered prices (before fee deduction) */
  rawPrices: number[];
  /** Net prices after platform fee deduction: rawPrice * (1 - feeRate) */
  netPrices: number[];
  medianPrice: number;
  priceRange: { low: number; high: number };
  compCount: number;
  feeRate: number;
  netMedianPrice: number;
  fetchTimeMs: number;
}

export interface CrossPlatformPriceResult {
  verifiedMarketValue: number;
  confidence: 'low' | 'medium' | 'high';
  platformData: PlatformPriceData[];
  totalSoldComps: number;
  totalActiveComps: number;
  fetchedAt: Date;
  searchQuery: string;
}

// --- Constants ---

const PLATFORM_FEES: Record<string, number> = {
  ebay: 0.13,
  mercari: 0.10,
  facebook: 0.05,
  offerup: 0.129,
  craigslist: 0.0,
};

const PLATFORM_TIMEOUT_MS = 10_000;
const TOTAL_TIMEOUT_MS = 30_000;

// --- Weighted median ---

interface WeightedPrice {
  price: number;
  weight: number;
}

export function weightedMedian(items: WeightedPrice[]): number {
  if (items.length === 0) return 0;
  const sorted = [...items].sort((a, b) => a.price - b.price);
  const totalWeight = sorted.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight === 0) return 0;
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.weight;
    if (cumulative >= totalWeight / 2) return item.price;
  }
  return sorted[sorted.length - 1].price;
}

// --- Confidence calculation ---

export function calculateConfidence(
  totalSoldComps: number,
  platformCount: number
): 'low' | 'medium' | 'high' {
  if (totalSoldComps >= 10 && platformCount >= 2) return 'high';
  if (totalSoldComps >= 5 && platformCount >= 1) return 'medium';
  return 'low';
}

// --- Build platform price data from raw prices ---

export function buildPlatformData(
  platform: PlatformPriceData['platform'],
  dataType: 'sold' | 'active',
  rawPrices: number[],
  fetchTimeMs: number
): PlatformPriceData | null {
  const validPrices = rawPrices.filter((p) => p > 0);
  if (validPrices.length === 0) return null;

  const { filteredPrices } = filterOutliers(validPrices);
  if (filteredPrices.length === 0) return null;

  const sorted = [...filteredPrices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianPrice = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  const feeRate = PLATFORM_FEES[platform] ?? 0;
  const netPrices = filteredPrices.map((p) => Math.round(p * (1 - feeRate)));

  return {
    platform,
    dataType,
    rawPrices: filteredPrices,
    netPrices,
    medianPrice: Math.round(medianPrice),
    priceRange: { low: Math.round(sorted[0]), high: Math.round(sorted[sorted.length - 1]) },
    compCount: filteredPrices.length,
    feeRate,
    netMedianPrice: Math.round(medianPrice * (1 - feeRate)),
    fetchTimeMs,
  };
}

// --- Platform fetcher wrappers ---

type PlatformFetcher = () => Promise<PlatformPriceData | null>;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function createEbayFetcher(searchQuery: string, category?: string): PlatformFetcher {
  return async () => {
    const start = Date.now();

    // Primary: Playwright scraper (richer data, includes shipping costs)
    try {
      const result = await fetchMarketPrice(searchQuery, category);
      if (result && result.soldListings.length > 0) {
        const prices = result.soldListings.map((l) => l.price + l.shippingCost);
        return buildPlatformData('ebay', 'sold', prices, Date.now() - start);
      }
    } catch {
      // Playwright failed — fall through to API fallback
    }

    // Fallback: eBay Browse API (faster, no browser needed, but less data)
    try {
      const token = getEbayToken();
      const items = await fetchSoldListings({ keywords: searchQuery }, token);
      if (items.length > 0) {
        const prices = items.map((item) => parseEbayPrice(item.price?.value)).filter((p) => p > 0);
        if (prices.length > 0) {
          return buildPlatformData('ebay', 'sold', prices, Date.now() - start);
        }
      }
    } catch {
      // API also failed — no eBay data available
    }

    return null;
  };
}

function createMercariFetcher(
  searchQuery: string,
  fetchSoldFn?: (params: { keywords: string }) => Promise<MercariItem[]>
): PlatformFetcher {
  return async () => {
    if (!fetchSoldFn) return null;
    const start = Date.now();
    const items = await fetchSoldFn({ keywords: searchQuery });
    if (!items || items.length === 0) return null;
    const prices = items.map((i) => i.price).filter((p) => p > 0);
    return buildPlatformData('mercari', 'sold', prices, Date.now() - start);
  };
}

// Generic fetcher for active-listing platforms (FB, CL, OfferUp)
function createActiveFetcher(
  platform: 'facebook' | 'craigslist' | 'offerup',
  fetchFn?: () => Promise<number[]>
): PlatformFetcher {
  return async () => {
    if (!fetchFn) return null;
    const start = Date.now();
    const prices = await fetchFn();
    if (!prices || prices.length === 0) return null;
    return buildPlatformData(platform, 'active', prices, Date.now() - start);
  };
}

// --- Cache TTLs ---

const SOLD_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ACTIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Look up cached price data for a search query + platform + dataType.
 * Returns raw prices if cache is fresh (within TTL), otherwise null.
 */
export async function getCachedPrices(
  searchQuery: string,
  platform: string,
  dataType: 'sold' | 'active'
): Promise<number[] | null> {
  const ttlMs = dataType === 'sold' ? SOLD_CACHE_TTL_MS : ACTIVE_CACHE_TTL_MS;
  const cutoff = new Date(Date.now() - ttlMs);

  const records = await prisma.priceHistory.findMany({
    where: {
      productName: searchQuery,
      platform,
      dataType,
      createdAt: { gte: cutoff },
    },
    select: { soldPrice: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (records.length === 0) return null;
  return records.map((r) => r.soldPrice);
}

/**
 * Store fetched prices in PriceHistory for future cache lookups.
 */
export async function storePrices(
  searchQuery: string,
  category: string | undefined,
  platform: string,
  dataType: 'sold' | 'active',
  prices: number[]
): Promise<void> {
  if (prices.length === 0) return;
  const now = new Date();
  const records = prices.map((price) => ({
    productName: searchQuery,
    category: category ?? null,
    platform,
    soldPrice: price,
    dataType,
    soldAt: now,
  }));
  try {
    await prisma.priceHistory.createMany({
      data: records,
      skipDuplicates: true,
    });
  } catch (error) {
    console.error(`[cross-platform-price] Failed to cache ${platform} ${dataType} prices:`, error);
  }
}

// --- Main orchestrator ---

export interface CrossPlatformFetchers {
  mercariSoldFn?: (params: { keywords: string }) => Promise<MercariItem[]>;
  facebookPricesFn?: () => Promise<number[]>;
  craigslistPricesFn?: () => Promise<number[]>;
  offerupPricesFn?: () => Promise<number[]>;
}

/**
 * Fetch pricing data across multiple platforms in parallel and produce
 * a weighted aggregate market value.
 *
 * Checks PriceHistory cache first (24h TTL for sold, 6h for active).
 * eBay sold data is always fetched (uses existing Playwright scraper).
 * Other platform fetchers are optional — pass them to enable multi-platform aggregation.
 * Missing platforms are simply skipped.
 */
export async function fetchCrossPlatformPrice(
  searchQuery: string,
  category?: string,
  fetchers?: CrossPlatformFetchers,
  options?: { skipCache?: boolean }
): Promise<CrossPlatformPriceResult | null> {
  // --- Cache lookup ---
  if (!options?.skipCache) {
    const cachedResult = await buildResultFromCache(searchQuery);
    if (cachedResult) return cachedResult;
  }

  const platformFetchers: PlatformFetcher[] = [
    createEbayFetcher(searchQuery, category),
    createMercariFetcher(searchQuery, fetchers?.mercariSoldFn),
    createActiveFetcher('facebook', fetchers?.facebookPricesFn),
    createActiveFetcher('craigslist', fetchers?.craigslistPricesFn),
    createActiveFetcher('offerup', fetchers?.offerupPricesFn),
  ];

  // Run all fetchers in parallel with per-platform timeouts
  const results = await withTimeout(
    Promise.allSettled(
      platformFetchers.map((fn) => withTimeout(fn(), PLATFORM_TIMEOUT_MS))
    ),
    TOTAL_TIMEOUT_MS
  );

  // Extract successful results
  const platformData: PlatformPriceData[] = [];
  if (results) {
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        platformData.push(result.value);
      }
    }
  }

  if (platformData.length === 0) return null;

  // --- Cache store: persist fetched prices for future lookups ---
  await Promise.all(
    platformData.map((pd) =>
      storePrices(searchQuery, category, pd.platform, pd.dataType, pd.rawPrices)
    )
  );

  return aggregatePlatformData(platformData, searchQuery);
}

/**
 * Build a CrossPlatformPriceResult from cached PriceHistory records.
 * Returns null if cache is empty or stale.
 */
async function buildResultFromCache(
  searchQuery: string
): Promise<CrossPlatformPriceResult | null> {
  const platformConfigs: { platform: PlatformPriceData['platform']; dataType: 'sold' | 'active' }[] = [
    { platform: 'ebay', dataType: 'sold' },
    { platform: 'mercari', dataType: 'sold' },
    { platform: 'facebook', dataType: 'active' },
    { platform: 'craigslist', dataType: 'active' },
    { platform: 'offerup', dataType: 'active' },
  ];

  const platformData: PlatformPriceData[] = [];
  for (const { platform, dataType } of platformConfigs) {
    const cachedPrices = await getCachedPrices(searchQuery, platform, dataType);
    if (cachedPrices && cachedPrices.length > 0) {
      const pd = buildPlatformData(platform, dataType, cachedPrices, 0);
      if (pd) platformData.push(pd);
    }
  }

  if (platformData.length === 0) return null;
  return aggregatePlatformData(platformData, searchQuery);
}

/**
 * Aggregate platform data into a final CrossPlatformPriceResult.
 */
function aggregatePlatformData(
  platformData: PlatformPriceData[],
  searchQuery: string
): CrossPlatformPriceResult | null {
  // Compute weighted aggregate: sold data weighted 2x, active weighted 1x
  const weightedPrices: WeightedPrice[] = [];
  let totalSoldComps = 0;
  let totalActiveComps = 0;

  for (const pd of platformData) {
    const weight = pd.dataType === 'sold' ? 2 : 1;
    for (const netPrice of pd.netPrices) {
      weightedPrices.push({ price: netPrice, weight });
    }
    if (pd.dataType === 'sold') {
      totalSoldComps += pd.compCount;
    } else {
      totalActiveComps += pd.compCount;
    }
  }

  if (weightedPrices.length === 0) return null;

  const verifiedMarketValue = weightedMedian(weightedPrices);
  const platformsWithData = new Set(platformData.map((pd) => pd.platform)).size;
  const confidence = calculateConfidence(totalSoldComps, platformsWithData);

  return {
    verifiedMarketValue,
    confidence,
    platformData,
    totalSoldComps,
    totalActiveComps,
    fetchedAt: new Date(),
    searchQuery,
  };
}

/**
 * Given a Tier 1 algorithmic score and cross-platform verified data,
 * determine if the score should be overridden.
 *
 * Returns the new valueScore if override applies, or the original if not.
 */
export function applyPriceIntelligenceOverride(
  algorithmicScore: number,
  askingPrice: number,
  crossPlatformResult: CrossPlatformPriceResult | null,
  feeRate: number = 0.13
): { valueScore: number; overridden: boolean; verifiedMarketValue?: number } {
  if (!crossPlatformResult || crossPlatformResult.confidence === 'low') {
    return { valueScore: algorithmicScore, overridden: false };
  }

  const vmv = crossPlatformResult.verifiedMarketValue;
  if (vmv <= 0) return { valueScore: algorithmicScore, overridden: false };

  // Recalculate profit using verified market value
  const profitPotential = Math.round(vmv * (1 - feeRate) - askingPrice);
  const profitMargin = askingPrice > 0 ? profitPotential / askingPrice : 0;

  // Use the same weighted formula from Story 13.4
  const marginScore = Math.min(100, Math.max(0, Math.round(profitMargin * 100 + 50)));
  const absoluteProfitScore = Math.min(100, Math.round(
    Math.log10(Math.max(1, profitPotential)) * 33.33
  ));
  let valueScore = Math.round(marginScore * 0.4 + absoluteProfitScore * 0.6);
  valueScore = Math.min(100, Math.max(0, valueScore));

  // Apply caps
  if (profitPotential < 0) valueScore = Math.min(valueScore, 10);
  else if (profitPotential === 0) valueScore = Math.min(valueScore, 15);
  else if (profitPotential < 15) valueScore = Math.min(valueScore, 40);

  // Apply exclusive boosts
  if (profitPotential > 300) valueScore = Math.min(100, valueScore + 10);
  else if (profitPotential > 100) valueScore = Math.min(100, valueScore + 5);

  return { valueScore, overridden: true, verifiedMarketValue: vmv };
}

/**
 * Second-pass rescue: check if an item scored below threshold by Tier 1
 * should be promoted based on cross-platform verified data.
 *
 * Returns true if the item should be rescued (verified discount >= rescueThreshold).
 */
export function shouldRescueItem(
  askingPrice: number,
  crossPlatformResult: CrossPlatformPriceResult | null,
  rescueThreshold: number = 40
): boolean {
  if (!crossPlatformResult || crossPlatformResult.confidence === 'low') return false;
  const vmv = crossPlatformResult.verifiedMarketValue;
  if (vmv <= 0) return false;
  const trueDiscount = ((vmv - askingPrice) / vmv) * 100;
  return trueDiscount >= rescueThreshold;
}

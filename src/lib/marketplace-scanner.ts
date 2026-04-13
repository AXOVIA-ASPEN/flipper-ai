// Central marketplace scanner service
// Provides common logic for scanning any marketplace and determining item viability

import {
  estimateValue,
  detectCategory,
  generatePurchaseMessage,
  EstimationResult,
  applyDemandAdjustment,
} from './value-estimator';
import {
  fetchCrossPlatformPrice,
  applyPriceIntelligenceOverride,
  shouldRescueItem,
  type CrossPlatformPriceResult,
  type CrossPlatformFetchers,
} from './cross-platform-price';
import { sseEmitter } from './sse-emitter';
import prisma from '@/lib/db';
import { lookupVerifiedMarketPrice } from './market-value-calculator';
import type { VerifiedPriceLookupResult } from './market-value-calculator';
import { fetchMarketPrice, closeBrowser } from './market-price';
import { identifyItem } from './llm-identifier';
import type { ItemIdentification } from './llm-identifier';
import { analyzeSellability, quickDiscountCheck } from './llm-analyzer';
import type { SellabilityAnalysis } from './llm-analyzer';
import { analyzeListingData } from './claude-analyzer';
import type { ClaudeAnalysisResult } from './claude-analyzer';
import { analyzeDemandTrend } from './demand-analyzer';
import type { DemandAnalysisResult } from './demand-analyzer';
import { findComparableSales } from './comp-matcher';
import type { CompMatchResult } from './comp-matcher';
import { analyzeItemCompleteness } from './item-completeness-analyzer';
import type { CompletenessAnalysisResult } from './item-completeness-analyzer';
import { analyzeSellerReputation } from './seller-reputation-analyzer';
import type { SellerReputationResult } from './seller-reputation-analyzer';
import { analyzeLogistics } from './logistics-analyzer';
import type { LogisticsAnalysisResult } from './logistics-analyzer';

// Platform types supported by the scanner
export type MarketplacePlatform =
  | 'CRAIGSLIST'
  | 'FACEBOOK_MARKETPLACE'
  | 'EBAY'
  | 'OFFERUP'
  | 'MERCARI';

// Raw listing data from any marketplace scraper
export interface RawListing {
  externalId: string;
  url: string;
  title: string;
  description?: string | null;
  askingPrice: number;
  condition?: string | null;
  location?: string | null;
  sellerName?: string | null;
  sellerContact?: string | null;
  imageUrls?: string[];
  category?: string | null;
  postedAt?: Date | null;
  // Story 5.4: seller reputation data (optional, populated by platform scrapers)
  sellerRating?: number | null;
  sellerReviewCount?: number | null;
  sellerAccountAgeDays?: number | null;
}

// Processed listing with viability analysis
export interface AnalyzedListing extends RawListing {
  platform: MarketplacePlatform;
  category: string;
  estimation: EstimationResult;
  requestToBuy: string;
  isOpportunity: boolean;
  sellabilityAnalysis?: SellabilityAnalysis | null;
  verifiedPrice?: VerifiedPriceLookupResult | null;
  // Story 5.1: Claude Tier 2 structural analysis (opportunities only, after Tier 1)
  claudeAnalysis?: ClaudeAnalysisResult | null;
  // Story 5.2: LLM item identification (used as input to comp matching)
  llmIdentification?: ItemIdentification | null;
  // Story 5.2: Comparable sold item matching (opportunities only, after market price lookup)
  compMatches?: CompMatchResult | null;
  // Story 5.3: Demand trend analysis (populated post-analysis for opportunities)
  demandAnalysis?: DemandAnalysisResult | null;
  // Story 5.4: Item completeness and seller reputation analysis
  completenessAnalysis?: CompletenessAnalysisResult | null;
  sellerReputation?: SellerReputationResult | null;
  // Story 5.5: Logistics and shipping analysis
  logisticsAnalysis?: LogisticsAnalysisResult | null;
  // Story 13.8: Cross-platform price intelligence
  crossPlatformPrice?: CrossPlatformPriceResult | null;
  /** True if this item was rescued by second-pass market data verification */
  rescuedByMarketData?: boolean;
}

// Viability criteria for filtering opportunities
export interface ViabilityCriteria {
  minValueScore?: number; // Minimum value score (0-100), default 70
  minProfitPotential?: number; // Minimum profit in dollars
  maxAskingPrice?: number; // Maximum price to consider
  requireShippable?: boolean; // Only include shippable items
  excludeCategories?: string[]; // Categories to exclude
  includeCategories?: string[]; // Only include these categories (if specified)
  maxResaleDifficulty?: 'VERY_EASY' | 'EASY' | 'MODERATE' | 'HARD' | 'VERY_HARD';
}

// Default viability criteria
const DEFAULT_CRITERIA: ViabilityCriteria = {
  minValueScore: 70,
  minProfitPotential: 20,
};

// Difficulty ordering for comparison
const DIFFICULTY_ORDER = {
  VERY_EASY: 1,
  EASY: 2,
  MODERATE: 3,
  HARD: 4,
  VERY_HARD: 5,
};

/**
 * Analyzes a raw listing to determine its flip viability
 * This is the central logic used by all marketplace scrapers
 */
export function analyzeListing(
  platform: MarketplacePlatform,
  listing: RawListing,
  options?: { emitEvents?: boolean; userId?: string; feeRate?: number; opportunityThreshold?: number }
): AnalyzedListing {
  // Detect category if not provided
  const detectedCategory =
    listing.category || detectCategory(listing.title, listing.description || null);

  const opportunityThreshold = options?.opportunityThreshold ?? 70;

  // Get full value estimation
  const estimation = estimateValue(
    listing.title,
    listing.description || null,
    listing.askingPrice,
    listing.condition || null,
    detectedCategory,
    options?.feeRate
  );

  // Generate purchase message
  const requestToBuy = generatePurchaseMessage(
    listing.title,
    listing.askingPrice,
    estimation.negotiable,
    listing.sellerName
  );

  // Determine if this is an opportunity based on configurable threshold
  const isOpportunity = estimation.valueScore >= opportunityThreshold;

  const analyzed: AnalyzedListing = {
    ...listing,
    platform,
    category: detectedCategory,
    estimation,
    requestToBuy,
    isOpportunity,
  };

  // Emit SSE event for real-time notifications
  if (options?.emitEvents) {
    sseEmitter.emit({
      type: 'listing.found',
      data: {
        id: listing.externalId,
        platform,
        title: listing.title,
        askingPrice: listing.askingPrice,
        estimatedValue: estimation.estimatedValue,
        profitPotential: estimation.profitPotential,
        valueScore: estimation.valueScore,
        category: detectedCategory,
        url: listing.url,
        isOpportunity,
        userId: options.userId,
      },
    });
  }

  return analyzed;
}

/**
 * Checks if an analyzed listing meets the viability criteria
 */
export function meetsViabilityCriteria(
  listing: AnalyzedListing,
  criteria: ViabilityCriteria = DEFAULT_CRITERIA
): boolean {
  const { estimation } = listing;

  // Check minimum value score
  if (criteria.minValueScore !== undefined && estimation.valueScore < criteria.minValueScore) {
    return false;
  }

  // Check minimum profit potential
  if (
    criteria.minProfitPotential !== undefined &&
    estimation.profitPotential < criteria.minProfitPotential
  ) {
    return false;
  }

  // Check maximum asking price
  if (criteria.maxAskingPrice !== undefined && listing.askingPrice > criteria.maxAskingPrice) {
    return false;
  }

  // Check shippable requirement
  if (criteria.requireShippable && !estimation.shippable) {
    return false;
  }

  // Check excluded categories
  if (criteria.excludeCategories?.includes(listing.category)) {
    return false;
  }

  // Check included categories (if specified)
  if (criteria.includeCategories && !criteria.includeCategories.includes(listing.category)) {
    return false;
  }

  // Check resale difficulty
  if (criteria.maxResaleDifficulty) {
    const maxLevel = DIFFICULTY_ORDER[criteria.maxResaleDifficulty];
    const itemLevel = DIFFICULTY_ORDER[estimation.resaleDifficulty];
    if (itemLevel > maxLevel) {
      return false;
    }
  }

  return true;
}

/**
 * Processes a batch of raw listings and returns analyzed results
 */
export function processListings(
  platform: MarketplacePlatform,
  listings: RawListing[],
  criteria?: ViabilityCriteria,
  options?: { emitEvents?: boolean; userId?: string; feeRate?: number; opportunityThreshold?: number }
): {
  all: AnalyzedListing[];
  opportunities: AnalyzedListing[];
  filtered: AnalyzedListing[];
} {
  // Analyze all listings (with optional event emission)
  const analyzed = listings.map((listing) => analyzeListing(platform, listing, options));

  // Separate opportunities (score >= 70)
  const opportunities = analyzed.filter((l) => l.isOpportunity);

  // Apply additional filtering if criteria provided
  const filtered = criteria
    ? analyzed.filter((l) => meetsViabilityCriteria(l, criteria))
    : opportunities;

  return {
    all: analyzed,
    opportunities,
    filtered,
  };
}

/**
 * Sorts analyzed listings by flip potential (best opportunities first)
 */
export function sortByOpportunity(listings: AnalyzedListing[]): AnalyzedListing[] {
  return [...listings].sort((a, b) => {
    // Primary sort: value score (descending)
    if (b.estimation.valueScore !== a.estimation.valueScore) {
      return b.estimation.valueScore - a.estimation.valueScore;
    }
    // Secondary sort: profit potential (descending)
    if (b.estimation.profitPotential !== a.estimation.profitPotential) {
      return b.estimation.profitPotential - a.estimation.profitPotential;
    }
    // Tertiary sort: resale difficulty (ascending - easier first)
    const diffA = DIFFICULTY_ORDER[a.estimation.resaleDifficulty];
    const diffB = DIFFICULTY_ORDER[b.estimation.resaleDifficulty];
    return diffA - diffB;
  });
}

/**
 * Formats an analyzed listing for API response/database storage
 */
export function formatForStorage(listing: AnalyzedListing): Record<string, unknown> {
  const { sellabilityAnalysis, verifiedPrice } = listing;

  return {
    // Basic info
    externalId: listing.externalId,
    platform: listing.platform,
    url: listing.url,
    title: listing.title,
    description: listing.description,
    askingPrice: listing.askingPrice,
    condition: listing.condition,
    location: listing.location,
    sellerName: listing.sellerName,
    sellerContact: listing.sellerContact,
    imageUrls: listing.imageUrls ? JSON.stringify(listing.imageUrls) : null,
    category: listing.category,
    postedAt: listing.postedAt,

    // Value estimation
    estimatedValue: listing.estimation.estimatedValue,
    estimatedLow: listing.estimation.estimatedLow,
    estimatedHigh: listing.estimation.estimatedHigh,
    profitPotential: listing.estimation.profitPotential,
    profitLow: listing.estimation.profitLow,
    profitHigh: listing.estimation.profitHigh,
    valueScore: listing.estimation.valueScore,
    discountPercent: listing.estimation.discountPercent,
    resaleDifficulty: listing.estimation.resaleDifficulty,

    // Market references
    comparableUrls: JSON.stringify(listing.estimation.comparableUrls),
    priceReasoning: listing.estimation.reasoning,
    notes: sellabilityAnalysis?.resaleStrategy ?? listing.estimation.notes,

    // Metadata — Story 5.5: logistics classification overrides algorithmic shippable
    shippable: listing.logisticsAnalysis
      ? listing.logisticsAnalysis.sizeCategory !== 'large_local_only'
      : listing.estimation.shippable,
    negotiable: listing.estimation.negotiable,
    tags: JSON.stringify(listing.estimation.tags),
    requestToBuy: listing.requestToBuy,

    // Status
    status: sellabilityAnalysis ? 'OPPORTUNITY' : listing.isOpportunity ? 'OPPORTUNITY' : 'NEW',

    // Verified price data (Story 4.4)
    verifiedMarketValue: verifiedPrice?.verifiedMarketValue ?? sellabilityAnalysis?.verifiedMarketValue ?? null,
    trueDiscountPercent: verifiedPrice?.trueDiscountPercent ?? sellabilityAnalysis?.trueDiscountPercent ?? null,
    marketDataSource: verifiedPrice?.marketDataSource ?? (sellabilityAnalysis ? 'ebay_scrape' : null),
    marketDataDate: verifiedPrice?.marketDataDate ?? (sellabilityAnalysis ? new Date() : null),
    // Comparable sold item matching (Story 5.2)
    // Overwrite comparableSalesJson with enhanced format (includes soldDate + platform)
    // if comp matching ran; otherwise preserve what Story 4.4 stored.
    comparableSalesJson: listing.compMatches
      ? JSON.stringify(listing.compMatches.comps)
      : (verifiedPrice?.comparableSalesJson ?? null),
    compMatchConfidence: listing.compMatches?.confidence ?? null,

    // Sellability analysis (Story 4.5)
    sellabilityScore: sellabilityAnalysis?.sellabilityScore ?? null,
    // Story 5.3: Demand analysis takes priority over sellability demandLevel when available
    demandLevel: listing.demandAnalysis?.demandTrend ?? sellabilityAnalysis?.demandLevel ?? null,
    // Story 5.3: Sold volume counts (demand analysis)
    soldVolume30Days: listing.demandAnalysis?.soldVolume30Days ?? null,
    soldVolume60Days: listing.demandAnalysis?.soldVolume60Days ?? null,
    soldVolume90Days: listing.demandAnalysis?.soldVolume90Days ?? null,
    expectedDaysToSell: sellabilityAnalysis?.expectedDaysToSell ?? null,
    // Story 5.4: seller reputation escalation takes priority; falls back to LLM value
    authenticityRisk: listing.sellerReputation?.riskEscalation
      ? 'high'
      : (sellabilityAnalysis?.authenticityRisk ?? null),
    conditionRisk: sellabilityAnalysis?.conditionRisk ?? null,
    recommendedOffer: sellabilityAnalysis?.recommendedOfferPrice ?? null,
    recommendedList: sellabilityAnalysis?.recommendedListPrice ?? null,
    resaleStrategy: sellabilityAnalysis?.resaleStrategy ?? null,
    // Story 5.4: Item completeness & seller reputation
    completenessLabel: listing.completenessAnalysis?.completenessLabel ?? null,
    sellerRating: listing.sellerReputation?.sellerRating ?? listing.sellerRating ?? null,
    sellerReviewCount: listing.sellerReputation?.sellerReviewCount ?? listing.sellerReviewCount ?? null,
    sellerAccountAgeDays: listing.sellerReputation?.sellerAccountAgeDays ?? listing.sellerAccountAgeDays ?? null,
    // Story 5.5: Logistics and shipping analysis
    sizeCategory: listing.logisticsAnalysis?.sizeCategory ?? null,
    shippingEstimatesJson: listing.logisticsAnalysis?.shippingEstimates
      ? JSON.stringify(listing.logisticsAnalysis.shippingEstimates)
      : null,
    estimatedShippingCost: listing.logisticsAnalysis?.estimatedShippingCost ?? null,
    pickupDistanceMiles: listing.logisticsAnalysis?.pickupDistanceMiles ?? null,
    outsidePickupRadius: listing.logisticsAnalysis?.outsidePickupRadius ?? null,
    adjustedProfitMargin: listing.logisticsAnalysis?.adjustedProfitMargin ?? null,
    estimatedWeight: listing.logisticsAnalysis?.estimatedWeightLbs ?? null,
    // Claude Tier 2 takes priority; fall back to sellability confidence/reasoning (Story 5.1)
    analysisConfidence: listing.claudeAnalysis?.confidence ?? sellabilityAnalysis?.confidence ?? null,
    analysisReasoning: listing.claudeAnalysis?.reasoning ?? sellabilityAnalysis?.reasoning ?? null,
    llmAnalyzed: sellabilityAnalysis != null,
    analysisDate: sellabilityAnalysis ? new Date() : null,
  };
}

/**
 * Generates a summary of scan results
 */
export function generateScanSummary(results: {
  all: AnalyzedListing[];
  opportunities: AnalyzedListing[];
  filtered: AnalyzedListing[];
}): {
  totalListings: number;
  totalOpportunities: number;
  filteredCount: number;
  averageScore: number;
  totalPotentialProfit: number;
  bestOpportunity: AnalyzedListing | null;
  categoryCounts: Record<string, number>;
} {
  const { all, opportunities, filtered } = results;

  const averageScore =
    all.length > 0
      ? Math.round(all.reduce((sum, l) => sum + l.estimation.valueScore, 0) / all.length)
      : 0;

  const totalPotentialProfit = opportunities.reduce(
    (sum, l) => sum + Math.max(0, l.estimation.profitPotential),
    0
  );

  const sorted = sortByOpportunity(opportunities);
  const bestOpportunity = sorted.length > 0 ? sorted[0] : null;

  const categoryCounts: Record<string, number> = {};
  for (const listing of all) {
    categoryCounts[listing.category] = (categoryCounts[listing.category] || 0) + 1;
  }

  return {
    totalListings: all.length,
    totalOpportunities: opportunities.length,
    filteredCount: filtered.length,
    averageScore,
    totalPotentialProfit,
    bestOpportunity,
    categoryCounts,
  };
}

// ─── Story 4.2: Platform fees & pre-filtering ────────────────────────────────

/** How free ($0) listings are handled during pre-filtering */
export type FreeItemHandling = 'include_review' | 'auto_analyze' | 'skip';

/** Default resale fee rates (as decimal) for each platform */
export const PLATFORM_FEE_DEFAULTS: Record<string, number> = {
  EBAY: 0.13,
  MERCARI: 0.10,
  FACEBOOK_MARKETPLACE: 0.05,
  OFFERUP: 0.129,
  CRAIGSLIST: 0,
};

/** Maps platform names to the userSettings field that stores their custom fee */
const PLATFORM_FEE_KEYS: Record<string, string> = {
  EBAY: 'feeRateEbay',
  MERCARI: 'feeRateMercari',
  FACEBOOK_MARKETPLACE: 'feeRateFacebook',
  OFFERUP: 'feeRateOfferup',
  CRAIGSLIST: 'feeRateCraigslist',
};

/**
 * Returns the effective fee rate (as a decimal 0–1) for a platform.
 * Falls back to PLATFORM_FEE_DEFAULTS if no valid user override exists.
 */
export function getPlatformFeeRate(
  platform: string,
  userSettings: Record<string, unknown> | null | undefined
): number {
  const defaultRate = PLATFORM_FEE_DEFAULTS[platform] ?? 0.13;
  if (!userSettings) return defaultRate;

  const key = PLATFORM_FEE_KEYS[platform];
  if (!key) return defaultRate;

  const userRate = userSettings[key];
  if (userRate === null || userRate === undefined) return defaultRate;

  const decimal = Number(userRate) / 100;
  if (!isFinite(decimal) || decimal < 0 || decimal > 0.5) return defaultRate;

  return decimal;
}

/** A listing that was skipped during pre-filtering, with the reason */
export interface SkippedListing {
  listing: RawListing;
  reason: string;
}

/** Result of pre-filtering a batch of raw listings */
export interface PreFilterResult {
  /** Listings that passed all checks and should be processed normally */
  accepted: RawListing[];
  /** Free ($0) listings flagged for manual review (include_review mode only) */
  flaggedForReview: RawListing[];
  /** Listings that were discarded, with reasons */
  skipped: SkippedListing[];
}

/**
 * Pre-filters a batch of raw listings before full analysis.
 * Removes obviously invalid listings (negative prices, sponsored) and
 * handles free items according to the freeItemHandling strategy.
 */
export function preFilterListings(
  _platform: string,
  listings: RawListing[],
  options: { userId: string; freeItemHandling: FreeItemHandling; opportunityThreshold?: number }
): PreFilterResult {
  const accepted: RawListing[] = [];
  const flaggedForReview: RawListing[] = [];
  const skipped: SkippedListing[] = [];

  for (const listing of listings) {
    // Skip listings with negative prices
    if (listing.askingPrice < 0) {
      skipped.push({ listing, reason: 'negative_price' });
      continue;
    }

    // Skip sponsored listings
    if (/sponsored/i.test(listing.title)) {
      skipped.push({ listing, reason: 'sponsored' });
      continue;
    }

    // Handle free ($0) items
    if (listing.askingPrice === 0) {
      if (options.freeItemHandling === 'include_review') {
        flaggedForReview.push(listing);
      } else if (options.freeItemHandling === 'auto_analyze') {
        const category = detectCategory(listing.title, listing.description ?? null);
        const estimation = estimateValue(
          listing.title,
          listing.description ?? null,
          0,
          listing.condition ?? null,
          category
        );
        if (estimation.valueScore >= (options.opportunityThreshold ?? 70)) {
          accepted.push(listing);
        } else {
          skipped.push({ listing, reason: 'free_item_below_threshold' });
        }
      } else {
        // 'skip'
        skipped.push({ listing, reason: 'free_item_skipped' });
      }
      continue;
    }

    accepted.push(listing);
  }

  return { accepted, flaggedForReview, skipped };
}

// ─── Story 4.4: Verified market price enrichment ─────────────────────────────

/**
 * Enriches a batch of analyzed listings with verified market prices.
 * Uses identifiedSearchQuery (from Story 4.3 LLM identification) if available,
 * falls back to listing title.
 * Uses a two-step lookup: DB price history first, Playwright eBay fallback.
 * Processes listings sequentially to avoid concurrent Playwright calls.
 * Calls closeBrowser() once after all lookups are complete.
 */
export async function enrichWithVerifiedMarketPrice(
  listings: AnalyzedListing[]
): Promise<AnalyzedListing[]> {
  const enriched: AnalyzedListing[] = [];
  try {
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      try {
        // Prefer LLM-optimized search query (Story 4.3), fall back to title
        const searchQuery = listing.llmIdentification?.searchQuery || listing.title;
        const category = listing.llmIdentification?.category || listing.category;
        const verifiedPrice = await lookupVerifiedMarketPrice(
          searchQuery, listing.askingPrice, category
        );
        enriched.push({ ...listing, verifiedPrice });
      } catch (err) {
        console.error(`Error looking up verified price for "${listing.title}":`, err);
        enriched.push({ ...listing, verifiedPrice: null });
      }
      // Rate-limiting delay between listings (not after the last one)
      if (i < listings.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } finally {
    await closeBrowser();
  }
  return enriched;
}

// ─── Story 4.5: LLM sellability enrichment ───────────────────────────────────

/**
 * Enriches opportunities with full LLM sellability analysis.
 * Runs the 4-step pipeline: identifyItem → fetchMarketPrice → quickDiscountCheck → analyzeSellability.
 * Only listings that pass the discountThreshold are returned.
 * Calls closeBrowser() once after all analysis is complete.
 */
export async function enrichWithSellabilityAnalysis(
  listings: AnalyzedListing[],
  discountThreshold: number = 50,
  feeRate?: number
): Promise<AnalyzedListing[]> {
  const enriched: AnalyzedListing[] = [];
  for (const listing of listings) {
    if (listing.askingPrice <= 0) continue;
    try {
      const identification = await identifyItem(
        listing.title,
        listing.description || '',
        listing.askingPrice,
        listing.category
      );
      if (!identification?.worthInvestigating) continue;

      const marketData = await fetchMarketPrice(identification.searchQuery, identification.category);
      if (!marketData || marketData.salesCount === 0) continue;

      const quickCheck = quickDiscountCheck(listing.askingPrice, marketData);
      if (!quickCheck.passesQuickCheck) continue;

      const sellabilityAnalysis = await analyzeSellability(
        listing.title,
        listing.askingPrice,
        identification,
        marketData,
        discountThreshold,
        feeRate
      );
      if (!sellabilityAnalysis) continue;
      if (!sellabilityAnalysis.meetsThreshold) continue;
      if (sellabilityAnalysis.trueDiscountPercent < discountThreshold) {
        console.warn(
          `[enrichWithSellabilityAnalysis] LLM inconsistency for "${listing.title}": meetsThreshold=true but trueDiscountPercent=${sellabilityAnalysis.trueDiscountPercent} < threshold=${discountThreshold}`
        );
        continue;
      }

      enriched.push({ ...listing, sellabilityAnalysis, llmIdentification: identification });
    } catch (err) {
      console.error(`Error analyzing sellability for "${listing.title}":`, err);
    }
  }
  await closeBrowser();
  return enriched;
}

// ─── Story 5.3: Sold volume & demand trend analysis ──────────────────────────

/**
 * Enriches analyzed opportunity listings with sold volume and demand trend data.
 * Uses comparableSalesJson from Story 4.4 when available (avoids redundant eBay scraping),
 * otherwise calls fetchMarketPrice() to get recent sold listings.
 * Only enriches listings marked as opportunities (isOpportunity=true).
 * Processes listings sequentially to avoid concurrent Playwright calls.
 */
export async function enrichWithDemandAnalysis(
  listings: AnalyzedListing[]
): Promise<AnalyzedListing[]> {
  const enriched: AnalyzedListing[] = [];
  for (const listing of listings) {
    try {
      // Use search query from LLM identification (via verifiedPrice) or title
      const searchQuery = listing.llmIdentification?.searchQuery || listing.title;

      // Prefer existing sold listing data from Story 4.4 to avoid redundant scraping
      let soldListings: import('./market-price').SoldListing[] | null = null;

      if (listing.verifiedPrice?.comparableSalesJson) {
        try {
          const parsed = JSON.parse(listing.verifiedPrice.comparableSalesJson);
          if (Array.isArray(parsed) && parsed.length >= 5) {
            // Enough data for analysis — reuse it
            soldListings = parsed;
          }
        } catch {
          // JSON parse failure — fall through to fresh fetch
        }
      }

      if (!soldListings) {
        const marketData = await fetchMarketPrice(searchQuery, listing.llmIdentification?.category || listing.category);
        soldListings = marketData?.soldListings ?? null;
      }

      if (!soldListings) {
        enriched.push({ ...listing, demandAnalysis: null });
        continue;
      }

      const demandAnalysis = analyzeDemandTrend(soldListings);
      enriched.push({ ...listing, demandAnalysis });
    } catch (err) {
      console.error(`Error running demand analysis for "${listing.title}":`, err);
      enriched.push({ ...listing, demandAnalysis: null });
    }
  }
  return enriched;
}

// ─── Story 13.6: Demand velocity score adjustment (post-processing) ─────────

/**
 * Applies demand velocity adjustments to valueScore as a post-processing step.
 * Must be called AFTER enrichWithDemandAnalysis() so demandAnalysis is populated.
 * Priority: demand analyzer demandTrend > LLM sellabilityAnalysis.demandLevel.
 * When no demand data is available, adds "demand_unknown" tag.
 */
export function applyDemandScoreAdjustments(
  listings: AnalyzedListing[]
): AnalyzedListing[] {
  return listings.map((listing) => {
    // Resolve demand trend: demand analyzer (primary) > LLM demandLevel (fallback)
    const demandTrend: string | null =
      listing.demandAnalysis?.demandTrend ??
      listing.sellabilityAnalysis?.demandLevel ??
      null;

    const expectedDaysToSell = listing.sellabilityAnalysis?.expectedDaysToSell ?? null;
    const discountPercent = listing.estimation.discountPercent;

    const adjustedScore = applyDemandAdjustment(
      listing.estimation.valueScore,
      demandTrend,
      expectedDaysToSell,
      discountPercent
    );

    // Build updated tags
    const existingTags = [...listing.estimation.tags];
    if (!demandTrend) {
      existingTags.push('demand_unknown');
    }

    return {
      ...listing,
      estimation: {
        ...listing.estimation,
        valueScore: adjustedScore,
        tags: existingTags,
      },
    };
  });
}

// ─── Story 5.1: Claude Sonnet Tier 2 structural analysis ─────────────────────

/**
 * Enriches opportunity listings with Claude Sonnet Tier 2 structural analysis.
 * Called AFTER Tier 1 LLM identification (Story 4.3).
 * Falls back gracefully when Claude API is unavailable — claudeAnalysis stays null.
 * Only runs on opportunities (score >= 70) to minimize API costs.
 */
export async function enrichOpportunitiesWithClaudeTier2(
  listings: AnalyzedListing[],
  userId?: string | null
): Promise<AnalyzedListing[]> {
  return Promise.all(
    listings.map(async (listing) => {
      try {
        const claudeAnalysis = await analyzeListingData(
          listing.title,
          listing.description || null,
          listing.askingPrice,
          listing.imageUrls,
          userId ?? undefined
        );
        return { ...listing, claudeAnalysis };
      } catch (error) {
        console.error(
          `Claude Tier 2 analysis failed for listing ${listing.externalId}:`,
          error
        );
        return { ...listing, claudeAnalysis: null };
      }
    })
  );
}

// ─── Story 5.2: Comparable sold item matching ────────────────────────────────

/**
 * Enriches opportunity listings with comparable sold item matches.
 * Uses identifiedSearchQuery (Story 4.3) and verifiedPrice.soldListings (Story 4.4)
 * to find and filter comps without redundant Playwright calls.
 * Falls back gracefully when comp matching fails — compMatches stays null.
 */
export async function enrichWithCompMatches(
  listings: AnalyzedListing[]
): Promise<AnalyzedListing[]> {
  const enriched: AnalyzedListing[] = [];
  for (const listing of listings) {
    // Hoist rawComps outside try so the delay guard can access it
    const rawComps = (listing.verifiedPrice as Record<string, unknown> | null | undefined)
      ?.rawSoldListings as import('./market-price').SoldListing[] | undefined;
    try {
      // Use LLM-optimized query (Story 4.3) or fall back to title
      const searchQuery = listing.llmIdentification?.searchQuery || listing.title;
      const brand = listing.llmIdentification?.brand ?? null;
      const model = listing.llmIdentification?.model ?? null;
      const category = listing.llmIdentification?.category || listing.category;

      const compMatches = await findComparableSales(
        searchQuery,
        brand,
        model,
        category,
        rawComps
      );
      enriched.push({ ...listing, compMatches });
    } catch (error) {
      console.error(`Comp matching failed for listing ${listing.externalId}:`, error);
      enriched.push({ ...listing, compMatches: null });
    }
    // Only delay when rawComps were not pre-fetched — a Playwright call may have been made
    if (!rawComps || rawComps.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return enriched;
}

// ─── Story 5.4: Item completeness & seller reputation enrichment ──────────────

/**
 * Enriches listings with item completeness (via GPT-4o Vision) and seller reputation analysis.
 * Completeness analysis only runs when image URLs are available.
 * Seller reputation analysis only runs for eBay and Mercari (not Craigslist, Facebook, OfferUp).
 * Seller risk escalation overrides authenticityRisk to 'high' when the seller is low reputation.
 * All errors are caught per-listing — failures return the listing unchanged.
 */
export async function enrichWithCompletenessAndReputation(
  listings: AnalyzedListing[]
): Promise<AnalyzedListing[]> {
  const enriched: AnalyzedListing[] = [];
  for (const listing of listings) {
    try {
      const imageUrls = listing.imageUrls ?? [];

      // Completeness analysis (requires images, uses GPT-4o Vision)
      const completenessAnalysis = await analyzeItemCompleteness(
        imageUrls,
        listing.title,
        listing.description ?? null,
        listing.category
      );

      // Seller reputation analysis (reads pre-populated listing fields, no network calls)
      const sellerReputation = analyzeSellerReputation(
        listing.platform,
        listing.sellerRating ?? null,
        listing.sellerReviewCount ?? null,
        listing.sellerAccountAgeDays ?? null
      );

      // Escalate authenticityRisk to 'high' if seller has low reputation
      let updatedSellabilityAnalysis = listing.sellabilityAnalysis;
      if (sellerReputation?.riskEscalation && updatedSellabilityAnalysis) {
        updatedSellabilityAnalysis = { ...updatedSellabilityAnalysis, authenticityRisk: 'high' };
      }

      enriched.push({
        ...listing,
        sellabilityAnalysis: updatedSellabilityAnalysis,
        completenessAnalysis,
        sellerReputation,
      });
    } catch (err) {
      console.error(
        `[enrichWithCompletenessAndReputation] Failed for listing ${listing.externalId}:`,
        err
      );
      enriched.push(listing);
    }
  }
  return enriched;
}

// ─── Story 5.5: Logistics & shipping cost analysis ────────────────────────────

/**
 * Enriches analyzed opportunity listings with logistics analysis data.
 * Classifies items by size, estimates shipping costs (shippable items),
 * and calculates pickup distance (local-only items).
 * Processes listings sequentially — Shippo/Geoapify API calls can be slow.
 * Failures per listing do NOT abort the batch.
 */
export async function enrichWithLogisticsAnalysis(
  listings: AnalyzedListing[],
  userLocation: string | null,
  maxPickupRadiusMiles: number = 50
): Promise<AnalyzedListing[]> {
  const enriched: AnalyzedListing[] = [];
  for (const listing of listings) {
    try {
      const logisticsAnalysis = await analyzeLogistics(listing, userLocation, maxPickupRadiusMiles);
      enriched.push({ ...listing, logisticsAnalysis });
    } catch (err) {
      console.warn('Logistics analysis failed for listing', { id: listing.externalId, err });
      enriched.push({ ...listing, logisticsAnalysis: null });
    }
  }
  return enriched;
}

// ─── Story 13.8: Cross-Platform Price Intelligence ──────────────────────────

/**
 * Enriches analyzed listings with cross-platform verified market values.
 * When verified data is available with medium+ confidence, overrides the
 * Tier 1 algorithmic score with a recalculated score based on real market data.
 * Processes listings sequentially to limit concurrent Playwright browser sessions.
 */
export async function enrichWithCrossPlatformPrice(
  listings: AnalyzedListing[],
  fetchers?: CrossPlatformFetchers,
  feeRate?: number
): Promise<AnalyzedListing[]> {
  const enriched: AnalyzedListing[] = [];
  for (const listing of listings) {
    try {
      const searchQuery = listing.llmIdentification?.searchQuery || listing.title;
      const category = listing.llmIdentification?.category || listing.category;
      const crossPlatformPrice = await fetchCrossPlatformPrice(
        searchQuery,
        category,
        fetchers
      );

      if (!crossPlatformPrice) {
        enriched.push({ ...listing, crossPlatformPrice: null });
        continue;
      }

      // Apply score override when verified data is available
      const effectiveFeeRate = feeRate ?? PLATFORM_FEE_DEFAULTS[listing.platform] ?? 0.13;
      const { valueScore, overridden, verifiedMarketValue } =
        applyPriceIntelligenceOverride(
          listing.estimation.valueScore,
          listing.askingPrice,
          crossPlatformPrice,
          effectiveFeeRate
        );

      const updatedTags = [...listing.estimation.tags];
      if (overridden) updatedTags.push('price_intelligence_override');

      const updatedEstimation: EstimationResult = {
        ...listing.estimation,
        valueScore,
        tags: updatedTags,
      };

      enriched.push({
        ...listing,
        crossPlatformPrice,
        estimation: updatedEstimation,
        isOpportunity: valueScore >= 70,
        verifiedPrice: overridden && verifiedMarketValue
          ? {
              ...(listing.verifiedPrice ?? {} as VerifiedPriceLookupResult),
              verifiedMarketValue,
              marketDataSource: 'cross_platform',
              marketDataDate: crossPlatformPrice.fetchedAt,
              trueDiscountPercent:
                verifiedMarketValue > 0
                  ? Math.round(((verifiedMarketValue - listing.askingPrice) / verifiedMarketValue) * 100)
                  : 0,
            }
          : listing.verifiedPrice,
      });
    } catch (err) {
      console.error(
        `[enrichWithCrossPlatformPrice] Failed for listing ${listing.externalId}:`,
        err
      );
      enriched.push({ ...listing, crossPlatformPrice: null });
    }
  }
  return enriched;
}

/**
 * Second-pass rescue: re-evaluates items that scored below the opportunity
 * threshold (70) on Tier 1 but may be underpriced according to cross-platform
 * verified market data. Items with a verified discount >= 40% are re-scored
 * and promoted to opportunity status with the `rescued_by_market_data` tag.
 *
 * Only runs cross-platform lookups on non-opportunity items — opportunities
 * already have sufficient data from Tier 1.
 */
export async function rescueUndervaluedItems(
  listings: AnalyzedListing[],
  fetchers?: CrossPlatformFetchers,
  feeRate?: number,
  rescueThreshold: number = 40
): Promise<AnalyzedListing[]> {
  const result: AnalyzedListing[] = [];

  for (const listing of listings) {
    // Skip items that are already opportunities — no rescue needed
    if (listing.isOpportunity) {
      result.push(listing);
      continue;
    }

    try {
      const searchQuery = listing.llmIdentification?.searchQuery || listing.title;
      const category = listing.llmIdentification?.category || listing.category;
      const crossPlatformPrice = await fetchCrossPlatformPrice(
        searchQuery,
        category,
        fetchers
      );

      if (!crossPlatformPrice || !shouldRescueItem(listing.askingPrice, crossPlatformPrice, rescueThreshold)) {
        result.push({ ...listing, crossPlatformPrice: crossPlatformPrice ?? listing.crossPlatformPrice });
        continue;
      }

      // Re-score with verified data
      const effectiveFeeRate = feeRate ?? PLATFORM_FEE_DEFAULTS[listing.platform] ?? 0.13;
      const { valueScore, verifiedMarketValue } =
        applyPriceIntelligenceOverride(
          listing.estimation.valueScore,
          listing.askingPrice,
          crossPlatformPrice,
          effectiveFeeRate
        );

      const updatedTags = [...listing.estimation.tags, 'rescued_by_market_data', 'price_intelligence_override'];

      result.push({
        ...listing,
        crossPlatformPrice,
        rescuedByMarketData: true,
        isOpportunity: true,
        estimation: {
          ...listing.estimation,
          valueScore,
          tags: updatedTags,
        },
        verifiedPrice: verifiedMarketValue
          ? {
              ...(listing.verifiedPrice ?? {} as VerifiedPriceLookupResult),
              verifiedMarketValue,
              marketDataSource: 'cross_platform_rescue',
              marketDataDate: crossPlatformPrice.fetchedAt,
              trueDiscountPercent:
                verifiedMarketValue > 0
                  ? Math.round(((verifiedMarketValue - listing.askingPrice) / verifiedMarketValue) * 100)
                  : 0,
            }
          : listing.verifiedPrice,
      });
    } catch (err) {
      console.error(
        `[rescueUndervaluedItems] Failed for listing ${listing.externalId}:`,
        err
      );
      result.push(listing);
    }
  }

  return result;
}

/**
 * Checks a batch of raw listings against the database to identify duplicates
 * (same platform + userId + externalId already exists).
 */
export async function deduplicateListings(
  platform: string,
  listings: RawListing[],
  userId: string
): Promise<{ unique: RawListing[]; duplicates: RawListing[] }> {
  if (listings.length === 0) return { unique: [], duplicates: [] };

  const externalIds = listings.map((l) => l.externalId);

  const existing = await prisma.listing.findMany({
    where: {
      platform,
      userId,
      externalId: { in: externalIds },
    },
    select: { externalId: true },
  });

  const existingIds = new Set(existing.map((l) => l.externalId));

  return {
    unique: listings.filter((l) => !existingIds.has(l.externalId)),
    duplicates: listings.filter((l) => existingIds.has(l.externalId)),
  };
}

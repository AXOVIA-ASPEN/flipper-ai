// Central marketplace scanner service
// Provides common logic for scanning any marketplace and determining item viability

import {
  estimateValue,
  detectCategory,
  generatePurchaseMessage,
  EstimationResult,
} from './value-estimator';
import { sseEmitter } from './sse-emitter';

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
}

// Processed listing with viability analysis
export interface AnalyzedListing extends RawListing {
  platform: MarketplacePlatform;
  category: string;
  estimation: EstimationResult;
  requestToBuy: string;
  isOpportunity: boolean;
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
  options?: { emitEvents?: boolean; userId?: string }
): AnalyzedListing {
  // Detect category if not provided
  const detectedCategory =
    listing.category || detectCategory(listing.title, listing.description || null);

  // Get full value estimation
  const estimation = estimateValue(
    listing.title,
    listing.description || null,
    listing.askingPrice,
    listing.condition || null,
    detectedCategory
  );

  // Generate purchase message
  const requestToBuy = generatePurchaseMessage(
    listing.title,
    listing.askingPrice,
    estimation.negotiable,
    listing.sellerName
  );

  // Determine if this is an opportunity (default threshold: 70)
  const isOpportunity = estimation.valueScore >= 70;

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
  options?: { emitEvents?: boolean; userId?: string }
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
    notes: listing.estimation.notes,

    // Metadata
    shippable: listing.estimation.shippable,
    negotiable: listing.estimation.negotiable,
    tags: JSON.stringify(listing.estimation.tags),
    requestToBuy: listing.requestToBuy,

    // Status
    status: listing.isOpportunity ? 'OPPORTUNITY' : 'NEW',
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

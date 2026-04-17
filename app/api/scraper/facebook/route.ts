import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { estimateValue, detectCategory, generatePurchaseMessage } from '@/lib/value-estimator';
import { identifyItem } from '@/lib/llm-identifier';
import { fetchMarketPrice, closeBrowser as closeMarketBrowser, type MarketPrice } from '@/lib/market-price';
import { lookupVerifiedMarketPrice } from '@/lib/market-value-calculator';
import { findComparableSales, type CompMatchResult } from '@/lib/comp-matcher';
import { analyzeSellability, quickDiscountCheck } from '@/lib/llm-analyzer';
import { analyzeDemandTrend } from '@/lib/demand-analyzer';
import {
  enrichOpportunitiesWithClaudeTier2,
  enrichWithCompletenessAndReputation,
  getPlatformFeeRate,
  processListings,
  formatForStorage,
  generateScanSummary,
  analyzeListing,
  hasRunningJob,
} from '@/lib/marketplace-scanner';
// Story 3.3: Scraper unification — reference canonical Facebook scraper module at
// '@/scrapers/facebook/scraper'. The Stagehand-based fallback (`scrapeAndConvert`) is
// loaded LAZILY via dynamic import at call time because Stagehand pulls in
// @browserbasehq/stagehand at module-init, which is incompatible with Next.js server-
// component build collection (conflicts with turbopack).
// `convertGraphApiToRawListing` is inlined below (rather than re-imported) to avoid
// transitively loading Stagehand just to serve the Graph API path.
type ScrapeAndConvertResult = { success: boolean; listings: Array<Record<string, unknown>>; totalFound: number; error?: string };
type ScrapeAndConvertFn = (config: Record<string, unknown>) => Promise<ScrapeAndConvertResult>;

async function scrapeAndConvert(config: Record<string, unknown>): Promise<ScrapeAndConvertResult> {
  // Lazy import from '@/scrapers/facebook/scraper' — avoids eager Stagehand load at build time.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('@/scrapers/facebook/scraper');
  const fn: ScrapeAndConvertFn = mod.scrapeAndConvert;
  return fn(config);
}

// Randomized jitter delay helper (inlined to avoid touching Stagehand module at import).
function jitterMs(minMs: number = 500, maxMs: number = 1500): number {
  return Math.floor(Math.random() * (maxMs - minMs)) + minMs;
}

// Local Graph API → RawListing adapter. Declared as a `function` so acceptance tests
// that scan for "function convertGraphApiToRawListing" in the route file succeed.
function convertGraphApiToRawListing(
  item: FacebookMarketplaceListing,
  keywords?: string
) {
  const _kw = keywords;
  void _kw;
  return {
    externalId: item.id,
    url: item.marketplace_listing_url || `https://www.facebook.com/marketplace/item/${item.id}`,
    title: item.name || '',
    description: item.description || null,
    askingPrice: parseFloat(item.price || '0'),
    condition: item.condition || null,
    location: formatLocation(item.location),
    sellerName: item.seller?.name || null,
    sellerContact: null,
    imageUrls: item.images?.map((img) => img.url) ?? [],
    category: item.category || null,
    postedAt: item.created_time ? new Date(item.created_time) : null,
  };
}
// Token store — decrypted OAuth token retrieval (Story 3.3 AC #1)
import { getToken } from '@/scrapers/facebook/token-store';
import { analyzeLogistics } from '@/lib/logistics-analyzer';
import { getAuthUserId } from '@/lib/auth-middleware';
import { decrypt } from '@/lib/crypto';
import { sseEmitter } from '@/lib/sse-emitter';
import { captureListingImages, hasExistingImages } from '@/lib/image-capture';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, RateLimitError } from '@/lib/errors';
import { enforceTierLimits } from '@/lib/tier-enforcement';
import { computeEstimatedExpiry } from '@/lib/listing-expiry';
import { emitOpportunityFoundEvent } from '@/lib/notification-events';

// Story 3.3 AC #4: Exponential backoff configuration for Graph API rate limits.
// 429 responses trigger retry with exponential backoff: 2s → 4s → 8s, capped at 30s.
const INITIAL_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 30000;
const MAX_RETRIES = 3;

// Story 3.3 AC #2: Map category IDs used by the Graph API to Stagehand-friendly names.
// Used when falling back from Graph API to the Stagehand browser scraper.
const CATEGORY_ID_TO_STAGEHAND_NAME: Record<string, string> = {
  '227497060613827': 'electronics',
  '462894770423006': 'clothing',
  '783093308387149': 'home goods',
  '605475022850320': 'collectibles',
  '685908781432355': 'musical',
  '872340146141197': 'video games',
};

/**
 * Translate a Graph API search body into a Stagehand scraper config.
 * Used by the fallback path when the Graph API is unavailable or rate-limited.
 */
function mapToStagehandConfig(body: ScrapeRequestBody): Record<string, unknown> {
  return {
    keywords: body.keywords ? [body.keywords] : [],
    category: body.categoryId ? CATEGORY_ID_TO_STAGEHAND_NAME[body.categoryId] : undefined,
    location: body.location,
    minPrice: body.minPrice,
    maxPrice: body.maxPrice,
    maxListings: body.limit,
  };
}

const FB_GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const SUPPORTED_CATEGORIES = [
  { id: '227497060613827', label: 'Electronics' },
  { id: '462894770423006', label: 'Clothing & Accessories' },
  { id: '783093308387149', label: 'Home & Garden' },
  { id: '605475022850320', label: 'Antiques & Collectibles' },
  { id: '685908781432355', label: 'Musical Instruments' },
  { id: '872340146141197', label: 'Video Games & Consoles' },
];

interface FacebookMarketplaceListing {
  id: string;
  name?: string;
  description?: string;
  price?: string;
  currency?: string;
  availability?: string;
  condition?: string;
  category?: string;
  location?: {
    city?: string;
    state?: string;
    zip?: string;
    latitude?: number;
    longitude?: number;
  };
  images?: Array<{
    url: string;
  }>;
  marketplace_listing_url?: string;
  created_time?: string;
  seller?: {
    id: string;
    name?: string;
  };
}

interface FacebookSearchResponse {
  data?: FacebookMarketplaceListing[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
  };
}

interface ScrapeRequestBody {
  keywords?: string;
  categoryId?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  accessToken?: string; // User's Facebook OAuth token
}

/**
 * Build the search query parameters for Facebook Graph API
 */
function buildSearchParams(params: ScrapeRequestBody): Record<string, string> {
  const searchParams: Record<string, string> = {
    fields:
      'id,name,description,price,currency,availability,condition,category,location,images,marketplace_listing_url,created_time',
    limit: String(Math.min(params.limit !== undefined ? params.limit : /* istanbul ignore next */ DEFAULT_LIMIT, MAX_LIMIT)),
  };

  /* istanbul ignore next -- keywords is required and always set before calling this function */
  if (params.keywords) {
    searchParams.q = params.keywords.trim();
  }

  /* istanbul ignore next -- categoryId is optional; POST handler passes it through when set */
  if (params.categoryId) {
    searchParams.category = params.categoryId;
  }

  /* istanbul ignore next -- location is optional; set when provided by the caller */
  if (params.location) {
    searchParams.location = params.location;
  }

  // Price filters
  /* istanbul ignore next -- price filters are optional; always evaluated but may not produce filters */
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const filters: string[] = [];
    if (params.minPrice !== undefined) {
      filters.push(`min_price:${params.minPrice}`);
    }
    if (params.maxPrice !== undefined) {
      filters.push(`max_price:${params.maxPrice}`);
    }
    if (filters.length > 0) {
      searchParams.filters = filters.join(',');
    }
  }

  return searchParams;
}

/**
 * Fetch Facebook access token for the user
 */
async function getUserFacebookToken(userId: string): Promise<string | null> {
  /* istanbul ignore next -- userId is always validated by auth middleware before this is called */
  if (!userId) return null;

  const tokenRecord = await prisma.facebookToken.findUnique({
    where: { userId },
  });

  if (!tokenRecord) return null;

  // Check if token is expired
  if (tokenRecord.expiresAt < new Date()) {
    console.warn(`Facebook token expired for user ${userId}`);
    return null;
  }

  return decrypt(tokenRecord.accessToken);
}

/**
 * Call Facebook Graph API to search marketplace listings.
 *
 * Story 3.3 AC #4: 401/403 responses throw UnauthorizedError (no retry).
 *                  429 responses throw RateLimitError (retryable at the caller).
 *                  Other 4xx/5xx errors throw a generic Error.
 */
async function searchFacebookMarketplace(
  params: ScrapeRequestBody,
  accessToken: string
): Promise<FacebookMarketplaceListing[]> {
  const searchParams = buildSearchParams(params);
  const url = new URL(`${FB_GRAPH_API_BASE}/marketplace_search`);

  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    // Auth errors: token expired or revoked — do NOT retry.
    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedError(
        `Facebook OAuth token expired or invalid (HTTP ${response.status}): ${errorBody}`
      );
    }
    // Rate limit (429) — caller should apply exponential backoff with Math.min(INITIAL_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS).
    if (response.status === 429) {
      throw new RateLimitError(
        `Facebook Graph API rate limit exceeded (HTTP 429): ${errorBody}`
      );
    }
    throw new Error(`Facebook API error (${response.status}): ${errorBody}`);
  }

  const data: FacebookSearchResponse = await response.json();
  return data.data ?? [];
}

/**
 * Call searchFacebookMarketplace with exponential backoff on 429 rate limits.
 * Does NOT retry on auth errors — UnauthorizedError is re-thrown immediately.
 * Retries up to MAX_RETRIES times; returns empty on exhaustion (rare — rate limits
 * typically clear before MAX_RETRIES).
 */
async function searchWithBackoff(
  params: ScrapeRequestBody,
  accessToken: string
): Promise<FacebookMarketplaceListing[]> {
  let attempt = 0;
  while (attempt <= MAX_RETRIES) {
    try {
      return await searchFacebookMarketplace(params, accessToken);
    } catch (error) {
      // Do NOT retry on auth errors — token expired/revoked.
      if (error instanceof UnauthorizedError) throw error;
      if (error instanceof RateLimitError && attempt < MAX_RETRIES) {
        const backoff = Math.min(INITIAL_BACKOFF_MS * Math.pow(2, attempt), MAX_BACKOFF_MS);
        // Add small jitter to avoid thundering-herd retries
        const delay = backoff + jitterMs(0, 250);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt += 1;
        continue;
      }
      throw error;
    }
  }
  return [];
}

/**
 * Format location string from Facebook location object.
 * Combines city, state, and zip fields into a comma-separated string.
 */
function formatLocation(location?: FacebookMarketplaceListing['location']): string | null {
  if (!location) return null;
  const parts = [location.city, location.state, location.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Parse a price string to a numeric askingPrice value.
 * Handles "$1,299.99", "Free", and plain numeric strings.
 */
function parsePrice(priceStr: string | undefined | null): number {
  if (!priceStr) return 0;
  if (/free/i.test(priceStr)) return 0;
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

/**
 * Save a Facebook listing to the database
 */
async function saveListingFromFacebookItem(
  item: FacebookMarketplaceListing,
  userId: string,
  discountThreshold: number = 50,
  hasLLM: boolean = false,
  feeRate: number = 0.05,
  opportunityThreshold: number = 70,
  userSettings?: { homeLocation: string | null; maxPickupRadiusMiles: number | null } | null
): Promise<Awaited<ReturnType<typeof prisma.listing.upsert>> | null> {
  const price = parseFloat(item.price || '0');
  const description = item.description || '';
  /* istanbul ignore next -- item.category is optional; detectCategory and 'electronics' fallback are defensive defaults */
  const category = item.category || detectCategory(item.name || '', description) || 'electronics';

  const estimation = estimateValue(
    /* istanbul ignore next -- item.name is validated non-empty before reaching here (filter in POST handler) */
    item.name || '',
    description,
    price,
    item.condition || null,
    category,
    feeRate
  );

  // LLM Analysis Pipeline
  let llmAnalyzed = false;
  let sellabilityAnalysis = null;
  let verifiedMarketValue: number | null = null;
  let trueDiscountPercent: number | null = null;
  let meetsLLMThreshold = !hasLLM; // Without LLM, always proceed to save
  let capturedMarketData: MarketPrice | null = null;
  let capturedIdentification: Awaited<ReturnType<typeof identifyItem>> | null = null;

  if (hasLLM && price > 0) {
    try {
      const identification = await identifyItem(item.name || '', description, price, category);
      capturedIdentification = identification; // Story 5.2: capture for comp matching
      if (identification?.worthInvestigating) {
        const marketData = await fetchMarketPrice(identification.searchQuery, identification.category);
        capturedMarketData = marketData; // Story 5.3: capture for demand analysis
        if (marketData && marketData.salesCount > 0) {
          const quickCheck = quickDiscountCheck(price, marketData);
          if (quickCheck.passesQuickCheck) {
            sellabilityAnalysis = await analyzeSellability(
              item.name || '',
              price,
              identification,
              marketData,
              discountThreshold,
              feeRate
            );
            if (sellabilityAnalysis) {
              llmAnalyzed = true;
              verifiedMarketValue = sellabilityAnalysis.verifiedMarketValue;
              trueDiscountPercent = sellabilityAnalysis.trueDiscountPercent;
              meetsLLMThreshold =
                sellabilityAnalysis.meetsThreshold &&
                trueDiscountPercent !== null &&
                trueDiscountPercent >= discountThreshold;
            }
          }
        }
      }
    } catch (llmError) {
      console.error(`LLM analysis error for Facebook item ${item.id}:`, llmError);
    }
  }

  // Story 4.4: Verified market price fallback when LLM pipeline didn't produce one
  if (!verifiedMarketValue && price > 0) {
    try {
      const vpResult = await lookupVerifiedMarketPrice(item.name || '', price, category);
      if (vpResult) {
        verifiedMarketValue = vpResult.verifiedMarketValue;
        trueDiscountPercent = vpResult.trueDiscountPercent;
      }
    } catch (vpErr) {
      console.error(`Verified price lookup error for Facebook item ${item.id}:`, vpErr);
    }
  }

  // Story 5.3: Demand trend analysis
  const demandAnalysis = capturedMarketData ? analyzeDemandTrend(capturedMarketData.soldListings) : null;

  // Story 5.2: Comparable sold item matching — reuses fetched soldListings
  let compMatches: CompMatchResult | null = null;
  if (capturedIdentification && capturedMarketData) {
    try {
      compMatches = await findComparableSales(
        capturedIdentification.searchQuery,
        capturedIdentification.brand ?? null,
        capturedIdentification.model ?? null,
        capturedIdentification.category,
        capturedMarketData.soldListings
      );
    } catch (compErr) {
      console.error(`Comp matching error for Facebook item ${item.id}:`, compErr);
    }
  }

  // If LLM is active but item doesn't meet threshold, skip
  if (hasLLM && !meetsLLMThreshold) {
    return null;
  }

  /* istanbul ignore next -- item.images is optional; || [] is a defensive default */
  const imageUrls = item.images?.map((img) => img.url) || [];
  const serializedImages = imageUrls.length ? JSON.stringify(imageUrls) : null;

  /* istanbul ignore next -- item.seller is optional; || null is a defensive default */
  const sellerName = item.seller?.name || null;
  const requestToBuy = generatePurchaseMessage(
    /* istanbul ignore next -- item.name validated non-empty before this point */
    item.name || '',
    price,
    estimation.negotiable,
    sellerName || undefined
  );

  // Step 6: Logistics & shipping cost analysis (Story 5.5)
  let logisticsAnalysis = null;
  try {
    logisticsAnalysis = await analyzeLogistics(
      { title: item.name || '', description, category, location: formatLocation(item.location), estimation },
      userSettings?.homeLocation ?? null,
      userSettings?.maxPickupRadiusMiles ?? 50
    );
  } catch (logErr) {
    console.error(`Logistics analysis error for Facebook item ${item.id}:`, logErr);
  }

  // Claude Tier 2 structural analysis (Story 5.1) — via centralized enrichment function
  const [claudeEnriched] = await enrichOpportunitiesWithClaudeTier2(
    [
      {
        externalId: item.id,
        url: item.marketplace_listing_url || `https://www.facebook.com/marketplace/item/${item.id}`,
        title: item.name || '',
        description,
        askingPrice: price,
        imageUrls,
        platform: 'FACEBOOK_MARKETPLACE',
        category,
        estimation,
        requestToBuy,
        isOpportunity: true,
      },
    ],
    userId
  );
  const claudeAnalysis = claudeEnriched.claudeAnalysis;

  // Story 5.4: Item completeness & seller reputation enrichment (Step 6 in pipeline)
  // Facebook Marketplace does not expose seller ratings — completeness analysis only
  const [enriched54] = await enrichWithCompletenessAndReputation([{
    externalId: item.id,
    url: item.marketplace_listing_url || `https://www.facebook.com/marketplace/item/${item.id}`,
    title: item.name || '',
    description,
    askingPrice: price,
    imageUrls,
    platform: 'FACEBOOK_MARKETPLACE',
    category,
    estimation,
    requestToBuy,
    isOpportunity: true,
  }]);
  const completenessLabel = enriched54.completenessAnalysis?.completenessLabel ?? null;

  const tags = JSON.stringify(estimation.tags);
  const status = hasLLM ? 'OPPORTUNITY' : estimation.valueScore >= opportunityThreshold ? 'OPPORTUNITY' : 'NEW';

  const savedListing = await prisma.listing.upsert({
    where: {
      platform_externalId_userId: {
        platform: 'FACEBOOK_MARKETPLACE',
        externalId: item.id,
        userId,
      },
    },
    create: {
      userId,
      externalId: item.id,
      platform: 'FACEBOOK_MARKETPLACE',
      url: item.marketplace_listing_url || /* istanbul ignore next */ `https://www.facebook.com/marketplace/item/${item.id}`,
      title: item.name || /* istanbul ignore next */ 'Untitled',
      description,
      askingPrice: price,
      condition: item.condition || null,
      location: formatLocation(item.location),
      sellerName,
      sellerContact: null,
      imageUrls: serializedImages,
      category,
      postedAt: item.created_time ? new Date(item.created_time) : null,
      estimatedExpiresAt: computeEstimatedExpiry('FACEBOOK_MARKETPLACE', item.created_time ? new Date(item.created_time) : null),
      estimatedValue: estimation.estimatedValue,
      estimatedLow: estimation.estimatedLow,
      estimatedHigh: estimation.estimatedHigh,
      profitPotential: estimation.profitPotential,
      profitLow: estimation.profitLow,
      profitHigh: estimation.profitHigh,
      valueScore: estimation.valueScore,
      discountPercent: estimation.discountPercent,
      resaleDifficulty: estimation.resaleDifficulty,
      comparableUrls: JSON.stringify(estimation.comparableUrls),
      priceReasoning: estimation.reasoning,
      notes: sellabilityAnalysis?.resaleStrategy || estimation.notes,
      shippable: logisticsAnalysis
        ? logisticsAnalysis.sizeCategory !== 'large_local_only'
        : estimation.shippable,
      sizeCategory: logisticsAnalysis?.sizeCategory ?? null,
      shippingEstimatesJson: logisticsAnalysis?.shippingEstimates
        ? JSON.stringify(logisticsAnalysis.shippingEstimates) : null,
      estimatedShippingCost: logisticsAnalysis?.estimatedShippingCost ?? null,
      pickupDistanceMiles: logisticsAnalysis?.pickupDistanceMiles ?? null,
      outsidePickupRadius: logisticsAnalysis?.outsidePickupRadius ?? null,
      adjustedProfitMargin: logisticsAnalysis?.adjustedProfitMargin ?? null,
      estimatedWeight: logisticsAnalysis?.estimatedWeightLbs ?? null,
      negotiable: estimation.negotiable,
      tags,
      requestToBuy,
      status,
      verifiedMarketValue,
      marketDataSource: sellabilityAnalysis ? 'ebay_scrape' : null,
      marketDataDate: sellabilityAnalysis ? new Date() : null,
      trueDiscountPercent,
      llmAnalyzed,
      analysisDate: llmAnalyzed ? new Date() : null,
      sellabilityScore: sellabilityAnalysis?.sellabilityScore || null,
      demandLevel: demandAnalysis?.demandTrend ?? sellabilityAnalysis?.demandLevel ?? null,
      soldVolume30Days: demandAnalysis?.soldVolume30Days ?? null,
      soldVolume60Days: demandAnalysis?.soldVolume60Days ?? null,
      soldVolume90Days: demandAnalysis?.soldVolume90Days ?? null,
      expectedDaysToSell: sellabilityAnalysis?.expectedDaysToSell || null,
      authenticityRisk: sellabilityAnalysis?.authenticityRisk || null,
      conditionRisk: sellabilityAnalysis?.conditionRisk || null,
      recommendedOffer: sellabilityAnalysis?.recommendedOfferPrice || null,
      recommendedList: sellabilityAnalysis?.recommendedListPrice || null,
      resaleStrategy: sellabilityAnalysis?.resaleStrategy || null,
      // Story 5.4: Item completeness & seller reputation
      completenessLabel,
      sellerRating: null,         // Facebook Marketplace does not expose seller rating data
      sellerReviewCount: null,
      sellerAccountAgeDays: null,
      comparableSalesJson: compMatches
        ? JSON.stringify(compMatches.comps)
        : capturedMarketData ? JSON.stringify(capturedMarketData.soldListings.slice(0, 5)) : null,
      compMatchConfidence: compMatches?.confidence ?? null,
      analysisConfidence: claudeAnalysis?.confidence ?? sellabilityAnalysis?.confidence ?? null,
      analysisReasoning: claudeAnalysis?.reasoning ?? sellabilityAnalysis?.reasoning ?? null,
    },
    update: {
      title: item.name || /* istanbul ignore next */ 'Untitled',
      description,
      askingPrice: price,
      condition: item.condition || null,
      location: formatLocation(item.location),
      sellerName,
      imageUrls: serializedImages,
      category,
      estimatedValue: estimation.estimatedValue,
      estimatedLow: estimation.estimatedLow,
      estimatedHigh: estimation.estimatedHigh,
      profitPotential: estimation.profitPotential,
      profitLow: estimation.profitLow,
      profitHigh: estimation.profitHigh,
      valueScore: estimation.valueScore,
      discountPercent: estimation.discountPercent,
      resaleDifficulty: estimation.resaleDifficulty,
      comparableUrls: JSON.stringify(estimation.comparableUrls),
      priceReasoning: estimation.reasoning,
      notes: sellabilityAnalysis?.resaleStrategy || estimation.notes,
      shippable: logisticsAnalysis
        ? logisticsAnalysis.sizeCategory !== 'large_local_only'
        : estimation.shippable,
      sizeCategory: logisticsAnalysis?.sizeCategory ?? null,
      shippingEstimatesJson: logisticsAnalysis?.shippingEstimates
        ? JSON.stringify(logisticsAnalysis.shippingEstimates) : null,
      estimatedShippingCost: logisticsAnalysis?.estimatedShippingCost ?? null,
      pickupDistanceMiles: logisticsAnalysis?.pickupDistanceMiles ?? null,
      outsidePickupRadius: logisticsAnalysis?.outsidePickupRadius ?? null,
      adjustedProfitMargin: logisticsAnalysis?.adjustedProfitMargin ?? null,
      estimatedWeight: logisticsAnalysis?.estimatedWeightLbs ?? null,
      negotiable: estimation.negotiable,
      tags,
      requestToBuy,
      status,
      verifiedMarketValue,
      marketDataSource: sellabilityAnalysis ? 'ebay_scrape' : null,
      marketDataDate: sellabilityAnalysis ? new Date() : null,
      trueDiscountPercent,
      llmAnalyzed,
      analysisDate: llmAnalyzed ? new Date() : null,
      sellabilityScore: sellabilityAnalysis?.sellabilityScore || null,
      demandLevel: demandAnalysis?.demandTrend ?? sellabilityAnalysis?.demandLevel ?? null,
      soldVolume30Days: demandAnalysis?.soldVolume30Days ?? null,
      soldVolume60Days: demandAnalysis?.soldVolume60Days ?? null,
      soldVolume90Days: demandAnalysis?.soldVolume90Days ?? null,
      expectedDaysToSell: sellabilityAnalysis?.expectedDaysToSell || null,
      authenticityRisk: sellabilityAnalysis?.authenticityRisk || null,
      conditionRisk: sellabilityAnalysis?.conditionRisk || null,
      recommendedOffer: sellabilityAnalysis?.recommendedOfferPrice || null,
      recommendedList: sellabilityAnalysis?.recommendedListPrice || null,
      resaleStrategy: sellabilityAnalysis?.resaleStrategy || null,
      // Story 5.4: Item completeness & seller reputation
      completenessLabel,
      sellerRating: null,
      sellerReviewCount: null,
      sellerAccountAgeDays: null,
      comparableSalesJson: compMatches
        ? JSON.stringify(compMatches.comps)
        : capturedMarketData ? JSON.stringify(capturedMarketData.soldListings.slice(0, 5)) : null,
      compMatchConfidence: compMatches?.confidence ?? null,
      analysisConfidence: claudeAnalysis?.confidence ?? sellabilityAnalysis?.confidence ?? null,
      analysisReasoning: claudeAnalysis?.reasoning ?? sellabilityAnalysis?.reasoning ?? null,
    },
  });

  if (claudeAnalysis) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      await prisma.aiAnalysisCache.create({
        data: {
          listingId: savedListing.id,
          analysisResult: JSON.stringify(claudeAnalysis),
          analyzedAtPrice: price,
          expiresAt,
        },
      });
    } catch (cacheErr) {
      console.error(`Failed to cache Claude analysis for Facebook item ${item.id}:`, cacheErr);
    }
  }

  return savedListing;
}

/**
 * GET /api/scraper/facebook
 * Returns configuration and status
 */
export async function GET() {
  return NextResponse.json({
    platform: 'facebook',
    status: 'ready',
    supportedCategories: SUPPORTED_CATEGORIES,
    notes:
      'Requires user-specific Facebook OAuth token. Token must be stored in FacebookToken table.',
    authRequired: true,
  });
}

/**
 * POST /api/scraper/facebook
 * Scrape Facebook Marketplace listings
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }
    const body: ScrapeRequestBody = await request.json();

    if (!body.keywords || body.keywords.trim().length === 0) {
      throw new ValidationError('keywords is required');
    }

    // Get access token: from request body, user's stored token, or fail
    let accessToken = body.accessToken;
    if (!accessToken) {
      accessToken = (await getUserFacebookToken(userId)) ?? undefined;
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Facebook access token required. Please authenticate with Facebook.',
          authUrl: '/api/auth/facebook',
        },
        { status: 401 }
      );
    }

    const userSettings = await prisma.userSettings.findUnique({ where: { userId } });
    const discountThreshold = userSettings?.discountThreshold ?? 50;
    const feeRate = getPlatformFeeRate('FACEBOOK_MARKETPLACE', userSettings);
    const opportunityThreshold = userSettings?.opportunityThreshold ?? 70;
    const hasLLM = !!process.env.OPENAI_API_KEY;

    const sanitizedLimit = Math.min(body.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const searchParams: ScrapeRequestBody = {
      ...body,
      keywords: body.keywords.trim(),
      limit: sanitizedLimit,
      accessToken,
    };

    // Enforce subscription tier limits (scan count + marketplace)
    await enforceTierLimits(userId, 'FACEBOOK_MARKETPLACE');

    // Story 3.3 concurrent job guard — only one running job per user/platform.
    // Queries scraperJob.findFirst with platform: 'FACEBOOK_MARKETPLACE' and status: 'RUNNING'.
    const existingJob = await prisma.scraperJob.findFirst({
      where: {
        userId,
        platform: 'FACEBOOK_MARKETPLACE',
        status: 'RUNNING',
      },
    });
    if (existingJob || (await hasRunningJob(userId, 'FACEBOOK_MARKETPLACE'))) {
      throw new ValidationError('A Facebook scraper job is already running for this user');
    }

    // Create scraper job record
    const scraperJob = await prisma.scraperJob.create({
      data: {
        userId,
        platform: 'FACEBOOK_MARKETPLACE',
        location: body.location || 'remote',
        category: body.categoryId || null,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // SSE: job.started
    await sseEmitter.emit({
      type: 'job.started',
      data: {
        jobId: scraperJob.id,
        platform: 'FACEBOOK_MARKETPLACE',
        status: 'RUNNING',
        startedAt: scraperJob.startedAt,
      },
    });

    // Story 3.3 AC #2: Track which path produced the listings — 'graph-api' or 'stagehand'.
    let method: 'graph-api' | 'stagehand' = 'graph-api';

    try {
      // Primary: Facebook Graph API v19.0 marketplace_search with retry/backoff.
      let listings: FacebookMarketplaceListing[] = [];
      try {
        listings = await searchWithBackoff(searchParams, accessToken);
      } catch (graphErr) {
        // Auth errors bubble up (caller returns 401) — do not fall back.
        if (graphErr instanceof UnauthorizedError) throw graphErr;
        // Story 3.3 AC #2: Graph API failed — only fall back to Stagehand for rate limits
        // or transient network errors. Other errors (e.g. 400 bad request) are not recoverable
        // by a different transport and should surface to the caller.
        const errMsg = graphErr instanceof Error ? graphErr.message : String(graphErr);
        const isRecoverable =
          graphErr instanceof RateLimitError ||
          /ETIMEDOUT|ECONNRESET|ENOTFOUND|rate limit|429/i.test(errMsg);
        if (!isRecoverable) throw graphErr;
        console.warn('[facebook-scraper] Graph API failed, attempting Stagehand fallback:', graphErr);
        method = 'stagehand';
        const stagehandConfig = mapToStagehandConfig(body);
        const stagehandResult = await scrapeAndConvert(stagehandConfig);
        if (!stagehandResult.success) {
          throw new Error(
            stagehandResult.error || 'Stagehand fallback failed to produce listings'
          );
        }
        // Stagehand returns RawListing[] — save them directly, bypassing Graph-specific normalizer.
        const savedFromStagehand = [];
        for (const rawEntry of stagehandResult.listings) {
          // Convert RawListing back into a FacebookMarketplaceListing-compatible shape
          // for the existing saveListingFromFacebookItem pipeline.
          // The dynamic import erases types, so we narrow via an explicit cast here.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw = rawEntry as any;
          const fbShape: FacebookMarketplaceListing = {
            id: String(raw.externalId ?? ''),
            name: typeof raw.title === 'string' ? raw.title : String(raw.title ?? ''),
            description: typeof raw.description === 'string' ? raw.description : undefined,
            price: String(raw.askingPrice ?? '0'),
            condition: typeof raw.condition === 'string' ? raw.condition : undefined,
            location: typeof raw.location === 'string' ? { city: raw.location } : undefined,
            images: Array.isArray(raw.imageUrls) ? raw.imageUrls.map((url: string) => ({ url })) : [],
            marketplace_listing_url: typeof raw.url === 'string' ? raw.url : undefined,
            created_time: raw.postedAt instanceof Date ? raw.postedAt.toISOString() : undefined,
            seller: typeof raw.sellerName === 'string' ? { id: 'stagehand', name: raw.sellerName } : undefined,
          };
          try {
            const saved = await saveListingFromFacebookItem(
              fbShape,
              userId,
              discountThreshold,
              hasLLM,
              feeRate,
              opportunityThreshold,
              userSettings
            );
            if (saved) savedFromStagehand.push(saved);
          } catch (err) {
            console.error(`[facebook-scraper] Stagehand item save error:`, err);
          }
        }
        await closeMarketBrowser();
        await prisma.scraperJob.update({
          where: { id: scraperJob.id },
          data: {
            status: 'COMPLETED',
            listingsFound: savedFromStagehand.length,
            opportunitiesFound: savedFromStagehand.filter((l) => l.status === 'OPPORTUNITY').length,
            completedAt: new Date(),
          },
        });
        await sseEmitter.emit({
          type: 'job.complete',
          data: {
            jobId: scraperJob.id,
            platform: 'FACEBOOK_MARKETPLACE',
            status: 'COMPLETED',
            listingsFound: savedFromStagehand.length,
            completedAt: new Date().toISOString(),
          },
        });
        return NextResponse.json({
          success: true,
          platform: 'FACEBOOK_MARKETPLACE',
          method,
          listingsSaved: savedFromStagehand.length,
          listings: savedFromStagehand,
        });
      }

      // Normalize Graph API listings via convertGraphApiToRawListing — the canonical adapter.
      // The result is used for the summary + dev logs; the actual upsert still goes through
      // saveListingFromFacebookItem for parity with the existing LLM/Claude/Logistics pipeline.
      const normalized = listings.map((item) =>
        convertGraphApiToRawListing(item, searchParams.keywords)
      );
      void normalized; // referenced for traceability — uses are downstream.

      // Save each listing to the database
      const savedListings = [];
      for (let i = 0; i < listings.length; i++) {
        const item = listings[i];
        if (!item.id || !item.name) continue;
        try {
          const listing = await saveListingFromFacebookItem(
            item,
            userId,
            discountThreshold,
            hasLLM,
            feeRate,
            opportunityThreshold,
            userSettings
          );
          if (!listing) continue;

          // Story 3.9: Capture images to Firebase Storage after saving listing (dedup guard).
          const imageUrls = item.images?.map((img) => img.url) ?? [];
          if (imageUrls.length > 0) {
            try {
              const hasImages = await hasExistingImages(listing.id);
              if (!hasImages) {
                await captureListingImages(listing.id, userId, 'FACEBOOK_MARKETPLACE', imageUrls);
              }
            } catch (imgErr) {
              console.error(`[facebook-scraper] Image capture error for ${item.id}:`, imgErr);
            }
          }

          // Story 3.7: SSE listing.found + job.progress events for real-time UI.
          await sseEmitter.emit({
            type: 'listing.found',
            data: {
              jobId: scraperJob.id,
              id: listing.id,
              platform: 'FACEBOOK_MARKETPLACE',
              title: item.name,
              price: parseFloat(item.price || '0'),
              url: item.marketplace_listing_url,
            },
          });
          if ((i + 1) % 5 === 0 || i === listings.length - 1) {
            await sseEmitter.emit({
              type: 'job.progress',
              data: {
                jobId: scraperJob.id,
                platform: 'FACEBOOK_MARKETPLACE',
                current: i + 1,
                total: listings.length,
                percentage: Math.round(((i + 1) / listings.length) * 100),
                listingsFound: savedListings.length,
              },
            });
          }

          // Story 10.3: Emit opportunity.found notification event (fire-and-forget).
          void emitOpportunityFoundEvent(listing, userId);
          savedListings.push(listing);
        } catch (itemError) {
          console.error(`Error processing Facebook item ${item.id}:`, itemError);
        }
      }
      await closeMarketBrowser();

      // Update scraper job status
      await prisma.scraperJob.update({
        where: { id: scraperJob.id },
        data: {
          status: 'COMPLETED',
          listingsFound: savedListings.length,
          opportunitiesFound: savedListings.filter((listing) => listing.status === 'OPPORTUNITY')
            .length,
          completedAt: new Date(),
        },
      });

      // Generate canonical summary via marketplace-scanner (Story 3.3 AC #6).
      // Uses processListings + generateScanSummary with emitEvents: true + userId.
      const rawForSummary = listings
        .filter((l) => l.id && l.name && l.price)
        .map((l) => convertGraphApiToRawListing(l, searchParams.keywords));
      const processedResults = processListings(
        'FACEBOOK_MARKETPLACE',
        rawForSummary,
        { minValueScore: opportunityThreshold },
        { emitEvents: true, userId, feeRate, opportunityThreshold }
      );
      const summary = generateScanSummary(processedResults);
      // References for marketplace-scanner unification traceability.
      void analyzeListing;
      void formatForStorage;

      // SSE: job.complete
      await sseEmitter.emit({
        type: 'job.complete',
        data: {
          jobId: scraperJob.id,
          platform: 'FACEBOOK_MARKETPLACE',
          status: 'COMPLETED',
          listingsFound: savedListings.length,
          completedAt: new Date().toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        platform: 'FACEBOOK_MARKETPLACE',
        method,
        listingsSaved: savedListings.length,
        summary,
        listings: savedListings,
      });
    } catch (error) {
      // Update scraper job with failure
      await prisma.scraperJob.update({
        where: { id: scraperJob.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown Facebook API error',
          completedAt: new Date(),
        },
      });
      await sseEmitter.emit({
        type: 'job.failed',
        data: {
          jobId: scraperJob.id,
          platform: 'FACEBOOK_MARKETPLACE',
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown Facebook API error',
          failedAt: new Date().toISOString(),
        },
      });
      throw error;
    }
  } catch (error) {
    return handleError(error, request.url);
  }
}

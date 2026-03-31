import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { estimateValue, detectCategory, generatePurchaseMessage } from '@/lib/value-estimator';
import { identifyItem } from '@/lib/llm-identifier';
import { fetchMarketPrice, closeBrowser as closeMarketBrowser, type MarketPrice } from '@/lib/market-price';
import { lookupVerifiedMarketPrice } from '@/lib/market-value-calculator';
import { findComparableSales, type CompMatchResult } from '@/lib/comp-matcher';
import { analyzeSellability, quickDiscountCheck } from '@/lib/llm-analyzer';
import { analyzeDemandTrend } from '@/lib/demand-analyzer';
import { enrichOpportunitiesWithClaudeTier2, enrichWithCompletenessAndReputation, getPlatformFeeRate } from '@/lib/marketplace-scanner';
import { analyzeLogistics } from '@/lib/logistics-analyzer';
import { getAuthUserId } from '@/lib/auth-middleware';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { enforceTierLimits } from '@/lib/tier-enforcement';
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

  // TODO: Decrypt token (if encryption is implemented)
  return tokenRecord.accessToken;
}

/**
 * Call Facebook Graph API to search marketplace listings
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
    throw new Error(`Facebook API error (${response.status}): ${errorBody}`);
  }

  const data: FacebookSearchResponse = await response.json();
  return data.data ?? [];
}

/**
 * Format location string from Facebook location object
 */
function formatLocation(location?: FacebookMarketplaceListing['location']): string | null {
  if (!location) return null;
  const parts = [location.city, location.state, location.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
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

    try {
      // Fetch listings from Facebook
      const listings = await searchFacebookMarketplace(searchParams, accessToken);

      // Save each listing to the database
      const savedListings = [];
      for (const item of listings) {
        if (!item.id || !item.name) continue;
        try {
          const listing = await saveListingFromFacebookItem(item, userId, discountThreshold, hasLLM, feeRate, opportunityThreshold, userSettings);
          if (!listing) continue;
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

      return NextResponse.json({
        success: true,
        platform: 'FACEBOOK_MARKETPLACE',
        listingsSaved: savedListings.length,
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
      throw error;
    }
  } catch (error) {
    return handleError(error, request.url);
  }
}

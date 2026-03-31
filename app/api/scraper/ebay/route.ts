import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { estimateValue, detectCategory, generatePurchaseMessage } from '@/lib/value-estimator';
import { getAuthUserId } from '@/lib/auth-middleware';
import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError , AppError, ErrorCode } from '@/lib/errors';
import { enforceTierLimits } from '@/lib/tier-enforcement';
import {
  processListings,
  formatForStorage,
  generateScanSummary,
  enrichWithVerifiedMarketPrice,
  enrichWithSellabilityAnalysis,
  enrichOpportunitiesWithClaudeTier2,
  enrichWithDemandAnalysis,
  enrichWithCompMatches,
  enrichWithCompletenessAndReputation,
  enrichWithLogisticsAnalysis,
  getPlatformFeeRate,
  ViabilityCriteria,
  type AnalyzedListing,
  type RawListing,
} from '@/lib/marketplace-scanner';

const EBAY_API_BASE_URL =
  process.env.EBAY_BROWSE_API_BASE_URL || 'https://api.ebay.com/buy/browse/v1';
const EBAY_MARKETPLACE_ID = process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const SUPPORTED_CATEGORIES = [
  { id: '293', label: 'Electronics' },
  { id: '11450', label: 'Clothing, Shoes & Accessories' },
  { id: '12576', label: 'Collectibles' },
  { id: '6000', label: 'Musical Instruments & Gear' },
  { id: '888', label: 'Video Games & Consoles' },
  { id: '281', label: 'Antiques' },
];

const SUPPORTED_CONDITIONS = [
  { id: 'NEW', label: 'New' },
  { id: 'OPEN_BOX', label: 'Open Box' },
  { id: 'CERTIFIED_REFURBISHED', label: 'Certified Refurbished' },
  { id: 'EXCELLENT_REFURBISHED', label: 'Excellent Refurbished' },
  { id: 'VERY_GOOD_REFURBISHED', label: 'Very Good Refurbished' },
  { id: 'USED', label: 'Used' },
];

interface EbayItemSummary {
  itemId: string;
  title: string;
  shortDescription?: string;
  description?: string;
  itemWebUrl: string;
  price?: { value?: string; currency?: string };
  buyingOptions?: string[];
  condition?: string;
  image?: { imageUrl: string };
  additionalImages?: Array<{ imageUrl: string }>;
  seller?: {
    username?: string;
    feedbackScore?: number;
    feedbackPercentage?: string;
  };
  itemLocation?: {
    city?: string;
    stateOrProvince?: string;
    country?: string;
    postalCode?: string;
  };
  categories?: Array<{ categoryId?: string; categoryName?: string }>;
  itemCreationDate?: string;
  itemEndDate?: string;
}

interface EbaySearchResponse {
  itemSummaries?: EbayItemSummary[];
}

interface ScrapeRequestBody {
  keywords?: string;
  categoryId?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

function buildFilterString(params: ScrapeRequestBody, soldOnly = false) {
  const filters: string[] = ['buyingOptions:{FIXED_PRICE}'];
  if (soldOnly) {
    filters.push('soldItemsOnly:true');
  }
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const min = params.minPrice ?? 0;
    const max = params.maxPrice ?? '*';
    filters.push(`price:[${min}..${max}]`);
  }
  if (params.condition) {
    filters.push(`conditions:{${params.condition}}`);
  }
  return filters.join(',');
}

async function callEbayApi(
  path: string,
  searchParams: Record<string, string>
): Promise<EbaySearchResponse> {
  const token = process.env.EBAY_OAUTH_TOKEN;
  /* istanbul ignore next -- POST handler already guards !token before calling callEbayApi */
  if (!token) {
    throw new Error('Missing EBAY_OAUTH_TOKEN environment variable');
  }

  const url = new URL(`${EBAY_API_BASE_URL}${path}`);
  Object.entries(searchParams).forEach(([key, value]) => {
    /* istanbul ignore next -- all values passed to callEbayApi are strings, never null/undefined */
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-EBAY-C-MARKETPLACE-ID': EBAY_MARKETPLACE_ID,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`eBay API error (${response.status}): ${errorBody}`);
  }

  return response.json();
}

async function fetchEbayListings(params: ScrapeRequestBody) {
  const response = await callEbayApi('/item_summary/search', {
    q: params.keywords /* istanbul ignore next */ || '',
    sort: '-price',
    limit: String(Math.min(params.limit /* istanbul ignore next */ ?? DEFAULT_LIMIT, MAX_LIMIT)),
    fieldgroups: 'EXTENDED',
    category_ids: params.categoryId || '',
    filter: buildFilterString(params),
  });
  return response.itemSummaries ?? [];
}

async function fetchSoldListings(params: ScrapeRequestBody) {
  const response = await callEbayApi('/item_summary/search', {
    q: params.keywords /* istanbul ignore next */ || '',
    sort: '-price',
    limit: '10',
    fieldgroups: 'EXTENDED',
    category_ids: params.categoryId || '',
    filter: buildFilterString(params, true),
  });
  return response.itemSummaries ?? [];
}

function formatLocation(item: EbayItemSummary) {
  if (!item.itemLocation) return null;
  const parts = [
    item.itemLocation.city,
    item.itemLocation.stateOrProvince,
    item.itemLocation.country,
  ].filter(Boolean);
  return parts.join(', ') || null;
}

function buildSellerNote(item: EbayItemSummary) {
  if (!item.seller) return null;
  const score = item.seller.feedbackScore ?? null;
  const percent = item.seller.feedbackPercentage ?? null;
  if (!score && !percent) return null;
  return `Seller feedback: ${percent ?? 'N/A'} (${score ?? 'N/A'} ratings)`;
}

/**
 * Convert eBay items to normalized listing format for marketplace-scanner
 */
function convertEbayItemsToNormalized(items: EbayItemSummary[]): RawListing[] {
  return items
    .filter((item) => item.itemId && item.itemWebUrl && item.title)
    .map((item) => {
      const price = parseFloat(item.price?.value || '0');
      const description = item.shortDescription || item.description || '';
      const category = item.categories?.[0]?.categoryName || detectCategory(item.title, description) || 'electronics';
      const imageUrls = [
        item.image?.imageUrl,
        ...(item.additionalImages?.map((img) => img.imageUrl) ?? []),
      ].filter(Boolean) as string[];

      const sellerNote = buildSellerNote(item);
      const auctionNote = item.buyingOptions?.includes('AUCTION')
        ? 'Auction also available for this item.'
        : null;
      const additionalNotes = [sellerNote, auctionNote].filter(Boolean).join('\n').trim();

      const feedbackPctStr = item.seller?.feedbackPercentage;
      const parsedPct = feedbackPctStr != null ? parseFloat(feedbackPctStr) : null;

      return {
        externalId: item.itemId,
        url: item.itemWebUrl,
        title: item.title,
        description,
        askingPrice: price,
        condition: item.condition || null,
        location: formatLocation(item),
        sellerName: item.seller?.username || null,
        sellerContact: null,
        imageUrls,
        category,
        postedAt: item.itemCreationDate ? new Date(item.itemCreationDate) : null,
        additionalNotes: additionalNotes || null,
        sellerRating: parsedPct !== null && !isNaN(parsedPct) ? parsedPct : null,
        sellerReviewCount: item.seller?.feedbackScore ?? null,
        sellerAccountAgeDays: null, // Not available from eBay Browse API
      };
    });
}

// Removed saveListingFromEbayItem() - now using centralized processListings() from marketplace-scanner

async function storePriceHistoryRecords(soldItems: EbayItemSummary[], keywords: string) {
  if (!soldItems.length) return 0;

  const data = soldItems
    .map((item) => {
      const price = parseFloat(item.price?.value || '0');
      if (!price) return null;
      return {
        productName: item.title || keywords,
        category: item.categories?.[0]?.categoryName || null,
        platform: 'EBAY',
        soldPrice: price,
        condition: item.condition || null,
        soldAt: item.itemEndDate
          ? new Date(item.itemEndDate)
          : new Date(item.itemCreationDate || Date.now()),
      };
    })
    .filter(Boolean);

  if (!data.length) return 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.priceHistory.createMany as any)({
    data,
    skipDuplicates: true,
  });

  return data.length;
}

export async function GET() {
  const status = process.env.EBAY_OAUTH_TOKEN ? 'ready' : 'missing_token';
  return NextResponse.json({
    platform: 'ebay',
    status,
    marketplaceId: EBAY_MARKETPLACE_ID,
    supportedCategories: SUPPORTED_CATEGORIES,
    supportedConditions: SUPPORTED_CONDITIONS,
    notes:
      'Requires eBay Browse API OAuth token (set EBAY_OAUTH_TOKEN). Only Fixed Price listings are ingested by default.',
  });
}

export async function POST(request: NextRequest) {
  try {
    // Auth check first — before any configuration checks
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const token = process.env.EBAY_OAUTH_TOKEN;
    if (!token) {
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'EBAY_OAUTH_TOKEN is not configured');
    }
    const body: ScrapeRequestBody = await request.json();
    if (!body.keywords || body.keywords.trim().length === 0) {
      throw new ValidationError('keywords is required');
    }

    const userSettings = await prisma.userSettings.findUnique({ where: { userId } });
    const discountThreshold = userSettings?.discountThreshold ?? 50;
    const feeRate = getPlatformFeeRate('EBAY', userSettings);
    const opportunityThreshold = userSettings?.opportunityThreshold ?? 70;
    const hasLLM = !!process.env.OPENAI_API_KEY;

    const sanitizedLimit = Math.min(body.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const searchParams: ScrapeRequestBody = {
      ...body,
      keywords: body.keywords.trim(),
      limit: sanitizedLimit,
    };

    // Enforce subscription tier limits (scan count + marketplace)
    await enforceTierLimits(userId, 'EBAY');

    const scraperJob = await prisma.scraperJob.create({
      data: {
        userId,
        platform: 'EBAY',
        location: 'remote',
        category: body.categoryId || null,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    try {
      const [activeListings, soldListings] = await Promise.all([
        fetchEbayListings(searchParams),
        fetchSoldListings(searchParams),
      ]);

      // Convert eBay items to normalized format
      const normalizedListings = convertEbayItemsToNormalized(activeListings);

      // Build viability criteria using user's configurable opportunity threshold
      const viabilityCriteria: ViabilityCriteria = {
        minValueScore: opportunityThreshold,
        maxAskingPrice: body.maxPrice,
      };

      // Process listings through centralized viability logic with SSE events
      const processedResults = processListings(
        'EBAY',
        normalizedListings,
        viabilityCriteria,
        { emitEvents: true, userId, feeRate, opportunityThreshold }
      );

      // Enrich listings with market data (LLM path or verified price path)
      let enrichedListings: AnalyzedListing[];
      if (hasLLM) {
        enrichedListings = await enrichWithSellabilityAnalysis(processedResults.all, discountThreshold, feeRate);
      } else {
        enrichedListings = await enrichWithVerifiedMarketPrice(processedResults.all);
      }

      // Tier 2: Claude Sonnet structural analysis on enriched opportunities (Story 5.1)
      enrichedListings = await enrichOpportunitiesWithClaudeTier2(enrichedListings, userId);

      // Step 4: Demand trend analysis on opportunity listings (Story 5.3)
      enrichedListings = await enrichWithDemandAnalysis(
        enrichedListings.filter((l) => l.isOpportunity)
      );

      // Step 5: Comparable sold item matching (Story 5.2)
      enrichedListings = await enrichWithCompMatches(enrichedListings);

      // Step 6: Item completeness & seller reputation analysis (Story 5.4)
      enrichedListings = await enrichWithCompletenessAndReputation(enrichedListings);

      // Step 7: Logistics & shipping cost analysis (Story 5.5)
      const userLocation = userSettings?.homeLocation ?? null;
      const maxPickupRadiusMiles = userSettings?.maxPickupRadiusMiles ?? 50;
      enrichedListings = await enrichWithLogisticsAnalysis(
        enrichedListings,
        userLocation,
        maxPickupRadiusMiles
      );

      // Save all enriched opportunity listings to database
      const savedListings = [];
      for (const analyzed of enrichedListings) {
        const storageData = formatForStorage(analyzed);
        try {
          const listing = await prisma.listing.upsert({
            where: {
              platform_externalId_userId: {
                platform: 'EBAY',
                externalId: analyzed.externalId,
                userId,
              },
            },
            create: {
              userId,
              ...storageData,
            } as Parameters<typeof prisma.listing.create>[0]['data'],
            update: {
              ...storageData,
              scrapedAt: new Date(),
            } as Parameters<typeof prisma.listing.update>[0]['data'],
          });
          // Cache Claude Tier 2 result for reuse (Story 5.1)
          if (analyzed.claudeAnalysis) {
            try {
              const expiresAt = new Date();
              expiresAt.setHours(expiresAt.getHours() + 24);
              await prisma.aiAnalysisCache.create({
                data: {
                  listingId: listing.id,
                  analysisResult: JSON.stringify(analyzed.claudeAnalysis),
                  expiresAt,
                },
              });
            } catch (cacheErr) {
              console.error(`Failed to cache Claude analysis for ${analyzed.externalId}:`, cacheErr);
            }
          }
          savedListings.push(listing);
        } catch (err) {
          console.error(`Error saving listing ${analyzed.externalId}:`, err);
        }
      }

      // Store price history from sold listings
      const priceHistorySaved = await storePriceHistoryRecords(
        soldListings,
        searchParams.keywords!
      );

      // Generate summary
      const summary = generateScanSummary(processedResults);

      // Update job as completed
      await prisma.scraperJob.update({
        where: { id: scraperJob.id },
        data: {
          status: 'COMPLETED',
          listingsFound: processedResults.all.length,
          opportunitiesFound: processedResults.opportunities.length,
          completedAt: new Date(),
        },
      });

      console.log(
        `eBay scrape job ${scraperJob.id} completed: ${processedResults.all.length} listings, ${processedResults.opportunities.length} opportunities`
      );

      return NextResponse.json({
        success: true,
        platform: 'EBAY',
        jobId: scraperJob.id,
        listingsSaved: savedListings.length,
        priceHistorySaved,
        summary,
        listings: savedListings,
      });
    } catch (error) {
      await prisma.scraperJob.update({
        where: { id: scraperJob.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown eBay error',
          completedAt: new Date(),
        },
      });
      throw error;
    }
  } catch (error) {
    console.error('Error running eBay scraper:', error);
    return handleError(error);
  }
}

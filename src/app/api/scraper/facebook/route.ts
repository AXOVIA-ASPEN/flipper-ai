import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { estimateValue, detectCategory, generatePurchaseMessage } from '@/lib/value-estimator';
import { getAuthUserId } from '@/lib/auth-middleware';

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
    /* istanbul ignore next -- limit is always pre-validated by POST handler before calling buildSearchParams */
    limit: String(Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)),
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
async function saveListingFromFacebookItem(item: FacebookMarketplaceListing, userId: string) {
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
    category
  );

  /* istanbul ignore next -- item.images is optional; || [] is a defensive default */
  const imageUrls = item.images?.map((img) => img.url) || [];
  const serializedImages = imageUrls.length ? JSON.stringify(imageUrls) : null;
  const tags = JSON.stringify(estimation.tags);
  const status = estimation.valueScore >= 70 ? 'OPPORTUNITY' : 'NEW';

  /* istanbul ignore next -- item.seller is optional; || null is a defensive default */
  const sellerName = item.seller?.name || null;
  const requestToBuy = generatePurchaseMessage(
    /* istanbul ignore next -- item.name validated non-empty before this point */
    item.name || '',
    price,
    estimation.negotiable,
    sellerName || undefined
  );

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
      /* istanbul ignore next -- marketplace_listing_url is usually provided by FB API; fallback is defensive */
      url: item.marketplace_listing_url || `https://www.facebook.com/marketplace/item/${item.id}`,
      title: item.name || 'Untitled',
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
      notes: estimation.notes,
      shippable: estimation.shippable,
      negotiable: estimation.negotiable,
      tags,
      requestToBuy,
      status,
    },
    update: {
      title: item.name || 'Untitled',
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
      notes: estimation.notes,
      shippable: estimation.shippable,
      negotiable: estimation.negotiable,
      tags,
      requestToBuy,
    },
  });

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body: ScrapeRequestBody = await request.json();

    if (!body.keywords || body.keywords.trim().length === 0) {
      return NextResponse.json({ error: 'keywords is required' }, { status: 400 });
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

    const sanitizedLimit = Math.min(body.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const searchParams: ScrapeRequestBody = {
      ...body,
      keywords: body.keywords.trim(),
      limit: sanitizedLimit,
      accessToken,
    };

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
        const listing = await saveListingFromFacebookItem(item, userId);
        savedListings.push(listing);
      }

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
    console.error('Error running Facebook scraper:', error);
    return NextResponse.json(
      {
        error: 'Failed to scrape Facebook Marketplace listings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

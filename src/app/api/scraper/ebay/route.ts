import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { estimateValue, detectCategory, generatePurchaseMessage } from '@/lib/value-estimator';
import { getAuthUserId } from '@/lib/auth-middleware';
import { calculateVerifiedMarketValue, calculateTrueDiscount } from '@/lib/market-value-calculator';

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

async function saveListingFromEbayItem(item: EbayItemSummary, userId: string) {
  const price = parseFloat(item.price?.value || '0');
  const description = item.shortDescription || item.description || '';
  const category =
    item.categories?.[0]?.categoryName || detectCategory(item.title, description) /* istanbul ignore next */ || 'electronics';

  const estimation = estimateValue(
    item.title,
    description,
    price,
    item.condition || null,
    category
  );

  // Calculate verified market value from sold data
  const marketValue = await calculateVerifiedMarketValue(item.title, 'EBAY');
  const verifiedMarketValue = marketValue?.verifiedMarketValue || null;
  const marketDataSource = marketValue?.marketDataSource || null;
  const trueDiscountPercent = marketValue
    ? calculateTrueDiscount(marketValue.verifiedMarketValue, price)
    : null;

  const sellerNote = buildSellerNote(item);
  const auctionNote = item.buyingOptions?.includes('AUCTION')
    ? 'Auction also available for this item.'
    : null;
  const combinedNotes = [estimation.notes, sellerNote, auctionNote]
    .filter(Boolean)
    .join('\n')
    .trim();

  const sellerName = item.seller?.username || null;
  const requestToBuy = generatePurchaseMessage(
    item.title,
    price,
    estimation.negotiable,
    sellerName || undefined
  );

  const imageUrls = [
    item.image?.imageUrl,
    ...(item.additionalImages?.map((img) => img.imageUrl) ?? []),
  ].filter(Boolean);

  const serializedImages = imageUrls.length ? JSON.stringify(imageUrls) : null;
  const tags = JSON.stringify(estimation.tags);
  let status: 'OPPORTUNITY' | 'NEW';
  if (estimation.valueScore >= 70) {
    status = 'OPPORTUNITY';
  } else {
    status = 'NEW';
  }

  const savedListing = await prisma.listing.upsert({
    where: {
      platform_externalId_userId: { platform: 'EBAY', externalId: item.itemId, userId },
    },
    create: {
      userId,
      externalId: item.itemId,
      platform: 'EBAY',
      url: item.itemWebUrl,
      title: item.title,
      description,
      askingPrice: price,
      condition: item.condition || null,
      location: formatLocation(item),
      sellerName,
      sellerContact: null,
      imageUrls: serializedImages,
      category,
      postedAt: item.itemCreationDate ? new Date(item.itemCreationDate) : null,
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
      notes: combinedNotes,
      shippable: estimation.shippable,
      negotiable: estimation.negotiable,
      tags,
      requestToBuy,
      status,
      verifiedMarketValue,
      marketDataSource,
      trueDiscountPercent,
    },
    update: {
      title: item.title,
      description,
      askingPrice: price,
      condition: item.condition || null,
      location: formatLocation(item),
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
      notes: combinedNotes,
      shippable: estimation.shippable,
      negotiable: estimation.negotiable,
      tags,
      requestToBuy,
      verifiedMarketValue,
      marketDataSource,
      trueDiscountPercent,
    },
  });

  return savedListing;
}

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
  // Auth check first — before any configuration checks
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.EBAY_OAUTH_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'EBAY_OAUTH_TOKEN is not configured' }, { status: 500 });
  }

  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body: ScrapeRequestBody = await request.json();
    if (!body.keywords || body.keywords.trim().length === 0) {
      return NextResponse.json({ error: 'keywords is required' }, { status: 400 });
    }

    const sanitizedLimit = Math.min(body.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const searchParams: ScrapeRequestBody = {
      ...body,
      keywords: body.keywords.trim(),
      limit: sanitizedLimit,
    };

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

      const savedListings = [];
      for (const item of activeListings) {
        if (!item.itemId || !item.itemWebUrl || !item.title) continue;
        const listing = await saveListingFromEbayItem(item, userId);
        savedListings.push(listing);
      }

      const priceHistorySaved = await storePriceHistoryRecords(
        soldListings,
        searchParams.keywords!
      );

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
        platform: 'EBAY',
        listingsSaved: savedListings.length,
        priceHistorySaved,
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
    return NextResponse.json({ error: 'Failed to scrape eBay listings' }, { status: 500 });
  }
}

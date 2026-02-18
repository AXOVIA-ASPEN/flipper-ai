import { Request, Response } from 'firebase-functions';
import { PrismaClient } from '@prisma/client';
import { handleCORS, validateMethod, validateBody } from '../lib/cors';

const prisma = new PrismaClient();

const EBAY_API_BASE_URL = process.env.EBAY_BROWSE_API_BASE_URL || 'https://api.ebay.com/buy/browse/v1';
const EBAY_MARKETPLACE_ID = process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

interface ScrapeRequest {
  userId: string;
  keywords?: string;
  categoryId?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

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

function buildFilterString(params: ScrapeRequest) {
  const filters: string[] = ['buyingOptions:{FIXED_PRICE}'];
  
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
  
  if (!token) {
    throw new Error('Missing EBAY_OAUTH_TOKEN environment variable');
  }

  const url = new URL(`${EBAY_API_BASE_URL}${path}`);
  Object.entries(searchParams).forEach(([key, value]) => {
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

async function scrapeEbay(params: ScrapeRequest) {
  const response = await callEbayApi('/item_summary/search', {
    q: params.keywords || '',
    sort: '-price',
    limit: String(Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT)),
    fieldgroups: 'EXTENDED',
    category_ids: params.categoryId || '',
    filter: buildFilterString(params),
  });
  
  return response.itemSummaries ?? [];
}

function formatLocation(item: EbayItemSummary): string | null {
  if (!item.itemLocation) return null;
  const parts = [
    item.itemLocation.city,
    item.itemLocation.stateOrProvince,
    item.itemLocation.country,
  ].filter(Boolean);
  return parts.join(', ') || null;
}

export async function handler(req: Request, res: Response) {
  try {
    // Handle CORS
    if (handleCORS(req, res)) return;

    // Validate method
    if (!validateMethod(req, res, ['POST'])) return;

    // Validate body
    const body = validateBody<ScrapeRequest>(req, res, ['userId']);
    if (!body) return;

    const { userId, keywords, categoryId, condition, minPrice, maxPrice, limit } = body;

    // Validate eBay token
    if (!process.env.EBAY_OAUTH_TOKEN) {
      res.status(500).json({
        success: false,
        error: 'eBay API not configured',
      });
      return;
    }

    // Create scraper job
    const job = await prisma.scraperJob.create({
      data: {
        userId,
        platform: 'EBAY',
        category: categoryId || 'all',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    console.log(`Job ${job.id} started for user ${userId}`);

    try {
      // Run scraper
      const items = await scrapeEbay({
        userId,
        keywords,
        categoryId,
        condition,
        minPrice,
        maxPrice,
        limit,
      });

      // Update job
      await prisma.scraperJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          listingsFound: items.length,
          completedAt: new Date(),
        },
      });

      // Format response
      const listings = items.map(item => ({
        externalId: item.itemId,
        title: item.title,
        description: item.shortDescription || item.description,
        price: parseFloat(item.price?.value || '0'),
        url: item.itemWebUrl,
        condition: item.condition,
        imageUrl: item.image?.imageUrl,
        additionalImages: item.additionalImages?.map(img => img.imageUrl) || [],
        location: formatLocation(item),
        seller: item.seller?.username,
        sellerFeedback: item.seller?.feedbackPercentage,
        sellerScore: item.seller?.feedbackScore,
        category: item.categories?.[0]?.categoryName,
        buyingOptions: item.buyingOptions,
        createdAt: item.itemCreationDate,
        endsAt: item.itemEndDate,
      }));

      res.json({
        success: true,
        message: `Scraped ${listings.length} listings from eBay`,
        jobId: job.id,
        listings,
      });
    } catch (scrapeError) {
      // Update job as failed
      await prisma.scraperJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: scrapeError instanceof Error ? scrapeError.message : 'Unknown error',
          completedAt: new Date(),
        },
      });
      throw scrapeError;
    }
  } catch (error) {
    console.error('eBay scraper error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    await prisma.$disconnect();
  }
}

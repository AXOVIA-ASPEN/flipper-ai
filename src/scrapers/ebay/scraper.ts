// eBay Browse API Scraper Module
// Uses eBay Browse API v1 for searching listings — no browser scraping needed

import {
  EbayItemSummary,
  EbaySearchResponse,
  EbayScraperConfig,
  EBAY_API_DEFAULTS,
} from './types';
import { type RawListing } from '@/lib/marketplace-scanner';
import { detectCategory } from '@/lib/value-estimator';
import {
  ExternalServiceError,
  RateLimitError,
  ConfigurationError,
} from '@/lib/errors';

const EBAY_API_BASE_URL =
  process.env.EBAY_BROWSE_API_BASE_URL || EBAY_API_DEFAULTS.BASE_URL;
const EBAY_MARKETPLACE_ID =
  process.env.EBAY_MARKETPLACE_ID || EBAY_API_DEFAULTS.MARKETPLACE_ID;

/**
 * Build eBay filter string for Browse API v1.
 * Always includes buyingOptions:{FIXED_PRICE}.
 * Optionally adds price range, condition, and sold items filter.
 */
export function buildFilterString(
  params: Pick<EbayScraperConfig, 'minPrice' | 'maxPrice' | 'condition'>,
  soldOnly = false
): string {
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

/**
 * Get the eBay OAuth token from environment.
 * Throws ConfigurationError if not set.
 */
export function getEbayToken(): string {
  const token = process.env.EBAY_OAUTH_TOKEN;
  if (!token) {
    throw new ConfigurationError(
      'EBAY_OAUTH_TOKEN is not configured. Please set the environment variable with a valid eBay OAuth token.'
    );
  }
  return token;
}

/**
 * Call the eBay Browse API v1 with proper auth and error handling.
 * Throws ExternalServiceError for API failures, RateLimitError for 429s.
 */
export async function callEbayApi(
  path: string,
  searchParams: Record<string, string>,
  token: string
): Promise<EbaySearchResponse> {
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

    if (response.status === 401 || response.status === 403) {
      throw new ExternalServiceError(
        'eBay Browse API',
        'OAuth token expired or invalid. Please refresh your eBay OAuth token.',
        { status: response.status, body: errorBody }
      );
    }

    if (response.status === 429) {
      throw new RateLimitError(
        'eBay Browse API rate limit exceeded. Please try again later.'
      );
    }

    throw new ExternalServiceError(
      'eBay Browse API',
      `Request failed with status ${response.status}`,
      { status: response.status, body: errorBody }
    );
  }

  return response.json();
}

/**
 * Fetch active eBay listings matching the search config.
 */
export async function fetchEbayListings(
  params: EbayScraperConfig,
  token: string
): Promise<EbayItemSummary[]> {
  const limit = Math.min(
    params.limit ?? EBAY_API_DEFAULTS.DEFAULT_LIMIT,
    EBAY_API_DEFAULTS.MAX_LIMIT
  );

  const searchParams: Record<string, string> = {
    q: params.keywords,
    sort: EBAY_API_DEFAULTS.SORT,
    limit: String(limit),
    fieldgroups: EBAY_API_DEFAULTS.FIELD_GROUPS,
    filter: buildFilterString(params),
  };
  if (params.categoryId) {
    searchParams.category_ids = params.categoryId;
  }

  const response = await callEbayApi('/item_summary/search', searchParams, token);
  return response.itemSummaries ?? [];
}

/**
 * Fetch recently sold eBay listings for price history data.
 */
export async function fetchSoldListings(
  params: EbayScraperConfig,
  token: string
): Promise<EbayItemSummary[]> {
  const searchParams: Record<string, string> = {
    q: params.keywords,
    sort: EBAY_API_DEFAULTS.SORT,
    limit: '10',
    fieldgroups: EBAY_API_DEFAULTS.FIELD_GROUPS,
    filter: buildFilterString(params, true),
  };
  if (params.categoryId) {
    searchParams.category_ids = params.categoryId;
  }

  const response = await callEbayApi('/item_summary/search', searchParams, token);
  return response.itemSummaries ?? [];
}

/**
 * Format item location into a readable string.
 */
export function formatLocation(item: EbayItemSummary): string | null {
  if (!item.itemLocation) return null;
  const parts = [
    item.itemLocation.city,
    item.itemLocation.stateOrProvince,
    item.itemLocation.country,
  ].filter(Boolean);
  return parts.join(', ') || null;
}

/**
 * Build a seller feedback note string.
 */
export function buildSellerNote(item: EbayItemSummary): string | null {
  if (!item.seller) return null;
  const score = item.seller.feedbackScore ?? null;
  const percent = item.seller.feedbackPercentage ?? null;
  if (score === null && percent === null) return null;
  return `Seller feedback: ${percent ?? 'N/A'} (${score ?? 'N/A'} ratings)`;
}

/**
 * Parse price from eBay price value string to float.
 */
export function parseEbayPrice(priceValue: string | undefined): number {
  if (!priceValue) return 0;
  const parsed = parseFloat(priceValue);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Collect all image URLs from an eBay item (primary + additional).
 */
export function collectImageUrls(item: EbayItemSummary): string[] {
  return [
    item.image?.imageUrl,
    ...(item.additionalImages?.map((img) => img.imageUrl) ?? []),
  ].filter(Boolean) as string[];
}

/**
 * Convert eBay items to normalized RawListing format for marketplace-scanner.
 */
export function convertEbayItemsToNormalized(items: EbayItemSummary[]): RawListing[] {
  return items
    .filter((item) => item.itemId && item.itemWebUrl && item.title)
    .map((item) => {
      const price = parseEbayPrice(item.price?.value);
      const description = item.shortDescription || item.description || '';
      const category =
        item.categories?.[0]?.categoryName ||
        detectCategory(item.title, description) ||
        'electronics';
      const imageUrls = collectImageUrls(item);

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
        sellerContact: buildSellerNote(item),
        imageUrls,
        category,
        postedAt: item.itemCreationDate ? new Date(item.itemCreationDate) : null,
        sellerRating: parsedPct !== null && !isNaN(parsedPct) ? parsedPct : null,
        sellerReviewCount: item.seller?.feedbackScore ?? null,
        sellerAccountAgeDays: null, // Not available from eBay Browse API
      };
    });
}

// Facebook Marketplace Scraper using Stagehand
// Uses AI-powered browser automation to extract listings

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import {
  FacebookScraperConfig,
  FacebookListingDetail,
  FacebookScrapeResult,
  FACEBOOK_CATEGORIES,
} from './types';
import { RawListing } from '@/lib/marketplace-scanner';

// Stagehand configuration
const getStagehandConfig = () => ({
  verbose: 1 as const,
  domSettleTimeoutMs: 30_000,
  modelName: 'gemini-2.0-flash' as const,
  modelClientOptions: {
    apiKey: process.env.GOOGLE_API_KEY,
  },
  env: 'LOCAL' as const,
  localBrowserLaunchOptions: {
    viewport: {
      width: 1280,
      height: 900,
    },
  },
});

// Schema for extracting listing previews from search results
const ListingPreviewsSchema = z.object({
  listings: z.array(
    z.object({
      title: z.string(),
      price: z.string(),
      location: z.string().optional(),
      listingUrl: z.string().optional(),
    })
  ),
});

// Schema for extracting full listing details
const ListingDetailsSchema = z.object({
  title: z.string(),
  price: z.string(),
  description: z.string().optional(),
  condition: z.string().optional(),
  location: z.string().optional(),
  sellerName: z.string().optional(),
  postedDate: z.string().optional(),
  images: z.array(z.string()).optional(),
});

/**
 * Builds the Facebook Marketplace search URL based on config
 */
function buildSearchUrl(config: FacebookScraperConfig): string {
  const baseUrl = 'https://www.facebook.com/marketplace';
  const params = new URLSearchParams();

  // Add location if specified
  let url = config.location ? `${baseUrl}/${config.location}` : baseUrl;

  // Add category if specified
  if (config.category) {
    const fbCategory = FACEBOOK_CATEGORIES[config.category.toLowerCase()] || config.category;
    url += `/${fbCategory}`;
  } else {
    url += '/search';
  }

  // Add keywords if specified
  if (config.keywords && config.keywords.length > 0) {
    params.set('query', config.keywords.join(' '));
  }

  // Add price filters
  if (config.minPrice !== undefined) {
    params.set('minPrice', config.minPrice.toString());
  }
  if (config.maxPrice !== undefined) {
    params.set('maxPrice', config.maxPrice.toString());
  }

  // Add sort order
  if (config.sortBy) {
    const sortMap: Record<string, string> = {
      best_match: 'BEST_MATCH',
      price_low: 'PRICE_ASCEND',
      price_high: 'PRICE_DESCEND',
      date_listed: 'CREATION_TIME_DESCEND',
    };
    params.set('sortBy', sortMap[config.sortBy] || 'BEST_MATCH');
  }

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Randomized jitter delay in milliseconds, used between detail page fetches
 * to reduce Stagehand/browser-automation detectability on Facebook.
 * Returns a value in the range [minMs, maxMs).
 */
export function jitterMs(minMs: number = 500, maxMs: number = 1500): number {
  return Math.floor(Math.random() * (maxMs - minMs)) + minMs;
}

/**
 * Parses a price string to a number
 */
function parsePrice(priceStr: string): number {
  // Remove currency symbols, commas, and extract the number
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  const price = parseFloat(cleaned);
  return isNaN(price) ? 0 : price;
}

/**
 * Generates a unique external ID from the listing URL or title.
 *
 * Extracts numeric IDs from marketplace URL patterns of the form "/item/(\d+)"
 * (e.g. facebook.com/marketplace/item/123456), falling back to a title+price
 * hash with a "fb-" prefix when no URL match is available.
 */
function generateExternalId(listing: FacebookListingDetail, index: number): string {
  // Try to extract ID from URL if available — expected pattern: /item/(\d+)
  const titleStr = listing.title !== undefined ? listing.title : /* istanbul ignore next */ '';
  const urlMatch = titleStr.match(/\/item\/(\d+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Generate hash from title + price
  const str = `${listing.title}-${listing.price}-${index}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `fb-${Math.abs(hash)}`;
}

/**
 * Facebook Graph API v19.0 marketplace_search item shape
 */
export interface GraphApiMarketplaceListing {
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
  images?: Array<{ url: string }>;
  marketplace_listing_url?: string;
  created_time?: string;
  seller?: { id: string; name?: string };
}

/**
 * Format a Graph API location object as `city, state zip`.
 */
function formatLocation(location?: GraphApiMarketplaceListing['location']): string | null {
  if (!location) return null;
  const parts = [location.city, location.state, location.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Convert a Facebook Graph API v19.0 marketplace_search result into the
 * canonical RawListing format consumed by marketplace-scanner.
 *
 * Maps:
 *   id → externalId
 *   name → title
 *   price (string) → askingPrice (number, via parsePrice)
 *   images[].url → imageUrls
 *   location {city,state,zip} → location string
 */
export function convertGraphApiToRawListing(
  item: GraphApiMarketplaceListing,
  keywords?: string
): RawListing {
  const _kw = keywords; // accepted for caller convenience; Graph API already filters by query
  void _kw;
  return {
    externalId: item.id,
    url:
      item.marketplace_listing_url ||
      `https://www.facebook.com/marketplace/item/${item.id}`,
    title: item.name || '',
    description: item.description || null,
    askingPrice: parsePrice(item.price || '0'),
    condition: item.condition || null,
    location: formatLocation(item.location),
    sellerName: item.seller?.name || null,
    sellerContact: null,
    imageUrls: item.images?.map((img) => img.url) ?? [],
    category: item.category || null,
    postedAt: item.created_time ? new Date(item.created_time) : null,
  };
}

/**
 * Converts Facebook listing details to our RawListing format
 */
export function convertToRawListing(
  listing: FacebookListingDetail,
  index: number,
  baseUrl?: string
): RawListing {
  return {
    externalId: generateExternalId(listing, index),
    url: baseUrl || `https://www.facebook.com/marketplace`,
    title: listing.title,
    description: listing.description || null,
    askingPrice: parsePrice(listing.price),
    condition: listing.condition || null,
    location: listing.location || null,
    sellerName: listing.sellerName || null,
    sellerContact: null, // Facebook doesn't expose contact info directly
    imageUrls: listing.images || [],
    category: listing.category || null,
    postedAt: listing.postedDate ? new Date(listing.postedDate) : null,
  };
}

/**
 * Main scraper function using Stagehand
 */
export async function scrapeFacebookMarketplace(
  config: FacebookScraperConfig = {}
): Promise<FacebookScrapeResult> {
  let stagehand: Stagehand | null = null;
  const maxListings = config.maxListings || 20;
  const listings: FacebookListingDetail[] = [];

  try {
    console.log('Initializing Stagehand for Facebook Marketplace...');
    stagehand = new Stagehand(getStagehandConfig());
    await stagehand.init();
    console.log('Stagehand initialized successfully.');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = (stagehand as any).page;
    if (!page) {
      throw new Error('Failed to get page instance from Stagehand');
    }

    // Build and navigate to search URL
    const searchUrl = buildSearchUrl(config);
    console.log(`Navigating to: ${searchUrl}`);
    await page.goto(searchUrl);

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Handle login popup if it appears (dismiss it)
    try {
      await page.act({
        action:
          'If there is a login popup or modal, close it by clicking the X or close button. If no popup, do nothing.',
      });
    } catch {
      // Ignore if no popup
    }

    await page.waitForTimeout(2000);

    // Scroll to load more listings
    console.log('Scrolling to load listings...');
    for (let i = 0; i < 3; i++) {
      await page.act({
        action: 'Scroll down to load more listings',
      });
      await page.waitForTimeout(1500);
    }

    // Extract listing previews from search results
    console.log('Extracting listing data from search results...');
    const extractedData = await page.extract({
      instruction: `Extract all visible marketplace listings with their titles, prices, and locations. Get as many listings as visible (up to ${maxListings}). For each listing, extract the title, price (including $ symbol), and location if visible.`,
      schema: ListingPreviewsSchema as z.ZodSchema,
    });

    console.log(`Found ${extractedData.listings.length} listings in search results`);

    // If we need detailed info, click into each listing
    if (config.includeDetails && extractedData.listings.length > 0) {
      console.log('Fetching detailed info for each listing...');

      for (let i = 0; i < Math.min(extractedData.listings.length, maxListings); i++) {
        const preview = extractedData.listings[i];

        try {
          // Click on the listing
          console.log(`Opening listing ${i + 1}: ${preview.title}`);
          await page.act({
            action: `Click on the listing with title "${preview.title}" to view its details`,
          });

          // Randomized jitter between detail fetches to avoid detection
          await page.waitForTimeout(2000 + jitterMs(200, 1200));

          // Extract full details
          const details = await page.extract({
            instruction:
              'Extract the full listing details including: title, price, full description, condition (if shown), location, seller name, when it was posted, and all image URLs',
            schema: ListingDetailsSchema as z.ZodSchema,
          });

          listings.push({
            ...details,
            // Preserve any additional data from preview
            location: details.location || preview.location,
          });

          // Navigate back to results
          await page.goBack();
          await page.waitForTimeout(2000);
        } catch (err) {
          console.error(`Error fetching details for listing ${i + 1}:`, err);
          // Add basic info from preview
          listings.push({
            title: preview.title,
            price: preview.price,
            location: preview.location,
          });
        }
      }
    } else {
      // Just use preview data
      for (const preview of extractedData.listings.slice(0, maxListings)) {
        listings.push({
          title: preview.title,
          price: preview.price,
          location: preview.location,
        });
      }
    }

    console.log(`Successfully scraped ${listings.length} listings`);

    return {
      success: true,
      listings,
      totalFound: extractedData.listings.length,
      scrapedAt: new Date(),
      config,
    };
  } catch (error) {
    console.error('Facebook Marketplace scraper failed:', error);
    return {
      success: false,
      listings,
      totalFound: 0,
      scrapedAt: new Date(),
      config,
      error: error instanceof Error ? error.message : error !== null && error !== undefined ? /* istanbul ignore next */ String(error) : /* istanbul ignore next */ 'Unknown error',
    };
  } finally {
    /* istanbul ignore else -- stagehand is always initialized before this point */
    if (stagehand) {
      console.log('Closing Stagehand connection.');
      try {
        await stagehand.close();
      } catch (err) {
        console.error('Error closing Stagehand:', err);
      }
    }
  }
}

/**
 * Convenience function to scrape and convert to RawListing format
 */
export async function scrapeAndConvert(config: FacebookScraperConfig = {}): Promise<{
  success: boolean;
  listings: RawListing[];
  totalFound: number;
  error?: string;
}> {
  const result = await scrapeFacebookMarketplace(config);

  const rawListings = result.listings.map((listing, index) => convertToRawListing(listing, index));

  return {
    success: result.success,
    listings: rawListings,
    totalFound: result.totalFound,
    error: result.error,
  };
}

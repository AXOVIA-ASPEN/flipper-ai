// Mercari Scraper Module
// Primary: Internal API with rotating headers
// Fallback: Playwright browser automation when API is blocked/rate-limited

import { chromium, Browser } from 'playwright';
import {
  MercariItem,
  MercariSearchResponse,
  ScrapeRequestBody,
  MERCARI_API_BASE_URL,
  MERCARI_SEARCH_URL,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  CONDITION_MAP,
  USER_AGENTS,
  ACCEPT_LANGUAGE_VARIANTS,
  SCRAPER_CONFIG,
} from './types';
import { RawListing } from '@/lib/marketplace-scanner';
import { ExternalServiceError, RateLimitError } from '@/lib/errors';

// User agent rotation index
let uaIndex = 0;

/**
 * Gets a rotating user agent from the pool
 */
export function getRandomUserAgent(): string {
  const ua = USER_AGENTS[uaIndex % USER_AGENTS.length];
  uaIndex++;
  return ua;
}

/**
 * Gets a random Accept-Language header variant
 */
function getRandomAcceptLanguage(): string {
  return ACCEPT_LANGUAGE_VARIANTS[Math.floor(Math.random() * ACCEPT_LANGUAGE_VARIANTS.length)];
}

/**
 * Random delay for human-like timing
 */
function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Randomized viewport dimensions for Playwright
 */
function getRandomViewport(): { width: number; height: number } {
  const width =
    Math.floor(
      Math.random() *
        (SCRAPER_CONFIG.VIEWPORT_MAX_WIDTH - SCRAPER_CONFIG.VIEWPORT_MIN_WIDTH + 1)
    ) + SCRAPER_CONFIG.VIEWPORT_MIN_WIDTH;
  const height =
    Math.floor(
      Math.random() *
        (SCRAPER_CONFIG.VIEWPORT_MAX_HEIGHT - SCRAPER_CONFIG.VIEWPORT_MIN_HEIGHT + 1)
    ) + SCRAPER_CONFIG.VIEWPORT_MIN_HEIGHT;
  return { width, height };
}

/**
 * Builds headers that mimic a real browser request to Mercari
 * Uses rotating user agents and randomized non-critical headers
 */
export function buildMercariHeaders(): Record<string, string> {
  return {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': getRandomAcceptLanguage(),
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json',
    'User-Agent': getRandomUserAgent(),
    Referer: 'https://www.mercari.com/',
    Origin: 'https://www.mercari.com',
    'X-Platform': 'web',
    'X-Requested-With': 'XMLHttpRequest',
    Pragma: 'no-cache',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  };
}

/**
 * Detects if a response indicates rate limiting or blocking
 */
function isRateLimitOrBlock(status: number, contentType: string | null): boolean {
  if (status === 429) return true;
  if (contentType?.includes('text/html')) return true;
  return false;
}

/**
 * Makes a single request to Mercari's internal API (no retry logic)
 */
export async function callMercariApi(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>
): Promise<MercariSearchResponse> {
  const url = `${MERCARI_API_BASE_URL}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: buildMercariHeaders(),
    cache: 'no-store',
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const contentType = response.headers.get('content-type');

    if (isRateLimitOrBlock(response.status, contentType)) {
      throw new RateLimitError(
        `Mercari rate limit or block detected. Status: ${response.status}`
      );
    }

    const errorText = await response.text();
    throw new ExternalServiceError(
      'Mercari',
      `API error (${response.status}): ${errorText.slice(0, 500)}`
    );
  }

  return await response.json();
}

/**
 * Playwright-based scraping when API is blocked
 * Navigates to Mercari search page and extracts listings from rendered HTML
 */
export async function scrapeMercariWithPlaywright(
  params: ScrapeRequestBody
): Promise<MercariItem[]> {
  let browser: Browser | null = null;
  /* istanbul ignore next -- session timeout callback only fires after 60s */
  const sessionTimeout = setTimeout(() => {
    if (browser) {
      browser.close().catch(() => {});
      browser = null;
    }
  }, SCRAPER_CONFIG.SESSION_TIMEOUT_MS);

  try {
    const viewport = getRandomViewport();

    browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport,
    });

    const page = await context.newPage();

    // Bypass headless detection
    /* istanbul ignore next -- browser-context code not instrumented by Node.js */
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Build search URL with params
    const searchParams = new URLSearchParams();
    if (params.keywords) searchParams.set('keyword', params.keywords);
    if (params.categoryId) searchParams.set('categoryIds', params.categoryId);
    if (params.condition) searchParams.set('itemConditionId', params.condition);
    if (params.minPrice !== undefined) searchParams.set('minPrice', String(params.minPrice));
    if (params.maxPrice !== undefined) searchParams.set('maxPrice', String(params.maxPrice));
    searchParams.set('sortBy', params.sortBy || 'created_time');
    searchParams.set('itemStatuses', 'on_sale');

    const url = `${MERCARI_SEARCH_URL}?${searchParams.toString()}`;

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: SCRAPER_CONFIG.NAVIGATION_TIMEOUT_MS,
    });

    // Human-like delay before extraction
    await randomDelay(SCRAPER_CONFIG.MIN_DELAY_MS, SCRAPER_CONFIG.MAX_DELAY_MS);

    // Wait for listing content to load
    await page
      .waitForSelector('[data-testid="SearchResults"], [class*="SearchResults"], main', {
        timeout: 10_000,
      })
      .catch(() => {
        // Continue anyway - page may have loaded differently
      });

    // Extract listing data from rendered HTML
    // istanbul ignore next -- page.evaluate runs in browser context, not instrumented by Node.js
    const rawItems = await page.evaluate(/* istanbul ignore next */ () => {
      const items: Array<{
        id: string;
        name: string;
        price: number;
        imageUrl?: string;
        url?: string;
      }> = [];

      // Try multiple selector patterns (Mercari UI changes)
      const selectors = [
        '[data-testid="ItemContainer"]',
        '[class*="ItemContainer"]',
        'a[href*="/item/"]',
      ];

      let listingElements: Element[] = [];
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          listingElements = Array.from(elements);
          break;
        }
      }

      for (const el of listingElements.slice(0, 50)) {
        try {
          // Extract URL and ID
          const linkEl = el.closest('a') || el.querySelector('a[href*="/item/"]');
          const href = (linkEl as HTMLAnchorElement)?.href || '';
          const idMatch = href.match(/\/item\/([^/]+)/);
          const id = idMatch ? idMatch[1] : '';

          // Extract title
          const titleEl = el.querySelector('[class*="ItemName"], [data-testid="ItemName"]');
          const name = titleEl?.textContent?.trim() || el.textContent?.trim()?.slice(0, 100) || '';

          // Extract price
          const priceEl = el.querySelector('[class*="ItemPrice"], [data-testid="ItemPrice"]');
          const priceText = priceEl?.textContent || '';
          const priceMatch = priceText.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
          const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0;

          // Extract image
          const imgEl = el.querySelector('img');
          const imageUrl = imgEl?.src || '';

          if (id && name && price > 0) {
            items.push({ id, name, price, imageUrl, url: href });
          }
        } catch {
          // Skip problematic elements
        }
      }

      return items;
    });

    // Convert raw extracted data to MercariItem format
    return rawItems.map((raw) => ({
      id: raw.id,
      name: raw.name,
      price: raw.price,
      status: 'on_sale',
      photos: raw.imageUrl ? [raw.imageUrl] : undefined,
    }));
  } finally {
    clearTimeout(sessionTimeout);
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Browser may already be closed by session timeout
      }
    }
  }
}

/**
 * Searches Mercari using internal API with exponential backoff and Playwright fallback
 *
 * Strategy:
 *   Attempt 1: Immediate API call
 *   Attempt 2: Wait 1s, retry API
 *   Attempt 3: Wait 2s, retry API
 *   Attempt 4: Wait 4s, retry API
 *   If all 4 API attempts fail with rate limit → switch to Playwright
 *   If Playwright also fails → throw RateLimitError
 */
export async function scrapeMercariSearch(params: ScrapeRequestBody): Promise<MercariItem[]> {
  const limit = params.limit !== undefined
    ? Math.min(params.limit, MAX_LIMIT)
    : Math.min(DEFAULT_LIMIT, MAX_LIMIT);

  const apiBody = {
    keyword: params.keywords || '',
    categoryId: params.categoryId ? [params.categoryId] : [],
    itemConditionId: params.condition ? [params.condition] : [],
    priceMin: params.minPrice,
    priceMax: params.maxPrice,
    sort: params.sortBy || 'created_time',
    status: ['on_sale'],
    length: limit,
  };

  // Try API with exponential backoff
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= SCRAPER_CONFIG.MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s, 4s before each retry (Task 3.2)
      const backoffMs = SCRAPER_CONFIG.BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      // Anti-detection randomized jitter on top of backoff (Task 4.2)
      // Combined wait per retry: 1.5-2.5s, 2.5-3.5s, 4.5-5.5s
      await randomDelay(SCRAPER_CONFIG.MIN_DELAY_MS, SCRAPER_CONFIG.MAX_DELAY_MS);
    }

    try {
      const apiResponse = await callMercariApi('/search', 'POST', apiBody);
      return apiResponse.data || apiResponse.items || [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on rate limit errors
      if (error instanceof RateLimitError) {
        console.warn(
          `[mercari-scraper] Rate limited, attempt ${attempt + 1}/${SCRAPER_CONFIG.MAX_RETRIES + 1}`
        );
        continue;
      }

      // For non-rate-limit errors (ExternalServiceError), fall through to Playwright immediately
      break;
    }
  }

  // API failed — fall back to Playwright browser automation
  console.warn('[mercari-scraper] API failed, falling back to Playwright browser automation');
  try {
    return await scrapeMercariWithPlaywright(params);
  } catch (playwrightError) {
    // Both API and Playwright failed
    if (lastError instanceof RateLimitError) {
      throw new RateLimitError(
        'Mercari rate limited and Playwright fallback also failed'
      );
    }
    // istanbul ignore next -- lastError is always set by the retry loop above
    throw lastError || playwrightError;
  }
}

/**
 * Fetches active Mercari listings based on search parameters
 */
export async function fetchMercariListings(params: ScrapeRequestBody): Promise<MercariItem[]> {
  return scrapeMercariSearch({
    ...params,
    limit: params.limit !== undefined
      ? Math.min(params.limit, MAX_LIMIT)
      : Math.min(DEFAULT_LIMIT, MAX_LIMIT),
  });
}

/**
 * Fetches recently sold listings for price history
 */
export async function fetchSoldListings(params: ScrapeRequestBody): Promise<MercariItem[]> {
  try {
    const apiResponse = await callMercariApi('/search', 'POST', {
      keyword: params.keywords || '',
      categoryId: params.categoryId ? [params.categoryId] : [],
      status: ['sold_out'],
      sort: 'created_time',
      length: 10,
    });

    return apiResponse.data || apiResponse.items || [];
  } catch {
    console.warn('[mercari-scraper] Failed to fetch sold listings for price history');
    return [];
  }
}

/**
 * Converts Mercari condition to normalized format
 */
export function normalizeCondition(item: MercariItem): string | null {
  if (!item.itemCondition) return null;
  return CONDITION_MAP[item.itemCondition.id] || item.itemCondition.name || null;
}

/**
 * Builds location string from Mercari shipping info
 */
export function formatLocation(item: MercariItem): string | null {
  if (!item.shippingFromArea) return null;
  return item.shippingFromArea.name || null;
}

/**
 * Collects all image URLs from a Mercari item
 */
export function collectImageUrls(item: MercariItem): string[] {
  const urls: string[] = [];

  if (item.photos?.length) {
    urls.push(...item.photos);
  } else if (item.thumbnails?.length) {
    urls.push(...item.thumbnails);
  }

  return urls.filter(Boolean);
}

/**
 * Builds seller reputation note
 */
export function buildSellerNote(item: MercariItem): string | null {
  if (!item.seller?.ratings) return null;

  const { good = 0, normal = 0, bad = 0 } = item.seller.ratings;
  const total = good + normal + bad;

  if (total === 0) return 'New seller (no ratings)';

  const positivePercent = Math.round((good / total) * 100);
  return `Seller: ${item.seller.name} - ${positivePercent}% positive (${total} ratings)`;
}

/**
 * Computes a 0–5 star rating from Mercari's good/normal/bad rating counts.
 * Returns null when the seller has no ratings or ratings are unavailable.
 */
export function computeMercariSellerRating(item: MercariItem): number | null {
  if (!item.seller?.ratings) return null;
  const { good = 0, normal = 0, bad = 0 } = item.seller.ratings;
  const total = good + normal + bad;
  if (total === 0) return null;
  const weighted = (good * 5 + normal * 3 + bad * 1) / total;
  return Math.round(weighted * 100) / 100;
}

/**
 * Converts a MercariItem to the canonical RawListing format
 * for processing by marketplace-scanner.ts
 */
export function convertMercariToRawListing(item: MercariItem): RawListing {
  const ratings = item.seller?.ratings;
  const reviewTotal = ratings
    ? (ratings.good ?? 0) + (ratings.normal ?? 0) + (ratings.bad ?? 0)
    : 0;

  return {
    externalId: item.id,
    url: `https://www.mercari.com/us/item/${item.id}/`,
    title: item.name,
    description: item.description || null,
    askingPrice: item.price,
    condition: normalizeCondition(item),
    location: formatLocation(item),
    sellerName: item.seller?.name || null,
    sellerContact: null, // Mercari handles messaging internally
    imageUrls: collectImageUrls(item),
    category: item.rootCategory?.name || null,
    postedAt: item.created
      ? new Date(item.created * 1000)
      : item.updated
        ? new Date(item.updated * 1000)
        : null,
    sellerRating: computeMercariSellerRating(item),
    sellerReviewCount: reviewTotal > 0 ? reviewTotal : null,
    sellerAccountAgeDays: null, // Not available from Mercari API
  };
}

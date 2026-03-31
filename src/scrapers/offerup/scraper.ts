// OfferUp Scraper Module
// Extracts listings from OfferUp search results using Playwright

import { chromium, Browser } from 'playwright';
import {
  OfferUpItem,
  OfferUpSearchParams,
  OfferUpScrapeResult,
  CATEGORY_MAPPING,
  USER_AGENTS,
  SCRAPER_CONFIG,
} from './types';
import { RawListing } from '@/lib/marketplace-scanner';
import { sleep } from '@/lib/sleep';
import prisma from '@/lib/db';

// Parse price from OfferUp format (e.g., "$1,234", "Free", "$0")
export function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr.trim() === '') return 0;

  const lower = priceStr.toLowerCase().trim();
  if (lower === 'free') return 0;
  if (lower === 'negotiable') return 0;

  const match = priceStr.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return 0;
}

// Extract listing ID from OfferUp URL
export function extractListingId(url: string): string {
  // OfferUp URLs: https://offerup.com/item/detail/1234567890
  const match = url.match(/\/item\/detail\/(\d+)/);
  if (match) return match[1];
  // Alternative format: trailing numeric ID
  const altMatch = url.match(/\/(\d+)\/?$/);
  return altMatch ? altMatch[1] : url;
}

// Get a random user agent from the pool
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Random delay for human-like timing (uses sleep so tests can mock it)
async function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await sleep(delay);
}

// Randomized viewport dimensions
export function getRandomViewport(): { width: number; height: number } {
  const width =
    Math.floor(
      Math.random() * (SCRAPER_CONFIG.VIEWPORT_MAX_WIDTH - SCRAPER_CONFIG.VIEWPORT_MIN_WIDTH + 1)
    ) + SCRAPER_CONFIG.VIEWPORT_MIN_WIDTH;
  const height =
    Math.floor(
      Math.random() * (SCRAPER_CONFIG.VIEWPORT_MAX_HEIGHT - SCRAPER_CONFIG.VIEWPORT_MIN_HEIGHT + 1)
    ) + SCRAPER_CONFIG.VIEWPORT_MIN_HEIGHT;
  return { width, height };
}

// Retry wrapper with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = SCRAPER_CONFIG.MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[offerup-scraper] Retry ${i + 1}/${retries} failed:`, lastError.message);
      if (i < retries - 1) {
        await sleep(SCRAPER_CONFIG.BACKOFF_BASE_MS * (i + 1));
      }
    }
  }
  throw lastError;
}

// Check if user has a running scraper job for the same platform
export async function hasRunningJob(userId: string, platform: string): Promise<boolean> {
  const runningJob = await prisma.scraperJob.findFirst({
    where: {
      userId,
      platform,
      status: 'RUNNING',
    },
  });
  return !!runningJob;
}

// Build OfferUp search URL
function buildSearchUrl(params: OfferUpSearchParams): string {
  const { location, category, keywords, minPrice, maxPrice } = params;
  const categorySlug = category ? CATEGORY_MAPPING[category] || 'all' : 'all';

  let searchUrl = `https://offerup.com/search/${location}`;
  const searchParams = new URLSearchParams();

  if (keywords) searchParams.set('q', keywords);
  if (minPrice) searchParams.set('price_min', minPrice.toString());
  if (maxPrice) searchParams.set('price_max', maxPrice.toString());
  if (categorySlug !== 'all') searchParams.set('catid', categorySlug);

  const queryString = searchParams.toString();
  if (queryString) {
    searchUrl += `?${queryString}`;
  }

  return searchUrl;
}

// Main scrape function — launches browser, extracts listings, returns structured result
export async function scrapeOfferUp(
  params: OfferUpSearchParams
): Promise<OfferUpScrapeResult> {
  let browser: Browser | null = null;
  let timeoutId: ReturnType<typeof setTimeout>;

  // Session timeout wrapper (60s hard limit)
  const sessionTimeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Session timeout: exceeded 60s limit')),
      SCRAPER_CONFIG.SESSION_TIMEOUT_MS
    );
  });

  try {
    const result = await Promise.race([
      scrapeWithBrowser(params, (b) => {
        browser = b;
      }),
      sessionTimeout,
    ]);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = message.includes('timeout') || message.includes('Timeout');
    const isBlocked = message.includes('blocked') || message.includes('captcha');

    return {
      success: false,
      listings: [],
      totalFound: 0,
      scrapedAt: new Date(),
      error: message,
      failureReason: isTimeout ? 'timeout' : isBlocked ? 'blocked' : 'unknown',
    };
  } finally {
    clearTimeout(timeoutId!);
    if (browser) {
      try {
        await (browser as Browser).close();
      } catch {
        // Browser may already be closed
      }
    }
  }
}

// Internal scraping logic (separated for timeout wrapping)
async function scrapeWithBrowser(
  params: OfferUpSearchParams,
  onBrowserCreated: (b: Browser) => void
): Promise<OfferUpScrapeResult> {
  const viewport = getRandomViewport();

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
    ],
  });
  onBrowserCreated(browser);

  const context = await browser.newContext({
    userAgent: getRandomUserAgent(),
    viewport,
    locale: 'en-US',
  });

  // Block unnecessary resources to speed up scraping
  await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf}', /* istanbul ignore next */ (route) =>
    route.abort()
  );
  await context.route('**/analytics/**', /* istanbul ignore next */ (route) => route.abort());
  await context.route('**/tracking/**', /* istanbul ignore next */ (route) => route.abort());

  const page = await context.newPage();

  // Override navigator.webdriver to avoid headless detection
  await page.addInitScript(/* istanbul ignore next */ () => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const searchUrl = buildSearchUrl(params);
  console.log(`[offerup-scraper] Navigating to: ${searchUrl}`);

  // Navigate with retry
  await withRetry(async () => {
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: SCRAPER_CONFIG.NAVIGATION_TIMEOUT_MS,
    });
  });

  // Human-like delay between page load and extraction
  await randomDelay(SCRAPER_CONFIG.MIN_DELAY_MS, SCRAPER_CONFIG.MAX_DELAY_MS);

  // Wait for listings to load
  await page
    .waitForSelector(
      '[data-testid="listing-card"], [class*="listing-card"], [class*="ItemCard"], a[href*="/item/detail/"]',
      { timeout: SCRAPER_CONFIG.SELECTOR_WAIT_TIMEOUT_MS }
    )
    .catch(() => {
      console.log('[offerup-scraper] No standard listing selector found, trying alternate approach');
    });

  // Check for blocked/captcha
  const pageContent = await page.content();
  if (
    pageContent.includes('captcha') ||
    pageContent.includes('Access Denied') ||
    pageContent.includes('blocked')
  ) {
    throw new Error('Request blocked by OfferUp - rate limited or captcha required');
  }

  // Extract listings using page.evaluate for in-browser DOM extraction
  // istanbul ignore next -- Browser-side DOM code runs in Playwright context, not Node.js
  const rawListings = await page.evaluate(/* istanbul ignore next */ () => {
    const items: Array<{
      title: string;
      price: string;
      url: string;
      location: string;
      imageUrl?: string;
      condition?: string;
    }> = [];

    // Try multiple selector patterns
    const cardSelectors = [
      '[data-testid="listing-card"]',
      '[class*="listing-card"]',
      '[class*="ItemCard"]',
      'a[href*="/item/detail/"]',
    ];

    let listingElements: Element[] = [];
    for (const selector of cardSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        listingElements = Array.from(elements);
        break;
      }
    }

    // If using link-based selection, get parent containers
    if (listingElements.length > 0 && listingElements[0].tagName === 'A') {
      listingElements = listingElements.map(
        (el) => el.closest('article, div[class*="card"], li') || el
      );
    }

    for (const el of listingElements.slice(0, 50)) {
      try {
        const titleEl = el.querySelector(
          'h3, [class*="title"], [data-testid="listing-title"], span[class*="Title"]'
        ) as HTMLElement;
        const title =
          titleEl?.innerText?.trim() || (el as HTMLElement).querySelector('a')?.title || '';

        const linkEl = el.querySelector('a[href*="/item/detail/"]') as HTMLAnchorElement;
        const url = linkEl?.href || '';

        const priceEl = el.querySelector(
          '[class*="price"], [data-testid="listing-price"], span[class*="Price"]'
        ) as HTMLElement;
        const price = priceEl?.innerText?.trim() || '$0';

        const locationEl = el.querySelector(
          '[class*="location"], [data-testid="listing-location"]'
        ) as HTMLElement;
        const location = locationEl?.innerText?.trim() || '';

        const imgEl = el.querySelector('img') as HTMLImageElement;
        const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || '';

        const conditionEl = el.querySelector('[class*="condition"]') as HTMLElement;
        const condition = conditionEl?.innerText?.trim() || '';

        if (title && url && url.includes('/item/detail/')) {
          items.push({ title, price, url, location, imageUrl, condition });
        }
      } catch {
        // Skip problematic listings
      }
    }

    return items;
  });

  console.log(`[offerup-scraper] Found ${rawListings.length} listings`);

  // Convert raw data to OfferUpItem format
  const listings: OfferUpItem[] = rawListings.map((item) => ({
    title: item.title,
    price: parsePrice(item.price),
    url: item.url,
    location: item.location || params.location,
    externalId: extractListingId(item.url),
    imageUrls: item.imageUrl ? [item.imageUrl] : undefined,
    condition: item.condition || undefined,
  }));

  // Rate limiting delay after extraction
  await randomDelay(SCRAPER_CONFIG.RATE_LIMIT_MIN_DELAY_MS, SCRAPER_CONFIG.RATE_LIMIT_MAX_DELAY_MS);

  return {
    success: true,
    listings,
    totalFound: rawListings.length,
    scrapedAt: new Date(),
  };
}

// Convert OfferUpItem to canonical RawListing format
export function toRawListing(item: OfferUpItem, searchLocation: string): RawListing {
  return {
    externalId: item.externalId,
    url: item.url,
    title: item.title,
    description: item.description || null,
    askingPrice: item.price,
    condition: item.condition || null,
    location: item.location || searchLocation || null,
    sellerName: item.sellerName || null,
    sellerContact: null,
    imageUrls: item.imageUrls || [],
    category: null,
    postedAt: item.postedAt || null,
  };
}

// Craigslist Scraper Module
// Extracts listings from Craigslist search results using Playwright

import { chromium, Browser } from 'playwright';
import {
  CraigslistItem,
  CraigslistSearchParams,
  CraigslistScrapeResult,
  CATEGORY_PATHS,
  USER_AGENTS,
  SCRAPER_CONFIG,
} from './types';
import { RawListing } from '@/lib/marketplace-scanner';
import prisma from '@/lib/db';

// Parse price from Craigslist format (e.g., "$1,234", "free", "$0")
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

// Extract listing ID from Craigslist URL
export function extractListingId(url: string): string {
  // Standard format: /category/d/title/1234567890.html
  const htmlMatch = url.match(/\/(\d+)\.html/);
  if (htmlMatch) return htmlMatch[1];

  // Fallback: last numeric segment in URL path
  const pathMatch = url.match(/\/(\d{5,})(?:\/|$)/);
  if (pathMatch) return pathMatch[1];

  return url;
}

// Get a random user agent from the pool
export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Random delay for human-like timing
function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// Randomized viewport dimensions
function getRandomViewport(): { width: number; height: number } {
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

// Parse condition from listing text
function parseCondition(title: string, description?: string): string | undefined {
  const text = `${title} ${description || ''}`.toLowerCase();
  const conditions = [
    { pattern: /\bfor parts\b|\bbroken\b|\bas[- ]is\b|\bdamaged\b/, value: 'salvage' },
    { pattern: /\bnew in box\b|\bnib\b|\bsealed\b|\bbrand new\b/, value: 'new' },
    { pattern: /\brefurbished\b|\brefurb\b/, value: 'refurbished' },
    { pattern: /\blike new\b|\bmint\b|\bexcellent\b/, value: 'like new' },
    { pattern: /\bgood condition\b|\bgood\b|\bgently used\b/, value: 'good' },
    { pattern: /\bfair\b|\bused\b|\bsome wear\b/, value: 'fair' },
  ];

  for (const { pattern, value } of conditions) {
    if (pattern.test(text)) return value;
  }
  return undefined;
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

// Build Craigslist search URL
function buildSearchUrl(params: CraigslistSearchParams): string {
  const { location, category, keywords, minPrice, maxPrice } = params;
  const baseUrl = `https://${location}.craigslist.org`;
  const categoryPath = CATEGORY_PATHS[category] || 'sss';
  const searchParams = new URLSearchParams();

  if (keywords) searchParams.set('query', keywords);
  if (minPrice) searchParams.set('min_price', minPrice.toString());
  if (maxPrice) searchParams.set('max_price', maxPrice.toString());

  return `${baseUrl}/search/${categoryPath}?${searchParams.toString()}`;
}

// Main scrape function — launches browser, extracts listings, returns results
export async function scrapeCraigslist(
  params: CraigslistSearchParams
): Promise<CraigslistScrapeResult> {
  let browser: Browser | null = null;
  let timeoutId: ReturnType<typeof setTimeout>;

  // Session timeout wrapper
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

    return {
      success: false,
      listings: [],
      totalFound: 0,
      scrapedAt: new Date(),
      error: message,
      failureReason: isTimeout ? 'timeout' : 'unknown',
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
  params: CraigslistSearchParams,
  onBrowserCreated: (b: Browser) => void
): Promise<CraigslistScrapeResult> {
  const viewport = getRandomViewport();

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  onBrowserCreated(browser);

  const context = await browser.newContext({
    userAgent: getRandomUserAgent(),
    viewport,
  });

  const page = await context.newPage();

  // Override navigator.webdriver to avoid headless detection
  await page.addInitScript(/* istanbul ignore next */ () => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const searchUrl = buildSearchUrl(params);
  console.log(`[craigslist-scraper] Navigating to: ${searchUrl}`);

  // Navigate with retry on timeout
  let navigationSucceeded = false;
  for (let attempt = 0; attempt <= SCRAPER_CONFIG.MAX_RETRIES; attempt++) {
    try {
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: SCRAPER_CONFIG.NAVIGATION_TIMEOUT_MS,
      });
      navigationSucceeded = true;
      break;
    } catch (navError) {
      const msg = navError instanceof Error ? navError.message : String(navError);
      if (attempt < SCRAPER_CONFIG.MAX_RETRIES && msg.includes('Timeout')) {
        console.log(`[craigslist-scraper] Navigation timeout, retrying (attempt ${attempt + 1})`);
        await randomDelay(SCRAPER_CONFIG.BACKOFF_BASE_MS, SCRAPER_CONFIG.BACKOFF_BASE_MS * 2);
        continue;
      }
      return {
        success: false,
        listings: [],
        totalFound: 0,
        scrapedAt: new Date(),
        error: `Navigation failed: ${msg}`,
        failureReason: 'navigation_error',
      };
    }
  }

  /* istanbul ignore next -- unreachable: all catch paths either return or continue */
  if (!navigationSucceeded) {
    return {
      success: false,
      listings: [],
      totalFound: 0,
      scrapedAt: new Date(),
      error: 'Navigation failed after retries',
      failureReason: 'navigation_error',
    };
  }

  // Rate limit detection with exponential backoff on 403/429
  for (let backoffAttempt = 0; ; backoffAttempt++) {
    const statusCode = await page.evaluate(/* istanbul ignore next */ () => {
      const bodyText = document.body?.innerText || '';
      if (bodyText.includes('blocked') || bodyText.includes('This IP has been')) {
        return 403;
      }
      return 200;
    });

    if (statusCode === 200) break;

    if (backoffAttempt >= SCRAPER_CONFIG.MAX_RETRIES) {
      return {
        success: false,
        listings: [],
        totalFound: 0,
        scrapedAt: new Date(),
        error: 'Rate limited or blocked by Craigslist after backoff retries',
        failureReason: 'navigation_error',
      };
    }

    const backoffMs = Math.min(
      SCRAPER_CONFIG.BACKOFF_BASE_MS * Math.pow(2, backoffAttempt),
      SCRAPER_CONFIG.BACKOFF_MAX_MS
    );
    console.log(
      `[craigslist-scraper] Rate limited, backing off ${backoffMs}ms (attempt ${backoffAttempt + 1})`
    );
    await randomDelay(backoffMs, backoffMs * 1.5);

    // Reload page after backoff
    try {
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: SCRAPER_CONFIG.NAVIGATION_TIMEOUT_MS,
      });
    } catch {
      return {
        success: false,
        listings: [],
        totalFound: 0,
        scrapedAt: new Date(),
        error: 'Rate limited and page reload failed after backoff',
        failureReason: 'navigation_error',
      };
    }
  }

  // Wait for listings to load
  await page
    .waitForSelector(
      '.cl-search-result, .result-row, .gallery-card, li.cl-static-search-result',
      { timeout: SCRAPER_CONFIG.SELECTOR_WAIT_TIMEOUT_MS }
    )
    .catch(() => {
      console.log('[craigslist-scraper] No standard listing selector found, trying fallback');
    });

  // Add delay between page load and extraction
  await randomDelay(SCRAPER_CONFIG.MIN_DELAY_MS, SCRAPER_CONFIG.MAX_DELAY_MS);

  // Extract listings using page.evaluate for in-browser DOM extraction
  // istanbul ignore next -- Browser-side DOM code runs in Playwright context, not Node.js
  const rawListings = await page.evaluate(/* istanbul ignore next */ () => {
    const items: Array<{
      title: string;
      price: string;
      url: string;
      location: string;
      imageUrl?: string;
      description?: string;
    }> = [];

    // Try multiple selector patterns (Craigslist UI changes)
    const selectors = [
      '.cl-search-result',
      '.result-row',
      '.gallery-card',
      'li.cl-static-search-result',
    ];

    let listingElements: Element[] = [];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        listingElements = Array.from(elements);
        break;
      }
    }

    // Fallback: generic data-pid approach
    if (listingElements.length === 0) {
      listingElements = Array.from(document.querySelectorAll('[data-pid]'));
    }

    for (const el of listingElements.slice(0, 50)) {
      try {
        // Extract title
        const titleEl = el.querySelector(
          '.posting-title, .result-title, .titlestring, a.posting-title, .label'
        ) as HTMLElement;
        const title =
          titleEl?.innerText?.trim() || el.querySelector('a')?.innerText?.trim() || '';

        // Extract URL
        const linkEl = el.querySelector("a[href*='/']") as HTMLAnchorElement;
        const url = linkEl?.href || '';

        // Extract price
        const priceEl = el.querySelector('.priceinfo, .result-price, .price') as HTMLElement;
        const price = priceEl?.innerText?.trim() || '$0';

        // Extract location
        const locationEl = el.querySelector(
          '.meta, .result-hood, .location, .supertitle'
        ) as HTMLElement;
        const location = locationEl?.innerText?.replace(/[()]/g, '').trim() || '';

        // Extract image
        const imgEl = el.querySelector('img') as HTMLImageElement;
        const imageUrl = imgEl?.src || '';

        // Extract description snippet from search results (not full listing description —
        // full descriptions require detail page visits, planned for a future enhancement)
        const descEl = el.querySelector('.result-snippet, .description') as HTMLElement;
        const description = descEl?.innerText?.trim() || '';

        // Filter out sponsored listings
        if (title && url && !title.includes('sponsored')) {
          items.push({ title, price, url, location, imageUrl, description });
        }
      } catch {
        // Skip problematic listings
      }
    }

    return items;
  });

  console.log(`[craigslist-scraper] Found ${rawListings.length} listings`);

  // Zero-results detection
  if (rawListings.length === 0) {
    return {
      success: false,
      listings: [],
      totalFound: 0,
      scrapedAt: new Date(),
      error: 'Page loaded but no listings extracted — possible selector breakage',
      failureReason: 'selector_failure_suspected',
    };
  }

  // Convert raw data to CraigslistItem format with delays between processing
  const listings: CraigslistItem[] = [];
  for (const raw of rawListings) {
    const item: CraigslistItem = {
      title: raw.title,
      price: parsePrice(raw.price),
      url: raw.url,
      location: raw.location || params.location,
      externalId: extractListingId(raw.url),
      imageUrls: raw.imageUrl ? [raw.imageUrl] : undefined,
      description: raw.description || undefined,
      condition: parseCondition(raw.title, raw.description),
    };
    listings.push(item);
  }

  // Rate limiting delay after extraction
  await randomDelay(SCRAPER_CONFIG.RATE_LIMIT_MIN_DELAY_MS, SCRAPER_CONFIG.RATE_LIMIT_MAX_DELAY_MS);

  return {
    success: true,
    listings,
    totalFound: rawListings.length,
    scrapedAt: new Date(),
  };
}

// Convert CraigslistItem to canonical RawListing format
export function toRawListing(item: CraigslistItem): RawListing {
  return {
    externalId: item.externalId,
    url: item.url,
    title: item.title,
    description: item.description || null,
    askingPrice: item.price,
    condition: item.condition || null,
    location: item.location || null,
    sellerName: null,
    sellerContact: null,
    imageUrls: item.imageUrls || [],
    category: null,
    postedAt: item.postedAt || null,
  };
}

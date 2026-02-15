// Market price fetcher - Gets actual sold prices from eBay
// Uses Playwright to scrape eBay completed/sold listings

import { chromium, Browser } from 'playwright';

export interface SoldListing {
  title: string;
  price: number;
  soldDate: Date | null;
  condition: string;
  url: string;
  shippingCost: number;
}

export interface MarketPrice {
  source: 'ebay_scrape';
  soldListings: SoldListing[];
  medianPrice: number;
  lowPrice: number;
  highPrice: number;
  avgPrice: number;
  salesCount: number;
  avgDaysToSell: number | null;
  searchQuery: string;
  fetchedAt: Date;
}

// Parse price string from eBay
export function parseEbayPrice(priceStr: string): number {
  const match = priceStr.replace(/[^0-9.,]/g, '').match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ''));
  }
  return 0;
}

// Calculate median from array of numbers
export function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Build eBay sold listings search URL
export function buildEbaySoldUrl(searchQuery: string, category?: string): string {
  const params = new URLSearchParams({
    _nkw: searchQuery,
    LH_Complete: '1', // Completed listings
    LH_Sold: '1', // Sold only
    _sop: '13', // Sort by end date: recent first
  });

  // Add category filter if provided
  if (category) {
    const categoryMap: Record<string, string> = {
      electronics: '293',
      'video games': '1249',
      computers: '58058',
      'cell phones': '15032',
      collectibles: '1',
      tools: '631',
      musical: '619',
      furniture: '3197',
      appliances: '20710',
      sports: '888',
    };
    if (categoryMap[category.toLowerCase()]) {
      params.set('_sacat', categoryMap[category.toLowerCase()]);
    }
  }

  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

export async function fetchMarketPrice(
  searchQuery: string,
  category?: string
): Promise<MarketPrice | null> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    const searchUrl = buildEbaySoldUrl(searchQuery, category);
    console.log(`Fetching eBay sold listings: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for results to load
    await page.waitForSelector('.srp-results .s-item', { timeout: 10000 }).catch(() => {
      console.log('No sold listings found for:', searchQuery);
    });

    // Extract sold listings
    // istanbul ignore next -- runs in browser context, not instrumentable by Jest
    const listings = await page.evaluate(() => {
      const items: Array<{
        title: string;
        price: string;
        shipping: string;
        condition: string;
        url: string;
        soldDate: string;
      }> = [];

      const elements = document.querySelectorAll('.srp-results .s-item');

      for (const el of Array.from(elements).slice(0, 20)) {
        // Get up to 20 results
        try {
          const titleEl = el.querySelector('.s-item__title');
          const priceEl = el.querySelector('.s-item__price');
          const shippingEl = el.querySelector('.s-item__shipping, .s-item__freeXDays');
          const conditionEl = el.querySelector('.SECONDARY_INFO');
          const linkEl = el.querySelector('a.s-item__link') as HTMLAnchorElement;
          const soldDateEl = el.querySelector('.s-item__title--tag, .s-item__ended-date');

          const title = titleEl?.textContent?.trim() || '';
          const price = priceEl?.textContent?.trim() || '$0';
          const shipping = shippingEl?.textContent?.trim() || '';
          const condition = conditionEl?.textContent?.trim() || 'Used';
          const url = linkEl?.href || '';
          const soldDate = soldDateEl?.textContent?.trim() || '';

          // Skip "Shop on eBay" placeholder items
          if (title && !title.includes('Shop on eBay') && price && url) {
            items.push({ title, price, shipping, condition, url, soldDate });
          }
        } catch {
          // Skip problematic items
        }
      }

      return items;
    });

    await context.close();

    if (listings.length === 0) {
      return null;
    }

    // Process listings
    const soldListings: SoldListing[] = listings.map((item) => {
      const price = parseEbayPrice(item.price);
      let shippingCost = 0;

      if (item.shipping.toLowerCase().includes('free')) {
        shippingCost = 0;
      } else {
        const shippingMatch = item.shipping.match(/\$?([\d.]+)/);
        if (shippingMatch) {
          shippingCost = parseFloat(shippingMatch[1]);
        }
      }

      return {
        title: item.title,
        price: price,
        soldDate: null, // Would need more parsing for actual date
        condition: item.condition,
        url: item.url,
        shippingCost,
      };
    });

    // Calculate statistics
    const prices = soldListings.map((l) => l.price + l.shippingCost);
    const validPrices = prices.filter((p) => p > 0);

    if (validPrices.length === 0) {
      return null;
    }

    return {
      source: 'ebay_scrape',
      soldListings,
      medianPrice: Math.round(median(validPrices)),
      lowPrice: Math.round(Math.min(...validPrices)),
      highPrice: Math.round(Math.max(...validPrices)),
      avgPrice: Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length),
      salesCount: soldListings.length,
      avgDaysToSell: null, // Would need sold dates to calculate
      searchQuery,
      fetchedAt: new Date(),
    };
  } catch (error) {
    console.error('Error fetching market price:', error);
    await context.close();
    return null;
  }
}

// Fetch market prices for multiple queries (with rate limiting)
export async function fetchMarketPricesBatch(
  queries: Array<{ searchQuery: string; category?: string }>
): Promise<(MarketPrice | null)[]> {
  const results: (MarketPrice | null)[] = [];

  for (const query of queries) {
    const result = await fetchMarketPrice(query.searchQuery, query.category);
    results.push(result);

    // Delay between requests to avoid being blocked
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Clean up browser after batch
  await closeBrowser();

  return results;
}

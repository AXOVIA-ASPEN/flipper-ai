import { Request, Response } from 'firebase-functions';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { handleCORS, validateMethod, validateBody } from '../lib/cors';

const prisma = new PrismaClient();

interface CraigslistItem {
  title: string;
  price: number;
  url: string;
  location: string;
  externalId: string;
  description?: string;
  imageUrls?: string[];
  postedAt?: Date;
}

interface ScrapeRequest {
  userId: string;
  location: string;
  category: string;
  keywords?: string;
  minPrice?: number;
  maxPrice?: number;
}

const categoryPaths: Record<string, string> = {
  electronics: 'ela',
  furniture: 'fua',
  appliances: 'ppa',
  sporting: 'sga',
  tools: 'tla',
  jewelry: 'jwa',
  antiques: 'ata',
  video_gaming: 'vga',
  music_instr: 'msa',
  computers: 'sya',
  cell_phones: 'moa',
};

function parsePrice(priceStr: string): number {
  const match = priceStr.match(/\$?([\d,]+)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return 0;
}

function extractListingId(url: string): string {
  const match = url.match(/\/(\d+)\.html/);
  return match ? match[1] : url;
}

async function scrapeCraigslist(
  location: string,
  category: string,
  query?: string,
  minPrice?: number,
  maxPrice?: number
): Promise<CraigslistItem[]> {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  
  const page = await context.newPage();

  try {
    const baseUrl = `https://${location}.craigslist.org`;
    const categoryPath = categoryPaths[category] || 'sss';
    const searchParams = new URLSearchParams();

    if (query) searchParams.set('query', query);
    if (minPrice) searchParams.set('min_price', minPrice.toString());
    if (maxPrice) searchParams.set('max_price', maxPrice.toString());

    const searchUrl = `${baseUrl}/search/${categoryPath}?${searchParams.toString()}`;
    console.log(`Scraping: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page
      .waitForSelector('.cl-search-result, .result-row, .gallery-card, li.cl-static-search-result', { timeout: 10000 })
      .catch(() => console.log('No standard listing selector found'));

    const listings = await page.evaluate(() => {
      const items: Array<{
        title: string;
        price: string;
        url: string;
        location: string;
        imageUrl?: string;
      }> = [];

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

      if (listingElements.length === 0) {
        listingElements = Array.from(document.querySelectorAll('[data-pid]'));
      }

      for (const el of listingElements.slice(0, 50)) {
        try {
          const titleEl = el.querySelector('.posting-title, .result-title, .titlestring, a.posting-title, .label') as HTMLElement;
          const title = titleEl?.innerText?.trim() || el.querySelector('a')?.innerText?.trim() || '';

          const linkEl = el.querySelector("a[href*='/']") as HTMLAnchorElement;
          const url = linkEl?.href || '';

          const priceEl = el.querySelector('.priceinfo, .result-price, .price') as HTMLElement;
          const price = priceEl?.innerText?.trim() || '$0';

          const locationEl = el.querySelector('.meta, .result-hood, .location, .supertitle') as HTMLElement;
          const location = locationEl?.innerText?.replace(/[()]/g, '').trim() || '';

          const imgEl = el.querySelector('img') as HTMLImageElement;
          const imageUrl = imgEl?.src || '';

          if (title && url && !title.includes('sponsored')) {
            items.push({ title, price, url, location, imageUrl });
          }
        } catch (e) {
          // Skip problematic listings
        }
      }

      return items;
    });

    console.log(`Found ${listings.length} listings`);

    const results: CraigslistItem[] = listings.map((item) => ({
      title: item.title,
      price: parsePrice(item.price),
      url: item.url,
      location: item.location || location,
      externalId: extractListingId(item.url),
      imageUrls: item.imageUrl ? [item.imageUrl] : undefined,
    }));

    return results;
  } finally {
    await browser.close();
  }
}

export async function handler(req: Request, res: Response) {
  try {
    // Handle CORS
    if (handleCORS(req, res)) return;

    // Validate method
    if (!validateMethod(req, res, ['POST'])) return;

    // Validate body
    const body = validateBody<ScrapeRequest>(req, res, ['userId', 'location', 'category']);
    if (!body) return;

    const { userId, location, category, keywords, minPrice, maxPrice } = body;

    // Create scraper job
    const job = await prisma.scraperJob.create({
      data: {
        userId,
        platform: 'CRAIGSLIST',
        location,
        category,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    console.log(`Job ${job.id} started for user ${userId}`);

    try {
      // Run scraper
      const listings = await scrapeCraigslist(location, category, keywords, minPrice, maxPrice);

      // Update job
      await prisma.scraperJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          listingsFound: listings.length,
          completedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: `Scraped ${listings.length} listings from Craigslist`,
        jobId: job.id,
        listings: listings.map(item => ({
          title: item.title,
          price: `$${item.price}`,
          location: item.location,
          url: item.url,
          imageUrl: item.imageUrls?.[0],
          externalId: item.externalId,
        })),
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
    console.error('Craigslist scraper error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    await prisma.$disconnect();
  }
}

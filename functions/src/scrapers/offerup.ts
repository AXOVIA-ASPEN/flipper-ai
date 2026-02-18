import { Request, Response } from 'firebase-functions';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { handleCORS, validateMethod, validateBody } from '../lib/cors';

const prisma = new PrismaClient();

interface OfferUpItem {
  title: string;
  price: number;
  url: string;
  location: string;
  externalId: string;
  imageUrl?: string;
}

interface ScrapeRequest {
  userId: string;
  location?: string;
  keywords?: string;
  minPrice?: number;
  maxPrice?: number;
}

async function scrapeOfferUp(
  keywords?: string,
  location?: string,
  minPrice?: number,
  maxPrice?: number
): Promise<OfferUpItem[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });

  const page = await context.newPage();

  try {
    const searchParams = new URLSearchParams();
    if (keywords) searchParams.set('q', keywords);
    if (location) searchParams.set('location', location);
    if (minPrice) searchParams.set('price_min', minPrice.toString());
    if (maxPrice) searchParams.set('price_max', maxPrice.toString());

    const searchUrl = `https://offerup.com/search/?${searchParams.toString()}`;
    console.log(`Scraping: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Extract listings
    const listings = await page.evaluate(() => {
      const items: Array<{
        title: string;
        price: string;
        url: string;
        imageUrl?: string;
      }> = [];

      // TODO: Update selectors based on current OfferUp DOM structure
      const listingElements = document.querySelectorAll('[data-testid="listing-card"]');

      for (const el of Array.from(listingElements).slice(0, 50)) {
        try {
          const titleEl = el.querySelector('[data-testid="listing-title"]') as HTMLElement;
          const title = titleEl?.innerText?.trim() || '';

          const priceEl = el.querySelector('[data-testid="listing-price"]') as HTMLElement;
          const price = priceEl?.innerText?.trim() || '$0';

          const linkEl = el.querySelector('a') as HTMLAnchorElement;
          const url = linkEl?.href || '';

          const imgEl = el.querySelector('img') as HTMLImageElement;
          const imageUrl = imgEl?.src || '';

          if (title && url) {
            items.push({ title, price, url, imageUrl });
          }
        } catch (e) {
          // Skip problematic listings
        }
      }

      return items;
    });

    console.log(`Found ${listings.length} listings`);

    const results: OfferUpItem[] = listings.map((item, index) => ({
      title: item.title,
      price: parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0,
      url: item.url,
      location: location || 'unknown',
      externalId: item.url.split('/').pop() || `offerup-${index}`,
      imageUrl: item.imageUrl,
    }));

    return results;
  } finally {
    await browser.close();
  }
}

export async function handler(req: Request, res: Response) {
  try {
    if (handleCORS(req, res)) return;
    if (!validateMethod(req, res, ['POST'])) return;

    const body = validateBody<ScrapeRequest>(req, res, ['userId']);
    if (!body) return;

    const { userId, location, keywords, minPrice, maxPrice } = body;

    // Create scraper job
    const job = await prisma.scraperJob.create({
      data: {
        userId,
        platform: 'OFFERUP',
        location: location || 'unknown',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    console.log(`OfferUp job ${job.id} started for user ${userId}`);

    try {
      const listings = await scrapeOfferUp(keywords, location, minPrice, maxPrice);

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
        message: `Scraped ${listings.length} listings from OfferUp`,
        jobId: job.id,
        listings: listings.map(item => ({
          title: item.title,
          price: `$${item.price}`,
          location: item.location,
          url: item.url,
          imageUrl: item.imageUrl,
          externalId: item.externalId,
        })),
      });
    } catch (scrapeError) {
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
    console.error('OfferUp scraper error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    await prisma.$disconnect();
  }
}

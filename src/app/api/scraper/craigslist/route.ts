import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import prisma from '@/lib/db';
import { estimateValue, detectCategory, generatePurchaseMessage } from '@/lib/value-estimator';
import { identifyItem } from '@/lib/llm-identifier';
import { fetchMarketPrice, closeBrowser as closeMarketBrowser } from '@/lib/market-price';
import { analyzeSellability, quickDiscountCheck } from '@/lib/llm-analyzer';
import { getAuthUserId } from '@/lib/auth-middleware';

// Minimum discount threshold for saving a listing (50% = must be half market value)
const MIN_DISCOUNT_THRESHOLD = 50;

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

// Parse price from Craigslist format
function parsePrice(priceStr: string): number {
  const match = priceStr.match(/\$?([\d,]+)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return 0;
}

// Extract listing ID from URL
function extractListingId(url: string): string {
  const match = url.match(/\/(\d+)\.html/);
  return match ? match[1] : url;
}

// Category mapping to Craigslist paths
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

// Scrape Craigslist using Playwright (real browser)
async function scrapeCraigslistWithPlaywright(
  location: string,
  category: string,
  query?: string,
  minPrice?: number,
  maxPrice?: number
): Promise<CraigslistItem[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    // Build search URL
    const baseUrl = `https://${location}.craigslist.org`;
    const categoryPath = categoryPaths[category] || 'sss';
    const searchParams = new URLSearchParams();

    if (query) searchParams.set('query', query);
    if (minPrice) searchParams.set('min_price', minPrice.toString());
    if (maxPrice) searchParams.set('max_price', maxPrice.toString());

    const searchUrl = `${baseUrl}/search/${categoryPath}?${searchParams.toString()}`;
    console.log(`Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for listings to load
    await page
      .waitForSelector(
        '.cl-search-result, .result-row, .gallery-card, li.cl-static-search-result',
        { timeout: 10000 }
      )
      .catch(() => {
        console.log('No standard listing selector found, trying alternate approach');
      });

    // Extract listings using page.evaluate
    // istanbul ignore next -- Browser-side DOM code runs in Playwright context, not Node.js
    const listings = await page.evaluate(/* istanbul ignore next */ () => {
      const items: Array<{
        title: string;
        price: string;
        url: string;
        location: string;
        imageUrl?: string;
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

      // If still no results, try the generic list item approach
      if (listingElements.length === 0) {
        listingElements = Array.from(document.querySelectorAll('[data-pid]'));
      }

      for (const el of listingElements.slice(0, 50)) {
        // Limit to 50 listings
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

    // Convert to our format
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

// POST /api/scraper/craigslist - Run scraper
export async function POST(request: NextRequest) {
  let job = null;

  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { location, category, keywords, minPrice, maxPrice } = body;

    if (!location || !category) {
      return NextResponse.json(
        { success: false, message: 'Location and category are required' },
        { status: 400 }
      );
    }

    // Create scraper job record
    job = await prisma.scraperJob.create({
      data: {
        userId,
        platform: 'CRAIGSLIST',
        location,
        category,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Scrape listings using Playwright
    const listings = await scrapeCraigslistWithPlaywright(
      location,
      category,
      keywords,
      minPrice,
      maxPrice
    );

    if (listings.length === 0) {
      // Update job as completed with no results
      await prisma.scraperJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          listingsFound: 0,
          opportunitiesFound: 0,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'No listings found matching your criteria. Try different search parameters.',
        listings: [],
        savedCount: 0,
        jobId: job.id,
      });
    }

    // Process listings with LLM analysis pipeline
    // Only save listings that are 50%+ undervalued based on verified market data
    let savedCount = 0;
    let opportunitiesFound = 0;
    let analyzedCount = 0;
    let skippedCount = 0;
    const savedListings: Array<{
      title: string;
      price: string;
      location: string;
      url: string;
      imageUrl?: string;
      discount?: number;
    }> = [];

    const hasLLM = !!process.env.OPENAI_API_KEY;
    console.log(`LLM analysis ${hasLLM ? 'enabled' : 'disabled (no OPENAI_API_KEY)'}`);

    for (const item of listings) {
      try {
        // Skip items without price
        if (item.price <= 0) continue;

        // Detect category for algorithmic estimation
        const detectedCategory = detectCategory(item.title, item.description || null);

        // Always run algorithmic estimation as baseline
        const estimation = estimateValue(
          item.title,
          item.description || null,
          item.price,
          null,
          detectedCategory
        );

        // Initialize LLM analysis fields
        let llmAnalyzed = false;
        let identification = null;
        let marketData = null;
        let sellabilityAnalysis = null;
        let verifiedMarketValue: number | null = null;
        let trueDiscountPercent: number | null = null;
        let meetsThreshold = false;

        // LLM Analysis Pipeline (if API key is configured)
        if (hasLLM) {
          try {
            // Step 1: Identify the item using LLM
            identification = await identifyItem(
              item.title,
              item.description || null,
              item.price,
              detectedCategory
            );

            if (identification && identification.worthInvestigating) {
              // Step 2: Fetch real market prices from eBay
              marketData = await fetchMarketPrice(
                identification.searchQuery,
                identification.category
              );

              if (marketData && marketData.salesCount > 0) {
                // Step 3: Quick check - is this potentially 40%+ undervalued?
                const quickCheck = quickDiscountCheck(item.price, marketData);

                if (quickCheck.passesQuickCheck) {
                  // Step 4: Full LLM sellability analysis
                  sellabilityAnalysis = await analyzeSellability(
                    item.title,
                    item.price,
                    identification,
                    marketData
                  );

                  /* istanbul ignore else -- LLM always returns analysis or throws; null result is an edge case tested via mock errors */
                  if (sellabilityAnalysis) {
                    llmAnalyzed = true;
                    verifiedMarketValue = sellabilityAnalysis.verifiedMarketValue;
                    trueDiscountPercent = sellabilityAnalysis.trueDiscountPercent;
                    meetsThreshold = sellabilityAnalysis.meetsThreshold;
                    analyzedCount++;
                  }
                }
              }
            }
          } catch (llmError) {
            console.error(`LLM analysis error for ${item.externalId}:`, llmError);
            // Continue with algorithmic fallback
          }
        }

        // Determine if we should save this listing
        // With LLM: only save if verified 50%+ undervalued
        // Without LLM: fall back to algorithmic estimation (save if valueScore >= 70)
        const shouldSave = hasLLM
          ? meetsThreshold &&
            trueDiscountPercent !== null &&
            trueDiscountPercent >= MIN_DISCOUNT_THRESHOLD
          : estimation.valueScore >= 70;

        if (!shouldSave) {
          skippedCount++;
          continue;
        }

        // Generate purchase message
        const requestToBuy = generatePurchaseMessage(
          item.title,
          item.price,
          estimation.negotiable || (sellabilityAnalysis /* istanbul ignore next */ ?.recommendedOfferPrice !== undefined),
          null
        );

        // Build listing data
        const listingData = {
          userId,
          externalId: item.externalId,
          platform: 'CRAIGSLIST',
          url: item.url,
          title: item.title,
          description: item.description,
          askingPrice: item.price,
          location: item.location,
          imageUrls: item.imageUrls ? JSON.stringify(item.imageUrls) : null,
          category: identification?.category || detectedCategory,
          postedAt: item.postedAt,

          // Algorithmic estimation (baseline)
          estimatedValue: estimation.estimatedValue,
          estimatedLow: estimation.estimatedLow,
          estimatedHigh: estimation.estimatedHigh,
          profitPotential: estimation.profitPotential,
          profitLow: estimation.profitLow,
          profitHigh: estimation.profitHigh,
          valueScore: estimation.valueScore,
          discountPercent: estimation.discountPercent,
          resaleDifficulty: estimation.resaleDifficulty,

          // Market references
          comparableUrls: JSON.stringify(estimation.comparableUrls),
          priceReasoning: estimation.reasoning,
          notes: sellabilityAnalysis?.resaleStrategy || estimation.notes,

          // Metadata
          shippable: estimation.shippable,
          negotiable: estimation.negotiable,
          tags: JSON.stringify(estimation.tags),
          requestToBuy,

          // LLM Identification
          identifiedBrand: identification?.brand || null,
          identifiedModel: identification?.model || null,
          identifiedVariant: identification?.variant || null,
          identifiedCondition: identification?.condition || null,

          // Verified Market Data
          verifiedMarketValue: verifiedMarketValue,
          marketDataSource: marketData ? 'ebay_scrape' : null,
          marketDataDate: marketData ? new Date() : null,
          comparableSalesJson: marketData
            ? JSON.stringify(marketData.soldListings.slice(0, 5))
            : null,

          // LLM Sellability Analysis
          sellabilityScore: sellabilityAnalysis?.sellabilityScore || null,
          demandLevel: sellabilityAnalysis?.demandLevel || null,
          expectedDaysToSell: sellabilityAnalysis?.expectedDaysToSell || null,
          authenticityRisk: sellabilityAnalysis?.authenticityRisk || null,
          recommendedOffer: sellabilityAnalysis?.recommendedOfferPrice || null,
          recommendedList: sellabilityAnalysis?.recommendedListPrice || null,
          resaleStrategy: sellabilityAnalysis?.resaleStrategy || null,

          // True discount
          trueDiscountPercent: trueDiscountPercent,

          // Analysis metadata
          llmAnalyzed,
          analysisDate: llmAnalyzed ? new Date() : null,
          analysisConfidence: sellabilityAnalysis?.confidence || null,
          analysisReasoning: sellabilityAnalysis?.reasoning || null,

          // Status - all saved listings are opportunities now
          status: 'OPPORTUNITY',
        };

        // Upsert to database
        await prisma.listing.upsert({
          where: {
            platform_externalId_userId: {
              platform: 'CRAIGSLIST',
              externalId: item.externalId,
              userId,
            },
          },
          create: listingData,
          update: listingData,
        });

        savedCount++;
        opportunitiesFound++;
        savedListings.push({
          title: item.title,
          price: `$${item.price}`,
          location: item.location,
          url: item.url,
          imageUrl: item.imageUrls?.[0],
          discount: trueDiscountPercent || estimation.discountPercent,
        });
      } catch (error) {
        console.error(`Error processing listing ${item.externalId}:`, error);
      }
    }

    // Clean up market price browser
    await closeMarketBrowser();

    // Update job as completed
    /* istanbul ignore next -- defensive null guard; job is always set in success path */
    if (job) {
      await prisma.scraperJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          listingsFound: listings.length,
          opportunitiesFound,
          completedAt: new Date(),
        },
      });
    }

    const analysisMode = hasLLM
      ? 'LLM-verified (50%+ undervalued only)'
      : 'algorithmic (score >= 70)';
    const message = hasLLM
      ? `Analyzed ${listings.length} listings, found ${opportunitiesFound} opportunities (${skippedCount} didn't meet 50% threshold)`
      : `Scraped ${listings.length} listings, found ${opportunitiesFound} opportunities`;

    return NextResponse.json({
      success: true,
      message,
      listings: savedListings,
      savedCount,
      opportunitiesFound,
      totalScraped: listings.length,
      analyzedWithLLM: analyzedCount,
      skippedBelowThreshold: skippedCount,
      analysisMode,
      jobId: job /* istanbul ignore next */ ?.id,
    });
  } catch (error) {
    console.error('Scraper error:', error);

    // Update job as failed
    if (job) {
      await prisma.scraperJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to scrape listings',
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId: job?.id,
      },
      { status: 500 }
    );
  }
}

// GET /api/scraper/craigslist - Get scraper status/info
export async function GET() {
  return NextResponse.json({
    platform: 'craigslist',
    status: 'ready',
    supportedCategories: Object.keys(categoryPaths),
    supportedLocations: [
      'sarasota',
      'tampa',
      'orlando',
      'miami',
      'jacksonville',
      'sfbay',
      'losangeles',
      'newyork',
      'chicago',
      'seattle',
      'austin',
      'denver',
    ],
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { chromium, Browser, Page } from 'playwright';
import prisma from '@/lib/db';
import { estimateValue, detectCategory, generatePurchaseMessage } from '@/lib/value-estimator';
import { getPlatformFeeRate, enrichOpportunitiesWithClaudeTier2, enrichWithCompletenessAndReputation } from '@/lib/marketplace-scanner';
import { analyzeLogistics } from '@/lib/logistics-analyzer';
import { getAuthUserId } from '@/lib/auth-middleware';
import { downloadAndCacheImages, normalizeLocation } from '@/lib/image-service';
import { sseEmitter } from '@/lib/sse-emitter';

// Rate limiting configuration
const RATE_LIMIT_DELAY_MS = 2000; // 2 seconds between requests
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 30000;

interface OfferUpItem {
  title: string;
  price: number;
  url: string;
  location: string;
  externalId: string;
  description?: string;
  imageUrls?: string[];
  postedAt?: Date;
  condition?: string;
  sellerName?: string;
}

// Category mapping to OfferUp category IDs/slugs
const categoryMapping: Record<string, string> = {
  electronics: 'electronics',
  furniture: 'home-garden',
  appliances: 'appliances',
  sporting: 'sporting-goods',
  tools: 'tools-machinery',
  jewelry: 'jewelry-accessories',
  antiques: 'antiques-collectibles',
  video_gaming: 'video-games',
  music_instr: 'musical-instruments',
  computers: 'computers-accessories',
  cell_phones: 'cell-phones',
  vehicles: 'cars-trucks',
  clothing: 'clothing-shoes',
  toys: 'toys-games',
};

// Supported locations (major metros)
const supportedLocations = [
  'tampa-fl',
  'orlando-fl',
  'miami-fl',
  'jacksonville-fl',
  'sarasota-fl',
  'los-angeles-ca',
  'san-francisco-ca',
  'new-york-ny',
  'chicago-il',
  'seattle-wa',
  'austin-tx',
  'denver-co',
  'phoenix-az',
  'atlanta-ga',
  'dallas-tx',
];

// Parse price from OfferUp format
function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  // Handle "Free" listings
  if (priceStr.toLowerCase() === 'free') return 0;
  const match = priceStr.match(/\$?([\d,]+)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return 0;
}

// Extract listing ID from OfferUp URL
function extractListingId(url: string): string {
  // OfferUp URLs: https://offerup.com/item/detail/1234567890
  const match = url.match(/\/item\/detail\/(\d+)/);
  if (match) return match[1];
  // Alternative format
  const altMatch = url.match(/\/(\d+)\/?$/);
  return altMatch ? altMatch[1] : url;
}

// Sleep helper for rate limiting
import { sleep } from '@/lib/sleep';

import { identifyItem } from '@/lib/llm-identifier';
import { fetchMarketPrice, closeBrowser as closeMarketBrowser, type MarketPrice } from '@/lib/market-price';
import { lookupVerifiedMarketPrice } from '@/lib/market-value-calculator';
import { findComparableSales, type CompMatchResult } from '@/lib/comp-matcher';
import { analyzeSellability, quickDiscountCheck } from '@/lib/llm-analyzer';
import { analyzeDemandTrend } from '@/lib/demand-analyzer';
import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { enforceTierLimits } from '@/lib/tier-enforcement';
import { computeEstimatedExpiry } from '@/lib/listing-expiry';
import { emitOpportunityFoundEvent } from '@/lib/notification-events';
// Retry wrapper for browser operations
async function withRetry<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Retry ${i + 1}/${retries} failed:`, lastError.message);
      if (i < retries - 1) {
        await sleep(RATE_LIMIT_DELAY_MS * (i + 1)); // Exponential backoff
      }
    }
  }
  throw lastError;
}

// Scrape OfferUp using Playwright
async function scrapeOfferUpWithPlaywright(
  location: string,
  category: string,
  query?: string,
  minPrice?: number,
  maxPrice?: number
): Promise<OfferUpItem[]> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
    });

    // Block unnecessary resources to speed up scraping
    await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf}', (route) =>
      route.abort()
    );
    await context.route('**/analytics/**', (route) => route.abort());
    await context.route('**/tracking/**', (route) => route.abort());

    const page = await context.newPage();

    // Build search URL
    const categorySlug = categoryMapping[category] || 'all';
    let searchUrl = `https://offerup.com/search/${location}`;

    const searchParams = new URLSearchParams();
    if (query) searchParams.set('q', query);
    if (minPrice) searchParams.set('price_min', minPrice.toString());
    if (maxPrice) searchParams.set('price_max', maxPrice.toString());
    if (categorySlug !== 'all') searchParams.set('catid', categorySlug);

    const queryString = searchParams.toString();
    if (queryString) {
      searchUrl += `?${queryString}`;
    }

    console.log(`Navigating to OfferUp: ${searchUrl}`);

    await withRetry(async () => {
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: REQUEST_TIMEOUT_MS,
      });
    });

    // Rate limit compliance
    await sleep(RATE_LIMIT_DELAY_MS);

    // Wait for listings to load
    await page
      .waitForSelector(
        '[data-testid="listing-card"], [class*="listing-card"], [class*="ItemCard"], a[href*="/item/detail/"]',
        {
          timeout: 15000,
        }
      )
      .catch(() => {
        console.log('No standard listing selector found, trying alternate approach');
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

    // Extract listings
    // istanbul ignore next -- Browser-side DOM code runs in Playwright context, not Node.js
    const listings = await page.evaluate(/* istanbul ignore next */ () => {
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
        // Limit to 50 listings
        try {
          // Extract title
          const titleEl = el.querySelector(
            'h3, [class*="title"], [data-testid="listing-title"], span[class*="Title"]'
          ) as HTMLElement;
          const title =
            titleEl?.innerText?.trim() || (el as HTMLElement).querySelector('a')?.title || '';

          // Extract URL
          const linkEl = el.querySelector('a[href*="/item/detail/"]') as HTMLAnchorElement;
          const url = linkEl?.href || '';

          // Extract price
          const priceEl = el.querySelector(
            '[class*="price"], [data-testid="listing-price"], span[class*="Price"]'
          ) as HTMLElement;
          const price = priceEl?.innerText?.trim() || '$0';

          // Extract location
          const locationEl = el.querySelector(
            '[class*="location"], [data-testid="listing-location"]'
          ) as HTMLElement;
          const location = locationEl?.innerText?.trim() || '';

          // Extract image
          const imgEl = el.querySelector('img') as HTMLImageElement;
          const imageUrl = imgEl?.src || imgEl?.getAttribute('data-src') || '';

          // Extract condition if available
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

    console.log(`Found ${listings.length} OfferUp listings`);

    // Convert to our format
    const results: OfferUpItem[] = listings.map((item) => ({
      title: item.title,
      price: parsePrice(item.price),
      url: item.url,
      location: item.location || location,
      externalId: extractListingId(item.url),
      imageUrls: item.imageUrl ? [item.imageUrl] : undefined,
      condition: item.condition || undefined,
    }));

    return results;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// POST /api/scraper/offerup - Run scraper
export async function POST(request: NextRequest) {
  let job = null;

  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const userSettings = await prisma.userSettings.findUnique({ where: { userId } });
    const discountThreshold = userSettings?.discountThreshold ?? 50;
    const feeRate = getPlatformFeeRate('OFFERUP', userSettings);
    const opportunityThreshold = userSettings?.opportunityThreshold ?? 70;
    const hasLLM = !!process.env.OPENAI_API_KEY;

    const body = await request.json();
    const { location, category, keywords, minPrice, maxPrice } = body;

    if (!location) {
      return NextResponse.json(
        { success: false, message: 'Location is required' },
        { status: 400 }
      );
    }

    // Validate location format
    const normalizedLocation = location.toLowerCase().replace(/\s+/g, '-');
    if (
      !supportedLocations.includes(normalizedLocation) &&
      !normalizedLocation.match(/^[\w-]+-[a-z]{2}$/)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid location format. Use format: city-state (e.g., tampa-fl). Supported: ${supportedLocations.slice(0, 5).join(', ')}...`,
        },
        { status: 400 }
      );
    }

    // Enforce subscription tier limits (scan count + marketplace)
    await enforceTierLimits(userId, 'OFFERUP');

    // Create scraper job record
    job = await prisma.scraperJob.create({
      data: {
        userId,
        platform: 'OFFERUP',
        location: normalizedLocation,
        category: category || 'all',
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Scrape listings using Playwright
    const listings = await scrapeOfferUpWithPlaywright(
      normalizedLocation,
      category || 'all',
      keywords,
      minPrice,
      maxPrice
    );

    if (listings.length === 0) {
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

    // Process and save listings
    let savedCount = 0;
    let opportunitiesFound = 0;
    const savedListings: Array<{
      title: string;
      price: string;
      location: string;
      url: string;
      imageUrl?: string;
      valueScore?: number;
    }> = [];

    const userLogisticsSettings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { homeLocation: true, maxPickupRadiusMiles: true },
    });

    for (const item of listings) {
      try {
        // Skip items without price (or free items based on preference)
        if (item.price <= 0) continue;

        // Detect category and estimate value
        const detectedCategory = detectCategory(item.title, item.description || null);
        const estimation = estimateValue(
          item.title,
          item.description || null,
          item.price,
          item.condition || null,
          detectedCategory,
          feeRate
        );

        // LLM Analysis Pipeline
        let llmAnalyzed = false;
        let sellabilityAnalysis = null;
        let verifiedMarketValue: number | null = null;
        let trueDiscountPercent: number | null = null;
        let meetsLLMThreshold = !hasLLM;
        let capturedMarketData: MarketPrice | null = null;
        let capturedIdentification: Awaited<ReturnType<typeof identifyItem>> | null = null;

        if (hasLLM) {
          try {
            const identification = await identifyItem(item.title, item.description || null, item.price, detectedCategory);
            capturedIdentification = identification; // Story 5.2: capture for comp matching
            if (identification?.worthInvestigating) {
              const marketData = await fetchMarketPrice(identification.searchQuery, identification.category);
              capturedMarketData = marketData; // Story 5.3: capture for demand analysis
              if (marketData && marketData.salesCount > 0) {
                const quickCheck = quickDiscountCheck(item.price, marketData);
                if (quickCheck.passesQuickCheck) {
                  sellabilityAnalysis = await analyzeSellability(
                    item.title,
                    item.price,
                    identification,
                    marketData,
                    discountThreshold,
                    feeRate
                  );
                  if (sellabilityAnalysis) {
                    llmAnalyzed = true;
                    verifiedMarketValue = sellabilityAnalysis.verifiedMarketValue;
                    trueDiscountPercent = sellabilityAnalysis.trueDiscountPercent;
                    meetsLLMThreshold =
                      sellabilityAnalysis.meetsThreshold &&
                      trueDiscountPercent !== null &&
                      trueDiscountPercent >= discountThreshold;
                  }
                }
              }
            }
          } catch (llmError) {
            console.error(`LLM analysis error for OfferUp listing ${item.externalId}:`, llmError);
          }
        }

        // Story 4.4: Verified market price fallback when LLM pipeline didn't produce one
        if (!verifiedMarketValue && item.price > 0) {
          try {
            const vpResult = await lookupVerifiedMarketPrice(item.title, item.price, detectedCategory);
            if (vpResult) {
              verifiedMarketValue = vpResult.verifiedMarketValue;
              trueDiscountPercent = vpResult.trueDiscountPercent;
            }
          } catch (vpErr) {
            console.error(`Verified price lookup error for OfferUp listing ${item.externalId}:`, vpErr);
          }
        }

        if (hasLLM && !meetsLLMThreshold) continue;

        // Story 5.3: Demand trend analysis
        const demandAnalysis = capturedMarketData ? analyzeDemandTrend(capturedMarketData.soldListings) : null;

        // Story 5.2: Comparable sold item matching — reuses fetched soldListings
        let compMatchResult: CompMatchResult | null = null;
        if (capturedIdentification && capturedMarketData) {
          try {
            compMatchResult = await findComparableSales(
              capturedIdentification.searchQuery,
              capturedIdentification.brand ?? null,
              capturedIdentification.model ?? null,
              capturedIdentification.category,
              capturedMarketData.soldListings
            );
          } catch (compErr) {
            console.error(`Comp matching error for OfferUp listing ${item.externalId}:`, compErr);
          }
        }

        // Generate purchase message
        const requestToBuy = generatePurchaseMessage(
          item.title,
          item.price,
          estimation.negotiable,
          item.sellerName || undefined
        );

        // Claude Tier 2 structural analysis (Story 5.1) — via centralized enrichment function
        const [claudeEnriched] = await enrichOpportunitiesWithClaudeTier2(
          [
            {
              externalId: item.externalId,
              url: item.url,
              title: item.title,
              description: item.description,
              askingPrice: item.price,
              imageUrls: item.imageUrls,
              platform: 'OFFERUP',
              category: detectedCategory,
              estimation,
              requestToBuy,
              isOpportunity: true,
            },
          ],
          userId
        );
        const claudeAnalysis = claudeEnriched.claudeAnalysis;

        // Story 5.4: Item completeness & seller reputation enrichment (Step 6 in pipeline)
        // OfferUp does not expose seller ratings — completeness analysis only (if images available)
        const [enriched54] = await enrichWithCompletenessAndReputation([{
          externalId: item.externalId,
          url: item.url,
          title: item.title,
          description: item.description,
          askingPrice: item.price,
          imageUrls: item.imageUrls,
          platform: 'OFFERUP',
          category: detectedCategory,
          estimation,
          requestToBuy,
          isOpportunity: true,
        }]);
        const completenessLabel = enriched54.completenessAnalysis?.completenessLabel ?? null;

        // Determine status based on value score
        const status = hasLLM ? 'OPPORTUNITY' : estimation.valueScore >= opportunityThreshold ? 'OPPORTUNITY' : 'NEW';

        // Download and cache images
        let cachedImageUrls: string[] = [];
        if (item.imageUrls && item.imageUrls.length > 0) {
          const imageResult = await downloadAndCacheImages(item.imageUrls, {
            maxConcurrent: 2,
            skipOnFailure: true, // Use original URL if download fails
          });
          cachedImageUrls = imageResult.cachedUrls;
          console.log(
            `Cached ${imageResult.successCount}/${item.imageUrls.length} images for listing ${item.externalId}`
          );
        }

        // Normalize location data
        const normalizedLoc = normalizeLocation(item.location);

        // Step 6: Logistics & shipping cost analysis (Story 5.5)
        let logisticsAnalysis = null;
        try {
          logisticsAnalysis = await analyzeLogistics(
            { title: item.title, description: item.description, category: detectedCategory, location: normalizedLoc.normalized, estimation },
            userLogisticsSettings?.homeLocation ?? null,
            userLogisticsSettings?.maxPickupRadiusMiles ?? 50
          );
        } catch (logErr) {
          console.error(`Logistics analysis error for OfferUp listing ${item.externalId}:`, logErr);
        }

        // Build listing data
        const listingData = {
          userId,
          externalId: item.externalId,
          platform: 'OFFERUP',
          url: item.url,
          title: item.title,
          description: item.description || null,
          askingPrice: item.price,
          condition: item.condition || null,
          location: normalizedLoc.normalized,
          sellerName: item.sellerName || null,
          imageUrls: cachedImageUrls.length > 0 ? JSON.stringify(cachedImageUrls) : null,
          category: detectedCategory,
          postedAt: item.postedAt || null,
          estimatedExpiresAt: computeEstimatedExpiry('OFFERUP', item.postedAt || null),

          // Value estimation
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

          // Metadata — Story 5.5: logistics classification overrides algorithmic shippable
          shippable: logisticsAnalysis
            ? logisticsAnalysis.sizeCategory !== 'large_local_only'
            : estimation.shippable,
          sizeCategory: logisticsAnalysis?.sizeCategory ?? null,
          shippingEstimatesJson: logisticsAnalysis?.shippingEstimates
            ? JSON.stringify(logisticsAnalysis.shippingEstimates) : null,
          estimatedShippingCost: logisticsAnalysis?.estimatedShippingCost ?? null,
          pickupDistanceMiles: logisticsAnalysis?.pickupDistanceMiles ?? null,
          outsidePickupRadius: logisticsAnalysis?.outsidePickupRadius ?? null,
          adjustedProfitMargin: logisticsAnalysis?.adjustedProfitMargin ?? null,
          estimatedWeight: logisticsAnalysis?.estimatedWeightLbs ?? null,
          negotiable: estimation.negotiable,
          tags: JSON.stringify(estimation.tags),
          requestToBuy,
          status,

          // LLM Sellability Analysis
          verifiedMarketValue,
          marketDataSource: sellabilityAnalysis ? 'ebay_scrape' : null,
          marketDataDate: sellabilityAnalysis ? new Date() : null,
          trueDiscountPercent,
          llmAnalyzed,
          analysisDate: llmAnalyzed ? new Date() : null,
          sellabilityScore: sellabilityAnalysis?.sellabilityScore || null,
          demandLevel: demandAnalysis?.demandTrend ?? sellabilityAnalysis?.demandLevel ?? null,
          soldVolume30Days: demandAnalysis?.soldVolume30Days ?? null,
          soldVolume60Days: demandAnalysis?.soldVolume60Days ?? null,
          soldVolume90Days: demandAnalysis?.soldVolume90Days ?? null,
          expectedDaysToSell: sellabilityAnalysis?.expectedDaysToSell || null,
          authenticityRisk: sellabilityAnalysis?.authenticityRisk || null,
          conditionRisk: sellabilityAnalysis?.conditionRisk || null,
          recommendedOffer: sellabilityAnalysis?.recommendedOfferPrice || null,
          recommendedList: sellabilityAnalysis?.recommendedListPrice || null,
          resaleStrategy: sellabilityAnalysis?.resaleStrategy || null,
          // Story 5.4: Item completeness & seller reputation
          completenessLabel,
          sellerRating: null,         // OfferUp does not expose seller rating data
          sellerReviewCount: null,
          sellerAccountAgeDays: null,
          analysisConfidence: claudeAnalysis?.confidence ?? sellabilityAnalysis?.confidence ?? null,
          analysisReasoning: claudeAnalysis?.reasoning ?? sellabilityAnalysis?.reasoning ?? null,
          notes: sellabilityAnalysis?.resaleStrategy || estimation.notes,
          comparableSalesJson: compMatchResult
            ? JSON.stringify(compMatchResult.comps)
            : capturedMarketData ? JSON.stringify(capturedMarketData.soldListings.slice(0, 5)) : null,
          compMatchConfidence: compMatchResult?.confidence ?? null,
        };

        // Upsert to database
        const savedListing = await prisma.listing.upsert({
          where: {
            platform_externalId_userId: {
              platform: 'OFFERUP',
              externalId: item.externalId,
              userId,
            },
          },
          create: listingData,
          update: listingData,
        });

        if (claudeAnalysis) {
          try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            await prisma.aiAnalysisCache.create({
              data: {
                listingId: savedListing.id,
                analysisResult: JSON.stringify(claudeAnalysis),
                analyzedAtPrice: item.price,
                expiresAt,
              },
            });
          } catch (cacheErr) {
            console.error(`Failed to cache Claude analysis for OfferUp listing ${item.externalId}:`, cacheErr);
          }
        }

        // Emit SSE event for real-time notification
        await sseEmitter.emit({
          type: 'listing.found',
          data: {
            id: savedListing.id,
            platform: 'OFFERUP',
            title: item.title,
            price: item.price,
            discount: estimation.discountPercent,
            url: item.url,
            imageUrl: cachedImageUrls[0] || item.imageUrls?.[0],
            location: normalizedLoc.normalized,
          },
        });

        // Story 10.3: Emit opportunity.found notification event (fire-and-forget).
        void emitOpportunityFoundEvent(savedListing, userId);

        savedCount++;
        if (status === 'OPPORTUNITY') {
          opportunitiesFound++;
        }

        savedListings.push({
          title: item.title,
          price: `$${item.price}`,
          location: normalizedLoc.normalized,
          url: item.url,
          imageUrl: cachedImageUrls[0] || item.imageUrls?.[0],
          valueScore: estimation.valueScore,
        });
      } catch (error) {
        console.error(`Error processing OfferUp listing ${item.externalId}:`, error);
      }
    }
    await closeMarketBrowser();

    // Update job as completed
    await prisma.scraperJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        listingsFound: listings.length,
        opportunitiesFound,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Scraped ${listings.length} listings, found ${opportunitiesFound} opportunities`,
      listings: savedListings,
      savedCount,
      opportunitiesFound,
      totalScraped: listings.length,
      jobId: job.id,
    });
  } catch (error) {
    console.error('OfferUp scraper error:', error);

    // Return auth/tier errors directly before updating job
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return handleError(error);
    }

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

    // Check for specific error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isRateLimited = errorMessage.includes('blocked') || errorMessage.includes('captcha');

    return NextResponse.json(
      {
        success: false,
        message: isRateLimited
          ? 'Request blocked by OfferUp. Please try again later or reduce request frequency.'
          : 'Failed to scrape OfferUp listings',
        error: errorMessage,
        jobId: job?.id,
      },
      { status: isRateLimited ? 429 : 500 }
    );
  }
}

// GET /api/scraper/offerup - Get scraper status/info
export async function GET() {
  return NextResponse.json({
    platform: 'offerup',
    status: 'ready',
    supportedCategories: Object.keys(categoryMapping),
    supportedLocations,
    notes:
      'OfferUp scraping uses browser automation. Rate limits are enforced to respect TOS. Use location format: city-state (e.g., tampa-fl)',
    rateLimits: {
      requestDelayMs: RATE_LIMIT_DELAY_MS,
      maxRetries: MAX_RETRIES,
      maxListingsPerScrape: 50,
    },
  });
}

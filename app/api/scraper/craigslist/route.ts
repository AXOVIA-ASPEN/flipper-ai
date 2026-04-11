import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import prisma from '@/lib/db';
import { estimateValue, detectCategory, generatePurchaseMessage } from '@/lib/value-estimator';
import { getPlatformFeeRate, enrichOpportunitiesWithClaudeTier2, enrichWithCompletenessAndReputation } from '@/lib/marketplace-scanner';
import { analyzeLogistics } from '@/lib/logistics-analyzer';
import { identifyItem } from '@/lib/llm-identifier';
import { fetchMarketPrice, closeBrowser as closeMarketBrowser } from '@/lib/market-price';
import { findComparableSales, type CompMatchResult } from '@/lib/comp-matcher';
import { analyzeSellability, quickDiscountCheck } from '@/lib/llm-analyzer';
import { analyzeDemandTrend } from '@/lib/demand-analyzer';
import { lookupVerifiedMarketPrice } from '@/lib/market-value-calculator';
import { getAuthUserId } from '@/lib/auth-middleware';
import { sseEmitter } from '@/lib/sse-emitter';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { enforceTierLimits } from '@/lib/tier-enforcement';
import { computeEstimatedExpiry } from '@/lib/listing-expiry';
import { emitOpportunityFoundEvent } from '@/lib/notification-events';

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
      throw new UnauthorizedError('Unauthorized');
    }

    const userSettings = await prisma.userSettings.findUnique({ where: { userId } });
    const discountThreshold = userSettings?.discountThreshold ?? 50;
    const feeRate = getPlatformFeeRate('CRAIGSLIST', userSettings);
    const opportunityThreshold = userSettings?.opportunityThreshold ?? 70;

    const body = await request.json();
    const { location, category, keywords, minPrice, maxPrice } = body;

    if (!location || !category) {
      return NextResponse.json(
        { success: false, message: 'Location and category are required' },
        { status: 400 }
      );
    }

    // Enforce subscription tier limits (scan count + marketplace)
    await enforceTierLimits(userId, 'CRAIGSLIST');

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
    // Only save listings meeting the configured discountThreshold% undervalued requirement
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
          detectedCategory,
          feeRate
        );

        // Initialize LLM analysis fields
        let llmAnalyzed = false;
        let identification = null;
        let marketData = null;
        let sellabilityAnalysis = null;
        let verifiedMarketValue: number | null = null;
        let trueDiscountPercent: number | null = null;
        let meetsThreshold = false;
        let compMatchResult: CompMatchResult | null = null;

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
                    marketData,
                    discountThreshold,
                    feeRate
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

        // Story 4.4: Verified market price fallback when LLM pipeline didn't produce one
        if (!verifiedMarketValue && item.price > 0) {
          try {
            const vpResult = await lookupVerifiedMarketPrice(
              identification?.searchQuery || item.title,
              item.price,
              identification?.category || detectedCategory
            );
            if (vpResult) {
              verifiedMarketValue = vpResult.verifiedMarketValue;
              trueDiscountPercent = vpResult.trueDiscountPercent;
            }
          } catch (vpErr) {
            console.error(`Verified price lookup error for Craigslist item ${item.externalId}:`, vpErr);
          }
        }

        // Determine if we should save this listing
        // With LLM: only save if verified discountThreshold%+ undervalued (configurable per user)
        // Without LLM: fall back to algorithmic estimation (save if valueScore >= opportunityThreshold)
        const shouldSave = hasLLM
          ? meetsThreshold &&
            trueDiscountPercent !== null &&
            trueDiscountPercent >= discountThreshold
          : estimation.valueScore >= opportunityThreshold;

        if (!shouldSave) {
          skippedCount++;
          continue;
        }

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
              platform: 'CRAIGSLIST',
              category: detectedCategory,
              estimation,
              requestToBuy: '',
              isOpportunity: true,
            },
          ],
          userId
        );
        const claudeAnalysis = claudeEnriched.claudeAnalysis;

        // Step 4: Demand trend analysis (Story 5.3)
        const demandAnalysis = marketData ? analyzeDemandTrend(marketData.soldListings) : null;

        // Step 5: Comparable sold item matching (Story 5.2) — reuses fetched soldListings
        if (identification && marketData) {
          try {
            compMatchResult = await findComparableSales(
              identification.searchQuery,
              identification.brand ?? null,
              identification.model ?? null,
              identification.category,
              marketData.soldListings
            );
          } catch (compErr) {
            console.error(`Comp matching error for ${item.externalId}:`, compErr);
          }
        }

        // Step 6a: Item completeness & seller reputation enrichment (Story 5.4)
        // Craigslist has no seller rating data — completeness analysis only (if images available)
        const [enriched54] = await enrichWithCompletenessAndReputation([{
          externalId: item.externalId,
          url: item.url,
          title: item.title,
          description: item.description,
          askingPrice: item.price,
          imageUrls: item.imageUrls,
          platform: 'CRAIGSLIST',
          category: identification?.category || detectedCategory,
          estimation,
          requestToBuy: '',
          isOpportunity: true,
        }]);
        const completenessLabel = enriched54.completenessAnalysis?.completenessLabel ?? null;

        // Step 6b: Logistics & shipping cost analysis (Story 5.5)
        let logisticsAnalysis = null;
        try {
          logisticsAnalysis = await analyzeLogistics(
            { title: item.title, description: item.description, category: identification?.category || detectedCategory, location: item.location, estimation },
            userSettings?.homeLocation ?? null,
            userSettings?.maxPickupRadiusMiles ?? 50
          );
        } catch (logErr) {
          console.error(`Logistics analysis error for ${item.externalId}:`, logErr);
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
          estimatedExpiresAt: computeEstimatedExpiry('CRAIGSLIST', item.postedAt ?? null),

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

          // Metadata — Story 5.5: logistics classification overrides algorithmic shippable
          shippable: logisticsAnalysis
            ? logisticsAnalysis.sizeCategory !== 'large_local_only'
            : estimation.shippable,
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
          comparableSalesJson: compMatchResult
            ? JSON.stringify(compMatchResult.comps)
            : marketData ? JSON.stringify(marketData.soldListings.slice(0, 5)) : null,
          compMatchConfidence: compMatchResult?.confidence ?? null,

          // LLM Sellability Analysis
          sellabilityScore: sellabilityAnalysis?.sellabilityScore || null,
          // Story 5.3: Demand analysis takes priority over sellability demandLevel
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
          sellerRating: null,           // Craigslist does not expose seller rating data
          sellerReviewCount: null,
          sellerAccountAgeDays: null,

          // Story 5.5: Logistics and shipping analysis
          sizeCategory: logisticsAnalysis?.sizeCategory ?? null,
          shippingEstimatesJson: logisticsAnalysis?.shippingEstimates
            ? JSON.stringify(logisticsAnalysis.shippingEstimates)
            : null,
          estimatedShippingCost: logisticsAnalysis?.estimatedShippingCost ?? null,
          pickupDistanceMiles: logisticsAnalysis?.pickupDistanceMiles ?? null,
          outsidePickupRadius: logisticsAnalysis?.outsidePickupRadius ?? null,
          adjustedProfitMargin: logisticsAnalysis?.adjustedProfitMargin ?? null,
          estimatedWeight: logisticsAnalysis?.estimatedWeightLbs ?? null,

          // True discount
          trueDiscountPercent: trueDiscountPercent,

          // Analysis metadata
          llmAnalyzed,
          analysisDate: llmAnalyzed ? new Date() : null,
          // Claude Tier 2 takes priority; fall back to sellability (Story 5.1)
          analysisConfidence: claudeAnalysis?.confidence ?? sellabilityAnalysis?.confidence ?? null,
          analysisReasoning: claudeAnalysis?.reasoning ?? sellabilityAnalysis?.reasoning ?? null,

          // Status - all saved listings are opportunities now
          status: 'OPPORTUNITY',
        };

        // Upsert to database
        const savedListing = await prisma.listing.upsert({
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

        // Cache Claude Tier 2 result for reuse (Story 5.1)
        if (claudeAnalysis) {
          try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            await prisma.aiAnalysisCache.create({
              data: {
                listingId: savedListing.id,
                analysisResult: JSON.stringify(claudeAnalysis),
                expiresAt,
              },
            });
          } catch (cacheErr) {
            console.error(`Failed to cache Claude analysis for ${item.externalId}:`, cacheErr);
          }
        }

        // Emit SSE event for real-time notification
        await sseEmitter.emit({
          type: 'listing.found',
          data: {
            id: savedListing.id,
            platform: 'CRAIGSLIST',
            title: item.title,
            price: item.price,
            discount: trueDiscountPercent || estimation.discountPercent,
            url: item.url,
            imageUrl: item.imageUrls?.[0],
            location: item.location,
          },
        });

        // Story 10.3: Emit opportunity.found notification event (fire-and-forget).
        // emitOpportunityFoundEvent handles its own errors internally — void ensures
        // a failure here can never propagate and abort the scraper run.
        void emitOpportunityFoundEvent(savedListing, userId);

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
      ? `LLM-verified (${discountThreshold}%+ undervalued only)`
      : 'algorithmic (score >= 70)';
    const message = hasLLM
      ? `Analyzed ${listings.length} listings, found ${opportunitiesFound} opportunities (${skippedCount} didn't meet ${discountThreshold}% threshold)`
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

    // For auth/tier errors, return immediately without updating job
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

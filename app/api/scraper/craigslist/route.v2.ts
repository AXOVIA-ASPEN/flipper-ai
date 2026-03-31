/**
 * Updated Craigslist API route that delegates to Cloud Functions
 * This version calls the Cloud Function for scraping, then processes results locally
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-middleware';
import { scrapeCraigslist } from '@/lib/cloud-functions';
import prisma from '@/lib/db';
import { estimateValue, detectCategory, generatePurchaseMessage } from '@/lib/value-estimator';
import { getPlatformFeeRate } from '@/lib/marketplace-scanner';
import { analyzeListingData } from '@/lib/claude-analyzer';
import { lookupVerifiedMarketPrice } from '@/lib/market-value-calculator';
import { closeBrowser } from '@/lib/market-price';

// POST /api/scraper/craigslist - Run scraper via Cloud Function
export async function POST(request: NextRequest) {
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

    // Fetch user settings once at scrape start (prevents race condition if user changes mid-scrape)
    const userSettings = await prisma.userSettings.findUnique({ where: { userId } });
    const feeRate = getPlatformFeeRate('CRAIGSLIST', userSettings);
    const opportunityThreshold = userSettings?.opportunityThreshold ?? 70;

    // Call Cloud Function to scrape
    const result = await scrapeCraigslist({
      userId,
      location,
      category,
      keywords,
      minPrice,
      maxPrice,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || 'Scraping failed' },
        { status: 500 }
      );
    }

    // Process and save listings with value estimation
    const listings = (result.listings || []) as Array<{
      title: string;
      price: string;
      url: string;
      externalId: string;
      location?: string;
      imageUrl?: string;
      images?: string[];
      description?: string;
    }>;
    let savedCount = 0;

    for (const item of listings) {
      try {
        // Detect category
        const detectedCategory = detectCategory(item.title, null);

        // Estimate value using user's platform fee rate (Craigslist default: 0%)
        const estimation = estimateValue(
          item.title,
          null,
          parseFloat(item.price.replace(/[^0-9.]/g, '')),
          null,
          detectedCategory,
          feeRate
        );

        // Only save if value score meets user's configurable opportunity threshold
        if (estimation.valueScore < opportunityThreshold) {
          continue;
        }

        // Generate purchase message
        const requestToBuy = generatePurchaseMessage(
          item.title,
          parseFloat(item.price.replace(/[^0-9.]/g, '')),
          estimation.negotiable,
          null
        );

        // Story 4.4: Verified market price lookup
        let verifiedMarketValue: number | null = null;
        let trueDiscountPercent: number | null = null;
        const askingPrice = parseFloat(item.price.replace(/[^0-9.]/g, ''));
        try {
          const vpResult = await lookupVerifiedMarketPrice(item.title, askingPrice, detectedCategory);
          if (vpResult) {
            verifiedMarketValue = vpResult.verifiedMarketValue;
            trueDiscountPercent = vpResult.trueDiscountPercent;
          }
        } catch (vpErr) {
          console.error(`Verified price lookup error for Craigslist item ${item.externalId}:`, vpErr);
        }

        // Claude Tier 2 structural analysis (Story 5.1)
        let claudeAnalysis = null;
        try {
          claudeAnalysis = await analyzeListingData(
            item.title,
            item.description || null,
            parseFloat(item.price.replace(/[^0-9.]/g, '')),
            item.images ? item.images : item.imageUrl ? [item.imageUrl] : undefined,
            userId
          );
        } catch (claudeError) {
          console.error(`Claude Tier 2 analysis failed for listing ${item.externalId}:`, claudeError);
        }

        // Save to database
        const savedListing = await prisma.listing.upsert({
          where: {
            platform_externalId_userId: {
              platform: 'CRAIGSLIST',
              externalId: item.externalId,
              userId,
            },
          },
          create: {
            userId,
            externalId: item.externalId,
            platform: 'CRAIGSLIST',
            url: item.url,
            title: item.title,
            askingPrice: parseFloat(item.price.replace(/[^0-9.]/g, '')),
            location: item.location,
            imageUrls: item.imageUrl ? JSON.stringify([item.imageUrl]) : null,
            category: detectedCategory,
            estimatedValue: estimation.estimatedValue,
            estimatedLow: estimation.estimatedLow,
            estimatedHigh: estimation.estimatedHigh,
            profitPotential: estimation.profitPotential,
            profitLow: estimation.profitLow,
            profitHigh: estimation.profitHigh,
            valueScore: estimation.valueScore,
            discountPercent: estimation.discountPercent,
            resaleDifficulty: estimation.resaleDifficulty,
            comparableUrls: JSON.stringify(estimation.comparableUrls),
            priceReasoning: estimation.reasoning,
            notes: estimation.notes,
            shippable: estimation.shippable,
            negotiable: estimation.negotiable,
            tags: JSON.stringify(estimation.tags),
            requestToBuy,
            status: 'OPPORTUNITY',
            verifiedMarketValue,
            trueDiscountPercent,
            marketDataSource: verifiedMarketValue ? 'ebay_scrape' : null,
            marketDataDate: verifiedMarketValue ? new Date() : null,
            analysisConfidence: claudeAnalysis?.confidence ?? null,
            analysisReasoning: claudeAnalysis?.reasoning ?? null,
          },
          update: {
            askingPrice: parseFloat(item.price.replace(/[^0-9.]/g, '')),
            estimatedValue: estimation.estimatedValue,
            valueScore: estimation.valueScore,
            discountPercent: estimation.discountPercent,
            verifiedMarketValue,
            trueDiscountPercent,
            marketDataSource: verifiedMarketValue ? 'ebay_scrape' : null,
            marketDataDate: verifiedMarketValue ? new Date() : null,
            analysisConfidence: claudeAnalysis?.confidence ?? null,
            analysisReasoning: claudeAnalysis?.reasoning ?? null,
          },
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

        savedCount++;
      } catch (error) {
        console.error(`Error processing listing ${item.externalId}:`, error);
      }
    }

    await closeBrowser();

    return NextResponse.json({
      success: true,
      message: `Scraped ${listings.length} listings, saved ${savedCount} opportunities`,
      listings: listings.slice(0, 10), // Return first 10 for preview
      savedCount,
      totalScraped: listings.length,
      jobId: result.jobId,
    });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to scrape listings',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET /api/scraper/craigslist - Get scraper status
export async function GET() {
  return NextResponse.json({
    platform: 'craigslist',
    status: 'ready',
    mode: 'cloud-function',
    supportedCategories: [
      'electronics',
      'furniture',
      'appliances',
      'sporting',
      'tools',
      'jewelry',
      'antiques',
      'video_gaming',
      'music_instr',
      'computers',
      'cell_phones',
    ],
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

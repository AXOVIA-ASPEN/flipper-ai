/**
 * Updated Craigslist API route that delegates to Cloud Functions
 * This version calls the Cloud Function for scraping, then processes results locally
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-middleware';
import { scrapeCraigslist } from '@/lib/cloud-functions';
import prisma from '@/lib/db';
import { estimateValue, detectCategory, generatePurchaseMessage } from '@/lib/value-estimator';

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

        // Estimate value
        const estimation = estimateValue(
          item.title,
          null,
          parseFloat(item.price.replace(/[^0-9.]/g, '')),
          null,
          detectedCategory
        );

        // Only save if value score is high enough
        if (estimation.valueScore < 70) {
          continue;
        }

        // Generate purchase message
        const requestToBuy = generatePurchaseMessage(
          item.title,
          parseFloat(item.price.replace(/[^0-9.]/g, '')),
          estimation.negotiable,
          null
        );

        // Save to database
        await prisma.listing.upsert({
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
          },
          update: {
            askingPrice: parseFloat(item.price.replace(/[^0-9.]/g, '')),
            estimatedValue: estimation.estimatedValue,
            valueScore: estimation.valueScore,
            discountPercent: estimation.discountPercent,
          },
        });

        savedCount++;
      } catch (error) {
        console.error(`Error processing listing ${item.externalId}:`, error);
      }
    }

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

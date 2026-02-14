import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { scrapeAndConvert, FacebookScraperConfig } from "@/scrapers/facebook";
import {
  processListings,
  formatForStorage,
  generateScanSummary,
  ViabilityCriteria,
} from "@/lib/marketplace-scanner";

// POST /api/scrape/facebook - Trigger a Facebook Marketplace scrape
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const {
      // Scraper config
      location,
      category,
      keywords,
      minPrice,
      maxPrice,
      maxListings,
      includeDetails,
      sortBy,
      // Viability criteria
      minValueScore,
      minProfitPotential,
      requireShippable,
      excludeCategories,
      includeCategories,
      maxResaleDifficulty,
    } = body;

    // Build scraper config
    const scraperConfig: FacebookScraperConfig = {
      location,
      category,
      keywords,
      minPrice,
      maxPrice,
      maxListings: maxListings || 20,
      includeDetails: includeDetails ?? true,
      sortBy,
    };

    // Build viability criteria
    const viabilityCriteria: ViabilityCriteria = {
      minValueScore: minValueScore ?? 70,
      minProfitPotential,
      requireShippable,
      excludeCategories,
      includeCategories,
      maxResaleDifficulty,
      maxAskingPrice: maxPrice,
    };

    // Create a scraper job record
    const job = await prisma.scraperJob.create({
      data: {
        platform: "FACEBOOK_MARKETPLACE",
        location: location || null,
        category: category || null,
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    console.log(`Starting Facebook Marketplace scrape job: ${job.id}`);

    // Run the scraper
    const scrapeResult = await scrapeAndConvert(scraperConfig);

    if (!scrapeResult.success) {
      // Update job as failed
      await prisma.scraperJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: scrapeResult.error,
          completedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: scrapeResult.error,
          jobId: job.id,
        },
        { status: 500 }
      );
    }

    // Process listings through central viability logic
    const processedResults = processListings(
      "FACEBOOK_MARKETPLACE",
      scrapeResult.listings,
      viabilityCriteria
    );

    // Save all listings to database
    const savedListings = [];
    for (const analyzed of processedResults.all) {
      const storageData = formatForStorage(analyzed);

      try {
        const listing = await prisma.listing.upsert({
          where: {
            platform_externalId_userId: {
              platform: "FACEBOOK_MARKETPLACE",
              externalId: analyzed.externalId,
              userId,
            },
          },
          create: storageData as Parameters<typeof prisma.listing.create>[0]["data"],
          update: {
            ...storageData,
            scrapedAt: new Date(),
          } as Parameters<typeof prisma.listing.update>[0]["data"],
        });
        savedListings.push(listing);
      } catch (err) {
        console.error(`Error saving listing ${analyzed.externalId}:`, err);
      }
    }

    // Generate summary
    const summary = generateScanSummary(processedResults);

    // Update job as completed
    await prisma.scraperJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        listingsFound: processedResults.all.length,
        opportunitiesFound: processedResults.opportunities.length,
        completedAt: new Date(),
      },
    });

    console.log(`Scrape job ${job.id} completed: ${processedResults.all.length} listings, ${processedResults.opportunities.length} opportunities`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      summary: {
        totalListings: summary.totalListings,
        opportunities: summary.totalOpportunities,
        filteredMatches: summary.filteredCount,
        averageScore: summary.averageScore,
        totalPotentialProfit: summary.totalPotentialProfit,
        categoryCounts: summary.categoryCounts,
      },
      bestOpportunity: summary.bestOpportunity
        ? {
            title: summary.bestOpportunity.title,
            askingPrice: summary.bestOpportunity.askingPrice,
            valueScore: summary.bestOpportunity.estimation.valueScore,
            profitPotential: summary.bestOpportunity.estimation.profitPotential,
          }
        : null,
      listings: savedListings.map((l) => ({
        id: l.id,
        title: l.title,
        askingPrice: l.askingPrice,
        valueScore: l.valueScore,
        profitPotential: l.profitPotential,
        status: l.status,
      })),
    });
  } catch (error) {
    console.error("Error in Facebook scraper endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to run scraper",
      },
      { status: 500 }
    );
  }
}

// GET /api/scrape/facebook - Get scraper job status and history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (jobId) {
      // Get specific job
      const job = await prisma.scraperJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        return NextResponse.json(
          { error: "Job not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(job);
    }

    // Get recent jobs
    const jobs = await prisma.scraperJob.findMany({
      where: { platform: "FACEBOOK_MARKETPLACE" },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching scraper jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch scraper jobs" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import prisma from "@/lib/db";
import { estimateValue, detectCategory, generatePurchaseMessage } from "@/lib/value-estimator";

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
    return parseFloat(match[1].replace(/,/g, ""));
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
  electronics: "ela",
  furniture: "fua",
  appliances: "ppa",
  sporting: "sga",
  tools: "tla",
  jewelry: "jwa",
  antiques: "ata",
  video_gaming: "vga",
  music_instr: "msa",
  computers: "sya",
  cell_phones: "moa",
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
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  try {
    // Build search URL
    const baseUrl = `https://${location}.craigslist.org`;
    const categoryPath = categoryPaths[category] || "sss";
    const searchParams = new URLSearchParams();

    if (query) searchParams.set("query", query);
    if (minPrice) searchParams.set("min_price", minPrice.toString());
    if (maxPrice) searchParams.set("max_price", maxPrice.toString());

    const searchUrl = `${baseUrl}/search/${categoryPath}?${searchParams.toString()}`;
    console.log(`Navigating to: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for listings to load
    await page.waitForSelector(".cl-search-result, .result-row, .gallery-card, li.cl-static-search-result", { timeout: 10000 }).catch(() => {
      console.log("No standard listing selector found, trying alternate approach");
    });

    // Extract listings using page.evaluate
    const listings = await page.evaluate(() => {
      const items: Array<{
        title: string;
        price: string;
        url: string;
        location: string;
        imageUrl?: string;
      }> = [];

      // Try multiple selector patterns (Craigslist UI changes)
      const selectors = [
        ".cl-search-result",
        ".result-row",
        ".gallery-card",
        "li.cl-static-search-result"
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

      for (const el of listingElements.slice(0, 50)) { // Limit to 50 listings
        try {
          // Extract title
          const titleEl = el.querySelector(".posting-title, .result-title, .titlestring, a.posting-title, .label") as HTMLElement;
          const title = titleEl?.innerText?.trim() || el.querySelector("a")?.innerText?.trim() || "";

          // Extract URL
          const linkEl = el.querySelector("a[href*='/']") as HTMLAnchorElement;
          const url = linkEl?.href || "";

          // Extract price
          const priceEl = el.querySelector(".priceinfo, .result-price, .price") as HTMLElement;
          const price = priceEl?.innerText?.trim() || "$0";

          // Extract location
          const locationEl = el.querySelector(".meta, .result-hood, .location, .supertitle") as HTMLElement;
          const location = locationEl?.innerText?.replace(/[()]/g, "").trim() || "";

          // Extract image
          const imgEl = el.querySelector("img") as HTMLImageElement;
          const imageUrl = imgEl?.src || "";

          if (title && url && !title.includes("sponsored")) {
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
    const body = await request.json();
    const { location, category, keywords, minPrice, maxPrice } = body;

    if (!location || !category) {
      return NextResponse.json(
        { success: false, message: "Location and category are required" },
        { status: 400 }
      );
    }

    // Create scraper job record
    job = await prisma.scraperJob.create({
      data: {
        platform: "CRAIGSLIST",
        location,
        category,
        status: "RUNNING",
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
          status: "COMPLETED",
          listingsFound: 0,
          opportunitiesFound: 0,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "No listings found matching your criteria. Try different search parameters.",
        listings: [],
        savedCount: 0,
        jobId: job.id,
      });
    }

    // Save listings to database with value estimation
    let savedCount = 0;
    let opportunitiesFound = 0;
    const savedListings: Array<{
      title: string;
      price: string;
      location: string;
      url: string;
      imageUrl?: string;
    }> = [];

    for (const item of listings) {
      try {
        // Skip items without price
        if (item.price <= 0) continue;

        // Detect category for estimation
        const detectedCategory = detectCategory(item.title, item.description || null);

        // Estimate value
        const estimation = estimateValue(
          item.title,
          item.description || null,
          item.price,
          null, // condition not known
          detectedCategory
        );

        // Generate purchase message
        const requestToBuy = generatePurchaseMessage(
          item.title,
          item.price,
          estimation.negotiable,
          null
        );

        // Upsert to database
        await prisma.listing.upsert({
          where: {
            platform_externalId: {
              platform: "CRAIGSLIST",
              externalId: item.externalId,
            },
          },
          create: {
            externalId: item.externalId,
            platform: "CRAIGSLIST",
            url: item.url,
            title: item.title,
            description: item.description,
            askingPrice: item.price,
            location: item.location,
            imageUrls: item.imageUrls ? JSON.stringify(item.imageUrls) : null,
            category: detectedCategory,
            postedAt: item.postedAt,

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
            notes: estimation.notes,

            // Metadata
            shippable: estimation.shippable,
            negotiable: estimation.negotiable,
            tags: JSON.stringify(estimation.tags),
            requestToBuy,

            // Status
            status: estimation.valueScore >= 70 ? "OPPORTUNITY" : "NEW",
          },
          update: {
            title: item.title,
            description: item.description,
            askingPrice: item.price,
            location: item.location,
            imageUrls: item.imageUrls ? JSON.stringify(item.imageUrls) : null,

            // Update estimation
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
          },
        });

        savedCount++;
        if (estimation.valueScore >= 70) {
          opportunitiesFound++;
        }
        savedListings.push({
          title: item.title,
          price: `$${item.price}`,
          location: item.location,
          url: item.url,
          imageUrl: item.imageUrls?.[0],
        });
      } catch (error) {
        console.error(`Error saving listing ${item.externalId}:`, error);
      }
    }

    // Update job as completed
    if (job) {
      await prisma.scraperJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          listingsFound: savedCount,
          opportunitiesFound,
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully scraped ${listings.length} listings`,
      listings: savedListings,
      savedCount,
      opportunitiesFound,
      jobId: job?.id,
    });
  } catch (error) {
    console.error("Scraper error:", error);

    // Update job as failed
    if (job) {
      await prisma.scraperJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to scrape listings",
        error: error instanceof Error ? error.message : "Unknown error",
        jobId: job?.id,
      },
      { status: 500 }
    );
  }
}

// GET /api/scraper/craigslist - Get scraper status/info
export async function GET() {
  return NextResponse.json({
    platform: "craigslist",
    status: "ready",
    supportedCategories: Object.keys(categoryPaths),
    supportedLocations: [
      "sarasota",
      "tampa",
      "orlando",
      "miami",
      "jacksonville",
      "sfbay",
      "losangeles",
      "newyork",
      "chicago",
      "seattle",
      "austin",
      "denver",
    ],
  });
}

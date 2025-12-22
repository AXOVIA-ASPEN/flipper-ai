import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { estimateValue, detectCategory, generatePurchaseMessage } from "@/lib/value-estimator";
import { getAuthUserId } from "@/lib/auth-middleware";

// GET /api/listings - Get all listings with optional filters
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const status = searchParams.get("status");
    const minScore = searchParams.get("minScore");
    const location = searchParams.get("location");
    const category = searchParams.get("category");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};

    // Filter by user - show user's listings OR legacy listings (null userId)
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    if (platform) where.platform = platform;
    if (status) where.status = status;
    if (minScore) where.valueScore = { gte: parseFloat(minScore) };
    if (location) where.location = { contains: location };
    if (category) where.category = category;
    if (minPrice || maxPrice) {
      where.askingPrice = {
        ...(minPrice && { gte: parseFloat(minPrice) }),
        ...(maxPrice && { lte: parseFloat(maxPrice) }),
      };
    }
    if (dateFrom || dateTo) {
      where.scrapedAt = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      };
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { scrapedAt: "desc" },
        take: limit,
        skip: offset,
        include: { opportunity: true },
      }),
      prisma.listing.count({ where }),
    ]);

    return NextResponse.json({
      listings,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

// POST /api/listings - Create a new listing (usually from scraper)
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();
    const {
      externalId,
      platform,
      url,
      title,
      description,
      askingPrice,
      condition,
      location,
      sellerName,
      sellerContact,
      imageUrls,
      category,
      postedAt,
    } = body;

    // Validate required fields
    if (!externalId || !platform || !url || !title || askingPrice === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: externalId, platform, url, title, askingPrice" },
        { status: 400 }
      );
    }

    // Detect category if not provided
    const detectedCategory = category || detectCategory(title, description);

    // Estimate value (includes all analysis fields)
    const estimation = estimateValue(
      title,
      description,
      askingPrice,
      condition,
      detectedCategory
    );

    // Enforce minimum discount threshold (70% or more undervalued)
    if (!Number.isFinite(estimation.discountPercent) || estimation.discountPercent < 70) {
      // Clean up any existing record for this listing so only premium deals remain
      await prisma.listing.deleteMany({
        where: {
          platform,
          externalId,
          userId,
        },
      });

      return NextResponse.json(
        {
          skipped: true,
          reason: "Listing discount below 70% threshold",
          discountPercent: estimation.discountPercent,
        },
        { status: 200 }
      );
    }

    // Generate purchase request message
    const requestToBuy = generatePurchaseMessage(
      title,
      askingPrice,
      estimation.negotiable,
      sellerName
    );

    // Create or update listing with all fields
    const listing = await prisma.listing.upsert({
      where: {
        platform_externalId_userId: { platform, externalId, userId },
      },
      create: {
        // User association
        userId,
        // Basic info
        externalId,
        platform,
        url,
        title,
        description,
        askingPrice,
        condition,
        location,
        sellerName,
        sellerContact,
        imageUrls: imageUrls ? JSON.stringify(imageUrls) : null,
        category: detectedCategory,
        postedAt: postedAt ? new Date(postedAt) : null,

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
        // Basic info updates
        title,
        description,
        askingPrice,
        condition,
        location,
        sellerName,
        sellerContact,
        imageUrls: imageUrls ? JSON.stringify(imageUrls) : null,

        // Value estimation updates
        estimatedValue: estimation.estimatedValue,
        estimatedLow: estimation.estimatedLow,
        estimatedHigh: estimation.estimatedHigh,
        profitPotential: estimation.profitPotential,
        profitLow: estimation.profitLow,
        profitHigh: estimation.profitHigh,
        valueScore: estimation.valueScore,
        discountPercent: estimation.discountPercent,
        resaleDifficulty: estimation.resaleDifficulty,

        // Market references updates
        comparableUrls: JSON.stringify(estimation.comparableUrls),
        priceReasoning: estimation.reasoning,
        notes: estimation.notes,

        // Metadata updates
        shippable: estimation.shippable,
        negotiable: estimation.negotiable,
        tags: JSON.stringify(estimation.tags),
        requestToBuy,
      },
    });

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error("Error creating listing:", error);
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 }
    );
  }
}

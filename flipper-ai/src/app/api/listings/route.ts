import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { estimateValue, detectCategory } from "@/lib/value-estimator";

// GET /api/listings - Get all listings with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const status = searchParams.get("status");
    const minScore = searchParams.get("minScore");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};
    if (platform) where.platform = platform;
    if (status) where.status = status;
    if (minScore) where.valueScore = { gte: parseFloat(minScore) };

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

    // Estimate value
    const estimation = estimateValue(
      title,
      description,
      askingPrice,
      condition,
      detectedCategory
    );

    // Create or update listing
    const listing = await prisma.listing.upsert({
      where: {
        platform_externalId: { platform, externalId },
      },
      create: {
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
        estimatedValue: estimation.estimatedValue,
        profitPotential: estimation.profitPotential,
        valueScore: estimation.valueScore,
        status: estimation.valueScore >= 70 ? "OPPORTUNITY" : "NEW",
      },
      update: {
        title,
        description,
        askingPrice,
        condition,
        location,
        sellerName,
        sellerContact,
        imageUrls: imageUrls ? JSON.stringify(imageUrls) : null,
        estimatedValue: estimation.estimatedValue,
        profitPotential: estimation.profitPotential,
        valueScore: estimation.valueScore,
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

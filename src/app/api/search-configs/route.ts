import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthUserId } from "@/lib/auth-middleware";

// GET /api/search-configs - List all search configurations
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get("enabled") === "true";

    const where: Record<string, unknown> = {};

    // Filter by user - show user's configs OR legacy configs (null userId)
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    if (enabledOnly) {
      where.enabled = true;
    }

    const configs = await prisma.searchConfig.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      configs,
      total: configs.length,
    });
  } catch (error) {
    console.error("Error fetching search configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch search configurations" },
      { status: 500 }
    );
  }
}

// POST /api/search-configs - Create a new search configuration
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();
    const { name, platform, location, category, keywords, minPrice, maxPrice, enabled } = body;

    // Validate required fields
    if (!name || !platform || !location) {
      return NextResponse.json(
        { error: "Name, platform, and location are required" },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms = ["CRAIGSLIST", "FACEBOOK_MARKETPLACE", "EBAY", "OFFERUP"];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(", ")}` },
        { status: 400 }
      );
    }

    const config = await prisma.searchConfig.create({
      data: {
        userId,
        name,
        platform,
        location,
        category: category || null,
        keywords: keywords || null,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        enabled: enabled !== false, // Default to true
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error("Error creating search config:", error);
    return NextResponse.json(
      { error: "Failed to create search configuration" },
      { status: 500 }
    );
  }
}

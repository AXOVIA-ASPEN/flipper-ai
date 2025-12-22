import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/search-configs - List all search configurations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get("enabled") === "true";

    const configs = await prisma.searchConfig.findMany({
      where: enabledOnly ? { enabled: true } : undefined,
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

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthUserId } from "@/lib/auth-middleware";

// GET /api/scraper-jobs - List all scraper jobs
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};

    // Filter by user - show user's jobs OR legacy jobs (null userId)
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    if (status) where.status = status;
    if (platform) where.platform = platform;

    const jobs = await prisma.scraperJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      jobs,
      total: jobs.length,
    });
  } catch (error) {
    console.error("Error fetching scraper jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch scraper jobs" },
      { status: 500 }
    );
  }
}

// POST /api/scraper-jobs - Create a new scraper job
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();
    const { platform, location, category } = body;

    // Validate required fields
    if (!platform) {
      return NextResponse.json(
        { error: "Platform is required" },
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

    const job = await prisma.scraperJob.create({
      data: {
        userId,
        platform,
        location: location || null,
        category: category || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Error creating scraper job:", error);
    return NextResponse.json(
      { error: "Failed to create scraper job" },
      { status: 500 }
    );
  }
}

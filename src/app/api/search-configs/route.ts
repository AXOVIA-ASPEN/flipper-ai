import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAuthUserId } from "@/lib/auth-middleware";
import {
  SearchConfigQuerySchema,
  CreateSearchConfigSchema,
  validateQuery,
  validateBody,
} from "@/lib/validations";

// GET /api/search-configs - List all search configurations
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);

    const parsed = validateQuery(SearchConfigQuerySchema, searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = {};

    // Filter by user - show user's configs OR legacy configs (null userId)
    if (userId) {
      where.OR = [{ userId }, { userId: null }];
    }

    if (parsed.data.enabled === "true") {
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
    const parsed = validateBody(CreateSearchConfigSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error },
        { status: 400 }
      );
    }
    const { name, platform, location, category, keywords, minPrice, maxPrice, enabled } = parsed.data;

    const config = await prisma.searchConfig.create({
      data: {
        userId,
        name,
        platform,
        location,
        category: category || null,
        keywords: keywords || null,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null,
        enabled,
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

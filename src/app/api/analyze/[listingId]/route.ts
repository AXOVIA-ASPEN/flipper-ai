/**
 * API Route: POST /api/analyze/[listingId]
 * Author: Stephen Boyett
 * Company: Axovia AI
 * 
 * Analyze a listing using Claude AI.
 * Returns structured analysis with caching.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeListing } from "@/lib/claude-analyzer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;

    if (!listingId) {
      return NextResponse.json(
        { error: "Listing ID is required" },
        { status: 400 }
      );
    }

    const analysis = await analyzeListing(listingId);

    return NextResponse.json({
      success: true,
      listingId,
      analysis,
    });
  } catch (error) {
    console.error("Error analyzing listing:", error);

    if (error instanceof Error) {
      // Check for specific errors
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: "Listing not found" },
          { status: 404 }
        );
      }

      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }

      if (error.message.includes("API_KEY")) {
        return NextResponse.json(
          { error: "Claude API not configured" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to analyze listing" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if analysis exists in cache
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;

    if (!listingId) {
      return NextResponse.json(
        { error: "Listing ID is required" },
        { status: 400 }
      );
    }

    // Try to get from cache (without triggering new analysis)
    const { default: prisma } = await import("@/lib/db");

    const cached = await prisma.aiAnalysisCache.findFirst({
      where: {
        listingId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (cached) {
      const analysis = JSON.parse(cached.analysisResult);
      return NextResponse.json({
        success: true,
        cached: true,
        listingId,
        analysis,
        cachedAt: cached.createdAt,
        expiresAt: cached.expiresAt,
      });
    }

    return NextResponse.json({
      success: true,
      cached: false,
      listingId,
    });
  } catch (error) {
    console.error("Error checking analysis cache:", error);
    return NextResponse.json(
      { error: "Failed to check cache" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/opportunities - Get all opportunities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { listing: true },
      }),
      prisma.opportunity.count({ where }),
    ]);

    // Calculate summary stats
    const stats = await prisma.opportunity.aggregate({
      _sum: {
        actualProfit: true,
        purchasePrice: true,
        resalePrice: true,
      },
      _count: true,
    });

    return NextResponse.json({
      opportunities,
      total,
      limit,
      offset,
      stats: {
        totalOpportunities: stats._count,
        totalProfit: stats._sum.actualProfit || 0,
        totalInvested: stats._sum.purchasePrice || 0,
        totalRevenue: stats._sum.resalePrice || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}

// POST /api/opportunities - Create an opportunity from a listing
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId, notes } = body;

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 }
      );
    }

    // Check if listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Check if opportunity already exists
    const existing = await prisma.opportunity.findUnique({
      where: { listingId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Opportunity already exists for this listing" },
        { status: 409 }
      );
    }

    // Create opportunity and update listing status
    const [opportunity] = await prisma.$transaction([
      prisma.opportunity.create({
        data: {
          listingId,
          notes,
          status: "IDENTIFIED",
        },
        include: { listing: true },
      }),
      prisma.listing.update({
        where: { id: listingId },
        data: { status: "OPPORTUNITY" },
      }),
    ]);

    return NextResponse.json(opportunity, { status: 201 });
  } catch (error) {
    console.error("Error creating opportunity:", error);
    return NextResponse.json(
      { error: "Failed to create opportunity" },
      { status: 500 }
    );
  }
}

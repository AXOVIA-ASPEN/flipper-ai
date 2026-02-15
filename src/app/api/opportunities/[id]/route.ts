import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/opportunities/[id] - Get a single opportunity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(opportunity);
  } catch (error) {
    console.error("Error fetching opportunity:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunity" },
      { status: 500 }
    );
  }
}

// PATCH /api/opportunities/[id] - Update an opportunity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Calculate actualProfit if purchasePrice, resalePrice, and fees are provided
    const updateData = { ...body };
    if (
      body.purchasePrice !== undefined &&
      body.resalePrice !== undefined
    ) {
      const fees = body.fees || 0;
      updateData.actualProfit = body.resalePrice - body.purchasePrice - fees;
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: updateData,
      include: { listing: true },
    });

    return NextResponse.json(opportunity);
  } catch (error) {
    console.error("Error updating opportunity:", error);
    return NextResponse.json(
      { error: "Failed to update opportunity" },
      { status: 500 }
    );
  }
}

// DELETE /api/opportunities/[id] - Delete an opportunity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get the opportunity to find the listing
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      select: { listingId: true },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    // Delete opportunity and reset listing status
    await prisma.$transaction([
      prisma.opportunity.delete({
        where: { id },
      }),
      prisma.listing.update({
        where: { id: opportunity.listingId },
        data: { status: "NEW" },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting opportunity:", error);
    return NextResponse.json(
      { error: "Failed to delete opportunity" },
      { status: 500 }
    );
  }
}


// API Route: /api/listings/[id]/market-value
// Update a listing with verified market value from eBay sold data

import { NextRequest, NextResponse } from "next/server";
import { updateListingWithMarketValue } from "@/lib/price-history-service";

// POST /api/listings/[id]/market-value
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listingId = params.id;

    if (!listingId) {
      return NextResponse.json(
        { error: "Listing ID is required" },
        { status: 400 }
      );
    }

    await updateListingWithMarketValue(listingId);

    return NextResponse.json({
      success: true,
      message: `Updated listing ${listingId} with verified market value`,
    });
  } catch (error) {
    console.error("Error updating listing market value:", error);
    
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update listing market value" },
      { status: 500 }
    );
  }
}

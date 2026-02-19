// API Route: /api/listings/[id]/market-value
// Update a listing with verified market value from eBay sold data

import { NextRequest, NextResponse } from 'next/server';
import { updateListingWithMarketValue } from '@/lib/price-history-service';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
// POST /api/listings/[id]/market-value
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: listingId } = await params;

    if (!listingId) {
      throw new ValidationError('Listing ID is required');
    }

    await updateListingWithMarketValue(listingId);

    return NextResponse.json({
      success: true,
      message: `Updated listing ${listingId} with verified market value`,
    });
  } catch (error) {
    console.error('Error updating listing market value:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update listing market value');
  }
}

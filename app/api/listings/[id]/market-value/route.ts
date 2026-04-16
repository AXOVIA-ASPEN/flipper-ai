// API Route: /api/listings/[id]/market-value
// Update a listing with verified market value from eBay sold data

import { NextRequest, NextResponse } from 'next/server';
import { updateListingWithMarketValue } from '@/lib/price-history-service';
import { getCurrentUserId } from '@/lib/auth';
import prisma from '@/lib/db';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError , AppError, ErrorCode } from '@/lib/errors';
// POST /api/listings/[id]/market-value
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const { id: listingId } = await params;

    if (!listingId) {
      throw new ValidationError('Listing ID is required');
    }

    // Verify ownership: only the listing's owner may update its market value.
    // Return NotFoundError for both missing and not-owned to prevent enumeration.
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true },
    });

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenError('You do not have permission to modify this listing');
    }

    await updateListingWithMarketValue(listingId);

    return NextResponse.json({
      success: true,
      message: `Updated listing ${listingId} with verified market value`,
    });
  } catch (error) {
    console.error('Error updating listing market value:', error);

    if (error instanceof Error && !(error instanceof AppError) && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return handleError(error);
  }
}

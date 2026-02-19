/**
 * Single Listing API Route (Firebase)
 * GET /api/listings/[id] - Get listing by ID
 * PATCH /api/listings/[id] - Update listing
 * DELETE /api/listings/[id] - Delete listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/admin';
import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import {
  getListing,
  updateListing,
  deleteDocument,
} from '@/lib/firebase/firestore-helpers';

async function getUserFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;
    const listing = await getListing(id);

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    // Verify ownership
    if (listing.userId !== userId) {
      throw new ForbiddenError('Forbidden');
    }

    return NextResponse.json({
      success: true,
      listing,
    });
  } catch (error: any) {
    console.error('Get listing error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch listing');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;
    const listing = await getListing(id);

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    // Verify ownership
    if (listing.userId !== userId) {
      throw new ForbiddenError('Forbidden');
    }

    const body = await request.json();
    await updateListing(id, body);

    const updatedListing = await getListing(id);

    return NextResponse.json({
      success: true,
      message: 'Listing updated successfully',
      listing: updatedListing,
    });
  } catch (error: any) {
    console.error('Update listing error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update listing');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;
    const listing = await getListing(id);

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    // Verify ownership
    if (listing.userId !== userId) {
      throw new ForbiddenError('Forbidden');
    }

    await deleteDocument('listings', id);

    return NextResponse.json({
      success: true,
      message: 'Listing deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete listing error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete listing');
  }
}

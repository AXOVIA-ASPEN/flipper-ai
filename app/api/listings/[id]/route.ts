/**
 * Single Listing API Route
 * GET /api/listings/[id] - Get listing by ID
 * PATCH /api/listings/[id] - Update listing
 * DELETE /api/listings/[id] - Delete listing
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { handleError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;
    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenError('Forbidden');
    }

    return NextResponse.json({ success: true, listing });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;
    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenError('Forbidden');
    }

    const body = await request.json();
    const updatedListing = await prisma.listing.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({
      success: true,
      message: 'Listing updated successfully',
      listing: updatedListing,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;
    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenError('Forbidden');
    }

    await prisma.listing.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Listing deleted successfully',
    });
  } catch (error) {
    return handleError(error);
  }
}

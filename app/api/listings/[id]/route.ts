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

// Price delta threshold constants (shared with llm-analyzer.ts logic)
const STALE_THRESHOLD = 0.05; // 5% change → stale
const INVALIDATION_THRESHOLD = 0.15; // 15% change → fully invalidated

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
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { images: true, opportunity: true },
    });

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenError('Forbidden');
    }

    // Story 13.3: Check if cached analysis is stale due to price change
    let staleAnalysis = false;
    try {
      const latestCache = await prisma.aiAnalysisCache.findFirst({
        where: { listingId: id, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        select: { analyzedAtPrice: true },
      });
      if (latestCache && latestCache.analyzedAtPrice != null) {
        const cached = latestCache.analyzedAtPrice;
        const delta = cached === 0 ? Infinity : Math.abs(listing.askingPrice - cached) / cached;
        staleAnalysis = delta > STALE_THRESHOLD && delta <= INVALIDATION_THRESHOLD;
      }
    } catch {
      // Non-critical — if cache check fails, just don't flag staleness
    }

    return NextResponse.json({ success: true, listing, staleAnalysis });
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
    const { title, description, location, condition, askingPrice, sellerName, sellerContact } = body;
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (condition !== undefined) updateData.condition = condition;
    if (askingPrice !== undefined) updateData.askingPrice = askingPrice;
    if (sellerName !== undefined) updateData.sellerName = sellerName;
    if (sellerContact !== undefined) updateData.sellerContact = sellerContact;
    const updatedListing = await prisma.listing.update({
      where: { id },
      data: updateData,
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

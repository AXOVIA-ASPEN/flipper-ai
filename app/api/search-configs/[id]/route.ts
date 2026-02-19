import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
// GET /api/search-configs/[id] - Get a single search configuration
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const config = await prisma.searchConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundError('Search configuration not found');
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching search config:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch search configuration');
  }
}

// PATCH /api/search-configs/[id] - Update a search configuration
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build update data, only including fields that were provided
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.platform !== undefined) {
      const validPlatforms = ['CRAIGSLIST', 'FACEBOOK_MARKETPLACE', 'EBAY', 'OFFERUP'];
      if (!validPlatforms.includes(body.platform)) {
        return NextResponse.json(
          { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.platform = body.platform;
    }
    if (body.location !== undefined) updateData.location = body.location;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.keywords !== undefined) updateData.keywords = body.keywords;
    if (body.minPrice !== undefined)
      updateData.minPrice = body.minPrice ? parseFloat(body.minPrice) : null;
    if (body.maxPrice !== undefined)
      updateData.maxPrice = body.maxPrice ? parseFloat(body.maxPrice) : null;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;
    if (body.lastRun !== undefined) updateData.lastRun = new Date(body.lastRun);

    const config = await prisma.searchConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating search config:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update search configuration');
  }
}

// DELETE /api/search-configs/[id] - Delete a search configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.searchConfig.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting search config:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete search configuration');
  }
}

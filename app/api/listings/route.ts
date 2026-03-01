/**
 * Listings API Route
 * GET /api/listings - Get user's listings
 * POST /api/listings - Create new listing
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { handleError, ValidationError, UnauthorizedError } from '@/lib/errors';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || undefined;
    const minScore = searchParams.get('min_score');

    const where: Record<string, unknown> = { userId };
    if (platform) where.platform = platform;
    if (minScore) where.valueScore = { gte: parseInt(minScore, 10) };

    const listings = await prisma.listing.findMany({
      where,
      orderBy: { scrapedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const body = await request.json();

    if (!body.platform || !body.url || !body.title || body.askingPrice === undefined) {
      throw new ValidationError('Missing required fields: platform, url, title, askingPrice');
    }

    const listing = await prisma.listing.create({
      data: {
        userId,
        platform: body.platform,
        externalId: body.externalId || body.url.split('/').pop() || '',
        url: body.url,
        title: body.title,
        description: body.description,
        askingPrice: body.askingPrice,
        condition: body.condition,
        location: body.location,
        sellerName: body.sellerName,
        sellerContact: body.sellerContact,
        imageUrls: body.imageUrls ? JSON.stringify(body.imageUrls) : undefined,
        category: body.category,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Listing created successfully',
      listing,
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Listings API Route (Firebase)
 * GET /api/listings - Get user's listings
 * POST /api/listings - Create new listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/admin';
import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import {
  createListing,
  getListingsByUser,
  ListingData,
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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || undefined;
    const minScore = searchParams.get('min_score');

    let listings = await getListingsByUser(userId, platform);

    // Filter by minimum value score if provided
    if (minScore) {
      const minScoreNum = parseInt(minScore, 10);
      listings = listings.filter((l) => (l.valueScore || 0) >= minScoreNum);
    }

    return NextResponse.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error: any) {
    console.error('Get listings error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch listings');
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserFromRequest(request);
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const body: Partial<ListingData> = await request.json();

    // Validate required fields
    if (!body.platform || !body.url || !body.title || body.askingPrice === undefined) {
      throw new ValidationError('Missing required fields: platform, url, title, askingPrice');
    }

    // Create listing
    const listing = await createListing({
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
      imageUrls: body.imageUrls,
      category: body.category,
      postedAt: body.postedAt,
      scrapedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Listing created successfully',
      listing,
    });
  } catch (error: any) {
    console.error('Create listing error:', error);
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create listing');
  }
}

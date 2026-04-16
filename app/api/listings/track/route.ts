import { NextRequest, NextResponse } from 'next/server';
import { runTrackingCycle, getTrackableListings } from '@/lib/listing-tracker';
import { getCurrentUserId } from '@/lib/auth';
import prisma from '@/lib/db';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError , AppError, ErrorCode } from '@/lib/errors';
// GET /api/listings/track - Get trackable listings count (scoped to the caller)
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    // Scope trackable listings to the authenticated user so callers never see
    // other users' listings.
    const listings = await getTrackableListings({ userId });
    return NextResponse.json({
      trackableCount: listings.length,
      listings: listings.map((l) => ({
        id: l.id,
        title: l.title,
        platform: l.platform,
        status: l.status,
        askingPrice: l.askingPrice,
      })),
    });
  } catch (error) {
    console.error('Error fetching trackable listings:', error);
    return handleError(error);
  }
}

// POST /api/listings/track - Run a tracking cycle
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new UnauthorizedError('Unauthorized');

    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;
    const listingId = typeof body.listingId === 'string' ? body.listingId : null;

    // If the caller targeted a specific listingId, verify they own it before
    // doing anything else. Prevents cross-user tracking triggers.
    if (listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { userId: true },
      });

      if (!listing) {
        throw new NotFoundError('Listing not found');
      }

      if (listing.userId !== userId) {
        throw new ForbiddenError('You do not have permission to track this listing');
      }
    }

    if (dryRun) {
      const listings = await getTrackableListings({ userId });
      return NextResponse.json({
        dryRun: true,
        wouldCheck: listings.length,
        listings: listings.map((l) => ({
          id: l.id,
          title: l.title,
          url: l.url,
          platform: l.platform,
        })),
      });
    }

    // In production, this would use a real page fetcher (Playwright, puppeteer, etc.)
    // For now, return a message indicating the tracker needs a fetcher configured
    const result = await runTrackingCycle(async (url: string) => {
      // Placeholder: In production, use scraper infrastructure to fetch pages
      console.log(`Would fetch: ${url}`);
      return null;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running tracking cycle:', error);
    return handleError(error);
  }
}

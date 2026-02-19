import { NextRequest, NextResponse } from 'next/server';
import { runTrackingCycle, getTrackableListings } from '@/lib/listing-tracker';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
// GET /api/listings/track - Get trackable listings count
export async function GET() {
  try {
    const listings = await getTrackableListings();
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
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch trackable listings');
  }
}

// POST /api/listings/track - Run a tracking cycle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    if (dryRun) {
      const listings = await getTrackableListings();
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
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to run tracking cycle');
  }
}

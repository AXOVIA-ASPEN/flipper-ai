/**
 * API Route: POST /api/analyze/[listingId]
 * Author: Stephen Boyett
 * Company: Axovia AI
 *
 * TEMPORARY STUB - Needs Firebase migration
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  return NextResponse.json(
    {
      success: false,
      error: 'Analysis endpoint temporarily unavailable during database migration',
    },
    { status: 501 }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  return NextResponse.json(
    {
      success: false,
      error: 'Analysis endpoint temporarily unavailable during database migration',
    },
    { status: 501 }
  );
}

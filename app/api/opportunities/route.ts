/**
 * Opportunities API Route (Firebase)
 * GET /api/opportunities - Get user's opportunities (high-value listings)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/admin';
import { getOpportunities } from '@/lib/firebase/firestore-helpers';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 25;

    const opportunities = await getOpportunities(userId, limit);

    return NextResponse.json({
      success: true,
      count: opportunities.length,
      opportunities,
    });
  } catch (error: any) {
    console.error('Get opportunities error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}

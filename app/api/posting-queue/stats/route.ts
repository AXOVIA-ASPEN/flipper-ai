import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-middleware';
import { getQueueStats } from '@/lib/posting-queue-processor';

// GET /api/posting-queue/stats - Get queue statistics
export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getQueueStats(userId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('GET /api/posting-queue/stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

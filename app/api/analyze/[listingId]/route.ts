/**
 * GET /api/analyze/[listingId]
 *
 * Returns AI analysis for a listing. Implements a three-tier cache:
 *   L1: in-memory LRU (analysisCache, 30min)
 *   L2: AiAnalysisCache DB table (24h TTL)
 *   Fallback: algorithmic scoring via estimateValue() when all AI APIs fail
 *
 * Response shape:
 *   { success: true, data: { ...analysisFields, isAiFallback: boolean }, source: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { analysisCache } from '@/lib/cache';
import { analyzeListing, ClaudeAnalysisResult } from '@/lib/claude-analyzer';
import { estimateValue } from '@/lib/value-estimator';
import { handleError, NotFoundError, ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { getAuthUserId } from '@/lib/auth-middleware';
import { recordUsage } from '@/lib/usage-tracker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;

    const userId = await getAuthUserId(request);
    if (!userId) throw new UnauthorizedError('Authentication required');

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundError('Listing not found');
    if (listing.userId !== userId) throw new ForbiddenError('Access denied');

    // L1: in-memory cache check
    const l1 = analysisCache.get(`claude:${listingId}`) as ClaudeAnalysisResult | undefined;
    if (l1) {
      return NextResponse.json({
        success: true,
        data: { ...l1, isAiFallback: false },
        source: 'cache-l1',
      });
    }

    // Try Claude (analyzeListing handles L2 DB cache internally)
    try {
      const result = await analyzeListing(listingId);
      analysisCache.set(`claude:${listingId}`, result);

      // Record analysis usage — non-blocking.
      // Note: this counts every served request (including L2 DB cache hits) as usage.
      // Only L1 in-memory cache hits (early return above) skip the counter.
      try {
        await recordUsage(userId, 'ANALYSIS');
      } catch (usageError) {
        console.error('[Usage Tracker] Failed to record analysis usage:', usageError);
      }

      return NextResponse.json({
        success: true,
        data: { ...result, isAiFallback: false },
        source: 'ai',
      });
    } catch (aiError) {
      // All AI unavailable — fallback to algorithmic scoring (AC #4)
      console.error('AI analysis failed, using algorithmic fallback:', aiError);
      const estimation = estimateValue(
        listing.title,
        listing.description ?? null,
        listing.askingPrice,
        listing.condition ?? null,
        listing.category ?? null
      );
      return NextResponse.json({
        success: true,
        data: { ...estimation, isAiFallback: true },
        source: 'algorithmic',
      });
    }
  } catch (error) {
    return handleError(error, request.url);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;

    const userId = await getAuthUserId(request);
    if (!userId) throw new UnauthorizedError('Authentication required');

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundError('Listing not found');
    if (listing.userId !== userId) throw new ForbiddenError('Access denied');

    // Invalidate L1 and L2 cache entries for this listing
    analysisCache.delete(`claude:${listingId}`);
    analysisCache.delete(`openai:${listingId}`);
    await prisma.aiAnalysisCache.deleteMany({ where: { listingId } });

    return NextResponse.json({ success: true, message: 'Cache invalidated' });
  } catch (error) {
    return handleError(error, request.url);
  }
}

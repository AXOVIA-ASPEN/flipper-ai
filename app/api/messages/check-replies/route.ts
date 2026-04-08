/**
 * @file app/api/messages/check-replies/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief API route to check for inbound seller replies on a listing.
 *
 * @description
 * POST endpoint that triggers an inbound message check for a specific listing.
 * Requires authentication and messaging tier access. Dispatches to the
 * platform-specific message checker, stores any new inbound messages,
 * and returns the updated conversation status.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import {
  handleError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  NotFoundError,
} from '@/lib/errors';
import { checkFeatureAccess } from '@/lib/tier-enforcement';
import { checkForReplies } from '@/lib/inbound-message-checker';

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    // Enforce messaging feature gate
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });
    const featureCheck = checkFeatureAccess(
      user?.subscriptionTier,
      'messaging'
    );
    if (!featureCheck.allowed) {
      throw new ForbiddenError(featureCheck.reason);
    }

    const body = await request.json();
    const { listingId } = body;

    if (!listingId) {
      throw new ValidationError('Missing required field: listingId');
    }

    // Fetch listing scoped to user for ownership enforcement
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, userId },
      select: {
        id: true,
        platform: true,
        sellerName: true,
        sellerContact: true,
        url: true,
      },
    });

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    const result = await checkForReplies(listing, userId);

    return NextResponse.json({
      success: true,
      data: {
        checked: result.checked,
        newMessages: result.newMessages,
        conversationStatus: result.conversationStatus,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

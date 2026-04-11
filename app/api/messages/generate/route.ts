/**
 * @file app/api/messages/generate/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-30
 * @version 1.0
 * @brief API route for AI-powered purchase message generation.
 *
 * @description
 * POST endpoint that generates AI-powered purchase messages for sellers.
 * Requires authentication and messaging tier access (FLIPPER or PRO).
 * Accepts a listing ID and optional message type, fetches listing data,
 * generates a personalized message via OpenAI, and creates a DRAFT
 * message record in the database. Falls back to template messages when
 * the AI API is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { handleError, UnauthorizedError, ForbiddenError, ValidationError, NotFoundError } from '@/lib/errors';
import { checkFeatureAccess } from '@/lib/tier-enforcement';
import { generatePurchaseMessage, isValidMessageType } from '@/lib/message-generator';
import type { MessageType } from '@/lib/message-generator';
import { transitionToPending } from '@/lib/conversation-status';
import { communicationNotificationService } from '@/lib/communication-notification';

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
    const featureCheck = checkFeatureAccess(user?.subscriptionTier, 'messaging');
    if (!featureCheck.allowed) {
      throw new ForbiddenError(featureCheck.reason);
    }

    const body = await request.json();
    const { listingId, messageType, offerPrice, additionalContext } = body;

    if (!listingId) {
      throw new ValidationError('Missing required field: listingId');
    }

    if (messageType && !isValidMessageType(messageType)) {
      throw new ValidationError(
        'Invalid messageType. Must be one of: inquiry, offer, follow-up, negotiation'
      );
    }

    // Fetch listing data (scoped to user to prevent information leakage)
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, userId },
      select: {
        id: true,
        title: true,
        askingPrice: true,
        platform: true,
        sellerName: true,
        sellerContact: true,
        condition: true,
      },
    });

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    // Generate AI message
    const generated = await generatePurchaseMessage({
      listingTitle: listing.title,
      askingPrice: listing.askingPrice ? Number(listing.askingPrice) : 0,
      platform: listing.platform,
      sellerName: listing.sellerName,
      messageType: (messageType as MessageType) || 'inquiry',
      offerPrice: offerPrice ? Number(offerPrice) : null,
      itemCondition: listing.condition,
      additionalContext: additionalContext || null,
    });

    // Create draft message in database
    const message = await prisma.message.create({
      data: {
        userId,
        listingId,
        direction: 'OUTBOUND',
        status: 'DRAFT',
        subject: generated.subject,
        body: generated.body,
        sellerName: listing.sellerName || null,
        sellerContact: listing.sellerContact || null,
        platform: listing.platform,
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            platform: true,
            askingPrice: true,
          },
        },
      },
    });

    // Fire-and-forget: transition conversation status to pending
    transitionToPending(listingId, userId).catch(() => {});

    // Fire-and-forget: draft ready notification (Story 10.4, AC2)
    /* istanbul ignore next -- fire-and-forget; rejection is intentionally swallowed */
    void communicationNotificationService.notifyDraftReady({
      userId,
      listingId,
      listingTitle: listing.title,
      draftPreview: message.body,
    }).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        data: {
          message,
          generation: {
            messageType: generated.messageType,
            tone: generated.tone,
            isFallback: generated.isFallback,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

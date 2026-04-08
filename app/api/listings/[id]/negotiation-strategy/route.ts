/**
 * @file app/api/listings/[id]/negotiation-strategy/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief API route for AI-powered negotiation strategy generation.
 *
 * @description
 * POST endpoint that generates an AI-powered negotiation strategy for a listing.
 * Requires authentication and messaging tier access (FLIPPER or PRO). Returns
 * recommended initial offer, walk-away price, negotiation tactics, and counter-offer
 * suggestions based on the listing's verified market data. Falls back to algorithmic
 * strategy when the AI API is unavailable.
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
import { generateNegotiationStrategy } from '@/lib/negotiation-strategy';
import type { NegotiationStrategyInput } from '@/lib/negotiation-strategy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: listingId } = await params;
    if (!listingId) {
      throw new ValidationError('Missing required parameter: listing ID');
    }

    // Fetch listing with market data fields
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, userId },
      select: {
        id: true,
        askingPrice: true,
        verifiedMarketValue: true,
        estimatedValue: true,
        condition: true,
        daysListed: true,
        negotiable: true,
        demandLevel: true,
        sellabilityScore: true,
        platform: true,
        recommendedOffer: true,
        marketDataDate: true,
      },
    });

    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (!listing.askingPrice || listing.askingPrice <= 0) {
      throw new ValidationError('Listing has no asking price');
    }

    // Build strategy input
    const strategyInput: NegotiationStrategyInput = {
      listingId: listing.id,
      askingPrice: Number(listing.askingPrice),
      verifiedMarketValue: listing.verifiedMarketValue
        ? Number(listing.verifiedMarketValue)
        : null,
      estimatedValue: listing.estimatedValue ? Number(listing.estimatedValue) : null,
      condition: listing.condition,
      daysListed: listing.daysListed,
      negotiable: listing.negotiable,
      demandLevel: listing.demandLevel,
      sellabilityScore: listing.sellabilityScore,
      platform: listing.platform,
      recommendedOffer: listing.recommendedOffer
        ? Number(listing.recommendedOffer)
        : null,
      marketDataDate: listing.marketDataDate ?? null,
    };

    const strategy = await generateNegotiationStrategy(strategyInput);

    return NextResponse.json({
      success: true,
      data: {
        strategy,
        isFallback: strategy.isFallback,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

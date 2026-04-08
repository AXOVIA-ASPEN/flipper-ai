/**
 * @file app/api/listings/[id]/counter-offer-analysis/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief API route for AI-powered counter-offer analysis.
 *
 * @description
 * POST endpoint that analyzes a seller's counter-offer and recommends whether
 * to accept, counter, or walk away. Requires authentication and messaging tier
 * access. Accepts the counter-offer price as manual user input and returns a
 * recommendation with reasoning and profit estimate.
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
import { analyzeCounterOffer } from '@/lib/negotiation-strategy';
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

    // Parse and validate request body
    let body: { counterOfferPrice?: number; ourPreviousOffer?: number };
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid request body: expected valid JSON');
    }
    const { counterOfferPrice, ourPreviousOffer } = body;

    if (
      !Number.isFinite(counterOfferPrice) ||
      !counterOfferPrice ||
      counterOfferPrice <= 0 ||
      counterOfferPrice > 999999
    ) {
      throw new ValidationError(
        'Counter-offer price must be a positive number under $1,000,000'
      );
    }

    if (
      !Number.isFinite(ourPreviousOffer) ||
      !ourPreviousOffer ||
      ourPreviousOffer <= 0 ||
      ourPreviousOffer > 999999
    ) {
      throw new ValidationError(
        'Our previous offer must be a positive number under $1,000,000'
      );
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

    // Build analysis input
    const analysisInput: NegotiationStrategyInput = {
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

    const analysis = await analyzeCounterOffer(
      analysisInput,
      counterOfferPrice,
      ourPreviousOffer
    );

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    return handleError(error);
  }
}

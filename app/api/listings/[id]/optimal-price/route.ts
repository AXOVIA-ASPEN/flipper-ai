/**
 * @file app/api/listings/[id]/optimal-price/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Optimal listing price API endpoint (Story 9.2 / FR-RELIST-03).
 *
 * @description
 * GET  /api/listings/[id]/optimal-price
 *   → Returns multi-platform optimal prices using the default 30% target
 *     margin and the user's per-platform fee rates from UserSettings.
 *
 * POST /api/listings/[id]/optimal-price
 *   Body: { targetPlatform?: TargetPlatform, targetMarginPercent?: number,
 *           marketCapPercent?: number }
 *   → If `targetPlatform` is supplied, returns a single ListingPriceResult
 *     for that platform. Otherwise behaves like GET but with the supplied
 *     custom margin/cap values.
 *
 * Auth: getCurrentUserId() from @/lib/auth (session cookie). Listing
 * ownership is enforced inside calculateOptimalListingPrice() via a scoped
 * `findFirst({ where: { id, userId } })`.
 *
 * Feature gating: PRO/FLIPPER tiers via checkFeatureAccess(tier,
 * 'priceHistory') from @/lib/tier-enforcement. Note that 'priceHistory' is
 * being overloaded here to gate pricing tools — semantically imperfect but
 * matches current tier structure (see Dev Notes / Feature Gating in
 * 9-2 story file).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  handleError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from '@/lib/errors';
import { getCurrentUserId } from '@/lib/auth';
import { checkFeatureAccess } from '@/lib/tier-enforcement';
import prisma from '@/lib/db';
import {
  calculateOptimalListingPrice,
  calculateMultiPlatformPrices,
  SUPPORTED_PLATFORMS,
  type TargetPlatform,
} from '@/lib/listing-price-calculator';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SUPPORTED_PLATFORM_SET = new Set<TargetPlatform>(SUPPORTED_PLATFORMS);

async function enforcePricingFeatureAccess(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  const featureCheck = checkFeatureAccess(user?.subscriptionTier, 'priceHistory');
  if (!featureCheck.allowed) {
    throw new ForbiddenError(featureCheck.reason);
  }
}

/**
 * GET /api/listings/[id]/optimal-price
 * Returns optimal prices across all supported platforms with the default
 * 30% target margin. Pre-purchase listings (IDENTIFIED/CONTACTED) come back
 * with `isProjected: true`.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    await enforcePricingFeatureAccess(userId);

    const { id } = await params;
    const result = await calculateMultiPlatformPrices({
      listingId: id,
      userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        prices: result.prices,
        bestPlatform: result.bestPlatform,
        isProjected: result.isProjected,
      },
    });
  } catch (error) {
    return handleError(error, request.url);
  }
}

/**
 * POST /api/listings/[id]/optimal-price
 * Custom calculation. Body fields:
 *   - targetPlatform: optional. When set, returns a single platform result.
 *   - targetMarginPercent: optional, defaults to 30.
 *   - marketCapPercent: optional, defaults to 0.95.
 *
 * Returns the same shape as GET when no target platform is supplied; when
 * `targetPlatform` is provided, the response includes a single
 * `prices: [ListingPriceResult]` to keep the wire shape consistent.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    await enforcePricingFeatureAccess(userId);

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      targetPlatform?: string;
      targetMarginPercent?: number;
      marketCapPercent?: number;
    };

    if (
      body.targetMarginPercent !== undefined &&
      (typeof body.targetMarginPercent !== 'number' ||
        body.targetMarginPercent < 0 ||
        body.targetMarginPercent >= 100)
    ) {
      throw new ValidationError(
        'targetMarginPercent must be a number between 0 and 99'
      );
    }

    if (
      body.marketCapPercent !== undefined &&
      (typeof body.marketCapPercent !== 'number' ||
        body.marketCapPercent <= 0 ||
        body.marketCapPercent > 1)
    ) {
      throw new ValidationError(
        'marketCapPercent must be a decimal between 0 and 1'
      );
    }

    if (body.targetPlatform !== undefined) {
      const platform = body.targetPlatform.toLowerCase() as TargetPlatform;
      if (!SUPPORTED_PLATFORM_SET.has(platform)) {
        throw new ValidationError(
          `targetPlatform must be one of: ${SUPPORTED_PLATFORMS.join(', ')}`
        );
      }
      const single = await calculateOptimalListingPrice({
        listingId: id,
        userId,
        targetPlatform: platform,
        targetMarginPercent: body.targetMarginPercent,
        marketCapPercent: body.marketCapPercent,
      });
      return NextResponse.json({
        success: true,
        data: {
          prices: [single],
          bestPlatform: single.targetPlatform,
          isProjected: single.isProjected,
        },
      });
    }

    const result = await calculateMultiPlatformPrices({
      listingId: id,
      userId,
      targetMarginPercent: body.targetMarginPercent,
      marketCapPercent: body.marketCapPercent,
    });

    return NextResponse.json({
      success: true,
      data: {
        prices: result.prices,
        bestPlatform: result.bestPlatform,
        isProjected: result.isProjected,
      },
    });
  } catch (error) {
    return handleError(error, request.url);
  }
}

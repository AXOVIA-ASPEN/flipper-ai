/**
 * @file app/api/usage/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 1.0
 * @brief GET endpoint for retrieving current month usage data.
 *
 * @description
 * Returns the authenticated user's scan and analysis usage for the current
 * billing period, including tier-appropriate limits. Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { handleError, UnauthorizedError } from '@/lib/errors';
import { getUsageDisplay } from '@/lib/usage-tracker';
import type { SubscriptionTier } from '@/lib/subscription-tiers';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) throw new UnauthorizedError('Authentication required');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    const tier = (user?.subscriptionTier ?? 'FREE') as SubscriptionTier;
    const data = await getUsageDisplay(userId, tier);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleError(error);
  }
}

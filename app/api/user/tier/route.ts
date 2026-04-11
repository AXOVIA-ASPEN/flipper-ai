/**
 * @file app/api/user/tier/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Lightweight client-side tier lookup endpoint.
 *
 * @description
 * GET /api/user/tier — returns { tier } for the authenticated user. Needed
 * because the client-side Firebase session returned by SessionProvider does
 * not carry the Prisma subscriptionTier field, yet the opportunities page
 * must know whether to surface the Cross-Post CTA (PRO+ only). Kept
 * deliberately tiny: one indexed lookup, no joins, no user-visible PII.
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { handleError, UnauthorizedError } from '@/lib/errors';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    return NextResponse.json({
      success: true,
      data: { tier: user?.subscriptionTier ?? 'FREE' },
    });
  } catch (error) {
    console.error('GET /api/user/tier error:', error);
    return handleError(error);
  }
}

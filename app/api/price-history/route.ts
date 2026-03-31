// API Route: /api/price-history
// Fetch and manage price history for flip analysis

import { NextRequest, NextResponse } from 'next/server';
import { handleError, ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors';
import { getAuthUserId } from '@/lib/auth-middleware';
import prisma from '@/lib/db';
import { checkFeatureAccess } from '@/lib/tier-enforcement';
import {
  fetchAndStorePriceHistory,
  getPriceHistory,
} from '@/lib/price-history-service';

// GET /api/price-history?productName=iPhone+13&category=electronics
export async function GET(request: NextRequest) {
  try {
    // Enforce priceHistory feature gate — check ALL users (including unauthenticated)
    const userId = await getAuthUserId();
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } })
      : null;
    const featureCheck = checkFeatureAccess(user?.subscriptionTier, 'priceHistory');
    if (!featureCheck.allowed) {
      throw new ForbiddenError(featureCheck.reason);
    }

    const { searchParams } = new URL(request.url);
    const productName = searchParams.get('productName');
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!productName) {
      throw new ValidationError('productName is required');
    }

    const priceHistory = await getPriceHistory({
      productName,
      category,
      limit,
    });

    return NextResponse.json(priceHistory);
  } catch (error) {
    console.error('Error fetching price history:', error);
    return handleError(error);
  }
}

// POST /api/price-history
// Body: { productName: string, category?: string }
export async function POST(request: NextRequest) {
  try {
    // Enforce auth + priceHistory feature gate (same as GET)
    const userId = await getAuthUserId();
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } })
      : null;
    const featureCheck = checkFeatureAccess(user?.subscriptionTier, 'priceHistory');
    if (!featureCheck.allowed) {
      throw new ForbiddenError(featureCheck.reason);
    }

    const body = await request.json();
    const { productName, category } = body;

    if (!productName) {
      throw new ValidationError('productName is required');
    }

    const marketData = await fetchAndStorePriceHistory(productName, category);

    if (!marketData) {
      throw new NotFoundError('No market data found');
    }

    return NextResponse.json({
      success: true,
      marketData,
      storedRecords: marketData.soldListings.length,
    });
  } catch (error) {
    console.error('Error fetching and storing price history:', error);
    return handleError(error);
  }
}

// API Route: /api/price-history
// Fetch and manage price history for flip analysis

import { NextRequest, NextResponse } from 'next/server';
import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import {
  fetchAndStorePriceHistory,
  getPriceHistory,
  updateListingWithMarketValue,
  batchUpdateListingsWithMarketValue,
} from '@/lib/price-history-service';

// GET /api/price-history?productName=iPhone+13&category=electronics
export async function GET(request: NextRequest) {
  try {
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
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch price history');
  }
}

// POST /api/price-history
// Body: { productName: string, category?: string }
export async function POST(request: NextRequest) {
  try {
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
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch and store price history');
  }
}

// API Route: /api/price-history
// Fetch and manage price history for flip analysis

import { NextRequest, NextResponse } from 'next/server';
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
      return NextResponse.json({ error: 'productName is required' }, { status: 400 });
    }

    const priceHistory = await getPriceHistory({
      productName,
      category,
      limit,
    });

    return NextResponse.json(priceHistory);
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }
}

// POST /api/price-history
// Body: { productName: string, category?: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, category } = body;

    if (!productName) {
      return NextResponse.json({ error: 'productName is required' }, { status: 400 });
    }

    const marketData = await fetchAndStorePriceHistory(productName, category);

    if (!marketData) {
      return NextResponse.json({ error: 'No market data found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      marketData,
      storedRecords: marketData.soldListings.length,
    });
  } catch (error) {
    console.error('Error fetching and storing price history:', error);
    return NextResponse.json({ error: 'Failed to fetch and store price history' }, { status: 500 });
  }
}

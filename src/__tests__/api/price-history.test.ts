// API tests for /api/price-history endpoints

import { GET, POST } from '@/app/api/price-history/route';
import { NextRequest } from 'next/server';

// Mock the price history service
jest.mock('@/lib/price-history-service', () => ({
  fetchAndStorePriceHistory: jest.fn(),
  getPriceHistory: jest.fn(),
  updateListingWithMarketValue: jest.fn(),
  batchUpdateListingsWithMarketValue: jest.fn(),
}));

// Mock db to prevent real database connections
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {},
  prisma: {},
}));

import * as priceHistoryService from '@/lib/price-history-service';

describe('GET /api/price-history', () => {
  it('should return price history for a product', async () => {
    const mockPriceHistory = {
      productName: 'iPhone 13',
      category: 'electronics',
      soldListings: [
        {
          platform: 'EBAY',
          soldPrice: 600,
          condition: 'Good',
          soldAt: new Date('2024-01-15'),
        },
      ],
      stats: {
        count: 1,
        avgPrice: 600,
        medianPrice: 600,
        minPrice: 600,
        maxPrice: 600,
      },
    };

    jest.mocked(priceHistoryService.getPriceHistory).mockResolvedValue(mockPriceHistory);

    const request = new NextRequest(
      'http://localhost:3000/api/price-history?productName=iPhone+13&category=electronics'
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.productName).toBe('iPhone 13');
    expect(data.soldListings).toHaveLength(1);
    expect(data.stats.avgPrice).toBe(600);
  });

  it('should return 422 if productName is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/price-history');

    const response = await GET(request);
    const data = await response.json();

    // handleError wraps ValidationError in RFC 7807 format with status 422
    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.mocked(priceHistoryService.getPriceHistory).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/price-history?productName=Test');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    consoleSpy.mockRestore();
  });
});

describe('POST /api/price-history', () => {
  it('should fetch and store price history', async () => {
    const mockMarketData = {
      source: 'ebay_scrape' as const,
      soldListings: [
        {
          title: 'Test Product',
          price: 100,
          soldDate: new Date(),
          condition: 'Good',
          url: 'https://ebay.com/item/1',
          shippingCost: 10,
        },
      ],
      medianPrice: 110,
      lowPrice: 110,
      highPrice: 110,
      avgPrice: 110,
      salesCount: 1,
      avgDaysToSell: null,
      searchQuery: 'Test Product',
      fetchedAt: new Date(),
    };

    jest.mocked(priceHistoryService.fetchAndStorePriceHistory).mockResolvedValue(mockMarketData);

    const request = new NextRequest('http://localhost:3000/api/price-history', {
      method: 'POST',
      body: JSON.stringify({
        productName: 'Test Product',
        category: 'electronics',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.storedRecords).toBe(1);
    expect(data.marketData).toBeTruthy();
  });

  it('should return 422 if productName is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/price-history', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    // handleError wraps ValidationError in RFC 7807 format with status 422
    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 404 if no market data found', async () => {
    jest.mocked(priceHistoryService.fetchAndStorePriceHistory).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/price-history', {
      method: 'POST',
      body: JSON.stringify({ productName: 'Nonexistent' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    jest
      .mocked(priceHistoryService.fetchAndStorePriceHistory)
      .mockRejectedValue(new Error('Scraping error'));

    const request = new NextRequest('http://localhost:3000/api/price-history', {
      method: 'POST',
      body: JSON.stringify({ productName: 'Test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    consoleSpy.mockRestore();
  });
});

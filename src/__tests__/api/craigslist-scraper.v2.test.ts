/**
 * Tests for Craigslist API Route V2 (Cloud Function-based)
 * Author: Stephen Boyett
 * Company: Axovia AI
 * 
 * Coverage target: 100% of route.v2.ts branches
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/scraper/craigslist/route.v2';

// Mock auth middleware
const mockGetAuthUserId = jest.fn();
jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: () => mockGetAuthUserId(),
}));

// Mock cloud functions
const mockScrapeCraigslist = jest.fn();
jest.mock('@/lib/cloud-functions', () => ({
  scrapeCraigslist: (...args: unknown[]) => mockScrapeCraigslist(...args),
}));

// Mock value estimator
const mockEstimateValue = jest.fn();
const mockDetectCategory = jest.fn();
const mockGeneratePurchaseMessage = jest.fn();
jest.mock('@/lib/value-estimator', () => ({
  estimateValue: (...args: unknown[]) => mockEstimateValue(...args),
  detectCategory: (...args: unknown[]) => mockDetectCategory(...args),
  generatePurchaseMessage: (...args: unknown[]) => mockGeneratePurchaseMessage(...args),
}));

// Mock Prisma
const mockUpsert = jest.fn();
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

// Helper to create NextRequest
function createMockRequest(
  method: string,
  url: string,
  body?: unknown
): NextRequest {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

describe('Craigslist Scraper V2 API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockGetAuthUserId.mockResolvedValue('test-user-123');
    mockDetectCategory.mockReturnValue('electronics');
    mockEstimateValue.mockReturnValue({
      estimatedValue: 1500,
      estimatedLow: 1200,
      estimatedHigh: 1800,
      profitPotential: 500,
      profitLow: 400,
      profitHigh: 600,
      valueScore: 85,
      discountPercent: 35,
      resaleDifficulty: 'EASY',
      comparableUrls: [],
      reasoning: 'Good flip opportunity',
      notes: 'Test notes',
      shippable: true,
      negotiable: true,
      tags: ['electronics'],
    });
    mockGeneratePurchaseMessage.mockReturnValue('Hi, is this still available?');
    mockUpsert.mockResolvedValue({ id: 'listing-123' });
  });

  describe('GET /api/scraper/craigslist', () => {
    it('should return scraper status and metadata', async () => {
      const request = createMockRequest('GET', '/api/scraper/craigslist');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        platform: 'craigslist',
        status: 'ready',
        mode: 'cloud-function',
        supportedCategories: expect.arrayContaining(['electronics', 'furniture']),
        supportedLocations: expect.arrayContaining(['sarasota', 'tampa']),
      });
    });
  });

  describe('POST /api/scraper/craigslist', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetAuthUserId.mockResolvedValue(null);

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 when location is missing', async () => {
      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        category: 'electronics',
        keywords: 'laptop',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        message: 'Location and category are required',
      });
    });

    it('should return 400 when category is missing', async () => {
      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        keywords: 'laptop',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        success: false,
        message: 'Location and category are required',
      });
    });

    it('should return 500 when cloud function scraping fails', async () => {
      mockScrapeCraigslist.mockResolvedValue({
        success: false,
        error: 'Cloud function timeout',
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        message: 'Cloud function timeout',
      });
    });

    it('should return 500 when cloud function returns no error message', async () => {
      mockScrapeCraigslist.mockResolvedValue({
        success: false,
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        message: 'Scraping failed',
      });
    });

    it('should successfully scrape and save high-value listings', async () => {
      mockScrapeCraigslist.mockResolvedValue({
        success: true,
        jobId: 'job-123',
        listings: [
          {
            title: 'MacBook Pro 16" M1',
            price: '$1000',
            url: 'https://tampa.craigslist.org/item1',
            externalId: 'cl-item-1',
            location: 'Tampa, FL',
            imageUrl: 'https://images.craigslist.org/image1.jpg',
            description: 'Like new condition',
          },
          {
            title: 'iPad Air',
            price: '$400',
            url: 'https://tampa.craigslist.org/item2',
            externalId: 'cl-item-2',
          },
        ],
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
        keywords: 'macbook ipad',
        minPrice: 100,
        maxPrice: 2000,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.savedCount).toBe(2);
      expect(data.totalScraped).toBe(2);
      expect(data.jobId).toBe('job-123');
      expect(mockScrapeCraigslist).toHaveBeenCalledWith({
        userId: 'test-user-123',
        location: 'tampa',
        category: 'electronics',
        keywords: 'macbook ipad',
        minPrice: 100,
        maxPrice: 2000,
      });
      expect(mockUpsert).toHaveBeenCalledTimes(2);
    });

    it('should filter out low-value listings (valueScore < 70)', async () => {
      mockScrapeCraigslist.mockResolvedValue({
        success: true,
        listings: [
          {
            title: 'Broken iPhone',
            price: '$50',
            url: 'https://tampa.craigslist.org/item3',
            externalId: 'cl-item-3',
          },
        ],
      });

      // First call returns low value score
      mockEstimateValue.mockReturnValue({
        estimatedValue: 60,
        estimatedLow: 50,
        estimatedHigh: 70,
        profitPotential: 10,
        profitLow: 5,
        profitHigh: 15,
        valueScore: 45, // Below 70 threshold
        discountPercent: 10,
        resaleDifficulty: 'HARD',
        comparableUrls: [],
        reasoning: 'Low profit potential',
        notes: 'Broken condition',
        shippable: true,
        negotiable: false,
        tags: ['electronics'],
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.savedCount).toBe(0); // Filtered out
      expect(data.totalScraped).toBe(1);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('should handle listings with minimal data (no imageUrl, location, etc.)', async () => {
      mockScrapeCraigslist.mockResolvedValue({
        success: true,
        listings: [
          {
            title: 'Basic Item',
            price: '$200',
            url: 'https://tampa.craigslist.org/item4',
            externalId: 'cl-item-4',
            // No imageUrl, location, description
          },
        ],
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'furniture',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.savedCount).toBe(1);
      
      // Check upsert was called with null for missing fields
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            location: undefined,
            imageUrls: null, // No imageUrl provided
          }),
        })
      );
    });

    it('should handle listing with imageUrl present', async () => {
      mockScrapeCraigslist.mockResolvedValue({
        success: true,
        listings: [
          {
            title: 'Item with Image',
            price: '$300',
            url: 'https://tampa.craigslist.org/item5',
            externalId: 'cl-item-5',
            imageUrl: 'https://images.craigslist.org/img.jpg',
          },
        ],
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'furniture',
      });

      const response = await POST(request);
      
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            imageUrls: JSON.stringify(['https://images.craigslist.org/img.jpg']),
          }),
        })
      );
    });

    it('should handle errors during listing processing', async () => {
      mockScrapeCraigslist.mockResolvedValue({
        success: true,
        listings: [
          {
            title: 'Good Item',
            price: '$500',
            url: 'https://tampa.craigslist.org/item6',
            externalId: 'cl-item-6',
          },
          {
            title: 'Bad Item',
            price: '$600',
            url: 'https://tampa.craigslist.org/item7',
            externalId: 'cl-item-7',
          },
        ],
      });

      // First upsert succeeds, second fails
      mockUpsert
        .mockResolvedValueOnce({ id: 'listing-6' })
        .mockRejectedValueOnce(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.savedCount).toBe(1); // Only first one saved
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error processing listing cl-item-7:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should return first 10 listings in response', async () => {
      const listings = Array.from({ length: 25 }, (_, i) => ({
        title: `Item ${i + 1}`,
        price: '$100',
        url: `https://tampa.craigslist.org/item${i + 1}`,
        externalId: `cl-item-${i + 1}`,
      }));

      mockScrapeCraigslist.mockResolvedValue({
        success: true,
        listings,
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.listings.length).toBe(10); // Only first 10 returned
      expect(data.totalScraped).toBe(25);
    });

    it('should handle cloud function returning empty listings array', async () => {
      mockScrapeCraigslist.mockResolvedValue({
        success: true,
        listings: [],
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.savedCount).toBe(0);
      expect(data.totalScraped).toBe(0);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('should handle cloud function returning null listings', async () => {
      mockScrapeCraigslist.mockResolvedValue({
        success: true,
        listings: null,
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.savedCount).toBe(0);
      expect(data.totalScraped).toBe(0);
    });

    it('should handle unexpected errors in POST route', async () => {
      mockScrapeCraigslist.mockRejectedValue(new Error('Network timeout'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        message: 'Failed to scrape listings',
        error: 'Network timeout',
      });
      expect(consoleSpy).toHaveBeenCalledWith('API route error:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle unknown error types', async () => {
      mockScrapeCraigslist.mockRejectedValue('String error'); // Not an Error object

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Unknown error');

      consoleSpy.mockRestore();
    });

    it('should parse prices correctly with currency symbols', async () => {
      mockScrapeCraigslist.mockResolvedValue({
        success: true,
        listings: [
          {
            title: 'Test Item',
            price: '$1,234.56', // Comma and dollar sign
            url: 'https://tampa.craigslist.org/item',
            externalId: 'cl-item-price',
          },
        ],
      });

      const request = createMockRequest('POST', '/api/scraper/craigslist', {
        location: 'tampa',
        category: 'electronics',
      });

      await POST(request);

      expect(mockEstimateValue).toHaveBeenCalledWith(
        'Test Item',
        null,
        1234.56, // Parsed correctly
        null,
        'electronics'
      );

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            askingPrice: 1234.56,
          }),
        })
      );
    });
  });
});

/**
 * @file Unit tests for OfferUp scraper API route
 * @author Stephen Boyett
 * @company Axovia AI
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/scraper/offerup/route';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { estimateValue, detectCategory, generatePurchaseMessage } from '@/lib/value-estimator';
import { downloadAndCacheImages, normalizeLocation } from '@/lib/image-service';

// Mock all dependencies
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    scraperJob: { create: jest.fn(), update: jest.fn() },
    listing: { upsert: jest.fn() },
  },
}));

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('@/lib/value-estimator', () => ({
  estimateValue: jest.fn(),
  detectCategory: jest.fn(),
  generatePurchaseMessage: jest.fn(),
}));

jest.mock('@/lib/image-service', () => ({
  downloadAndCacheImages: jest.fn(),
  normalizeLocation: jest.fn(),
}));

// Mock playwright - prevent actual browser launches
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(),
  },
}));

jest.mock('@/lib/sleep', () => ({
  sleep: jest.fn().mockResolvedValue(undefined),
}));

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockEstimateValue = estimateValue as jest.MockedFunction<typeof estimateValue>;
const mockDetectCategory = detectCategory as jest.MockedFunction<typeof detectCategory>;
const mockGeneratePurchaseMessage = generatePurchaseMessage as jest.MockedFunction<typeof generatePurchaseMessage>;
const mockDownloadAndCacheImages = downloadAndCacheImages as jest.MockedFunction<typeof downloadAndCacheImages>;
const mockNormalizeLocation = normalizeLocation as jest.MockedFunction<typeof normalizeLocation>;

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/scraper/offerup', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GET /api/scraper/offerup', () => {
  it('returns platform info and supported categories', async () => {
    const res = await GET();
    const json = await res.json();
    expect(json.platform).toBe('offerup');
    expect(json.status).toBe('ready');
    expect(json.supportedCategories).toContain('electronics');
    expect(json.supportedLocations).toContain('tampa-fl');
    expect(json.rateLimits).toBeDefined();
  });
});

describe('POST /api/scraper/offerup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-1' });
    (mockPrisma.scraperJob.update as jest.Mock).mockResolvedValue({});
    (mockPrisma.listing.upsert as jest.Mock).mockResolvedValue({});
    mockDetectCategory.mockReturnValue('electronics');
    mockEstimateValue.mockReturnValue({
      estimatedValue: 500,
      estimatedLow: 400,
      estimatedHigh: 600,
      profitPotential: 200,
      profitLow: 100,
      profitHigh: 300,
      valueScore: 75,
      discountPercent: 40,
      resaleDifficulty: 'medium',
      comparableUrls: [],
      reasoning: 'Good deal',
      notes: '',
      shippable: true,
      negotiable: true,
      tags: ['electronics'],
    } as any);
    mockGeneratePurchaseMessage.mockReturnValue('Hi, is this still available?');
    mockDownloadAndCacheImages.mockResolvedValue({ cachedUrls: ['cached.jpg'], successCount: 1 } as any);
    mockNormalizeLocation.mockReturnValue({ normalized: 'Tampa, FL' } as any);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null as any);
    const res = await POST(makeRequest({ location: 'tampa-fl' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when location is missing', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain('Location is required');
  });

  it('returns 400 for invalid location format', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    const res = await POST(makeRequest({ location: 'invalid!!!' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain('Invalid location format');
  });

  it('accepts valid supported location', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    // This will fail at playwright level since we mock it, but should pass auth/validation
    const { chromium } = require('playwright');
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      content: jest.fn().mockResolvedValue('<html></html>'),
      evaluate: jest.fn().mockResolvedValue([]),
    };
    const mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      route: jest.fn().mockResolvedValue(undefined),
    };
    const mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue(undefined),
    };
    chromium.launch.mockResolvedValue(mockBrowser);

    const res = await POST(makeRequest({ location: 'tampa-fl', category: 'electronics' }));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.listings).toEqual([]);
  });

  it('accepts custom location matching city-state pattern', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    const { chromium } = require('playwright');
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      content: jest.fn().mockResolvedValue('<html></html>'),
      evaluate: jest.fn().mockResolvedValue([]),
    };
    const mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      route: jest.fn().mockResolvedValue(undefined),
    };
    const mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue(undefined),
    };
    chromium.launch.mockResolvedValue(mockBrowser);

    const res = await POST(makeRequest({ location: 'boston-ma' }));
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('handles blocked/captcha responses', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    const { chromium } = require('playwright');
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockRejectedValue(new Error('timeout')),
      content: jest.fn().mockResolvedValue('<html>Access Denied blocked</html>'),
      evaluate: jest.fn().mockResolvedValue([]),
    };
    const mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      route: jest.fn().mockResolvedValue(undefined),
    };
    const mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue(undefined),
    };
    chromium.launch.mockResolvedValue(mockBrowser);

    const res = await POST(makeRequest({ location: 'tampa-fl' }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.message).toContain('blocked');
  });

  it('processes scraped listings with opportunities', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    const { chromium } = require('playwright');
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      content: jest.fn().mockResolvedValue('<html>normal page</html>'),
      evaluate: jest.fn().mockResolvedValue([
        { title: 'iPhone 15', price: '$500', url: 'https://offerup.com/item/detail/123', location: 'Tampa', imageUrl: 'img.jpg', condition: 'Good' },
        { title: 'Free stuff', price: 'Free', url: 'https://offerup.com/item/detail/456', location: 'Tampa' },
      ]),
    };
    const mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      route: jest.fn().mockResolvedValue(undefined),
    };
    const mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue(undefined),
    };
    chromium.launch.mockResolvedValue(mockBrowser);

    const res = await POST(makeRequest({ location: 'tampa-fl' }));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.savedCount).toBe(1); // Free item skipped
    expect(json.opportunitiesFound).toBe(1); // valueScore 75 >= 70
  });

  it('handles DB error during scrape gracefully', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    (mockPrisma.scraperJob.create as jest.Mock).mockRejectedValue(new Error('DB connection error'));

    const res = await POST(makeRequest({ location: 'tampa-fl' }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('handles non-opportunity listings (low value score)', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    mockEstimateValue.mockReturnValue({
      estimatedValue: 100,
      estimatedLow: 80,
      estimatedHigh: 120,
      profitPotential: 10,
      profitLow: 0,
      profitHigh: 20,
      valueScore: 30,
      discountPercent: 5,
      resaleDifficulty: 'hard',
      comparableUrls: [],
      reasoning: 'Bad deal',
      notes: '',
      shippable: false,
      negotiable: false,
      tags: [],
    } as any);

    const { chromium } = require('playwright');
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      content: jest.fn().mockResolvedValue('<html></html>'),
      evaluate: jest.fn().mockResolvedValue([
        { title: 'Old TV', price: '$50', url: 'https://offerup.com/item/detail/789', location: 'Tampa' },
      ]),
    };
    const mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      route: jest.fn().mockResolvedValue(undefined),
    };
    chromium.launch.mockResolvedValue({
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue(undefined),
    });
    mockDownloadAndCacheImages.mockResolvedValue({ cachedUrls: [], successCount: 0 } as any);

    const res = await POST(makeRequest({ location: 'tampa-fl' }));
    const json = await res.json();
    expect(json.opportunitiesFound).toBe(0);
    expect(json.savedCount).toBe(1);
  });
});

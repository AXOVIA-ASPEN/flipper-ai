/**
 * @file Unit tests for listings description generation API
 * @author Stephen Boyett
 * @company Axovia AI
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/listings/[id]/description/route';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/listings/listing-1/description', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const mockListing = {
  id: 'listing-1',
  userId: 'user-123',
  title: 'iPhone 15 Pro',
  description: 'Excellent condition',
  condition: 'Like New',
  identifiedCondition: 'Excellent',
  identifiedBrand: 'Apple',
  identifiedModel: 'iPhone 15 Pro',
  identifiedVariant: '256GB',
  category: 'cell_phones',
  askingPrice: 800,
  estimatedValue: 950,
  priceReasoning: 'Below market value',
};

const routeParams = { params: Promise.resolve({ id: 'listing-1' }) };

describe('POST /api/listings/[id]/description', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Remove API keys to test fallback path
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null as any);
    const res = await POST(makeRequest(), routeParams);
    expect(res.status).toBe(401);
  });

  it('returns 404 when listing not found', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest(), routeParams);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid platform', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const res = await POST(makeRequest({ platform: 'invalid' }), routeParams);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid platform');
  });

  it('generates fallback description when no API key', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const res = await POST(makeRequest({ platform: 'ebay' }), routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.source).toBe('template');
    expect(json.data.title).toContain('Apple');
    expect(json.data.platform).toBe('ebay');
  });

  it('generates fallback for facebook platform with local pickup', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const res = await POST(makeRequest({ platform: 'facebook' }), routeParams);
    const json = await res.json();
    expect(json.data.description).toContain('Local pickup');
  });

  it('generates fallback for craigslist platform with local pickup', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const res = await POST(makeRequest({ platform: 'craigslist' }), routeParams);
    const json = await res.json();
    expect(json.data.description).toContain('Local pickup');
  });

  it('generates fallback for mercari with shipping note', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const res = await POST(makeRequest({ platform: 'mercari' }), routeParams);
    const json = await res.json();
    expect(json.data.description).toContain('Ships quickly');
  });

  it('uses defaults when body is empty/invalid JSON', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const req = new NextRequest('http://localhost:3000/api/listings/listing-1/description', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req, routeParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.source).toBe('template');
  });

  it('handles listing with minimal fields in fallback', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    const minimalListing = {
      ...mockListing,
      identifiedCondition: null,
      identifiedBrand: null,
      identifiedModel: null,
      description: null,
      category: null,
      estimatedValue: null,
    };
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(minimalListing);
    const res = await POST(makeRequest({ platform: 'offerup' }), routeParams);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.suggestedPrice).toBe(800); // Falls back to askingPrice
  });

  it('uses AI when OPENAI_API_KEY is set', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockGetAuthUserId.mockResolvedValue('user-123');
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);

    const OpenAI = require('openai').default;
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            title: 'Apple iPhone 15 Pro - Excellent Condition',
            description: 'Great phone for sale',
            highlights: ['Excellent condition', 'Apple'],
            suggestedPrice: 900,
            keywords: ['iphone', 'apple'],
          }),
        },
      }],
    });
    OpenAI.mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));

    const res = await POST(makeRequest({ platform: 'ebay' }), routeParams);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.source).toBe('ai');
    expect(json.data.title).toContain('Apple');
  });

  it('uses fallback values when AI response is missing optional fields', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockGetAuthUserId.mockResolvedValue('user-123');
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);

    const OpenAI = require('openai').default;
    OpenAI.mockImplementation(() => ({
      chat: { completions: { create: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            // Minimal response: no title, highlights, suggestedPrice, keywords
            content: JSON.stringify({ description: 'Good phone' }),
          },
        }],
      })},
    }}));

    const res = await POST(makeRequest({ platform: 'ebay' }), routeParams);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.source).toBe('ai');
    expect(json.data.title).toBe(mockListing.title); // Falls back to listing.title
    expect(json.data.highlights).toEqual([]); // Falls back to []
    expect(json.data.keywords).toEqual([]); // Falls back to []
    expect(json.data.suggestedPrice).toBe(mockListing.estimatedValue); // Falls back to estimatedValue
  });

  it('returns 502 when AI returns empty content', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockGetAuthUserId.mockResolvedValue('user-123');
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);

    const OpenAI = require('openai').default;
    OpenAI.mockImplementation(() => ({
      chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: null } }] }) } },
    }));

    const res = await POST(makeRequest({ platform: 'ebay' }), routeParams);
    expect(res.status).toBe(502);
  });

  it('returns 500 on unexpected error', async () => {
    mockGetAuthUserId.mockResolvedValue('user-123');
    (mockPrisma.listing.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));
    const res = await POST(makeRequest(), routeParams);
    expect(res.status).toBe(500);
  });
});

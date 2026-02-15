/**
 * Tests for /api/listings/[id]/description route
 * Covers: POST - AI description generation with fallback
 */
import { POST } from '@/app/api/listings/[id]/description/route';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findFirst: jest.fn(),
    },
  },
}));
jest.mock('@/lib/auth-middleware');
jest.mock('openai');

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeRequest(body?: unknown): Request {
  return {
    method: 'POST',
    json: () => Promise.resolve(body || {}),
  } as unknown as Request;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const mockListing = {
  id: 'listing-1',
  userId: 'user-1',
  title: 'iPhone 14 Pro Max 256GB',
  description: 'Great condition, barely used. Includes original box.',
  condition: 'Like New',
  identifiedBrand: 'Apple',
  identifiedModel: 'iPhone 14 Pro Max',
  identifiedVariant: '256GB Space Black',
  identifiedCondition: 'Excellent',
  category: 'Electronics',
  askingPrice: 800,
  estimatedValue: 950,
  priceReasoning: 'Based on eBay sold comparables',
  platform: 'craigslist',
  externalId: 'ext-1',
  url: 'https://example.com',
  imageUrls: '[]',
  scrapedAt: new Date(),
  status: 'NEW',
};

describe('/api/listings/[id]/description', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue('user-1');
    // Clear env to test fallback
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await POST(makeRequest() as any, makeParams('listing-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when listing not found', async () => {
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest() as any, makeParams('listing-999'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid platform', async () => {
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const res = await POST(makeRequest({ platform: 'amazon' }) as any, makeParams('listing-1'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid platform');
  });

  it('generates fallback description when no API key', async () => {
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const res = await POST(makeRequest({ platform: 'ebay' }) as any, makeParams('listing-1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.source).toBe('template');
    expect(json.data.title).toContain('Apple');
    expect(json.data.description).toContain('Excellent');
    expect(json.data.keywords).toContain('Apple');
    expect(json.data.platform).toBe('ebay');
  });

  it('uses default platform (ebay) when not specified', async () => {
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const res = await POST(makeRequest({}) as any, makeParams('listing-1'));
    const json = await res.json();

    expect(json.data.platform).toBe('ebay');
  });

  it('generates facebook description with local pickup', async () => {
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const res = await POST(makeRequest({ platform: 'facebook' }) as any, makeParams('listing-1'));
    const json = await res.json();

    expect(json.data.description).toContain('Local pickup');
  });

  it('generates craigslist description with local pickup', async () => {
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const res = await POST(makeRequest({ platform: 'craigslist' }) as any, makeParams('listing-1'));
    const json = await res.json();

    expect(json.data.description).toContain('Local pickup');
  });

  it('generates mercari description with shipping mention', async () => {
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const res = await POST(makeRequest({ platform: 'mercari' }) as any, makeParams('listing-1'));
    const json = await res.json();

    expect(json.data.description).toContain('Ships quickly');
  });

  it('handles listing with minimal data', async () => {
    const minimalListing = {
      ...mockListing,
      identifiedBrand: null,
      identifiedModel: null,
      identifiedCondition: null,
      condition: null,
      category: null,
      estimatedValue: null,
    };
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(minimalListing);
    const res = await POST(makeRequest() as any, makeParams('listing-1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.suggestedPrice).toBe(800); // Falls back to askingPrice
  });

  it('handles malformed request body gracefully', async () => {
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const req = {
      method: 'POST',
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    } as unknown as Request;

    const res = await POST(req as any, makeParams('listing-1'));
    const json = await res.json();

    expect(res.status).toBe(200); // Falls through to defaults
    expect(json.data.platform).toBe('ebay');
  });

  it('handles server errors', async () => {
    (mockPrisma.listing.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));
    const res = await POST(makeRequest() as any, makeParams('listing-1'));
    expect(res.status).toBe(500);
  });

  it('includes highlights in fallback response', async () => {
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);
    const res = await POST(makeRequest() as any, makeParams('listing-1'));
    const json = await res.json();

    expect(json.data.highlights).toEqual(expect.arrayContaining(['Apple', 'Excellent']));
  });

  it('accepts all valid platforms', async () => {
    (mockPrisma.listing.findFirst as jest.Mock).mockResolvedValue(mockListing);

    for (const platform of ['ebay', 'mercari', 'facebook', 'offerup', 'craigslist']) {
      const res = await POST(makeRequest({ platform }) as any, makeParams('listing-1'));
      expect(res.status).toBe(200);
    }
  });
});

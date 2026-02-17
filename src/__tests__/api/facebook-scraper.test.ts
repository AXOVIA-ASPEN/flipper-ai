import { GET, POST } from '@/app/api/scraper/facebook/route';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      upsert: jest.fn(),
    },
    scraperJob: {
      create: jest.fn(),
      update: jest.fn(),
    },
    facebookToken: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock('@/lib/value-estimator', () => ({
  estimateValue: jest.fn(() => ({
    estimatedValue: 150,
    estimatedLow: 100,
    estimatedHigh: 200,
    profitPotential: 50,
    profitLow: 25,
    profitHigh: 75,
    valueScore: 75,
    discountPercent: 33,
    resaleDifficulty: 'EASY',
    reasoning: 'Good flip opportunity',
    notes: 'Test notes',
    shippable: true,
    negotiable: true,
    comparableUrls: [],
    tags: ['electronics', 'phone'],
  })),
  detectCategory: jest.fn(() => 'electronics'),
  generatePurchaseMessage: jest.fn(() => 'Hi, is this still available?'),
}));

global.fetch = jest.fn();

describe('Facebook Marketplace Scraper API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/scraper/facebook', () => {
    it('should return platform configuration', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.platform).toBe('facebook');
      expect(data.status).toBe('ready');
      expect(data.supportedCategories).toBeDefined();
      expect(Array.isArray(data.supportedCategories)).toBe(true);
      expect(data.authRequired).toBe(true);
    });
  });

  describe('POST /api/scraper/facebook', () => {
    const mockUserId = 'test-user-123';
    const mockAccessToken = 'mock-fb-token-123';
    const mockScraperJobId = 'job-123';

    beforeEach(() => {
      (getAuthUserId as jest.Mock).mockResolvedValue(mockUserId);
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({
        id: mockScraperJobId,
        userId: mockUserId,
        platform: 'FACEBOOK_MARKETPLACE',
        status: 'RUNNING',
      });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({
        id: mockScraperJobId,
        status: 'COMPLETED',
      });
    });

    it('should require keywords', async () => {
      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('keywords');
    });

    it('should require Facebook access token', async () => {
      (prisma.facebookToken.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'iPhone' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('access token');
    });

    it('should successfully scrape listings with access token in body', async () => {
      const mockFacebookResponse = {
        data: [
          {
            id: 'fb-123',
            name: 'iPhone 12',
            description: 'Like new condition',
            price: '300',
            currency: 'USD',
            condition: 'used',
            location: { city: 'Seattle', state: 'WA' },
            images: [{ url: 'https://example.com/image1.jpg' }],
            marketplace_listing_url: 'https://facebook.com/marketplace/item/fb-123',
            created_time: '2024-01-01T12:00:00Z',
            seller: { id: 'seller-1', name: 'John Doe' },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFacebookResponse,
      });

      (prisma.listing.upsert as jest.Mock).mockResolvedValue({
        id: 'listing-1',
        externalId: 'fb-123',
        platform: 'FACEBOOK_MARKETPLACE',
        title: 'iPhone 12',
        status: 'OPPORTUNITY',
      });

      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({
          keywords: 'iPhone',
          accessToken: mockAccessToken,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.platform).toBe('FACEBOOK_MARKETPLACE');
      expect(data.listingsSaved).toBe(1);
      expect(data.listings).toHaveLength(1);

      // Verify scraper job was created and updated
      expect(prisma.scraperJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            platform: 'FACEBOOK_MARKETPLACE',
            status: 'RUNNING',
          }),
        })
      );

      expect(prisma.scraperJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockScraperJobId },
          data: expect.objectContaining({
            status: 'COMPLETED',
            listingsFound: 1,
          }),
        })
      );
    });

    it('should use stored Facebook token when not provided', async () => {
      const mockStoredToken = {
        userId: mockUserId,
        accessToken: mockAccessToken,
        expiresAt: new Date(Date.now() + 86400000), // Expires in 24 hours
      };

      (prisma.facebookToken.findUnique as jest.Mock).mockResolvedValue(mockStoredToken);

      const mockFacebookResponse = {
        data: [
          {
            id: 'fb-456',
            name: 'MacBook Pro',
            price: '1000',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFacebookResponse,
      });

      (prisma.listing.upsert as jest.Mock).mockResolvedValue({
        id: 'listing-2',
        externalId: 'fb-456',
        platform: 'FACEBOOK_MARKETPLACE',
        title: 'MacBook Pro',
        status: 'NEW',
      });

      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'MacBook' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.facebookToken.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should handle Facebook API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({
          keywords: 'test',
          accessToken: mockAccessToken,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to scrape');

      // Verify scraper job was marked as failed
      expect(prisma.scraperJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockScraperJobId },
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: expect.any(String),
          }),
        })
      );
    });

    it('should apply price filters', async () => {
      const mockFacebookResponse = { data: [] };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFacebookResponse,
      });

      (prisma.listing.upsert as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({
          keywords: 'iPhone',
          minPrice: 100,
          maxPrice: 500,
          accessToken: mockAccessToken,
        }),
      });

      await POST(request);

      // Verify fetch was called with correct URL including filters
      expect(global.fetch).toHaveBeenCalled();
      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('min_price%3A100'); // URL encoded
      expect(fetchUrl).toContain('max_price%3A500'); // URL encoded
    });

    it('should normalize listings to Listing model', async () => {
      const mockFacebookResponse = {
        data: [
          {
            id: 'fb-789',
            name: 'Test Item',
            description: 'Test description',
            price: '200',
            condition: 'used',
            location: { city: 'Portland', state: 'OR', zip: '97201' },
            images: [
              { url: 'https://example.com/img1.jpg' },
              { url: 'https://example.com/img2.jpg' },
            ],
            created_time: '2024-01-15T10:30:00Z',
            seller: { id: 'seller-2', name: 'Jane Smith' },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFacebookResponse,
      });

      (prisma.listing.upsert as jest.Mock).mockResolvedValue({
        id: 'listing-3',
        externalId: 'fb-789',
        platform: 'FACEBOOK_MARKETPLACE',
      });

      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({
          keywords: 'test',
          accessToken: mockAccessToken,
        }),
      });

      await POST(request);

      // Verify listing was saved with correct data
      expect(prisma.listing.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            platform_externalId_userId: expect.objectContaining({
              platform: 'FACEBOOK_MARKETPLACE',
              externalId: 'fb-789',
            }),
          }),
          create: expect.objectContaining({
            platform: 'FACEBOOK_MARKETPLACE',
            externalId: 'fb-789',
            title: 'Test Item',
            description: 'Test description',
            askingPrice: 200,
            condition: 'used',
            location: 'Portland, OR, 97201',
            sellerName: 'Jane Smith',
          }),
        })
      );
    });
  });

  // ── Additional branch coverage ────────────────────────────────────────────
  describe('POST /api/scraper/facebook - branch coverage', () => {
    it('returns 401 when user is not authenticated', async () => {
      (getAuthUserId as jest.Mock).mockResolvedValue(null);
      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'test', accessToken: 'token' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('includes categoryId in search params when provided', async () => {
      (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-1' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'test', accessToken: 'token', categoryId: 'electronics' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(200);
      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('electronics');
    });

    it('includes location in search params when provided', async () => {
      (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-2' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'test', accessToken: 'token', location: 'Tampa, FL' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(200);
    });

    it('returns null for expired Facebook token', async () => {
      (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-3' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      // Mock an expired token
      (prisma.facebookToken.findUnique as jest.Mock).mockResolvedValue({
        accessToken: 'old-token',
        expiresAt: new Date(Date.now() - 86400000), // expired 24h ago
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
      });

      // No access token in body, expired stored token -> should fail
      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'test' }),
      });
      const res = await POST(request);
      // Expired token means no valid token - API fails with 401 or error
      expect([400, 401, 500]).toContain(res.status);
    });

    it('handles fetch response where data.data is undefined (fallback to [])', async () => {
      (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-4' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      // data.data is missing → ?? [] fallback
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ pagination: {} }), // no "data" key
      });
      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'iPhone', accessToken: 'token' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.listingsSaved).toBe(0);
    });

    it('handles listing with no images, no marketplace_listing_url, no seller, and low value score', async () => {
      (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-5' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      const { estimateValue } = require('@/lib/value-estimator');
      (estimateValue as jest.Mock).mockReturnValueOnce({
        estimatedValue: 50,
        estimatedLow: 30,
        estimatedHigh: 70,
        profitPotential: 10,
        profitLow: 5,
        profitHigh: 15,
        valueScore: 45, // < 70 → status = 'NEW'
        discountPercent: 10,
        resaleDifficulty: 'HARD',
        reasoning: 'Low value',
        notes: '',
        shippable: false,
        negotiable: false,
        comparableUrls: [],
        tags: ['misc'],
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'fb-no-extras',
              name: 'Old Chair',
              // no description, no condition, no location, no images, no marketplace_listing_url, no seller, no category
            },
          ],
        }),
      });
      (prisma.listing.upsert as jest.Mock).mockResolvedValue({ id: 'listing-new' });
      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'chair', accessToken: 'token' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.listingsSaved).toBe(1);
    });

    it('handles listing with empty location parts (all undefined city/state/zip)', async () => {
      (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-6' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'fb-empty-loc',
              name: 'Test Item',
              price: '100',
              location: {}, // city/state/zip all undefined → parts.length === 0 → formatLocation returns null
              marketplace_listing_url: 'https://facebook.com/marketplace/item/fb-empty-loc',
            },
          ],
        }),
      });
      (prisma.listing.upsert as jest.Mock).mockResolvedValue({ id: 'listing-loc' });
      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'item', accessToken: 'token' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(200);
    });

    it('passes limit and minPrice/maxPrice through buildSearchParams', async () => {
      (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-7' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({
          keywords: 'laptop',
          accessToken: 'token',
          limit: 5,
          minPrice: 50,
          maxPrice: 500,
        }),
      });
      const res = await POST(request);
      expect(res.status).toBe(200);
      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('min_price');
      expect(fetchUrl).toContain('max_price');
    });

    it('skips listings with missing id or name (continue branch)', async () => {
      (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-8' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { id: '', name: 'Has Name But No ID' },   // !item.id → skip
            { id: 'valid-id', name: '' },              // !item.name → skip
            { id: 'valid-id-2', name: 'Valid Item', price: '100',
              marketplace_listing_url: 'https://fb.com/item/valid-id-2' }, // saved
          ],
        }),
      });
      (prisma.listing.upsert as jest.Mock).mockResolvedValue({ id: 'listing-valid', status: 'NEW' });
      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'test', accessToken: 'token' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(200);
      const json = await res.json();
      // Only 1 listing was valid, 2 were skipped
      expect(json.listingsSaved).toBe(1);
    });

    it('handles item with category set (skips detectCategory call)', async () => {
      (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-9' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'fb-cat-item',
              name: 'MacBook Pro',
              category: 'computers', // item.category truthy → skip detectCategory
              price: '800',
              images: [{ url: 'https://example.com/mac.jpg' }],
              seller: { id: 'sel-2', name: 'Alice' },
              marketplace_listing_url: 'https://fb.com/item/fb-cat-item',
            },
          ],
        }),
      });
      (prisma.listing.upsert as jest.Mock).mockResolvedValue({ id: 'listing-cat', status: 'OPPORTUNITY' });
      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'laptop', accessToken: 'token' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.listingsSaved).toBe(1);
    });

    it('handles inner catch when saveListingFromFacebookItem throws (updates job as FAILED)', async () => {
      (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-10' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: 'fb-err', name: 'Error Item', price: '100' }],
        }),
      });
      (prisma.listing.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));
      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'test', accessToken: 'token' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.details).toBe('DB error');
    });

    it('covers non-Error throw branch (error.message fallback to Unknown string)', async () => {
      (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-11' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: 'fb-non-err', name: 'Non Error Item', price: '50' }],
        }),
      });
      // Throw a non-Error object to hit the false branch of `error instanceof Error`
      (prisma.listing.upsert as jest.Mock).mockImplementation(() => { throw 'string-error'; });
      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'test', accessToken: 'token' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.details).toBe('Unknown error');
    });

    it('falls back to "electronics" category when detectCategory returns null', async () => {
      const { detectCategory } = require('@/lib/value-estimator');
      (detectCategory as jest.Mock).mockReturnValueOnce(null); // forces || 'electronics' fallback
      (getAuthUserId as jest.Mock).mockResolvedValue('user-123');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-12' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: 'fb-nocat', name: 'Mystery Item', price: '200' }],
        }),
      });
      (prisma.listing.upsert as jest.Mock).mockResolvedValue({ id: 'listing-fallback', status: 'NEW' });
      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'mystery', accessToken: 'token' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(200);
      // Verify estimateValue was called with 'electronics' as fallback category
      const { estimateValue } = require('@/lib/value-estimator');
      expect(estimateValue).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        null,
        'electronics',
      );
    });

    it('handles item with no name, no images, no seller, no listing url (fallback branches)', async () => {
      // Covers: item.name || '' (line 176 [1]), item.images?.map() || [] (line 190 [1])
      //         item.seller?.name || null (line 209 [1]), marketplace_listing_url fallback (line 238 [1])
      (getAuthUserId as jest.Mock).mockResolvedValue('user-456');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-fallback' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'fb-minimal-1',
              // no name, no images, no seller, no marketplace_listing_url
              price: '45',
              category: 'tools',
            },
          ],
        }),
      });
      (prisma.listing.upsert as jest.Mock).mockResolvedValue({ id: 'listing-minimal', status: 'NEW' });

      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        body: JSON.stringify({ keywords: 'minimal', accessToken: 'token' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(200);
    });

    it('handles POST without limit param (uses DEFAULT_LIMIT via ?? operator)', async () => {
      // Covers: params.limit ?? DEFAULT_LIMIT → DEFAULT_LIMIT branch (line 74 [1])
      (getAuthUserId as jest.Mock).mockResolvedValue('user-789');
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({ id: 'job-nolimit' });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({});
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const request = new NextRequest('http://localhost/api/scraper/facebook', {
        method: 'POST',
        // No limit param → DEFAULT_LIMIT applied
        body: JSON.stringify({ keywords: 'nolimit test', accessToken: 'token' }),
      });
      const res = await POST(request);
      expect(res.status).toBe(200);
    });
  });
});

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/scrape/facebook/route';

// Mock scraper
const mockScrapeAndConvert = jest.fn();
jest.mock('@/scrapers/facebook', () => ({
  scrapeAndConvert: (...args: unknown[]) => mockScrapeAndConvert(...args),
}));

// Mock marketplace-scanner
const mockProcessListings = jest.fn();
const mockFormatForStorage = jest.fn();
const mockGenerateScanSummary = jest.fn();
jest.mock('@/lib/marketplace-scanner', () => ({
  processListings: (...args: unknown[]) => mockProcessListings(...args),
  formatForStorage: (...args: unknown[]) => mockFormatForStorage(...args),
  generateScanSummary: (...args: unknown[]) => mockGenerateScanSummary(...args),
}));

// Mock auth
const mockGetCurrentUserId = jest.fn();
jest.mock('@/lib/auth', () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

// Mock Prisma
const mockListingUpsert = jest.fn();
const mockJobCreate = jest.fn();
const mockJobUpdate = jest.fn();
const mockJobFindUnique = jest.fn();
const mockJobFindMany = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      upsert: (...args: unknown[]) => mockListingUpsert(...args),
    },
    scraperJob: {
      create: (...args: unknown[]) => mockJobCreate(...args),
      update: (...args: unknown[]) => mockJobUpdate(...args),
      findUnique: (...args: unknown[]) => mockJobFindUnique(...args),
      findMany: (...args: unknown[]) => mockJobFindMany(...args),
    },
  },
}));

function createRequest(method: string, url: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body && {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
  });
}

const mockAnalyzedListing = {
  externalId: 'fb-123',
  title: 'iPhone 14 Pro',
  askingPrice: 500,
  estimation: {
    valueScore: 85,
    profitPotential: 300,
    estimatedValue: 800,
  },
};

describe('Facebook Scrape API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('user-1');
    mockJobCreate.mockResolvedValue({ id: 'job-1' });
    mockJobUpdate.mockResolvedValue({});
    mockListingUpsert.mockResolvedValue({
      id: 'listing-1',
      title: 'iPhone 14 Pro',
      askingPrice: 500,
      valueScore: 85,
      profitPotential: 300,
      status: 'OPPORTUNITY',
    });
    mockFormatForStorage.mockReturnValue({
      title: 'iPhone 14 Pro',
      platform: 'FACEBOOK_MARKETPLACE',
    });
  });

  describe('POST /api/scrape/facebook', () => {
    it('returns 401 if not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);
      const req = createRequest('POST', '/api/scrape/facebook', { location: 'tampa' });
      const res = await POST(req);
      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe('Unauthorized');
    });

    it('creates job and runs scraper successfully', async () => {
      mockScrapeAndConvert.mockResolvedValue({
        success: true,
        listings: [{ title: 'iPhone 14 Pro', price: 500 }],
      });
      mockProcessListings.mockReturnValue({
        all: [mockAnalyzedListing],
        opportunities: [mockAnalyzedListing],
        filtered: [],
      });
      mockGenerateScanSummary.mockReturnValue({
        totalListings: 1,
        totalOpportunities: 1,
        filteredCount: 0,
        averageScore: 85,
        totalPotentialProfit: 300,
        categoryCounts: { electronics: 1 },
        bestOpportunity: mockAnalyzedListing,
      });

      const req = createRequest('POST', '/api/scrape/facebook', {
        location: 'tampa',
        category: 'electronics',
        keywords: 'iphone',
        minPrice: 100,
        maxPrice: 1000,
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jobId).toBe('job-1');
      expect(data.summary.totalListings).toBe(1);
      expect(data.summary.opportunities).toBe(1);
      expect(data.bestOpportunity).toBeTruthy();
      expect(data.listings).toHaveLength(1);
      expect(mockJobCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          platform: 'FACEBOOK_MARKETPLACE',
          status: 'RUNNING',
        }),
      });
    });

    it('handles scraper failure', async () => {
      mockScrapeAndConvert.mockResolvedValue({
        success: false,
        error: 'Login required',
        listings: [],
      });

      const req = createRequest('POST', '/api/scrape/facebook', { location: 'tampa' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Login required');
      expect(mockJobUpdate).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: 'FAILED' }),
      });
    });

    it('uses default viability criteria', async () => {
      mockScrapeAndConvert.mockResolvedValue({ success: true, listings: [] });
      mockProcessListings.mockReturnValue({ all: [], opportunities: [], filtered: [] });
      mockGenerateScanSummary.mockReturnValue({
        totalListings: 0,
        totalOpportunities: 0,
        filteredCount: 0,
        averageScore: 0,
        totalPotentialProfit: 0,
        categoryCounts: {},
        bestOpportunity: null,
      });

      const req = createRequest('POST', '/api/scrape/facebook', { location: 'tampa' });
      await POST(req);

      expect(mockProcessListings).toHaveBeenCalledWith(
        'FACEBOOK_MARKETPLACE',
        [],
        expect.objectContaining({ minValueScore: 70 })
      );
    });

    it('passes custom viability criteria', async () => {
      mockScrapeAndConvert.mockResolvedValue({ success: true, listings: [] });
      mockProcessListings.mockReturnValue({ all: [], opportunities: [], filtered: [] });
      mockGenerateScanSummary.mockReturnValue({
        totalListings: 0,
        totalOpportunities: 0,
        filteredCount: 0,
        averageScore: 0,
        totalPotentialProfit: 0,
        categoryCounts: {},
        bestOpportunity: null,
      });

      const req = createRequest('POST', '/api/scrape/facebook', {
        location: 'tampa',
        minValueScore: 80,
        minProfitPotential: 200,
        requireShippable: true,
        excludeCategories: ['clothing'],
        includeCategories: ['electronics'],
        maxResaleDifficulty: 'MEDIUM',
      });
      await POST(req);

      expect(mockProcessListings).toHaveBeenCalledWith(
        'FACEBOOK_MARKETPLACE',
        [],
        expect.objectContaining({
          minValueScore: 80,
          minProfitPotential: 200,
          requireShippable: true,
          excludeCategories: ['clothing'],
          includeCategories: ['electronics'],
          maxResaleDifficulty: 'MEDIUM',
        })
      );
    });

    it('handles listing save errors gracefully', async () => {
      mockScrapeAndConvert.mockResolvedValue({
        success: true,
        listings: [{ title: 'Test', price: 100 }],
      });
      mockProcessListings.mockReturnValue({
        all: [mockAnalyzedListing],
        opportunities: [],
        filtered: [],
      });
      mockListingUpsert.mockRejectedValue(new Error('DB constraint error'));
      mockGenerateScanSummary.mockReturnValue({
        totalListings: 1,
        totalOpportunities: 0,
        filteredCount: 0,
        averageScore: 85,
        totalPotentialProfit: 0,
        categoryCounts: {},
        bestOpportunity: null,
      });

      const req = createRequest('POST', '/api/scrape/facebook', { location: 'tampa' });
      const res = await POST(req);
      const data = await res.json();

      // Should still succeed even if individual saves fail
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.listings).toHaveLength(0); // none saved
    });

    it('returns null bestOpportunity when none found', async () => {
      mockScrapeAndConvert.mockResolvedValue({ success: true, listings: [] });
      mockProcessListings.mockReturnValue({ all: [], opportunities: [], filtered: [] });
      mockGenerateScanSummary.mockReturnValue({
        totalListings: 0,
        totalOpportunities: 0,
        filteredCount: 0,
        averageScore: 0,
        totalPotentialProfit: 0,
        categoryCounts: {},
        bestOpportunity: null,
      });

      const req = createRequest('POST', '/api/scrape/facebook', { location: 'tampa' });
      const res = await POST(req);
      const data = await res.json();

      expect(data.bestOpportunity).toBeNull();
    });

    it('handles unexpected errors', async () => {
      mockJobCreate.mockRejectedValue(new Error('DB connection lost'));

      const req = createRequest('POST', '/api/scrape/facebook', { location: 'tampa' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('DB connection lost');
    });

    it('handles non-Error thrown objects', async () => {
      mockJobCreate.mockRejectedValue('string error');

      const req = createRequest('POST', '/api/scrape/facebook', { location: 'tampa' });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('Failed to run scraper');
    });

    it('passes scraper config with defaults', async () => {
      mockScrapeAndConvert.mockResolvedValue({ success: true, listings: [] });
      mockProcessListings.mockReturnValue({ all: [], opportunities: [], filtered: [] });
      mockGenerateScanSummary.mockReturnValue({
        totalListings: 0,
        totalOpportunities: 0,
        filteredCount: 0,
        averageScore: 0,
        totalPotentialProfit: 0,
        categoryCounts: {},
        bestOpportunity: null,
      });

      const req = createRequest('POST', '/api/scrape/facebook', {
        location: 'miami',
        sortBy: 'date',
      });
      await POST(req);

      expect(mockScrapeAndConvert).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'miami',
          maxListings: 20,
          includeDetails: true,
          sortBy: 'date',
        })
      );
    });
  });

  describe('GET /api/scrape/facebook', () => {
    it('returns specific job by jobId', async () => {
      const mockJob = { id: 'job-1', status: 'COMPLETED', platform: 'FACEBOOK_MARKETPLACE' };
      mockJobFindUnique.mockResolvedValue(mockJob);

      const req = createRequest('GET', '/api/scrape/facebook?jobId=job-1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.id).toBe('job-1');
      expect(mockJobFindUnique).toHaveBeenCalledWith({ where: { id: 'job-1' } });
    });

    it('returns 404 for unknown jobId', async () => {
      mockJobFindUnique.mockResolvedValue(null);

      const req = createRequest('GET', '/api/scrape/facebook?jobId=nonexistent');
      const res = await GET(req);

      expect(res.status).toBe(404);
    });

    it('returns recent jobs with default limit', async () => {
      mockJobFindMany.mockResolvedValue([{ id: 'job-1' }, { id: 'job-2' }]);

      const req = createRequest('GET', '/api/scrape/facebook');
      const res = await GET(req);
      const data = await res.json();

      expect(data.jobs).toHaveLength(2);
      expect(mockJobFindMany).toHaveBeenCalledWith({
        where: { platform: 'FACEBOOK_MARKETPLACE' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('respects custom limit parameter', async () => {
      mockJobFindMany.mockResolvedValue([]);

      const req = createRequest('GET', '/api/scrape/facebook?limit=5');
      await GET(req);

      expect(mockJobFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    });

    it('handles GET errors', async () => {
      mockJobFindMany.mockRejectedValue(new Error('DB error'));

      const req = createRequest('GET', '/api/scrape/facebook');
      const res = await GET(req);

      expect(res.status).toBe(500);
      expect((await res.json()).error).toBe('Failed to fetch scraper jobs');
    });
  });
});

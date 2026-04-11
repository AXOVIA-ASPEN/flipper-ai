import { NextRequest } from 'next/server';
import { GET } from '@/app/api/opportunities/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/opportunities/[id]/route';

// Mock auth - getCurrentUserId is used by GET /api/opportunities
const mockGetCurrentUserId = jest.fn<Promise<string | null>, []>();

jest.mock('@/lib/auth', () => ({
  getCurrentUserId: (...args: unknown[]) => mockGetCurrentUserId(...(args as [])),
}));

// Mock Prisma client
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockListingUpdate = jest.fn();
const mockTransaction = jest.fn();
const mockOpportunityCount = jest.fn();

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    opportunity: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
      count: (...args: unknown[]) => mockOpportunityCount(...args),
    },
    listing: {
      update: (...args: unknown[]) => mockListingUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// Mock conversation status (Story 8.5)
const mockTransitionToPurchased = jest.fn();
jest.mock('@/lib/conversation-status', () => ({
  transitionToPurchased: (...args: unknown[]) => mockTransitionToPurchased(...args),
}));

// Mock notification events (Story 10.3)
const mockCreateFlipNotificationEvent = jest.fn();
jest.mock('@/lib/notification-events', () => ({
  createFlipNotificationEvent: (...args: unknown[]) =>
    mockCreateFlipNotificationEvent(...args),
  NotificationEventType: {
    OPPORTUNITY_FOUND: 'opportunity.found',
    FLIP_PURCHASED: 'flip.purchased',
    FLIP_LISTED: 'flip.listed',
    FLIP_SOLD: 'flip.sold',
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Helper: set up GET /api/opportunities mocks
// GET uses: findMany (paginated), count, findMany (all matching for stats)
function setupOpportunityGetMocks(opts: {
  opportunities?: unknown[];
  total?: number;
  allMatching?: Array<{ purchasePrice: number | null; resalePrice: number | null }>;
} = {}) {
  const { opportunities = [], total = 0, allMatching = [] } = opts;
  mockFindMany.mockResolvedValueOnce(opportunities).mockResolvedValueOnce(allMatching);
  mockOpportunityCount.mockResolvedValueOnce(total);
}

// Helper to create mock NextRequest
function createMockRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body && {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
  });
}

describe('Opportunities API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('test-user-id');
    mockTransitionToPurchased.mockResolvedValue(undefined);
    mockCreateFlipNotificationEvent.mockResolvedValue(undefined);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/opportunities
  // ──────────────────────────────────────────────────────────────────────────
  describe('GET /api/opportunities', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      const request = createMockRequest('GET', '/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return opportunities list with stats and pagination', async () => {
      const mockOpportunities = [
        {
          id: 'opp1',
          userId: 'test-user-id',
          status: 'IDENTIFIED',
          purchasePrice: null,
          resalePrice: null,
          listing: { id: 'listing1', title: 'Test Item', askingPrice: 100 },
        },
        {
          id: 'opp2',
          userId: 'test-user-id',
          status: 'PURCHASED',
          purchasePrice: 50,
          resalePrice: null,
          listing: { id: 'listing2', title: 'Another Item', askingPrice: 200 },
        },
      ];
      const allMatching = [
        { purchasePrice: null, resalePrice: null },
        { purchasePrice: 50, resalePrice: null },
      ];
      setupOpportunityGetMocks({ opportunities: mockOpportunities, total: 2, allMatching });

      const request = createMockRequest('GET', '/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.opportunities).toEqual(mockOpportunities);
      expect(data.stats).toEqual({
        totalOpportunities: 2,
        totalProfit: 0,
        totalInvested: 50,
        totalRevenue: 0,
      });
      expect(data.pagination).toEqual({
        page: 1,
        limit: 25,
        total: 2,
        totalPages: 1,
      });
    });

    it('should return empty list when no opportunities exist', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.opportunities).toEqual([]);
      expect(data.stats.totalOpportunities).toBe(0);
    });

    it('should respect the limit query parameter', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?limit=10');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should default limit to 25 when not provided', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
        })
      );
    });

    it('should filter by statuses multi-select', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?statuses=IDENTIFIED,PURCHASED');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'test-user-id',
            status: { in: ['IDENTIFIED', 'PURCHASED'] },
          },
        })
      );
    });

    it('should filter by platform on nested listing', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?platforms=EBAY');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'test-user-id',
            listing: { platform: { in: ['EBAY'] } },
          },
        })
      );
    });

    it('should filter by score range on nested listing', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?minScore=80');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'test-user-id',
            listing: { valueScore: { gte: 80 } },
          },
        })
      );
    });

    it('should filter by profit range on nested listing', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?minProfit=100');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'test-user-id',
            listing: { profitPotential: { gte: 100 } },
          },
        })
      );
    });

    it('should apply AND logic with multiple filters', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest(
        'GET',
        '/api/opportunities?statuses=IDENTIFIED&platforms=EBAY&minScore=80'
      );
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'test-user-id',
            status: { in: ['IDENTIFIED'] },
            listing: {
              platform: { in: ['EBAY'] },
              valueScore: { gte: 80 },
            },
          },
        })
      );
    });

    it('should calculate stats from all matching (not just page)', async () => {
      const allMatching = [
        { purchasePrice: 100, resalePrice: 200 },
        { purchasePrice: 50, resalePrice: 150 },
      ];
      setupOpportunityGetMocks({ total: 2, allMatching });

      const request = createMockRequest('GET', '/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(data.stats).toEqual({
        totalOpportunities: 2,
        totalProfit: 200, // (200-100) + (150-50)
        totalInvested: 150, // 100 + 50
        totalRevenue: 350, // 200 + 150
      });
    });

    it('should support pagination with page and limit', async () => {
      setupOpportunityGetMocks({ total: 50 });

      const request = createMockRequest('GET', '/api/opportunities?page=2&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 50,
        totalPages: 5,
      });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
    });

    it('should default page to 1 when page param is NaN', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?page=abc');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(1);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
    });

    it('should default limit to 25 when limit param is out of range', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?limit=200');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 25 }));
    });

    it('should filter by single status param (not statuses)', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?status=IDENTIFIED');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', status: { in: ['IDENTIFIED'] } },
        })
      );
    });

    it('should filter by single platform param on nested listing', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?platform=EBAY');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', listing: { platform: { in: ['EBAY'] } } },
        })
      );
    });

    it('should filter by maxScore only (no minScore — covers false gte branch)', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?maxScore=90');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', listing: { valueScore: { lte: 90 } } },
        })
      );
    });

    it('should filter by maxProfit only (no minProfit — covers false gte branch)', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?maxProfit=500');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', listing: { profitPotential: { lte: 500 } } },
        })
      );
    });

    it('should filter by single category param on nested listing', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?category=electronics');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id', listing: { category: { in: ['electronics'] } } },
        })
      );
    });

    it('should filter by categories multi-select on nested listing', async () => {
      setupOpportunityGetMocks();

      const request = createMockRequest('GET', '/api/opportunities?categories=electronics,tools');
      await GET(request);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'test-user-id',
            listing: { category: { in: ['electronics', 'tools'] } },
          },
        })
      );
    });

    it('should handle database errors with 500 status', async () => {
      mockFindMany.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockRequest('GET', '/api/opportunities');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /api/opportunities/[id]
  // ──────────────────────────────────────────────────────────────────────────
  describe('GET /api/opportunities/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      const request = createMockRequest('GET', '/api/opportunities/opp1');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return a single opportunity with listing', async () => {
      const mockOpportunity = {
        id: 'opp1',
        listingId: 'listing1',
        status: 'IDENTIFIED',
        purchasePrice: null,
        resalePrice: null,
        actualProfit: null,
        listing: {
          id: 'listing1',
          title: 'Test Item',
          askingPrice: 100,
        },
      };

      mockFindFirst.mockResolvedValue(mockOpportunity);

      const request = createMockRequest('GET', '/api/opportunities/opp1');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockOpportunity);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 'opp1', userId: 'test-user-id' },
        include: { listing: true },
      });
    });

    it('should return 404 when opportunity is not found or not owned by user', async () => {
      mockFindFirst.mockResolvedValue(null);

      const request = createMockRequest('GET', '/api/opportunities/nonexistent');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should handle database errors with 500 status', async () => {
      mockFindFirst.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('GET', '/api/opportunities/opp1');
      const response = await GET_BY_ID(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /api/opportunities/[id]
  // ──────────────────────────────────────────────────────────────────────────
  describe('PATCH /api/opportunities/[id]', () => {
    beforeEach(() => {
      // PATCH does an ownership-scoped findFirst before the update.
      mockFindFirst.mockResolvedValue({ id: 'opp1' });
    });

    it('should return 401 when not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'PURCHASED',
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should return 404 when opportunity is not owned by user', async () => {
      mockFindFirst.mockResolvedValue(null);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'PURCHASED',
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should reject mass-assigned non-allowlisted fields', async () => {
      mockUpdate.mockResolvedValue({
        id: 'opp1',
        status: 'PURCHASED',
        listing: { id: 'listing1' },
      });

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'PURCHASED',
        userId: 'attacker-id', // Should be ignored
        listingId: 'other-listing', // Should be ignored
        id: 'different-id', // Should be ignored
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.data.userId).toBeUndefined();
      expect(updateCall.data.listingId).toBeUndefined();
      expect(updateCall.data.id).toBeUndefined();
      expect(updateCall.data.status).toBe('PURCHASED');
    });

    it('should update an opportunity', async () => {
      const mockUpdated = {
        id: 'opp1',
        listingId: 'listing1',
        status: 'PURCHASED',
        purchasePrice: 100,
        resalePrice: null,
        actualProfit: null,
        listing: {
          id: 'listing1',
          title: 'Test Item',
        },
      };

      mockUpdate.mockResolvedValue(mockUpdated);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'PURCHASED',
        purchasePrice: 100,
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUpdated);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'opp1', userId: 'test-user-id' },
        data: { status: 'PURCHASED', purchasePrice: 100 },
        include: { listing: true },
      });
    });

    it('should calculate actualProfit when purchasePrice and resalePrice are provided with fees', async () => {
      const mockUpdated = {
        id: 'opp1',
        purchasePrice: 100,
        resalePrice: 150,
        fees: 10,
        actualProfit: 40,
        listing: { id: 'listing1' },
      };

      mockUpdate.mockResolvedValue(mockUpdated);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        purchasePrice: 100,
        resalePrice: 150,
        fees: 10,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      // actualProfit = resalePrice - purchasePrice - fees = 150 - 100 - 10 = 40
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actualProfit: 40,
          }),
        })
      );
    });

    it('should calculate actualProfit with fees defaulting to 0 when not provided', async () => {
      const mockUpdated = {
        id: 'opp1',
        purchasePrice: 100,
        resalePrice: 150,
        actualProfit: 50,
        listing: { id: 'listing1' },
      };

      mockUpdate.mockResolvedValue(mockUpdated);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        purchasePrice: 100,
        resalePrice: 150,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      // actualProfit = 150 - 100 - 0 = 50
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actualProfit: 50,
          }),
        })
      );
    });

    it('should not calculate actualProfit when only purchasePrice is provided', async () => {
      mockUpdate.mockResolvedValue({
        id: 'opp1',
        purchasePrice: 100,
        listing: { id: 'listing1' },
      });

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        purchasePrice: 100,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'opp1', userId: 'test-user-id' },
        data: { purchasePrice: 100 },
        include: { listing: true },
      });
    });

    it('should not calculate actualProfit when only resalePrice is provided', async () => {
      mockUpdate.mockResolvedValue({
        id: 'opp1',
        resalePrice: 200,
        listing: { id: 'listing1' },
      });

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        resalePrice: 200,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'opp1', userId: 'test-user-id' },
        data: { resalePrice: 200 },
        include: { listing: true },
      });
    });

    it('should handle status transition to SOLD with profit calculation', async () => {
      const mockUpdated = {
        id: 'opp1',
        status: 'SOLD',
        purchasePrice: 500,
        resalePrice: 900,
        fees: 50,
        actualProfit: 350,
        listing: { id: 'listing1' },
      };

      mockUpdate.mockResolvedValue(mockUpdated);

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'SOLD',
        purchasePrice: 500,
        resalePrice: 900,
        fees: 50,
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('SOLD');
      // actualProfit = 900 - 500 - 50 = 350
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SOLD',
            actualProfit: 350,
          }),
        })
      );
    });

    it('should persist dates when provided', async () => {
      const purchaseDate = '2026-01-01T12:00:00.000Z';
      const resaleDate = '2026-02-15T09:30:00.000Z';

      mockUpdate.mockResolvedValue({
        id: 'opp1',
        purchaseDate,
        resaleDate,
        listing: { id: 'listing1' },
      });

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        purchaseDate,
        resaleDate,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purchaseDate,
            resaleDate,
          }),
        })
      );
    });

    it('should handle database errors with 500 status', async () => {
      mockUpdate.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'PURCHASED',
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    // ── Conversation status transition (Story 8.5) ──────────────────────

    it('should call transitionToPurchased when status changes to PURCHASED', async () => {
      mockUpdate.mockResolvedValue({
        id: 'opp1',
        status: 'PURCHASED',
        userId: 'test-user-id',
        listing: { id: 'listing1' },
      });

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'PURCHASED',
        purchasePrice: 100,
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      expect(mockTransitionToPurchased).toHaveBeenCalledWith('listing1', 'test-user-id');
    });

    it('should not call transitionToPurchased for non-PURCHASED status', async () => {
      mockUpdate.mockResolvedValue({
        id: 'opp1',
        status: 'LISTED',
        userId: 'test-user-id',
        listing: { id: 'listing1' },
      });

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'LISTED',
      });
      await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      expect(mockTransitionToPurchased).not.toHaveBeenCalled();
    });

    it('should not block response if transitionToPurchased fails', async () => {
      mockTransitionToPurchased.mockRejectedValue(new Error('DB error'));
      mockUpdate.mockResolvedValue({
        id: 'opp1',
        status: 'PURCHASED',
        userId: 'test-user-id',
        listing: { id: 'listing1' },
      });

      const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
        status: 'PURCHASED',
        purchasePrice: 100,
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

      expect(response.status).toBe(200);
    });

    // ── Story 10.3: Flip lifecycle notification hooks ──────────────────────

    describe('Flip lifecycle notification events (Story 10.3)', () => {
      beforeEach(() => {
        mockCreateFlipNotificationEvent.mockResolvedValue(undefined);
      });

      it('creates flip.purchased event when status transitions to PURCHASED', async () => {
        // Existing opportunity state (fetched before update)
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'CONTACTED',
          userId: 'test-user-id',
          listing: { id: 'listing1', title: 'Vintage Lamp', platform: 'CRAIGSLIST', profitPotential: 80 },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'PURCHASED',
          userId: 'test-user-id',
          purchasePrice: 50,
          listing: { id: 'listing1', title: 'Vintage Lamp', platform: 'CRAIGSLIST', profitPotential: 80 },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'PURCHASED',
          purchasePrice: 50,
        });
        await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(mockCreateFlipNotificationEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'test-user-id',
            listingId: 'listing1',
            eventType: 'flip.purchased',
            payload: expect.objectContaining({
              listingTitle: 'Vintage Lamp',
              purchasePrice: 50,
              estimatedProfit: 80,
              platform: 'CRAIGSLIST',
            }),
          })
        );
      });

      it('creates flip.listed event when status transitions to LISTED', async () => {
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'PURCHASED',
          userId: 'test-user-id',
          listing: { id: 'listing1', title: 'Rare Book', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'LISTED',
          userId: 'test-user-id',
          resalePlatform: 'FACEBOOK',
          resaleUrl: 'https://fb.me/listing/123',
          listing: { id: 'listing1', title: 'Rare Book', platform: 'EBAY' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'LISTED',
          resalePlatform: 'FACEBOOK',
          resaleUrl: 'https://fb.me/listing/123',
        });
        await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(mockCreateFlipNotificationEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'flip.listed',
            payload: expect.objectContaining({
              listingTitle: 'Rare Book',
              destinationPlatform: 'FACEBOOK',
              listingUrl: 'https://fb.me/listing/123',
            }),
          })
        );
      });

      it('creates flip.sold event when status transitions to SOLD with resalePrice', async () => {
        const purchaseDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'LISTED',
          userId: 'test-user-id',
          purchasePrice: 100,
          fees: 10,
          purchaseDate,
          listing: { id: 'listing1', title: 'Cool Item', platform: 'MERCARI' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'SOLD',
          userId: 'test-user-id',
          purchasePrice: 100,
          resalePrice: 200,
          fees: 10,
          purchaseDate,
          listing: { id: 'listing1', title: 'Cool Item', platform: 'MERCARI' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'SOLD',
          resalePrice: 200,
        });
        await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(mockCreateFlipNotificationEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'flip.sold',
            payload: expect.objectContaining({
              listingTitle: 'Cool Item',
              salePrice: 200,
              actualProfit: 90, // 200 - 100 - 10
              purchasePrice: 100,
              roiPercent: 90, // 90 / 100 * 100
              daysToFlip: 10,
              platform: 'MERCARI',
            }),
          })
        );
      });

      it('skips flip.sold event when resalePrice is missing', async () => {
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'LISTED',
          userId: 'test-user-id',
          purchasePrice: 100,
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'SOLD',
          userId: 'test-user-id',
          purchasePrice: 100,
          resalePrice: null,
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'SOLD',
        });
        await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

        const soldCalls = mockCreateFlipNotificationEvent.mock.calls.filter(
          (c) => c[0]?.eventType === 'flip.sold'
        );
        expect(soldCalls).toHaveLength(0);
      });

      it('rejects invalid status transitions with ValidationError', async () => {
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'IDENTIFIED',
          userId: 'test-user-id',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });

        // IDENTIFIED → PURCHASED is invalid (must go through CONTACTED)
        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'PURCHASED',
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        const data = await response.json();

        expect(response.status).toBe(422);
        expect(data.error.code).toBe('VALIDATION_ERROR');
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('allows status transition to PASSED from any state', async () => {
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'IDENTIFIED',
          userId: 'test-user-id',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'PASSED',
          userId: 'test-user-id',
          listing: { id: 'listing1' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'PASSED',
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

        expect(response.status).toBe(200);
      });

      it('does not create events when status does not change', async () => {
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'PURCHASED',
          userId: 'test-user-id',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'PURCHASED',
          userId: 'test-user-id',
          listing: { id: 'listing1' },
        });

        // Update purchasePrice but not status
        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          purchasePrice: 150,
        });
        await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

        expect(mockCreateFlipNotificationEvent).not.toHaveBeenCalled();
      });

      it('swallows flip.purchased event creation failures', async () => {
        mockCreateFlipNotificationEvent.mockRejectedValue(new Error('DB error'));
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'CONTACTED',
          userId: 'test-user-id',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'PURCHASED',
          userId: 'test-user-id',
          purchasePrice: 50,
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'PURCHASED',
          purchasePrice: 50,
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        // Response should still succeed — event failure is fire-and-forget
        expect(response.status).toBe(200);
      });

      it('swallows flip.listed event creation failures', async () => {
        mockCreateFlipNotificationEvent.mockRejectedValue(new Error('DB error'));
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'PURCHASED',
          userId: 'test-user-id',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'LISTED',
          userId: 'test-user-id',
          resalePlatform: 'FACEBOOK',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'LISTED',
          resalePlatform: 'FACEBOOK',
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(response.status).toBe(200);
      });

      it('swallows flip.sold event creation failures', async () => {
        mockCreateFlipNotificationEvent.mockRejectedValue(new Error('DB error'));
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'LISTED',
          userId: 'test-user-id',
          purchasePrice: 100,
          purchaseDate: new Date(),
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'SOLD',
          userId: 'test-user-id',
          purchasePrice: 100,
          resalePrice: 200,
          purchaseDate: new Date(),
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'SOLD',
          resalePrice: 200,
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(response.status).toBe(200);
      });

      it('does not create events when userId is null', async () => {
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'CONTACTED',
          userId: null,
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'PURCHASED',
          userId: null,
          listing: { id: 'listing1' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'PURCHASED',
        });
        await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });

        expect(mockCreateFlipNotificationEvent).not.toHaveBeenCalled();
      });

      it('uses fallback defaults when opportunity listing is null', async () => {
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'CONTACTED',
          userId: 'test-user-id',
          listing: null,
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'PURCHASED',
          userId: 'test-user-id',
          listing: null,
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'PURCHASED',
        });
        await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(mockCreateFlipNotificationEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'flip.purchased',
            listingId: null,
            payload: expect.objectContaining({
              listingTitle: 'Unknown Item',
              purchasePrice: 0,
              estimatedProfit: 0,
              platform: 'Unknown',
            }),
          })
        );
      });

      it('uses body.resalePlatform fallback for flip.listed when body has no resalePlatform', async () => {
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'PURCHASED',
          userId: 'test-user-id',
          resalePlatform: 'EBAY_STORED',
          resaleUrl: 'https://ebay.com/stored',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'LISTED',
          userId: 'test-user-id',
          resalePlatform: 'EBAY_STORED',
          resaleUrl: 'https://ebay.com/stored',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });

        // No resalePlatform in body — should fall back to stored value
        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'LISTED',
        });
        await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(mockCreateFlipNotificationEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'flip.listed',
            payload: expect.objectContaining({
              destinationPlatform: 'EBAY_STORED',
              listingUrl: 'https://ebay.com/stored',
            }),
          })
        );
      });

      it('uses "Unknown" fallback for flip.listed when both body and stored resalePlatform are missing', async () => {
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'PURCHASED',
          userId: 'test-user-id',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'LISTED',
          userId: 'test-user-id',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'LISTED',
        });
        await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(mockCreateFlipNotificationEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'flip.listed',
            payload: expect.objectContaining({
              destinationPlatform: 'Unknown',
              listingUrl: null,
            }),
          })
        );
      });

      it('computes roiPercent=0 when purchasePrice=0 for flip.sold', async () => {
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'LISTED',
          userId: 'test-user-id',
          purchasePrice: 0,
          listing: { id: 'listing1', title: 'Gift', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'SOLD',
          userId: 'test-user-id',
          purchasePrice: 0,
          resalePrice: 50,
          listing: { id: 'listing1', title: 'Gift', platform: 'EBAY' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'SOLD',
          resalePrice: 50,
        });
        await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(mockCreateFlipNotificationEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'flip.sold',
            payload: expect.objectContaining({
              roiPercent: 0, // purchasePrice=0 → roi=0
              daysToFlip: undefined, // no purchaseDate
            }),
          })
        );
      });

      it('handles non-Error rejection for flip.purchased creation', async () => {
        mockCreateFlipNotificationEvent.mockRejectedValue('string error');
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'CONTACTED',
          userId: 'test-user-id',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'PURCHASED',
          userId: 'test-user-id',
          purchasePrice: 50,
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'PURCHASED',
          purchasePrice: 50,
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(response.status).toBe(200);
      });

      it('handles non-Error rejection for flip.listed creation', async () => {
        mockCreateFlipNotificationEvent.mockRejectedValue('string error');
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'PURCHASED',
          userId: 'test-user-id',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'LISTED',
          userId: 'test-user-id',
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'LISTED',
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(response.status).toBe(200);
      });

      it('handles non-Error rejection for flip.sold creation', async () => {
        mockCreateFlipNotificationEvent.mockRejectedValue('string error');
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'LISTED',
          userId: 'test-user-id',
          purchasePrice: 100,
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'SOLD',
          userId: 'test-user-id',
          purchasePrice: 100,
          resalePrice: 200,
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });

        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'SOLD',
          resalePrice: 200,
        });
        const response = await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(response.status).toBe(200);
      });

      it('uses stored resalePrice for flip.sold when body omits it', async () => {
        mockFindFirst.mockResolvedValue({
          id: 'opp1',
          status: 'LISTED',
          userId: 'test-user-id',
          purchasePrice: 100,
          resalePrice: 250,
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });
        mockUpdate.mockResolvedValue({
          id: 'opp1',
          status: 'SOLD',
          userId: 'test-user-id',
          purchasePrice: 100,
          resalePrice: 250,
          listing: { id: 'listing1', title: 'Item', platform: 'EBAY' },
        });

        // No resalePrice in body — should use stored value from update result
        const request = createMockRequest('PATCH', '/api/opportunities/opp1', {
          status: 'SOLD',
        });
        await PATCH(request, { params: Promise.resolve({ id: 'opp1' }) });
        await new Promise((resolve) => setImmediate(resolve));

        expect(mockCreateFlipNotificationEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'flip.sold',
            payload: expect.objectContaining({
              salePrice: 250,
            }),
          })
        );
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE /api/opportunities/[id]
  // ──────────────────────────────────────────────────────────────────────────
  describe('DELETE /api/opportunities/[id]', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetCurrentUserId.mockResolvedValue(null);

      const request = createMockRequest('DELETE', '/api/opportunities/opp1');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should delete an opportunity and reset listing status', async () => {
      mockFindFirst.mockResolvedValue({ listingId: 'listing1' });
      mockTransaction.mockResolvedValue([{}, {}]);

      const request = createMockRequest('DELETE', '/api/opportunities/opp1');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 'opp1', userId: 'test-user-id' },
        select: { listingId: true },
      });
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should return 404 when opportunity is not found or not owned by user', async () => {
      mockFindFirst.mockResolvedValue(null);

      const request = createMockRequest('DELETE', '/api/opportunities/nonexistent');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should handle database errors during findFirst with 500 status', async () => {
      mockFindFirst.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('DELETE', '/api/opportunities/opp1');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle database errors during transaction with 500 status', async () => {
      mockFindFirst.mockResolvedValue({ listingId: 'listing1' });
      mockTransaction.mockRejectedValue(new Error('Transaction failed'));

      const request = createMockRequest('DELETE', '/api/opportunities/opp1');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'opp1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });
});

/**
 * @file Unit tests for GET /api/analyze/[listingId] and DELETE /api/analyze/[listingId]
 *
 * Tests auth, ownership, L1 cache, AI success, algorithmic fallback, and cache invalidation.
 */

import { NextRequest } from 'next/server';
import { GET, DELETE } from '@/app/api/analyze/[listingId]/route';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { analyzeListing } from '@/lib/claude-analyzer';
import { estimateValue } from '@/lib/value-estimator';

// --- Mocks ---

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: { findUnique: jest.fn() },
    aiAnalysisCache: { deleteMany: jest.fn() },
  },
}));

jest.mock('@/lib/auth-middleware', () => ({
  getAuthUserId: jest.fn(),
}));

const mockCacheGet = jest.fn().mockReturnValue(undefined);
const mockCacheSet = jest.fn();
const mockCacheDelete = jest.fn();
jest.mock('@/lib/cache', () => ({
  analysisCache: {
    get: (...args: unknown[]) => mockCacheGet(...args),
    set: (...args: unknown[]) => mockCacheSet(...args),
    delete: (...args: unknown[]) => mockCacheDelete(...args),
  },
}));

jest.mock('@/lib/claude-analyzer', () => ({
  analyzeListing: jest.fn(),
}));

jest.mock('@/lib/value-estimator', () => ({
  estimateValue: jest.fn(),
}));

// --- Helpers ---

const USER_ID = 'user-abc';
const OTHER_USER_ID = 'user-xyz';
const LISTING_ID = 'listing-123';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockFindUnique = prisma.listing.findUnique as jest.Mock;
const mockAnalyzeListing = analyzeListing as jest.MockedFunction<typeof analyzeListing>;
const mockEstimateValue = estimateValue as jest.MockedFunction<typeof estimateValue>;
const mockDeleteMany = prisma.aiAnalysisCache.deleteMany as jest.Mock;

function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: LISTING_ID,
    userId: USER_ID,
    title: 'iPhone 12 128GB',
    description: 'Great condition',
    askingPrice: 200,
    condition: 'good',
    category: 'electronics',
    ...overrides,
  };
}

function makeParams(listingId = LISTING_ID) {
  return { params: Promise.resolve({ listingId }) };
}

function makeGetRequest() {
  return new NextRequest(`http://localhost:3000/api/analyze/${LISTING_ID}`, { method: 'GET' });
}

function makeDeleteRequest() {
  return new NextRequest(`http://localhost:3000/api/analyze/${LISTING_ID}`, { method: 'DELETE' });
}

const MOCK_AI_RESULT = {
  category: 'electronics',
  condition: 'good',
  keyFeatures: ['128GB', 'Face ID'],
  potentialIssues: [],
  flippabilityScore: 82,
  confidence: 'high' as const,
  reasoning: 'Strong demand for iPhones',
};

const MOCK_ESTIMATION = {
  estimatedValue: 280,
  valueScore: 65,
  profitPotential: 80,
  confidence: 0.6,
  resaleDifficulty: 'easy',
  reasoning: 'Algorithmic estimate',
};

// --- Tests ---

describe('GET /api/analyze/[listingId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheGet.mockReturnValue(undefined);
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(makeListing());
    mockAnalyzeListing.mockResolvedValue(MOCK_AI_RESULT);
  });

  test('should return 401 when user is not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    const response = await GET(makeGetRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('should return 404 when listing does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await GET(makeGetRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
  });

  test('should return 403 when listing belongs to another user', async () => {
    mockFindUnique.mockResolvedValue(makeListing({ userId: OTHER_USER_ID }));

    const response = await GET(makeGetRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });

  test('should return L1 cached result when cache is populated', async () => {
    mockCacheGet.mockReturnValue(MOCK_AI_RESULT);

    const response = await GET(makeGetRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.source).toBe('cache-l1');
    expect(body.data.isAiFallback).toBe(false);
    expect(body.data.flippabilityScore).toBe(82);
    expect(mockAnalyzeListing).not.toHaveBeenCalled();
  });

  test('should call AI and return result with source "ai"', async () => {
    const response = await GET(makeGetRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.source).toBe('ai');
    expect(body.data.isAiFallback).toBe(false);
    expect(body.data.flippabilityScore).toBe(82);
    expect(mockAnalyzeListing).toHaveBeenCalledWith(LISTING_ID);
  });

  test('should populate L1 cache after successful AI call', async () => {
    await GET(makeGetRequest(), makeParams());

    expect(mockCacheSet).toHaveBeenCalledWith(`claude:${LISTING_ID}`, MOCK_AI_RESULT);
  });

  test('should return algorithmic fallback when AI throws', async () => {
    mockAnalyzeListing.mockRejectedValue(new Error('Claude API rate limit exceeded'));
    mockEstimateValue.mockReturnValue(MOCK_ESTIMATION);

    const response = await GET(makeGetRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.source).toBe('algorithmic');
    expect(body.data.isAiFallback).toBe(true);
    expect(body.data.reasoning).toBe('Algorithmic estimate');
  });

  test('should call estimateValue with correct listing fields on fallback', async () => {
    mockAnalyzeListing.mockRejectedValue(new Error('API unavailable'));
    mockEstimateValue.mockReturnValue(MOCK_ESTIMATION);

    await GET(makeGetRequest(), makeParams());

    expect(mockEstimateValue).toHaveBeenCalledWith(
      'iPhone 12 128GB',
      'Great condition',
      200,
      'good',
      'electronics'
    );
  });

  test('should pass null for missing optional fields (description, condition, category) in algorithmic fallback', async () => {
    // Covers the `?? null` false branch on lines 59, 61, 62 of the route
    mockFindUnique.mockResolvedValue(
      makeListing({ description: null, condition: null, category: null })
    );
    mockAnalyzeListing.mockRejectedValue(new Error('AI unavailable'));
    mockEstimateValue.mockReturnValue(MOCK_ESTIMATION);

    await GET(makeGetRequest(), makeParams());

    expect(mockEstimateValue).toHaveBeenCalledWith(
      'iPhone 12 128GB',
      null,
      200,
      null,
      null
    );
  });

  test('should recover and return AI result on subsequent call after fallback', async () => {
    // Simulate recovery: first call fails, second succeeds
    mockAnalyzeListing
      .mockRejectedValueOnce(new Error('AI unavailable'))
      .mockResolvedValue(MOCK_AI_RESULT);
    mockEstimateValue.mockReturnValue(MOCK_ESTIMATION);

    const fallbackResponse = await GET(makeGetRequest(), makeParams());
    const fallbackBody = await fallbackResponse.json();
    expect(fallbackBody.data.isAiFallback).toBe(true);

    // Second call: AI is now available
    mockCacheGet.mockReturnValue(undefined); // no L1 cache
    const recoveredResponse = await GET(makeGetRequest(), makeParams());
    const recoveredBody = await recoveredResponse.json();
    expect(recoveredBody.data.isAiFallback).toBe(false);
    expect(recoveredBody.source).toBe('ai');
  });
});

describe('DELETE /api/analyze/[listingId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockResolvedValue(USER_ID);
    mockFindUnique.mockResolvedValue(makeListing());
    mockDeleteMany.mockResolvedValue({ count: 1 });
  });

  test('should return 401 when user is not authenticated', async () => {
    mockGetAuthUserId.mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  test('should return 404 when listing does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
  });

  test('should return 403 when listing belongs to another user', async () => {
    mockFindUnique.mockResolvedValue(makeListing({ userId: OTHER_USER_ID }));

    const response = await DELETE(makeDeleteRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });

  test('should invalidate L1 and L2 cache and return success', async () => {
    const response = await DELETE(makeDeleteRequest(), makeParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('Cache invalidated');

    // L1 invalidation
    expect(mockCacheDelete).toHaveBeenCalledWith(`claude:${LISTING_ID}`);
    expect(mockCacheDelete).toHaveBeenCalledWith(`openai:${LISTING_ID}`);

    // L2 invalidation
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { listingId: LISTING_ID } });
  });
});

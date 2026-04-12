/**
 * LLM Analyzer Unit Tests
 *
 * Tests for OpenAI-based sellability analysis, including L1/L2 caching,
 * cache helpers, quick discount check, and full analysis pipeline.
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- Module mocks (must be declared before imports) ---

const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    aiAnalysisCache: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const mockCacheGet = jest.fn().mockReturnValue(undefined);
const mockCacheSet = jest.fn();
jest.mock('@/lib/cache', () => ({
  analysisCache: {
    get: (...args: unknown[]) => mockCacheGet(...args),
    set: (...args: unknown[]) => mockCacheSet(...args),
    delete: jest.fn(),
  },
}));

// --- Imports ---

import {
  getCachedSellabilityAnalysis,
  cacheSellabilityAnalysis,
  analyzeSellability,
  quickDiscountCheck,
  runFullAnalysis,
  SellabilityAnalysis,
} from '@/lib/llm-analyzer';
import prisma from '@/lib/db';
import type { ItemIdentification } from '@/lib/llm-identifier';
import type { MarketPrice } from '@/lib/market-price';

// --- Test fixtures ---

const MOCK_IDENTIFICATION: ItemIdentification = {
  brand: 'Apple',
  model: 'iPhone 12',
  variant: '128GB',
  year: 2020,
  condition: 'good',
  conditionNotes: 'Minor scratches',
  searchQuery: 'Apple iPhone 12 128GB',
  category: 'electronics',
  worthInvestigating: true,
  reasoning: 'Popular device',
};

const MOCK_MARKET_DATA: MarketPrice = {
  source: 'ebay_scrape',
  soldListings: [
    { title: 'iPhone 12 128GB', price: 350, soldDate: new Date(), condition: 'Good', url: 'http://example.com', shippingCost: 0 },
    { title: 'iPhone 12 128GB used', price: 320, soldDate: new Date(), condition: 'Good', url: 'http://example.com', shippingCost: 0 },
  ],
  medianPrice: 335,
  lowPrice: 300,
  highPrice: 400,
  avgPrice: 335,
  salesCount: 15,
  avgDaysToSell: 7,
  searchQuery: 'Apple iPhone 12 128GB',
  fetchedAt: new Date(),
  outliersRemoved: 0,
  lowSampleSize: false,
};

const MOCK_ANALYSIS_RESULT: SellabilityAnalysis = {
  verifiedMarketValue: 335,
  trueDiscountPercent: 40,
  sellabilityScore: 80,
  demandLevel: 'high',
  expectedDaysToSell: 7,
  authenticityRisk: 'low',
  conditionRisk: 'medium',
  recommendedOfferPrice: 180,
  recommendedListPrice: 300,
  resaleStrategy: 'List on eBay with detailed photos',
  resalePlatform: 'ebay',
  comparableSales: MOCK_MARKET_DATA.soldListings.slice(0, 5),
  confidence: 'high',
  reasoning: 'Strong demand with good margins',
  meetsThreshold: true,
};

const MOCK_OPENAI_JSON = JSON.stringify({
  verifiedMarketValue: 335,
  trueDiscountPercent: 40,
  sellabilityScore: 80,
  demandLevel: 'high',
  expectedDaysToSell: 7,
  authenticityRisk: 'low',
  conditionRisk: 'medium',
  recommendedOfferPrice: 180,
  recommendedListPrice: 300,
  resaleStrategy: 'List on eBay with detailed photos',
  resalePlatform: 'ebay',
  confidence: 'high',
  reasoning: 'Strong demand with good margins',
  meetsThreshold: true,
});

// --- Test setup ---

describe('LLM Analyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockReset();
    mockCacheGet.mockReturnValue(undefined);
    process.env.OPENAI_API_KEY = 'test-openai-key';
  });

  // ==========================================================
  // getCachedSellabilityAnalysis
  // ==========================================================

  describe('getCachedSellabilityAnalysis', () => {
    test('should return L1 cached result without DB call (no price provided)', async () => {
      mockCacheGet.mockReturnValue(MOCK_ANALYSIS_RESULT);

      const result = await getCachedSellabilityAnalysis('listing-123');

      expect(result.analysis).toEqual(MOCK_ANALYSIS_RESULT);
      expect(result.staleAnalysis).toBe(false);
      expect(prisma.aiAnalysisCache.findFirst).not.toHaveBeenCalled();
    });

    test('should return L2 DB result and populate L1 when L1 misses', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue({
        id: 'cache-id',
        listingId: 'listing-456',
        analysisResult: JSON.stringify(MOCK_ANALYSIS_RESULT),
        analyzedAtPrice: 200,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      const result = await getCachedSellabilityAnalysis('listing-456');

      expect(result.analysis).not.toBeNull();
      expect(result.analysis!.sellabilityScore).toBe(MOCK_ANALYSIS_RESULT.sellabilityScore);
      expect(result.analysis!.demandLevel).toBe(MOCK_ANALYSIS_RESULT.demandLevel);
      expect(result.staleAnalysis).toBe(false);
      expect(mockCacheSet).toHaveBeenCalledWith(
        'openai:listing-456',
        expect.objectContaining({ sellabilityScore: 80, demandLevel: 'high' })
      );
    });

    test('should return null analysis when L1 and L2 both miss', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getCachedSellabilityAnalysis('listing-miss');

      expect(result.analysis).toBeNull();
    });

    test('should return null analysis and log error when DB throws', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockRejectedValue(
        new Error('DB connection error')
      );

      const result = await getCachedSellabilityAnalysis('listing-dberr');

      expect(result.analysis).toBeNull();
    });

    test('should query DB with correct analysisType filter', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);

      await getCachedSellabilityAnalysis('listing-query');

      expect(prisma.aiAnalysisCache.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listingId: 'listing-query',
            analysisType: 'openai',
          }),
        })
      );
    });

    test('should invalidate cache when price changed >15%', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue({
        id: 'cache-id',
        listingId: 'listing-price-drop',
        analysisResult: JSON.stringify(MOCK_ANALYSIS_RESULT),
        analyzedAtPrice: 200,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      // Price dropped from 200 to 160 = 20% change → invalidate
      const result = await getCachedSellabilityAnalysis('listing-price-drop', 160);

      expect(result.analysis).toBeNull();
      expect(result.staleAnalysis).toBe(false);
    });

    test('should return stale flag when price changed 5-15%', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue({
        id: 'cache-id',
        listingId: 'listing-price-bump',
        analysisResult: JSON.stringify(MOCK_ANALYSIS_RESULT),
        analyzedAtPrice: 200,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      // Price changed from 200 to 220 = 10% change → stale
      const result = await getCachedSellabilityAnalysis('listing-price-bump', 220);

      expect(result.analysis).not.toBeNull();
      expect(result.staleAnalysis).toBe(true);
    });

    test('should return fresh hit when price changed <5%', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue({
        id: 'cache-id',
        listingId: 'listing-stable',
        analysisResult: JSON.stringify(MOCK_ANALYSIS_RESULT),
        analyzedAtPrice: 200,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      // Price changed from 200 to 205 = 2.5% change → fresh hit
      const result = await getCachedSellabilityAnalysis('listing-stable', 205);

      expect(result.analysis).not.toBeNull();
      expect(result.staleAnalysis).toBe(false);
    });

    test('should treat null analyzedAtPrice as expired (legacy entry)', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue({
        id: 'cache-id',
        listingId: 'listing-legacy',
        analysisResult: JSON.stringify(MOCK_ANALYSIS_RESULT),
        analyzedAtPrice: null, // legacy entry
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      const result = await getCachedSellabilityAnalysis('listing-legacy', 200);

      expect(result.analysis).toBeNull(); // treated as expired
    });

    test('should treat zero analyzedAtPrice as always-invalidate', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue({
        id: 'cache-id',
        listingId: 'listing-free',
        analysisResult: JSON.stringify(MOCK_ANALYSIS_RESULT),
        analyzedAtPrice: 0,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      const result = await getCachedSellabilityAnalysis('listing-free', 50);

      expect(result.analysis).toBeNull(); // division by zero guard
    });
  });

  // ==========================================================
  // cacheSellabilityAnalysis
  // ==========================================================

  describe('cacheSellabilityAnalysis', () => {
    test('should upsert DB with analyzedAtPrice and populate L1 cache', async () => {
      (prisma.aiAnalysisCache.upsert as jest.Mock).mockResolvedValue({});

      await cacheSellabilityAnalysis('listing-789', MOCK_ANALYSIS_RESULT, 200);

      expect(prisma.aiAnalysisCache.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { listingId_analysisType: { listingId: 'listing-789', analysisType: 'openai' } },
          create: expect.objectContaining({
            listingId: 'listing-789',
            analysisType: 'openai',
            analysisResult: JSON.stringify(MOCK_ANALYSIS_RESULT),
            analyzedAtPrice: 200,
            expiresAt: expect.any(Date),
          }),
          update: expect.objectContaining({
            analysisResult: JSON.stringify(MOCK_ANALYSIS_RESULT),
            expiresAt: expect.any(Date),
          }),
        })
      );
      expect(mockCacheSet).toHaveBeenCalledWith('openai:listing-789', MOCK_ANALYSIS_RESULT);
    });

    test('should set expiresAt 24 hours in the future', async () => {
      (prisma.aiAnalysisCache.upsert as jest.Mock).mockResolvedValue({});
      const before = new Date();

      await cacheSellabilityAnalysis('listing-ttl', MOCK_ANALYSIS_RESULT);

      const upsertCall = (prisma.aiAnalysisCache.upsert as jest.Mock).mock.calls[0][0];
      const expiresAt: Date = upsertCall.create.expiresAt;
      const diffHours = (expiresAt.getTime() - before.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(23.9);
      expect(diffHours).toBeLessThanOrEqual(24.1);
    });

    test('should handle DB write errors gracefully', async () => {
      (prisma.aiAnalysisCache.upsert as jest.Mock).mockRejectedValue(
        new Error('DB write error')
      );

      // Should not throw
      await expect(
        cacheSellabilityAnalysis('listing-err', MOCK_ANALYSIS_RESULT)
      ).resolves.toBeUndefined();
    });
  });

  // ==========================================================
  // analyzeSellability
  // ==========================================================

  describe('analyzeSellability', () => {
    test('should return null when OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY;

      const result = await analyzeSellability(
        'iPhone 12',
        200,
        MOCK_IDENTIFICATION,
        MOCK_MARKET_DATA
      );

      expect(result).toBeNull();
    });

    test('should return cached result when listingId and cache hit', async () => {
      mockCacheGet.mockReturnValue(MOCK_ANALYSIS_RESULT);

      const result = await analyzeSellability(
        'iPhone 12',
        200,
        MOCK_IDENTIFICATION,
        MOCK_MARKET_DATA,
        50,
        undefined,
        'listing-cached'
      );

      expect(result).toEqual(MOCK_ANALYSIS_RESULT);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    test('should call OpenAI with response_format json_object and return parsed result', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.aiAnalysisCache.upsert as jest.Mock).mockResolvedValue({});
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: MOCK_OPENAI_JSON }, finish_reason: 'stop' }],
      });

      const result = await analyzeSellability(
        'iPhone 12',
        200,
        MOCK_IDENTIFICATION,
        MOCK_MARKET_DATA,
        50,
        undefined,
        'listing-fresh'
      );

      expect(result).not.toBeNull();
      expect(result!.sellabilityScore).toBe(80);
      expect(result!.demandLevel).toBe('high');
      expect(result!.meetsThreshold).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // Verify response_format is passed
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.response_format).toEqual({ type: 'json_object' });
    });

    test('should cache result when listingId is provided', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.aiAnalysisCache.upsert as jest.Mock).mockResolvedValue({});
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: MOCK_OPENAI_JSON }, finish_reason: 'stop' }],
      });

      await analyzeSellability(
        'iPhone 12',
        200,
        MOCK_IDENTIFICATION,
        MOCK_MARKET_DATA,
        50,
        undefined,
        'listing-to-cache'
      );

      expect(prisma.aiAnalysisCache.upsert).toHaveBeenCalled();
      expect(mockCacheSet).toHaveBeenCalledWith(
        'openai:listing-to-cache',
        expect.any(Object)
      );
    });

    test('should not cache result when no listingId provided', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: MOCK_OPENAI_JSON }, finish_reason: 'stop' }],
      });

      await analyzeSellability('iPhone 12', 200, MOCK_IDENTIFICATION, MOCK_MARKET_DATA);

      expect(prisma.aiAnalysisCache.upsert).not.toHaveBeenCalled();
      expect(mockCacheSet).not.toHaveBeenCalled();
    });

    test('should retry with simplified prompt when JSON parse fails', async () => {
      // First call returns invalid JSON, retry returns valid JSON
      mockCreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Not valid JSON at all' }, finish_reason: 'stop' }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: MOCK_OPENAI_JSON }, finish_reason: 'stop' }],
        });

      const result = await analyzeSellability('iPhone 12', 200, MOCK_IDENTIFICATION, MOCK_MARKET_DATA);

      expect(result).not.toBeNull();
      expect(result!.sellabilityScore).toBe(80);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    test('should return null when both parse attempts fail', async () => {
      mockCreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Not valid JSON' }, finish_reason: 'stop' }],
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Still not JSON' }, finish_reason: 'stop' }],
        });

      const result = await analyzeSellability('iPhone 12', 200, MOCK_IDENTIFICATION, MOCK_MARKET_DATA);

      expect(result).toBeNull();
    });

    test('should return null when response content is null', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null }, finish_reason: 'stop' }],
      });

      const result = await analyzeSellability('iPhone 12', 200, MOCK_IDENTIFICATION, MOCK_MARKET_DATA);

      expect(result).toBeNull();
    });

    test('should return null when OpenAI throws', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      mockCreate.mockRejectedValue(new Error('OpenAI API error'));

      const result = await analyzeSellability('iPhone 12', 200, MOCK_IDENTIFICATION, MOCK_MARKET_DATA);

      expect(result).toBeNull();
    });

    test('should use default discountThreshold of 50 when not provided', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: MOCK_OPENAI_JSON }, finish_reason: 'stop' }],
      });

      await analyzeSellability('iPhone 12', 200, MOCK_IDENTIFICATION, MOCK_MARKET_DATA);

      const callArgs = mockCreate.mock.calls[0][0] as { messages: Array<{ content: string }> };
      const userMessage = callArgs.messages[1].content;
      expect(userMessage).toContain('50');
    });

    test('should validate and default invalid demandLevel', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ ...JSON.parse(MOCK_OPENAI_JSON), demandLevel: 'invalid' }),
          },
          finish_reason: 'stop',
        }],
      });

      const result = await analyzeSellability('iPhone 12', 200, MOCK_IDENTIFICATION, MOCK_MARKET_DATA);

      expect(result).not.toBeNull();
      expect(result!.demandLevel).toBe('medium');
    });

    test('should validate and default invalid authenticityRisk', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ ...JSON.parse(MOCK_OPENAI_JSON), authenticityRisk: 'extreme' }),
          },
          finish_reason: 'stop',
        }],
      });

      const result = await analyzeSellability('iPhone 12', 200, MOCK_IDENTIFICATION, MOCK_MARKET_DATA);

      expect(result).not.toBeNull();
      expect(result!.authenticityRisk).toBe('medium');
    });

    test('should clamp sellabilityScore to 0-100', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ ...JSON.parse(MOCK_OPENAI_JSON), sellabilityScore: 150 }),
          },
          finish_reason: 'stop',
        }],
      });

      const result = await analyzeSellability('iPhone 12', 200, MOCK_IDENTIFICATION, MOCK_MARKET_DATA);

      expect(result).not.toBeNull();
      expect(result!.sellabilityScore).toBe(100);
    });

    test('should use medianPrice as verifiedMarketValue fallback', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ ...JSON.parse(MOCK_OPENAI_JSON), verifiedMarketValue: null }),
          },
          finish_reason: 'stop',
        }],
      });

      const result = await analyzeSellability('iPhone 12', 200, MOCK_IDENTIFICATION, MOCK_MARKET_DATA);

      expect(result).not.toBeNull();
      expect(result!.verifiedMarketValue).toBe(MOCK_MARKET_DATA.medianPrice);
    });

    test('meetsThreshold is false when not explicitly true', async () => {
      mockCreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ ...JSON.parse(MOCK_OPENAI_JSON), meetsThreshold: false }),
          },
          finish_reason: 'stop',
        }],
      });

      const result = await analyzeSellability('iPhone 12', 200, MOCK_IDENTIFICATION, MOCK_MARKET_DATA);

      expect(result).not.toBeNull();
      expect(result!.meetsThreshold).toBe(false);
    });
  });

  // ==========================================================
  // quickDiscountCheck
  // ==========================================================

  describe('quickDiscountCheck', () => {
    test('should pass when asking price is >= 40% below median', () => {
      // Asking $100 vs median $200 = 50% discount → passes
      const result = quickDiscountCheck(100, { ...MOCK_MARKET_DATA, medianPrice: 200 });

      expect(result.passesQuickCheck).toBe(true);
      expect(result.estimatedDiscount).toBe(50);
    });

    test('should fail when discount is less than 40%', () => {
      // Asking $180 vs median $200 = 10% discount → fails
      const result = quickDiscountCheck(180, { ...MOCK_MARKET_DATA, medianPrice: 200 });

      expect(result.passesQuickCheck).toBe(false);
      expect(result.estimatedDiscount).toBe(10);
    });

    test('should pass at exactly 40% discount', () => {
      // Asking $120 vs median $200 = 40% discount → passes
      const result = quickDiscountCheck(120, { ...MOCK_MARKET_DATA, medianPrice: 200 });

      expect(result.passesQuickCheck).toBe(true);
      expect(result.estimatedDiscount).toBe(40);
    });

    test('should handle negative discount (asking above market)', () => {
      // Asking $250 vs median $200 = -25% "discount"
      const result = quickDiscountCheck(250, { ...MOCK_MARKET_DATA, medianPrice: 200 });

      expect(result.passesQuickCheck).toBe(false);
      expect(result.estimatedDiscount).toBe(-25);
    });
  });

  // ==========================================================
  // runFullAnalysis
  // ==========================================================

  describe('runFullAnalysis', () => {
    test('should return null when analyzeSellability returns null', async () => {
      // No API key → analyzeSellability returns null
      delete process.env.OPENAI_API_KEY;

      const result = await runFullAnalysis(
        'iPhone 12',
        'Good condition',
        200,
        'electronics',
        MOCK_IDENTIFICATION,
        MOCK_MARKET_DATA
      );

      expect(result).toBeNull();
    });

    test('should return full analysis result when analyzeSellability succeeds', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: MOCK_OPENAI_JSON }, finish_reason: 'stop' }],
      });

      const result = await runFullAnalysis(
        'iPhone 12',
        'Good condition',
        200,
        'electronics',
        MOCK_IDENTIFICATION,
        MOCK_MARKET_DATA
      );

      expect(result).not.toBeNull();
      expect(result!.identification).toEqual(MOCK_IDENTIFICATION);
      expect(result!.marketData).toEqual(MOCK_MARKET_DATA);
      expect(result!.analysis).toBeDefined();
      expect(result!.analysis.sellabilityScore).toBe(80);
    });
  });
});

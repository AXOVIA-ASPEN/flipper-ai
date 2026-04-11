/**
 * @file src/__tests__/lib/negotiation-strategy.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-10
 * @version 1.0
 * @brief Unit tests for negotiation-strategy.ts — cache, fallback, singleton, and LLM paths.
 */

// ---------------------------------------------------------------------------
// Mock factories — variables prefixed with 'mock' are hoisted by Jest's
// babel transform alongside jest.mock(), making them available inside
// factory callbacks even though jest.mock is hoisted to the top of the file.
// ---------------------------------------------------------------------------

const mockCreate = jest.fn();
const mockOpenAIConstructor = jest.fn().mockImplementation(() => ({
  chat: { completions: { create: mockCreate } },
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: mockOpenAIConstructor,
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

jest.mock('@/lib/cache', () => ({
  analysisCache: {
    get: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    timed: jest.fn().mockReturnValue(jest.fn()),
  },
}));

jest.mock('@/lib/metrics', () => ({
  metrics: {
    increment: jest.fn(),
  },
}));

jest.mock('@/lib/error-tracker', () => ({
  captureError: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import {
  getCachedStrategy,
  cacheStrategy,
  generateFallbackStrategy,
  generateFallbackCounterAnalysis,
  generateNegotiationStrategy,
  analyzeCounterOffer,
  type NegotiationStrategyInput,
} from '@/lib/negotiation-strategy';

// ---------------------------------------------------------------------------
// Mock references
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma = (jest.requireMock('@/lib/db') as any).default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCache = (jest.requireMock('@/lib/cache') as any).analysisCache;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockLogger = (jest.requireMock('@/lib/logger') as any).logger;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<NegotiationStrategyInput> = {}): NegotiationStrategyInput {
  return {
    listingId: 'listing-1',
    askingPrice: 100,
    verifiedMarketValue: 150,
    estimatedValue: 140,
    condition: 'good',
    daysListed: 10,
    negotiable: true,
    demandLevel: 'medium',
    sellabilityScore: 75,
    platform: 'CRAIGSLIST',
    recommendedOffer: 85,
    marketDataDate: new Date('2026-04-05'), // 5 days ago — fresh
    ...overrides,
  };
}

function makeStoredStrategy() {
  return {
    initialOfferPrice: 85,
    walkAwayPrice: 120,
    negotiationTactics: ['Tactic 1'],
    counterOfferSuggestions: [],
    confidence: 'medium' as const,
    reasoning: 'Some reasoning',
    isFallback: false,
    disclaimer: 'AI-generated suggestion for informational purposes only. Not financial advice.',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('negotiation-strategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: both cache layers miss
    mockCache.get.mockReturnValue(undefined);
    mockPrisma.aiAnalysisCache.findFirst.mockResolvedValue(null);
    mockPrisma.aiAnalysisCache.upsert.mockResolvedValue({});
  });

  // -------------------------------------------------------------------------
  // getCachedStrategy
  // -------------------------------------------------------------------------

  describe('getCachedStrategy()', () => {
    it('returns null on L1 and L2 cache miss', async () => {
      const result = await getCachedStrategy('miss-1');
      expect(result).toBeNull();
    });

    it('returns strategy from L1 cache without hitting DB', async () => {
      const strategy = makeStoredStrategy();
      mockCache.get.mockReturnValueOnce(strategy);

      const result = await getCachedStrategy('l1-hit');

      expect(result).toBe(strategy);
      expect(mockPrisma.aiAnalysisCache.findFirst).not.toHaveBeenCalled();
    });

    it('returns strategy from L2 DB cache on L1 miss and stores result in L1', async () => {
      const strategy = makeStoredStrategy();
      mockPrisma.aiAnalysisCache.findFirst.mockResolvedValueOnce({
        analysisResult: JSON.stringify(strategy),
      });

      const result = await getCachedStrategy('l2-hit');

      expect(result).toEqual(strategy);
      expect(mockCache.set).toHaveBeenCalledWith('negotiation:l2-hit', strategy);
    });

    it('logs error and returns null when DB findFirst throws', async () => {
      mockPrisma.aiAnalysisCache.findFirst.mockRejectedValueOnce(new Error('DB unavailable'));

      const result = await getCachedStrategy('db-err');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching cached negotiation strategy',
        expect.objectContaining({ listingId: 'db-err', error: 'DB unavailable' })
      );
    });
  });

  // -------------------------------------------------------------------------
  // cacheStrategy
  // -------------------------------------------------------------------------

  describe('cacheStrategy()', () => {
    it('upserts result to DB and stores in L1 cache', async () => {
      const strategy = makeStoredStrategy();
      await cacheStrategy('cache-1', strategy);

      expect(mockPrisma.aiAnalysisCache.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { listingId_analysisType: { listingId: 'cache-1', analysisType: 'negotiation' } },
        })
      );
      expect(mockCache.set).toHaveBeenCalledWith('negotiation:cache-1', strategy);
    });

    it('logs error and does not throw when DB upsert fails', async () => {
      const strategy = makeStoredStrategy();
      mockPrisma.aiAnalysisCache.upsert.mockRejectedValueOnce(new Error('Upsert failed'));

      await expect(cacheStrategy('cache-err', strategy)).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error caching negotiation strategy',
        expect.objectContaining({ listingId: 'cache-err', error: 'Upsert failed' })
      );
    });
  });

  // -------------------------------------------------------------------------
  // generateFallbackStrategy
  // -------------------------------------------------------------------------

  describe('generateFallbackStrategy()', () => {
    it('returns a strategy with isFallback=true and valid price range', () => {
      const result = generateFallbackStrategy(makeInput());
      expect(result.isFallback).toBe(true);
      expect(result.initialOfferPrice).toBeGreaterThan(0);
      expect(result.walkAwayPrice).toBeGreaterThanOrEqual(result.initialOfferPrice);
      expect(result.disclaimer).toBeTruthy();
    });

    it('is more aggressive for stale listings (>30 days listed)', () => {
      const staleFallback = generateFallbackStrategy(makeInput({ daysListed: 35 }));
      const freshFallback = generateFallbackStrategy(makeInput({ daysListed: 2 }));
      // Stale listing → lower initial offer as % of asking
      expect(staleFallback.initialOfferPrice).toBeLessThan(freshFallback.initialOfferPrice);
    });

    it('raises offerPercent for aging listings (14-30 days)', () => {
      const aging = generateFallbackStrategy(makeInput({ daysListed: 20 }));
      const fresh = generateFallbackStrategy(makeInput({ daysListed: 5 }));
      expect(aging.initialOfferPrice).toBeLessThanOrEqual(fresh.initialOfferPrice);
    });

    it('clamps offer to 95% of asking when negotiable is false', () => {
      const result = generateFallbackStrategy(makeInput({ negotiable: false, askingPrice: 200 }));
      expect(result.initialOfferPrice).toBe(190); // 200 * 0.95
    });

    it('boosts offer for high demand (isHighDemand = true)', () => {
      const highDemand = generateFallbackStrategy(makeInput({ demandLevel: 'high', negotiable: true }));
      const lowDemand = generateFallbackStrategy(makeInput({ demandLevel: 'low', negotiable: true }));
      expect(highDemand.initialOfferPrice).toBeGreaterThanOrEqual(lowDemand.initialOfferPrice);
    });

    it('sets confidence to high when verifiedMarketValue and sellabilityScore are both set', () => {
      const result = generateFallbackStrategy(
        makeInput({ verifiedMarketValue: 150, sellabilityScore: 80 })
      );
      expect(result.confidence).toBe('high');
    });

    it('sets confidence to low when no market data at all', () => {
      const result = generateFallbackStrategy(
        makeInput({ verifiedMarketValue: null, estimatedValue: null })
      );
      expect(result.confidence).toBe('low');
    });

    it('includes market-value tactic when asking price exceeds verifiedMarketValue', () => {
      const result = generateFallbackStrategy(
        makeInput({ askingPrice: 200, verifiedMarketValue: 150 })
      );
      expect(result.negotiationTactics.some((t) => t.includes('market value'))).toBe(true);
    });

    it('includes days-listed tactic for listings over 14 days', () => {
      const result = generateFallbackStrategy(makeInput({ daysListed: 20 }));
      expect(result.negotiationTactics.some((t) => t.includes('20 days'))).toBe(true);
    });

    it('falls back to generic tactic when no specific tactics apply', () => {
      const result = generateFallbackStrategy(
        makeInput({
          daysListed: 5,
          verifiedMarketValue: null,
          askingPrice: 100,
        })
      );
      expect(result.negotiationTactics.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // generateNegotiationStrategy — no API key (fallback path)
  // -------------------------------------------------------------------------

  describe('generateNegotiationStrategy() — no OPENAI_API_KEY', () => {
    beforeEach(() => {
      delete process.env.OPENAI_API_KEY;
    });

    it('returns fallback strategy without calling OpenAI', async () => {
      const result = await generateNegotiationStrategy(makeInput({ listingId: 'fallback-1' }));
      expect(result.isFallback).toBe(true);
      expect(mockOpenAIConstructor).not.toHaveBeenCalled();
    });

    it('returns cached strategy from L1 cache when available', async () => {
      const cached = makeStoredStrategy();
      mockCache.get.mockReturnValueOnce(cached);

      const result = await generateNegotiationStrategy(makeInput({ listingId: 'cached-1' }));
      expect(result).toBe(cached);
      expect(mockOpenAIConstructor).not.toHaveBeenCalled();
    });

    it('applies market data freshness downgrade for old data (>14 days)', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 20); // 20 days ago

      const result = await generateNegotiationStrategy(
        makeInput({ listingId: 'stale-market', marketDataDate: oldDate })
      );

      expect(result.confidence).toBe('low');
      expect(result.reasoning).toContain('days old');
    });
  });

  // -------------------------------------------------------------------------
  // generateNegotiationStrategy — with API key (OpenAI singleton + error paths)
  // -------------------------------------------------------------------------

  describe('generateNegotiationStrategy() — with OPENAI_API_KEY', () => {
    const API_KEY = 'test-openai-key-xyz';

    beforeEach(() => {
      process.env.OPENAI_API_KEY = API_KEY;
    });

    afterEach(() => {
      delete process.env.OPENAI_API_KEY;
    });

    it('creates OpenAI singleton on first call and returns fallback when API throws', async () => {
      mockCreate.mockRejectedValueOnce(new Error('OpenAI API error'));

      const result = await generateNegotiationStrategy(makeInput({ listingId: 'api-create-1' }));

      expect(result.isFallback).toBe(true);
      expect(mockOpenAIConstructor).toHaveBeenCalledWith({ apiKey: API_KEY });
    });

    it('reuses OpenAI singleton on subsequent call without calling constructor again', async () => {
      // After the previous test created the singleton, clearAllMocks() resets
      // call counts but the module-level 'openai' variable persists.
      // This test verifies the constructor is NOT called a second time.
      mockCreate.mockRejectedValueOnce(new Error('OpenAI API error 2'));

      const result = await generateNegotiationStrategy(makeInput({ listingId: 'api-create-2' }));

      expect(result.isFallback).toBe(true);
      // Constructor NOT called — singleton from previous test was reused
      expect(mockOpenAIConstructor).not.toHaveBeenCalled();
    });

    it('parses valid JSON LLM response and returns non-fallback strategy', async () => {
      const llmPayload = {
        initialOfferPrice: 80,
        walkAwayPrice: 95,
        negotiationTactics: ['Make a fair offer'],
        counterOfferSuggestions: [
          {
            roundNumber: 1,
            ifSellerCountersAt: 'Seller counters near asking',
            suggestedResponse: 87,
            reasoning: 'Meet halfway',
          },
        ],
        confidence: 'high',
        reasoning: 'Strong deal based on market data.',
      };
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(llmPayload) } }],
      });

      const result = await generateNegotiationStrategy(makeInput({ listingId: 'api-create-3' }));

      expect(result.isFallback).toBe(false);
      expect(result.initialOfferPrice).toBe(80);
      expect(result.confidence).toBe('high');
    });

    it('falls back when LLM response contains no JSON block', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Sorry, I cannot help with that.' } }],
      });

      const result = await generateNegotiationStrategy(makeInput({ listingId: 'api-create-4' }));

      expect(result.isFallback).toBe(true);
    });

    it('builds prompt with all-null optional fields (N/A and Unknown branches)', async () => {
      // Input with no verifiedMarketValue, estimatedValue, daysListed, sellabilityScore, negotiable
      // This exercises the null/undefined branches in buildNegotiationPrompt template
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '{ "bad": true }' } }],
      });

      const result = await generateNegotiationStrategy(
        makeInput({
          listingId: 'null-fields-1',
          verifiedMarketValue: null,
          estimatedValue: null,
          daysListed: null,
          sellabilityScore: null,
          negotiable: undefined,
          condition: undefined,
          demandLevel: undefined,
        })
      );

      // Prompt was built (strategy returned) — we don't assert exact content, just that it ran
      expect(result).toBeDefined();
    });

    it('builds prompt with negotiable=false and daysListed=0 (edge branches)', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '{ "bad": true }' } }],
      });

      const result = await generateNegotiationStrategy(
        makeInput({
          listingId: 'null-fields-2',
          negotiable: false,
          daysListed: 0,
          verifiedMarketValue: null,
          estimatedValue: null,
        })
      );

      expect(result).toBeDefined();
    });

    it('exercises analyzeCounterOffer LLM path with valid JSON response', async () => {
      const payload = {
        recommendation: 'counter',
        suggestedCounterPrice: 85,
        reasoning: 'Good deal.',
        confidence: 'high',
        profitAtThisPrice: 20,
      };
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(payload) } }],
      });

      const result = await analyzeCounterOffer(makeInput({ listingId: 'counter-llm-1' }), 90, 70);
      expect(result.recommendation).toBe('counter');
      expect(result.suggestedCounterPrice).toBe(85);
    });

    it('falls back when analyzeCounterOffer LLM response has no JSON', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'No JSON here.' } }],
      });

      const result = await analyzeCounterOffer(makeInput({ listingId: 'counter-llm-2' }), 90, 70);
      expect(['accept', 'counter', 'walkaway']).toContain(result.recommendation);
    });

    it('falls back when analyzeCounterOffer LLM call throws', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Counter API error'));

      const result = await analyzeCounterOffer(makeInput({ listingId: 'counter-llm-3' }), 90, 70);
      expect(['accept', 'counter', 'walkaway']).toContain(result.recommendation);
    });

    it('analyzeCounterOffer builds prompt with null optional fields', async () => {
      const payload = {
        recommendation: 'accept',
        suggestedCounterPrice: null,
        reasoning: '',
        confidence: 'low',
        profitAtThisPrice: 5,
      };
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(payload) } }],
      });

      const result = await analyzeCounterOffer(
        makeInput({
          listingId: 'counter-null-1',
          verifiedMarketValue: null,
          estimatedValue: null,
          daysListed: null,
          demandLevel: undefined,
          negotiable: undefined,
        }),
        90, 70
      );
      // recommendation='accept' means suggestedCounterPrice stays null (else branch)
      expect(result.recommendation).toBe('accept');
      expect(result.suggestedCounterPrice).toBeNull();
    });

    it('validateStrategyResponse with sparse counterOfferSuggestions covers || fallbacks', async () => {
      const payload = {
        initialOfferPrice: 80,
        walkAwayPrice: 110,
        negotiationTactics: ['Be firm'],
        counterOfferSuggestions: [
          { roundNumber: null, ifSellerCountersAt: null, suggestedResponse: null, reasoning: null },
        ],
        confidence: 'medium',
        reasoning: '',
      };
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(payload) } }],
      });

      const result = await generateNegotiationStrategy(
        makeInput({ listingId: 'sparse-suggestions-1' })
      );
      expect(result.counterOfferSuggestions).toHaveLength(1);
      expect(result.counterOfferSuggestions[0].roundNumber).toBe(1); // fallback: 0 || i+1
      expect(result.counterOfferSuggestions[0].ifSellerCountersAt).toBe(''); // fallback: null || ''
    });
  });

  // -------------------------------------------------------------------------
  // generateFallbackCounterAnalysis
  // -------------------------------------------------------------------------

  describe('generateFallbackCounterAnalysis()', () => {
    it('recommends walkaway when counter exceeds asking price × 1.1 with high demand', () => {
      const result = generateFallbackCounterAnalysis(
        makeInput({ askingPrice: 100, demandLevel: 'high' }),
        115, // > 100 * 1.1 = 110
        80   // previous offer
      );
      expect(result.recommendation).toBe('walkaway');
      expect(result.suggestedCounterPrice).toBeNull();
    });

    it('recommends accept when counter is at or below previous offer', () => {
      const result = generateFallbackCounterAnalysis(makeInput(), 80, 80);
      expect(result.recommendation).toBe('accept');
    });

    it('recommends walkaway when counter exceeds max payable (profit < $10)', () => {
      // CRAIGSLIST fee = 0%, askingPrice=100, verifiedMarketValue=100
      // maxPayable = 100 * (1 - 0) - 10 = 90
      const result = generateFallbackCounterAnalysis(
        makeInput({ askingPrice: 100, verifiedMarketValue: 100, platform: 'CRAIGSLIST' }),
        95, // > maxPayable (90)
        70
      );
      expect(result.recommendation).toBe('walkaway');
    });

    it('recommends counter at midpoint when deal is still profitable', () => {
      // CRAIGSLIST fee = 0%, verifiedMarketValue=200, askingPrice=100
      // maxPayable = 200 - 10 = 190; counter=90 (< maxPayable)
      const result = generateFallbackCounterAnalysis(
        makeInput({ askingPrice: 100, verifiedMarketValue: 200, platform: 'CRAIGSLIST' }),
        90, // counter
        70  // previous offer
      );
      expect(result.recommendation).toBe('counter');
      expect(result.suggestedCounterPrice).toBe(80); // midpoint(70, 90)
    });
  });

  // -------------------------------------------------------------------------
  // analyzeCounterOffer — no API key
  // -------------------------------------------------------------------------

  describe('analyzeCounterOffer() — no OPENAI_API_KEY', () => {
    beforeEach(() => {
      delete process.env.OPENAI_API_KEY;
    });

    it('returns fallback analysis immediately without calling OpenAI', async () => {
      const result = await analyzeCounterOffer(makeInput(), 90, 70);
      expect(['accept', 'counter', 'walkaway']).toContain(result.recommendation);
      expect(mockOpenAIConstructor).not.toHaveBeenCalled();
    });
  });
});

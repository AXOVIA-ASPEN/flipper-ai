/**
 * @file src/__tests__/negotiation-strategy.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Unit tests for the AI negotiation strategy module.
 *
 * @description
 * Tests for src/lib/negotiation-strategy.ts covering strategy generation with
 * various market conditions, counter-offer analysis, algorithmic fallback,
 * LLM response validation, dual-layer caching, and edge cases.
 */

import type { NegotiationStrategyInput } from '../lib/negotiation-strategy';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

const mockFindFirst = jest.fn().mockResolvedValue(null);
const mockUpsert = jest.fn().mockResolvedValue({});
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    aiAnalysisCache: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
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

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    timed: jest.fn().mockReturnValue(jest.fn()),
  },
}));

jest.mock('@/lib/metrics', () => ({
  metrics: {
    increment: jest.fn(),
    gauge: jest.fn(),
    observe: jest.fn(),
  },
}));

jest.mock('@/lib/error-tracker', () => ({
  captureError: jest.fn(),
}));

// ── Test Data ────────────────────────────────────────────────────────────────

const baseInput: NegotiationStrategyInput = {
  listingId: 'listing-123',
  askingPrice: 100,
  verifiedMarketValue: 130,
  estimatedValue: 120,
  condition: 'Good',
  daysListed: 10,
  negotiable: true,
  demandLevel: 'medium',
  sellabilityScore: 70,
  platform: 'EBAY',
  recommendedOffer: 85,
};

const mockStrategyAIResponse = (overrides: Record<string, unknown> = {}) => ({
  choices: [
    {
      message: {
        content: JSON.stringify({
          initialOfferPrice: 80,
          walkAwayPrice: 95,
          negotiationTactics: ['cite comparable prices', 'note listing age'],
          counterOfferSuggestions: [
            {
              roundNumber: 1,
              ifSellerCountersAt: 'seller counters at $110',
              suggestedResponse: 88,
              reasoning: 'Meet halfway',
            },
          ],
          confidence: 'high',
          reasoning: 'Item is 23% below verified market value of $130',
          ...overrides,
        }),
      },
    },
  ],
});

const mockCounterOfferAIResponse = (overrides: Record<string, unknown> = {}) => ({
  choices: [
    {
      message: {
        content: JSON.stringify({
          recommendation: 'counter',
          suggestedCounterPrice: 88,
          reasoning: 'Counter is reasonable, meet halfway',
          confidence: 'medium',
          profitAtThisPrice: 23,
          ...overrides,
        }),
      },
    },
  ],
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('negotiation-strategy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key-123' };
    mockCreate.mockReset();
    mockFindFirst.mockReset().mockResolvedValue(null);
    mockUpsert.mockReset().mockResolvedValue({});
    mockCacheGet.mockReset().mockReturnValue(undefined);
    mockCacheSet.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // We need to dynamically import to pick up fresh env
  async function importModule() {
    return await import('../lib/negotiation-strategy');
  }

  // ── generateNegotiationStrategy ──────────────────────────────────────

  describe('generateNegotiationStrategy', () => {
    it('generates AI strategy with full market data and returns correct structure', async () => {
      mockCreate.mockResolvedValue(mockStrategyAIResponse());
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result.isFallback).toBe(false);
      expect(result.initialOfferPrice).toBe(80);
      expect(result.walkAwayPrice).toBe(95);
      expect(result.negotiationTactics).toEqual(['cite comparable prices', 'note listing age']);
      expect(result.counterOfferSuggestions).toHaveLength(1);
      expect(result.counterOfferSuggestions[0].roundNumber).toBe(1);
      expect(result.confidence).toBe('high');
      expect(result.reasoning).toContain('market value');
      expect(result.disclaimer).toBeDefined();
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('generates more aggressive strategy for high-demand items', async () => {
      mockCreate.mockResolvedValue(
        mockStrategyAIResponse({ initialOfferPrice: 92, confidence: 'high' })
      );
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy({
        ...baseInput,
        demandLevel: 'very_high',
      });

      expect(result.isFallback).toBe(false);
      // AI returned 92 which is < 95% of asking, so it passes validation
      expect(result.initialOfferPrice).toBe(92);
    });

    it('generates more aggressive offers for stale listings (>30 days)', async () => {
      const { generateFallbackStrategy } = await importModule();

      const result = generateFallbackStrategy({
        ...baseInput,
        daysListed: 45,
      });

      // Stale listing: base 0.85 - 0.10 = 0.75
      expect(result.initialOfferPrice).toBe(75);
      expect(result.isFallback).toBe(true);
    });

    it('generates close-to-asking offers for non-negotiable listings', async () => {
      const { generateFallbackStrategy } = await importModule();

      const result = generateFallbackStrategy({
        ...baseInput,
        negotiable: false,
      });

      // Non-negotiable: offerPercent = 0.95
      expect(result.initialOfferPrice).toBe(95);
      expect(result.isFallback).toBe(true);
    });

    it('falls back to estimatedValue when verifiedMarketValue is null', async () => {
      const { generateFallbackStrategy } = await importModule();

      const result = generateFallbackStrategy({
        ...baseInput,
        verifiedMarketValue: null,
      });

      // Uses estimatedValue (120) for market value calculations
      expect(result.isFallback).toBe(true);
      expect(result.reasoning).toContain('Estimated value: $120');
    });

    it('falls back to askingPrice when both market values are null', async () => {
      const { generateFallbackStrategy } = await importModule();

      const result = generateFallbackStrategy({
        ...baseInput,
        verifiedMarketValue: null,
        estimatedValue: null,
      });

      expect(result.isFallback).toBe(true);
      expect(result.confidence).toBe('low');
    });

    it('handles overpriced listings (askingPrice > verifiedMarketValue)', async () => {
      const { generateFallbackStrategy } = await importModule();

      const result = generateFallbackStrategy({
        ...baseInput,
        askingPrice: 150,
        verifiedMarketValue: 100,
      });

      expect(result.isFallback).toBe(true);
      expect(result.negotiationTactics).toContain(
        'Point out that asking price exceeds verified market value'
      );
    });
  });

  // ── analyzeCounterOffer ──────────────────────────────────────────────

  describe('analyzeCounterOffer', () => {
    it('returns AI analysis with accept/counter/walkaway recommendation', async () => {
      mockCreate.mockResolvedValue(mockCounterOfferAIResponse());
      const { analyzeCounterOffer } = await importModule();

      const result = await analyzeCounterOffer(baseInput, 95, 80);

      expect(result.recommendation).toBe('counter');
      expect(result.suggestedCounterPrice).toBe(88);
      expect(result.reasoning).toContain('halfway');
      expect(result.confidence).toBe('medium');
      expect(typeof result.profitAtThisPrice).toBe('number');
    });

    it('recommends accept when counter is at/below our offer (fallback)', async () => {
      delete process.env.OPENAI_API_KEY;
      const { analyzeCounterOffer } = await importModule();

      const result = await analyzeCounterOffer(baseInput, 75, 80);

      expect(result.recommendation).toBe('accept');
      expect(result.suggestedCounterPrice).toBeNull();
    });

    it('recommends walkaway when counter exceeds max payable (fallback)', async () => {
      delete process.env.OPENAI_API_KEY;
      const { analyzeCounterOffer } = await importModule();

      // Market value 130, fee 13% → max payable ≈ 130*0.87-10 = 103.1
      const result = await analyzeCounterOffer(baseInput, 120, 80);

      expect(result.recommendation).toBe('walkaway');
    });

    it('detects bidding war when counter > 110% asking with high demand', async () => {
      delete process.env.OPENAI_API_KEY;
      const { analyzeCounterOffer } = await importModule();

      const result = await analyzeCounterOffer(
        { ...baseInput, demandLevel: 'very_high' },
        115, // > 100 * 1.1
        80
      );

      expect(result.recommendation).toBe('walkaway');
      expect(result.reasoning).toContain('price escalation');
    });
  });

  // ── generateFallbackStrategy ─────────────────────────────────────────

  describe('generateFallbackStrategy', () => {
    it('generates algorithmic strategy when OpenAI unavailable', async () => {
      delete process.env.OPENAI_API_KEY;
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result.isFallback).toBe(true);
      expect(result.initialOfferPrice).toBeGreaterThan(0);
      expect(result.walkAwayPrice).toBeGreaterThanOrEqual(result.initialOfferPrice);
      expect(result.negotiationTactics.length).toBeGreaterThan(0);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('does not throw when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;
      const { generateNegotiationStrategy } = await importModule();

      await expect(generateNegotiationStrategy(baseInput)).resolves.toBeDefined();
    });

    it('falls back when OpenAI call fails (network error)', async () => {
      mockCreate.mockRejectedValue(new Error('Network error'));
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result.isFallback).toBe(true);
    });

    it('falls back when OpenAI call fails (rate limit)', async () => {
      mockCreate.mockRejectedValue(new Error('Rate limit exceeded'));
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result.isFallback).toBe(true);
    });

    it('falls back when LLM returns malformed JSON', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'This is not JSON at all.' } }],
      });
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result.isFallback).toBe(true);
    });
  });

  // ── LLM Response Validation ──────────────────────────────────────────

  describe('LLM response validation', () => {
    it('clamps negative offer price to 1', async () => {
      mockCreate.mockResolvedValue(
        mockStrategyAIResponse({ initialOfferPrice: -50, walkAwayPrice: -10 })
      );
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result.initialOfferPrice).toBe(1);
      expect(result.walkAwayPrice).toBeGreaterThanOrEqual(1);
    });

    it('clamps offer > asking to askingPrice * 0.95', async () => {
      mockCreate.mockResolvedValue(
        mockStrategyAIResponse({ initialOfferPrice: 500 })
      );
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result.initialOfferPrice).toBe(95); // 100 * 0.95
    });

    it('ensures walkAwayPrice >= initialOfferPrice', async () => {
      mockCreate.mockResolvedValue(
        mockStrategyAIResponse({ initialOfferPrice: 80, walkAwayPrice: 50 })
      );
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result.walkAwayPrice).toBeGreaterThanOrEqual(result.initialOfferPrice);
    });

    it('validates confidence enum — invalid becomes medium', async () => {
      mockCreate.mockResolvedValue(
        mockStrategyAIResponse({ confidence: 'super_high' })
      );
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result.confidence).toBe('medium');
    });

    it('handles NaN offer prices gracefully', async () => {
      mockCreate.mockResolvedValue(
        mockStrategyAIResponse({ initialOfferPrice: 'not-a-number', walkAwayPrice: NaN })
      );
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result.initialOfferPrice).toBe(1);
      expect(result.walkAwayPrice).toBeGreaterThanOrEqual(1);
    });

    it('rejects Infinity values', async () => {
      mockCreate.mockResolvedValue(
        mockStrategyAIResponse({ initialOfferPrice: Infinity })
      );
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      // Infinity serializes as null in JSON, so Number(null) = 0, clamped to 1
      expect(result.initialOfferPrice).toBeGreaterThanOrEqual(1);
      expect(result.initialOfferPrice).toBeLessThanOrEqual(95);
    });

    it('defaults tactics to array when LLM returns non-array', async () => {
      mockCreate.mockResolvedValue(
        mockStrategyAIResponse({ negotiationTactics: 'just a string' })
      );
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(Array.isArray(result.negotiationTactics)).toBe(true);
      expect(result.negotiationTactics.length).toBeGreaterThan(0);
    });
  });

  // ── Cache Integration ────────────────────────────────────────────────

  describe('cache integration', () => {
    it('returns L1 cached result without calling OpenAI', async () => {
      const cachedStrategy = {
        initialOfferPrice: 75,
        walkAwayPrice: 90,
        negotiationTactics: ['cached tactic'],
        counterOfferSuggestions: [],
        confidence: 'high' as const,
        reasoning: 'Cached',
        isFallback: false,
        disclaimer: 'test',
      };
      mockCacheGet.mockReturnValue(cachedStrategy);
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result).toEqual(cachedStrategy);
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockFindFirst).not.toHaveBeenCalled();
    });

    it('returns L2 cached result and populates L1', async () => {
      const cachedData = {
        initialOfferPrice: 75,
        walkAwayPrice: 90,
        negotiationTactics: ['db cached'],
        counterOfferSuggestions: [],
        confidence: 'high',
        reasoning: 'DB Cached',
        isFallback: false,
        disclaimer: 'test',
      };
      mockCacheGet.mockReturnValue(undefined);
      mockFindFirst.mockResolvedValue({
        analysisResult: JSON.stringify(cachedData),
      });
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result.initialOfferPrice).toBe(75);
      expect(mockCacheSet).toHaveBeenCalled(); // L1 populated
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('calls OpenAI on full cache miss', async () => {
      mockCacheGet.mockReturnValue(undefined);
      mockFindFirst.mockResolvedValue(null);
      mockCreate.mockResolvedValue(mockStrategyAIResponse());
      const { generateNegotiationStrategy } = await importModule();

      const result = await generateNegotiationStrategy(baseInput);

      expect(result.isFallback).toBe(false);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      // Should cache the result
      expect(mockUpsert).toHaveBeenCalled();
    });
  });

  // ── Edge Cases ───────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles daysListed null (new listing)', async () => {
      const { generateFallbackStrategy } = await importModule();

      const result = generateFallbackStrategy({
        ...baseInput,
        daysListed: null,
      });

      expect(result.isFallback).toBe(true);
      expect(result.initialOfferPrice).toBeGreaterThan(0);
    });

    it('handles daysListed = 0 (just posted)', async () => {
      const { generateFallbackStrategy } = await importModule();

      const result = generateFallbackStrategy({
        ...baseInput,
        daysListed: 0,
      });

      expect(result.isFallback).toBe(true);
      // daysListed = 0 doesn't trigger any aging discount, base 85%
      expect(result.initialOfferPrice).toBe(85);
    });

    it('handles demandLevel null — defaults to medium behavior', async () => {
      const { generateFallbackStrategy } = await importModule();

      const result = generateFallbackStrategy({
        ...baseInput,
        demandLevel: null,
      });

      expect(result.isFallback).toBe(true);
      // No high-demand boost, base 85%
      expect(result.initialOfferPrice).toBe(85);
    });

    it('uses Craigslist 0% fee for local cash deals', async () => {
      const { generateFallbackStrategy } = await importModule();

      const result = generateFallbackStrategy({
        ...baseInput,
        platform: 'CRAIGSLIST',
      });

      expect(result.isFallback).toBe(true);
      // Walk-away with 0% fee: marketValue * 1.0 - 10 = 120
      expect(result.walkAwayPrice).toBeLessThanOrEqual(130);
    });

    it('hot listing (<=3 days) gets less aggressive offer', async () => {
      const { generateFallbackStrategy } = await importModule();

      const result = generateFallbackStrategy({
        ...baseInput,
        daysListed: 2,
      });

      // Hot: 0.85 + 0.03 = 0.88
      expect(result.initialOfferPrice).toBe(88);
    });

    it('aging listing (15-30 days) gets moderately aggressive offer', async () => {
      const { generateFallbackStrategy } = await importModule();

      const result = generateFallbackStrategy({
        ...baseInput,
        daysListed: 20,
      });

      // Aging: 0.85 - 0.05 = 0.80
      expect(result.initialOfferPrice).toBe(80);
    });

    it('counter-offer analysis falls back when API fails', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));
      const { analyzeCounterOffer } = await importModule();

      const result = await analyzeCounterOffer(baseInput, 95, 80);

      expect(['accept', 'counter', 'walkaway']).toContain(result.recommendation);
      expect(typeof result.profitAtThisPrice).toBe('number');
    });

    it('counter-offer analysis falls back when response has no JSON', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'no json here' } }],
      });
      const { analyzeCounterOffer } = await importModule();

      const result = await analyzeCounterOffer(baseInput, 95, 80);

      expect(['accept', 'counter', 'walkaway']).toContain(result.recommendation);
    });
  });
});

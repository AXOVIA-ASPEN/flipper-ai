// Tests for llm-analyzer.ts
import { analyzeSellability, quickDiscountCheck, runFullAnalysis } from '../lib/llm-analyzer';
import type { ItemIdentification } from '../lib/llm-identifier';
import type { MarketPrice } from '../lib/market-price';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verifiedMarketValue: 500,
                  trueDiscountPercent: 60,
                  sellabilityScore: 85,
                  demandLevel: 'high',
                  expectedDaysToSell: 7,
                  authenticityRisk: 'low',
                  conditionRisk: 'low',
                  recommendedOfferPrice: 180,
                  recommendedListPrice: 450,
                  resaleStrategy: 'List on eBay with detailed photos',
                  resalePlatform: 'ebay',
                  confidence: 'high',
                  reasoning: 'Great deal on a popular item',
                  meetsThreshold: true,
                }),
              },
            },
          ],
        }),
      },
    },
  }));
});

const mockIdentification: ItemIdentification = {
  brand: 'Apple',
  model: 'iPhone 14 Pro',
  variant: '256GB',
  year: 2022,
  condition: 'good',
  conditionNotes: 'Minor scratches',
  searchQuery: 'Apple iPhone 14 Pro 256GB',
  category: 'cell phones',
  worthInvestigating: true,
  reasoning: 'High demand item',
};

const mockMarketData: MarketPrice = {
  source: 'ebay_scrape',
  soldListings: [
    {
      title: 'iPhone 14 Pro 256GB',
      price: 500,
      soldDate: null,
      condition: 'Used',
      url: 'https://ebay.com/1',
      shippingCost: 0,
    },
    {
      title: 'iPhone 14 Pro 256GB Blue',
      price: 520,
      soldDate: null,
      condition: 'Used',
      url: 'https://ebay.com/2',
      shippingCost: 10,
    },
  ],
  medianPrice: 500,
  lowPrice: 450,
  highPrice: 550,
  avgPrice: 500,
  salesCount: 10,
  avgDaysToSell: null,
  searchQuery: 'iPhone 14 Pro 256GB',
  fetchedAt: new Date(),
};

describe('llm-analyzer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('quickDiscountCheck', () => {
    it('passes when discount >= 40%', () => {
      const result = quickDiscountCheck(250, mockMarketData);
      expect(result.passesQuickCheck).toBe(true);
      expect(result.estimatedDiscount).toBe(50);
    });

    it('fails when discount < 40%', () => {
      const result = quickDiscountCheck(400, mockMarketData);
      expect(result.passesQuickCheck).toBe(false);
      expect(result.estimatedDiscount).toBe(20);
    });

    it('handles exact 40% threshold', () => {
      const result = quickDiscountCheck(300, mockMarketData);
      expect(result.passesQuickCheck).toBe(true);
      expect(result.estimatedDiscount).toBe(40);
    });
  });

  describe('analyzeSellability', () => {
    it('returns null when OPENAI_API_KEY not set', async () => {
      delete process.env.OPENAI_API_KEY;
      const result = await analyzeSellability('iPhone', 200, mockIdentification, mockMarketData);
      expect(result).toBeNull();
    });

    it('returns analysis when API key is set', async () => {
      const result = await analyzeSellability(
        'iPhone 14 Pro',
        200,
        mockIdentification,
        mockMarketData
      );
      expect(result).not.toBeNull();
      expect(result?.verifiedMarketValue).toBe(500);
      expect(result?.meetsThreshold).toBe(true);
      expect(result?.sellabilityScore).toBe(85);
      expect(result?.demandLevel).toBe('high');
      expect(result?.confidence).toBe('high');
    });
  });

  describe('analyzeSellability edge cases', () => {
    it('returns null when LLM response has no JSON', async () => {
      // Override mock to return non-JSON content
      const OpenAI = require('openai');
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'No JSON here, just plain text analysis.' } }],
      });
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      // Reset cached openai instance by re-importing
      jest.resetModules();
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: { completions: { create: mockCreate } },
        }));
      });
      const { analyzeSellability: freshAnalyze } = require('../lib/llm-analyzer');
      process.env.OPENAI_API_KEY = 'test-key';
      const result = await freshAnalyze('iPhone', 200, mockIdentification, mockMarketData);
      expect(result).toBeNull();
    });

    it('returns null when LLM call throws an error', async () => {
      jest.resetModules();
      const mockCreate = jest.fn().mockRejectedValue(new Error('API rate limit'));
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: { completions: { create: mockCreate } },
        }));
      });
      const { analyzeSellability: freshAnalyze } = require('../lib/llm-analyzer');
      process.env.OPENAI_API_KEY = 'test-key';
      const result = await freshAnalyze('iPhone', 200, mockIdentification, mockMarketData);
      expect(result).toBeNull();
    });

    it('uses fallback values when LLM returns partial JSON', async () => {
      jest.resetModules();
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                sellabilityScore: 150,
                demandLevel: 'invalid',
                authenticityRisk: 'invalid',
                conditionRisk: 'invalid',
                confidence: 'invalid',
              }),
            },
          },
        ],
      });
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: { completions: { create: mockCreate } },
        }));
      });
      const { analyzeSellability: freshAnalyze } = require('../lib/llm-analyzer');
      process.env.OPENAI_API_KEY = 'test-key';
      const result = await freshAnalyze('iPhone', 200, mockIdentification, mockMarketData);
      expect(result).not.toBeNull();
      // sellabilityScore clamped to 100
      expect(result!.sellabilityScore).toBe(100);
      // Fallbacks for invalid values
      expect(result!.verifiedMarketValue).toBe(mockMarketData.medianPrice);
      expect(result!.recommendedOfferPrice).toBe(200);
      expect(result!.recommendedListPrice).toBe(mockMarketData.medianPrice);
    });
  });

  describe('runFullAnalysis', () => {
    it('returns full analysis result', async () => {
      const result = await runFullAnalysis(
        'iPhone 14 Pro',
        'Great condition',
        200,
        'electronics',
        mockIdentification,
        mockMarketData
      );
      expect(result).not.toBeNull();
      expect(result?.identification).toEqual(mockIdentification);
      expect(result?.marketData).toEqual(mockMarketData);
      expect(result?.analysis).toBeDefined();
    });

    it('returns null when analysis fails', async () => {
      delete process.env.OPENAI_API_KEY;
      const result = await runFullAnalysis(
        'iPhone',
        null,
        200,
        null,
        mockIdentification,
        mockMarketData
      );
      expect(result).toBeNull();
    });
  });
});

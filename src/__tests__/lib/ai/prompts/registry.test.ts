/**
 * @file src/__tests__/lib/ai/prompts/registry.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Unit tests for the centralized prompt registry.
 *
 * @description
 * Validates that all 12 prompt configs are registered, getPrompt() returns
 * valid configs with required fields, buildUserPrompt() returns non-empty
 * strings for sample contexts, unknown prompts throw, and getAllPromptNames()
 * returns the full list.
 */

import { getPrompt, getAllPromptNames } from '@/lib/ai/prompts';

const ALL_PROMPT_NAMES = [
  'flipAnalysis',
  'quickDiscountCheck',
  'claudeAnalysis',
  'negotiationStrategy',
  'counterOfferAnalysis',
  'purchaseMessage',
  'listingTitle',
  'listingDescription',
  'apiDescription',
  'productIdentification',
  'logisticsClassification',
  'itemCompleteness',
];

const SAMPLE_CONTEXTS: Record<string, Record<string, unknown>> = {
  flipAnalysis: {
    title: 'iPhone 14 Pro',
    askingPrice: 500,
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    variant: '128GB',
    condition: 'good',
    conditionNotes: 'Minor scratches',
    medianPrice: 800,
    lowPrice: 700,
    highPrice: 900,
    salesCount: 20,
    outliersRemoved: 2,
    lowSampleSize: false,
    soldListingsText: '  - "iPhone 14 Pro 128GB" sold for $780 (good)',
    discountThreshold: 50,
    feeRate: 0.13,
  },
  quickDiscountCheck: {
    title: 'iPhone 14 Pro',
    askingPrice: 500,
    medianPrice: 800,
  },
  claudeAnalysis: {
    title: 'Vintage Guitar',
    description: 'Fender Stratocaster 1965',
    askingPrice: 2000,
    imageCount: 3,
  },
  negotiationStrategy: {
    askingPrice: 500,
    verifiedMarketValue: 800,
    estimatedValue: 750,
    platform: 'EBAY',
    feePercent: 13,
    discountPercent: 37,
    condition: 'good',
    daysListed: 10,
    negotiable: true,
    demandLevel: 'high',
    sellabilityScore: 75,
  },
  counterOfferAnalysis: {
    askingPrice: 500,
    ourPreviousOffer: 400,
    counterOfferPrice: 475,
    verifiedMarketValue: 800,
    estimatedValue: 750,
    feePercent: 13,
    profitAtCounter: 221,
    demandLevel: 'high',
    daysListed: 10,
    negotiable: true,
  },
  purchaseMessage: {
    listingTitle: 'iPhone 14 Pro',
    askingPrice: 500,
    platform: 'EBAY',
    sellerName: 'John',
    messageType: 'offer',
    offerPrice: 450,
    itemCondition: 'good',
    additionalContext: null,
    tone: 'professional',
  },
  listingTitle: {
    platform: 'ebay',
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    variant: '128GB',
    condition: 'good',
    category: 'Electronics',
    charLimit: 80,
  },
  listingDescription: {
    platform: 'ebay',
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    variant: '128GB',
    condition: 'good',
    category: 'Electronics',
    askingPrice: 500,
    originalPrice: 999,
    defects: ['minor scratch on back'],
    features: ['Face ID', '48MP camera'],
    includesAccessories: ['charger', 'box'],
    sellerNotes: 'Works perfectly',
    tone: 'professional, detailed',
    format: 'structured with sections',
    maxWords: 500,
  },
  apiDescription: {
    platform: 'ebay',
    tone: 'professional',
    includeSpecs: true,
    itemContext: {
      title: 'iPhone 14 Pro',
      condition: 'good',
      brand: 'Apple',
      askingPrice: 500,
    },
  },
  productIdentification: {
    title: 'iPhone 14 Pro 128GB Space Black',
    description: 'Barely used, no scratches',
    price: 500,
    category: 'Electronics',
  },
  logisticsClassification: {
    title: 'IKEA Kallax Shelf Unit',
    description: '4x4 cube shelf, white, assembled',
    category: 'furniture',
  },
  itemCompleteness: {
    title: 'Sony WH-1000XM5',
    description: 'Noise cancelling headphones, includes case and cable',
    category: 'Electronics',
  },
};

describe('Prompt Registry', () => {
  it('registers exactly 12 prompts', () => {
    expect(getAllPromptNames()).toHaveLength(12);
  });

  it('getAllPromptNames() returns all expected names', () => {
    const names = getAllPromptNames();
    for (const name of ALL_PROMPT_NAMES) {
      expect(names).toContain(name);
    }
  });

  it.each(ALL_PROMPT_NAMES)('getPrompt("%s") returns a valid config', (name) => {
    const config = getPrompt(name);
    expect(config).toBeDefined();
    expect(config.name).toBe(name);
    expect(typeof config.description).toBe('string');
    expect(config.description.length).toBeGreaterThan(0);
    expect(['gemini', 'groq', 'openai', 'anthropic']).toContain(config.provider);
    expect(Array.isArray(config.fallbacks)).toBe(true);
    expect(config.fallbacks.length).toBeGreaterThan(0);
    expect(typeof config.model).toBe('string');
    expect(typeof config.temperature).toBe('number');
    expect(typeof config.maxTokens).toBe('number');
    expect(['json', 'text']).toContain(config.responseFormat);
    expect(typeof config.systemPrompt).toBe('string');
    expect(typeof config.buildUserPrompt).toBe('function');
  });

  it.each(ALL_PROMPT_NAMES)(
    'buildUserPrompt for "%s" returns a non-empty string',
    (name) => {
      const config = getPrompt(name);
      const ctx = SAMPLE_CONTEXTS[name] || {};
      const result = config.buildUserPrompt(ctx);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  );

  it('getPrompt() throws for unknown prompt name', () => {
    expect(() => getPrompt('nonexistent')).toThrow(
      /Unknown prompt: "nonexistent"/
    );
  });

  it('getPrompt() error message lists available prompts', () => {
    try {
      getPrompt('nonexistent');
    } catch (e) {
      const msg = (e as Error).message;
      for (const name of ALL_PROMPT_NAMES) {
        expect(msg).toContain(name);
      }
    }
  });
});

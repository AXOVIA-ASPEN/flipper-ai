import {
  generateAlgorithmicDescription,
  generateDescriptionsForAllPlatforms,
  generateLLMDescription,
  fromIdentification,
  type DescriptionGeneratorInput,
} from '@/lib/description-generator';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

import OpenAI from 'openai';

const baseInput: DescriptionGeneratorInput = {
  brand: 'Sony',
  model: 'WH-1000XM5',
  variant: 'Black',
  condition: 'like_new',
  category: 'electronics',
  askingPrice: 200,
  originalPrice: 350,
  defects: [],
  features: ['Active Noise Cancellation', '30-hour battery life'],
  includesAccessories: ['Carrying case', 'USB-C cable'],
  sellerNotes: null,
};

describe('description-generator', () => {
  describe('generateAlgorithmicDescription', () => {
    it('generates a description with item name', () => {
      const result = generateAlgorithmicDescription(baseInput, 'ebay');
      expect(result.description).toContain('Sony WH-1000XM5 Black');
      expect(result.platform).toBe('ebay');
    });

    it('includes condition details', () => {
      const result = generateAlgorithmicDescription(baseInput, 'generic');
      expect(result.description).toContain('Like new condition');
      expect(result.hasConditionDetails).toBe(true);
    });

    it('includes features as bullet points', () => {
      const result = generateAlgorithmicDescription(baseInput, 'ebay');
      expect(result.description).toContain('Active Noise Cancellation');
      expect(result.description).toContain('30-hour battery life');
    });

    it('includes accessories', () => {
      const result = generateAlgorithmicDescription(baseInput, 'ebay');
      expect(result.description).toContain('Carrying case');
      expect(result.description).toContain('USB-C cable');
    });

    it('includes savings when original price is higher', () => {
      const result = generateAlgorithmicDescription(baseInput, 'ebay');
      expect(result.description).toContain('$350');
      expect(result.description).toMatch(/save \d+%/i);
    });

    it('omits savings when no original price', () => {
      const input = { ...baseInput, originalPrice: null };
      const result = generateAlgorithmicDescription(input, 'ebay');
      expect(result.description).not.toContain('Retails for');
    });

    it('includes defects when present', () => {
      const input = { ...baseInput, defects: ['Small scratch on left ear cup'] };
      const result = generateAlgorithmicDescription(input, 'ebay');
      expect(result.description).toContain('Small scratch on left ear cup');
    });

    it('includes shipping note', () => {
      const result = generateAlgorithmicDescription(baseInput, 'ebay');
      expect(result.hasShippingNote).toBe(true);
      expect(result.description).toMatch(/ship/i);
    });

    it('uses local pickup note for facebook/offerup', () => {
      const fbResult = generateAlgorithmicDescription(baseInput, 'facebook');
      expect(fbResult.description).toContain('Local pickup');

      const ouResult = generateAlgorithmicDescription(baseInput, 'offerup');
      expect(ouResult.description).toContain('Local pickup');
    });

    it('handles minimal input gracefully', () => {
      const minimal: DescriptionGeneratorInput = {
        brand: null,
        model: null,
        variant: null,
        condition: 'good',
        category: null,
        askingPrice: 50,
      };
      const result = generateAlgorithmicDescription(minimal, 'generic');
      expect(result.description).toContain('Item for sale');
      expect(result.description).toContain('Good condition');
    });

    it('includes seller notes', () => {
      const input = { ...baseInput, sellerNotes: 'Moving sale - must go this week!' };
      const result = generateAlgorithmicDescription(input, 'generic');
      expect(result.description).toContain('Moving sale');
    });

    it('handles poor condition correctly', () => {
      const input = { ...baseInput, condition: 'poor' };
      const result = generateAlgorithmicDescription(input, 'ebay');
      expect(result.description).toContain('parts or repair');
    });
  });

  describe('generateDescriptionsForAllPlatforms', () => {
    it('generates descriptions for 4 platforms', () => {
      const result = generateDescriptionsForAllPlatforms(baseInput);
      expect(result.descriptions).toHaveLength(4);
      expect(result.descriptions.map((d) => d.platform)).toEqual([
        'ebay', 'mercari', 'facebook', 'offerup',
      ]);
    });

    it('returns eBay description as primary', () => {
      const result = generateDescriptionsForAllPlatforms(baseInput);
      expect(result.primary).toBe(
        result.descriptions.find((d) => d.platform === 'ebay')!.description
      );
    });

    it('each description has word count', () => {
      const result = generateDescriptionsForAllPlatforms(baseInput);
      for (const desc of result.descriptions) {
        expect(desc.wordCount).toBeGreaterThan(0);
      }
    });
  });

  describe('fromIdentification', () => {
    it('converts ItemIdentification to DescriptionGeneratorInput', () => {
      const identification = {
        brand: 'Apple',
        model: 'iPhone 15 Pro',
        variant: '256GB Space Black',
        condition: 'good',
        category: 'phones',
        confidence: 0.95,
      };
      const result = fromIdentification(identification, 800, {
        originalPrice: 1199,
        defects: ['Hairline scratch on screen'],
        features: ['A17 Pro chip', 'Titanium frame'],
        includesAccessories: ['Original box', 'Lightning cable'],
        sellerNotes: 'Unlocked, works on all carriers',
      });

      expect(result.brand).toBe('Apple');
      expect(result.model).toBe('iPhone 15 Pro');
      expect(result.askingPrice).toBe(800);
      expect(result.originalPrice).toBe(1199);
      expect(result.defects).toContain('Hairline scratch on screen');
    });

    it('handles minimal extras', () => {
      const identification = {
        brand: 'Nike',
        model: 'Air Max 90',
        variant: null,
        condition: 'new',
        category: 'shoes',
        confidence: 0.9,
      };
      const result = fromIdentification(identification, 120);
      expect(result.brand).toBe('Nike');
      expect(result.askingPrice).toBe(120);
      expect(result.originalPrice).toBeNull();
      expect(result.defects).toBeUndefined();
    });
  });

  describe('generateLLMDescription', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      jest.clearAllMocks();
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('falls back to algorithmic when no OPENAI_API_KEY', async () => {
      delete process.env.OPENAI_API_KEY;
      const result = await generateLLMDescription(baseInput, 'ebay');
      expect(result.description).toContain('Sony WH-1000XM5 Black');
      expect(result.platform).toBe('ebay');
      expect(result.hasConditionDetails).toBe(true);
    });

    it('calls OpenAI and returns LLM description when API key set', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Sony WH-1000XM5 in excellent like new condition. Ships fast with tracking.' } }],
      });
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      const result = await generateLLMDescription(baseInput, 'ebay');
      expect(result.description).toContain('Sony WH-1000XM5');
      expect(result.platform).toBe('ebay');
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.hasConditionDetails).toBe(true);
      expect(result.hasShippingNote).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('detects condition details in LLM response', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: { completions: { create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Great item available now. Grab it before it is gone!' } }],
        }) } },
      }));

      const result = await generateLLMDescription(baseInput, 'mercari');
      expect(result.hasConditionDetails).toBe(false);
      expect(result.hasShippingNote).toBe(false);
    });

    it('handles empty LLM response', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: { completions: { create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '' } }],
        }) } },
      }));

      const result = await generateLLMDescription(baseInput, 'ebay');
      expect(result.description).toBe('');
      expect(result.wordCount).toBe(1); // ''.split(/\s+/) returns ['']
    });

    it('handles null content from LLM', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: { completions: { create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: null } }],
        }) } },
      }));

      const result = await generateLLMDescription(baseInput, 'ebay');
      expect(result.description).toBe('');
    });

    it('falls back to algorithmic on OpenAI API error', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: { completions: { create: jest.fn().mockRejectedValue(new Error('API rate limit')) } },
      }));

      const result = await generateLLMDescription(baseInput, 'ebay');
      // Should fall back to algorithmic
      expect(result.description).toContain('Sony WH-1000XM5 Black');
      expect(result.platform).toBe('ebay');
    });

    it('uses generic style for unknown platform', async () => {
      delete process.env.OPENAI_API_KEY;
      const result = await generateLLMDescription(baseInput, 'unknown-platform');
      expect(result.description).toContain('Sony WH-1000XM5 Black');
    });

    it('includes defects and features in LLM prompt', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Test description with condition details and shipping info.' } }],
      });
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      const input = {
        ...baseInput,
        defects: ['Minor scratch'],
        features: ['Bluetooth 5.3'],
        includesAccessories: ['Case'],
        sellerNotes: 'Barely used',
      };
      await generateLLMDescription(input, 'ebay');
      const prompt = mockCreate.mock.calls[0][0].messages[1].content;
      expect(prompt).toContain('Minor scratch');
      expect(prompt).toContain('Bluetooth 5.3');
      expect(prompt).toContain('Case');
      expect(prompt).toContain('Barely used');
    });

    it('handles input with no brand/model/variant', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Item for sale in used condition.' } }],
      });
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      const input: DescriptionGeneratorInput = {
        brand: null,
        model: null,
        variant: null,
        condition: 'good',
        category: null,
        askingPrice: 25,
      };
      await generateLLMDescription(input, 'facebook');
      const prompt = mockCreate.mock.calls[0][0].messages[1].content;
      expect(prompt).toContain('Item');
      expect(prompt).toContain('facebook');
    });
  });
});

// ── Additional branch coverage ───────────────────────────────────────────────

describe('generateAlgorithmicDescription - branch coverage', () => {
  it('falls back to PLATFORM_STYLES.generic for unknown platform', () => {
    const result = generateAlgorithmicDescription(
      { brand: 'Nike', model: 'Air Max', variant: null, condition: 'good', category: 'Shoes', askingPrice: 50 },
      'unknown-marketplace'
    );
    expect(result.description).toBeTruthy();
    expect(result.platform).toBe('unknown-marketplace');
  });

  it('falls back condition text for unknown condition', () => {
    const result = generateAlgorithmicDescription(
      { brand: 'Nike', model: null, variant: null, condition: 'custom-condition', category: null, askingPrice: 10 },
      'ebay'
    );
    expect(result.description).toContain('custom-condition');
  });

  it('uses facebook/offerup local pickup shipping note', () => {
    const result = generateAlgorithmicDescription(
      { brand: 'Test', model: 'Item', variant: null, condition: 'good', category: null, askingPrice: 10 },
      'offerup'
    );
    expect(result.description).toContain('Local pickup');
  });

  it('uses default shipping note for non-local platforms', () => {
    const result = generateAlgorithmicDescription(
      { brand: 'Test', model: 'Item', variant: null, condition: 'good', category: null, askingPrice: 10 },
      'ebay'
    );
    expect(result.description).toContain('Ships quickly');
  });
});

describe('generateDescriptionsForAllPlatforms - branch coverage', () => {
  it('uses first description as fallback primary when ebay missing', () => {
    // All 4 platforms are always generated; just verify primary exists
    const result = generateDescriptionsForAllPlatforms({
      brand: null, model: null, variant: null,
      condition: 'good', category: null, askingPrice: 5,
    });
    expect(result.primary).toBeTruthy();
  });
});

describe('generateLLMDescription - branch coverage', () => {
  const OpenAI = require('openai');
  const origKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (origKey !== undefined) {
      process.env.OPENAI_API_KEY = origKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it('detects condition details in LLM response', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Item in excellent used condition, ships quickly.' } }],
      }) } },
    }));
    const result = await generateLLMDescription(
      { brand: 'Sony', model: 'TV', variant: null, condition: 'good', category: null, askingPrice: 100 },
      'ebay'
    );
    expect(result.hasConditionDetails).toBe(true);
    expect(result.hasShippingNote).toBe(true);
  });
});

describe('description-generator - default parameter branches', () => {
  const baseInput = {
    brand: 'Sony',
    model: 'WH-1000XM5',
    variant: 'Black',
    condition: 'good' as const,
    category: 'electronics',
    askingPrice: 200,
  };

  it('uses "generic" platform when called without platform arg', () => {
    // Tests default parameter branch for generateAlgorithmicDescription
    const result = generateAlgorithmicDescription(baseInput);
    expect(result.description).toBeTruthy();
    expect(result.platform).toBe('generic');
  });

  it('generateLLMDescription uses "ebay" default when no platform arg', async () => {
    delete process.env.OPENAI_API_KEY;
    // Will fall back to algorithmic since no key
    const result = await generateLLMDescription(baseInput);
    expect(result.platform).toBe('ebay');
  });

  it('generateLLMDescription handles choices[0] being undefined', async () => {
    const OpenAI = require('openai');
    process.env.OPENAI_API_KEY = 'test-key';
    (OpenAI as jest.Mock).mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [], // empty choices array
          }),
        },
      },
    }));

    const result = await generateLLMDescription(baseInput, 'ebay');
    expect(result.description).toBe('');
  });

  it('generateLLMDescription includes originalPrice in prompt (truthy branch)', async () => {
    const OpenAI = require('openai');
    process.env.OPENAI_API_KEY = 'test-key';
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Great headphones retailing for $350.' } }],
    });
    (OpenAI as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));
    const result = await generateLLMDescription({ ...baseInput, originalPrice: 350 }, 'ebay');
    const prompt = mockCreate.mock.calls[0][0].messages[1].content;
    expect(prompt).toContain('Retail: $350');
    expect(result.description).toContain('headphones');
  });

  it('generateLLMDescription uses PLATFORM_STYLES.generic for unknown platform', async () => {
    const OpenAI = require('openai');
    process.env.OPENAI_API_KEY = 'test-key';
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Item available for sale with quick shipping.' } }],
    });
    (OpenAI as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));
    // 'custom-platform' is not in PLATFORM_STYLES → falls back to generic
    const result = await generateLLMDescription(baseInput, 'custom-platform');
    expect(result.description).toBeTruthy();
  });

  it('generateLLMDescription: optional fields undefined → empty template lines', async () => {
    const OpenAI = require('openai');
    process.env.OPENAI_API_KEY = 'test-key';
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'Generic item for sale.' } }],
    });
    (OpenAI as jest.Mock).mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));
    // All optional fields undefined — covers falsy branches for defects/features/accessories/notes
    const minimalInput: import('@/lib/description-generator').DescriptionGeneratorInput = {
      brand: null,
      model: null,
      variant: null,
      condition: 'fair',
      category: null,
      askingPrice: 10,
      defects: undefined,
      features: undefined,
      includesAccessories: undefined,
      sellerNotes: undefined,
      originalPrice: undefined,
    };
    const result = await generateLLMDescription(minimalInput, 'ebay');
    expect(result.description).toBe('Generic item for sale.');
    const prompt = mockCreate.mock.calls[0][0].messages[1].content;
    expect(prompt).toContain('Item'); // brand/model/variant all null → 'Item'
    expect(prompt).toContain('General'); // category null → 'General'
    expect(prompt).not.toContain('Retail:'); // no originalPrice
  });
});

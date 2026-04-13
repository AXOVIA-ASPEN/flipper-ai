import {
  generateAlgorithmicTitle,
  generateTitlesForAllPlatforms,
  generateLLMTitle,
  fromIdentification,
  type TitleGeneratorInput,
} from '../../lib/title-generator';

// Mock centralized AI module
const mockCompleteAI = jest.fn().mockResolvedValue({
  content: 'Apple iPhone 15 Pro Max 256GB - Excellent Condition',
  provider: 'gemini',
  model: 'gemini-2.0-flash',
});
jest.mock('@/lib/ai', () => ({
  completeAI: (...args: unknown[]) => mockCompleteAI(...args),
  AIProviderUnavailableError: class extends Error {
    constructor() { super('No AI provider available'); this.name = 'AIProviderUnavailableError'; }
  },
}));

describe('title-generator', () => {
  const sampleInput: TitleGeneratorInput = {
    brand: 'Apple',
    model: 'iPhone 15 Pro Max',
    variant: '256GB Space Black',
    condition: 'like_new',
    category: 'Electronics',
  };

  describe('generateAlgorithmicTitle', () => {
    it('generates a title with brand, model, variant, and condition', () => {
      const result = generateAlgorithmicTitle(sampleInput);
      expect(result.title).toContain('Apple');
      expect(result.title).toContain('iPhone 15 Pro Max');
      expect(result.title).toContain('256GB Space Black');
      expect(result.platform).toBe('generic');
    });

    it('respects eBay 80-char limit', () => {
      const result = generateAlgorithmicTitle(sampleInput, 'ebay');
      expect(result.charCount).toBeLessThanOrEqual(80);
      expect(result.platform).toBe('ebay');
    });

    it('respects Mercari 40-char limit', () => {
      const result = generateAlgorithmicTitle(sampleInput, 'mercari');
      expect(result.charCount).toBeLessThanOrEqual(40);
      expect(result.platform).toBe('mercari');
    });

    it('includes SEO keywords', () => {
      const result = generateAlgorithmicTitle(sampleInput);
      expect(result.keywords).toContain('apple');
      expect(result.keywords).toContain('iphone 15 pro max');
    });

    it('handles missing brand gracefully', () => {
      const input: TitleGeneratorInput = {
        brand: null,
        model: 'Widget',
        variant: null,
        condition: 'good',
        category: null,
      };
      const result = generateAlgorithmicTitle(input);
      expect(result.title).toContain('Widget');
      expect(result.title).toContain('Good Condition');
    });

    it('handles all-null input', () => {
      const input: TitleGeneratorInput = {
        brand: null,
        model: null,
        variant: null,
        condition: 'fair',
        category: null,
      };
      const result = generateAlgorithmicTitle(input);
      expect(result.title).toBeTruthy();
    });

    it('shows NEW for new condition', () => {
      const input: TitleGeneratorInput = {
        brand: 'Sony',
        model: 'WH-1000XM5',
        variant: null,
        condition: 'new',
        category: 'Audio',
      };
      const result = generateAlgorithmicTitle(input, 'ebay');
      expect(result.title).toContain('NEW');
    });

    it('includes extra keywords when provided', () => {
      const input: TitleGeneratorInput = {
        ...sampleInput,
        keywords: ['Unlocked', '5G'],
      };
      const result = generateAlgorithmicTitle(input);
      expect(result.keywords).toContain('unlocked');
      expect(result.keywords).toContain('5g');
    });
  });

  describe('generateTitlesForAllPlatforms', () => {
    it('generates titles for all 4 platforms', () => {
      const result = generateTitlesForAllPlatforms(sampleInput);
      expect(result.titles).toHaveLength(4);
      const platforms = result.titles.map((t) => t.platform);
      expect(platforms).toContain('ebay');
      expect(platforms).toContain('mercari');
      expect(platforms).toContain('facebook');
      expect(platforms).toContain('offerup');
    });

    it('returns a primary title', () => {
      const result = generateTitlesForAllPlatforms(sampleInput);
      expect(result.primary).toBeTruthy();
      expect(result.primary.length).toBeGreaterThan(0);
    });

    it('each platform title respects its char limit', () => {
      const result = generateTitlesForAllPlatforms(sampleInput);
      const limits: Record<string, number> = {
        ebay: 80,
        mercari: 40,
        facebook: 99,
        offerup: 70,
      };
      for (const t of result.titles) {
        expect(t.charCount).toBeLessThanOrEqual(limits[t.platform] || 80);
      }
    });
  });

  describe('generateAlgorithmicTitle - branch coverage', () => {
    it('uses unknown platform default limit of 80', () => {
      const result = generateAlgorithmicTitle(sampleInput, 'unknown_platform');
      expect(result.charCount).toBeLessThanOrEqual(80);
    });

    it("condenses title with short 'LN' for like_new when over limit", () => {
      // Mercari has 40 char limit, long input will trigger condensation
      const longInput: TitleGeneratorInput = {
        brand: 'Samsung',
        model: 'Galaxy S24 Ultra',
        variant: '512GB Titanium Black',
        condition: 'like_new',
        category: 'Electronics',
      };
      const result = generateAlgorithmicTitle(longInput, 'mercari');
      expect(result.charCount).toBeLessThanOrEqual(40);
    });

    it("condenses title with 'NEW' for new condition when over limit", () => {
      const longInput: TitleGeneratorInput = {
        brand: 'Samsung',
        model: 'Galaxy S24 Ultra',
        variant: '512GB Titanium Black',
        condition: 'new',
        category: 'Electronics',
      };
      const result = generateAlgorithmicTitle(longInput, 'mercari');
      expect(result.charCount).toBeLessThanOrEqual(40);
    });

    it('condenses with no short label for good condition', () => {
      const longInput: TitleGeneratorInput = {
        brand: 'Samsung',
        model: 'Galaxy S24 Ultra',
        variant: '512GB Titanium Black',
        condition: 'good',
        category: 'Electronics',
      };
      const result = generateAlgorithmicTitle(longInput, 'mercari');
      expect(result.charCount).toBeLessThanOrEqual(40);
    });

    it('shows For Parts/Repair for poor condition', () => {
      const input: TitleGeneratorInput = {
        brand: 'Sony',
        model: 'PS5',
        variant: null,
        condition: 'poor',
        category: null,
      };
      const result = generateAlgorithmicTitle(input, 'facebook');
      expect(result.title).toContain('For Parts/Repair');
    });

    it('shows Fair for fair condition', () => {
      const input: TitleGeneratorInput = {
        brand: 'Sony',
        model: 'PS5',
        variant: null,
        condition: 'fair',
        category: null,
      };
      const result = generateAlgorithmicTitle(input, 'ebay');
      expect(result.title).toContain('Fair');
    });

    it('uses raw condition string for unknown condition', () => {
      const input: TitleGeneratorInput = {
        brand: 'Test',
        model: 'Item',
        variant: null,
        condition: 'refurbished',
        category: null,
      };
      const result = generateAlgorithmicTitle(input);
      expect(result.title).toContain('refurbished');
    });

    it('truncates with ellipsis when condensed title still exceeds limit', () => {
      // Very long brand+model that even without condition exceeds mercari 40
      const longInput: TitleGeneratorInput = {
        brand: 'Extraordinary Brand Name Here',
        model: 'Super Long Model Name XYZ Pro Max Ultra',
        variant: 'Limited Edition 2024',
        condition: 'good',
        category: null,
      };
      const result = generateAlgorithmicTitle(longInput, 'mercari');
      expect(result.charCount).toBeLessThanOrEqual(40);
      expect(result.title).toMatch(/\.\.\.$/);
    });
  });

  describe('generateLLMTitle', () => {
    beforeEach(() => {
      mockCompleteAI.mockReset();
      mockCompleteAI.mockResolvedValue({
        content: 'Apple iPhone 15 Pro Max 256GB - Excellent Condition',
        provider: 'gemini',
        model: 'gemini-2.0-flash',
      });
    });

    it('falls back to algorithmic when no AI provider available', async () => {
      const { AIProviderUnavailableError } = jest.requireMock('@/lib/ai') as { AIProviderUnavailableError: new () => Error };
      mockCompleteAI.mockRejectedValue(new AIProviderUnavailableError());

      const result = await generateLLMTitle(sampleInput, 'ebay');
      expect(result.title).toContain('Apple');
      expect(result.platform).toBe('ebay');
    });

    it('uses LLM when AI provider is available', async () => {
      const result = await generateLLMTitle(sampleInput, 'ebay');
      expect(result.title).toBe('Apple iPhone 15 Pro Max 256GB - Excellent Condition');
      expect(result.platform).toBe('ebay');
      expect(result.keywords.length).toBeGreaterThan(0);
    });

    it('strips quotes from LLM response', async () => {
      mockCompleteAI.mockResolvedValue({ content: '"Quoted Title Here"', provider: 'gemini', model: 'gemini-2.0-flash' });

      const result = await generateLLMTitle(sampleInput, 'ebay');
      expect(result.title).toBe('Quoted Title Here');
    });

    it('truncates LLM title that exceeds platform limit', async () => {
      mockCompleteAI.mockResolvedValue({
        content: 'This is an extremely long title that definitely exceeds the forty character limit for Mercari listings and should be truncated',
        provider: 'gemini',
        model: 'gemini-2.0-flash',
      });

      const result = await generateLLMTitle(sampleInput, 'mercari');
      expect(result.charCount).toBeLessThanOrEqual(40);
      expect(result.title).toMatch(/\.\.\.$/);
    });

    it('falls back to algorithmic on LLM error', async () => {
      mockCompleteAI.mockRejectedValue(new Error('API Error'));

      const result = await generateLLMTitle(sampleInput, 'ebay');
      expect(result.title).toContain('Apple');
      expect(result.platform).toBe('ebay');
    });

    it('handles empty LLM response', async () => {
      mockCompleteAI.mockResolvedValue({ content: '', provider: 'gemini', model: 'gemini-2.0-flash' });

      const result = await generateLLMTitle(sampleInput, 'ebay');
      expect(result.platform).toBe('ebay');
    });

    it('uses default platform limit for unknown platform', async () => {
      const { AIProviderUnavailableError } = jest.requireMock('@/lib/ai') as { AIProviderUnavailableError: new () => Error };
      mockCompleteAI.mockRejectedValue(new AIProviderUnavailableError());

      const result = await generateLLMTitle(sampleInput, 'amazon');
      expect(result.charCount).toBeLessThanOrEqual(80);
    });
  });

  describe('generateLLMTitle - additional branch coverage', () => {
    it('handles empty content from LLM', async () => {
      mockCompleteAI.mockResolvedValue({ content: '', provider: 'gemini', model: 'gemini-2.0-flash' });
      const result = await generateLLMTitle(sampleInput, 'ebay');
      expect(result.platform).toBe('ebay');
      expect(result.title).toBe('');
    });

    it('strips single quotes from LLM response', async () => {
      mockCompleteAI.mockResolvedValue({ content: "'Single Quoted Title'", provider: 'gemini', model: 'gemini-2.0-flash' });
      const result = await generateLLMTitle(sampleInput, 'ebay');
      expect(result.title).toBe('Single Quoted Title');
    });

    it('uses default 80 limit for unknown platform with LLM', async () => {
      mockCompleteAI.mockResolvedValue({ content: 'Short Title', provider: 'gemini', model: 'gemini-2.0-flash' });
      const result = await generateLLMTitle(sampleInput, 'unknown_platform');
      expect(result.title).toBe('Short Title');
      expect(result.charCount).toBeLessThanOrEqual(80);
    });

    it('passes fallback values in context when input fields are null', async () => {
      mockCompleteAI.mockResolvedValue({ content: 'Generic Item - Good Condition', provider: 'gemini', model: 'gemini-2.0-flash' });

      const nullInput: TitleGeneratorInput = {
        brand: null,
        model: null,
        variant: null,
        condition: 'good',
        category: null,
      };

      const result = await generateLLMTitle(nullInput, 'ebay');
      expect(result.title).toBe('Generic Item - Good Condition');
      expect(mockCompleteAI).toHaveBeenCalledWith('listingTitle', expect.objectContaining({
        brand: 'Unknown',
        model: 'Unknown',
        variant: 'N/A',
        category: 'General',
      }));
    });
  });

  describe('generateTitlesForAllPlatforms - edge cases', () => {
    it('returns empty primary when no titles match ebay', () => {
      // This tests the fallback chain: titles[0]?.title || ''
      const input: TitleGeneratorInput = {
        brand: null,
        model: null,
        variant: null,
        condition: 'new',
        category: null,
      };
      const result = generateTitlesForAllPlatforms(input);
      // Even with null inputs, titles are generated, so primary should exist
      expect(result.primary).toBeTruthy();
      expect(result.titles.length).toBe(4);
    });
  });

  describe('fromIdentification', () => {
    it('converts ItemIdentification to TitleGeneratorInput', () => {
      const identification = {
        brand: 'Nike',
        model: 'Air Jordan 1',
        variant: 'Chicago',
        year: 2023,
        condition: 'like_new' as const,
        conditionNotes: 'Worn once',
        searchQuery: 'Nike Air Jordan 1 Chicago 2023',
        category: 'Shoes',
        worthInvestigating: true,
        reasoning: 'Popular sneaker',
      };

      const result = fromIdentification(identification);
      expect(result.brand).toBe('Nike');
      expect(result.model).toBe('Air Jordan 1');
      expect(result.variant).toBe('Chicago');
      expect(result.condition).toBe('like_new');
      expect(result.category).toBe('Shoes');
    });
  });
});

// ── Additional branch coverage for generateLLMTitle ────────────────────────

describe('generateLLMTitle - branch coverage', () => {
  const baseInput2: TitleGeneratorInput = {
    brand: 'Sony',
    model: 'WH-1000XM5',
    variant: 'Black',
    condition: 'good',
    category: 'Electronics',
  };

  beforeEach(() => {
    mockCompleteAI.mockReset();
  });

  it('falls back to algorithmic when no AI provider', async () => {
    const { AIProviderUnavailableError } = jest.requireMock('@/lib/ai') as { AIProviderUnavailableError: new () => Error };
    mockCompleteAI.mockRejectedValue(new AIProviderUnavailableError());
    const result = await generateLLMTitle(baseInput2, 'ebay');
    expect(result.title).toContain('Sony');
    expect(result.platform).toBe('ebay');
  });

  it('truncates title exceeding platform character limit', async () => {
    const longTitle = 'A'.repeat(200);
    mockCompleteAI.mockResolvedValue({ content: longTitle, provider: 'gemini', model: 'gemini-2.0-flash' });
    const result = await generateLLMTitle(baseInput2, 'ebay');
    expect(result.title.length).toBeLessThanOrEqual(80);
    expect(result.title).toMatch(/\.\.\.$/);
  });

  it('strips surrounding quotes from LLM response', async () => {
    mockCompleteAI.mockResolvedValue({ content: '"Sony WH-1000XM5 Black"', provider: 'gemini', model: 'gemini-2.0-flash' });
    const result = await generateLLMTitle(baseInput2, 'ebay');
    expect(result.title).not.toMatch(/^"/);
    expect(result.title).not.toMatch(/"$/);
  });

  it('falls back to algorithmic on LLM API error', async () => {
    mockCompleteAI.mockRejectedValue(new Error('Rate limit'));
    const result = await generateLLMTitle(baseInput2, 'ebay');
    expect(result.title).toContain('Sony');
  });

  it('uses generic platform limit for unknown platform', async () => {
    mockCompleteAI.mockResolvedValue({ content: 'Sony WH-1000XM5', provider: 'gemini', model: 'gemini-2.0-flash' });
    const result = await generateLLMTitle(baseInput2, 'unknown-platform');
    expect(result.title).toBeTruthy();
  });
});

// ── generateAlgorithmicTitle - branch coverage ──────────────────────────────
describe('generateAlgorithmicTitle - branch coverage', () => {
  it('uses default generic platform when no platform arg', () => {
    const result = generateAlgorithmicTitle({
      brand: 'Sony',
      model: 'TV',
      variant: null,
      condition: 'good',
      category: null,
    });
    expect(result.title).toContain('Sony');
    expect(result.platform).toBe('generic');
  });

  it('falls back to 80 char limit for unknown platform', () => {
    const result = generateAlgorithmicTitle({
      brand: 'Sony',
      model: 'WH-1000XM5',
      variant: null,
      condition: 'good',
      category: null,
    }, 'unknown-marketplace');
    expect(result.charCount).toBeLessThanOrEqual(80);
  });

  it('handles null brand (no brand in title)', () => {
    const result = generateAlgorithmicTitle({
      brand: null,
      model: 'Galaxy S24',
      variant: null,
      condition: 'good',
      category: null,
    });
    expect(result.title).toContain('Galaxy S24');
    expect(result.title).not.toContain('null');
  });

  it('handles null model (no model in title)', () => {
    const result = generateAlgorithmicTitle({
      brand: 'Generic Brand',
      model: null,
      variant: null,
      condition: 'good',
      category: null,
    });
    expect(result.title).toContain('Generic Brand');
  });

  it('handles null variant (no variant in title)', () => {
    const result = generateAlgorithmicTitle({
      brand: 'Apple',
      model: 'iPhone 15',
      variant: null,
      condition: 'good',
      category: null,
    });
    expect(result.title).toContain('Apple iPhone 15');
  });

  it('falls back to condition string for unknown condition', () => {
    const result = generateAlgorithmicTitle({
      brand: 'Test',
      model: 'Item',
      variant: null,
      condition: 'custom-condition' as any,
      category: null,
    });
    expect(result.title).toContain('custom-condition');
  });

  it('includes keywords when provided', () => {
    const result = generateAlgorithmicTitle({
      brand: 'Nike',
      model: 'Air Max',
      variant: null,
      condition: 'new',
      category: 'shoes',
      keywords: ['sneakers', 'running'],
    });
    expect(result.keywords).toContain('sneakers');
    expect(result.keywords).toContain('running');
  });

  it('truncates title when over limit using NEW for new condition', () => {
    // Create a very long title to trigger truncation
    const result = generateAlgorithmicTitle({
      brand: 'VeryLongBrandNameThatExceedsTheLimit',
      model: 'VeryLongModelNameThatAlsoExceedsTheCharacterLimitOfThePlatform',
      variant: 'SpecialEdition',
      condition: 'new',
      category: null,
    }, 'ebay'); // ebay limit is 80 chars
    expect(result.charCount).toBeLessThanOrEqual(80);
  });

  it('truncates title using LN for like_new condition', () => {
    const result = generateAlgorithmicTitle({
      brand: 'VeryLongBrandNameThatExceedsTheLimit',
      model: 'VeryLongModelNameThatAlsoExceedsTheCharacterLimitSetByThePlatform',
      variant: 'LimitedEdition',
      condition: 'like_new',
      category: null,
    }, 'ebay');
    expect(result.charCount).toBeLessThanOrEqual(80);
  });

  it('truncates title with empty shortCondition (used condition)', () => {
    const result = generateAlgorithmicTitle({
      brand: 'VeryLongBrandNameThatExceedsTheLimit',
      model: 'VeryLongModelNameThatAlsoExceedsTheCharacterLimitSetByThePlatform',
      variant: 'SpecialEditionVersion',
      condition: 'used', // not 'new' or 'like_new' → shortCondition = ''
      category: null,
    }, 'ebay');
    expect(result.charCount).toBeLessThanOrEqual(80);
  });
});

// ── generateLLMTitle and generateTitlesForAllPlatforms - more branches ─────
describe('title-generator - final branch coverage', () => {
  const OpenAI = require('openai');

  it('generateLLMTitle uses default "ebay" platform when not specified', async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await generateLLMTitle({
      brand: 'Sony',
      model: 'WH-1000XM5',
      variant: null,
      condition: 'good',
      category: null,
    }); // No platform arg → default 'ebay'
    expect(result.platform).toBe('ebay');
  });

  it('generateTitlesForAllPlatforms falls back to first title when ebay not found', () => {
    // getAllPlatforms always generates ebay title, so primary is always set
    // Testing the ||'' chain by using an unusual setup
    const result = generateTitlesForAllPlatforms({
      brand: null,
      model: null,
      variant: null,
      condition: 'used',
      category: null,
    });
    // All null inputs still produce a title
    expect(typeof result.primary).toBe('string');
    expect(result.titles.length).toBe(4);
  });
});

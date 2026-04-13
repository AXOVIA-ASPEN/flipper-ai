// Tests for llm-identifier.ts
import { identifyItem, identifyItemsBatch } from '../lib/llm-identifier';

const mockCompleteAI = jest.fn();
jest.mock('@/lib/ai', () => ({
  completeAI: (...args: unknown[]) => mockCompleteAI(...args),
  AIProviderUnavailableError: class extends Error {
    constructor() { super('No AI provider available'); this.name = 'AIProviderUnavailableError'; }
  },
}));

const defaultResponse = {
  content: JSON.stringify({
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    variant: '256GB',
    year: 2022,
    condition: 'good',
    conditionNotes: 'Minor scratches on screen',
    searchQuery: 'Apple iPhone 14 Pro 256GB',
    category: 'cell phones',
    worthInvestigating: true,
    reasoning: 'High-demand smartphone with strong resale value',
  }),
  provider: 'gemini',
  model: 'gemini-2.0-flash',
};

describe('llm-identifier', () => {
  beforeEach(() => {
    mockCompleteAI.mockReset();
    mockCompleteAI.mockResolvedValue(defaultResponse);
  });

  describe('identifyItem', () => {
    it('returns null when no AI provider available', async () => {
      const { AIProviderUnavailableError } = jest.requireMock('@/lib/ai') as { AIProviderUnavailableError: new () => Error };
      mockCompleteAI.mockRejectedValue(new AIProviderUnavailableError());
      const result = await identifyItem('iPhone 14 Pro', 'Good condition', 200, 'electronics');
      expect(result).toBeNull();
    });

    it('returns identification when AI provider is available', async () => {
      const result = await identifyItem(
        'iPhone 14 Pro 256GB',
        'Minor scratches',
        200,
        'electronics'
      );
      expect(result).not.toBeNull();
      expect(result?.brand).toBe('Apple');
      expect(result?.model).toBe('iPhone 14 Pro');
      expect(result?.worthInvestigating).toBe(true);
      expect(result?.condition).toBe('good');
    });

    it('handles null description and category', async () => {
      const result = await identifyItem('iPhone 14 Pro', null, 200, null);
      expect(result).not.toBeNull();
      expect(result?.brand).toBe('Apple');
    });
  });

  describe('identifyItem edge cases', () => {
    it('returns null when LLM response has no JSON', async () => {
      mockCompleteAI.mockResolvedValue({ content: 'No JSON here, just text', provider: 'gemini', model: 'gemini-2.0-flash' });

      const result = await identifyItem('Test Item', null, 100, null);
      expect(result).toBeNull();
    });

    it('returns null when API call throws', async () => {
      mockCompleteAI.mockRejectedValue(new Error('API rate limited'));

      const result = await identifyItem('Test Item', null, 100, null);
      expect(result).toBeNull();
    });

    it('returns null when response content is empty', async () => {
      mockCompleteAI.mockResolvedValue({ content: '', provider: 'gemini', model: 'gemini-2.0-flash' });

      const result = await identifyItem('Test Item', null, 100, null);
      expect(result).toBeNull();
    });
  });

  describe('identifyItem field defaults', () => {
    it('handles missing optional fields in parsed JSON', async () => {
      mockCompleteAI.mockResolvedValue({
        content: JSON.stringify({
          brand: null,
          model: null,
          condition: 'unknown_condition',
          worthInvestigating: false,
        }),
        provider: 'gemini',
        model: 'gemini-2.0-flash',
      });

      const result = await identifyItem('Mystery Item', 'desc', 50, 'other');
      expect(result).not.toBeNull();
      expect(result?.brand).toBeNull();
      expect(result?.model).toBeNull();
      expect(result?.variant).toBeNull();
      expect(result?.year).toBeNull();
      expect(result?.condition).toBe('good'); // default for invalid condition
      expect(result?.conditionNotes).toBe('');
      expect(result?.searchQuery).toBe('Mystery Item'); // falls back to title
      expect(result?.reasoning).toBe('');
      expect(result?.worthInvestigating).toBe(false);
    });

    it('handles all valid condition values', async () => {
      for (const cond of ['new', 'like_new', 'good', 'fair', 'poor']) {
        mockCompleteAI.mockResolvedValue({
          content: JSON.stringify({ brand: 'Test', condition: cond, searchQuery: 'test', category: 'test' }),
          provider: 'gemini',
          model: 'gemini-2.0-flash',
        });
        const result = await identifyItem('Test', null, 100, null);
        expect(result?.condition).toBe(cond);
      }
    });

    it('handles condition with spaces (like new -> like_new)', async () => {
      mockCompleteAI.mockResolvedValue({
        content: JSON.stringify({ brand: 'Test', condition: 'like new', searchQuery: 'test' }),
        provider: 'gemini',
        model: 'gemini-2.0-flash',
      });
      const result = await identifyItem('Test', null, 100, null);
      expect(result?.condition).toBe('like_new');
    });

    it('handles year as string number', async () => {
      mockCompleteAI.mockResolvedValue({
        content: JSON.stringify({ brand: 'Sony', year: '2023', condition: 'good', searchQuery: 'Sony TV' }),
        provider: 'gemini',
        model: 'gemini-2.0-flash',
      });
      const result = await identifyItem('Sony TV', null, 300, null);
      expect(result?.year).toBe(2023);
    });

    it('handles markdown-wrapped JSON response', async () => {
      mockCompleteAI.mockResolvedValue({
        content: '```json\n{"brand":"Test","condition":"good","searchQuery":"test"}\n```',
        provider: 'gemini',
        model: 'gemini-2.0-flash',
      });
      const result = await identifyItem('Test', null, 100, null);
      expect(result).not.toBeNull();
      expect(result?.brand).toBe('Test');
    });
  });

  describe('identifyItemsBatch', () => {
    it('processes multiple listings', async () => {
      const listings = [
        { title: 'iPhone 14 Pro', description: null, askingPrice: 200, categoryHint: null },
        {
          title: 'Samsung TV 55',
          description: 'Like new',
          askingPrice: 150,
          categoryHint: 'electronics',
        },
      ];
      const results = await identifyItemsBatch(listings);
      expect(results).toHaveLength(2);
      expect(results[0]).not.toBeNull();
      expect(results[1]).not.toBeNull();
    });

    it('handles empty batch', async () => {
      const results = await identifyItemsBatch([]);
      expect(results).toHaveLength(0);
    });

    it('processes batches of more than 5 items with rate limiting', async () => {
      const listings = Array.from({ length: 7 }, (_, i) => ({
        title: `Item ${i}`,
        description: null,
        askingPrice: 100 + i * 10,
        categoryHint: null,
      }));
      const results = await identifyItemsBatch(listings);
      expect(results).toHaveLength(7);
      results.forEach((r) => expect(r).not.toBeNull());
    });
  });
});

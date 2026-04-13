/**
 * Unit tests for analyzeItemCompleteness() in src/lib/item-completeness-analyzer.ts
 * OpenAI client is mocked — no real API calls are made.
 */

const mockCompleteAI = jest.fn();

jest.mock('@/lib/ai', () => ({
  completeAI: (...args: unknown[]) => mockCompleteAI(...args),
  AIProviderUnavailableError: class extends Error {
    constructor() { super('No AI provider available'); this.name = 'AIProviderUnavailableError'; }
  },
}));

import { analyzeItemCompleteness } from '@/lib/item-completeness-analyzer';

const validResponse = {
  completenessLabel: 'Complete with box',
  hasOriginalPackaging: true,
  missingParts: [],
  cosmeticDamage: null,
  functionalDamage: null,
  analysisConfidence: 'high',
};

function makeAIResponse(content: string) {
  return { content, provider: 'openai' as const, model: 'gpt-4o' };
}

describe('analyzeItemCompleteness()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('early return — no images', () => {
    it('returns null and does not call OpenAI when imageUrls is empty', async () => {
      const result = await analyzeItemCompleteness([], 'iPhone 14', null, 'electronics');
      expect(result).toBeNull();
      expect(mockCompleteAI).not.toHaveBeenCalled();
    });
  });

  describe('successful analysis', () => {
    it('returns a valid CompletenessAnalysisResult on success', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify(validResponse)));

      const result = await analyzeItemCompleteness(
        ['https://example.com/img1.jpg'],
        'iPhone 14 Pro',
        'Good condition, original box included',
        'electronics'
      );

      expect(result).toMatchObject({
        completenessLabel: 'Complete with box',
        hasOriginalPackaging: true,
        missingParts: [],
        cosmeticDamage: null,
        functionalDamage: null,
        analysisConfidence: 'high',
      });
    });

    it('handles cosmetic and functional damage strings', async () => {
      const withDamage = {
        ...validResponse,
        cosmeticDamage: 'Screen scratches',
        functionalDamage: 'Battery drains fast',
      };
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify(withDamage)));

      const result = await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'MacBook Pro',
        null,
        'electronics'
      );

      expect(result?.cosmeticDamage).toBe('Screen scratches');
      expect(result?.functionalDamage).toBe('Battery drains fast');
    });

    it('filters non-string items from missingParts', async () => {
      const withMixed = { ...validResponse, missingParts: ['charger', 42, null, 'manual'] };
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify(withMixed)));

      const result = await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        null,
        'electronics'
      );

      expect(result?.missingParts).toEqual(['charger', 'manual']);
    });
  });

  describe('completeAI call parameters', () => {
    it('calls completeAI with itemCompleteness prompt name', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify(validResponse)));

      await analyzeItemCompleteness(['https://example.com/img.jpg'], 'Item', null, 'other');

      expect(mockCompleteAI).toHaveBeenCalledWith('itemCompleteness', expect.objectContaining({
        title: 'Item',
        category: 'other',
      }));
    });

    it('passes image URLs in context', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify(validResponse)));
      const imageUrls = ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'];

      await analyzeItemCompleteness(imageUrls, 'Item', null, 'electronics');

      expect(mockCompleteAI).toHaveBeenCalledWith('itemCompleteness', expect.objectContaining({
        imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      }));
    });

    it('limits images to 3 even when more are provided', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify(validResponse)));
      const manyUrls = ['u1', 'u2', 'u3', 'u4', 'u5'];

      await analyzeItemCompleteness(manyUrls, 'Item', null, 'electronics');

      expect(mockCompleteAI).toHaveBeenCalledWith('itemCompleteness', expect.objectContaining({
        imageUrls: ['u1', 'u2', 'u3'],
      }));
    });

    it('passes null description in context', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify(validResponse)));

      await analyzeItemCompleteness(['https://example.com/img.jpg'], 'Item', null, 'electronics');

      expect(mockCompleteAI).toHaveBeenCalledWith('itemCompleteness', expect.objectContaining({
        description: null,
      }));
    });

    it('passes description in context', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify(validResponse)));
      const longDescription = 'x'.repeat(600);

      await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        longDescription,
        'electronics'
      );

      expect(mockCompleteAI).toHaveBeenCalledWith('itemCompleteness', expect.objectContaining({
        description: longDescription,
      }));
    });
  });

  describe('error handling — returns null on all failure modes', () => {
    it('returns null when OpenAI throws an error', async () => {
      mockCompleteAI.mockRejectedValue(new Error('API failure'));

      const result = await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        null,
        'electronics'
      );

      expect(result).toBeNull();
    });

    it('returns null when response content is invalid JSON', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse('not valid json'));

      const result = await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        null,
        'electronics'
      );

      expect(result).toBeNull();
    });

    it('returns null when completenessLabel is not a string', async () => {
      const bad = { ...validResponse, completenessLabel: 42 };
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify(bad)));

      const result = await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        null,
        'electronics'
      );

      expect(result).toBeNull();
    });

    it('returns null when hasOriginalPackaging is not a boolean', async () => {
      const bad = { ...validResponse, hasOriginalPackaging: 'yes' };
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify(bad)));

      const result = await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        null,
        'electronics'
      );

      expect(result).toBeNull();
    });

    it('returns null when missingParts is not an array', async () => {
      const bad = { ...validResponse, missingParts: 'charger' };
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify(bad)));

      const result = await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        null,
        'electronics'
      );

      expect(result).toBeNull();
    });

    it('returns null when analysisConfidence is an invalid value', async () => {
      const bad = { ...validResponse, analysisConfidence: 'very_high' };
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify(bad)));

      const result = await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        null,
        'electronics'
      );

      expect(result).toBeNull();
    });

    it('returns null when response content is null (empty message)', async () => {
      mockCompleteAI.mockResolvedValue({ choices: [{ message: { content: null } }] });

      const result = await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        null,
        'electronics'
      );

      expect(result).toBeNull();
    });
  });
});

/**
 * Unit tests for analyzeItemCompleteness() in src/lib/item-completeness-analyzer.ts
 * OpenAI client is mocked — no real API calls are made.
 */

const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => mockCreate(...args),
      },
    },
  })),
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

function makeOpenAIResponse(content: string) {
  return { choices: [{ message: { content } }] };
}

describe('analyzeItemCompleteness()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('early return — no images', () => {
    it('returns null and does not call OpenAI when imageUrls is empty', async () => {
      const result = await analyzeItemCompleteness([], 'iPhone 14', null, 'electronics');
      expect(result).toBeNull();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('successful analysis', () => {
    it('returns a valid CompletenessAnalysisResult on success', async () => {
      mockCreate.mockResolvedValue(makeOpenAIResponse(JSON.stringify(validResponse)));

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
      mockCreate.mockResolvedValue(makeOpenAIResponse(JSON.stringify(withDamage)));

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
      mockCreate.mockResolvedValue(makeOpenAIResponse(JSON.stringify(withMixed)));

      const result = await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        null,
        'electronics'
      );

      expect(result?.missingParts).toEqual(['charger', 'manual']);
    });
  });

  describe('OpenAI call parameters', () => {
    it('calls OpenAI with correct model, response_format, and max_tokens', async () => {
      mockCreate.mockResolvedValue(makeOpenAIResponse(JSON.stringify(validResponse)));

      await analyzeItemCompleteness(['https://example.com/img.jpg'], 'Item', null, 'other');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          max_tokens: 500,
          response_format: { type: 'json_object' },
        })
      );
    });

    it('includes image URLs as image_url content parts', async () => {
      mockCreate.mockResolvedValue(makeOpenAIResponse(JSON.stringify(validResponse)));
      const imageUrls = ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'];

      await analyzeItemCompleteness(imageUrls, 'Item', null, 'electronics');

      const call = mockCreate.mock.calls[0][0];
      const content = call.messages[0].content;
      const imageBlocks = content.filter((c: { type: string }) => c.type === 'image_url');
      expect(imageBlocks).toHaveLength(2);
      expect(imageBlocks[0].image_url.url).toBe(imageUrls[0]);
      expect(imageBlocks[1].image_url.url).toBe(imageUrls[1]);
    });

    it('limits images to 3 even when more are provided', async () => {
      mockCreate.mockResolvedValue(makeOpenAIResponse(JSON.stringify(validResponse)));
      const manyUrls = ['u1', 'u2', 'u3', 'u4', 'u5'];

      await analyzeItemCompleteness(manyUrls, 'Item', null, 'electronics');

      const call = mockCreate.mock.calls[0][0];
      const imageBlocks = call.messages[0].content.filter(
        (c: { type: string }) => c.type === 'image_url'
      );
      expect(imageBlocks).toHaveLength(3);
    });

    it('uses "No description provided." when description is null', async () => {
      mockCreate.mockResolvedValue(makeOpenAIResponse(JSON.stringify(validResponse)));

      await analyzeItemCompleteness(['https://example.com/img.jpg'], 'Item', null, 'electronics');

      const call = mockCreate.mock.calls[0][0];
      const textBlock = call.messages[0].content.find(
        (c: { type: string }) => c.type === 'text'
      );
      expect(textBlock.text).toContain('No description provided.');
    });

    it('truncates description to 500 chars in the prompt', async () => {
      mockCreate.mockResolvedValue(makeOpenAIResponse(JSON.stringify(validResponse)));
      const longDescription = 'x'.repeat(600);

      await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        longDescription,
        'electronics'
      );

      const call = mockCreate.mock.calls[0][0];
      const textBlock = call.messages[0].content.find(
        (c: { type: string }) => c.type === 'text'
      );
      expect(textBlock.text).toContain('x'.repeat(500));
      expect(textBlock.text).not.toContain('x'.repeat(501));
    });
  });

  describe('error handling — returns null on all failure modes', () => {
    it('returns null when OpenAI throws an error', async () => {
      mockCreate.mockRejectedValue(new Error('API failure'));

      const result = await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        null,
        'electronics'
      );

      expect(result).toBeNull();
    });

    it('returns null when response content is invalid JSON', async () => {
      mockCreate.mockResolvedValue(makeOpenAIResponse('not valid json'));

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
      mockCreate.mockResolvedValue(makeOpenAIResponse(JSON.stringify(bad)));

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
      mockCreate.mockResolvedValue(makeOpenAIResponse(JSON.stringify(bad)));

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
      mockCreate.mockResolvedValue(makeOpenAIResponse(JSON.stringify(bad)));

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
      mockCreate.mockResolvedValue(makeOpenAIResponse(JSON.stringify(bad)));

      const result = await analyzeItemCompleteness(
        ['https://example.com/img.jpg'],
        'Item',
        null,
        'electronics'
      );

      expect(result).toBeNull();
    });

    it('returns null when response content is null (empty message)', async () => {
      mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });

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

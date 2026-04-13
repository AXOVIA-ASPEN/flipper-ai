/**
 * Unit tests for classifyItemLogistics() in src/lib/logistics-classifier.ts
 * Story 5.5: Logistics & Shipping Cost Analysis (FR-SCORE-21)
 */

const mockCompleteAI = jest.fn();

jest.mock('@/lib/ai', () => ({
  completeAI: (...args: unknown[]) => mockCompleteAI(...args),
  AIProviderUnavailableError: class extends Error {
    constructor() { super('No AI provider available'); this.name = 'AIProviderUnavailableError'; }
  },
}));

import { classifyItemLogistics } from '@/lib/logistics-classifier';

function makeAIResponse(data: object) {
  return { content: JSON.stringify(data), provider: 'gemini' as const, model: 'gemini-2.0-flash' };
}

const { AIProviderUnavailableError } = jest.requireMock('@/lib/ai') as {
  AIProviderUnavailableError: new () => Error;
};

describe('classifyItemLogistics()', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fallback path — no AI provider', () => {
    beforeEach(() => {
      mockCompleteAI.mockRejectedValue(new AIProviderUnavailableError());
    });
    it('returns small_shippable for electronics category', async () => {
      const result = await classifyItemLogistics('iPhone 13', null, 'electronics');
      expect(result.sizeCategory).toBe('small_shippable');
      expect(result.confidence).toBe('low');
      expect(result.estimatedWeightLbs).toBeGreaterThan(0);
      expect(result.estimatedDimensionsInches.length).toBeGreaterThan(0);
    });

    it('returns large_local_only for furniture category', async () => {
      const result = await classifyItemLogistics('Dining table', null, 'furniture');
      expect(result.sizeCategory).toBe('large_local_only');
      expect(result.confidence).toBe('low');
    });

    it('returns fragile_special_handling for musical category', async () => {
      const result = await classifyItemLogistics('Acoustic guitar', null, 'musical');
      expect(result.sizeCategory).toBe('fragile_special_handling');
      expect(result.confidence).toBe('low');
    });

    it('defaults to small_shippable for unknown category', async () => {
      const result = await classifyItemLogistics('Random item', 'some description', 'mystery');
      expect(result.sizeCategory).toBe('small_shippable');
    });

    it('includes classificationReasoning with fallback text', async () => {
      const result = await classifyItemLogistics('Widget', null, 'clothing');
      expect(result.classificationReasoning).toContain('Fallback');
    });

    it('returns appliances as large_local_only', async () => {
      const result = await classifyItemLogistics('Washing machine', null, 'appliances');
      expect(result.sizeCategory).toBe('large_local_only');
    });

    it('returns video games as small_shippable', async () => {
      const result = await classifyItemLogistics('PS5 controller', null, 'video games');
      expect(result.sizeCategory).toBe('small_shippable');
    });
  });

  describe('LLM path — with AI provider', () => {
    it('returns classification from LLM response', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse({
        sizeCategory: 'small_shippable',
        estimatedWeightLbs: 3.5,
        estimatedDimensionsInches: { length: 10, width: 8, height: 4 },
        classificationReasoning: 'Small electronics item',
        confidence: 'high',
      }));

      const result = await classifyItemLogistics('Camera lens', 'Canon 50mm', 'electronics');
      expect(result.sizeCategory).toBe('small_shippable');
      expect(result.estimatedWeightLbs).toBe(3.5);
      expect(result.confidence).toBe('high');
    });

    it('falls back gracefully when LLM throws', async () => {
      mockCompleteAI.mockRejectedValue(new Error('API error'));
      const result = await classifyItemLogistics('Camera', null, 'electronics');
      expect(result.sizeCategory).toBe('small_shippable');
      expect(result.confidence).toBe('low');
    });

    it('clamps estimatedWeightLbs to 200 when LLM returns huge value', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse({
        sizeCategory: 'large_local_only',
        estimatedWeightLbs: 9999,
        estimatedDimensionsInches: { length: 100, width: 50, height: 50 },
        classificationReasoning: 'Very heavy',
        confidence: 'high',
      }));

      const result = await classifyItemLogistics('Giant item', null, 'furniture');
      expect(result.estimatedWeightLbs).toBe(200);
    });

    it('coerces invalid sizeCategory to small_shippable', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse({
        sizeCategory: 'invalid_category',
        estimatedWeightLbs: 2,
        estimatedDimensionsInches: { length: 10, width: 8, height: 4 },
        classificationReasoning: 'Unknown',
        confidence: 'low',
      }));

      const result = await classifyItemLogistics('Item', null, 'other');
      expect(result.sizeCategory).toBe('small_shippable');
    });

    it('coerces invalid confidence to medium', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse({
        sizeCategory: 'small_shippable',
        estimatedWeightLbs: 2,
        estimatedDimensionsInches: { length: 10, width: 8, height: 4 },
        classificationReasoning: 'Test',
        confidence: 'super_high',
      }));

      const result = await classifyItemLogistics('Item', null, 'other');
      expect(result.confidence).toBe('medium');
    });

    it('defaults dimensions to minimum of 1 when missing from response', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse({
        sizeCategory: 'small_shippable',
        estimatedWeightLbs: 1,
        estimatedDimensionsInches: null,
        classificationReasoning: 'No dims',
        confidence: 'low',
      }));

      const result = await classifyItemLogistics('Item', null, 'other');
      expect(result.estimatedDimensionsInches.length).toBeGreaterThanOrEqual(1);
      expect(result.estimatedDimensionsInches.width).toBeGreaterThanOrEqual(1);
      expect(result.estimatedDimensionsInches.height).toBeGreaterThanOrEqual(1);
    });

    it('clamps estimatedWeightLbs to 0.1 minimum for sub-minimum values', async () => {
      // Use 0.05 — non-zero (won't trigger the || 5 fallback) but below the 0.1 minimum clamp
      mockCompleteAI.mockResolvedValue(makeAIResponse({
        sizeCategory: 'small_shippable',
        estimatedWeightLbs: 0.05,
        estimatedDimensionsInches: { length: 5, width: 3, height: 1 },
        classificationReasoning: 'Very light',
        confidence: 'high',
      }));

      const result = await classifyItemLogistics('Tiny item', null, 'electronics');
      expect(result.estimatedWeightLbs).toBe(0.1);
    });

    it('returns empty string for classificationReasoning when LLM omits it', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse({
        sizeCategory: 'small_shippable',
        estimatedWeightLbs: 2,
        estimatedDimensionsInches: { length: 8, width: 6, height: 3 },
        // classificationReasoning intentionally omitted — hits the || '' branch
        confidence: 'medium',
      }));

      const result = await classifyItemLogistics('Widget', 'A small widget', 'electronics');
      expect(result.classificationReasoning).toBe('');
    });

    it('falls back to weight default of 5 when LLM returns zero for estimatedWeightLbs', async () => {
      // 0 is falsy, so `Number(0) || 5` evaluates to 5
      mockCompleteAI.mockResolvedValue(makeAIResponse({
        sizeCategory: 'small_shippable',
        estimatedWeightLbs: 0,
        estimatedDimensionsInches: { length: 8, width: 6, height: 3 },
        classificationReasoning: 'Zero weight',
        confidence: 'low',
      }));

      const result = await classifyItemLogistics('Weightless thing', null, 'electronics');
      // 0 || 5 = 5, then Math.max(0.1, Math.min(200, 5)) = 5
      expect(result.estimatedWeightLbs).toBe(5);
    });

    it('falls back to category default when LLM returns null message content', async () => {
      // response.choices[0]?.message?.content is null — the `|| ''` branch — JSON.parse('') throws
      mockCompleteAI.mockResolvedValue({ choices: [{ message: { content: null } }] });

      const result = await classifyItemLogistics('Item', null, 'electronics');
      // Falls back to category-based classification since JSON.parse('') throws
      expect(result.sizeCategory).toBe('small_shippable');
      expect(result.confidence).toBe('low');
    });

    it('falls back when response choices array is empty', async () => {
      // Exercises the choices[0]?.message?.content optional-chain short-circuit when choices[0] is undefined
      mockCompleteAI.mockResolvedValue({ choices: [] });

      const result = await classifyItemLogistics('Item', null, 'electronics');
      // JSON.parse('') throws → fallback
      expect(result.sizeCategory).toBe('small_shippable');
      expect(result.confidence).toBe('low');
    });
  });
});

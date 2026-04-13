/**
 * @file src/__tests__/lib/ai/providers/openai.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Unit tests for the OpenAI provider adapter.
 *
 * @description
 * Tests isAvailable() based on OPENAI_API_KEY, complete() using standard
 * OpenAI chat completion API, JSON response format, and usage extraction.
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- Module mocks (must be declared before imports) ---

const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

// --- Imports ---

import { OpenAIProvider } from '@/lib/ai/providers/openai';
import type { AIMessage, ModelConfig } from '@/lib/ai/providers/types';

describe('OpenAIProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isAvailable()', () => {
    test('returns true when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = new OpenAIProvider();
      expect(provider.isAvailable()).toBe(true);
    });

    test('returns false when OPENAI_API_KEY is not set', () => {
      delete process.env.OPENAI_API_KEY;
      const provider = new OpenAIProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    test('returns false when OPENAI_API_KEY is empty', () => {
      process.env.OPENAI_API_KEY = '';
      const provider = new OpenAIProvider();
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('name', () => {
    test('is "openai"', () => {
      const provider = new OpenAIProvider();
      expect(provider.name).toBe('openai');
    });
  });

  describe('complete()', () => {
    const baseConfig: ModelConfig = {
      model: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 1024,
    };

    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'sk-test';
    });

    test('sends messages and returns response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Hello from OpenAI' } }],
        model: 'gpt-4o',
        usage: { prompt_tokens: 15, completion_tokens: 8 },
      });

      const messages: AIMessage[] = [
        { role: 'system', content: 'Be helpful' },
        { role: 'user', content: 'Hello' },
      ];

      const provider = new OpenAIProvider();
      const result = await provider.complete(messages, baseConfig);

      expect(result.content).toBe('Hello from OpenAI');
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4o');
      expect(result.usage).toEqual({
        promptTokens: 15,
        completionTokens: 8,
      });
    });

    test('passes correct parameters to chat.completions.create', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'response' } }],
        model: 'gpt-4o',
        usage: { prompt_tokens: 5, completion_tokens: 3 },
      });

      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const provider = new OpenAIProvider();
      await provider.complete(messages, baseConfig);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      );
    });

    test('uses JSON response format when configured', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"key":"value"}' } }],
        model: 'gpt-4o',
        usage: { prompt_tokens: 5, completion_tokens: 3 },
      });

      const messages: AIMessage[] = [{ role: 'user', content: 'Give JSON' }];
      const jsonConfig: ModelConfig = { ...baseConfig, responseFormat: 'json' };

      const provider = new OpenAIProvider();
      await provider.complete(messages, jsonConfig);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: 'json_object' },
        }),
      );
    });

    test('does not include response_format for text mode', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'response' } }],
        model: 'gpt-4o',
        usage: { prompt_tokens: 5, completion_tokens: 3 },
      });

      const messages: AIMessage[] = [{ role: 'user', content: 'Hello' }];
      const provider = new OpenAIProvider();
      await provider.complete(messages, baseConfig);

      const callArgs = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArgs.response_format).toBeUndefined();
    });

    test('handles missing usage gracefully', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'response' } }],
        model: 'gpt-4o',
        usage: undefined,
      });

      const messages: AIMessage[] = [{ role: 'user', content: 'Hello' }];
      const provider = new OpenAIProvider();
      const result = await provider.complete(messages, baseConfig);

      expect(result.usage).toBeUndefined();
    });
  });
});

/**
 * @file src/__tests__/lib/ai/providers/groq.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Unit tests for the Groq AI provider adapter.
 *
 * @description
 * Tests isAvailable() based on GROQ_API_KEY, complete() using the
 * OpenAI-compatible API with Groq's base URL, JSON response format,
 * and usage extraction.
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

import { GroqProvider } from '@/lib/ai/providers/groq';
import type { AIMessage, ModelConfig } from '@/lib/ai/providers/types';
import OpenAI from 'openai';

describe('GroqProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isAvailable()', () => {
    test('returns true when GROQ_API_KEY is set', () => {
      process.env.GROQ_API_KEY = 'gsk_test';
      const provider = new GroqProvider();
      expect(provider.isAvailable()).toBe(true);
    });

    test('returns false when GROQ_API_KEY is not set', () => {
      delete process.env.GROQ_API_KEY;
      const provider = new GroqProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    test('returns false when GROQ_API_KEY is empty', () => {
      process.env.GROQ_API_KEY = '';
      const provider = new GroqProvider();
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('name', () => {
    test('is "groq"', () => {
      const provider = new GroqProvider();
      expect(provider.name).toBe('groq');
    });
  });

  describe('complete()', () => {
    const baseConfig: ModelConfig = {
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      maxTokens: 1024,
    };

    beforeEach(() => {
      process.env.GROQ_API_KEY = 'gsk_test';
    });

    test('creates OpenAI client with Groq base URL', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'response' } }],
        model: 'llama-3.3-70b-versatile',
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      const messages: AIMessage[] = [{ role: 'user', content: 'Hello' }];
      const provider = new GroqProvider();
      await provider.complete(messages, baseConfig);

      expect(OpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.groq.com/openai/v1',
          apiKey: 'gsk_test',
        }),
      );
    });

    test('sends messages and returns response', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Hello from Groq' } }],
        model: 'llama-3.3-70b-versatile',
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      const messages: AIMessage[] = [
        { role: 'system', content: 'Be helpful' },
        { role: 'user', content: 'Hello' },
      ];

      const provider = new GroqProvider();
      const result = await provider.complete(messages, baseConfig);

      expect(result.content).toBe('Hello from Groq');
      expect(result.provider).toBe('groq');
      expect(result.model).toBe('llama-3.3-70b-versatile');
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
      });
    });

    test('passes messages in OpenAI format', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'response' } }],
        model: 'llama-3.3-70b-versatile',
        usage: { prompt_tokens: 5, completion_tokens: 3 },
      });

      const messages: AIMessage[] = [
        { role: 'system', content: 'Be helpful' },
        { role: 'user', content: 'Hello' },
      ];

      const provider = new GroqProvider();
      await provider.complete(messages, baseConfig);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Be helpful' },
            { role: 'user', content: 'Hello' },
          ],
          temperature: 0.3,
          max_tokens: 1024,
        }),
      );
    });

    test('uses JSON response format when configured', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"key":"value"}' } }],
        model: 'llama-3.3-70b-versatile',
        usage: { prompt_tokens: 5, completion_tokens: 3 },
      });

      const messages: AIMessage[] = [{ role: 'user', content: 'Give JSON' }];
      const jsonConfig: ModelConfig = { ...baseConfig, responseFormat: 'json' };

      const provider = new GroqProvider();
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
        model: 'llama-3.3-70b-versatile',
        usage: { prompt_tokens: 5, completion_tokens: 3 },
      });

      const messages: AIMessage[] = [{ role: 'user', content: 'Hello' }];

      const provider = new GroqProvider();
      await provider.complete(messages, baseConfig);

      const callArgs = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArgs.response_format).toBeUndefined();
    });

    test('handles missing usage gracefully', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'response' } }],
        model: 'llama-3.3-70b-versatile',
        usage: undefined,
      });

      const messages: AIMessage[] = [{ role: 'user', content: 'Hello' }];
      const provider = new GroqProvider();
      const result = await provider.complete(messages, baseConfig);

      expect(result.usage).toBeUndefined();
    });
  });
});

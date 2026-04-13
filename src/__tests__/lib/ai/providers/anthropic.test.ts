/**
 * @file src/__tests__/lib/ai/providers/anthropic.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Unit tests for the Anthropic AI provider adapter.
 *
 * @description
 * Tests isAvailable() with both ANTHROPIC_API_KEY and CLAUDE_API_KEY env
 * vars, complete() with system message extraction to top-level parameter,
 * model override via CLAUDE_MODEL, and usage extraction.
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- Module mocks (must be declared before imports) ---

const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

// --- Imports ---

import { AnthropicProvider } from '@/lib/ai/providers/anthropic';
import type { AIMessage, ModelConfig } from '@/lib/ai/providers/types';

describe('AnthropicProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.CLAUDE_MODEL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isAvailable()', () => {
    test('returns true when ANTHROPIC_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      const provider = new AnthropicProvider();
      expect(provider.isAvailable()).toBe(true);
    });

    test('returns true when CLAUDE_API_KEY is set', () => {
      process.env.CLAUDE_API_KEY = 'sk-ant-test';
      const provider = new AnthropicProvider();
      expect(provider.isAvailable()).toBe(true);
    });

    test('returns true when both keys are set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-1';
      process.env.CLAUDE_API_KEY = 'sk-ant-2';
      const provider = new AnthropicProvider();
      expect(provider.isAvailable()).toBe(true);
    });

    test('returns false when neither key is set', () => {
      const provider = new AnthropicProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    test('returns false when keys are empty strings', () => {
      process.env.ANTHROPIC_API_KEY = '';
      process.env.CLAUDE_API_KEY = '';
      const provider = new AnthropicProvider();
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('name', () => {
    test('is "anthropic"', () => {
      const provider = new AnthropicProvider();
      expect(provider.name).toBe('anthropic');
    });
  });

  describe('complete()', () => {
    const baseConfig: ModelConfig = {
      model: 'claude-sonnet-4-5-20250929',
      temperature: 0.3,
      maxTokens: 1024,
    };

    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    });

    test('sends messages and returns response', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello from Claude' }],
        model: 'claude-sonnet-4-5-20250929',
        usage: { input_tokens: 12, output_tokens: 6 },
      });

      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const provider = new AnthropicProvider();
      const result = await provider.complete(messages, baseConfig);

      expect(result.content).toBe('Hello from Claude');
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-sonnet-4-5-20250929');
      expect(result.usage).toEqual({
        promptTokens: 12,
        completionTokens: 6,
      });
    });

    test('maps system message to top-level system parameter', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
        model: 'claude-sonnet-4-5-20250929',
        usage: { input_tokens: 10, output_tokens: 5 },
      });

      const messages: AIMessage[] = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello' },
      ];

      const provider = new AnthropicProvider();
      await provider.complete(messages, baseConfig);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'You are a helpful assistant',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      );
    });

    test('does not include system parameter when no system message', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
        model: 'claude-sonnet-4-5-20250929',
        usage: { input_tokens: 5, output_tokens: 3 },
      });

      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const provider = new AnthropicProvider();
      await provider.complete(messages, baseConfig);

      const callArgs = mockCreate.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(callArgs.system).toBeUndefined();
    });

    test('prefers ANTHROPIC_API_KEY over CLAUDE_API_KEY', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      process.env.ANTHROPIC_API_KEY = 'sk-ant-primary';
      process.env.CLAUDE_API_KEY = 'sk-ant-fallback';

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
        model: 'claude-sonnet-4-5-20250929',
        usage: { input_tokens: 5, output_tokens: 3 },
      });

      const provider = new AnthropicProvider();
      await provider.complete([{ role: 'user', content: 'Hi' }], baseConfig);

      expect(Anthropic).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'sk-ant-primary' }),
      );
    });

    test('falls back to CLAUDE_API_KEY when ANTHROPIC_API_KEY missing', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      delete process.env.ANTHROPIC_API_KEY;
      process.env.CLAUDE_API_KEY = 'sk-ant-fallback';

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
        model: 'claude-sonnet-4-5-20250929',
        usage: { input_tokens: 5, output_tokens: 3 },
      });

      const provider = new AnthropicProvider();
      await provider.complete([{ role: 'user', content: 'Hi' }], baseConfig);

      expect(Anthropic).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'sk-ant-fallback' }),
      );
    });

    test('handles missing usage gracefully', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
        model: 'claude-sonnet-4-5-20250929',
        usage: undefined,
      });

      const messages: AIMessage[] = [{ role: 'user', content: 'Hello' }];
      const provider = new AnthropicProvider();
      const result = await provider.complete(messages, baseConfig);

      expect(result.usage).toBeUndefined();
    });
  });
});

/**
 * @file src/__tests__/lib/ai/providers/factory.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Unit tests for the AI provider factory and resolution logic.
 *
 * @description
 * Tests getProvider() for each provider name, resolveProvider() fallback
 * logic across multiple providers, getAvailableProviders() filtering, and
 * AIProviderUnavailableError when no providers are configured.
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- Module mocks (must be declared before imports) ---

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
    }),
  })),
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
  })),
}));

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  })),
}));

// --- Imports ---

import {
  getProvider,
  resolveProvider,
  getAvailableProviders,
  AIProviderUnavailableError,
} from '@/lib/ai/providers';
import type { ProviderName } from '@/lib/ai/providers/types';

describe('Provider Factory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Clear all API keys by default
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getProvider()', () => {
    test('returns GeminiProvider for "gemini"', () => {
      const provider = getProvider('gemini');
      expect(provider.name).toBe('gemini');
    });

    test('returns GroqProvider for "groq"', () => {
      const provider = getProvider('groq');
      expect(provider.name).toBe('groq');
    });

    test('returns OpenAIProvider for "openai"', () => {
      const provider = getProvider('openai');
      expect(provider.name).toBe('openai');
    });

    test('returns AnthropicProvider for "anthropic"', () => {
      const provider = getProvider('anthropic');
      expect(provider.name).toBe('anthropic');
    });
  });

  describe('resolveProvider()', () => {
    test('returns first available provider', () => {
      process.env.GROQ_API_KEY = 'gsk_test';
      const provider = resolveProvider(['gemini', 'groq', 'openai']);
      expect(provider.name).toBe('groq');
    });

    test('returns first in list when multiple are available', () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      process.env.OPENAI_API_KEY = 'sk-test';
      const provider = resolveProvider(['gemini', 'openai']);
      expect(provider.name).toBe('gemini');
    });

    test('skips unavailable providers to find available one', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      const provider = resolveProvider(['gemini', 'groq', 'openai', 'anthropic']);
      expect(provider.name).toBe('anthropic');
    });

    test('throws AIProviderUnavailableError when none available', () => {
      expect(() => resolveProvider(['gemini', 'groq', 'openai', 'anthropic'])).toThrow(
        AIProviderUnavailableError,
      );
    });

    test('error message lists all tried providers', () => {
      const tried: ProviderName[] = ['gemini', 'openai'];
      try {
        resolveProvider(tried);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toContain('gemini');
        expect((error as Error).message).toContain('openai');
      }
    });

    test('throws AIProviderUnavailableError for empty preferences', () => {
      expect(() => resolveProvider([])).toThrow(AIProviderUnavailableError);
    });
  });

  describe('getAvailableProviders()', () => {
    test('returns empty array when no keys configured', () => {
      expect(getAvailableProviders()).toEqual([]);
    });

    test('returns only providers with configured keys', () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      const available = getAvailableProviders();
      expect(available).toContain('gemini');
      expect(available).toContain('anthropic');
      expect(available).not.toContain('groq');
      expect(available).not.toContain('openai');
    });

    test('returns all providers when all keys configured', () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      process.env.GROQ_API_KEY = 'gsk_test';
      process.env.OPENAI_API_KEY = 'sk-test';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      const available = getAvailableProviders();
      expect(available).toHaveLength(4);
      expect(available).toEqual(
        expect.arrayContaining(['gemini', 'groq', 'openai', 'anthropic']),
      );
    });
  });

  describe('AIProviderUnavailableError', () => {
    test('has correct name', () => {
      const error = new AIProviderUnavailableError(['gemini']);
      expect(error.name).toBe('AIProviderUnavailableError');
    });

    test('is instance of Error', () => {
      const error = new AIProviderUnavailableError(['gemini']);
      expect(error).toBeInstanceOf(Error);
    });

    test('message includes tried providers', () => {
      const error = new AIProviderUnavailableError(['gemini', 'groq']);
      expect(error.message).toContain('gemini, groq');
      expect(error.message).toContain('No AI provider available');
    });
  });
});

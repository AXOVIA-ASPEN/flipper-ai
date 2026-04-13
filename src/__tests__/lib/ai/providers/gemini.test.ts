/**
 * @file src/__tests__/lib/ai/providers/gemini.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Unit tests for the Gemini AI provider adapter.
 *
 * @description
 * Tests isAvailable() based on GOOGLE_API_KEY, complete() with message
 * mapping (system → systemInstruction, assistant → model role), JSON
 * response format, and usage metadata extraction.
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// --- Module mocks (must be declared before imports) ---

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// --- Imports ---

import { GeminiProvider } from '@/lib/ai/providers/gemini';
import type { AIMessage, ModelConfig } from '@/lib/ai/providers/types';

describe('GeminiProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isAvailable()', () => {
    test('returns true when GOOGLE_API_KEY is set', () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const provider = new GeminiProvider();
      expect(provider.isAvailable()).toBe(true);
    });

    test('returns false when GOOGLE_API_KEY is not set', () => {
      delete process.env.GOOGLE_API_KEY;
      const provider = new GeminiProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    test('returns false when GOOGLE_API_KEY is empty string', () => {
      process.env.GOOGLE_API_KEY = '';
      const provider = new GeminiProvider();
      expect(provider.isAvailable()).toBe(false);
    });
  });

  describe('name', () => {
    test('is "gemini"', () => {
      const provider = new GeminiProvider();
      expect(provider.name).toBe('gemini');
    });
  });

  describe('complete()', () => {
    const baseConfig: ModelConfig = {
      model: 'gemini-2.0-flash',
      temperature: 0.3,
      maxTokens: 1024,
    };

    beforeEach(() => {
      process.env.GOOGLE_API_KEY = 'test-key';
    });

    test('sends messages and returns response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Hello from Gemini',
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
          },
        },
      });

      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const provider = new GeminiProvider();
      const result = await provider.complete(messages, baseConfig);

      expect(result.content).toBe('Hello from Gemini');
      expect(result.provider).toBe('gemini');
      expect(result.model).toBe('gemini-2.0-flash');
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
      });
    });

    test('maps system message to systemInstruction', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockGetModel = GoogleGenerativeAI.mock.results[0]?.value?.getGenerativeModel
        ?? jest.fn().mockReturnValue({ generateContent: mockGenerateContent });

      // Reset to capture the call
      GoogleGenerativeAI.mockClear();
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: mockGetModel,
      }));

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'response',
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
        },
      });

      const messages: AIMessage[] = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ];

      const provider = new GeminiProvider();
      await provider.complete(messages, baseConfig);

      // Verify getGenerativeModel was called with systemInstruction
      expect(mockGetModel).toHaveBeenCalledWith(
        expect.objectContaining({
          systemInstruction: 'You are helpful',
        }),
      );
    });

    test('maps assistant role to model role in contents', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'response',
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
        },
      });

      const messages: AIMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: 'How are you?' },
      ];

      const provider = new GeminiProvider();
      await provider.complete(messages, baseConfig);

      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [
          { role: 'user', parts: [{ text: 'Hello' }] },
          { role: 'model', parts: [{ text: 'Hi there' }] },
          { role: 'user', parts: [{ text: 'How are you?' }] },
        ],
      });
    });

    test('uses JSON response format when configured', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockGetModel = jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      });
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: mockGetModel,
      }));

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '{"key": "value"}',
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 3 },
        },
      });

      const messages: AIMessage[] = [{ role: 'user', content: 'Give JSON' }];
      const jsonConfig: ModelConfig = { ...baseConfig, responseFormat: 'json' };

      const provider = new GeminiProvider();
      await provider.complete(messages, jsonConfig);

      expect(mockGetModel).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({
            responseMimeType: 'application/json',
          }),
        }),
      );
    });

    test('handles missing usage metadata gracefully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'response',
          usageMetadata: undefined,
        },
      });

      const messages: AIMessage[] = [{ role: 'user', content: 'Hello' }];
      const provider = new GeminiProvider();
      const result = await provider.complete(messages, baseConfig);

      expect(result.usage).toBeUndefined();
    });
  });
});

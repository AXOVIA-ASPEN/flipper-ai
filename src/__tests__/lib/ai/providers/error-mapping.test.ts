/**
 * @file src/__tests__/lib/ai/providers/error-mapping.test.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-16
 * @version 1.0
 * @brief Tests for mapSdkError() and assertJsonParseable() helpers.
 *
 * @description
 * Verifies that SDK-specific error shapes from OpenAI, Anthropic, Gemini, and
 * generic network errors are correctly mapped into the typed AIProviderError
 * hierarchy. Also tests JSON validation at the adapter boundary.
 */

import { mapSdkError, assertJsonParseable } from '@/lib/ai/providers/error-mapping';
import {
  AIProviderError,
  AIRateLimitError,
  AITimeoutError,
  AIMalformedResponseError,
} from '@/lib/ai/providers/errors';

describe('mapSdkError', () => {
  it('maps HTTP 429 to AIRateLimitError', () => {
    const sdkError = { status: 429, message: 'Rate limit exceeded' };
    const result = mapSdkError(sdkError, 'openai');
    expect(result).toBeInstanceOf(AIRateLimitError);
    expect(result.provider).toBe('openai');
  });

  it('parses retry-after header from 429 error (object headers)', () => {
    const sdkError = {
      status: 429,
      message: 'Too many requests',
      headers: { 'retry-after': '5' },
    };
    const result = mapSdkError(sdkError, 'gemini') as AIRateLimitError;
    expect(result).toBeInstanceOf(AIRateLimitError);
    expect(result.retryAfterMs).toBe(5000);
  });

  it('parses retry-after header using .get() method', () => {
    const sdkError = {
      status: 429,
      message: 'Rate limited',
      headers: { get: (key: string) => (key === 'retry-after' ? '10' : null) },
    };
    const result = mapSdkError(sdkError, 'anthropic') as AIRateLimitError;
    expect(result.retryAfterMs).toBe(10000);
  });

  it('maps "rate limit" in message to AIRateLimitError (no status)', () => {
    const sdkError = { message: 'You exceeded the rate limit' };
    const result = mapSdkError(sdkError, 'groq');
    expect(result).toBeInstanceOf(AIRateLimitError);
  });

  it('maps "quota" in message to AIRateLimitError', () => {
    const sdkError = { message: 'Quota exceeded for model' };
    const result = mapSdkError(sdkError, 'gemini');
    expect(result).toBeInstanceOf(AIRateLimitError);
  });

  it('maps ECONNREFUSED to AITimeoutError', () => {
    const sdkError = { code: 'ECONNREFUSED', message: 'Connection refused' };
    const result = mapSdkError(sdkError, 'openai');
    expect(result).toBeInstanceOf(AITimeoutError);
    expect(result.provider).toBe('openai');
  });

  it('maps ETIMEDOUT to AITimeoutError', () => {
    const sdkError = { code: 'ETIMEDOUT', message: 'Timed out' };
    const result = mapSdkError(sdkError, 'groq');
    expect(result).toBeInstanceOf(AITimeoutError);
  });

  it('maps AbortError name to AITimeoutError', () => {
    const sdkError = { name: 'AbortError', message: 'Request aborted' };
    const result = mapSdkError(sdkError, 'anthropic');
    expect(result).toBeInstanceOf(AITimeoutError);
  });

  it('maps "fetch failed" message to AITimeoutError', () => {
    const sdkError = { message: 'fetch failed: network error' };
    const result = mapSdkError(sdkError, 'gemini');
    expect(result).toBeInstanceOf(AITimeoutError);
  });

  it('maps unknown errors to generic AIProviderError', () => {
    const sdkError = { status: 500, message: 'Internal server error' };
    const result = mapSdkError(sdkError, 'openai');
    expect(result).toBeInstanceOf(AIProviderError);
    expect(result).not.toBeInstanceOf(AIRateLimitError);
    expect(result).not.toBeInstanceOf(AITimeoutError);
  });

  it('passes through existing AIProviderError without re-wrapping', () => {
    const original = new AIRateLimitError('already mapped', 'groq');
    const result = mapSdkError(original, 'groq');
    expect(result).toBe(original); // same instance
  });

  it('preserves cause from original error', () => {
    const sdkError = { status: 429, message: 'rate limited' };
    const result = mapSdkError(sdkError, 'openai');
    expect(result.cause).toBe(sdkError);
  });
});

describe('assertJsonParseable', () => {
  it('does nothing for text responseFormat', () => {
    expect(() => assertJsonParseable('not json', 'openai', 'text')).not.toThrow();
  });

  it('does nothing for undefined responseFormat', () => {
    expect(() => assertJsonParseable('not json', 'openai', undefined)).not.toThrow();
  });

  it('does nothing for valid JSON when responseFormat is json', () => {
    expect(() => assertJsonParseable('{"valid": true}', 'openai', 'json')).not.toThrow();
  });

  it('throws AIMalformedResponseError for invalid JSON when responseFormat is json', () => {
    expect(() => assertJsonParseable('not valid json', 'gemini', 'json')).toThrow(
      AIMalformedResponseError,
    );
  });

  it('throws AIMalformedResponseError for empty string when json requested', () => {
    expect(() => assertJsonParseable('', 'anthropic', 'json')).toThrow(AIMalformedResponseError);
  });

  it('includes raw content in AIMalformedResponseError', () => {
    try {
      assertJsonParseable('bad{json', 'groq', 'json');
      fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AIMalformedResponseError);
      expect((err as AIMalformedResponseError).rawContent).toBe('bad{json');
      expect((err as AIMalformedResponseError).provider).toBe('groq');
    }
  });
});

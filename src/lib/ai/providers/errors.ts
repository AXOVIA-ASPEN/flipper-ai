/**
 * @file src/lib/ai/providers/errors.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-16
 * @version 1.0
 * @brief Error taxonomy for the AI provider layer.
 *
 * @description
 * Defines typed errors that provider adapters throw so that completeAI() can
 * distinguish retryable-on-same-provider (rate-limit, timeout) from fallback-
 * to-next-provider (malformed response, generic failure) from fatal-propagate
 * (non-AI errors like buggy prompt builders).
 */

import type { ProviderName } from './types';

/**
 * Base class for all AI-provider errors. Catching `AIProviderError` covers
 * every subclass (rate limit, timeout, malformed response, generic).
 */
export class AIProviderError extends Error {
  readonly provider: ProviderName;
  readonly cause?: unknown;

  constructor(message: string, provider: ProviderName, cause?: unknown) {
    super(message);
    this.name = 'AIProviderError';
    this.provider = provider;
    this.cause = cause;
  }
}

/**
 * 429 / quota errors. Optional `retryAfterMs` honors provider Retry-After header.
 */
export class AIRateLimitError extends AIProviderError {
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    provider: ProviderName,
    retryAfterMs?: number,
    cause?: unknown
  ) {
    super(message, provider, cause);
    this.name = 'AIRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Network / timeout / DNS / socket errors reaching the provider.
 */
export class AITimeoutError extends AIProviderError {
  constructor(message: string, provider: ProviderName, cause?: unknown) {
    super(message, provider, cause);
    this.name = 'AITimeoutError';
  }
}

/**
 * Provider returned a 2xx response but the body was not valid JSON
 * (only raised when prompt config requested JSON mode).
 */
export class AIMalformedResponseError extends AIProviderError {
  readonly rawContent: string;

  constructor(
    message: string,
    provider: ProviderName,
    rawContent: string,
    cause?: unknown
  ) {
    super(message, provider, cause);
    this.name = 'AIMalformedResponseError';
    this.rawContent = rawContent;
  }
}

/**
 * Thrown by resolveProvider/completeAI when no provider in the preference
 * chain is configured/available.
 */
export class AIProviderUnavailableError extends Error {
  constructor(tried: ProviderName[]) {
    super(
      `No AI provider available. Tried: ${tried.join(', ')}. Configure at least one API key.`
    );
    this.name = 'AIProviderUnavailableError';
  }
}

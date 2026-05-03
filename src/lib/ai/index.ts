/**
 * @file src/lib/ai/index.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Public entry point for all AI operations in Flipper.ai.
 *
 * @description
 * Exports completeAI(), the single function consumers call for any AI task.
 * It looks up a prompt config by name, resolves the best available provider
 * from the preference chain, builds the system + user message array, and
 * delegates to the provider's complete() method. Re-exports key types and
 * utilities so consumers only need `import { completeAI } from '@/lib/ai'`.
 */

import { getPrompt } from './prompts';
import {
  getProvider,
  AIProviderUnavailableError,
  AIProviderError,
  AIRateLimitError,
  AITimeoutError,
} from './providers';
import type { AIResponse, AIProvider, AIMessage, ModelConfig, ProviderName } from './providers/types';

// Re-exports for consumers
export {
  AIProviderUnavailableError,
  AIProviderError,
  AIRateLimitError,
  AITimeoutError,
  AIMalformedResponseError,
  getAvailableProviders,
} from './providers';
export type { AIResponse } from './providers/types';
export type { PromptConfig } from './prompts/types';
export type { ProviderName } from './providers/types';

const MAX_ATTEMPTS_PER_PROVIDER = 3;
const BASE_BACKOFF_MS = 500;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls provider.complete() with exponential backoff on retryable errors.
 * Only AIRateLimitError and AITimeoutError are retried on the same provider.
 * Honors retryAfterMs from AIRateLimitError when present.
 *
 * Exported for testing; consumers should use completeAI().
 */
export async function callWithRetry(
  provider: AIProvider,
  messages: AIMessage[],
  config: ModelConfig,
  maxAttempts: number = MAX_ATTEMPTS_PER_PROVIDER,
): Promise<AIResponse> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await provider.complete(messages, config);
    } catch (err) {
      lastError = err;
      const isRetryable = err instanceof AIRateLimitError || err instanceof AITimeoutError;
      if (!isRetryable || attempt >= maxAttempts) {
        throw err;
      }
      const delayMs =
        err instanceof AIRateLimitError && typeof err.retryAfterMs === 'number'
          ? err.retryAfterMs
          : BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      await sleep(delayMs);
    }
  }
  // Unreachable — loop always either returns or throws on the final attempt
  throw lastError;
}

/**
 * Single entry point for all AI operations.
 *
 * Resolves a prompt config by task name, then walks the provider preference
 * chain. For each configured provider it retries transient failures (rate
 * limit / timeout) up to MAX_ATTEMPTS_PER_PROVIDER times. If the provider
 * returns a permanent AI-level error (malformed JSON, generic failure) OR
 * runs out of retries on a transient error, falls back to the next provider.
 * Non-AI errors (e.g. a TypeError thrown by a buggy prompt builder) are NOT
 * swallowed — they propagate immediately.
 *
 * @param taskName - Registered prompt name (e.g. 'flipAnalysis', 'listingTitle')
 * @param context  - Runtime data interpolated into the user prompt template
 * @returns The provider's AIResponse (content, model, provider, usage)
 *
 * @throws {Error} If taskName is not a registered prompt
 * @throws {AIProviderUnavailableError} If no provider in the chain is available
 * @throws {AIProviderError} If every provider in the chain failed at runtime
 */
export async function completeAI(
  taskName: string,
  context: Record<string, unknown>,
): Promise<AIResponse> {
  const prompt = getPrompt(taskName);
  const providerNames: ProviderName[] = [prompt.provider, ...prompt.fallbacks];

  const messages: AIMessage[] = [
    ...(prompt.systemPrompt
      ? [{ role: 'system' as const, content: prompt.systemPrompt }]
      : []),
    { role: 'user' as const, content: prompt.buildUserPrompt(context) },
  ];

  const config: ModelConfig = {
    model: prompt.model,
    temperature: prompt.temperature,
    maxTokens: prompt.maxTokens,
    responseFormat: prompt.responseFormat,
  };

  const attempted: ProviderName[] = [];
  let lastError: unknown;

  for (const name of providerNames) {
    const provider = getProvider(name);
    if (!provider.isAvailable()) continue;
    attempted.push(name);

    try {
      return await callWithRetry(provider, messages, config);
    } catch (err) {
      lastError = err;
      // Fall through to the next provider for any AI-level error
      // (rate limit exhausted, timeout exhausted, malformed, generic).
      if (err instanceof AIProviderError) continue;
      // Anything else (e.g. bug in buildUserPrompt) is not the provider's
      // fault — bubble up immediately so consumers see the real cause.
      throw err;
    }
  }

  if (attempted.length === 0) {
    throw new AIProviderUnavailableError(providerNames);
  }
  throw lastError;
}


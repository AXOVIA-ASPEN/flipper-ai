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

  // Test/CI escape hatch: when E2E_AI_STUB=1 is set the router returns a
  // deterministic stub response instead of dialing out to a real provider.
  // This keeps the acceptance suite robust against rate-limit-driven flakes
  // for AI-heavy scenarios (E-008 message generation, etc.). Production never
  // sets this env var.
  if (process.env.E2E_AI_STUB === '1') {
    return buildStubAIResponse(taskName, context);
  }

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

// ─── Test/CI stub provider (E2E_AI_STUB=1) ────────────────────────────────
//
// The acceptance suite's E-008 / E-013 scenarios exercise generatePurchaseMessage,
// analyzeSellability, identifyItem, etc., which dial real LLM providers
// (Groq → Gemini → OpenAI). Repeated test runs hit per-minute rate limits
// and surface as 120s scenario timeouts. The E2E_AI_STUB env var swaps in
// deterministic JSON keyed by the prompt task name so the suite stays
// robust without changing production code paths.

function buildStubAIResponse(taskName: string, context: Record<string, unknown>): AIResponse {
  const sellerName = context.sellerName as string | null | undefined;
  const greeting = sellerName ? `Hi ${sellerName},` : 'Hi,';
  const listingTitle = String(context.listingTitle ?? 'this listing');
  const askingPrice = context.askingPrice as number | undefined;

  switch (taskName) {
    case 'purchaseMessage':
    case 'negotiation':
      return {
        content: JSON.stringify({
          subject: `Question about ${listingTitle}`.slice(0, 60),
          body: `${greeting} I'm interested in ${listingTitle}${askingPrice ? ` listed at $${askingPrice}` : ''}. Is this still available?`,
        }),
        provider: 'openai',
        model: 'stub',

      };
    case 'flipAnalysis':
      return {
        content: JSON.stringify({
          verifiedMarketValue: 100,
          trueDiscountPercent: 30,
          sellabilityScore: 75,
          demandLevel: 'medium',
          expectedDaysToSell: 14,
          authenticityRisk: 'low',
          conditionRisk: 'low',
          recommendedOfferPrice: 65,
          recommendedListPrice: 110,
          resaleStrategy: 'List on the most active platform for this category.',
          confidence: 'medium',
          reasoning: 'Stubbed response (E2E_AI_STUB=1).',
          meetsThreshold: true,
        }),
        provider: 'openai',
        model: 'stub',

      };
    case 'quickDiscountCheck':
      return {
        content: JSON.stringify({ passesQuickCheck: true, estimatedDiscount: 35 }),
        provider: 'openai',
        model: 'stub',

      };
    case 'productIdentification':
    case 'itemIdentification':
      return {
        content: JSON.stringify({
          brand: 'StubBrand',
          model: 'StubModel',
          variant: '',
          condition: 'good',
          searchQuery: listingTitle,
          worthInvestigating: true,
          category: 'electronics',
        }),
        provider: 'openai',
        model: 'stub',

      };
    case 'logisticsClassification':
      return {
        content: JSON.stringify({
          sizeCategory: 'small_shippable',
          estimatedWeightLbs: 5,
          fragility: 'low',
        }),
        provider: 'openai',
        model: 'stub',

      };
    case 'itemCompleteness':
      return {
        content: JSON.stringify({
          completenessLabel: 'Complete with box',
          missingParts: [],
        }),
        provider: 'openai',
        model: 'stub',

      };
    case 'claudeAnalysis':
      return {
        content: JSON.stringify({
          confidence: 'high',
          reasoning: 'Stubbed Claude analysis (E2E_AI_STUB=1).',
        }),
        provider: 'openai',
        model: 'stub',

      };
    default:
      // Unknown task — return an empty JSON object so callers parse cleanly.
      return {
        content: '{}',
        provider: 'openai',
        model: 'stub',

      };
  }
}

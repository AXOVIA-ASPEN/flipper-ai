/**
 * @file src/lib/ai/providers/index.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Provider factory for the multi-provider AI abstraction layer.
 *
 * @description
 * Exports factory functions for creating and resolving AI providers.
 * getProvider() returns a specific provider by name, resolveProvider()
 * iterates a preference list and returns the first available provider,
 * and getAvailableProviders() returns all providers with configured API keys.
 * Re-exports all shared types for convenient single-import usage.
 */

import type { AIProvider, ProviderName } from './types';
import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';

// Re-export types for convenient single-import usage
export type { AIProvider, AIMessage, AIResponse, ModelConfig, ProviderName } from './types';

// Re-export error taxonomy so consumers can `import from '@/lib/ai'` without
// reaching into providers/errors directly.
export {
  AIProviderError,
  AIRateLimitError,
  AITimeoutError,
  AIMalformedResponseError,
  AIProviderUnavailableError,
} from './errors';

import { AIProviderUnavailableError } from './errors';

const ALL_PROVIDER_NAMES: ProviderName[] = ['gemini', 'groq', 'openai', 'anthropic'];

/**
 * Returns a provider instance by name.
 * Does NOT check isAvailable() — use resolveProvider() for availability checks.
 */
export function getProvider(name: ProviderName): AIProvider {
  switch (name) {
    case 'gemini':
      return new GeminiProvider();
    case 'groq':
      return new GroqProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
  }
}

/**
 * Iterates the preferences list and returns the first available provider.
 * Throws AIProviderUnavailableError if none are available.
 */
export function resolveProvider(preferences: ProviderName[]): AIProvider {
  for (const name of preferences) {
    const provider = getProvider(name);
    if (provider.isAvailable()) {
      return provider;
    }
  }
  throw new AIProviderUnavailableError(preferences);
}

/**
 * Returns the names of all providers that have their API keys configured.
 */
export function getAvailableProviders(): ProviderName[] {
  return ALL_PROVIDER_NAMES.filter((name) => getProvider(name).isAvailable());
}

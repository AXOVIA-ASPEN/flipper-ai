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
import { resolveProvider } from './providers';
import type { AIResponse } from './providers/types';

// Re-exports for consumers
export { AIProviderUnavailableError } from './providers';
export { getAvailableProviders } from './providers';
export type { AIResponse } from './providers/types';
export type { PromptConfig } from './prompts/types';
export type { ProviderName } from './providers/types';

/**
 * Single entry point for all AI operations.
 *
 * Resolves a prompt config by task name, selects the best available provider
 * from the prompt's preference chain, builds messages, and calls complete().
 *
 * @param taskName - Registered prompt name (e.g. 'flipAnalysis', 'listingTitle')
 * @param context  - Runtime data interpolated into the user prompt template
 * @returns The provider's AIResponse (content, model, provider, usage)
 *
 * @throws {Error} If taskName is not a registered prompt
 * @throws {AIProviderUnavailableError} If no provider in the chain is available
 */
export async function completeAI(
  taskName: string,
  context: Record<string, unknown>,
): Promise<AIResponse> {
  const prompt = getPrompt(taskName);
  const provider = resolveProvider([prompt.provider, ...prompt.fallbacks]);

  const messages = [
    ...(prompt.systemPrompt
      ? [{ role: 'system' as const, content: prompt.systemPrompt }]
      : []),
    { role: 'user' as const, content: prompt.buildUserPrompt(context) },
  ];

  return provider.complete(messages, {
    model: prompt.model,
    temperature: prompt.temperature,
    maxTokens: prompt.maxTokens,
    responseFormat: prompt.responseFormat,
  });
}

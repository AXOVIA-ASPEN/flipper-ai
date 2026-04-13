/**
 * @file src/lib/ai/prompts/types.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Type definitions for the centralized prompt configuration registry.
 *
 * @description
 * Defines the PromptConfig interface used by all prompt domain files. Each
 * prompt config pairs metadata (provider routing, model, temperature) with a
 * system prompt string and a buildUserPrompt function that interpolates
 * runtime context into the user message template.
 */

import type { ProviderName } from '../providers/types';

export interface PromptConfig {
  name: string;
  description: string;
  provider: ProviderName;
  fallbacks: ProviderName[];
  model: string;
  temperature: number;
  maxTokens: number;
  responseFormat: 'json' | 'text';
  systemPrompt: string;
  buildUserPrompt: (context: Record<string, unknown>) => string;
}

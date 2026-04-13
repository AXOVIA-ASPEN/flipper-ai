/**
 * @file src/lib/ai/prompts/index.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Centralized prompt registry for all AI prompt configurations.
 *
 * @description
 * Registers all 12 prompt configs from the domain files into a single Map
 * keyed by prompt name. Provides getPrompt() for lookup-by-name with a clear
 * error on unknown keys, and getAllPromptNames() for introspection.
 */

import type { PromptConfig } from './types';
import { flipAnalysis, quickDiscountCheck, claudeAnalysis } from './flip-analysis';
import { negotiationStrategy, counterOfferAnalysis } from './negotiation';
import { purchaseMessage } from './messaging';
import { listingTitle, listingDescription, apiDescription } from './listing';
import { productIdentification, logisticsClassification, itemCompleteness } from './identification';

export type { PromptConfig } from './types';

const PROMPTS = new Map<string, PromptConfig>();

[
  flipAnalysis,
  quickDiscountCheck,
  claudeAnalysis,
  negotiationStrategy,
  counterOfferAnalysis,
  purchaseMessage,
  listingTitle,
  listingDescription,
  apiDescription,
  productIdentification,
  logisticsClassification,
  itemCompleteness,
].forEach((p) => PROMPTS.set(p.name, p));

export function getPrompt(name: string): PromptConfig {
  const config = PROMPTS.get(name);
  if (!config) {
    throw new Error(
      `Unknown prompt: "${name}". Available: ${[...PROMPTS.keys()].join(', ')}`
    );
  }
  return config;
}

export function getAllPromptNames(): string[] {
  return [...PROMPTS.keys()];
}

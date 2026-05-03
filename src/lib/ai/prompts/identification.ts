/**
 * @file src/lib/ai/prompts/identification.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Prompt configs for product identification, logistics classification, and item completeness.
 *
 * @description
 * Contains three prompt configurations extracted from llm-identifier.ts,
 * logistics-classifier.ts, and item-completeness-analyzer.ts:
 * productIdentification (brand/model/condition extraction),
 * logisticsClassification (size/weight/shipping category), and
 * itemCompleteness (GPT-4o Vision-based completeness assessment).
 */

import type { PromptConfig } from './types';

export const productIdentification: PromptConfig = {
  name: 'productIdentification',
  description:
    'Extracts structured product information (brand, model, variant, condition) from marketplace listing titles and descriptions.',
  provider: 'groq',
  fallbacks: ['gemini', 'openai'],
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 500,
  responseFormat: 'json',
  systemPrompt:
    'You are a product identification expert. Always respond with valid JSON only, no markdown formatting.',
  buildUserPrompt: (context: Record<string, unknown>) => {
    const title = String(context.title ?? '');
    const description = context.description != null ? String(context.description) : 'No description provided';
    const price = String(context.price ?? '');
    const category = String(context.category ?? 'Unknown');

    return `You are an expert at identifying products from marketplace listings. Analyze this listing and extract structured information.

LISTING:
Title: ${title}
Description: ${description}
Asking Price: $${price}
Category Hint: ${category}

TASK:
1. Identify the exact product (brand, model, variant/specs, year if applicable)
2. Assess the condition from the description
3. Generate an optimized search query for finding this exact item on eBay sold listings
4. Determine if this is worth investigating for resale (has brand recognition, resale demand)

RESPOND WITH ONLY VALID JSON (no markdown, no explanation):
{
  "brand": "string or null",
  "model": "string or null",
  "variant": "string or null (size, color, storage, etc.)",
  "year": "number or null",
  "condition": "new|like_new|good|fair|poor",
  "conditionNotes": "brief notes about condition",
  "searchQuery": "optimized eBay search query (brand + model + key specs)",
  "category": "refined category name",
  "worthInvestigating": true/false,
  "reasoning": "brief explanation of worth assessment"
}

GUIDELINES:
- worthInvestigating = true for: known brands, electronics, collectibles, tools, gaming
- worthInvestigating = false for: generic items, clothing without brand, very low value items
- searchQuery should be specific enough to find similar items but not too restrictive
- If you can't identify the brand/model, still provide a useful searchQuery`;
  },
};

export const logisticsClassification: PromptConfig = {
  name: 'logisticsClassification',
  description:
    'Classifies items by size/weight category for shipping logistics (small_shippable, large_local_only, fragile_special_handling).',
  provider: 'groq',
  fallbacks: ['gemini', 'openai'],
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 300,
  responseFormat: 'json',
  systemPrompt:
    'You are a logistics expert. Classify items for shipping/pickup difficulty.\nReturn JSON: { "sizeCategory": "small_shippable"|"large_local_only"|"fragile_special_handling",\n               "estimatedWeightLbs": number, "estimatedDimensionsInches": {"length": number, "width": number, "height": number},\n               "classificationReasoning": "brief explanation", "confidence": "low"|"medium"|"high" }',
  buildUserPrompt: (context: Record<string, unknown>) => {
    const title = String(context.title ?? '');
    const description = context.description != null ? String(context.description) : 'none';
    const category = String(context.category ?? '');

    return `Item: "${title}"
Description: "${description}"
Category: "${category}"

Guidelines:
- small_shippable: fits in standard box, under 70 lbs (electronics, clothing, small tools, books)
- large_local_only: too large/heavy for standard shipping (furniture, appliances, large power tools, vehicles)
- fragile_special_handling: breakable/requires special packing (musical instruments, artwork, mirrors, ceramics)

Estimate realistic weight and box dimensions for shipping this item.`;
  },
};

export const itemCompleteness: PromptConfig = {
  name: 'itemCompleteness',
  description:
    'Uses GPT-4o Vision to assess item completeness from listing images and description, detecting missing parts and damage.',
  // Vision-only — Groq's open-source Llama models cannot consume images, so
  // OpenAI's GPT-4o is the correct primary. Gemini Vision serves as fallback.
  provider: 'openai',
  fallbacks: ['gemini'],
  model: 'gpt-4o',
  temperature: 0.3,
  maxTokens: 500,
  responseFormat: 'json',
  systemPrompt: '',
  buildUserPrompt: (context: Record<string, unknown>) => {
    const title = String(context.title ?? '');
    const description = context.description != null ? String(context.description) : 'No description provided.';
    const category = String(context.category ?? '');
    const descText = description.slice(0, 500);

    return `You are an expert reseller assessing marketplace listing condition and completeness.

Item: ${title}
Category: ${category}
Description: ${descText}

Analyze the provided images and description. Respond ONLY with valid JSON:
{
  "completenessLabel": "<concise label: Complete with box | Missing charger | Cosmetic damage - scratches | etc.>",
  "hasOriginalPackaging": true or false,
  "missingParts": ["<part>"],
  "cosmeticDamage": "<description or null>",
  "functionalDamage": "<description or null>",
  "analysisConfidence": "low or medium or high"
}`;
  },
};

// Story 5.5: LLM-based size/weight classification for logistics analysis
// Uses GPT-4o-mini for item size categorization (following llm-identifier.ts pattern)

import OpenAI from 'openai';

export interface LogisticsClassification {
  sizeCategory: 'small_shippable' | 'large_local_only' | 'fragile_special_handling';
  estimatedWeightLbs: number;
  estimatedDimensionsInches: {
    length: number;
    width: number;
    height: number;
  };
  classificationReasoning: string;
  confidence: 'low' | 'medium' | 'high';
}

// Category-based fallback defaults when LLM is unavailable
const CATEGORY_SIZE_DEFAULTS: Record<string, LogisticsClassification['sizeCategory']> = {
  furniture: 'large_local_only',
  appliances: 'large_local_only',
  automotive: 'large_local_only',
  electronics: 'small_shippable',
  'video games': 'small_shippable',
  collectibles: 'small_shippable',
  clothing: 'small_shippable',
  tools: 'small_shippable',
  sports: 'small_shippable',
  musical: 'fragile_special_handling',
};

// Default weight/dimensions by size category for fallback
const SIZE_CATEGORY_DEFAULTS: Record<LogisticsClassification['sizeCategory'], {
  weightLbs: number;
  dimensions: { length: number; width: number; height: number };
}> = {
  small_shippable: { weightLbs: 5, dimensions: { length: 12, width: 9, height: 6 } },
  large_local_only: { weightLbs: 50, dimensions: { length: 48, width: 24, height: 24 } },
  fragile_special_handling: { weightLbs: 15, dimensions: { length: 24, width: 18, height: 12 } },
};

const CLASSIFICATION_SYSTEM_PROMPT = `You are a logistics expert. Classify items for shipping/pickup difficulty.
Return JSON: { "sizeCategory": "small_shippable"|"large_local_only"|"fragile_special_handling",
               "estimatedWeightLbs": number, "estimatedDimensionsInches": {"length": number, "width": number, "height": number},
               "classificationReasoning": "brief explanation", "confidence": "low"|"medium"|"high" }`;

function buildUserPrompt(title: string, description: string | null, category: string): string {
  return `Item: "${title}"
Description: "${description || 'none'}"
Category: "${category}"

Guidelines:
- small_shippable: fits in standard box, under 70 lbs (electronics, clothing, small tools, books)
- large_local_only: too large/heavy for standard shipping (furniture, appliances, large power tools, vehicles)
- fragile_special_handling: breakable/requires special packing (musical instruments, artwork, mirrors, ceramics)

Estimate realistic weight and box dimensions for shipping this item.`;
}

function getFallbackClassification(category: string): LogisticsClassification {
  const normalizedCategory = category.toLowerCase();
  const sizeCategory = CATEGORY_SIZE_DEFAULTS[normalizedCategory] ?? 'small_shippable';
  const defaults = SIZE_CATEGORY_DEFAULTS[sizeCategory];

  return {
    sizeCategory,
    estimatedWeightLbs: defaults.weightLbs,
    estimatedDimensionsInches: { ...defaults.dimensions },
    classificationReasoning: `Fallback classification based on category "${category}"`,
    confidence: 'low',
  };
}

function validateSizeCategory(value: string): LogisticsClassification['sizeCategory'] {
  const valid: LogisticsClassification['sizeCategory'][] = [
    'small_shippable',
    'large_local_only',
    'fragile_special_handling',
  ];
  return valid.includes(value as LogisticsClassification['sizeCategory'])
    ? (value as LogisticsClassification['sizeCategory'])
    : 'small_shippable';
}

function validateConfidence(value: string): LogisticsClassification['confidence'] {
  const valid: LogisticsClassification['confidence'][] = ['low', 'medium', 'high'];
  return valid.includes(value as LogisticsClassification['confidence'])
    ? (value as LogisticsClassification['confidence'])
    : 'medium';
}

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    /* istanbul ignore next -- defensive guard; classifyItemLogistics already returns fallback when key is absent */
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export async function classifyItemLogistics(
  title: string,
  description: string | null,
  category: string
): Promise<LogisticsClassification> {
  // No API key → return category-based default
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY not set, using fallback logistics classification');
    return getFallbackClassification(category);
  }

  try {
    const client = getOpenAI();
    const userPrompt = buildUserPrompt(title, description, category);

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const responseText = response.choices[0]?.message?.content || '';
    const parsed = JSON.parse(responseText);

    return {
      sizeCategory: validateSizeCategory(parsed.sizeCategory),
      estimatedWeightLbs: Math.max(0.1, Math.min(200, Number(parsed.estimatedWeightLbs) || 5)),
      estimatedDimensionsInches: {
        length: Math.max(1, Number(parsed.estimatedDimensionsInches?.length) || 12),
        width: Math.max(1, Number(parsed.estimatedDimensionsInches?.width) || 9),
        height: Math.max(1, Number(parsed.estimatedDimensionsInches?.height) || 6),
      },
      classificationReasoning: parsed.classificationReasoning || '',
      confidence: validateConfidence(parsed.confidence),
    };
  } catch (error) {
    console.error('Logistics classification LLM error, using fallback:', error);
    return getFallbackClassification(category);
  }
}

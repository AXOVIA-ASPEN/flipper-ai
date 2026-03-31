// Story 5.4: Item completeness analysis via GPT-4o Vision
// Uses OpenAI Vision API to assess item completeness from listing images and description.

import OpenAI from 'openai';

export interface CompletenessAnalysisResult {
  completenessLabel: string;       // Human-readable: "Complete with box", "Missing charger", etc.
  hasOriginalPackaging: boolean;
  missingParts: string[];          // e.g., ["charger", "manual"]
  cosmeticDamage: string | null;   // e.g., "Screen crack", null if none
  functionalDamage: string | null; // e.g., "Button not responsive", null if none
  analysisConfidence: 'low' | 'medium' | 'high';
}

function buildCompletenessPrompt(title: string, description: string | null, category: string): string {
  const descText = description ? description.slice(0, 500) : 'No description provided.';
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
}

/**
 * Uses GPT-4o Vision to assess item completeness from listing images and description.
 * Returns null when no images are available, the API is unreachable, or analysis fails.
 * Failures never propagate to the caller — all errors are caught and logged.
 */
export async function analyzeItemCompleteness(
  imageUrls: string[],
  title: string,
  description: string | null,
  category: string
): Promise<CompletenessAnalysisResult | null> {
  if (imageUrls.length === 0) {
    return null;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = buildCompletenessPrompt(title, description, category);

    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      { type: 'text', text: prompt },
      // Include up to 3 images to control token usage
      ...imageUrls.slice(0, 3).map(
        (url): OpenAI.Chat.ChatCompletionContentPartImage => ({
          type: 'image_url',
          image_url: { url, detail: 'low' }, // 'low' detail reduces cost
        })
      ),
    ];

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);

    // Validate all required fields are present
    if (
      typeof parsed.completenessLabel !== 'string' ||
      typeof parsed.hasOriginalPackaging !== 'boolean' ||
      !Array.isArray(parsed.missingParts) ||
      !['low', 'medium', 'high'].includes(parsed.analysisConfidence)
    ) {
      return null;
    }

    return {
      completenessLabel: parsed.completenessLabel,
      hasOriginalPackaging: parsed.hasOriginalPackaging,
      missingParts: parsed.missingParts.filter((p: unknown) => typeof p === 'string'),
      cosmeticDamage: typeof parsed.cosmeticDamage === 'string' ? parsed.cosmeticDamage : null,
      functionalDamage: typeof parsed.functionalDamage === 'string' ? parsed.functionalDamage : null,
      analysisConfidence: parsed.analysisConfidence as 'low' | 'medium' | 'high',
    };
  } catch (err) {
    console.error('[analyzeItemCompleteness] Analysis failed:', err);
    return null;
  }
}

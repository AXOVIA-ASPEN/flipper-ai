// Story 5.4: Item completeness analysis via GPT-4o Vision
// Uses centralized AI module to assess item completeness from listing images and description.

import { completeAI } from '@/lib/ai';

export interface CompletenessAnalysisResult {
  completenessLabel: string;       // Human-readable: "Complete with box", "Missing charger", etc.
  hasOriginalPackaging: boolean;
  missingParts: string[];          // e.g., ["charger", "manual"]
  cosmeticDamage: string | null;   // e.g., "Screen crack", null if none
  functionalDamage: string | null; // e.g., "Button not responsive", null if none
  analysisConfidence: 'low' | 'medium' | 'high';
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
    const response = await completeAI('itemCompleteness', {
      title,
      description,
      category,
      imageUrls: imageUrls.slice(0, 3),
    });

    const raw = response.content || '{}';
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
    // Graceful degrade for both provider unavailability and runtime AI errors.
    // Vision analysis is supplementary — the app works without it.
    console.error('[analyzeItemCompleteness] Analysis failed:', err);
    return null;
  }
}

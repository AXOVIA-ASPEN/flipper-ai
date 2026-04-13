// Listing Title Generator
// Generates SEO-optimized resale listing titles from item data
// Supports multiple marketplace formats with character limits

import { completeAI, AIProviderUnavailableError } from '@/lib/ai';
import type { ItemIdentification } from './llm-identifier';

export interface TitleGeneratorInput {
  brand: string | null;
  model: string | null;
  variant: string | null;
  condition: string;
  category: string | null;
  keywords?: string[];
}

export interface GeneratedTitle {
  title: string;
  platform: 'ebay' | 'mercari' | 'facebook' | 'offerup' | 'generic';
  charCount: number;
  keywords: string[];
}

export interface TitleGeneratorResult {
  titles: GeneratedTitle[];
  primary: string; // Best overall title
}

// Platform character limits
const PLATFORM_LIMITS: Record<string, number> = {
  ebay: 80,
  mercari: 40,
  facebook: 99,
  offerup: 70,
  generic: 80,
};

// Condition display mapping for titles
const CONDITION_LABELS: Record<string, string> = {
  new: 'NEW',
  like_new: 'Like New',
  good: 'Good Condition',
  fair: 'Fair',
  poor: 'For Parts/Repair',
};

/**
 * Generate an optimized resale title algorithmically (no LLM needed).
 * Fast, deterministic, and free.
 */
export function generateAlgorithmicTitle(
  input: TitleGeneratorInput,
  platform: string = 'generic'
): GeneratedTitle {
  const limit = PLATFORM_LIMITS[platform] || 80;
  const parts: string[] = [];
  const keywords: string[] = [];

  // Brand first (most important for SEO)
  if (input.brand) {
    parts.push(input.brand);
    keywords.push(input.brand.toLowerCase());
  }

  // Model
  if (input.model) {
    parts.push(input.model);
    keywords.push(input.model.toLowerCase());
  }

  // Variant (size, color, storage, etc.)
  if (input.variant) {
    parts.push(input.variant);
    keywords.push(input.variant.toLowerCase());
  }

  // Condition
  const conditionLabel = CONDITION_LABELS[input.condition] || input.condition;
  parts.push(`- ${conditionLabel}`);

  // Extra keywords if space permits
  if (input.keywords) {
    for (const kw of input.keywords) {
      keywords.push(kw.toLowerCase());
    }
  }

  // Build title respecting character limit
  let title = parts.join(' ');

  // If over limit, try removing condition details
  if (title.length > limit) {
    const shortCondition =
      input.condition === 'new' ? 'NEW' : input.condition === 'like_new' ? 'LN' : '';
    const condensed = parts.slice(0, -1);
    if (shortCondition) condensed.push(shortCondition);
    title = condensed.join(' ');
  }

  // Final truncation if still over
  if (title.length > limit) {
    title = title.substring(0, limit - 3).trimEnd() + '...';
  }

  return {
    title: title.trim(),
    platform: platform as GeneratedTitle['platform'],
    charCount: Math.min(title.trim().length, limit),
    keywords,
  };
}

/**
 * Generate titles for all supported platforms from item data.
 */
export function generateTitlesForAllPlatforms(input: TitleGeneratorInput): TitleGeneratorResult {
  const platforms = ['ebay', 'mercari', 'facebook', 'offerup'] as const;
  const titles: GeneratedTitle[] = platforms.map((p) => generateAlgorithmicTitle(input, p));

  // Primary title is the eBay one (most common resale platform)
  /* istanbul ignore next -- ebay is always in platforms array; fallback is defensive only */
  const primary = titles.find((t) => t.platform === 'ebay')?.title || titles[0]?.title || '';

  return { titles, primary };
}

/**
 * Generate an LLM-optimized title using OpenAI.
 * Falls back to algorithmic generation if no API key.
 */
export async function generateLLMTitle(
  input: TitleGeneratorInput,
  platform: string = 'ebay'
): Promise<GeneratedTitle> {
  const limit = PLATFORM_LIMITS[platform] || 80;

  try {
    const response = await completeAI('listingTitle', {
      platform,
      brand: input.brand || 'Unknown',
      model: input.model || 'Unknown',
      variant: input.variant || 'N/A',
      condition: input.condition,
      category: input.category || 'General',
      charLimit: limit,
    });

    let title = response.content.trim();

    // Strip quotes if the LLM wrapped it
    title = title.replace(/^["']|["']$/g, '');

    // Enforce character limit
    if (title.length > limit) {
      title = title.substring(0, limit - 3).trimEnd() + '...';
    }

    // Extract keywords from the generated title
    const keywords = title
      .toLowerCase()
      .split(/[\s\-\/,]+/)
      .filter((w) => w.length > 2);

    return {
      title,
      platform: platform as GeneratedTitle['platform'],
      charCount: title.length,
      keywords,
    };
  } catch (error) {
    if (error instanceof AIProviderUnavailableError) {
      return generateAlgorithmicTitle(input, platform);
    }
    console.error('LLM title generation failed, using algorithmic:', error);
    return generateAlgorithmicTitle(input, platform);
  }
}

/**
 * Convert an ItemIdentification (from llm-identifier) to TitleGeneratorInput.
 */
export function fromIdentification(identification: ItemIdentification): TitleGeneratorInput {
  return {
    brand: identification.brand,
    model: identification.model,
    variant: identification.variant,
    condition: identification.condition,
    category: identification.category,
  };
}

// Resale Listing Description Generator
// Generates compelling marketplace descriptions from item data
// Supports multiple platforms with format-specific templates

import OpenAI from 'openai';
import type { ItemIdentification } from './llm-identifier';

export interface DescriptionGeneratorInput {
  brand: string | null;
  model: string | null;
  variant: string | null;
  condition: string;
  category: string | null;
  askingPrice: number;
  originalPrice?: number | null;
  defects?: string[];
  features?: string[];
  includesAccessories?: string[];
  sellerNotes?: string | null;
}

export interface GeneratedDescription {
  description: string;
  platform: 'ebay' | 'mercari' | 'facebook' | 'offerup' | 'generic';
  wordCount: number;
  hasConditionDetails: boolean;
  hasShippingNote: boolean;
}

export interface DescriptionGeneratorResult {
  descriptions: GeneratedDescription[];
  primary: string;
}

// Platform-specific constraints and styles
const PLATFORM_STYLES: Record<string, { maxWords: number; tone: string; format: string }> = {
  ebay: {
    maxWords: 500,
    tone: 'professional, detailed',
    format: 'structured with sections',
  },
  mercari: {
    maxWords: 200,
    tone: 'casual, friendly',
    format: 'concise paragraphs',
  },
  facebook: {
    maxWords: 250,
    tone: 'conversational, local',
    format: 'short paragraphs with emoji sparingly',
  },
  offerup: {
    maxWords: 200,
    tone: 'casual, direct',
    format: 'bullet points preferred',
  },
  generic: {
    maxWords: 300,
    tone: 'clear, informative',
    format: 'structured paragraphs',
  },
};

const CONDITION_DESCRIPTIONS: Record<string, string> = {
  new: 'Brand new, never used. Still in original packaging.',
  like_new: 'Like new condition. Used minimally with no visible wear.',
  good: 'Good condition. Normal wear consistent with regular use.',
  fair: 'Fair condition. Shows signs of use with some cosmetic wear.',
  poor: 'Sold as-is for parts or repair. May have functional issues.',
};

/**
 * Generate a resale description algorithmically (no LLM needed).
 */
export function generateAlgorithmicDescription(
  input: DescriptionGeneratorInput,
  platform: string = 'generic'
): GeneratedDescription {
  const style = PLATFORM_STYLES[platform] || PLATFORM_STYLES.generic;
  const sections: string[] = [];

  // Opening line
  const itemName = [input.brand, input.model, input.variant].filter(Boolean).join(' ') || 'Item';
  sections.push(`${itemName} for sale!`);

  // Condition
  const conditionText = CONDITION_DESCRIPTIONS[input.condition] || `Condition: ${input.condition}`;
  sections.push(`\nCondition: ${conditionText}`);

  // Defects
  if (input.defects && input.defects.length > 0) {
    sections.push(`\nPlease note: ${input.defects.join('. ')}.`);
  }

  // Features
  if (input.features && input.features.length > 0) {
    sections.push(`\nFeatures:\n${input.features.map((f) => `• ${f}`).join('\n')}`);
  }

  // Accessories
  if (input.includesAccessories && input.includesAccessories.length > 0) {
    sections.push(`\nIncludes: ${input.includesAccessories.join(', ')}`);
  }

  // Price context
  if (input.originalPrice && input.originalPrice > input.askingPrice) {
    const savings = Math.round(((input.originalPrice - input.askingPrice) / input.originalPrice) * 100);
    sections.push(`\nRetails for $${input.originalPrice} — save ${savings}%!`);
  }

  // Seller notes
  if (input.sellerNotes) {
    sections.push(`\n${input.sellerNotes}`);
  }

  // Shipping note
  const shippingNote = platform === 'facebook' || platform === 'offerup'
    ? '\nLocal pickup available. Will consider shipping for serious buyers.'
    : '\nShips quickly with tracking. Combined shipping available on multiple items.';
  sections.push(shippingNote);

  const description = sections.join('\n').trim();
  const wordCount = description.split(/\s+/).length;

  return {
    description,
    platform: platform as GeneratedDescription['platform'],
    wordCount: Math.min(wordCount, style.maxWords),
    hasConditionDetails: true,
    hasShippingNote: true,
  };
}

/**
 * Generate descriptions for all supported platforms.
 */
export function generateDescriptionsForAllPlatforms(
  input: DescriptionGeneratorInput
): DescriptionGeneratorResult {
  const platforms = ['ebay', 'mercari', 'facebook', 'offerup'] as const;
  const descriptions: GeneratedDescription[] = platforms.map((p) =>
    generateAlgorithmicDescription(input, p)
  );

  const primary = descriptions.find((d) => d.platform === 'ebay')?.description || descriptions[0]?.description || '';
  return { descriptions, primary };
}

/**
 * Generate an LLM-optimized description using OpenAI.
 * Falls back to algorithmic generation if no API key.
 */
export async function generateLLMDescription(
  input: DescriptionGeneratorInput,
  platform: string = 'ebay'
): Promise<GeneratedDescription> {
  const style = PLATFORM_STYLES[platform] || PLATFORM_STYLES.generic;

  if (!process.env.OPENAI_API_KEY) {
    return generateAlgorithmicDescription(input, platform);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const itemName = [input.brand, input.model, input.variant].filter(Boolean).join(' ') || 'Item';

    const prompt = `Write a ${platform} marketplace listing description for: ${itemName}

Item Details:
- Condition: ${input.condition}${input.defects?.length ? ` (Defects: ${input.defects.join(', ')})` : ''}
- Category: ${input.category || 'General'}
- Asking Price: $${input.askingPrice}${input.originalPrice ? ` (Retail: $${input.originalPrice})` : ''}
${input.features?.length ? `- Features: ${input.features.join(', ')}` : ''}
${input.includesAccessories?.length ? `- Includes: ${input.includesAccessories.join(', ')}` : ''}
${input.sellerNotes ? `- Notes: ${input.sellerNotes}` : ''}

Writing Style: ${style.tone}
Format: ${style.format}
Max Words: ${style.maxWords}

Rules:
- Be honest about condition — never mislead
- Include relevant keywords buyers search for
- Mention what's included and any defects
- Add shipping/pickup info
- No ALL CAPS paragraphs
- Sound like a real person, not a bot

Write ONLY the description text.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an experienced online reseller who writes descriptions that sell items quickly while being honest about condition.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 800,
    });

    const description = (response.choices[0]?.message?.content || '').trim();
    const wordCount = description.split(/\s+/).length;

    return {
      description,
      platform: platform as GeneratedDescription['platform'],
      wordCount,
      hasConditionDetails: /condition|wear|used|new/i.test(description),
      hasShippingNote: /ship|pickup|deliver/i.test(description),
    };
  } catch (error) {
    console.error('LLM description generation failed, using algorithmic:', error);
    return generateAlgorithmicDescription(input, platform);
  }
}

/**
 * Convert an ItemIdentification to DescriptionGeneratorInput.
 */
export function fromIdentification(
  identification: ItemIdentification,
  askingPrice: number,
  extras?: {
    originalPrice?: number;
    defects?: string[];
    features?: string[];
    includesAccessories?: string[];
    sellerNotes?: string;
  }
): DescriptionGeneratorInput {
  return {
    brand: identification.brand,
    model: identification.model,
    variant: identification.variant,
    condition: identification.condition,
    category: identification.category,
    askingPrice,
    originalPrice: extras?.originalPrice ?? null,
    defects: extras?.defects,
    features: extras?.features,
    includesAccessories: extras?.includesAccessories,
    sellerNotes: extras?.sellerNotes ?? null,
  };
}

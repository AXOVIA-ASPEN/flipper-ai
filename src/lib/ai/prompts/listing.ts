/**
 * @file src/lib/ai/prompts/listing.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Prompt configs for resale listing title, description, and API description generation.
 *
 * @description
 * Contains three prompt configurations extracted from title-generator.ts,
 * description-generator.ts, and the API route at
 * app/api/listings/[id]/description/route.ts. Covers SEO-optimized title
 * generation, platform-specific description writing, and structured API
 * description generation with highlights and keywords.
 */

import type { PromptConfig } from './types';

export const listingTitle: PromptConfig = {
  name: 'listingTitle',
  description:
    'Generates SEO-optimized resale listing titles for a given marketplace platform with character limits.',
  provider: 'gemini',
  fallbacks: ['groq', 'openai'],
  model: 'gpt-4o-mini',
  temperature: 0.4,
  maxTokens: 100,
  responseFormat: 'text',
  systemPrompt:
    'You are an expert eBay/marketplace seller who writes high-converting listing titles.',
  buildUserPrompt: (context: Record<string, unknown>) => {
    const platform = String(context.platform ?? 'ebay');
    const brand = String(context.brand ?? 'Unknown');
    const model = String(context.model ?? 'Unknown');
    const variant = String(context.variant ?? 'N/A');
    const condition = String(context.condition ?? '');
    const category = String(context.category ?? 'General');
    const charLimit = (context.charLimit as number) ?? 80;

    return `Generate a single SEO-optimized resale listing title for ${platform}.

Item Details:
- Brand: ${brand}
- Model: ${model}
- Variant: ${variant}
- Condition: ${condition}
- Category: ${category}

Rules:
- MUST be ${charLimit} characters or fewer
- Include brand and model prominently
- Use keywords buyers search for
- Include condition indicator
- No emojis, no ALL CAPS (except brand acronyms)
- No clickbait or misleading terms

Respond with ONLY the title text, nothing else.`;
  },
};

export const listingDescription: PromptConfig = {
  name: 'listingDescription',
  description:
    'Generates compelling marketplace listing descriptions with platform-specific tone and formatting.',
  provider: 'gemini',
  fallbacks: ['groq', 'openai'],
  model: 'gpt-4o-mini',
  temperature: 0.6,
  maxTokens: 800,
  responseFormat: 'text',
  systemPrompt:
    'You are an experienced online reseller who writes descriptions that sell items quickly while being honest about condition.',
  buildUserPrompt: (context: Record<string, unknown>) => {
    const platform = String(context.platform ?? 'ebay');
    const brand = String(context.brand ?? '');
    const model = String(context.model ?? '');
    const variant = String(context.variant ?? '');
    const condition = String(context.condition ?? '');
    const category = String(context.category ?? 'General');
    const askingPrice = context.askingPrice as number;
    const originalPrice = context.originalPrice as number | null | undefined;
    const defects = context.defects as string[] | undefined;
    const features = context.features as string[] | undefined;
    const includesAccessories = context.includesAccessories as string[] | undefined;
    const sellerNotes = context.sellerNotes as string | null | undefined;
    const tone = String(context.tone ?? 'professional, detailed');
    const format = String(context.format ?? 'structured with sections');
    const maxWords = (context.maxWords as number) ?? 300;

    const itemName = [brand, model, variant].filter(Boolean).join(' ') || 'Item';

    return `Write a ${platform} marketplace listing description for: ${itemName}

Item Details:
- Condition: ${condition}${defects?.length ? ` (Defects: ${defects.join(', ')})` : ''}
- Category: ${category}
- Asking Price: $${askingPrice}${originalPrice ? ` (Retail: $${originalPrice})` : ''}
${features?.length ? `- Features: ${features.join(', ')}` : ''}
${includesAccessories?.length ? `- Includes: ${includesAccessories.join(', ')}` : ''}
${sellerNotes ? `- Notes: ${sellerNotes}` : ''}

Writing Style: ${tone}
Format: ${format}
Max Words: ${maxWords}

Rules:
- Be honest about condition \u2014 never mislead
- Include relevant keywords buyers search for
- Mention what's included and any defects
- Add shipping/pickup info
- No ALL CAPS paragraphs
- Sound like a real person, not a bot

Write ONLY the description text.`;
  },
};

export const apiDescription: PromptConfig = {
  name: 'apiDescription',
  description:
    'Generates structured resale listing descriptions via API with title, highlights, suggested price, and keywords.',
  provider: 'gemini',
  fallbacks: ['groq', 'openai'],
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 1500,
  responseFormat: 'json',
  systemPrompt: '',
  buildUserPrompt: (context: Record<string, unknown>) => {
    const platform = String(context.platform ?? 'ebay');
    const tone = String(context.tone ?? 'professional');
    const includeSpecs = context.includeSpecs !== false;
    const itemContext = context.itemContext as Record<string, unknown>;

    const platformGuidelines: Record<string, string> = {
      ebay: 'eBay: Use item specifics format, mention condition accurately, include measurements/specs, use keywords for search. Max ~4000 chars.',
      mercari: 'Mercari: Concise and friendly, highlight condition clearly, mention shipping. Max ~1000 chars.',
      facebook: 'Facebook Marketplace: Casual tone, mention local pickup, highlight key features. Max ~4000 chars.',
      offerup: 'OfferUp: Short and punchy, condition-focused, price justification. Max ~3000 chars.',
      craigslist: 'Craigslist: Detailed, include all specs, mention firm/OBO, describe condition honestly. No limit.',
    };

    return `Generate an optimized resale listing description for the following item.

Platform: ${platformGuidelines[platform] || platformGuidelines.ebay}
Tone: ${tone}
Include specs: ${includeSpecs}

Item Details:
${JSON.stringify(itemContext, null, 2)}

Generate a compelling description that:
1. Highlights the item's value and condition
2. Uses platform-appropriate formatting
3. Includes relevant keywords for discoverability
4. Mentions key specs/features
5. Is honest about condition

Return ONLY a JSON object with these fields:
{
  "title": "optimized listing title",
  "description": "the full listing description",
  "highlights": ["key selling point 1", "key selling point 2", ...],
  "suggestedPrice": <number or null>,
  "keywords": ["keyword1", "keyword2", ...]
}`;
  },
};

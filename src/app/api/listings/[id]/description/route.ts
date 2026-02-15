import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import OpenAI from 'openai';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/listings/:id/description - Generate AI description for resale listing
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const listing = await prisma.listing.findFirst({
      where: { id, userId },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const platform = (body.platform as string) || 'ebay';
    const tone = (body.tone as string) || 'professional';
    const includeSpecs = body.includeSpecs !== false;

    const validPlatforms = ['ebay', 'mercari', 'facebook', 'offerup', 'craigslist'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Build context from listing data
    const itemContext = {
      title: listing.title,
      description: listing.description,
      condition: listing.identifiedCondition || listing.condition,
      brand: listing.identifiedBrand,
      model: listing.identifiedModel,
      variant: listing.identifiedVariant,
      category: listing.category,
      askingPrice: listing.askingPrice,
      estimatedValue: listing.estimatedValue,
      priceReasoning: listing.priceReasoning,
    };

    const platformGuidelines: Record<string, string> = {
      ebay: 'eBay: Use item specifics format, mention condition accurately, include measurements/specs, use keywords for search. Max ~4000 chars.',
      mercari: 'Mercari: Concise and friendly, highlight condition clearly, mention shipping. Max ~1000 chars.',
      facebook: 'Facebook Marketplace: Casual tone, mention local pickup, highlight key features. Max ~4000 chars.',
      offerup: 'OfferUp: Short and punchy, condition-focused, price justification. Max ~3000 chars.',
      craigslist: 'Craigslist: Detailed, include all specs, mention firm/OBO, describe condition honestly. No limit.',
    };

    const prompt = `Generate an optimized resale listing description for the following item.

Platform: ${platformGuidelines[platform]}
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

    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Fallback: generate a basic description without AI
      const fallbackDescription = generateFallbackDescription(listing, platform);
      return NextResponse.json({
        success: true,
        data: fallbackDescription,
        source: 'template',
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'AI failed to generate description' }, { status: 502 });
    }

    const generated = JSON.parse(content);

    return NextResponse.json({
      success: true,
      data: {
        title: generated.title || listing.title,
        description: generated.description,
        highlights: generated.highlights || [],
        suggestedPrice: generated.suggestedPrice || listing.estimatedValue,
        keywords: generated.keywords || [],
        platform,
      },
      source: 'ai',
    });
  } catch (error) {
    console.error('Error generating description:', error);
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 });
  }
}

// Fallback template-based description when no AI key is available
function generateFallbackDescription(
  listing: {
    title: string;
    description: string | null;
    condition: string | null;
    identifiedBrand: string | null;
    identifiedModel: string | null;
    identifiedCondition: string | null;
    category: string | null;
    askingPrice: number;
    estimatedValue: number | null;
  },
  platform: string
) {
  const condition = listing.identifiedCondition || listing.condition || 'Used';
  const brand = listing.identifiedBrand || '';
  const model = listing.identifiedModel || '';

  const description = [
    `${brand} ${model} - ${condition}`.trim(),
    '',
    listing.description || 'Item for sale.',
    '',
    `Condition: ${condition}`,
    brand ? `Brand: ${brand}` : '',
    model ? `Model: ${model}` : '',
    listing.category ? `Category: ${listing.category}` : '',
    '',
    platform === 'facebook' || platform === 'craigslist'
      ? 'Local pickup available.'
      : 'Ships quickly after purchase.',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    title: `${brand} ${model} - ${condition}`.trim() || listing.title,
    description,
    highlights: [condition, brand, model].filter(Boolean),
    suggestedPrice: listing.estimatedValue || listing.askingPrice,
    keywords: [brand, model, condition, listing.category].filter(Boolean) as string[],
    platform,
  };
}

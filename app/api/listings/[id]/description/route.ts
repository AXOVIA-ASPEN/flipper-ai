import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { completeAI, AIProviderUnavailableError } from '@/lib/ai';

import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, AppError, ErrorCode } from '@/lib/errors';
interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/listings/:id/description - Generate AI description for resale listing
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { id } = await params;
    const listing = await prisma.listing.findFirst({
      where: { id, userId },
    });

    if (!listing) {
      throw new NotFoundError('Listing not found');
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

    try {
      const response = await completeAI('apiDescription', {
        platform,
        tone,
        includeSpecs,
        itemContext,
      });

      const content = response.content;
      if (!content) {
        throw new AppError(ErrorCode.EXTERNAL_SERVICE_ERROR, 'AI failed to generate description');
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
    } catch (aiError) {
      if (aiError instanceof AIProviderUnavailableError) {
        // Fallback: generate a basic description without AI
        const fallbackDescription = generateFallbackDescription(listing, platform);
        return NextResponse.json({
          success: true,
          data: fallbackDescription,
          source: 'template',
        });
      }
      throw aiError;
    }
  } catch (error) {
    return handleError(error, request.url);
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
    /* istanbul ignore next -- || fallback only when brand+model+condition are all empty; listing.title always set */
    title: `${brand} ${model} - ${condition}`.trim() || listing.title,
    description,
    highlights: [condition, brand, model].filter(Boolean),
    suggestedPrice: listing.estimatedValue || listing.askingPrice,
    keywords: [brand, model, condition, listing.category].filter(Boolean) as string[],
    platform,
  };
}

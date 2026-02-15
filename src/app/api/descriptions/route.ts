import { NextRequest, NextResponse } from 'next/server';
import {
  generateAlgorithmicDescription,
  generateLLMDescription,
  generateDescriptionsForAllPlatforms,
  type DescriptionGeneratorInput,
} from '@/lib/description-generator';

/**
 * POST /api/descriptions
 * Generate resale listing descriptions for items.
 *
 * Body:
 *  - brand, model, variant, condition, category, askingPrice (required)
 *  - originalPrice, defects, features, includesAccessories, sellerNotes (optional)
 *  - platform: specific platform or "all" (default: "all")
 *  - useLLM: boolean (default: false)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { platform = 'all', useLLM = false, ...itemData } = body;

    // Validate required fields
    if (!itemData.condition) {
      return NextResponse.json({ error: 'condition is required' }, { status: 400 });
    }
    if (itemData.askingPrice == null || itemData.askingPrice < 0) {
      return NextResponse.json({ error: 'askingPrice is required and must be >= 0' }, { status: 400 });
    }

    const input: DescriptionGeneratorInput = {
      brand: itemData.brand || null,
      model: itemData.model || null,
      variant: itemData.variant || null,
      condition: itemData.condition,
      category: itemData.category || null,
      askingPrice: itemData.askingPrice,
      originalPrice: itemData.originalPrice ?? null,
      defects: itemData.defects ?? [],
      features: itemData.features ?? [],
      includesAccessories: itemData.includesAccessories ?? [],
      sellerNotes: itemData.sellerNotes ?? null,
    };

    if (platform === 'all') {
      const result = generateDescriptionsForAllPlatforms(input);
      return NextResponse.json(result);
    }

    const validPlatforms = ['ebay', 'mercari', 'facebook', 'offerup', 'generic'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    const description = useLLM
      ? await generateLLMDescription(input, platform)
      : generateAlgorithmicDescription(input, platform);

    return NextResponse.json(description);
  } catch (error) {
    console.error('Description generation error:', error);
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 });
  }
}

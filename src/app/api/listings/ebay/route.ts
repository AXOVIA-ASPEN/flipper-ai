import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth-middleware';
import {
  createDraftListing,
  publishOffer,
  EBAY_CONDITIONS,
  type CreateEbayListingInput,
  type EbayCondition,
} from '@/lib/ebay-inventory';

/**
 * POST /api/listings/ebay
 *
 * Create a draft eBay listing via the Inventory API.
 * Optionally publish it immediately with `publish: true`.
 *
 * Required fields: sku, title, description, categoryId, condition, price, imageUrls
 * Optional: conditionDescription, currency, quantity, aspects, packageWeightLbs,
 *           packageDimensions, fulfillmentPolicyId, paymentPolicyId, returnPolicyId,
 *           merchantLocationKey, publish
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.EBAY_OAUTH_TOKEN) {
      return NextResponse.json(
        { error: 'eBay integration not configured (missing EBAY_OAUTH_TOKEN)' },
        { status: 503 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'sku',
      'title',
      'description',
      'categoryId',
      'condition',
      'price',
      'imageUrls',
    ] as const;
    const missing = requiredFields.filter((f) => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate condition
    const validConditions = Object.values(EBAY_CONDITIONS);
    if (!validConditions.includes(body.condition as EbayCondition)) {
      return NextResponse.json(
        {
          error: `Invalid condition "${body.condition}". Valid values: ${validConditions.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate price
    const price = parseFloat(body.price);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 });
    }

    // Validate imageUrls
    if (!Array.isArray(body.imageUrls) || body.imageUrls.length === 0) {
      return NextResponse.json({ error: 'imageUrls must be a non-empty array' }, { status: 400 });
    }

    // Validate title length
    if (body.title.length > 80) {
      return NextResponse.json({ error: 'Title must be 80 characters or fewer' }, { status: 400 });
    }

    const input: CreateEbayListingInput = {
      sku: String(body.sku).trim(),
      title: String(body.title).trim(),
      description: String(body.description),
      categoryId: String(body.categoryId),
      condition: body.condition as EbayCondition,
      conditionDescription: body.conditionDescription || undefined,
      price,
      currency: body.currency || 'USD',
      quantity: body.quantity ? parseInt(body.quantity, 10) : 1,
      imageUrls: body.imageUrls,
      aspects: body.aspects || undefined,
      packageWeightLbs: body.packageWeightLbs ? parseFloat(body.packageWeightLbs) : undefined,
      packageDimensions: body.packageDimensions || undefined,
      fulfillmentPolicyId: body.fulfillmentPolicyId || undefined,
      paymentPolicyId: body.paymentPolicyId || undefined,
      returnPolicyId: body.returnPolicyId || undefined,
      merchantLocationKey: body.merchantLocationKey || undefined,
    };

    // Create draft listing
    const result = await createDraftListing(input);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Failed to create eBay listing',
          details: result.errors,
        },
        { status: 502 }
      );
    }

    // Optionally publish immediately
    if (body.publish === true && result.offerId) {
      const publishResult = await publishOffer(result.offerId);
      if (publishResult.success) {
        return NextResponse.json({
          success: true,
          sku: result.sku,
          offerId: result.offerId,
          listingId: publishResult.listingId,
          status: 'PUBLISHED',
        });
      }
      // Draft was created but publish failed
      return NextResponse.json({
        success: true,
        sku: result.sku,
        offerId: result.offerId,
        status: 'DRAFT',
        publishError: publishResult.errors,
        message: 'Draft created but publish failed. You can retry publishing later.',
      });
    }

    return NextResponse.json({
      success: true,
      sku: result.sku,
      offerId: result.offerId,
      status: 'DRAFT',
    });
  } catch (error) {
    console.error('Error creating eBay listing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/listings/ebay
 *
 * Returns info about the eBay listing creation endpoint and required fields.
 */
export async function GET() {
  const configured = !!process.env.EBAY_OAUTH_TOKEN;

  return NextResponse.json({
    endpoint: 'POST /api/listings/ebay',
    status: configured ? 'ready' : 'missing_token',
    description: 'Create draft eBay listings via the Inventory API',
    requiredFields: {
      sku: 'Unique SKU identifier for the item',
      title: 'Item title (max 80 characters)',
      description: 'Item description (HTML allowed)',
      categoryId: 'eBay category ID',
      condition: `Item condition: ${Object.values(EBAY_CONDITIONS).join(', ')}`,
      price: 'Listing price (number)',
      imageUrls: 'Array of image URLs (first is primary)',
    },
    optionalFields: {
      conditionDescription: 'Description of condition (recommended for used items)',
      currency: 'Currency code (default: USD)',
      quantity: 'Available quantity (default: 1)',
      aspects: 'Item specifics as { key: [values] }',
      packageWeightLbs: 'Package weight in pounds',
      packageDimensions: '{ length, width, height } in inches',
      fulfillmentPolicyId: 'eBay fulfillment/shipping policy ID',
      paymentPolicyId: 'eBay payment policy ID',
      returnPolicyId: 'eBay return policy ID',
      merchantLocationKey: 'Merchant location key for item location',
      publish: 'Set true to publish immediately (default: draft only)',
    },
  });
}

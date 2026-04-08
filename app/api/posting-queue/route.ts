import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import {
  PostingQueueQuerySchema,
  CreatePostingQueueItemSchema,
  CreatePostingQueueBatchSchema,
  validateQuery,
  validateBody,
} from '@/lib/validations';
import { checkFeatureAccess } from '@/lib/tier-enforcement';
import { generateAlgorithmicTitle } from '@/lib/title-generator';
import { generateAlgorithmicDescription } from '@/lib/description-generator';
import type { TitleGeneratorInput } from '@/lib/title-generator';
import type { DescriptionGeneratorInput } from '@/lib/description-generator';

// Listing fields needed for auto-generating titles/descriptions when the
// caller does not supply explicit values. Kept narrow so the listing select
// stays cheap, and matches the inputs the generator modules consume.
type ListingForGeneration = {
  id: string;
  platform: string;
  userId: string | null;
  identifiedBrand: string | null;
  identifiedModel: string | null;
  identifiedVariant: string | null;
  identifiedCondition: string | null;
  condition: string | null;
  category: string | null;
  askingPrice: number;
  recommendedList: number | null;
  verifiedMarketValue: number | null;
  notes: string | null;
};

const LISTING_GENERATION_SELECT = {
  id: true,
  platform: true,
  userId: true,
  identifiedBrand: true,
  identifiedModel: true,
  identifiedVariant: true,
  identifiedCondition: true,
  condition: true,
  category: true,
  askingPrice: true,
  recommendedList: true,
  verifiedMarketValue: true,
  notes: true,
} as const;

/**
 * Map an UPPERCASE PostingQueueItem.targetPlatform to the lowercase key the
 * title-/description-generator modules expect. The schema enum uses
 * `FACEBOOK_MARKETPLACE`, which naïvely lowercases to `facebook_marketplace`
 * and does NOT match the generators' `'facebook'` key — so we special-case
 * that mapping. Craigslist is not in the generators' platform array, so it
 * falls through to `generic`.
 */
const GENERATOR_PLATFORM_MAP: Record<string, string> = {
  facebook_marketplace: 'facebook',
  craigslist: 'generic',
};

function toGeneratorPlatform(platform: string): string {
  const lower = platform.toLowerCase();
  return GENERATOR_PLATFORM_MAP[lower] ?? lower;
}

/**
 * Build a TitleGeneratorInput from a Listing row's identification fields.
 */
function buildTitleInput(listing: ListingForGeneration): TitleGeneratorInput {
  return {
    brand: listing.identifiedBrand || null,
    model: listing.identifiedModel || null,
    variant: listing.identifiedVariant || null,
    condition: listing.identifiedCondition || listing.condition || 'good',
    category: listing.category || null,
  };
}

/**
 * Build a DescriptionGeneratorInput from a Listing row's identification fields.
 */
function buildDescriptionInput(
  listing: ListingForGeneration
): DescriptionGeneratorInput {
  return {
    brand: listing.identifiedBrand || null,
    model: listing.identifiedModel || null,
    variant: listing.identifiedVariant || null,
    condition: listing.identifiedCondition || listing.condition || 'good',
    category: listing.category || null,
    askingPrice:
      listing.recommendedList ?? listing.verifiedMarketValue ?? listing.askingPrice,
    originalPrice: listing.askingPrice,
    sellerNotes: listing.notes || null,
  };
}

/**
 * Auto-generate the title/description fields for a posting queue item when
 * the caller has not supplied them. Uses the algorithmic generators (sync,
 * no API key) so batch creation stays fast and dependency-free; users who
 * want LLM-quality content call the explicit generate-resale-content endpoint
 * before posting.
 */
function resolveTitleAndDescription(
  listing: ListingForGeneration,
  targetPlatform: string,
  providedTitle: string | undefined,
  providedDescription: string | undefined
): { title: string | undefined; description: string | undefined } {
  if (providedTitle && providedDescription) {
    return { title: providedTitle, description: providedDescription };
  }

  const genPlatform = toGeneratorPlatform(targetPlatform);
  let resolvedTitle = providedTitle;
  let resolvedDescription = providedDescription;

  if (!resolvedTitle) {
    resolvedTitle = generateAlgorithmicTitle(buildTitleInput(listing), genPlatform).title;
  }
  if (!resolvedDescription) {
    resolvedDescription = generateAlgorithmicDescription(
      buildDescriptionInput(listing),
      genPlatform
    ).description;
  }

  return { title: resolvedTitle, description: resolvedDescription };
}

// GET /api/posting-queue - List posting queue items with filters
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    const { searchParams } = new URL(request.url);
    const parsed = validateQuery(PostingQueueQuerySchema, searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error },
        { status: 400 }
      );
    }

    const { limit, offset, status, targetPlatform, listingId } = parsed.data;

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (targetPlatform) where.targetPlatform = targetPlatform;
    if (listingId) where.listingId = listingId;

    const [items, total] = await Promise.all([
      prisma.postingQueueItem.findMany({
        where,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              platform: true,
              askingPrice: true,
              imageUrls: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.postingQueueItem.count({ where }),
    ]);

    return NextResponse.json({ items, total, limit, offset });
  } catch (error) {
    console.error('GET /api/posting-queue error:', error);
    return handleError(error);
  }
}

// POST /api/posting-queue - Queue a listing for posting to one or multiple platforms
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    // Enforce eBay cross-listing feature gate
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } });
    const featureCheck = checkFeatureAccess(user?.subscriptionTier, 'ebayCrossListing');
    if (!featureCheck.allowed) {
      throw new ForbiddenError(featureCheck.reason);
    }

    const body = await request.json();

    // Support batch creation (multiple platforms at once)
    if (body.platforms && Array.isArray(body.platforms)) {
      const parsed = validateBody(CreatePostingQueueBatchSchema, body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: parsed.error },
          { status: 400 }
        );
      }

      const { listingId, platforms, askingPrice, title, description } = parsed.data;

      // Verify listing exists and belongs to user. Select the identification
      // fields up front so we can auto-generate title/description per target
      // platform without re-fetching the listing inside the loop.
      const listing = (await prisma.listing.findFirst({
        where: { id: listingId, userId },
        select: LISTING_GENERATION_SELECT,
      })) as ListingForGeneration | null;
      if (!listing) {
        throw new NotFoundError('Listing not found');
      }

      // Filter out platforms where the listing already originated
      const filteredPlatforms = platforms.filter((p) => p !== listing.platform);
      if (filteredPlatforms.length === 0) {
        throw new ValidationError('Cannot post to the same platform the listing was scraped from');
      }

      // Create queue items, skipping duplicates. Each platform gets its own
      // auto-generated title/description so per-platform char limits and
      // tone are honored when the caller did not pass explicit content.
      const created = await Promise.all(
        filteredPlatforms.map((targetPlatform) => {
          const resolved = resolveTitleAndDescription(
            listing,
            targetPlatform,
            title,
            description
          );
          return prisma.postingQueueItem.upsert({
            where: {
              listingId_targetPlatform_userId: { listingId, targetPlatform, userId },
            },
            update: {},
            create: {
              userId,
              listingId,
              targetPlatform,
              askingPrice,
              title: resolved.title,
              description: resolved.description,
              status: 'PENDING',
            },
          });
        })
      );

      return NextResponse.json({ items: created, count: created.length }, { status: 201 });
    }

    // Single platform creation
    const parsed = validateBody(CreatePostingQueueItemSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error },
        { status: 400 }
      );
    }

    const { listingId, targetPlatform, askingPrice, title, description, scheduledAt } =
      parsed.data;

    // Verify listing exists and belongs to user. Select identification fields
    // so we can auto-generate title/description when the caller omits them.
    const listing = (await prisma.listing.findFirst({
      where: { id: listingId, userId },
      select: LISTING_GENERATION_SELECT,
    })) as ListingForGeneration | null;
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    if (targetPlatform === listing.platform) {
      throw new ValidationError('Cannot post to the same platform the listing was scraped from');
    }

    const resolved = resolveTitleAndDescription(
      listing,
      targetPlatform,
      title,
      description
    );

    const item = await prisma.postingQueueItem.upsert({
      where: {
        listingId_targetPlatform_userId: { listingId, targetPlatform, userId },
      },
      update: {
        askingPrice,
        title: resolved.title,
        description: resolved.description,
        scheduledAt: scheduledAt ?? undefined,
      },
      create: {
        userId,
        listingId,
        targetPlatform,
        askingPrice,
        title: resolved.title,
        description: resolved.description,
        scheduledAt: scheduledAt ?? undefined,
        status: 'PENDING',
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/posting-queue error:', error);
    return handleError(error);
  }
}

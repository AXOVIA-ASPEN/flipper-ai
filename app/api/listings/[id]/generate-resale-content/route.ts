/**
 * @file app/api/listings/[id]/generate-resale-content/route.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Unified resale content endpoint - generates titles and descriptions for one or all platforms.
 *
 * @description
 * POST /api/listings/[id]/generate-resale-content
 *
 * Generates SEO-optimized titles and platform-specific descriptions for a
 * purchased listing using the title-generator and description-generator
 * modules. Supports per-platform LLM generation, multi-platform "all" mode,
 * and an algorithmic fallback toggle. Gated to PRO tier (ebayCrossListing
 * feature). Listing ownership is enforced via scoped Prisma queries. The
 * endpoint normalizes UPPERCASE platform names to lowercase generator
 * platform names and maps `craigslist` to `generic` (Craigslist is not in
 * the generators' platform array).
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthUserId } from '@/lib/auth-middleware';
import {
  handleError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  RateLimitError,
} from '@/lib/errors';
import { checkFeatureAccess } from '@/lib/tier-enforcement';
import { rateLimit } from '@/lib/rate-limiter';
import { getClientIp } from '@/lib/api-security';
import {
  generateAlgorithmicTitle,
  generateLLMTitle,
  generateTitlesForAllPlatforms,
} from '@/lib/title-generator';
import {
  generateAlgorithmicDescription,
  generateLLMDescription,
  generateDescriptionsForAllPlatforms,
} from '@/lib/description-generator';
import type { TitleGeneratorInput, GeneratedTitle } from '@/lib/title-generator';
import type {
  DescriptionGeneratorInput,
  GeneratedDescription,
} from '@/lib/description-generator';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ALL_PLATFORMS = ['ebay', 'mercari', 'facebook', 'offerup'] as const;

const PLATFORM_TITLE_LIMITS: Record<string, number> = {
  ebay: 80,
  mercari: 40,
  facebook: 99,
  offerup: 70,
  generic: 80,
};

const PLATFORM_DESCRIPTION_WORD_LIMITS: Record<string, number> = {
  ebay: 500,
  mercari: 200,
  facebook: 250,
  offerup: 200,
  generic: 300,
};

/**
 * Normalize a platform value (any case, possibly UPPERCASE or schema-style
 * like `FACEBOOK_MARKETPLACE`) to the lowercase key the title- and
 * description-generator modules expect. Callers to this endpoint use the
 * short names (`facebook`, `ebay`, …) but we defend against the schema
 * enum form too so this helper can be reused anywhere a listing's
 * `targetPlatform` column flows through. Craigslist is not in the
 * generators' platform array, so it maps to `generic`.
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
 * POST /api/listings/[id]/generate-resale-content
 * Body: { platform?: string, useLLM?: boolean }
 *   - platform defaults to "all" (returns content for every supported marketplace)
 *   - useLLM defaults to true (algorithmic fallback when no API key or on error)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      throw new UnauthorizedError('Unauthorized');
    }

    // Throttle OpenAI-calling endpoint. The `/api/listings/` rate-limit config
    // lives in rate-limiter.ts; we enforce it here because middleware.ts does
    // not wire the rate limiter globally. Without this call, a PRO user could
    // hammer this route and burn OpenAI spend unthrottled.
    const ip = getClientIp(request);
    const rl = rateLimit(ip, new URL(request.url).pathname, userId);
    if (!rl.allowed) {
      throw new RateLimitError('Rate limit exceeded for resale content generation');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });
    const featureCheck = checkFeatureAccess(user?.subscriptionTier, 'ebayCrossListing');
    if (!featureCheck.allowed) {
      throw new ForbiddenError(featureCheck.reason);
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const requestedPlatform: string = (body.platform as string) || 'all';
    const useLLM: boolean = body.useLLM !== false; // default true

    // Validate platform input early so callers get a clear 422 instead of a confused generator
    const allowedPlatformInputs = new Set([
      'all',
      'ebay',
      'mercari',
      'facebook',
      'offerup',
      'craigslist',
    ]);
    if (!allowedPlatformInputs.has(requestedPlatform.toLowerCase())) {
      throw new ValidationError(
        `Invalid platform "${requestedPlatform}". Must be one of: all, ebay, mercari, facebook, offerup, craigslist`
      );
    }

    const listing = await prisma.listing.findFirst({
      where: { id, userId },
      include: {
        opportunity: { select: { purchasePrice: true, status: true } },
      },
    });
    if (!listing) {
      throw new NotFoundError('Listing not found');
    }

    // Business-rule gate: resale content is only meaningful once the user has
    // actually committed to the opportunity. Without this check, a PRO user
    // could burn OpenAI spend generating listings for items they have not
    // purchased (e.g. IDENTIFIED or CONTACTED status) — and the UI guard in
    // app/listings/[id]/page.tsx is cosmetic only (trivially bypassed by a
    // direct HTTP call). The story's Dev Note G8 specifies this exact gate.
    const RESALE_ELIGIBLE_STATUSES = new Set(['PURCHASED', 'LISTED', 'SOLD']);
    if (
      !listing.opportunity ||
      !RESALE_ELIGIBLE_STATUSES.has(listing.opportunity.status)
    ) {
      throw new ForbiddenError(
        'Resale content generation is only available once the opportunity has been purchased.'
      );
    }

    // Build generator inputs directly from listing data — fromIdentification()
    // signatures differ between modules and require ItemIdentification, not raw
    // listing fields, so we build inputs manually to keep parity.
    const condition =
      listing.identifiedCondition || listing.condition || 'good';

    const titleInput: TitleGeneratorInput = {
      brand: listing.identifiedBrand || null,
      model: listing.identifiedModel || null,
      variant: listing.identifiedVariant || null,
      condition,
      category: listing.category || null,
      keywords: listing.tags
        ? listing.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    };

    const askingPriceForDesc =
      listing.recommendedList ?? listing.verifiedMarketValue ?? listing.askingPrice;

    const descInput: DescriptionGeneratorInput = {
      brand: listing.identifiedBrand || null,
      model: listing.identifiedModel || null,
      variant: listing.identifiedVariant || null,
      condition,
      category: listing.category || null,
      askingPrice: askingPriceForDesc,
      originalPrice: listing.askingPrice,
      defects: [],
      features: [],
      sellerNotes: listing.notes || null,
    };

    const warnings: string[] = [];
    if (!listing.identifiedBrand && !listing.identifiedModel) {
      warnings.push(
        'Listing has not been AI-analyzed. Run analysis first for better results.'
      );
    }

    const lower = requestedPlatform.toLowerCase();
    let titles: GeneratedTitle[] = [];
    let descriptions: GeneratedDescription[] = [];
    let source: 'ai' | 'template' = useLLM ? 'ai' : 'template';

    if (lower === 'all') {
      if (useLLM) {
        // generateTitlesForAllPlatforms() / generateDescriptionsForAllPlatforms()
        // are algorithmic-only and ignore useLLM, so we loop and call the LLM
        // versions per-platform when caller asked for AI generation.
        const titleResults = await Promise.all(
          ALL_PLATFORMS.map((p) => generateLLMTitle(titleInput, p))
        );
        const descResults = await Promise.all(
          ALL_PLATFORMS.map((p) => generateLLMDescription(descInput, p))
        );
        titles = titleResults;
        descriptions = descResults;
      } else {
        const titleResult = generateTitlesForAllPlatforms(titleInput);
        const descResult = generateDescriptionsForAllPlatforms(descInput);
        titles = titleResult.titles;
        descriptions = descResult.descriptions;
        source = 'template';
      }
    } else {
      const genPlatform = toGeneratorPlatform(lower);
      const generatedTitle = useLLM
        ? await generateLLMTitle(titleInput, genPlatform)
        : generateAlgorithmicTitle(titleInput, genPlatform);
      const generatedDescription = useLLM
        ? await generateLLMDescription(descInput, genPlatform)
        : generateAlgorithmicDescription(descInput, genPlatform);

      titles = [generatedTitle];
      descriptions = [generatedDescription];
    }

    // The "primary" content surfaces first to users — pick eBay when
    // available (most-trafficked resale platform), otherwise the first item.
    const primaryTitle =
      titles.find((t) => t.platform === 'ebay') ?? titles[0];
    const primaryDescription =
      descriptions.find((d) => d.platform === 'ebay') ?? descriptions[0];

    return NextResponse.json({
      success: true,
      data: {
        titles,
        descriptions,
        primary: {
          title: primaryTitle?.title ?? '',
          description: primaryDescription?.description ?? '',
          platform: primaryTitle?.platform ?? 'generic',
        },
        limits: {
          titleChars: PLATFORM_TITLE_LIMITS,
          descriptionWords: PLATFORM_DESCRIPTION_WORD_LIMITS,
        },
        source,
        warnings,
      },
    });
  } catch (error) {
    return handleError(error, request.url);
  }
}

/**
 * @file src/lib/listing-price-calculator.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Optimal listing price calculator (Story 9.2 / FR-RELIST-03).
 *
 * @description
 * Computes the recommended listing price that achieves a target profit
 * margin AFTER platform fees and shipping costs. Reads listing data
 * (verifiedMarketValue, estimatedShippingCost, recommendedList, owning
 * Opportunity.purchasePrice) and per-user platform fee rates from
 * UserSettings via the Prisma singleton at @/lib/db.
 *
 * Core formula:
 *   costBasis        = purchasePrice + estimatedShippingCost
 *   recommendedPrice = costBasis / (1 - feeRateDecimal - targetMarginDecimal)
 *
 * Special cases handled:
 *   • Free items ($0 cost basis) → market-based pricing
 *     verifiedMarketValue * (1 - feeRateDecimal) * 0.85
 *   • Pre-purchase items (IDENTIFIED/CONTACTED) → fall back to
 *     listing.askingPrice and mark `isProjected: true`
 *   • Verified market data present → cap at marketCapPercent (default 0.95)
 *     of verifiedMarketValue. If the cap drops the price below cost basis,
 *     emit a `lossWarning` and report the loss amount instead of silently
 *     recommending a loss-making list price.
 *   • Margin + fee >= 100% → throw ValidationError (denominator <= 0).
 *   • Fee rate stored as a value > 100 → throw ConfigurationError (data is
 *     a percentage, not a decimal — anything > 1.0 after dividing by 100
 *     means the source row is corrupt).
 *
 * The calculator also surfaces the LLM `recommendedList` from the Listing
 * model as `aiRecommendedPrice` for comparison. When the formula price and
 * the LLM price differ by more than 15%, a `priceDiscrepancyNote` explains
 * the gap so the UI can show a side-by-side warning.
 *
 * `calculateMultiPlatformPrices()` runs the single-platform calculator for
 * every supported marketplace in one shot, sorts the results by estimated
 * profit, and surfaces a `bestPlatform` recommendation. Platforms where
 * margin+fee make the formula impossible are flagged with `impossible:true`
 * instead of throwing — that way the UI can gray them out without losing
 * the rest of the data.
 */

import prisma from './db';
import {
  NotFoundError,
  ValidationError,
  ConfigurationError,
} from './errors';

export const DEFAULT_TARGET_MARGIN_PERCENT = 30;
export const DEFAULT_MARKET_CAP_PERCENT = 0.95;
const FREE_ITEM_DISCOUNT_FACTOR = 0.85;
const PRICE_DISCREPANCY_THRESHOLD = 0.15;

/** Supported target platforms for the calculator. */
export type TargetPlatform =
  | 'ebay'
  | 'mercari'
  | 'facebook'
  | 'offerup'
  | 'craigslist';

export const SUPPORTED_PLATFORMS: TargetPlatform[] = [
  'ebay',
  'mercari',
  'facebook',
  'offerup',
  'craigslist',
];

/** Per-platform breakdown details surfaced to the UI. */
export interface PriceBreakdown {
  /** Whether the verified-market-value cap was applied. */
  cappedByMarket: boolean;
  /** Loss amount when capped price falls below cost basis (cents). */
  lossAmount?: number;
  /** True when the calculator switched to free-item market-based pricing. */
  freeItemPricing: boolean;
  /** Optional explanation when LLM and formula prices diverge >15%. */
  priceDiscrepancyNote?: string;
  /** Reason a platform is impossible — only set when `impossible: true`. */
  impossibleReason?: string;
}

/** Result returned by the per-platform price calculator. */
export interface ListingPriceResult {
  targetPlatform: TargetPlatform;
  recommendedPrice: number;
  estimatedFees: number;
  estimatedProfit: number;
  estimatedShippingCost: number;
  targetMarginPercent: number;
  feeRatePercent: number;
  verifiedMarketValue: number | null;
  costBasis: number;
  /** True when calculation uses askingPrice fallback (pre-purchase). */
  isProjected: boolean;
  /** True when verified market data was available. */
  marketDataAvailable: boolean;
  /** True when the cap forces the recommended price below cost basis. */
  lossWarning: boolean;
  /** LLM-suggested list price from Listing.recommendedList for comparison. */
  aiRecommendedPrice: number | null;
  priceBreakdown: PriceBreakdown;
  /** True when this platform's fee+margin make the formula unsolvable. */
  impossible: boolean;
}

/** Inputs for the per-platform calculator. */
export interface CalculateOptimalListingPriceInput {
  listingId: string;
  userId: string;
  targetPlatform: TargetPlatform;
  targetMarginPercent?: number;
  marketCapPercent?: number;
}

/** Inputs for the multi-platform comparison. */
export interface CalculateMultiPlatformPricesInput {
  listingId: string;
  userId: string;
  targetMarginPercent?: number;
  marketCapPercent?: number;
}

/** Aggregate result from the multi-platform comparison. */
export interface MultiPlatformPriceResult {
  prices: ListingPriceResult[];
  bestPlatform: TargetPlatform | null;
  isProjected: boolean;
}

interface LoadedListingContext {
  listing: ListingRow;
  opportunity: OpportunityRow | null;
  costBasis: number;
  isProjected: boolean;
  isFreeItem: boolean;
}

interface ListingRow {
  id: string;
  userId: string | null;
  askingPrice: number;
  estimatedShippingCost: number | null;
  verifiedMarketValue: number | null;
  recommendedList: number | null;
  compMatchConfidence: string | null;
}

interface OpportunityRow {
  purchasePrice: number | null;
  status: string;
}

interface UserSettingsRow {
  feeRateEbay: number;
  feeRateMercari: number;
  feeRateFacebook: number;
  feeRateOfferup: number;
  feeRateCraigslist: number;
}

/**
 * Compute the optimal listing price for a single target platform.
 *
 * Throws:
 *  - NotFoundError if the listing does not exist or is not owned by user.
 *  - ValidationError if margin+fee >= 100%.
 *  - ConfigurationError if a stored fee rate is > 100 (corrupt row).
 */
export async function calculateOptimalListingPrice(
  input: CalculateOptimalListingPriceInput
): Promise<ListingPriceResult> {
  const targetMarginPercent =
    input.targetMarginPercent ?? DEFAULT_TARGET_MARGIN_PERCENT;
  const marketCapPercent = input.marketCapPercent ?? DEFAULT_MARKET_CAP_PERCENT;

  const ctx = await loadListingContext(input.listingId, input.userId);
  const settings = await loadUserSettings(input.userId);
  const feeRatePercent = pickFeeRatePercent(settings, input.targetPlatform);

  return computeForPlatform({
    ctx,
    targetPlatform: input.targetPlatform,
    targetMarginPercent,
    marketCapPercent,
    feeRatePercent,
    throwOnImpossible: true,
  });
}

/**
 * Compute optimal listing prices for ALL supported platforms in one call.
 * Results are sorted by `estimatedProfit` descending; impossible platforms
 * (where fee+margin >= 100%) are returned with `impossible: true` rather
 * than thrown so the UI can present them as grayed-out rows.
 */
export async function calculateMultiPlatformPrices(
  input: CalculateMultiPlatformPricesInput
): Promise<MultiPlatformPriceResult> {
  const targetMarginPercent =
    input.targetMarginPercent ?? DEFAULT_TARGET_MARGIN_PERCENT;
  const marketCapPercent = input.marketCapPercent ?? DEFAULT_MARKET_CAP_PERCENT;

  const ctx = await loadListingContext(input.listingId, input.userId);
  const settings = await loadUserSettings(input.userId);

  const prices = SUPPORTED_PLATFORMS.map((platform) => {
    const feeRatePercent = pickFeeRatePercent(settings, platform);
    return computeForPlatform({
      ctx,
      targetPlatform: platform,
      targetMarginPercent,
      marketCapPercent,
      feeRatePercent,
      throwOnImpossible: false,
    });
  });

  prices.sort((a, b) => b.estimatedProfit - a.estimatedProfit);

  const possible = prices.find((p) => !p.impossible);
  return {
    prices,
    bestPlatform: possible ? possible.targetPlatform : null,
    isProjected: ctx.isProjected,
  };
}

// ── Internals ────────────────────────────────────────────────────────────────

interface ComputeArgs {
  ctx: LoadedListingContext;
  targetPlatform: TargetPlatform;
  targetMarginPercent: number;
  marketCapPercent: number;
  feeRatePercent: number;
  throwOnImpossible: boolean;
}

function computeForPlatform(args: ComputeArgs): ListingPriceResult {
  const {
    ctx,
    targetPlatform,
    targetMarginPercent,
    marketCapPercent,
    feeRatePercent,
    throwOnImpossible,
  } = args;
  const { listing, costBasis, isProjected, isFreeItem } = ctx;
  const feeRateDecimal = feeRatePercent / 100;
  const targetMarginDecimal = targetMarginPercent / 100;

  // Configuration guard: a stored fee value > 100% is almost certainly a
  // corrupted row (someone wrote a decimal instead of a percentage and we
  // accidentally double-converted). Refuse to calculate against bad data.
  if (feeRateDecimal > 1.0) {
    throw new ConfigurationError(
      `Fee rate for ${targetPlatform} (${feeRatePercent}) exceeds 100% — check UserSettings`
    );
  }

  const verifiedMarketValue = listing.verifiedMarketValue ?? null;
  const marketDataAvailable =
    verifiedMarketValue !== null && listing.compMatchConfidence !== 'insufficient';
  const shippingCost = roundCents(listing.estimatedShippingCost ?? 0);

  // Margin+fee guard. The denominator (1 - fee - margin) goes to zero or
  // negative the moment they sum to 100%, producing Infinity or a negative
  // recommended price. Either we throw (single-platform call) or flag the
  // platform as impossible (multi-platform comparison).
  if (feeRateDecimal + targetMarginDecimal >= 1.0) {
    if (throwOnImpossible) {
      throw new ValidationError(
        'Target margin plus platform fees cannot equal or exceed 100%'
      );
    }
    return {
      targetPlatform,
      recommendedPrice: 0,
      estimatedFees: 0,
      estimatedProfit: 0,
      estimatedShippingCost: shippingCost,
      targetMarginPercent,
      feeRatePercent,
      verifiedMarketValue,
      costBasis,
      isProjected,
      marketDataAvailable,
      lossWarning: false,
      aiRecommendedPrice: listing.recommendedList ?? null,
      priceBreakdown: {
        cappedByMarket: false,
        freeItemPricing: false,
        impossibleReason:
          'Target margin plus platform fees cannot equal or exceed 100%',
      },
      impossible: true,
    };
  }

  // Free items: cost basis is zero (or no purchase price recorded). The
  // standard formula collapses to zero, so price purely against market data.
  let recommendedPrice: number;
  let cappedByMarket = false;
  let lossAmount: number | undefined;
  let lossWarning = false;
  const breakdown: PriceBreakdown = {
    cappedByMarket: false,
    freeItemPricing: false,
  };

  if (isFreeItem && verifiedMarketValue !== null) {
    recommendedPrice = roundCents(
      verifiedMarketValue * (1 - feeRateDecimal) * FREE_ITEM_DISCOUNT_FACTOR
    );
    breakdown.freeItemPricing = true;
  } else {
    const denominator = 1 - feeRateDecimal - targetMarginDecimal;
    recommendedPrice = roundCents(costBasis / denominator);

    // Competitive cap: never list above 95% (default) of verified market.
    if (marketDataAvailable && verifiedMarketValue !== null) {
      const cap = roundCents(verifiedMarketValue * marketCapPercent);
      if (recommendedPrice > cap) {
        recommendedPrice = cap;
        cappedByMarket = true;
      }
    }

    // Loss warning: if the cap drops us below cost, surface the loss instead
    // of silently recommending a loss-making list price.
    if (cappedByMarket && recommendedPrice < costBasis) {
      lossWarning = true;
      lossAmount = roundCents(costBasis - recommendedPrice);
    }
  }

  breakdown.cappedByMarket = cappedByMarket;
  if (lossAmount !== undefined) breakdown.lossAmount = lossAmount;

  const estimatedFees = roundCents(recommendedPrice * feeRateDecimal);
  const purchasePortion = isFreeItem
    ? 0
    : Math.max(costBasis - shippingCost, 0);
  const estimatedProfit = roundCents(
    recommendedPrice - estimatedFees - purchasePortion - shippingCost
  );

  // LLM vs formula sanity check. The LLM (description-generator's
  // recommendedList) is opinionated and often diverges from the cold-math
  // recommendation. Surface a note when the gap is wide so the UI can show
  // both numbers side-by-side instead of pretending one is canonical.
  const aiRecommendedPrice = listing.recommendedList ?? null;
  if (aiRecommendedPrice && recommendedPrice > 0) {
    const delta = Math.abs(aiRecommendedPrice - recommendedPrice) / recommendedPrice;
    if (delta > PRICE_DISCREPANCY_THRESHOLD) {
      breakdown.priceDiscrepancyNote =
        `Formula price ($${recommendedPrice.toFixed(2)}) differs from AI ` +
        `recommendation ($${aiRecommendedPrice.toFixed(2)}) by ` +
        `${(delta * 100).toFixed(0)}%. Review market and competitor data.`;
    }
  }

  return {
    targetPlatform,
    recommendedPrice,
    estimatedFees,
    estimatedProfit,
    estimatedShippingCost: shippingCost,
    targetMarginPercent,
    feeRatePercent,
    verifiedMarketValue,
    costBasis,
    isProjected,
    marketDataAvailable,
    lossWarning,
    aiRecommendedPrice,
    priceBreakdown: breakdown,
    impossible: false,
  };
}

async function loadListingContext(
  listingId: string,
  userId: string
): Promise<LoadedListingContext> {
  const listing = (await prisma.listing.findFirst({
    where: { id: listingId, userId },
    include: { opportunity: true },
  })) as (ListingRow & { opportunity: OpportunityRow | null }) | null;

  if (!listing) {
    throw new NotFoundError('Listing');
  }

  const opportunity = listing.opportunity;
  const purchased =
    opportunity !== null &&
    opportunity.status !== 'IDENTIFIED' &&
    opportunity.status !== 'CONTACTED' &&
    opportunity.purchasePrice !== null &&
    opportunity.purchasePrice !== undefined;

  // Cost basis fallback chain: Opportunity.purchasePrice → Listing.askingPrice
  // (purchasePrice can be 0 for free items — that's a real value, not "missing")
  let purchasePrice: number;
  let isProjected: boolean;
  if (purchased) {
    purchasePrice = opportunity!.purchasePrice as number;
    isProjected = false;
  } else {
    purchasePrice = listing.askingPrice;
    isProjected = true;
  }

  const isFreeItem = purchasePrice === 0;
  const shipping = listing.estimatedShippingCost ?? 0;
  const costBasis = roundCents(purchasePrice + shipping);

  return {
    listing: {
      id: listing.id,
      userId: listing.userId,
      askingPrice: listing.askingPrice,
      estimatedShippingCost: listing.estimatedShippingCost,
      verifiedMarketValue: listing.verifiedMarketValue,
      recommendedList: listing.recommendedList,
      compMatchConfidence: listing.compMatchConfidence,
    },
    opportunity: opportunity ?? null,
    costBasis,
    isProjected,
    isFreeItem,
  };
}

async function loadUserSettings(userId: string): Promise<UserSettingsRow> {
  const settings = (await prisma.userSettings.findUnique({
    where: { userId },
  })) as UserSettingsRow | null;

  // Fall back to default fee rates when the user has not customised them.
  // Defaults match prisma/schema.prisma#UserSettings (Story 4.2).
  return (
    settings ?? {
      feeRateEbay: 13.0,
      feeRateMercari: 10.0,
      feeRateFacebook: 5.0,
      feeRateOfferup: 12.9,
      feeRateCraigslist: 0.0,
    }
  );
}

function pickFeeRatePercent(
  settings: UserSettingsRow,
  platform: TargetPlatform
): number {
  switch (platform) {
    case 'ebay':
      return settings.feeRateEbay;
    case 'mercari':
      return settings.feeRateMercari;
    case 'facebook':
      return settings.feeRateFacebook;
    case 'offerup':
      return settings.feeRateOfferup;
    case 'craigslist':
      return settings.feeRateCraigslist;
  }
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

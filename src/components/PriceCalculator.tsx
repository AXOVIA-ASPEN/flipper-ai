/**
 * @file src/components/PriceCalculator.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.2
 * @brief PriceCalculator client component (Story 9.2 / FR-RELIST-03).
 *
 * @description
 * Renders the optimal listing price hero (estimated profit + recommended
 * price), best-platform badge, target margin slider+input, per-platform
 * fee/profit table, and a market value comparison bar.
 *
 * Story 14.6 (Frontend Design Migration): visual rebuild using canonical
 * .fp-glass root surface, .fp-input numeric fields, .fp-btn-primary /
 * .fp-btn-ghost buttons, .fp-alert-warn / .fp-alert-danger banners,
 * .fp-badge-purple best-platform chip, and .fp-metric-num hero numbers.
 * Range slider now inherits the canonical purple gradient thumb defined
 * in app/globals.css:565-602 (no local accent-* class). No logic change.
 *
 * Recalculation strategy: the component fetches `data.prices` ONCE from
 * `/api/listings/[id]/optimal-price` (GET) and stores the per-platform
 * `costBasis`, `verifiedMarketValue`, `feeRatePercent`, and metadata. When
 * the user drags the margin slider OR overrides the hypothetical purchase
 * price (projected mode), the formula is re-applied client-side — no API
 * round-trip per change. A "Refresh" button re-fetches and shows a
 * "last updated" timestamp.
 *
 * Per-platform max margin: the slider's upper bound is computed from the
 * highest fee rate across loaded platforms as
 * `floor((1 - maxFeeDecimal) * 100) - 1`, so the user can never drag into
 * a margin+fee >= 100% region for any platform.
 *
 * Override before queueing: each platform row has an inline editable price
 * field (defaulted to the recommended price). Clicking "List on [Platform]"
 * uses the user's edited value, satisfying the "user can override before
 * queueing" requirement (Task 5.4).
 *
 * Accessibility: the slider exposes aria-valuemin/max/now/text and is
 * paired with a numeric input field for keyboard precision. Results are
 * wrapped in `aria-live="polite"` so screen readers announce updates.
 * Best platform is conveyed with both an icon and text (never color
 * alone). Touch targets meet the 44x44 minimum on the slider thumb.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { FREE_ITEM_DISCOUNT_FACTOR } from '@/lib/listing-price-constants';
import { LoadingSkeleton, EmptyState } from '@/components/ui';

const PLATFORM_LABELS: Record<string, string> = {
  ebay: 'eBay',
  mercari: 'Mercari',
  facebook: 'Facebook Marketplace',
  offerup: 'OfferUp',
  craigslist: 'Craigslist',
};

/**
 * Map a Listing.platform value (UPPERCASE schema enum, e.g. "EBAY",
 * "FACEBOOK_MARKETPLACE") to the lowercase calculator key. Used to hide
 * the source-platform row from the table since the posting-queue API
 * rejects listings posted to their origin platform.
 */
function normalizeSourcePlatform(value: string | null | undefined): string | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.startsWith('facebook')) return 'facebook';
  if (lower in PLATFORM_LABELS) return lower;
  return null;
}

interface PriceBreakdown {
  cappedByMarket: boolean;
  lossAmount?: number;
  freeItemPricing: boolean;
  priceDiscrepancyNote?: string;
  impossibleReason?: string;
  insufficientData?: boolean;
  fallbackMessage?: string;
}

interface ServerPriceResult {
  targetPlatform: string;
  recommendedPrice: number;
  estimatedFees: number;
  estimatedProfit: number;
  estimatedShippingCost: number;
  targetMarginPercent: number;
  feeRatePercent: number;
  verifiedMarketValue: number | null;
  costBasis: number;
  isProjected: boolean;
  marketDataAvailable: boolean;
  lossWarning: boolean;
  aiRecommendedPrice: number | null;
  priceBreakdown: PriceBreakdown;
  impossible: boolean;
}

interface OptimalPriceResponse {
  success: boolean;
  data?: {
    prices: ServerPriceResult[];
    bestPlatform: string | null;
    isProjected: boolean;
  };
  error?: { detail?: string; code?: string };
}

interface PriceCalculatorProps {
  listingId: string;
  /**
   * The platform the listing was scraped from. The matching row will be
   * hidden from the per-platform comparison table because the posting
   * queue rejects same-platform reposts. Accepts both UPPERCASE schema
   * values ("EBAY", "FACEBOOK_MARKETPLACE") and lowercase keys.
   */
  sourcePlatform?: string | null;
  /**
   * Callback fired when the user clicks "List on [Platform]". Receives
   * the chosen platform key and the FINAL price after any user override.
   */
  onListPlatform?: (platform: string, finalPrice: number) => void | Promise<void>;
}

const DEFAULT_MARGIN = 30;
const MIN_MARGIN = 5;
const FALLBACK_MAX_MARGIN = 80;

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Re-runs the calculator formula client-side using the cached server data
 * plus an optional cost-basis override (used when the user supplies a
 * hypothetical purchase price in projected mode).
 */
function recalcForMargin(
  base: ServerPriceResult,
  marginPercent: number,
  marketCapPercent = 0.95,
  costBasisOverride?: number
): ServerPriceResult {
  // Pass-through cases the calculator already decided definitively. Margin
  // changes don't change "free item with no market data" — there's nothing
  // to recompute. Same for impossible-by-fee rows.
  if (base.priceBreakdown.insufficientData) {
    return base;
  }

  const feeDecimal = base.feeRatePercent / 100;
  const marginDecimal = marginPercent / 100;
  const shipping = base.estimatedShippingCost;
  const isFreeItem = base.priceBreakdown.freeItemPricing;
  const costBasis = costBasisOverride ?? base.costBasis;

  if (feeDecimal + marginDecimal >= 1.0 && !isFreeItem) {
    return {
      ...base,
      targetMarginPercent: marginPercent,
      costBasis,
      recommendedPrice: 0,
      estimatedFees: 0,
      estimatedProfit: 0,
      lossWarning: false,
      impossible: true,
      priceBreakdown: {
        ...base.priceBreakdown,
        cappedByMarket: false,
        impossibleReason:
          'Target margin plus platform fees cannot equal or exceed 100%',
      },
    };
  }

  let recommendedPrice: number;
  let cappedByMarket = false;
  let lossAmount: number | undefined;
  let lossWarning = false;

  if (isFreeItem && base.verifiedMarketValue !== null) {
    recommendedPrice = roundCents(
      base.verifiedMarketValue * (1 - feeDecimal) * FREE_ITEM_DISCOUNT_FACTOR
    );
  } else {
    recommendedPrice = roundCents(costBasis / (1 - feeDecimal - marginDecimal));
    if (base.marketDataAvailable && base.verifiedMarketValue !== null && base.verifiedMarketValue > 0) {
      const cap = roundCents(base.verifiedMarketValue * marketCapPercent);
      if (recommendedPrice > cap) {
        recommendedPrice = cap;
        cappedByMarket = true;
      }
    }
    if (cappedByMarket && recommendedPrice < costBasis) {
      lossWarning = true;
      lossAmount = roundCents(costBasis - recommendedPrice);
    }
  }

  const estimatedFees = roundCents(recommendedPrice * feeDecimal);
  const purchasePortion = isFreeItem ? 0 : Math.max(costBasis - shipping, 0);
  const estimatedProfit = roundCents(
    recommendedPrice - estimatedFees - purchasePortion - shipping
  );

  // Free-item path can still produce a loss when shipping > net proceeds.
  // Mirror the server-side check so the slider never silently flips a
  // profitable item into a loss without warning the user.
  if (isFreeItem && !lossWarning && estimatedProfit < 0) {
    lossWarning = true;
    lossAmount = roundCents(-estimatedProfit);
  }

  return {
    ...base,
    targetMarginPercent: marginPercent,
    costBasis,
    recommendedPrice,
    estimatedFees,
    estimatedProfit,
    lossWarning,
    impossible: false,
    priceBreakdown: {
      ...base.priceBreakdown,
      cappedByMarket,
      lossAmount,
    },
  };
}

export default function PriceCalculator({
  listingId,
  sourcePlatform,
  onListPlatform,
}: PriceCalculatorProps) {
  const [serverPrices, setServerPrices] = useState<ServerPriceResult[] | null>(
    null
  );
  const [isProjected, setIsProjected] = useState<boolean>(false);
  const [marginPercent, setMarginPercent] = useState<number>(DEFAULT_MARGIN);
  const [marginInputValue, setMarginInputValue] = useState<string>(
    String(DEFAULT_MARGIN)
  );
  /**
   * User-entered hypothetical purchase price (projected mode only). Null
   * means "use server-supplied cost basis as-is". Editing this value
   * triggers a client-side recalculation across all platforms.
   */
  const [hypotheticalPurchasePrice, setHypotheticalPurchasePrice] = useState<
    number | null
  >(null);
  const [hypotheticalInputValue, setHypotheticalInputValue] = useState<string>('');
  /**
   * Per-platform user-edited list prices. When set, the "List on X" button
   * sends this price to the posting queue instead of the recommended price.
   */
  const [overridePrices, setOverridePrices] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const normalizedSource = useMemo(
    () => normalizeSourcePlatform(sourcePlatform),
    [sourcePlatform]
  );

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/optimal-price`);
      const json = (await res.json()) as OptimalPriceResponse;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.detail || 'Failed to fetch optimal prices');
      }
      setServerPrices(json.data.prices);
      setIsProjected(json.data.isProjected);
      setLastUpdated(new Date());
      // Seed the hypothetical input on first load. Cost basis already
      // includes shipping, so derive the implied purchase price from any
      // platform row (they all share the same costBasis).
      if (json.data.prices.length > 0) {
        const sample = json.data.prices[0];
        const impliedPurchase = roundCents(
          sample.costBasis - sample.estimatedShippingCost
        );
        setHypotheticalInputValue(String(impliedPurchase));
      }
      setOverridePrices({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load prices');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Per-platform max margin so the slider can never drive any platform
  // into the impossible (margin + fee >= 100%) region. Floor of the worst
  // platform's headroom, minus 1 for safety.
  const dynamicMaxMargin = useMemo(() => {
    if (!serverPrices || serverPrices.length === 0) return FALLBACK_MAX_MARGIN;
    const maxFeeDecimal = Math.max(
      ...serverPrices.map((p) => p.feeRatePercent / 100)
    );
    const headroom = Math.floor((1 - maxFeeDecimal) * 100) - 1;
    return Math.max(MIN_MARGIN, Math.min(FALLBACK_MAX_MARGIN, headroom));
  }, [serverPrices]);

  // Clamp current margin if the dynamic max shrinks below it (e.g. after a
  // refresh that returned higher fee rates).
  useEffect(() => {
    if (marginPercent > dynamicMaxMargin) {
      setMarginPercent(dynamicMaxMargin);
      setMarginInputValue(String(dynamicMaxMargin));
    }
  }, [dynamicMaxMargin, marginPercent]);

  // Recalculated prices for the current margin (client-side, no API call).
  const recalculated = useMemo(() => {
    if (!serverPrices) return [];
    const overrideCostBasis =
      isProjected && hypotheticalPurchasePrice !== null
        ? undefined // computed per-row below since shipping varies
        : undefined;

    const next = serverPrices.map((p) => {
      let costOverride: number | undefined;
      if (isProjected && hypotheticalPurchasePrice !== null) {
        costOverride = roundCents(
          hypotheticalPurchasePrice + p.estimatedShippingCost
        );
      }
      return recalcForMargin(p, marginPercent, 0.95, costOverride);
    });
    next.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
    return next;
    // overrideCostBasis is unused but kept for clarity of intent
    void overrideCostBasis;
  }, [serverPrices, marginPercent, hypotheticalPurchasePrice, isProjected]);

  // Filter out the source platform — posting-queue API rejects same-platform
  // reposts, and showing a button that always errors is hostile UX.
  const visibleRecalculated = useMemo(
    () =>
      normalizedSource
        ? recalculated.filter((p) => p.targetPlatform !== normalizedSource)
        : recalculated,
    [recalculated, normalizedSource]
  );

  const possible = visibleRecalculated.find(
    (p) => !p.impossible && !p.priceBreakdown.insufficientData
  );
  const bestPlatform = possible?.targetPlatform ?? null;
  const heroProfit = possible?.estimatedProfit ?? 0;
  const heroPrice = possible?.recommendedPrice ?? 0;

  const insufficientData = visibleRecalculated.every(
    (p) => p.priceBreakdown.insufficientData
  );
  const showEstimatedBanner =
    !insufficientData && possible !== undefined && !possible.marketDataAvailable;

  const handleSliderChange = useCallback(
    (value: number) => {
      const clamped = Math.max(MIN_MARGIN, Math.min(dynamicMaxMargin, value));
      setMarginPercent(clamped);
      setMarginInputValue(String(clamped));
    },
    [dynamicMaxMargin]
  );

  const handleInputChange = useCallback(
    (raw: string) => {
      setMarginInputValue(raw);
      const parsed = parseFloat(raw);
      if (!Number.isNaN(parsed)) {
        const clamped = Math.max(MIN_MARGIN, Math.min(dynamicMaxMargin, parsed));
        setMarginPercent(clamped);
      }
    },
    [dynamicMaxMargin]
  );

  const handleInputBlur = useCallback(() => {
    // Normalize the displayed value back to the clamped state on blur so an
    // invalid in-progress entry like "-5" can't linger after the user moves
    // focus.
    setMarginInputValue(String(marginPercent));
  }, [marginPercent]);

  const handleHypotheticalChange = useCallback((raw: string) => {
    setHypotheticalInputValue(raw);
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      setHypotheticalPurchasePrice(parsed);
    } else if (raw === '') {
      setHypotheticalPurchasePrice(null);
    }
  }, []);

  const handleOverrideChange = useCallback((platform: string, raw: string) => {
    setOverridePrices((prev) => ({ ...prev, [platform]: raw }));
  }, []);

  const handleListClick = useCallback(
    async (platform: string, recommendedPrice: number) => {
      const overrideRaw = overridePrices[platform];
      let finalPrice = recommendedPrice;
      if (overrideRaw !== undefined && overrideRaw !== '') {
        const parsed = parseFloat(overrideRaw);
        if (!Number.isNaN(parsed) && parsed > 0) {
          finalPrice = roundCents(parsed);
        }
      }
      try {
        setSubmitting(platform);
        await onListPlatform?.(platform, finalPrice);
      } finally {
        setSubmitting(null);
      }
    },
    [overridePrices, onListPlatform]
  );

  if (loading && !serverPrices) {
    return <LoadingSkeleton variant="card" data-testid="price-calculator-loading" />;
  }

  if (error) {
    return (
      <div
        className="fp-glass p-6 rounded-lg"
        role="alert"
        data-testid="price-calculator-error"
      >
        <div className="flex items-start justify-between gap-3">
          <p style={{ color: '#fca5a5' }}>{error}</p>
          <button
            type="button"
            onClick={fetchPrices}
            className="fp-btn-primary text-xs px-3 py-1.5"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!visibleRecalculated.length) {
    return (
      <EmptyState
        title="No pricing data"
        message="No pricing data available for this listing."
        data-testid="price-calculator-empty"
      />
    );
  }

  // Insufficient-data state: free item with no verified market value.
  // Surface a single banner instead of pretending the table has prices.
  if (insufficientData) {
    return (
      <div
        className="fp-glass p-6 rounded-lg space-y-4"
        data-testid="price-calculator"
      >
        <div
          className="fp-alert-warn px-4 py-3"
          role="alert"
          style={{ color: '#fcd34d' }}
        >
          <strong className="block mb-1">⚠ Cannot recommend a price yet</strong>
          {visibleRecalculated[0]?.priceBreakdown.fallbackMessage ??
            'Insufficient data to compute an optimal listing price.'}
        </div>
        <button
          type="button"
          onClick={fetchPrices}
          className="fp-btn-ghost text-xs px-3 py-1.5"
        >
          Verify Market Value
        </button>
      </div>
    );
  }

  return (
    <div
      className="fp-glass p-6 rounded-lg space-y-6"
      data-testid="price-calculator"
    >
      {/* Projected banner — pre-purchase mode (AC-5) */}
      {isProjected && (
        <div className="fp-alert-warn px-4 py-3 space-y-2" style={{ color: '#fcd34d' }}>
          <div>
            <span
              className="inline-block px-2 py-0.5 mr-2 text-xs font-semibold rounded"
              style={{ color: '#fcd34d', background: 'rgba(251,191,36,0.2)' }}
              aria-label="Projected pricing mode"
            >
              ◇ Projected
            </span>
            <span className="text-sm" style={{ color: '#fcd34d' }}>
              This listing has not been purchased yet. Pricing uses a hypothetical
              cost basis you can override below.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="price-calc-hypothetical"
              className="text-xs font-semibold"
              style={{ color: '#fcd34d' }}
            >
              Hypothetical purchase price:
            </label>
            <span style={{ color: '#fcd34d' }}>$</span>
            <input
              id="price-calc-hypothetical"
              type="number"
              min={0}
              step={0.01}
              value={hypotheticalInputValue}
              onChange={(e) => handleHypotheticalChange(e.target.value)}
              aria-label="Hypothetical purchase price"
              className="fp-input w-28 text-right"
            />
          </div>
        </div>
      )}

      {/* Estimated market data warning (AC-2 / Task 4.7) */}
      {showEstimatedBanner && (
        <div
          className="fp-alert-warn px-4 py-3 flex items-start justify-between gap-3"
          style={{ color: '#fcd34d' }}
        >
          <div className="text-sm">
            <strong className="block mb-0.5">Market value is estimated</strong>
            Pricing is based on algorithmic estimates rather than verified sold-comparable
            data. Verify the market value for the most accurate recommendation.
          </div>
          <button
            type="button"
            onClick={fetchPrices}
            className="fp-btn-ghost text-xs px-3 py-1.5 whitespace-nowrap"
          >
            Verify Market Value
          </button>
        </div>
      )}

      {/* Hero numbers — profit first, then list price */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        aria-live="polite"
        data-testid="price-calculator-hero"
      >
        <div className="fp-glass-sm p-4 rounded-lg">
          <div
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: '#6ee7b7' }}
          >
            Estimated Profit
          </div>
          <div
            className="fp-metric-num mt-1 text-4xl font-extrabold"
            style={{ color: '#34d399' }}
          >
            {formatUsd(heroProfit)}
          </div>
          <div className="mt-1 text-xs" style={{ color: '#94a3b8' }}>
            After fees and shipping on {PLATFORM_LABELS[bestPlatform ?? ''] ?? bestPlatform}
          </div>
        </div>
        <div className="fp-glass-sm p-4 rounded-lg">
          <div
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: '#c4b5fd' }}
          >
            Recommended {isProjected ? 'Projected' : 'List'} Price
          </div>
          <div
            className="fp-metric-num mt-1 text-3xl font-bold"
            style={{ color: '#c4b5fd' }}
          >
            {formatUsd(heroPrice)}
          </div>
          <div className="mt-1 text-xs" style={{ color: '#94a3b8' }}>
            Target margin: {marginPercent}%
          </div>
        </div>
      </div>

      {/* Best platform badge — text + icon (never color alone) */}
      {bestPlatform && (
        <div className="flex items-center gap-2">
          <span className="fp-badge fp-badge-purple">
            <span aria-hidden="true">★</span>
            &nbsp;Best platform: {PLATFORM_LABELS[bestPlatform] ?? bestPlatform}
          </span>
        </div>
      )}

      {/* Margin control */}
      <div className="space-y-2">
        <label
          htmlFor="price-calc-margin-input"
          className="block text-sm font-semibold"
          style={{ color: '#e2e8f0' }}
        >
          Target Profit Margin
        </label>
        <div className="flex items-center gap-3">
          <input
            id="price-calc-margin-slider"
            type="range"
            min={MIN_MARGIN}
            max={dynamicMaxMargin}
            step={1}
            value={marginPercent}
            onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
            aria-label="Target profit margin"
            aria-valuemin={MIN_MARGIN}
            aria-valuemax={dynamicMaxMargin}
            aria-valuenow={marginPercent}
            aria-valuetext={`${marginPercent} percent`}
            className="flex-1 h-11"
            style={{ minHeight: 44, accentColor: '#7c3aed' }}
          />
          <input
            id="price-calc-margin-input"
            type="number"
            min={MIN_MARGIN}
            max={dynamicMaxMargin}
            step={1}
            value={marginInputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleInputBlur}
            aria-label="Target profit margin (numeric)"
            className="fp-input w-20 text-right"
          />
          <span style={{ color: '#e2e8f0' }}>%</span>
        </div>
        <div className="text-xs" style={{ color: '#94a3b8' }}>
          Range automatically capped at {dynamicMaxMargin}% based on platform fees.
        </div>
      </div>

      {/* Per-platform table */}
      <div>
        <h3
          className="text-sm font-semibold mb-2"
          style={{ color: '#e2e8f0' }}
        >
          Platform Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-xs uppercase"
                style={{ color: '#94a3b8' }}
              >
                <th className="py-2 pr-4">Platform</th>
                <th className="py-2 pr-4 text-right">List Price</th>
                <th className="py-2 pr-4 text-right">Fees</th>
                <th className="py-2 pr-4 text-right">Profit</th>
                <th className="py-2 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecalculated.map((p) => {
                const overrideRaw = overridePrices[p.targetPlatform];
                const overrideValue =
                  overrideRaw !== undefined && overrideRaw !== ''
                    ? overrideRaw
                    : p.recommendedPrice.toFixed(2);
                return (
                  <tr
                    key={p.targetPlatform}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      ...(p.impossible
                        ? { opacity: 0.5, background: 'rgba(255,255,255,0.03)' }
                        : {}),
                    }}
                  >
                    <td
                      className="py-3 pr-4 font-medium"
                      style={{ color: '#e2e8f0' }}
                    >
                      {PLATFORM_LABELS[p.targetPlatform] ?? p.targetPlatform}
                      {p.targetPlatform === bestPlatform && !p.impossible && (
                        <span
                          className="fp-badge fp-badge-purple ml-2 text-[10px]"
                          aria-label="Best platform"
                        >
                          ★ Best
                        </span>
                      )}
                    </td>
                    <td
                      className="py-3 pr-4 text-right"
                      style={{ color: '#e2e8f0' }}
                    >
                      {p.impossible ? (
                        '—'
                      ) : (
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={overrideValue}
                          onChange={(e) =>
                            handleOverrideChange(p.targetPlatform, e.target.value)
                          }
                          aria-label={`Override list price for ${PLATFORM_LABELS[p.targetPlatform] ?? p.targetPlatform}`}
                          className="fp-input w-24 text-right"
                        />
                      )}
                    </td>
                    <td
                      className="py-3 pr-4 text-right"
                      style={{ color: '#94a3b8' }}
                    >
                      {p.impossible
                        ? '—'
                        : `${formatUsd(p.estimatedFees)} (${p.feeRatePercent}%)`}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {p.impossible ? (
                        <span
                          style={{ color: '#64748b' }}
                          title={p.priceBreakdown.impossibleReason}
                        >
                          Impossible
                        </span>
                      ) : (
                        <span
                          className="font-semibold"
                          style={{ color: p.lossWarning ? '#f87171' : '#34d399' }}
                        >
                          {formatUsd(p.estimatedProfit)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleListClick(p.targetPlatform, p.recommendedPrice)
                        }
                        disabled={p.impossible || submitting !== null}
                        className="fp-btn-primary text-xs px-3 py-1.5"
                      >
                        {submitting === p.targetPlatform
                          ? 'Listing…'
                          : `List on ${PLATFORM_LABELS[p.targetPlatform] ?? p.targetPlatform}`}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs" style={{ color: '#475569' }}>
          Edit any list price before clicking &ldquo;List on …&rdquo; to override the recommendation.
        </p>
      </div>

      {/* Loss warning (AC-4) */}
      {visibleRecalculated.some((p) => p.lossWarning) && (
        <div
          className="fp-alert-danger px-4 py-3 text-sm"
          style={{ color: '#fca5a5' }}
        >
          <strong className="block mb-1">⚠ Selling at competitive price results in a loss.</strong>
          {visibleRecalculated
            .filter((p) => p.lossWarning && p.priceBreakdown.lossAmount !== undefined)
            .map((p) => (
              <div key={p.targetPlatform}>
                {PLATFORM_LABELS[p.targetPlatform] ?? p.targetPlatform}:&nbsp;
                loss of {formatUsd(p.priceBreakdown.lossAmount as number)} at competitive price.
              </div>
            ))}
          <div
            className="mt-1 text-xs"
            style={{ color: '#fca5a5', opacity: 0.8 }}
          >
            Consider listing at a higher price (above market) or accepting the loss.
          </div>
        </div>
      )}

      {/* Market value comparison bar — 3-color: green=below, yellow=at, red=above */}
      {possible &&
        possible.verifiedMarketValue !== null &&
        possible.verifiedMarketValue > 0 && (
          <div>
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: '#e2e8f0' }}
            >
              Market Value Comparison
            </h3>
            {(() => {
              const market = possible.verifiedMarketValue as number;
              const ratio = heroPrice / market;
              // Visual position is clamped 0..1 of the bar width.
              const positionPct = Math.min(100, Math.max(0, ratio * 100));
              // Choose state from where the user's price sits relative to
              // market: well below (green), within ±5% of market (yellow),
              // or above market (red).
              let state: 'below' | 'at' | 'above';
              if (ratio < 0.95) state = 'below';
              else if (ratio <= 1.05) state = 'at';
              else state = 'above';
              const stateLabel = {
                below: 'Below market — competitive',
                at: 'At market value',
                above: 'Above market — may be hard to sell',
              }[state];
              const barFill = {
                below: '#34d399',
                at: '#fbbf24',
                above: '#f87171',
              }[state];
              const stateTextColor = {
                below: '#6ee7b7',
                at: '#fcd34d',
                above: '#fca5a5',
              }[state];
              return (
                <>
                  <div
                    className="relative h-6 rounded overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                    role="img"
                    aria-label={`Your price ${formatUsd(heroPrice)} is ${stateLabel.toLowerCase()} (verified market value ${formatUsd(market)})`}
                  >
                    {/* Market reference line at 95% of bar width */}
                    <div
                      className="absolute top-0 h-full w-0.5 z-10"
                      style={{ left: '95%', background: 'rgba(255,255,255,0.4)' }}
                      aria-hidden="true"
                      title="Verified market value"
                    />
                    <div
                      className="absolute top-0 left-0 h-full"
                      style={{ width: `${positionPct}%`, background: barFill }}
                      aria-hidden="true"
                    />
                  </div>
                  <div
                    className="mt-1 flex justify-between text-xs"
                    style={{ color: '#94a3b8' }}
                  >
                    <span>Your: {formatUsd(heroPrice)}</span>
                    <span
                      className="font-semibold"
                      style={{ color: stateTextColor }}
                    >
                      {stateLabel}
                    </span>
                    <span>Market: {formatUsd(market)}</span>
                  </div>
                </>
              );
            })()}
          </div>
        )}

      {/* AI vs formula discrepancy */}
      {possible?.priceBreakdown.priceDiscrepancyNote && (
        <div
          className="fp-alert-warn px-4 py-3 text-sm"
          style={{ color: '#fcd34d' }}
        >
          <strong className="block mb-1">AI suggestion differs from formula</strong>
          {possible.priceBreakdown.priceDiscrepancyNote}
        </div>
      )}

      {/* Refresh control */}
      <div
        className="flex items-center justify-between text-xs"
        style={{ color: '#94a3b8' }}
      >
        <span>
          {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : ''}
        </span>
        <button
          type="button"
          onClick={fetchPrices}
          className="fp-btn-ghost text-xs px-3 py-1.5"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

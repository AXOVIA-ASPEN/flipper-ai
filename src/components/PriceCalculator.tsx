/**
 * @file src/components/PriceCalculator.tsx
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief PriceCalculator client component (Story 9.2 / FR-RELIST-03).
 *
 * @description
 * Renders the optimal listing price hero (estimated profit + recommended
 * price), best-platform badge, target margin slider+input, per-platform
 * fee/profit table, and a market value comparison bar.
 *
 * Recalculation strategy: the component fetches `data.prices` ONCE from
 * `/api/listings/[id]/optimal-price` (GET) and stores the per-platform
 * `costBasis`, `verifiedMarketValue`, `feeRatePercent`, and metadata. When
 * the user drags the margin slider, the formula is re-applied client-side
 * (no API round-trip per change). A "Refresh" button re-fetches and shows
 * a "last updated" timestamp.
 *
 * Accessibility: the slider exposes aria-valuemin/max/now/text and is
 * paired with a numeric input field for keyboard precision. Results are
 * wrapped in `aria-live="polite"` so screen readers announce updates.
 * Best platform is conveyed with both an icon and text (never color
 * alone). Touch targets meet the 44x44 minimum on the slider thumb.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

const PLATFORM_LABELS: Record<string, string> = {
  ebay: 'eBay',
  mercari: 'Mercari',
  facebook: 'Facebook Marketplace',
  offerup: 'OfferUp',
  craigslist: 'Craigslist',
};

const FREE_ITEM_DISCOUNT_FACTOR = 0.85;

interface PriceBreakdown {
  cappedByMarket: boolean;
  lossAmount?: number;
  freeItemPricing: boolean;
  priceDiscrepancyNote?: string;
  impossibleReason?: string;
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
  /** Optional callback when the user clicks "List on [Platform]". */
  onListPlatform?: (platform: string, recommendedPrice: number) => void;
}

const DEFAULT_MARGIN = 30;
const MIN_MARGIN = 5;
const MAX_MARGIN = 80;

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

/** Re-runs the calculator formula client-side using the cached server data. */
function recalcForMargin(
  base: ServerPriceResult,
  marginPercent: number,
  marketCapPercent = 0.95
): ServerPriceResult {
  const feeDecimal = base.feeRatePercent / 100;
  const marginDecimal = marginPercent / 100;
  const shipping = base.estimatedShippingCost;
  const isFreeItem = base.priceBreakdown.freeItemPricing;

  if (feeDecimal + marginDecimal >= 1.0 && !isFreeItem) {
    return {
      ...base,
      targetMarginPercent: marginPercent,
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
    recommendedPrice = roundCents(base.costBasis / (1 - feeDecimal - marginDecimal));
    if (base.marketDataAvailable && base.verifiedMarketValue !== null) {
      const cap = roundCents(base.verifiedMarketValue * marketCapPercent);
      if (recommendedPrice > cap) {
        recommendedPrice = cap;
        cappedByMarket = true;
      }
    }
    if (cappedByMarket && recommendedPrice < base.costBasis) {
      lossWarning = true;
      lossAmount = roundCents(base.costBasis - recommendedPrice);
    }
  }

  const estimatedFees = roundCents(recommendedPrice * feeDecimal);
  const purchasePortion = isFreeItem
    ? 0
    : Math.max(base.costBasis - shipping, 0);
  const estimatedProfit = roundCents(
    recommendedPrice - estimatedFees - purchasePortion - shipping
  );

  return {
    ...base,
    targetMarginPercent: marginPercent,
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load prices');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Recalculated prices for the current margin (client-side, no API call).
  const recalculated = useMemo(() => {
    if (!serverPrices) return [];
    const next = serverPrices.map((p) => recalcForMargin(p, marginPercent));
    next.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
    return next;
  }, [serverPrices, marginPercent]);

  const possible = recalculated.find((p) => !p.impossible);
  const bestPlatform = possible?.targetPlatform ?? null;
  const heroProfit = possible?.estimatedProfit ?? 0;
  const heroPrice = possible?.recommendedPrice ?? 0;

  const handleSliderChange = useCallback((value: number) => {
    const clamped = Math.max(MIN_MARGIN, Math.min(MAX_MARGIN, value));
    setMarginPercent(clamped);
    setMarginInputValue(String(clamped));
  }, []);

  const handleInputChange = useCallback((raw: string) => {
    setMarginInputValue(raw);
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.max(MIN_MARGIN, Math.min(MAX_MARGIN, parsed));
      setMarginPercent(clamped);
    }
  }, []);

  if (loading && !serverPrices) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <p className="text-gray-600">Loading optimal pricing…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-start justify-between gap-3">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchPrices}
            className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!recalculated.length || !possible) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <p className="text-gray-600">No pricing data available for this listing.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow space-y-6" data-testid="price-calculator">
      {/* Projected banner — pre-purchase mode (AC-5) */}
      {isProjected && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded">
          <span
            className="inline-block px-2 py-0.5 mr-2 text-xs font-semibold text-amber-900 bg-amber-200 rounded"
            aria-label="Projected pricing mode"
          >
            ◇ Projected
          </span>
          <span className="text-sm text-amber-900">
            This listing has not been purchased yet. Pricing uses the seller&apos;s
            asking price as a hypothetical cost basis.
          </span>
        </div>
      )}

      {/* Hero numbers — profit first, then list price */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        aria-live="polite"
        data-testid="price-calculator-hero"
      >
        <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
          <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">
            Estimated Profit
          </div>
          <div className="mt-1 text-4xl font-extrabold text-green-700">
            {formatUsd(heroProfit)}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            After fees and shipping on {PLATFORM_LABELS[bestPlatform ?? ''] ?? bestPlatform}
          </div>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
          <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
            Recommended {isProjected ? 'Projected' : 'List'} Price
          </div>
          <div className="mt-1 text-3xl font-bold text-purple-900">
            {formatUsd(heroPrice)}
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Target margin: {marginPercent}%
          </div>
        </div>
      </div>

      {/* Best platform badge — text + icon (never color alone) */}
      {bestPlatform && (
        <div className="flex items-center gap-2">
          <span aria-hidden="true">★</span>
          <span className="text-sm font-semibold text-gray-900">
            Best platform:&nbsp;
            <span className="text-purple-700">
              {PLATFORM_LABELS[bestPlatform] ?? bestPlatform}
            </span>
          </span>
        </div>
      )}

      {/* Margin control */}
      <div className="space-y-2">
        <label htmlFor="price-calc-margin-input" className="block text-sm font-semibold text-gray-900">
          Target Profit Margin
        </label>
        <div className="flex items-center gap-3">
          <input
            id="price-calc-margin-slider"
            type="range"
            min={MIN_MARGIN}
            max={MAX_MARGIN}
            step={1}
            value={marginPercent}
            onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
            aria-label="Target profit margin"
            aria-valuemin={MIN_MARGIN}
            aria-valuemax={MAX_MARGIN}
            aria-valuenow={marginPercent}
            aria-valuetext={`${marginPercent} percent`}
            className="flex-1 h-11 accent-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
            style={{ minHeight: 44 }}
          />
          <input
            id="price-calc-margin-input"
            type="number"
            min={MIN_MARGIN}
            max={MAX_MARGIN}
            step={1}
            value={marginInputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            aria-label="Target profit margin (numeric)"
            className="w-20 px-2 py-2 text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <span className="text-gray-700">%</span>
        </div>
      </div>

      {/* Per-platform table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Platform Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="py-2 pr-4">Platform</th>
                <th className="py-2 pr-4 text-right">List Price</th>
                <th className="py-2 pr-4 text-right">Fees</th>
                <th className="py-2 pr-4 text-right">Profit</th>
                <th className="py-2 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {recalculated.map((p) => (
                <tr
                  key={p.targetPlatform}
                  className={`border-t border-gray-100 ${
                    p.impossible ? 'opacity-50 bg-gray-50' : ''
                  }`}
                >
                  <td className="py-3 pr-4 font-medium text-gray-900">
                    {PLATFORM_LABELS[p.targetPlatform] ?? p.targetPlatform}
                    {p.targetPlatform === bestPlatform && !p.impossible && (
                      <span
                        className="ml-2 inline-block px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded"
                        aria-label="Best platform"
                      >
                        ★ Best
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-900">
                    {p.impossible ? '—' : formatUsd(p.recommendedPrice)}
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-700">
                    {p.impossible
                      ? '—'
                      : `${formatUsd(p.estimatedFees)} (${p.feeRatePercent}%)`}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {p.impossible ? (
                      <span className="text-gray-400" title={p.priceBreakdown.impossibleReason}>
                        Impossible
                      </span>
                    ) : (
                      <span
                        className={
                          p.lossWarning
                            ? 'text-red-600 font-semibold'
                            : 'text-green-700 font-semibold'
                        }
                      >
                        {formatUsd(p.estimatedProfit)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() =>
                        onListPlatform?.(p.targetPlatform, p.recommendedPrice)
                      }
                      disabled={p.impossible}
                      className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      List on {PLATFORM_LABELS[p.targetPlatform] ?? p.targetPlatform}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loss warning (AC-4) */}
      {recalculated.some((p) => p.lossWarning) && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded text-red-900 text-sm">
          <strong className="block mb-1">⚠ Selling at competitive price results in a loss.</strong>
          {recalculated
            .filter((p) => p.lossWarning && p.priceBreakdown.lossAmount !== undefined)
            .map((p) => (
              <div key={p.targetPlatform}>
                {PLATFORM_LABELS[p.targetPlatform] ?? p.targetPlatform}:&nbsp;
                loss of {formatUsd(p.priceBreakdown.lossAmount as number)} at competitive price.
              </div>
            ))}
          <div className="mt-1 text-xs text-red-700">
            Consider listing at a higher price (above market) or accepting the loss.
          </div>
        </div>
      )}

      {/* Market value comparison bar */}
      {possible.verifiedMarketValue !== null && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Market Value Comparison
          </h3>
          <div
            className="relative h-6 bg-gray-100 rounded overflow-hidden"
            role="img"
            aria-label={`Your price ${formatUsd(heroPrice)} vs verified market value ${formatUsd(possible.verifiedMarketValue)}`}
          >
            <div
              className="absolute top-0 left-0 h-full bg-yellow-200"
              style={{ width: '100%' }}
              aria-hidden="true"
            />
            <div
              className="absolute top-0 left-0 h-full bg-green-300"
              style={{
                width: `${Math.min(
                  100,
                  (heroPrice / possible.verifiedMarketValue) * 100
                )}%`,
              }}
              aria-hidden="true"
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-600">
            <span>Your: {formatUsd(heroPrice)}</span>
            <span>Market: {formatUsd(possible.verifiedMarketValue)}</span>
          </div>
        </div>
      )}

      {/* AI vs formula discrepancy */}
      {possible.priceBreakdown.priceDiscrepancyNote && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-sm">
          <strong className="block mb-1">AI suggestion differs from formula</strong>
          {possible.priceBreakdown.priceDiscrepancyNote}
        </div>
      )}

      {/* Refresh control */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : ''}
        </span>
        <button
          type="button"
          onClick={fetchPrices}
          className="px-3 py-1.5 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

// Demand trend analysis for marketplace listings
// Analyzes sold listing history to classify market demand and liquidity

import type { SoldListing } from './market-price';

export interface DemandAnalysisResult {
  soldVolume30Days: number;
  soldVolume60Days: number;
  soldVolume90Days: number;
  demandTrend: 'rising' | 'stable' | 'declining' | 'low_liquidity';
  isLowLiquidity: boolean;
  analysisDate: Date;
}

/**
 * Analyzes sold listing history to compute volume counts and demand trend.
 *
 * Time windows are cumulative (30d ⊆ 60d ⊆ 90d). Listings with null soldDate
 * are treated as sold in the last 30 days (assumed recent).
 *
 * Trend classification (FR-SCORE-18):
 *  - rising:       30-day rate > 60-day avg rate × 1.10
 *  - declining:    30-day rate < 60-day avg rate × 0.90
 *  - stable:       within ±10% of 60-day avg rate
 *  - low_liquidity: zero sales in last 90 days
 */
export function analyzeDemandTrend(soldListings: SoldListing[]): DemandAnalysisResult {
  const now = new Date();
  const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const cutoff60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const cutoff90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  let soldVolume30Days = 0;
  let soldVolume60Days = 0;
  let soldVolume90Days = 0;

  for (const listing of soldListings) {
    // null soldDate → treat as recent (within last 30 days)
    const soldDate = listing.soldDate ?? now;

    if (soldDate >= cutoff30) {
      soldVolume30Days++;
      soldVolume60Days++;
      soldVolume90Days++;
    } else if (soldDate >= cutoff60) {
      soldVolume60Days++;
      soldVolume90Days++;
    } else if (soldDate >= cutoff90) {
      soldVolume90Days++;
    }
    // Older than 90 days: excluded from all counts
  }

  // No sales in 90 days → low liquidity
  if (soldVolume90Days === 0) {
    return {
      soldVolume30Days: 0,
      soldVolume60Days: 0,
      soldVolume90Days: 0,
      demandTrend: 'low_liquidity',
      isLowLiquidity: true,
      analysisDate: now,
    };
  }

  // Compare 30-day daily rate vs 60-day average daily rate
  const rate30 = soldVolume30Days / 30;
  const rate60avg = soldVolume60Days / 60;

  let demandTrend: 'rising' | 'stable' | 'declining';
  if (rate30 > rate60avg * 1.1) {
    demandTrend = 'rising';
  } else if (rate30 < rate60avg * 0.9) {
    demandTrend = 'declining';
  } else {
    demandTrend = 'stable';
  }

  return {
    soldVolume30Days,
    soldVolume60Days,
    soldVolume90Days,
    demandTrend,
    isLowLiquidity: false,
    analysisDate: now,
  };
}

// Story 5.5: Logistics analysis orchestrator
// Coordinates classification, shipping estimation, and distance calculation

import { classifyItemLogistics } from './logistics-classifier';
import type { LogisticsClassification } from './logistics-classifier';
import { estimateShippingCosts } from './shipping-estimator';
import type { ShippingEstimates } from './shipping-estimator';
import { calculateDistance } from './distance-calculator';

export interface LogisticsAnalysisResult {
  sizeCategory: 'small_shippable' | 'large_local_only' | 'fragile_special_handling';
  shippingEstimates: ShippingEstimates | null;
  estimatedShippingCost: number | null;
  pickupDistanceMiles: number | null;
  outsidePickupRadius: boolean;
  adjustedProfitMargin: number | null;
  estimatedWeightLbs: number;
  analysisDate: Date;
}

interface AnalyzableItem {
  title: string;
  description?: string | null;
  category: string;
  location?: string | null;
  estimation: {
    profitPotential: number;
  };
}

function createSafeDefault(): LogisticsAnalysisResult {
  return {
    sizeCategory: 'small_shippable',
    shippingEstimates: null,
    estimatedShippingCost: null,
    pickupDistanceMiles: null,
    outsidePickupRadius: false,
    adjustedProfitMargin: null,
    estimatedWeightLbs: 0,
    analysisDate: new Date(),
  };
}

// Extract a ZIP-like string from a location for Shippo
function extractZipFromLocation(location: string | null | undefined): string {
  if (!location) return '10001';
  // Try to find a 5-digit ZIP code
  const zipMatch = location.match(/\b(\d{5})\b/);
  if (zipMatch) return zipMatch[1];
  // Fallback: use the full location string (Shippo can sometimes parse city/state)
  return '10001';
}

export async function analyzeLogistics(
  listing: AnalyzableItem,
  userLocation: string | null,
  maxPickupRadiusMiles: number
): Promise<LogisticsAnalysisResult> {
  try {
    // Step 1: Classify item size/weight
    const classification: LogisticsClassification = await classifyItemLogistics(
      listing.title,
      listing.description ?? null,
      listing.category
    );

    const result: LogisticsAnalysisResult = {
      sizeCategory: classification.sizeCategory,
      shippingEstimates: null,
      estimatedShippingCost: null,
      pickupDistanceMiles: null,
      outsidePickupRadius: false,
      adjustedProfitMargin: null,
      estimatedWeightLbs: classification.estimatedWeightLbs,
      analysisDate: new Date(),
    };

    // Step 2: Shippable items → get shipping cost estimates
    if (
      classification.sizeCategory === 'small_shippable' ||
      classification.sizeCategory === 'fragile_special_handling'
    ) {
      const toZip = extractZipFromLocation(listing.location);
      const shippingEstimates = await estimateShippingCosts(
        classification.estimatedWeightLbs,
        classification.estimatedDimensionsInches,
        toZip
      );

      result.shippingEstimates = shippingEstimates;
      result.estimatedShippingCost = shippingEstimates?.lowestCost ?? null;

      // Calculate adjusted profit margin (set whenever estimates are available, even if lowestCost=0)
      if (shippingEstimates !== null) {
        result.adjustedProfitMargin =
          listing.estimation.profitPotential - shippingEstimates.lowestCost;
      }
    }

    // Step 3: Large/local-only items → calculate pickup distance
    if (classification.sizeCategory === 'large_local_only') {
      if (userLocation && listing.location) {
        const distanceResult = await calculateDistance(userLocation, listing.location);
        if (distanceResult) {
          result.pickupDistanceMiles = distanceResult.distanceMiles;
          result.outsidePickupRadius = distanceResult.distanceMiles > maxPickupRadiusMiles;
        }
      }
      // Local pickup has no shipping cost, so adjusted margin = original profit
      result.adjustedProfitMargin = listing.estimation.profitPotential;
    }

    return result;
  } catch (error) {
    console.error('Logistics analysis failed completely, returning safe default:', error);
    return createSafeDefault();
  }
}

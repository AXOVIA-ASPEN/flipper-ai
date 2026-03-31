// Story 5.4: Seller reputation analysis
// Pure synchronous function — reads pre-populated listing fields, no network calls.

export interface SellerReputationResult {
  sellerRating: number | null;         // eBay: feedback % (0–100), Mercari: stars (0–5)
  sellerReviewCount: number | null;    // Total reviews/feedback count
  sellerAccountAgeDays: number | null; // Days since account creation
  isLowReputation: boolean;            // true if below platform average
  riskEscalation: boolean;             // true if authenticityRisk should be raised to 'high'
}

// Platform-specific reputation thresholds
const PLATFORM_THRESHOLDS: Record<string, { minRating: number }> = {
  EBAY: { minRating: 97 },     // eBay feedback percentage — below 97% is low
  MERCARI: { minRating: 4.0 }, // Mercari star rating out of 5.0
};

// Platforms that do not expose seller rating data
const SKIP_PLATFORMS = new Set(['CRAIGSLIST', 'FACEBOOK_MARKETPLACE', 'OFFERUP']);

/**
 * Analyzes seller reputation for platforms that expose ratings.
 * Returns null for platforms that don't expose seller data (Craigslist, Facebook, OfferUp).
 * Reads pre-populated listing fields — no network calls are made here.
 */
export function analyzeSellerReputation(
  platform: string,
  sellerRating: number | null,
  sellerReviewCount: number | null,
  sellerAccountAgeDays: number | null
): SellerReputationResult | null {
  if (SKIP_PLATFORMS.has(platform)) {
    return null;
  }

  const threshold = PLATFORM_THRESHOLDS[platform];

  // For supported platforms where rating data is unavailable (null), return neutral result
  if (sellerRating === null || threshold === undefined) {
    return {
      sellerRating: null,
      sellerReviewCount,
      sellerAccountAgeDays,
      isLowReputation: false,
      riskEscalation: false,
    };
  }

  const isLowReputation = sellerRating < threshold.minRating;

  return {
    sellerRating,
    sellerReviewCount,
    sellerAccountAgeDays,
    isLowReputation,
    riskEscalation: isLowReputation,
  };
}

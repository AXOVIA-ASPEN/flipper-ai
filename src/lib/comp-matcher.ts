// Comparable sold item matching — finds and filters eBay sold comps
// for LLM-identified items, verifying brand/model alignment.

import { fetchMarketPrice, SoldListing } from './market-price';

export interface ComparableSale {
  title: string;
  soldPrice: number;
  soldDate: Date | null;
  condition: string;
  platform: 'ebay';
  url: string;
}

export type CompConfidence = 'high' | 'medium' | 'low' | 'insufficient';

export interface CompMatchResult {
  comps: ComparableSale[];
  confidence: CompConfidence;
  insufficientData: boolean;
  totalFetched: number; // raw results before brand/model filtering
  searchQuery: string;
}

/**
 * Returns true when a sold listing title matches the identified brand/model.
 * Used to weed out keyword-overlapping comps that are actually different items.
 * Falls back to accepting all comps when brand and model are both unknown.
 */
export function filterByBrandModel(
  title: string,
  brand: string | null,
  model: string | null
): boolean {
  if (!brand && !model) return true; // no filters available — accept all
  const lower = title.toLowerCase();
  const brandMatch = brand ? lower.includes(brand.toLowerCase()) : true;
  const modelMatch = model ? lower.includes(model.toLowerCase()) : true;
  return brandMatch && modelMatch;
}

export function calcConfidence(compCount: number): CompConfidence {
  if (compCount === 0) return 'insufficient';
  if (compCount <= 2) return 'low';
  if (compCount <= 4) return 'medium';
  return 'high';
}

/**
 * Fetches eBay sold listings and filters for comps that match the identified brand + model.
 * Uses the LLM-generated searchQuery (from Story 4.3) for the eBay search.
 * Falls back to the listing title when no LLM identification is available.
 *
 * @param searchQuery  Optimized search query (from llm-identifier.ts identifiedSearchQuery)
 * @param brand        Identified brand from LLM identification (may be null)
 * @param model        Identified model from LLM identification (may be null)
 * @param category     Category hint for eBay category filter (optional)
 * @param rawComps     Pre-fetched SoldListing[] from Story 4.4 pipeline (avoids duplicate Playwright call)
 */
export async function findComparableSales(
  searchQuery: string,
  brand: string | null,
  model: string | null,
  category?: string,
  rawComps?: SoldListing[]
): Promise<CompMatchResult | null> {
  try {
    let soldListings: SoldListing[];

    if (rawComps && rawComps.length > 0) {
      // Reuse comps fetched by Story 4.4 — avoid a second Playwright call
      soldListings = rawComps;
    } else {
      const marketData = await fetchMarketPrice(searchQuery, category);
      if (!marketData) return null;
      soldListings = marketData.soldListings;
    }

    const filtered = soldListings.filter((s) =>
      filterByBrandModel(s.title, brand, model)
    );

    const comps: ComparableSale[] = filtered.map((s) => ({
      title: s.title,
      soldPrice: s.price,
      soldDate: s.soldDate,
      condition: s.condition,
      platform: 'ebay' as const,
      url: s.url,
    }));

    return {
      comps,
      confidence: calcConfidence(comps.length),
      insufficientData: comps.length === 0,
      totalFetched: soldListings.length,
      searchQuery,
    };
  } catch (error) {
    console.error('Comp matching failed for query:', searchQuery, error);
    return null;
  }
}

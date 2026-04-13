/**
 * @file src/lib/llm-analyzer.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2025-12-22
 * @version 1.2
 * @brief LLM-powered sellability analysis for marketplace listings.
 *
 * @description
 * Given item identification and market data, assesses flip potential using
 * OpenAI GPT-4o-mini (primary) or Google Gemini (fallback). Implements
 * two-layer caching (L1 in-memory LRU, L2 database with 24h TTL),
 * price-delta cache invalidation, background refresh for stale entries,
 * and truncation-aware retry logic with Sentry error reporting.
 */

import * as Sentry from '@sentry/nextjs';
import prisma from '@/lib/db';
import { analysisCache } from '@/lib/cache';
import { completeAI, AIProviderUnavailableError } from '@/lib/ai';
import type { ItemIdentification } from './llm-identifier';
import type { MarketPrice, SoldListing } from './market-price';

const CACHE_DURATION_HOURS = 24;
const L1_KEY = (listingId: string) => `openai:${listingId}`;

export interface SellabilityAnalysis {
  // Verified values
  verifiedMarketValue: number;
  trueDiscountPercent: number;

  // Sellability assessment
  sellabilityScore: number; // 0-100
  demandLevel: 'low' | 'medium' | 'high' | 'very_high';
  expectedDaysToSell: number;

  // Risk assessment
  authenticityRisk: 'low' | 'medium' | 'high';
  conditionRisk: 'low' | 'medium' | 'high';

  // Recommendations
  recommendedOfferPrice: number;
  recommendedListPrice: number;
  resaleStrategy: string;
  resalePlatform: string;

  // Evidence
  comparableSales: SoldListing[];
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;

  // Filter result
  meetsThreshold: boolean; // True if listing meets the configured discount threshold
}

export interface CacheResult {
  analysis: SellabilityAnalysis | null;
  staleAnalysis: boolean;
}

/**
 * Compute price delta between current and cached asking price.
 * Returns Infinity if cached price is 0 or null (always invalidate).
 */
function priceDelta(current: number, cached: number | null): number {
  if (!cached || cached === 0) return Infinity;
  return Math.abs(current - cached) / cached;
}

// Track listings currently being background-refreshed to prevent concurrent storms
const refreshingListings = new Set<string>();

/**
 * Check for a cached sellability analysis (L1 in-memory then L2 DB).
 * When currentAskingPrice is provided, applies price-delta invalidation:
 *   - delta <= 5%: cache hit (price unchanged)
 *   - delta 5-15%: cache hit but flagged stale (background refresh triggered by caller)
 *   - delta > 15%: cache miss (full invalidation)
 *   - analyzedAtPrice is null (legacy): treated as expired
 */
export async function getCachedSellabilityAnalysis(
  listingId: string,
  currentAskingPrice?: number
): Promise<CacheResult> {
  // L1: in-memory LRU cache — only use L1 shortcut when no price delta check needed.
  // When currentAskingPrice is provided, skip L1 and go to L2 where analyzedAtPrice is stored
  // so we can properly detect price changes and invalidate/flag stale entries.
  if (currentAskingPrice === undefined) {
    const l1 = analysisCache.get(L1_KEY(listingId)) as SellabilityAnalysis | undefined;
    if (l1) return { analysis: l1, staleAnalysis: false };
  }

  // L2: database cache
  try {
    const cached = await prisma.aiAnalysisCache.findFirst({
      where: {
        listingId,
        analysisType: 'openai',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (cached) {
      const result = JSON.parse(cached.analysisResult) as SellabilityAnalysis;

      // Price delta check when asking price is available
      if (currentAskingPrice !== undefined) {
        const delta = priceDelta(currentAskingPrice, cached.analyzedAtPrice);

        if (delta > 0.15) {
          // >15% change: full invalidation — evict L1 and return miss
          analysisCache.delete(L1_KEY(listingId));
          return { analysis: null, staleAnalysis: false };
        }

        if (delta > 0.05) {
          // 5-15% change: serve cached but flag as stale
          analysisCache.set(L1_KEY(listingId), result);
          return { analysis: result, staleAnalysis: true };
        }
      }

      // <=5% change or no price provided: fresh cache hit
      analysisCache.set(L1_KEY(listingId), result);
      return { analysis: result, staleAnalysis: false };
    }
  } catch (error) {
    console.error('Error fetching cached sellability analysis:', error);
  }

  return { analysis: null, staleAnalysis: false };
}

/**
 * Check if a listing is currently being background-refreshed.
 * Prevents concurrent refresh storms from multiple stale cache hits.
 */
export function isRefreshing(listingId: string): boolean {
  return refreshingListings.has(listingId);
}

/**
 * Mark a listing as refreshing / done refreshing.
 */
export function setRefreshing(listingId: string, refreshing: boolean): void {
  if (refreshing) {
    refreshingListings.add(listingId);
  } else {
    refreshingListings.delete(listingId);
  }
}

/**
 * Store a sellability analysis result in cache (L2 DB then L1 in-memory).
 * Stores analyzedAtPrice so future reads can detect price-delta staleness.
 */
export async function cacheSellabilityAnalysis(
  listingId: string,
  result: SellabilityAnalysis,
  askingPrice?: number
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

  try {
    await prisma.aiAnalysisCache.upsert({
      where: { listingId_analysisType: { listingId, analysisType: 'openai' } },
      create: {
        listingId,
        analysisType: 'openai',
        analysisResult: JSON.stringify(result),
        analyzedAtPrice: askingPrice ?? null,
        expiresAt,
      },
      update: {
        analysisResult: JSON.stringify(result),
        analyzedAtPrice: askingPrice ?? null,
        expiresAt,
      },
    });
    analysisCache.set(L1_KEY(listingId), result);
  } catch (error) {
    console.error('Error caching sellability analysis:', error);
  }
}

/**
 * Run the LLM analysis without checking cache first. Used for background refresh
 * when a stale cache result was already served to the caller.
 */
async function analyzeSellabilityUncached(
  title: string,
  askingPrice: number,
  identification: ItemIdentification,
  marketData: MarketPrice,
  discountThreshold?: number,
  feeRate?: number,
  listingId?: string
): Promise<SellabilityAnalysis | null> {
  return analyzeSellability(title, askingPrice, identification, marketData, discountThreshold, feeRate, listingId, true);
}

export async function analyzeSellability(
  title: string,
  askingPrice: number,
  identification: ItemIdentification,
  marketData: MarketPrice,
  discountThreshold?: number,
  feeRate?: number,
  listingId?: string,
  /** @internal Used by background refresh to skip cache check and avoid recursion. */
  skipCacheCheck = false
): Promise<SellabilityAnalysis | null> {
  // Check cache FIRST — cached results are valid regardless of which provider generated them
  if (listingId && !skipCacheCheck) {
    const { analysis: cached, staleAnalysis } = await getCachedSellabilityAnalysis(listingId, askingPrice);
    if (cached && !staleAnalysis) return cached;
    if (cached && staleAnalysis) {
      // Serve stale but trigger background refresh (if not already refreshing)
      if (!isRefreshing(listingId)) {
        setRefreshing(listingId, true);
        // Fire-and-forget background refresh — skip cache check to avoid recursion
        analyzeSellabilityUncached(title, askingPrice, identification, marketData, discountThreshold, feeRate, listingId)
          .finally(() => setRefreshing(listingId, false));
      }
      return cached;
    }
  }

  const effectiveThreshold = discountThreshold ?? 50;

  try {
    // Format sold listings for the prompt
    const soldListingsText = marketData.soldListings
      .slice(0, 5)
      .map((l) => `  - "${l.title}" sold for $${l.price} (${l.condition})`)
      .join('\n');

    const response = await completeAI('flipAnalysis', {
      title,
      askingPrice,
      brand: identification.brand || 'Unknown',
      model: identification.model || 'Unknown',
      variant: identification.variant || '',
      condition: identification.condition,
      conditionNotes: identification.conditionNotes,
      medianPrice: marketData.medianPrice,
      lowPrice: marketData.lowPrice,
      highPrice: marketData.highPrice,
      salesCount: marketData.salesCount,
      outliersRemoved: marketData.outliersRemoved,
      lowSampleSize: marketData.lowSampleSize,
      soldListingsText,
      discountThreshold: effectiveThreshold,
      feeRate: feeRate ?? 0.13,
    });

    const responseText = response.content;
    if (!responseText) {
      return null;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Retry once with simplified prompt
      console.warn('LLM analysis JSON parse failed, retrying with simplified prompt');
      try {
        const retryResponse = await completeAI('quickDiscountCheck', {
          title,
          askingPrice,
          medianPrice: marketData.medianPrice,
        });
        const retryText = retryResponse.content;
        if (!retryText) return null;
        parsed = JSON.parse(retryText);
      } catch (retryError) {
        Sentry.captureException(retryError, {
          extra: { originalResponse: responseText, listingId },
        });
        return null;
      }
    }

    return buildResult(parsed, askingPrice, marketData, listingId);
  } catch (error) {
    if (error instanceof AIProviderUnavailableError) {
      console.log('No AI provider available, skipping LLM analysis');
      return null;
    }
    console.error('LLM analysis error:', error);
    return null;
  }
}

async function buildResult(
  parsed: Record<string, unknown>,
  askingPrice: number,
  marketData: MarketPrice,
  listingId?: string
): Promise<SellabilityAnalysis> {
  const result: SellabilityAnalysis = {
    verifiedMarketValue: (parsed.verifiedMarketValue as number) || marketData.medianPrice,
    trueDiscountPercent: (parsed.trueDiscountPercent as number) || 0,
    sellabilityScore: Math.min(100, Math.max(0, (parsed.sellabilityScore as number) || 50)),
    demandLevel: validateDemandLevel(parsed.demandLevel as string),
    expectedDaysToSell: (parsed.expectedDaysToSell as number) || 14,
    authenticityRisk: validateRisk(parsed.authenticityRisk as string),
    conditionRisk: validateRisk(parsed.conditionRisk as string),
    recommendedOfferPrice: (parsed.recommendedOfferPrice as number) || askingPrice,
    recommendedListPrice: (parsed.recommendedListPrice as number) || marketData.medianPrice,
    resaleStrategy: (parsed.resaleStrategy as string) || 'List on eBay with detailed photos',
    resalePlatform: (parsed.resalePlatform as string) || 'ebay',
    comparableSales: marketData.soldListings.slice(0, 5),
    confidence: validateConfidence(parsed.confidence as string),
    reasoning: (parsed.reasoning as string) || '',
    meetsThreshold: parsed.meetsThreshold === true,
  };

  // Cache the result when listingId is provided
  if (listingId) {
    await cacheSellabilityAnalysis(listingId, result, askingPrice);
  }

  return result;
}

function validateDemandLevel(level: string): 'low' | 'medium' | 'high' | 'very_high' {
  const valid = ['low', 'medium', 'high', 'very_high'];
  return valid.includes(level) ? (level as 'low' | 'medium' | 'high' | 'very_high') : 'medium';
}

function validateRisk(risk: string): 'low' | 'medium' | 'high' {
  const valid = ['low', 'medium', 'high'];
  return valid.includes(risk) ? (risk as 'low' | 'medium' | 'high') : 'medium';
}

function validateConfidence(conf: string): 'low' | 'medium' | 'high' {
  const valid = ['low', 'medium', 'high'];
  return valid.includes(conf) ? (conf as 'low' | 'medium' | 'high') : 'medium';
}

// Quick algorithmic check before expensive LLM analysis
export function quickDiscountCheck(
  askingPrice: number,
  marketData: MarketPrice
): { passesQuickCheck: boolean; estimatedDiscount: number } {
  // Use median as market value
  const marketValue = marketData.medianPrice;
  const discount = ((marketValue - askingPrice) / marketValue) * 100;

  // Pass if at least 40% discount (gives buffer for LLM to refine)
  return {
    passesQuickCheck: discount >= 40,
    estimatedDiscount: Math.round(discount),
  };
}

// Full analysis pipeline
export interface FullAnalysisResult {
  identification: ItemIdentification;
  marketData: MarketPrice;
  analysis: SellabilityAnalysis;
}

export async function runFullAnalysis(
  title: string,
  description: string | null,
  askingPrice: number,
  categoryHint: string | null,
  identification: ItemIdentification,
  marketData: MarketPrice,
  discountThreshold?: number
): Promise<FullAnalysisResult | null> {
  // Run sellability analysis
  const analysis = await analyzeSellability(title, askingPrice, identification, marketData, discountThreshold);

  if (!analysis) {
    return null;
  }

  return {
    identification,
    marketData,
    analysis,
  };
}

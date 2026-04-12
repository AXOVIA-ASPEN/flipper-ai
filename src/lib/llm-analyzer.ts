// LLM-powered sellability analysis
// Given item identification and market data, assess flip potential using OpenAI ChatGPT

import OpenAI from 'openai';
import * as Sentry from '@sentry/nextjs';
import prisma from '@/lib/db';
import { analysisCache } from '@/lib/cache';
import { isGeminiFallbackAvailable, geminiGenerateJSON } from '@/lib/gemini-client';
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

function buildAnalysisPrompt(discountThreshold: number, feeRate: number = 0.13): string {
  const feePercent = Math.round(feeRate * 100);
  return `You are an expert reseller analyzing a marketplace listing for flip potential.

LISTING DETAILS:
- Title: {title}
- Asking Price: ${'{askingPrice}'}
- Identified as: {brand} {model} {variant}
- Condition: {condition} ({conditionNotes})

MARKET DATA (from eBay sold listings, outliers removed via IQR filtering):
- Median Sold Price: ${'{medianPrice}'}
- Price Range: ${'{lowPrice}'} - ${'{highPrice}'}
- Recent Sales Count: {salesCount}
- Outliers Removed: {outliersRemoved}
- Sample Sold Listings:
{soldListingsText}

TASK:
Analyze this opportunity and provide a detailed assessment. The listing must be at least ${discountThreshold}% below market value to be considered a good opportunity.

RESPOND WITH ONLY VALID JSON:
{
  "verifiedMarketValue": <number - your estimate of true market value based on sold data>,
  "trueDiscountPercent": <number - percentage below market value>,
  "sellabilityScore": <0-100 - how easily this will sell>,
  "demandLevel": "low|medium|high|very_high",
  "expectedDaysToSell": <number - estimated days to sell>,
  "authenticityRisk": "low|medium|high",
  "conditionRisk": "low|medium|high",
  "recommendedOfferPrice": <number - what to offer the seller>,
  "recommendedListPrice": <number - what to list it for on eBay/Mercari>,
  "resaleStrategy": "<brief strategy - where and how to sell>",
  "resalePlatform": "ebay|mercari|facebook|offerup",
  "confidence": "low|medium|high",
  "reasoning": "<2-3 sentence explanation of your assessment>",
  "meetsThreshold": <true if ${discountThreshold}%+ undervalued, false otherwise>
}

GUIDELINES:
- verifiedMarketValue should be based on the median sold price, adjusted for condition
- trueDiscountPercent = ((verifiedMarketValue - askingPrice) / verifiedMarketValue) * 100
- meetsThreshold = true ONLY if trueDiscountPercent >= ${discountThreshold}
- Be conservative with value estimates - use lower end for worn items
- Factor in ${feePercent}% platform fees when recommending list price
- Consider shipping costs for large/heavy items`;
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
  // L1: in-memory LRU cache — L1 has a short TTL so if it's there, serve it
  // (L1 doesn't store analyzedAtPrice, so we can't do delta check from L1 alone;
  //  the L2 delta check runs on the next L1 miss, keeping staleness bounded)
  const l1 = analysisCache.get(L1_KEY(listingId)) as SellabilityAnalysis | undefined;
  if (l1) return { analysis: l1, staleAnalysis: false };

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

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    /* istanbul ignore next -- defensive guard; singleton already set before key-deletion tests */
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
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
  _skipCacheCheck = false
): Promise<SellabilityAnalysis | null> {
  // Check cache FIRST — cached results are valid regardless of which provider generated them
  if (listingId && !_skipCacheCheck) {
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

  // Determine provider: OpenAI (primary) → Gemini (fallback) → null (skip)
  const useGeminiFallback = !process.env.OPENAI_API_KEY && isGeminiFallbackAvailable();

  if (!process.env.OPENAI_API_KEY && !useGeminiFallback) {
    console.log('Neither OPENAI_API_KEY nor GOOGLE_API_KEY set, skipping LLM analysis');
    return null;
  }

  const effectiveThreshold = discountThreshold ?? 50;

  try {
    // Format sold listings for the prompt
    const soldListingsText = marketData.soldListings
      .slice(0, 5)
      .map((l) => `  - "${l.title}" sold for $${l.price} (${l.condition})`)
      .join('\n');

    const prompt = buildAnalysisPrompt(effectiveThreshold, feeRate ?? 0.13).replace('{title}', title)
      .replace('{askingPrice}', askingPrice.toString())
      .replace('{brand}', identification.brand || 'Unknown')
      .replace('{model}', identification.model || 'Unknown')
      .replace('{variant}', identification.variant || '')
      .replace('{condition}', identification.condition)
      .replace('{conditionNotes}', identification.conditionNotes)
      .replace('{medianPrice}', marketData.medianPrice.toString())
      .replace('{lowPrice}', marketData.lowPrice.toString())
      .replace('{highPrice}', marketData.highPrice.toString())
      .replace('{salesCount}', marketData.salesCount.toString())
      .replace('{outliersRemoved}', (marketData.outliersRemoved ?? 0).toString())
      .replace('{soldListingsText}', soldListingsText);

    // Gemini fallback path — use Gemini when OpenAI key is unavailable
    if (useGeminiFallback) {
      const parsed = await geminiGenerateJSON<Record<string, unknown>>(
        prompt,
        'You are a resale market expert. Always respond with valid JSON only, no markdown formatting.'
      );
      return buildResult(parsed, askingPrice, marketData, listingId);
    }

    // Primary path — OpenAI
    const client = getOpenAI();

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You are a resale market expert. Always respond with valid JSON only, no markdown formatting.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    // Check for truncation (finish_reason: 'length' means max_tokens was hit)
    const finishReason = response.choices[0]?.finish_reason;
    if (finishReason === 'length') {
      console.warn('LLM analysis response truncated (max_tokens reached). Retrying with higher limit.');
      const retryResponse = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      });
      const retryText = retryResponse.choices[0]?.message?.content;
      if (!retryText) return null;
      try {
        const retryParsed = JSON.parse(retryText);
        return buildResult(retryParsed, askingPrice, marketData, listingId);
      } catch {
        Sentry.captureException(new Error('LLM analysis JSON parse failed after truncation retry'), {
          extra: { responseText: retryText, listingId },
        });
        return null;
      }
    }

    /* istanbul ignore next -- defensive fallback for empty/null API response content */
    const responseText = response.choices[0]?.message?.content;
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
        const retryResponse = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a resale market expert. Respond with valid JSON only.' },
            { role: 'user', content: `Analyze this listing and return ONLY a JSON object: "${title}" at $${askingPrice}. Market median: $${marketData.medianPrice}. Include fields: verifiedMarketValue, trueDiscountPercent, sellabilityScore (0-100), demandLevel, expectedDaysToSell, authenticityRisk, conditionRisk, recommendedOfferPrice, recommendedListPrice, resaleStrategy, resalePlatform, confidence, reasoning, meetsThreshold.` },
          ],
          temperature: 0.3,
          max_tokens: 800,
          response_format: { type: 'json_object' },
        });
        const retryText = retryResponse.choices[0]?.message?.content;
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
    await cacheSellabilityAnalysis(listingId, result);
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

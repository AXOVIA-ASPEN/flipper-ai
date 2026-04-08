/**
 * @file src/lib/negotiation-strategy.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief AI-powered negotiation strategy and counter-offer analysis for marketplace listings.
 *
 * @description
 * Generates negotiation strategies using OpenAI gpt-4o-mini, providing recommended
 * initial offer amounts, walk-away prices, negotiation tactics, and counter-offer
 * suggestions based on verified market data, item condition, and listing age.
 * Falls back to algorithmic rule-based strategies when the AI API is unavailable.
 * Uses dual-layer caching (L1 in-memory LRU + L2 database AiAnalysisCache) with
 * a 4-hour TTL. Follows the same patterns as message-generator.ts and llm-analyzer.ts.
 */

import OpenAI from 'openai';
import prisma from '@/lib/db';
import { analysisCache } from '@/lib/cache';
import { logger } from '@/lib/logger';
import { metrics } from '@/lib/metrics';
import { captureError } from '@/lib/error-tracker';

// ── Types ────────────────────────────────────────────────────────────────────

export interface NegotiationStrategyInput {
  listingId: string;
  askingPrice: number;
  verifiedMarketValue: number | null;
  estimatedValue: number | null;
  condition: string | null;
  daysListed: number | null;
  negotiable: boolean | null;
  demandLevel: string | null;
  sellabilityScore: number | null;
  platform: string;
  recommendedOffer: number | null;
  marketDataDate: Date | null;
}

export interface NegotiationStrategy {
  initialOfferPrice: number;
  walkAwayPrice: number;
  negotiationTactics: string[];
  counterOfferSuggestions: CounterOfferStep[];
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  isFallback: boolean;
  disclaimer: string;
}

export interface CounterOfferStep {
  roundNumber: number;
  ifSellerCountersAt: string;
  suggestedResponse: number;
  reasoning: string;
}

export interface CounterOfferAnalysis {
  recommendation: 'accept' | 'counter' | 'walkaway';
  suggestedCounterPrice: number | null;
  reasoning: string;
  confidence: 'low' | 'medium' | 'high';
  profitAtThisPrice: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const NEGOTIATION_CACHE_TTL_HOURS = parseInt(
  process.env.NEGOTIATION_STRATEGY_CACHE_TTL_HOURS || '4',
  10
);

const L1_KEY = (listingId: string) => `negotiation:${listingId}`;

const DISCLAIMER = 'AI-generated suggestion for informational purposes only. Not financial advice.';

const PLATFORM_FEE_RATES: Record<string, number> = {
  EBAY: 0.13,
  MERCARI: 0.10,
  FACEBOOK_MARKETPLACE: 0.05,
  OFFERUP: 0.129,
  CRAIGSLIST: 0,
};

const DEFAULT_FEE_RATE = 0.13;

// ── OpenAI Singleton ─────────────────────────────────────────────────────────

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// ── Cache ────────────────────────────────────────────────────────────────────

export async function getCachedStrategy(
  listingId: string
): Promise<NegotiationStrategy | null> {
  // L1: in-memory LRU cache
  const l1 = analysisCache.get(L1_KEY(listingId)) as NegotiationStrategy | undefined;
  if (l1) {
    metrics.increment('negotiation_cache_hit');
    return l1;
  }

  // L2: database cache
  try {
    const cached = await prisma.aiAnalysisCache.findFirst({
      where: {
        listingId,
        analysisType: 'negotiation',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (cached) {
      const result = JSON.parse(cached.analysisResult) as NegotiationStrategy;
      analysisCache.set(L1_KEY(listingId), result);
      metrics.increment('negotiation_cache_hit');
      return result;
    }
  } catch (error) {
    logger.error('Error fetching cached negotiation strategy', {
      listingId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  metrics.increment('negotiation_cache_miss');
  return null;
}

export async function cacheStrategy(
  listingId: string,
  result: NegotiationStrategy
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + NEGOTIATION_CACHE_TTL_HOURS);

  try {
    await prisma.aiAnalysisCache.upsert({
      where: { listingId_analysisType: { listingId, analysisType: 'negotiation' } },
      create: {
        listingId,
        analysisType: 'negotiation',
        analysisResult: JSON.stringify(result),
        expiresAt,
      },
      update: {
        analysisResult: JSON.stringify(result),
        expiresAt,
      },
    });
    analysisCache.set(L1_KEY(listingId), result);
  } catch (error) {
    logger.error('Error caching negotiation strategy', {
      listingId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFeeRate(platform: string): number {
  return PLATFORM_FEE_RATES[platform.toUpperCase()] ?? DEFAULT_FEE_RATE;
}

function getMarketValue(input: NegotiationStrategyInput): number {
  return input.verifiedMarketValue ?? input.estimatedValue ?? input.askingPrice;
}

function validateConfidence(conf: unknown): 'low' | 'medium' | 'high' {
  const valid = ['low', 'medium', 'high'];
  return typeof conf === 'string' && valid.includes(conf)
    ? (conf as 'low' | 'medium' | 'high')
    : 'medium';
}

function validateRecommendation(rec: unknown): 'accept' | 'counter' | 'walkaway' {
  const valid = ['accept', 'counter', 'walkaway'];
  return typeof rec === 'string' && valid.includes(rec)
    ? (rec as 'accept' | 'counter' | 'walkaway')
    : 'counter';
}

// ── LLM Prompt ───────────────────────────────────────────────────────────────

function buildNegotiationPrompt(input: NegotiationStrategyInput): string {
  const marketValue = getMarketValue(input);
  const feeRate = getFeeRate(input.platform);
  const feePercent = Math.round(feeRate * 100);
  const discountPercent =
    marketValue > 0
      ? Math.round(((marketValue - input.askingPrice) / marketValue) * 100)
      : 0;

  return `Analyze this marketplace listing and recommend an optimal negotiation strategy.

LISTING ECONOMICS:
- Asking Price: $${input.askingPrice}
- Verified Market Value: ${input.verifiedMarketValue != null ? `$${input.verifiedMarketValue}` : 'N/A'}
- Estimated Value: ${input.estimatedValue != null ? `$${input.estimatedValue}` : 'N/A'}
- Discount from Market: ${discountPercent}%
- Platform: ${input.platform} (${feePercent}% selling fees)

ITEM SIGNALS:
- Condition: ${input.condition || 'Unknown'}
- Days Listed: ${input.daysListed != null ? input.daysListed : 'Unknown'}
- Seller Says Negotiable: ${input.negotiable === true ? 'Yes' : input.negotiable === false ? 'No (firm price)' : 'Unknown'}
- Demand Level: ${input.demandLevel || 'Unknown'}
- Sellability Score: ${input.sellabilityScore != null ? `${input.sellabilityScore}/100` : 'Unknown'}

CONSTRAINTS:
- Platform fees: ${feePercent}%
- Minimum profit target: $10 after fees
- Walk-away price must ensure positive profit after resale fees

Respond with ONLY valid JSON:
{
  "initialOfferPrice": <number>,
  "walkAwayPrice": <number>,
  "negotiationTactics": ["<tactic1>", "<tactic2>"],
  "counterOfferSuggestions": [
    {
      "roundNumber": 1,
      "ifSellerCountersAt": "<scenario description>",
      "suggestedResponse": <number>,
      "reasoning": "<why>"
    }
  ],
  "confidence": "low|medium|high",
  "reasoning": "<2-3 sentence explanation>"
}`;
}

function buildCounterOfferPrompt(
  input: NegotiationStrategyInput,
  counterOfferPrice: number,
  ourPreviousOffer: number
): string {
  const marketValue = getMarketValue(input);
  const feeRate = getFeeRate(input.platform);
  const feePercent = Math.round(feeRate * 100);
  const profitAtCounter = Math.round(marketValue * (1 - feeRate) - counterOfferPrice);

  return `Analyze this seller counter-offer and recommend whether to accept, counter, or walk away.

CONTEXT:
- Asking Price: $${input.askingPrice}
- Our Previous Offer: $${ourPreviousOffer}
- Seller Counter-Offer: $${counterOfferPrice}
- Verified Market Value: ${input.verifiedMarketValue != null ? `$${input.verifiedMarketValue}` : 'N/A'}
- Estimated Value: ${input.estimatedValue != null ? `$${input.estimatedValue}` : 'N/A'}
- Platform Fees: ${feePercent}%
- Estimated Profit at Counter Price: $${profitAtCounter}
- Demand Level: ${input.demandLevel || 'Unknown'}
- Days Listed: ${input.daysListed != null ? input.daysListed : 'Unknown'}
- Negotiable: ${input.negotiable === true ? 'Yes' : input.negotiable === false ? 'No' : 'Unknown'}

Respond with ONLY valid JSON:
{
  "recommendation": "accept|counter|walkaway",
  "suggestedCounterPrice": <number or null>,
  "reasoning": "<2-3 sentence explanation>",
  "confidence": "low|medium|high",
  "profitAtThisPrice": <number>
}`;
}

// ── LLM Response Validation ──────────────────────────────────────────────────

function validateStrategyResponse(
  parsed: Record<string, unknown>,
  input: NegotiationStrategyInput
): NegotiationStrategy {
  const askingPrice = input.askingPrice;

  // Clamp initialOfferPrice: must be > 0 and < askingPrice
  let initialOfferPrice = Number(parsed.initialOfferPrice) || 0;
  initialOfferPrice = Math.max(1, Math.min(initialOfferPrice, askingPrice * 0.95));
  initialOfferPrice = Math.round(initialOfferPrice);

  // Clamp walkAwayPrice: must be > 0 and <= askingPrice
  let walkAwayPrice = Number(parsed.walkAwayPrice) || 0;
  walkAwayPrice = Math.max(1, Math.min(walkAwayPrice, askingPrice));
  // walkAwayPrice must be >= initialOfferPrice
  walkAwayPrice = Math.max(walkAwayPrice, initialOfferPrice);
  walkAwayPrice = Math.round(walkAwayPrice);

  // Ensure tactics is array of strings
  const negotiationTactics = Array.isArray(parsed.negotiationTactics)
    ? (parsed.negotiationTactics as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .slice(0, 5)
    : ['Make a fair initial offer based on market data'];

  // Validate counter-offer suggestions
  const counterOfferSuggestions: CounterOfferStep[] = Array.isArray(
    parsed.counterOfferSuggestions
  )
    ? (parsed.counterOfferSuggestions as Record<string, unknown>[])
        .filter((s) => s && typeof s === 'object')
        .slice(0, 3)
        .map((s, i) => ({
          roundNumber: Number(s.roundNumber) || i + 1,
          ifSellerCountersAt: String(s.ifSellerCountersAt || ''),
          suggestedResponse: Math.round(
            Math.max(1, Math.min(Number(s.suggestedResponse) || 0, askingPrice))
          ),
          reasoning: String(s.reasoning || ''),
        }))
    : [];

  return {
    initialOfferPrice,
    walkAwayPrice,
    negotiationTactics,
    counterOfferSuggestions,
    confidence: validateConfidence(parsed.confidence),
    reasoning: String(parsed.reasoning || ''),
    isFallback: false,
    disclaimer: DISCLAIMER,
  };
}

function validateCounterOfferResponse(
  parsed: Record<string, unknown>,
  input: NegotiationStrategyInput,
  counterOfferPrice: number
): CounterOfferAnalysis {
  const marketValue = getMarketValue(input);
  const feeRate = getFeeRate(input.platform);
  const profitAtCounter = Math.round(marketValue * (1 - feeRate) - counterOfferPrice);

  const recommendation = validateRecommendation(parsed.recommendation);

  let suggestedCounterPrice: number | null = null;
  if (recommendation === 'counter' && parsed.suggestedCounterPrice != null) {
    suggestedCounterPrice = Math.round(
      Math.max(1, Math.min(Number(parsed.suggestedCounterPrice) || 0, input.askingPrice))
    );
  }

  return {
    recommendation,
    suggestedCounterPrice,
    reasoning: String(parsed.reasoning || ''),
    confidence: validateConfidence(parsed.confidence),
    profitAtThisPrice: Number(parsed.profitAtThisPrice) || profitAtCounter,
  };
}

// ── Fallback Strategy ────────────────────────────────────────────────────────

export function generateFallbackStrategy(
  input: NegotiationStrategyInput
): NegotiationStrategy {
  const marketValue = getMarketValue(input);
  const isNegotiable = input.negotiable !== false;
  const daysListed = input.daysListed ?? 0;
  const isHighDemand =
    input.demandLevel === 'high' || input.demandLevel === 'very_high';
  const feeRate = getFeeRate(input.platform);

  // Base offer: 75-90% of asking depending on conditions
  let offerPercent = 0.85;

  // Aging thresholds
  if (daysListed > 30) {
    offerPercent -= 0.10; // Stale — aggressive
  } else if (daysListed > 14) {
    offerPercent -= 0.05; // Aging — moderately aggressive
  } else if (daysListed <= 3 && daysListed > 0) {
    offerPercent += 0.03; // Hot/New — less aggressive
  }

  if (isHighDemand) offerPercent += 0.05;
  if (!isNegotiable) offerPercent = 0.95;

  // Clamp offerPercent between 0.50 and 0.95
  offerPercent = Math.max(0.50, Math.min(offerPercent, 0.95));

  const initialOfferPrice = Math.max(1, Math.round(input.askingPrice * offerPercent));

  // Walk-away: marketValue * (1 - feeRate) - $10 minimum profit
  const maxPayable = Math.round(marketValue * (1 - feeRate) - 10);
  const walkAwayPrice = Math.max(
    initialOfferPrice,
    Math.min(Math.round(input.askingPrice), Math.max(1, maxPayable))
  );

  // Build tactics based on conditions
  const tactics: string[] = [];

  if (input.verifiedMarketValue != null && input.askingPrice > input.verifiedMarketValue) {
    tactics.push('Point out that asking price exceeds verified market value');
  }

  if (daysListed > 14) {
    tactics.push(`Mention listing has been up for ${daysListed} days — seller may be motivated`);
  }

  if (input.verifiedMarketValue != null) {
    tactics.push('Reference comparable sold prices to justify your offer');
  }

  if (tactics.length === 0) {
    tactics.push('Make a fair initial offer based on market data');
  }

  // Counter-offer suggestions
  const midPoint = Math.round((initialOfferPrice + walkAwayPrice) / 2);
  const counterOfferSuggestions: CounterOfferStep[] = [
    {
      roundNumber: 1,
      ifSellerCountersAt: `Seller counters near asking price ($${input.askingPrice})`,
      suggestedResponse: midPoint,
      reasoning: 'Meet halfway between initial offer and walk-away price',
    },
  ];

  // Determine confidence
  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (input.verifiedMarketValue != null && input.sellabilityScore != null) {
    confidence = 'high';
  } else if (input.verifiedMarketValue == null && input.estimatedValue == null) {
    confidence = 'low';
  }

  const reasoning = buildFallbackReasoning(input, offerPercent, feeRate);

  return {
    initialOfferPrice,
    walkAwayPrice,
    negotiationTactics: tactics,
    counterOfferSuggestions,
    confidence,
    reasoning,
    isFallback: true,
    disclaimer: DISCLAIMER,
  };
}

function buildFallbackReasoning(
  input: NegotiationStrategyInput,
  offerPercent: number,
  feeRate: number
): string {
  const marketValue = getMarketValue(input);
  const parts: string[] = [];

  parts.push(
    `Algorithmic strategy based on ${Math.round(offerPercent * 100)}% offer ratio.`
  );

  if (input.verifiedMarketValue != null) {
    parts.push(`Verified market value: $${input.verifiedMarketValue}.`);
  } else if (input.estimatedValue != null) {
    parts.push(`Estimated value: $${input.estimatedValue} (no verified data).`);
  }

  parts.push(
    `Platform fee: ${Math.round(feeRate * 100)}%. Max payable for profit: $${Math.round(marketValue * (1 - feeRate) - 10)}.`
  );

  return parts.join(' ');
}

// ── Fallback Counter-Offer Analysis ──────────────────────────────────────────

export function generateFallbackCounterAnalysis(
  input: NegotiationStrategyInput,
  counterOfferPrice: number,
  ourPreviousOffer: number
): CounterOfferAnalysis {
  const marketValue = getMarketValue(input);
  const feeRate = getFeeRate(input.platform);
  const maxPayable = marketValue * (1 - feeRate) - 10;
  const profitAtCounter = Math.round(marketValue * (1 - feeRate) - counterOfferPrice);

  // Bidding war detection
  if (
    counterOfferPrice > input.askingPrice * 1.1 &&
    (input.demandLevel === 'very_high' || input.demandLevel === 'high')
  ) {
    return {
      recommendation: 'walkaway',
      suggestedCounterPrice: null,
      reasoning:
        'Seller counter exceeds asking price with high demand — price escalation detected. Risk of overpaying.',
      confidence: 'high',
      profitAtThisPrice: profitAtCounter,
    };
  }

  if (counterOfferPrice <= ourPreviousOffer) {
    return {
      recommendation: 'accept',
      suggestedCounterPrice: null,
      reasoning: 'Counter-offer is at or below our previous offer — accept the deal.',
      confidence: 'high',
      profitAtThisPrice: profitAtCounter,
    };
  }

  if (counterOfferPrice > maxPayable) {
    return {
      recommendation: 'walkaway',
      suggestedCounterPrice: null,
      reasoning: `Counter-offer of $${counterOfferPrice} exceeds maximum payable ($${Math.round(maxPayable)}) for minimum profit after ${Math.round(feeRate * 100)}% platform fees.`,
      confidence: 'high',
      profitAtThisPrice: profitAtCounter,
    };
  }

  // Counter at midpoint
  const suggestedCounter = Math.round((ourPreviousOffer + counterOfferPrice) / 2);
  return {
    recommendation: 'counter',
    suggestedCounterPrice: suggestedCounter,
    reasoning: `Counter at $${suggestedCounter} — halfway between our offer ($${ourPreviousOffer}) and seller's counter ($${counterOfferPrice}). Estimated profit: $${profitAtCounter}.`,
    confidence: 'medium',
    profitAtThisPrice: profitAtCounter,
  };
}

// ── Main Functions ───────────────────────────────────────────────────────────

function applyMarketDataFreshnessCheck(
  strategy: NegotiationStrategy,
  marketDataDate: Date | null
): NegotiationStrategy {
  if (!marketDataDate) return strategy;

  const marketDataAge = Math.floor(
    (Date.now() - marketDataDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (marketDataAge > 14) {
    return {
      ...strategy,
      confidence: 'low',
      reasoning:
        strategy.reasoning +
        ` Note: Market data is ${marketDataAge} days old — recommendations may not reflect current market.`,
    };
  }

  return strategy;
}

export async function generateNegotiationStrategy(
  input: NegotiationStrategyInput
): Promise<NegotiationStrategy> {
  // Check cache
  const cached = await getCachedStrategy(input.listingId);
  if (cached) return cached;

  // No API key → fallback immediately
  if (!process.env.OPENAI_API_KEY) {
    metrics.increment('negotiation_fallback_used');
    const fallback = applyMarketDataFreshnessCheck(
      generateFallbackStrategy(input),
      input.marketDataDate
    );
    await cacheStrategy(input.listingId, fallback);
    return fallback;
  }

  const end = logger.timed('negotiation_strategy_generation');

  try {
    const client = getOpenAI();
    const prompt = buildNegotiationPrompt(input);

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert marketplace negotiation strategist. Analyze the listing economics and seller signals to recommend an optimal offer strategy. Base your recommendations on verified market data, item condition, and listing age. Always respond with valid JSON only. Be conservative — it is better to offer slightly too low than overpay.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const responseText = response.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('Failed to extract JSON from negotiation strategy response', {
        listingId: input.listingId,
        responsePreview: responseText.slice(0, 200),
      });
      metrics.increment('negotiation_fallback_used');
      const fallback = applyMarketDataFreshnessCheck(
        generateFallbackStrategy(input),
        input.marketDataDate
      );
      await cacheStrategy(input.listingId, fallback);
      end();
      return fallback;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const strategy = applyMarketDataFreshnessCheck(
      validateStrategyResponse(parsed, input),
      input.marketDataDate
    );

    metrics.increment('negotiation_strategy_generated');
    await cacheStrategy(input.listingId, strategy);
    end();
    return strategy;
  } catch (error) {
    logger.error('Negotiation strategy generation failed, using fallback', {
      listingId: input.listingId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    metrics.increment('negotiation_generation_error');
    metrics.increment('negotiation_fallback_used');
    if (error instanceof Error) {
      captureError(error, {
        route: '/api/listings/[id]/negotiation-strategy',
        action: 'generateNegotiationStrategy',
      });
    }
    const fallback = applyMarketDataFreshnessCheck(
      generateFallbackStrategy(input),
      input.marketDataDate
    );
    await cacheStrategy(input.listingId, fallback);
    end();
    return fallback;
  }
}

export async function analyzeCounterOffer(
  input: NegotiationStrategyInput,
  counterOfferPrice: number,
  ourPreviousOffer: number
): Promise<CounterOfferAnalysis> {
  // No API key → fallback immediately
  if (!process.env.OPENAI_API_KEY) {
    metrics.increment('negotiation_counter_offer_analyzed');
    return generateFallbackCounterAnalysis(input, counterOfferPrice, ourPreviousOffer);
  }

  const end = logger.timed('negotiation_counter_offer_analysis');

  try {
    const client = getOpenAI();
    const prompt = buildCounterOfferPrompt(input, counterOfferPrice, ourPreviousOffer);

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert marketplace negotiation strategist. Analyze counter-offers and recommend whether to accept, counter, or walk away. Always respond with valid JSON only. Be conservative.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const responseText = response.choices[0]?.message?.content || '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('Failed to extract JSON from counter-offer analysis response', {
        listingId: input.listingId,
      });
      metrics.increment('negotiation_counter_offer_analyzed');
      end();
      return generateFallbackCounterAnalysis(input, counterOfferPrice, ourPreviousOffer);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const analysis = validateCounterOfferResponse(parsed, input, counterOfferPrice);

    metrics.increment('negotiation_counter_offer_analyzed');
    end();
    return analysis;
  } catch (error) {
    logger.error('Counter-offer analysis failed, using fallback', {
      listingId: input.listingId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    metrics.increment('negotiation_generation_error');
    if (error instanceof Error) {
      captureError(error, {
        route: '/api/listings/[id]/counter-offer-analysis',
        action: 'analyzeCounterOffer',
      });
    }
    metrics.increment('negotiation_counter_offer_analyzed');
    end();
    return generateFallbackCounterAnalysis(input, counterOfferPrice, ourPreviousOffer);
  }
}

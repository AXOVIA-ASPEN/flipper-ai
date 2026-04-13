/**
 * @file src/lib/ai/prompts/negotiation.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Prompt configs for negotiation strategy and counter-offer analysis.
 *
 * @description
 * Contains two prompt configurations extracted from negotiation-strategy.ts:
 * negotiationStrategy (optimal offer strategy generation) and
 * counterOfferAnalysis (accept/counter/walkaway recommendation for seller
 * counter-offers). Both include detailed listing economics and seller signals.
 */

import type { PromptConfig } from './types';

export const negotiationStrategy: PromptConfig = {
  name: 'negotiationStrategy',
  description:
    'Generates an optimal negotiation strategy with initial offer, walk-away price, tactics, and counter-offer suggestions.',
  provider: 'gemini',
  fallbacks: ['groq', 'openai'],
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 600,
  responseFormat: 'json',
  systemPrompt:
    'You are an expert marketplace negotiation strategist. Analyze the listing economics and seller signals to recommend an optimal offer strategy. Base your recommendations on verified market data, item condition, and listing age. Always respond with valid JSON only. Be conservative \u2014 it is better to offer slightly too low than overpay.',
  buildUserPrompt: (context: Record<string, unknown>) => {
    const askingPrice = context.askingPrice as number;
    const verifiedMarketValue = context.verifiedMarketValue as number | null;
    const estimatedValue = context.estimatedValue as number | null;
    const platform = String(context.platform ?? '');
    const feePercent = context.feePercent as number;
    const discountPercent = context.discountPercent as number;
    const condition = context.condition as string | null;
    const daysListed = context.daysListed as number | null;
    const negotiable = context.negotiable as boolean | null;
    const demandLevel = context.demandLevel as string | null;
    const sellabilityScore = context.sellabilityScore as number | null;

    return `Analyze this marketplace listing and recommend an optimal negotiation strategy.

LISTING ECONOMICS:
- Asking Price: $${askingPrice}
- Verified Market Value: ${verifiedMarketValue != null ? `$${verifiedMarketValue}` : 'N/A'}
- Estimated Value: ${estimatedValue != null ? `$${estimatedValue}` : 'N/A'}
- Discount from Market: ${discountPercent}%
- Platform: ${platform} (${feePercent}% selling fees)

ITEM SIGNALS:
- Condition: ${condition || 'Unknown'}
- Days Listed: ${daysListed != null ? daysListed : 'Unknown'}
- Seller Says Negotiable: ${negotiable === true ? 'Yes' : negotiable === false ? 'No (firm price)' : 'Unknown'}
- Demand Level: ${demandLevel || 'Unknown'}
- Sellability Score: ${sellabilityScore != null ? `${sellabilityScore}/100` : 'Unknown'}

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
  },
};

export const counterOfferAnalysis: PromptConfig = {
  name: 'counterOfferAnalysis',
  description:
    'Analyzes a seller counter-offer and recommends whether to accept, counter, or walk away.',
  provider: 'groq',
  fallbacks: ['gemini', 'openai'],
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 400,
  responseFormat: 'json',
  systemPrompt:
    'You are an expert marketplace negotiation strategist. Analyze counter-offers and recommend whether to accept, counter, or walk away. Always respond with valid JSON only. Be conservative.',
  buildUserPrompt: (context: Record<string, unknown>) => {
    const askingPrice = context.askingPrice as number;
    const ourPreviousOffer = context.ourPreviousOffer as number;
    const counterOfferPrice = context.counterOfferPrice as number;
    const verifiedMarketValue = context.verifiedMarketValue as number | null;
    const estimatedValue = context.estimatedValue as number | null;
    const feePercent = context.feePercent as number;
    const profitAtCounter = context.profitAtCounter as number;
    const demandLevel = context.demandLevel as string | null;
    const daysListed = context.daysListed as number | null;
    const negotiable = context.negotiable as boolean | null;

    return `Analyze this seller counter-offer and recommend whether to accept, counter, or walk away.

CONTEXT:
- Asking Price: $${askingPrice}
- Our Previous Offer: $${ourPreviousOffer}
- Seller Counter-Offer: $${counterOfferPrice}
- Verified Market Value: ${verifiedMarketValue != null ? `$${verifiedMarketValue}` : 'N/A'}
- Estimated Value: ${estimatedValue != null ? `$${estimatedValue}` : 'N/A'}
- Platform Fees: ${feePercent}%
- Estimated Profit at Counter Price: $${profitAtCounter}
- Demand Level: ${demandLevel || 'Unknown'}
- Days Listed: ${daysListed != null ? daysListed : 'Unknown'}
- Negotiable: ${negotiable === true ? 'Yes' : negotiable === false ? 'No' : 'Unknown'}

Respond with ONLY valid JSON:
{
  "recommendation": "accept|counter|walkaway",
  "suggestedCounterPrice": <number or null>,
  "reasoning": "<2-3 sentence explanation>",
  "confidence": "low|medium|high",
  "profitAtThisPrice": <number>
}`;
  },
};

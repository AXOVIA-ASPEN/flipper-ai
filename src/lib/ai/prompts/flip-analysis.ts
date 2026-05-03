/**
 * @file src/lib/ai/prompts/flip-analysis.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Prompt configs for flip/sellability analysis and Claude-based listing analysis.
 *
 * @description
 * Contains three prompt configurations extracted from llm-analyzer.ts and
 * claude-analyzer.ts: flipAnalysis (full sellability assessment),
 * quickDiscountCheck (lightweight algorithmic pre-filter — note: this is
 * actually a pure function, not an LLM prompt, but registered here for
 * completeness), and claudeAnalysis (Anthropic Claude listing analysis).
 */

import type { PromptConfig } from './types';

export const flipAnalysis: PromptConfig = {
  name: 'flipAnalysis',
  description: 'Full sellability analysis for a marketplace listing using market data and item identification.',
  provider: 'groq',
  fallbacks: ['gemini', 'openai'],
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 800,
  responseFormat: 'json',
  systemPrompt:
    'You are a resale market expert. Always respond with valid JSON only, no markdown formatting.',
  buildUserPrompt: (context: Record<string, unknown>) => {
    const discountThreshold = (context.discountThreshold as number) ?? 50;
    const feeRate = (context.feeRate as number) ?? 0.13;
    const feePercent = Math.round(feeRate * 100);

    const title = String(context.title ?? '');
    const askingPrice = String(context.askingPrice ?? '');
    const brand = String(context.brand ?? 'Unknown');
    const model = String(context.model ?? 'Unknown');
    const variant = String(context.variant ?? '');
    const condition = String(context.condition ?? '');
    const conditionNotes = String(context.conditionNotes ?? '');
    const medianPrice = String(context.medianPrice ?? '');
    const lowPrice = String(context.lowPrice ?? '');
    const highPrice = String(context.highPrice ?? '');
    const salesCount = String(context.salesCount ?? '');
    const outliersRemoved = String(context.outliersRemoved ?? '');
    const lowSampleSize = String(context.lowSampleSize ?? '');
    const soldListingsText = String(context.soldListingsText ?? '');

    return `You are an expert reseller analyzing a marketplace listing for flip potential.

LISTING DETAILS:
- Title: ${title}
- Asking Price: $${askingPrice}
- Identified as: ${brand} ${model} ${variant}
- Condition: ${condition} (${conditionNotes})

MARKET DATA (from eBay sold listings, outliers removed via IQR filtering):
- Median Sold Price: $${medianPrice}
- Price Range: $${lowPrice} - $${highPrice}
- Recent Sales Count: ${salesCount}
- Outliers Removed: ${outliersRemoved}
- Low Sample Size: ${lowSampleSize}
- Sample Sold Listings:
${soldListingsText}

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
  },
};

export const quickDiscountCheck: PromptConfig = {
  name: 'quickDiscountCheck',
  description:
    'Lightweight algorithmic pre-filter that checks if a listing meets a minimum discount threshold before expensive LLM analysis.',
  provider: 'groq',
  fallbacks: ['gemini', 'openai'],
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 200,
  responseFormat: 'json',
  systemPrompt:
    'You are a resale market expert. Respond with valid JSON only.',
  buildUserPrompt: (context: Record<string, unknown>) => {
    const title = String(context.title ?? '');
    const askingPrice = context.askingPrice as number;
    const medianPrice = context.medianPrice as number;

    return `Analyze this listing and return ONLY a JSON object: "${title}" at $${askingPrice}. Market median: $${medianPrice}. Include fields: verifiedMarketValue, trueDiscountPercent, sellabilityScore (0-100), demandLevel, expectedDaysToSell, authenticityRisk, conditionRisk, recommendedOfferPrice, recommendedListPrice, resaleStrategy, resalePlatform, confidence, reasoning, meetsThreshold.`;
  },
};

export const claudeAnalysis: PromptConfig = {
  name: 'claudeAnalysis',
  description:
    'Structured listing analysis using Anthropic Claude for category, condition, brand, and flippability assessment.',
  provider: 'anthropic',
  // Tier-2 analysis prefers Anthropic Claude for structural reasoning, then
  // falls through Groq → Gemini → OpenAI to keep the chain available even
  // when Anthropic credentials aren't provisioned in dev/test environments.
  fallbacks: ['groq', 'gemini', 'openai'],
  model: 'claude-sonnet-4-5-20250929',
  temperature: 0.3,
  maxTokens: 1500,
  responseFormat: 'json',
  systemPrompt:
    'You are a resale market expert. Always respond with valid JSON only, no markdown formatting.',
  buildUserPrompt: (context: Record<string, unknown>) => {
    const title = String(context.title ?? '');
    const description = context.description != null ? String(context.description) : 'No description provided';
    const askingPrice = context.askingPrice as number;
    const imageCount = (context.imageCount as number) ?? 0;

    return `Analyze this marketplace listing and provide a structured assessment:

**Title:** ${title}

**Description:** ${description}

**Asking Price:** $${askingPrice}

${imageCount > 0 ? `**Images:** ${imageCount} images available` : '**Images:** None'}

Please provide a JSON response with the following structure:
{
  "category": "main category (electronics, furniture, tools, etc.)",
  "subcategory": "more specific category if applicable",
  "brand": "brand name if identifiable",
  "condition": "estimated condition (new, like new, excellent, good, fair, poor)",
  "estimatedAge": "approximate age (e.g., '1-2 years', '5+ years')",
  "keyFeatures": ["list", "of", "notable", "features"],
  "potentialIssues": ["list", "of", "concerns", "or", "red flags"],
  "flippabilityScore": 0-100,
  "confidence": "low/medium/high",
  "reasoning": "brief explanation of the flippability score",
  "marketTrends": "relevant market context (demand, trends)",
  "targetBuyer": "who would buy this item"
}

Consider:
- Brand value and reputation
- Condition indicators from description
- Price relative to typical market value
- Resale demand and liquidity
- Shipping/handling complexity
- Red flags (damage, missing parts, outdated tech)

Be realistic and conservative in your assessment.`;
  },
};

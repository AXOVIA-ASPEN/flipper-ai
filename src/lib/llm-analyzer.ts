// LLM-powered sellability analysis
// Given item identification and market data, assess flip potential using OpenAI ChatGPT

import OpenAI from 'openai';
import type { ItemIdentification } from './llm-identifier';
import type { MarketPrice, SoldListing } from './market-price';

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
  meetsThreshold: boolean; // True if 50%+ undervalued
}

const ANALYSIS_PROMPT = `You are an expert reseller analyzing a marketplace listing for flip potential.

LISTING DETAILS:
- Title: {title}
- Asking Price: ${'{askingPrice}'}
- Identified as: {brand} {model} {variant}
- Condition: {condition} ({conditionNotes})

MARKET DATA (from eBay sold listings):
- Median Sold Price: ${'{medianPrice}'}
- Price Range: ${'{lowPrice}'} - ${'{highPrice}'}
- Recent Sales Count: {salesCount}
- Sample Sold Listings:
{soldListingsText}

TASK:
Analyze this opportunity and provide a detailed assessment. The listing must be at least 50% below market value to be considered a good opportunity.

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
  "meetsThreshold": <true if 50%+ undervalued, false otherwise>
}

GUIDELINES:
- verifiedMarketValue should be based on the median sold price, adjusted for condition
- trueDiscountPercent = ((verifiedMarketValue - askingPrice) / verifiedMarketValue) * 100
- meetsThreshold = true ONLY if trueDiscountPercent >= 50
- Be conservative with value estimates - use lower end for worn items
- Factor in 13% platform fees when recommending list price
- Consider shipping costs for large/heavy items`;

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

export async function analyzeSellability(
  title: string,
  askingPrice: number,
  identification: ItemIdentification,
  marketData: MarketPrice
): Promise<SellabilityAnalysis | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY not set, skipping LLM analysis');
    return null;
  }

  try {
    const client = getOpenAI();

    // Format sold listings for the prompt
    const soldListingsText = marketData.soldListings
      .slice(0, 5)
      .map((l) => `  - "${l.title}" sold for $${l.price} (${l.condition})`)
      .join('\n');

    const prompt = ANALYSIS_PROMPT.replace('{title}', title)
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
      .replace('{soldListingsText}', soldListingsText);

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a resale market expert. Always respond with valid JSON only, no markdown formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    /* istanbul ignore next -- defensive fallback for empty/null API response content */
    const responseText = response.choices[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from LLM analysis:', responseText);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      verifiedMarketValue: parsed.verifiedMarketValue || marketData.medianPrice,
      trueDiscountPercent: parsed.trueDiscountPercent || 0,
      sellabilityScore: Math.min(100, Math.max(0, parsed.sellabilityScore || 50)),
      demandLevel: validateDemandLevel(parsed.demandLevel),
      expectedDaysToSell: parsed.expectedDaysToSell || 14,
      authenticityRisk: validateRisk(parsed.authenticityRisk),
      conditionRisk: validateRisk(parsed.conditionRisk),
      recommendedOfferPrice: parsed.recommendedOfferPrice || askingPrice,
      recommendedListPrice: parsed.recommendedListPrice || marketData.medianPrice,
      resaleStrategy: parsed.resaleStrategy || 'List on eBay with detailed photos',
      resalePlatform: parsed.resalePlatform || 'ebay',
      comparableSales: marketData.soldListings.slice(0, 5),
      confidence: validateConfidence(parsed.confidence),
      reasoning: parsed.reasoning || '',
      meetsThreshold: parsed.meetsThreshold === true,
    };
  } catch (error) {
    console.error('LLM analysis error:', error);
    return null;
  }
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
  marketData: MarketPrice
): Promise<FullAnalysisResult | null> {
  // Run sellability analysis
  const analysis = await analyzeSellability(title, askingPrice, identification, marketData);

  if (!analysis) {
    return null;
  }

  return {
    identification,
    marketData,
    analysis,
  };
}

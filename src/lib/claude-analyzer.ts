/**
 * Claude AI Analyzer
 * Author: Stephen Boyett
 * Company: Axovia AI
 * 
 * Integrates Claude API for intelligent listing analysis.
 * Provides structured analysis of item category, condition, brand, and flippability.
 */

import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db";

const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-5-20250929";
const CACHE_DURATION_HOURS = 24;

export interface ClaudeAnalysisResult {
  category: string;
  subcategory?: string;
  brand?: string;
  condition: string;
  estimatedAge?: string;
  keyFeatures: string[];
  potentialIssues: string[];
  flippabilityScore: number; // 0-100
  confidence: "low" | "medium" | "high";
  reasoning: string;
  marketTrends?: string;
  targetBuyer?: string;
}

interface CachedAnalysis {
  id: string;
  listingId: string;
  analysisResult: string; // JSON
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Check if we have a cached analysis for this listing
 */
async function getCachedAnalysis(
  listingId: string
): Promise<ClaudeAnalysisResult | null> {
  try {
    const cached = await prisma.aiAnalysisCache.findFirst({
      where: {
        listingId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (cached) {
      return JSON.parse(cached.analysisResult);
    }
  } catch (error) {
    console.error("Error fetching cached analysis:", error);
  }

  return null;
}

/**
 * Store analysis result in cache
 */
async function cacheAnalysis(
  listingId: string,
  result: ClaudeAnalysisResult
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

  try {
    await prisma.aiAnalysisCache.create({
      data: {
        listingId,
        analysisResult: JSON.stringify(result),
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Error caching analysis:", error);
  }
}

/**
 * Build the prompt for Claude to analyze a listing
 */
function buildAnalysisPrompt(
  title: string,
  description: string | null,
  askingPrice: number,
  imageUrls?: string[]
): string {
  return `Analyze this marketplace listing and provide a structured assessment:

**Title:** ${title}

**Description:** ${description || "No description provided"}

**Asking Price:** $${askingPrice}

${imageUrls && imageUrls.length > 0 ? `**Images:** ${imageUrls.length} images available` : "**Images:** None"}

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
}

/**
 * Parse Claude's response into structured format
 */
function parseClaudeResponse(text: string): ClaudeAnalysisResult {
  try {
    // Extract JSON from response (Claude sometimes wraps it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize
    return {
      category: parsed.category || "other",
      subcategory: parsed.subcategory || undefined,
      brand: parsed.brand || undefined,
      condition: parsed.condition || "good",
      estimatedAge: parsed.estimatedAge || undefined,
      keyFeatures: Array.isArray(parsed.keyFeatures)
        ? parsed.keyFeatures
        : [],
      potentialIssues: Array.isArray(parsed.potentialIssues)
        ? parsed.potentialIssues
        : [],
      flippabilityScore: Math.max(
        0,
        Math.min(100, parsed.flippabilityScore || 50)
      ),
      confidence: ["low", "medium", "high"].includes(parsed.confidence)
        ? parsed.confidence
        : "medium",
      reasoning: parsed.reasoning || "No reasoning provided",
      marketTrends: parsed.marketTrends || undefined,
      targetBuyer: parsed.targetBuyer || undefined,
    };
  } catch (error) {
    console.error("Error parsing Claude response:", error);
    throw new Error(`Failed to parse Claude response: ${error}`);
  }
}

/**
 * Call Claude API for listing analysis
 */
async function callClaudeAPI(prompt: string): Promise<string> {
  if (!CLAUDE_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY or CLAUDE_API_KEY not configured");
  }

  const client = new Anthropic({
    apiKey: CLAUDE_API_KEY,
  });

  try {
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    return textContent.text;
  } catch (error: unknown) {
    // Handle rate limiting
    if (error && typeof error === "object" && "status" in error) {
      const apiError = error as { status?: number; message?: string };
      if (apiError.status === 429) {
        throw new Error("Claude API rate limit exceeded. Please try again later.");
      }
      if (apiError.message) {
        throw new Error(`Claude API error: ${apiError.message}`);
      }
    }

    // Handle other errors
    if (error instanceof Error) {
      if (error.message.includes("rate limit") || error.message.includes("429")) {
        throw new Error("Claude API rate limit exceeded. Please try again later.");
      }
      throw error;
    }

    throw new Error("Unknown error calling Claude API");
  }
}

/**
 * Analyze a listing using Claude AI
 * Checks cache first, falls back to API call if needed
 */
export async function analyzeListing(
  listingId: string
): Promise<ClaudeAnalysisResult> {
  // Check cache first
  const cached = await getCachedAnalysis(listingId);
  if (cached) {
    return cached;
  }

  // Fetch listing details
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    throw new Error(`Listing not found: ${listingId}`);
  }

  // Parse image URLs
  let imageUrls: string[] = [];
  if (listing.imageUrls) {
    try {
      imageUrls = JSON.parse(listing.imageUrls);
    } catch {
      // Ignore parse errors
    }
  }

  // Build prompt and call API
  const prompt = buildAnalysisPrompt(
    listing.title,
    listing.description,
    listing.askingPrice,
    imageUrls
  );

  const responseText = await callClaudeAPI(prompt);
  const result = parseClaudeResponse(responseText);

  // Cache the result
  await cacheAnalysis(listingId, result);

  return result;
}

/**
 * Analyze a listing using provided data (without saving to DB)
 * Useful for preview/testing
 */
export async function analyzeListingData(
  title: string,
  description: string | null,
  askingPrice: number,
  imageUrls?: string[]
): Promise<ClaudeAnalysisResult> {
  const prompt = buildAnalysisPrompt(title, description, askingPrice, imageUrls);
  const responseText = await callClaudeAPI(prompt);
  return parseClaudeResponse(responseText);
}

/**
 * Batch analyze multiple listings
 * Includes rate limit handling and progress tracking
 */
export async function batchAnalyzeListings(
  listingIds: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<{
  successful: number;
  failed: number;
  cached: number;
  errors: Array<{ listingId: string; error: string }>;
}> {
  let successful = 0;
  let failed = 0;
  let cached = 0;
  const errors: Array<{ listingId: string; error: string }> = [];

  for (let i = 0; i < listingIds.length; i++) {
    const listingId = listingIds[i];

    try {
      // Check if cached
      const cachedResult = await getCachedAnalysis(listingId);
      if (cachedResult) {
        cached++;
        successful++;
      } else {
        // Analyze and cache
        await analyzeListing(listingId);
        successful++;

        // Rate limit: wait 1 second between API calls
        if (i < listingIds.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      failed++;
      errors.push({
        listingId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (onProgress) {
      onProgress(i + 1, listingIds.length);
    }
  }

  return { successful, failed, cached, errors };
}

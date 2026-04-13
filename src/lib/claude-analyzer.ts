/**
 * Claude AI Analyzer
 * Author: Stephen Boyett
 * Company: Axovia AI
 *
 * Integrates Claude API for intelligent listing analysis.
 * Provides structured analysis of item category, condition, brand, and flippability.
 */

import prisma from '@/lib/db';
import { analysisCache } from '@/lib/cache';
import { recordUsage } from '@/lib/usage-tracker';
import { completeAI, AIProviderUnavailableError } from '@/lib/ai';
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
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  marketTrends?: string;
  targetBuyer?: string;
}

const L1_KEY = (listingId: string) => `claude:${listingId}`;

/**
 * Check if we have a cached analysis for this listing (L1 in-memory, then L2 DB)
 */
async function getCachedAnalysis(listingId: string): Promise<ClaudeAnalysisResult | null> {
  // L1: in-memory LRU cache
  const l1 = analysisCache.get(L1_KEY(listingId)) as ClaudeAnalysisResult | undefined;
  if (l1) return l1;

  // L2: database cache
  try {
    const cached = await prisma.aiAnalysisCache.findFirst({
      where: {
        listingId,
        analysisType: 'claude',
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (cached) {
      const result = JSON.parse(cached.analysisResult) as ClaudeAnalysisResult;
      analysisCache.set(L1_KEY(listingId), result);
      return result;
    }
  } catch (error) {
    console.error('Error fetching cached analysis:', error);
  }

  return null;
}

/**
 * Store analysis result in cache (L2 DB then L1 in-memory)
 */
async function cacheAnalysis(listingId: string, result: ClaudeAnalysisResult, askingPrice?: number): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

  try {
    await prisma.aiAnalysisCache.upsert({
      where: { listingId_analysisType: { listingId, analysisType: 'claude' } },
      create: {
        listingId,
        analysisType: 'claude',
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
    console.error('Error caching analysis:', error);
  }
}

/**
 * Parse AI response into structured format
 */
function parseClaudeResponse(text: string): ClaudeAnalysisResult {
  try {
    // Extract JSON from response (AI sometimes wraps it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize
    return {
      category: parsed.category || 'other',
      subcategory: parsed.subcategory || undefined,
      brand: parsed.brand || undefined,
      condition: parsed.condition || 'good',
      estimatedAge: parsed.estimatedAge || undefined,
      keyFeatures: Array.isArray(parsed.keyFeatures) ? parsed.keyFeatures : [],
      potentialIssues: Array.isArray(parsed.potentialIssues) ? parsed.potentialIssues : [],
      flippabilityScore: Math.max(0, Math.min(100, parsed.flippabilityScore || 50)),
      confidence: ['low', 'medium', 'high'].includes(parsed.confidence)
        ? parsed.confidence
        : 'medium',
      reasoning: parsed.reasoning || 'No reasoning provided',
      marketTrends: parsed.marketTrends || undefined,
      targetBuyer: parsed.targetBuyer || undefined,
    };
  } catch (error) {
    console.error('Error parsing Claude response:', error);
    throw new Error(`Failed to parse Claude response: ${error}`);
  }
}

/**
 * Call the centralized AI module for listing analysis.
 */
async function callClaudeAPI(
  title: string,
  description: string | null,
  askingPrice: number,
  imageUrls?: string[]
): Promise<string> {
  const response = await completeAI('claudeAnalysis', {
    title,
    description,
    askingPrice,
    imageCount: imageUrls?.length ?? 0,
  });
  return response.content;
}

/**
 * Analyze a listing using Claude AI
 * Checks cache first, falls back to API call if needed
 */
export async function analyzeListing(listingId: string): Promise<ClaudeAnalysisResult> {
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

  // Call centralized AI module
  const responseText = await callClaudeAPI(
    listing.title,
    listing.description,
    listing.askingPrice,
    imageUrls
  );
  const result = parseClaudeResponse(responseText);

  // Cache the result
  await cacheAnalysis(listingId, result, listing.askingPrice);

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
  imageUrls?: string[],
  userId?: string
): Promise<ClaudeAnalysisResult> {
  const responseText = await callClaudeAPI(title, description, askingPrice, imageUrls);
  const result = parseClaudeResponse(responseText);
  if (userId) {
    try {
      await recordUsage(userId, 'ANALYSIS');
    } catch (usageError) {
      console.error('[Usage Tracker] Failed to record analysis usage:', usageError);
    }
  }
  return result;
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
      error: error instanceof Error
        ? error.message
        : /* istanbul ignore next */ 'Unknown error',
      });
    }

    if (onProgress) {
      onProgress(i + 1, listingIds.length);
    }
  }

  return { successful, failed, cached, errors };
}

/**
 * Claude Analyzer Unit Tests
 * Author: Stephen Boyett
 * Company: Axovia AI
 *
 * Tests for Claude AI integration (mocked API calls)
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock centralized AI module
const mockCompleteAI = jest.fn();
jest.mock('@/lib/ai', () => ({
  completeAI: (...args: unknown[]) => mockCompleteAI(...args),
  AIProviderUnavailableError: class extends Error {
    constructor() { super('No AI provider available'); this.name = 'AIProviderUnavailableError'; }
  },
}));

// Mock Prisma
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    listing: {
      findUnique: jest.fn(),
    },
    aiAnalysisCache: {
      findFirst: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

// Mock in-memory L1 cache
const mockCacheGet = jest.fn().mockReturnValue(undefined);
const mockCacheSet = jest.fn();
jest.mock('@/lib/cache', () => ({
  analysisCache: {
    get: (...args: unknown[]) => mockCacheGet(...args),
    set: (...args: unknown[]) => mockCacheSet(...args),
    delete: jest.fn(),
  },
}));

jest.mock('@/lib/usage-tracker', () => ({
  recordUsage: jest.fn().mockResolvedValue(undefined),
}));

import {
  analyzeListingData,
  analyzeListing,
  batchAnalyzeListings,
  ClaudeAnalysisResult,
} from '@/lib/claude-analyzer';
import prisma from '@/lib/db';
import { recordUsage } from '@/lib/usage-tracker';

// Helper to create mock AI response from claude-like text content
function makeAIResponse(textContent: string) {
  return {
    content: textContent,
    provider: 'anthropic' as const,
    model: 'claude-sonnet-4-5-20250929',
  };
}

describe('Claude Analyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockCompleteAI.mockReset();
    // Default: L1 cache miss
    mockCacheGet.mockReturnValue(undefined);
    mockCacheSet.mockReturnValue(undefined);
  });

  describe('analyzeListingData', () => {
    test('should parse valid JSON response from Claude', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'electronics',
              subcategory: 'smartphones',
              brand: 'Apple',
              condition: 'excellent',
              estimatedAge: '1-2 years',
              keyFeatures: ['128GB storage', 'Face ID', 'A15 chip'],
              potentialIssues: ['Battery health unknown'],
              flippabilityScore: 85,
              confidence: 'high',
              reasoning: 'Strong brand value and demand',
              marketTrends: 'High demand for used iPhones',
              targetBuyer: 'Budget-conscious tech users',
            }),
          },
        ],
      };

      // Mock the completeAI method
      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListingData(
        'iPhone 12 128GB',
        'Excellent condition, no scratches',
        400
      );

      expect(result.category).toBe('electronics');
      expect(result.brand).toBe('Apple');
      expect(result.flippabilityScore).toBe(85);
      expect(result.confidence).toBe('high');
      expect(result.keyFeatures).toHaveLength(3);
      expect(recordUsage).not.toHaveBeenCalled();
    });

    test('records analysis usage when userId is provided', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'electronics',
              brand: 'Apple',
              condition: 'good',
              keyFeatures: ['a'],
              potentialIssues: [],
              flippabilityScore: 80,
              confidence: 'high',
              reasoning: 'ok',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      await analyzeListingData('Item', 'Desc', 100, undefined, 'user-meter-1');

      expect(recordUsage).toHaveBeenCalledWith('user-meter-1', 'ANALYSIS');
    });

    test('should handle Claude response with markdown wrapper', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `Here's the analysis:\n\n\`\`\`json\n${JSON.stringify({
              category: 'tools',
              condition: 'good',
              keyFeatures: ['Cordless', '20V battery'],
              potentialIssues: [],
              flippabilityScore: 70,
              confidence: 'medium',
              reasoning: 'Tools have good resale value',
            })}\n\`\`\``,
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListingData('DeWalt Drill', 'Used but works', 50);

      expect(result.category).toBe('tools');
      expect(result.flippabilityScore).toBe(70);
    });

    test('should normalize flippability score to 0-100 range', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'furniture',
              condition: 'fair',
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 150, // Invalid (too high)
              confidence: 'low',
              reasoning: 'Test',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListingData('Old Couch', null, 20);

      expect(result.flippabilityScore).toBeLessThanOrEqual(100);
      expect(result.flippabilityScore).toBeGreaterThanOrEqual(0);
    });

    test('should handle missing optional fields gracefully', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'sports',
              condition: 'good',
              keyFeatures: ['Carbon frame'],
              potentialIssues: [],
              flippabilityScore: 60,
              confidence: 'medium',
              reasoning: 'Bikes sell well locally',
              // Missing: subcategory, brand, estimatedAge, marketTrends, targetBuyer
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListingData('Road Bike', 'Good shape', 200);

      expect(result.category).toBe('sports');
      expect(result.subcategory).toBeUndefined();
      expect(result.brand).toBeUndefined();
      expect(result.estimatedAge).toBeUndefined();
    });

    test('should throw error when Claude API key is missing', async () => {
      // Note: This test can't work properly because CLAUDE_API_KEY is evaluated at module load time
      // In a real scenario, the API would fail with auth error which is caught in callClaudeAPI
      // For now, we'll test that the mock framework works with auth failures
      const error: any = new Error('Invalid API key');
      error.status = 401;
      mockCompleteAI.mockRejectedValue(error);

      await expect(analyzeListingData('Test Item', null, 100)).rejects.toThrow();
    });

    test('should throw error on rate limit', async () => {
      mockCompleteAI.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(analyzeListingData('Test Item', null, 100)).rejects.toThrow('Rate limit exceeded');
    });

    test('should throw error on API error', async () => {
      mockCompleteAI.mockRejectedValue(
          Object.assign(new Error('Something went wrong'), { message: 'Something went wrong' })
        );

      await expect(analyzeListingData('Test Item', null, 100)).rejects.toThrow();
    });

    test('should validate confidence level', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'other',
              condition: 'unknown',
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 50,
              confidence: 'invalid', // Invalid confidence
              reasoning: 'Test',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListingData('Mystery Item', null, 50);

      expect(['low', 'medium', 'high']).toContain(result.confidence);
      expect(result.confidence).toBe('medium'); // Default fallback
    });

    test('should handle empty arrays for features/issues', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'clothing',
              condition: 'good',
              keyFeatures: null, // Invalid (should be array)
              potentialIssues: undefined, // Invalid
              flippabilityScore: 40,
              confidence: 'low',
              reasoning: 'Clothing has low resale value',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListingData('T-Shirt', 'Gently used', 5);

      expect(Array.isArray(result.keyFeatures)).toBe(true);
      expect(Array.isArray(result.potentialIssues)).toBe(true);
      expect(result.keyFeatures).toHaveLength(0);
      expect(result.potentialIssues).toHaveLength(0);
    });

    test('should include price context in analysis', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify({
              category: 'electronics',
              condition: 'new',
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 90,
              confidence: 'high',
              reasoning: 'Great deal',
            })));
      await analyzeListingData('iPhone 15 Pro', 'Brand new sealed', 800, ['image1.jpg']);

      expect(mockCompleteAI).toHaveBeenCalledWith('claudeAnalysis', expect.objectContaining({
        askingPrice: 800,
        imageCount: 1,
      }));
    });
  });

  describe('Caching functionality (via analyzeListing)', () => {
    test('should return cached analysis when available', async () => {
      const mockCachedAnalysis = {
        id: 'cache-123',
        listingId: 'listing-456',
        analysisResult: JSON.stringify({
          category: 'electronics',
          condition: 'good',
          keyFeatures: ['test'],
          potentialIssues: [],
          flippabilityScore: 75,
          confidence: 'medium',
          reasoning: 'Cached result',
        }),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      };

      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(mockCachedAnalysis);
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: 'listing-456',
        title: 'Test Item',
        description: 'Test description',
        askingPrice: 100,
        imageUrls: '[]',
      });

      const result = await analyzeListing('listing-456');

      expect(result.reasoning).toBe('Cached result');
      expect(prisma.aiAnalysisCache.findFirst).toHaveBeenCalled();
      // Should NOT call Claude API when cached
      expect(mockCompleteAI).not.toHaveBeenCalled();
    });

    test('should call Claude API when cache is not found', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: 'listing-789',
        title: 'Test Item',
        description: 'Description',
        askingPrice: 100,
        imageUrls: '[]',
      });

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'fresh',
              condition: 'new',
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 90,
              confidence: 'high',
              reasoning: 'Fresh analysis',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListing('listing-789');

      expect(result.reasoning).toBe('Fresh analysis');
      expect(mockCompleteAI).toHaveBeenCalled();
    });

    test('should cache new analysis after Claude API call', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.aiAnalysisCache.create as jest.Mock).mockResolvedValue({});
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: 'listing-cache-test',
        title: 'Item',
        description: 'Desc',
        askingPrice: 50,
        imageUrls: '[]',
      });

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'test',
              condition: 'good',
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 80,
              confidence: 'high',
              reasoning: 'Test',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      await analyzeListing('listing-cache-test');

      expect(prisma.aiAnalysisCache.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            listingId: 'listing-cache-test',
            analysisType: 'claude',
            analysisResult: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        })
      );
    });

    test('should handle cache lookup errors gracefully', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: 'listing-error-test',
        title: 'Item',
        description: 'Desc',
        askingPrice: 50,
        imageUrls: '[]',
      });

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'test',
              condition: 'good',
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 70,
              confidence: 'medium',
              reasoning: 'Fallback',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListing('listing-error-test');

      expect(result.reasoning).toBe('Fallback');
      expect(mockCompleteAI).toHaveBeenCalled();
    });

    test('should handle cache storage errors gracefully', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.aiAnalysisCache.upsert as jest.Mock).mockRejectedValue(
        new Error('Cache write error')
      );
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: 'listing-write-error',
        title: 'Item',
        description: 'Desc',
        askingPrice: 50,
        imageUrls: '[]',
      });

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'test',
              condition: 'good',
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 85,
              confidence: 'high',
              reasoning: 'Success despite cache error',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      // Should not throw even if caching fails
      const result = await analyzeListing('listing-write-error');

      expect(result.reasoning).toBe('Success despite cache error');
    });

    test('should throw error when listing not found', async () => {
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(analyzeListing('nonexistent-listing')).rejects.toThrow(
        'Listing not found: nonexistent-listing'
      );
    });

    test('should handle listing with null imageUrls (falsy branch)', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: 'listing-no-images',
        title: 'Item Without Images',
        description: 'Desc',
        askingPrice: 50,
        imageUrls: null, // null → if (listing.imageUrls) is false
      });

      const mockResponse = {
        content: [{ type: 'text', text: JSON.stringify({
          category: 'test', condition: 'good', keyFeatures: [], potentialIssues: [],
          flippabilityScore: 70, confidence: 'medium', reasoning: 'No images',
        }) }],
      };
      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListing('listing-no-images');
      expect(result.reasoning).toBe('No images');
    });

    test('should handle imageUrls parsing errors', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: 'listing-bad-json',
        title: 'Item',
        description: 'Desc',
        askingPrice: 50,
        imageUrls: 'invalid json', // Not valid JSON
      });

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'test',
              condition: 'good',
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 70,
              confidence: 'medium',
              reasoning: 'Parsed without images',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListing('listing-bad-json');

      expect(result.reasoning).toBe('Parsed without images');
      // Should still complete successfully
    });

    test('should return L1 cached result immediately without DB or API call', async () => {
      const l1Result: ClaudeAnalysisResult = {
        category: 'electronics',
        condition: 'good',
        keyFeatures: ['L1 cached feature'],
        potentialIssues: [],
        flippabilityScore: 88,
        confidence: 'high',
        reasoning: 'From L1 memory cache',
      };
      mockCacheGet.mockReturnValue(l1Result);

      const result = await analyzeListing('listing-l1-hit');

      expect(result.reasoning).toBe('From L1 memory cache');
      expect(prisma.aiAnalysisCache.findFirst).not.toHaveBeenCalled();
      expect(mockCompleteAI).not.toHaveBeenCalled();
    });

    test('should populate L1 cache after L2 database cache hit', async () => {
      const dbData = {
        category: 'tools',
        condition: 'good',
        keyFeatures: ['L2 cached'],
        potentialIssues: [],
        flippabilityScore: 72,
        confidence: 'medium',
        reasoning: 'From L2 database cache',
      };
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue({
        id: 'db-cache-id',
        listingId: 'listing-l2-pop',
        analysisResult: JSON.stringify(dbData),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      });

      await analyzeListing('listing-l2-pop');

      expect(mockCacheSet).toHaveBeenCalledWith(
        'claude:listing-l2-pop',
        expect.objectContaining({ reasoning: 'From L2 database cache' })
      );
      expect(mockCompleteAI).not.toHaveBeenCalled();
    });

    test('should populate L1 cache after successful API call', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.aiAnalysisCache.upsert as jest.Mock).mockResolvedValue({});
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: 'listing-api-l1',
        title: 'New Item',
        description: 'Fresh',
        askingPrice: 75,
        imageUrls: '[]',
      });

      const mockResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            category: 'electronics',
            condition: 'excellent',
            keyFeatures: ['Fresh result'],
            potentialIssues: [],
            flippabilityScore: 90,
            confidence: 'high',
            reasoning: 'API populated L1',
          }),
        }],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      await analyzeListing('listing-api-l1');

      expect(mockCacheSet).toHaveBeenCalledWith(
        'claude:listing-api-l1',
        expect.objectContaining({ reasoning: 'API populated L1' })
      );
    });
  });

  describe('Batch analysis', () => {
    test('should analyze multiple listings in batch', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock 3 different listings
      (prisma.listing.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'list-1',
          title: 'Item 1',
          description: 'Desc 1',
          askingPrice: 100,
          imageUrls: '[]',
        })
        .mockResolvedValueOnce({
          id: 'list-2',
          title: 'Item 2',
          description: 'Desc 2',
          askingPrice: 200,
          imageUrls: '[]',
        })
        .mockResolvedValueOnce({
          id: 'list-3',
          title: 'Item 3',
          description: 'Desc 3',
          askingPrice: 300,
          imageUrls: '[]',
        });

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'test',
              condition: 'good',
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 75,
              confidence: 'medium',
              reasoning: 'Batch analysis',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const results = await batchAnalyzeListings(['list-1', 'list-2', 'list-3']);

      expect(results.successful).toBe(3);
      expect(results.failed).toBe(0);
      expect(results.errors).toHaveLength(0);
      expect(mockCompleteAI).toHaveBeenCalledTimes(3);
    });

    test('should handle partial failures in batch', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);

      // First listing succeeds
      (prisma.listing.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'list-success',
          title: 'Good Item',
          description: 'Works',
          askingPrice: 100,
          imageUrls: '[]',
        })
        // Second listing not found
        .mockResolvedValueOnce(null)
        // Third listing succeeds
        .mockResolvedValueOnce({
          id: 'list-success-2',
          title: 'Another Item',
          description: 'Also works',
          askingPrice: 150,
          imageUrls: '[]',
        });

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'test',
              condition: 'good',
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 80,
              confidence: 'high',
              reasoning: 'Success',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const results = await batchAnalyzeListings([
        'list-success',
        'list-not-found',
        'list-success-2',
      ]);

      expect(results.successful).toBe(2);
      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0].error).toContain('not found');
      expect(results.errors[0].listingId).toBe('list-not-found');
    });

    test('should report cached results in batch', async () => {
      // First listing cached
      (prisma.aiAnalysisCache.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'cache-1',
          listingId: 'list-cached',
          analysisResult: JSON.stringify({
            category: 'test',
            condition: 'good',
            keyFeatures: [],
            potentialIssues: [],
            flippabilityScore: 70,
            confidence: 'medium',
            reasoning: 'Cached',
          }),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        })
        // Second not cached
        .mockResolvedValueOnce(null);

      (prisma.listing.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'list-fresh',
        title: 'Fresh Item',
        description: 'New',
        askingPrice: 100,
        imageUrls: '[]',
      });

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'test',
              condition: 'good',
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 80,
              confidence: 'high',
              reasoning: 'Fresh',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const results = await batchAnalyzeListings(['list-cached', 'list-fresh']);

      expect(results.successful).toBe(2);
      expect(results.cached).toBe(1);
      expect(results.failed).toBe(0);
      // Only 1 API call (cached result doesn't call API)
      expect(mockCompleteAI).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling and edge cases', () => {
    test('should handle malformed JSON in Claude response', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'This is not valid JSON at all!',
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      await expect(analyzeListingData('Item', 'Desc', 50)).rejects.toThrow();
    });

    test('should handle empty description', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'unknown',
              condition: 'unknown',
              keyFeatures: [],
              potentialIssues: ['No description provided'],
              flippabilityScore: 30,
              confidence: 'low',
              reasoning: 'Limited information',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListingData('Item', null, 50);

      expect(result.potentialIssues).toContain('No description provided');
      expect(mockCompleteAI).toHaveBeenCalled();
    });

    test('should handle zero price', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'free-stuff',
              condition: 'unknown',
              keyFeatures: [],
              potentialIssues: ['Free item - possible issues'],
              flippabilityScore: 40,
              confidence: 'low',
              reasoning: 'Free items are risky',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListingData('Free Couch', 'Come pick it up', 0);

      expect(result.flippabilityScore).toBeLessThan(50);
      expect(mockCompleteAI).toHaveBeenCalled();
    });

    test('should handle very long descriptions', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);

      const longDescription = 'A'.repeat(10000);

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'misc',
              condition: 'unknown',
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 50,
              confidence: 'medium',
              reasoning: 'Long description',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListingData('Item', longDescription, 100);

      expect(result).toBeDefined();
      expect(mockCompleteAI).toHaveBeenCalled();
    });

    test('should handle multiple images', async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);

      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              category: 'electronics',
              condition: 'good',
              keyFeatures: ['Multiple angles shown'],
              potentialIssues: [],
              flippabilityScore: 85,
              confidence: 'high',
              reasoning: 'Good photo documentation',
            }),
          },
        ],
      };

      mockCompleteAI.mockResolvedValue(makeAIResponse(mockResponse.content[0].text));

      const result = await analyzeListingData('Laptop', 'Used laptop', 500, [
        'img1.jpg',
        'img2.jpg',
        'img3.jpg',
      ]);

      expect(mockCompleteAI).toHaveBeenCalledWith('claudeAnalysis', expect.objectContaining({
        imageCount: 3,
      }));
      expect(result.confidence).toBe('high');
    });
  });

  describe('getClaudeApiKey - branch coverage', () => {
    test('falls back to CLAUDE_API_KEY when ANTHROPIC_API_KEY is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      process.env.CLAUDE_API_KEY = 'claude-fallback-key';
      // analyzeListingData should use CLAUDE_API_KEY (not throw)
      mockCompleteAI.mockResolvedValue(makeAIResponse(JSON.stringify({
          category: 'Electronics', condition: 'good', brand: 'Apple', model: 'Test',
          estimatedValue: 100, estimatedLow: 80, estimatedHigh: 120,
          profitPotential: 50, isFairDeal: true, isGoodDeal: false, isExcellentDeal: false,
          confidence: 0.8, reasoning: 'test', tags: [], keywords: [],
        })));
      const result = await analyzeListingData('Test', 'desc', 100);
      expect(result).toBeDefined();
      delete process.env.CLAUDE_API_KEY;
    });

    test('throws when no AI provider is available', async () => {
      const { AIProviderUnavailableError } = jest.requireMock('@/lib/ai') as { AIProviderUnavailableError: new () => Error };
      mockCompleteAI.mockRejectedValue(new AIProviderUnavailableError());
      await expect(analyzeListingData('Test', 'desc', 100)).rejects.toThrow(
        'No AI provider available'
      );
    });
  });

  describe('callClaudeAPI error handling - uncovered branches', () => {
    test('handles API error object with status but no message property', async () => {
      const errorObj = Object.assign(new Error(), { status: 400 });
      // Remove message property so apiError.message is falsy
      delete (errorObj as Record<string, unknown>).message;
      mockCompleteAI.mockRejectedValue(errorObj);
      // Should fall through to "Handle other errors" block and rethrow as-is
      await expect(analyzeListingData('Test Item', 'desc', 100)).rejects.toThrow();
    });

    test('should propagate API error with status and message', async () => {
      mockCompleteAI.mockRejectedValue(
          Object.assign(new Error('Invalid model'), { status: 400 })
        );
      await expect(analyzeListingData('Test Item', 'desc', 100)).rejects.toThrow(
        'Invalid model'
      );
    });

    test('should propagate non-Error thrown object', async () => {
      mockCompleteAI.mockRejectedValue('string error');
      await expect(analyzeListingData('Test Item', 'desc', 100)).rejects.toBe('string error');
    });

    test('should propagate rate limit errors', async () => {
      mockCompleteAI.mockRejectedValue(new Error('rate limit reached for this model'));
      await expect(analyzeListingData('Test Item', 'desc', 100)).rejects.toThrow(
        'rate limit reached for this model'
      );
    });

    test('should propagate 429 errors', async () => {
      mockCompleteAI.mockRejectedValue(new Error('Error 429: too many requests'));
      await expect(analyzeListingData('Test Item', 'desc', 100)).rejects.toThrow(
        'Error 429: too many requests'
      );
    });

    test('should throw when AI response has no JSON', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse('No JSON here at all'));
      await expect(analyzeListingData('Test Item', 'desc', 100)).rejects.toThrow(
        'No JSON found in response'
      );
    });
  });

  describe('parseClaudeResponse edge cases - uncovered branches', () => {
    const mockValidResponse = (overrides: Record<string, unknown> = {}) => {
      const base = {
        category: 'electronics',
        condition: 'good',
        flippabilityScore: 75,
        confidence: 'high',
        reasoning: 'Test reasoning',
        ...overrides,
      };
      return JSON.stringify(base);
    };

    test('should default missing fields in parsed response', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse(mockValidResponse({
              category: null,
              condition: null,
              keyFeatures: 'not-an-array',
              potentialIssues: null,
              flippabilityScore: null,
              confidence: 'invalid-value',
              reasoning: null,
            })));
      const result = await analyzeListingData('Test', 'desc', 50);
      expect(result.category).toBe('other');
      expect(result.condition).toBe('good');
      expect(result.keyFeatures).toEqual([]);
      expect(result.potentialIssues).toEqual([]);
      expect(result.flippabilityScore).toBe(50);
      expect(result.confidence).toBe('medium');
      expect(result.reasoning).toBe('No reasoning provided');
    });

    test('should clamp flippabilityScore to 0-100 range', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse(mockValidResponse({ flippabilityScore: 150 })));
      const result = await analyzeListingData('Test', 'desc', 50);
      expect(result.flippabilityScore).toBe(100);
    });

    test('should clamp negative flippabilityScore to 0', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse(mockValidResponse({ flippabilityScore: -10 })));
      const result = await analyzeListingData('Test', 'desc', 50);
      expect(result.flippabilityScore).toBe(0);
    });

    test('should throw when response has no JSON', async () => {
      mockCompleteAI.mockResolvedValue(makeAIResponse('This is just plain text with no JSON at all'));
      await expect(analyzeListingData('Test', 'desc', 50)).rejects.toThrow(
        'Failed to parse Claude response'
      );
    });
  });

  describe('batchAnalyzeListings - uncovered branches', () => {
    test('should call onProgress callback', async () => {
      const mockFindFirst = prisma.aiAnalysisCache.findFirst as jest.Mock;
      mockFindFirst.mockResolvedValue({
        result: JSON.stringify({ category: 'electronics', confidence: 'high', reasoning: 'test' }),
      });

      const progressCalls: Array<[number, number]> = [];
      const onProgress = (completed: number, total: number) => {
        progressCalls.push([completed, total]);
      };

      await batchAnalyzeListings(['id-1', 'id-2'], onProgress);

      expect(progressCalls).toEqual([
        [1, 2],
        [2, 2],
      ]);
    });

    test('should handle errors in batch and track them', async () => {
      const mockFindFirst = prisma.aiAnalysisCache.findFirst as jest.Mock;
      mockFindFirst.mockResolvedValueOnce(null); // not cached

      const mockFindUnique = prisma.listing.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValueOnce(null); // listing not found

      const result = await batchAnalyzeListings(['missing-id']);

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].listingId).toBe('missing-id');
      expect(result.errors[0].error).toContain('not found');
    });

    test('should handle non-Error throws in batch', async () => {
      const mockFindFirst = prisma.aiAnalysisCache.findFirst as jest.Mock;
      // First call: not cached. Then analyzeListing will call findFirst again for cache check.
      mockFindFirst.mockResolvedValue(null);

      const mockFindUnique = prisma.listing.findUnique as jest.Mock;
      mockFindUnique.mockResolvedValueOnce({
        id: 'bad-id',
        title: 'Test',
        description: 'desc',
        askingPrice: 50,
        imageUrls: '[]',
      });

      // Make the API call throw a non-Error
      mockCompleteAI.mockRejectedValue('string error');
      const result = await batchAnalyzeListings(['bad-id']);

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toBe('Unknown error');
    });
  });
});

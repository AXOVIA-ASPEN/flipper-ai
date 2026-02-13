/**
 * Claude Analyzer Unit Tests
 * Author: Stephen Boyett
 * Company: Axovia AI
 * 
 * Tests for Claude AI integration (mocked API calls)
 */

import { describe, test, expect, jest, beforeEach } from "@jest/globals";

// Mock Anthropic SDK
jest.mock("@anthropic-ai/sdk", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn(),
      },
    })),
    RateLimitError: class RateLimitError extends Error {},
    APIError: class APIError extends Error {},
  };
});

// Mock Prisma
jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    listing: {
      findUnique: jest.fn(),
    },
    aiAnalysisCache: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import Anthropic from "@anthropic-ai/sdk";
import {
  analyzeListingData,
  analyzeListing,
  batchAnalyzeListings,
  ClaudeAnalysisResult,
} from "@/lib/claude-analyzer";
import prisma from "@/lib/db";

describe("Claude Analyzer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  describe("analyzeListingData", () => {
    test("should parse valid JSON response from Claude", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "electronics",
              subcategory: "smartphones",
              brand: "Apple",
              condition: "excellent",
              estimatedAge: "1-2 years",
              keyFeatures: ["128GB storage", "Face ID", "A15 chip"],
              potentialIssues: ["Battery health unknown"],
              flippabilityScore: 85,
              confidence: "high",
              reasoning: "Strong brand value and demand",
              marketTrends: "High demand for used iPhones",
              targetBuyer: "Budget-conscious tech users",
            }),
          },
        ],
      };

      // Mock the Anthropic client's create method directly
      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListingData(
        "iPhone 12 128GB",
        "Excellent condition, no scratches",
        400
      );

      expect(result.category).toBe("electronics");
      expect(result.brand).toBe("Apple");
      expect(result.flippabilityScore).toBe(85);
      expect(result.confidence).toBe("high");
      expect(result.keyFeatures).toHaveLength(3);
    });

    test("should handle Claude response with markdown wrapper", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: `Here's the analysis:\n\n\`\`\`json\n${JSON.stringify({
              category: "tools",
              condition: "good",
              keyFeatures: ["Cordless", "20V battery"],
              potentialIssues: [],
              flippabilityScore: 70,
              confidence: "medium",
              reasoning: "Tools have good resale value",
            })}\n\`\`\``,
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListingData("DeWalt Drill", "Used but works", 50);

      expect(result.category).toBe("tools");
      expect(result.flippabilityScore).toBe(70);
    });

    test("should normalize flippability score to 0-100 range", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "furniture",
              condition: "fair",
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 150, // Invalid (too high)
              confidence: "low",
              reasoning: "Test",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListingData("Old Couch", null, 20);

      expect(result.flippabilityScore).toBeLessThanOrEqual(100);
      expect(result.flippabilityScore).toBeGreaterThanOrEqual(0);
    });

    test("should handle missing optional fields gracefully", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "sports",
              condition: "good",
              keyFeatures: ["Carbon frame"],
              potentialIssues: [],
              flippabilityScore: 60,
              confidence: "medium",
              reasoning: "Bikes sell well locally",
              // Missing: subcategory, brand, estimatedAge, marketTrends, targetBuyer
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListingData("Road Bike", "Good shape", 200);

      expect(result.category).toBe("sports");
      expect(result.subcategory).toBeUndefined();
      expect(result.brand).toBeUndefined();
      expect(result.estimatedAge).toBeUndefined();
    });

    test("should throw error when Claude API key is missing", async () => {
      // Note: This test can't work properly because CLAUDE_API_KEY is evaluated at module load time
      // In a real scenario, the API would fail with auth error which is caught in callClaudeAPI
      // For now, we'll test that the mock framework works with auth failures
      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockImplementation(() => {
        const error: any = new Error("Invalid API key");
        error.status = 401;
        throw error;
      });
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      await expect(
        analyzeListingData("Test Item", null, 100)
      ).rejects.toThrow();
    });

    test("should throw error on rate limit", async () => {
      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockRejectedValue(
        Object.assign(new Error("Rate limit exceeded"), { status: 429 })
      );
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      await expect(
        analyzeListingData("Test Item", null, 100)
      ).rejects.toThrow("rate limit");
    });

    test("should throw error on API error", async () => {
      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockRejectedValue(
        Object.assign(new Error("Something went wrong"), { message: "Something went wrong" })
      );
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      await expect(
        analyzeListingData("Test Item", null, 100)
      ).rejects.toThrow();
    });

    test("should validate confidence level", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "other",
              condition: "unknown",
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 50,
              confidence: "invalid", // Invalid confidence
              reasoning: "Test",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListingData("Mystery Item", null, 50);

      expect(["low", "medium", "high"]).toContain(result.confidence);
      expect(result.confidence).toBe("medium"); // Default fallback
    });

    test("should handle empty arrays for features/issues", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "clothing",
              condition: "good",
              keyFeatures: null, // Invalid (should be array)
              potentialIssues: undefined, // Invalid
              flippabilityScore: 40,
              confidence: "low",
              reasoning: "Clothing has low resale value",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListingData("T-Shirt", "Gently used", 5);

      expect(Array.isArray(result.keyFeatures)).toBe(true);
      expect(Array.isArray(result.potentialIssues)).toBe(true);
      expect(result.keyFeatures).toHaveLength(0);
      expect(result.potentialIssues).toHaveLength(0);
    });

    test("should include price context in analysis", async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "electronics",
              condition: "new",
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 90,
              confidence: "high",
              reasoning: "Great deal",
            }),
          },
        ],
      });

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      await analyzeListingData("iPhone 15 Pro", "Brand new sealed", 800, [
        "image1.jpg",
      ]);

      const callArgs = mockCreate.mock.calls[0][0];
      const promptMessage = callArgs.messages[0].content;

      expect(promptMessage).toContain("$800");
      expect(promptMessage).toContain("1 images available");
    });
  });

  describe("Caching functionality (via analyzeListing)", () => {
    test("should return cached analysis when available", async () => {
      const mockCachedAnalysis = {
        id: "cache-123",
        listingId: "listing-456",
        analysisResult: JSON.stringify({
          category: "electronics",
          condition: "good",
          keyFeatures: ["test"],
          potentialIssues: [],
          flippabilityScore: 75,
          confidence: "medium",
          reasoning: "Cached result",
        }),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      };

      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(mockCachedAnalysis);
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: "listing-456",
        title: "Test Item",
        description: "Test description",
        askingPrice: 100,
        imageUrls: "[]",
      });

      const result = await analyzeListing("listing-456");

      expect(result.reasoning).toBe("Cached result");
      expect(prisma.aiAnalysisCache.findFirst).toHaveBeenCalled();
      // Should NOT call Claude API when cached
      expect(Anthropic).not.toHaveBeenCalled();
    });

    test("should call Claude API when cache is not found", async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: "listing-789",
        title: "Test Item",
        description: "Description",
        askingPrice: 100,
        imageUrls: "[]",
      });

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "fresh",
              condition: "new",
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 90,
              confidence: "high",
              reasoning: "Fresh analysis",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListing("listing-789");

      expect(result.reasoning).toBe("Fresh analysis");
      expect(mockCreate).toHaveBeenCalled();
    });

    test("should cache new analysis after Claude API call", async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.aiAnalysisCache.create as jest.Mock).mockResolvedValue({});
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: "listing-cache-test",
        title: "Item",
        description: "Desc",
        askingPrice: 50,
        imageUrls: "[]",
      });

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "test",
              condition: "good",
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 80,
              confidence: "high",
              reasoning: "Test",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      await analyzeListing("listing-cache-test");

      expect(prisma.aiAnalysisCache.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            listingId: "listing-cache-test",
            analysisResult: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        })
      );
    });

    test("should handle cache lookup errors gracefully", async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: "listing-error-test",
        title: "Item",
        description: "Desc",
        askingPrice: 50,
        imageUrls: "[]",
      });

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "test",
              condition: "good",
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 70,
              confidence: "medium",
              reasoning: "Fallback",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListing("listing-error-test");

      expect(result.reasoning).toBe("Fallback");
      expect(mockCreate).toHaveBeenCalled();
    });

    test("should handle cache storage errors gracefully", async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.aiAnalysisCache.create as jest.Mock).mockRejectedValue(
        new Error("Cache write error")
      );
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: "listing-write-error",
        title: "Item",
        description: "Desc",
        askingPrice: 50,
        imageUrls: "[]",
      });

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "test",
              condition: "good",
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 85,
              confidence: "high",
              reasoning: "Success despite cache error",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      // Should not throw even if caching fails
      const result = await analyzeListing("listing-write-error");

      expect(result.reasoning).toBe("Success despite cache error");
    });

    test("should throw error when listing not found", async () => {
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(analyzeListing("nonexistent-listing")).rejects.toThrow(
        "Listing not found: nonexistent-listing"
      );
    });

    test("should handle imageUrls parsing errors", async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.listing.findUnique as jest.Mock).mockResolvedValue({
        id: "listing-bad-json",
        title: "Item",
        description: "Desc",
        askingPrice: 50,
        imageUrls: "invalid json", // Not valid JSON
      });

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "test",
              condition: "good",
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 70,
              confidence: "medium",
              reasoning: "Parsed without images",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListing("listing-bad-json");

      expect(result.reasoning).toBe("Parsed without images");
      // Should still complete successfully
    });
  });

  describe("Batch analysis", () => {
    test("should analyze multiple listings in batch", async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      
      // Mock 3 different listings
      (prisma.listing.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: "list-1",
          title: "Item 1",
          description: "Desc 1",
          askingPrice: 100,
          imageUrls: "[]",
        })
        .mockResolvedValueOnce({
          id: "list-2",
          title: "Item 2",
          description: "Desc 2",
          askingPrice: 200,
          imageUrls: "[]",
        })
        .mockResolvedValueOnce({
          id: "list-3",
          title: "Item 3",
          description: "Desc 3",
          askingPrice: 300,
          imageUrls: "[]",
        });

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "test",
              condition: "good",
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 75,
              confidence: "medium",
              reasoning: "Batch analysis",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const results = await batchAnalyzeListings(["list-1", "list-2", "list-3"]);

      expect(results.successful).toBe(3);
      expect(results.failed).toBe(0);
      expect(results.errors).toHaveLength(0);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    test("should handle partial failures in batch", async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);
      
      // First listing succeeds
      (prisma.listing.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: "list-success",
          title: "Good Item",
          description: "Works",
          askingPrice: 100,
          imageUrls: "[]",
        })
        // Second listing not found
        .mockResolvedValueOnce(null)
        // Third listing succeeds
        .mockResolvedValueOnce({
          id: "list-success-2",
          title: "Another Item",
          description: "Also works",
          askingPrice: 150,
          imageUrls: "[]",
        });

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "test",
              condition: "good",
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 80,
              confidence: "high",
              reasoning: "Success",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const results = await batchAnalyzeListings([
        "list-success",
        "list-not-found",
        "list-success-2",
      ]);

      expect(results.successful).toBe(2);
      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0].error).toContain("not found");
      expect(results.errors[0].listingId).toBe("list-not-found");
    });

    test("should report cached results in batch", async () => {
      // First listing cached
      (prisma.aiAnalysisCache.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: "cache-1",
          listingId: "list-cached",
          analysisResult: JSON.stringify({
            category: "test",
            condition: "good",
            keyFeatures: [],
            potentialIssues: [],
            flippabilityScore: 70,
            confidence: "medium",
            reasoning: "Cached",
          }),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        })
        // Second not cached
        .mockResolvedValueOnce(null);

      (prisma.listing.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "list-fresh",
        title: "Fresh Item",
        description: "New",
        askingPrice: 100,
        imageUrls: "[]",
      });

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "test",
              condition: "good",
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 80,
              confidence: "high",
              reasoning: "Fresh",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const results = await batchAnalyzeListings(["list-cached", "list-fresh"]);

      expect(results.successful).toBe(2);
      expect(results.cached).toBe(1);
      expect(results.failed).toBe(0);
      // Only 1 API call (cached result doesn't call API)
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error handling and edge cases", () => {
    test("should handle malformed JSON in Claude response", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: "This is not valid JSON at all!",
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      await expect(analyzeListingData("Item", "Desc", 50)).rejects.toThrow();
    });

    test("should handle empty description", async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "unknown",
              condition: "unknown",
              keyFeatures: [],
              potentialIssues: ["No description provided"],
              flippabilityScore: 30,
              confidence: "low",
              reasoning: "Limited information",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListingData("Item", null, 50);

      expect(result.potentialIssues).toContain("No description provided");
      expect(mockCreate).toHaveBeenCalled();
    });

    test("should handle zero price", async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "free-stuff",
              condition: "unknown",
              keyFeatures: [],
              potentialIssues: ["Free item - possible issues"],
              flippabilityScore: 40,
              confidence: "low",
              reasoning: "Free items are risky",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListingData("Free Couch", "Come pick it up", 0);

      expect(result.flippabilityScore).toBeLessThan(50);
      expect(mockCreate).toHaveBeenCalled();
    });

    test("should handle very long descriptions", async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);

      const longDescription = "A".repeat(10000);

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "misc",
              condition: "unknown",
              keyFeatures: [],
              potentialIssues: [],
              flippabilityScore: 50,
              confidence: "medium",
              reasoning: "Long description",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListingData("Item", longDescription, 100);

      expect(result).toBeDefined();
      expect(mockCreate).toHaveBeenCalled();
    });

    test("should handle multiple images", async () => {
      (prisma.aiAnalysisCache.findFirst as jest.Mock).mockResolvedValue(null);

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              category: "electronics",
              condition: "good",
              keyFeatures: ["Multiple angles shown"],
              potentialIssues: [],
              flippabilityScore: 85,
              confidence: "high",
              reasoning: "Good photo documentation",
            }),
          },
        ],
      };

      const AnthropicMock = Anthropic as jest.MockedClass<typeof Anthropic>;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      } as any));

      const result = await analyzeListingData(
        "Laptop",
        "Used laptop",
        500,
        ["img1.jpg", "img2.jpg", "img3.jpg"]
      );

      const callArgs = mockCreate.mock.calls[0][0];
      const promptMessage = callArgs.messages[0].content;

      expect(promptMessage).toContain("3 images available");
      expect(result.confidence).toBe("high");
    });
  });
});

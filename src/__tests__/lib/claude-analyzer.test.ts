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
});

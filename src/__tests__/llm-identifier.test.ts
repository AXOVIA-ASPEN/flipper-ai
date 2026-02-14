// Tests for llm-identifier.ts
import { identifyItem, identifyItemsBatch } from "../lib/llm-identifier";

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                brand: "Apple",
                model: "iPhone 14 Pro",
                variant: "256GB",
                year: 2022,
                condition: "good",
                conditionNotes: "Minor scratches on screen",
                searchQuery: "Apple iPhone 14 Pro 256GB",
                category: "cell phones",
                worthInvestigating: true,
                reasoning: "High-demand smartphone with strong resale value",
              }),
            },
          }],
        }),
      },
    },
  }));
});

describe("llm-identifier", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("identifyItem", () => {
    it("returns null when OPENAI_API_KEY not set", async () => {
      delete process.env.OPENAI_API_KEY;
      const result = await identifyItem("iPhone 14 Pro", "Good condition", 200, "electronics");
      expect(result).toBeNull();
    });

    it("returns identification when API key is set", async () => {
      const result = await identifyItem("iPhone 14 Pro 256GB", "Minor scratches", 200, "electronics");
      expect(result).not.toBeNull();
      expect(result?.brand).toBe("Apple");
      expect(result?.model).toBe("iPhone 14 Pro");
      expect(result?.worthInvestigating).toBe(true);
      expect(result?.condition).toBe("good");
    });

    it("handles null description and category", async () => {
      const result = await identifyItem("iPhone 14 Pro", null, 200, null);
      expect(result).not.toBeNull();
      expect(result?.brand).toBe("Apple");
    });
  });

  describe("identifyItem edge cases", () => {
    it("returns null when LLM response has no JSON", async () => {
      const OpenAI = require("openai");
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content: "No JSON here, just text" } }],
      });
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      // Reset the cached openai instance by re-importing
      jest.resetModules();
      jest.mock("openai", () => OpenAI);
      process.env.OPENAI_API_KEY = "test-key";
      const { identifyItem: freshIdentify } = require("../lib/llm-identifier");

      const result = await freshIdentify("Test Item", null, 100, null);
      expect(result).toBeNull();
    });

    it("returns null when API call throws", async () => {
      const OpenAI = require("openai");
      const mockCreate = jest.fn().mockRejectedValue(new Error("API rate limited"));
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      jest.resetModules();
      jest.mock("openai", () => OpenAI);
      process.env.OPENAI_API_KEY = "test-key";
      const { identifyItem: freshIdentify } = require("../lib/llm-identifier");

      const result = await freshIdentify("Test Item", null, 100, null);
      expect(result).toBeNull();
    });

    it("returns null when response content is empty", async () => {
      const OpenAI = require("openai");
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content: "" } }],
      });
      OpenAI.mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
      }));

      jest.resetModules();
      jest.mock("openai", () => OpenAI);
      process.env.OPENAI_API_KEY = "test-key";
      const { identifyItem: freshIdentify } = require("../lib/llm-identifier");

      const result = await freshIdentify("Test Item", null, 100, null);
      expect(result).toBeNull();
    });
  });

  describe("identifyItemsBatch", () => {
    it("processes multiple listings", async () => {
      const listings = [
        { title: "iPhone 14 Pro", description: null, askingPrice: 200, categoryHint: null },
        { title: "Samsung TV 55", description: "Like new", askingPrice: 150, categoryHint: "electronics" },
      ];
      const results = await identifyItemsBatch(listings);
      expect(results).toHaveLength(2);
      expect(results[0]).not.toBeNull();
      expect(results[1]).not.toBeNull();
    });

    it("handles empty batch", async () => {
      const results = await identifyItemsBatch([]);
      expect(results).toHaveLength(0);
    });
  });
});

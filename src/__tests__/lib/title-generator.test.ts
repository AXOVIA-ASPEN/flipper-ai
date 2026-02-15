import {
  generateAlgorithmicTitle,
  generateTitlesForAllPlatforms,
  generateLLMTitle,
  fromIdentification,
  type TitleGeneratorInput,
} from "../../lib/title-generator";

// Mock OpenAI
jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: "Apple iPhone 15 Pro Max 256GB - Excellent Condition",
              },
            },
          ],
        }),
      },
    },
  }));
});

describe("title-generator", () => {
  const sampleInput: TitleGeneratorInput = {
    brand: "Apple",
    model: "iPhone 15 Pro Max",
    variant: "256GB Space Black",
    condition: "like_new",
    category: "Electronics",
  };

  describe("generateAlgorithmicTitle", () => {
    it("generates a title with brand, model, variant, and condition", () => {
      const result = generateAlgorithmicTitle(sampleInput);
      expect(result.title).toContain("Apple");
      expect(result.title).toContain("iPhone 15 Pro Max");
      expect(result.title).toContain("256GB Space Black");
      expect(result.platform).toBe("generic");
    });

    it("respects eBay 80-char limit", () => {
      const result = generateAlgorithmicTitle(sampleInput, "ebay");
      expect(result.charCount).toBeLessThanOrEqual(80);
      expect(result.platform).toBe("ebay");
    });

    it("respects Mercari 40-char limit", () => {
      const result = generateAlgorithmicTitle(sampleInput, "mercari");
      expect(result.charCount).toBeLessThanOrEqual(40);
      expect(result.platform).toBe("mercari");
    });

    it("includes SEO keywords", () => {
      const result = generateAlgorithmicTitle(sampleInput);
      expect(result.keywords).toContain("apple");
      expect(result.keywords).toContain("iphone 15 pro max");
    });

    it("handles missing brand gracefully", () => {
      const input: TitleGeneratorInput = {
        brand: null,
        model: "Widget",
        variant: null,
        condition: "good",
        category: null,
      };
      const result = generateAlgorithmicTitle(input);
      expect(result.title).toContain("Widget");
      expect(result.title).toContain("Good Condition");
    });

    it("handles all-null input", () => {
      const input: TitleGeneratorInput = {
        brand: null,
        model: null,
        variant: null,
        condition: "fair",
        category: null,
      };
      const result = generateAlgorithmicTitle(input);
      expect(result.title).toBeTruthy();
    });

    it("shows NEW for new condition", () => {
      const input: TitleGeneratorInput = {
        brand: "Sony",
        model: "WH-1000XM5",
        variant: null,
        condition: "new",
        category: "Audio",
      };
      const result = generateAlgorithmicTitle(input, "ebay");
      expect(result.title).toContain("NEW");
    });

    it("includes extra keywords when provided", () => {
      const input: TitleGeneratorInput = {
        ...sampleInput,
        keywords: ["Unlocked", "5G"],
      };
      const result = generateAlgorithmicTitle(input);
      expect(result.keywords).toContain("unlocked");
      expect(result.keywords).toContain("5g");
    });
  });

  describe("generateTitlesForAllPlatforms", () => {
    it("generates titles for all 4 platforms", () => {
      const result = generateTitlesForAllPlatforms(sampleInput);
      expect(result.titles).toHaveLength(4);
      const platforms = result.titles.map((t) => t.platform);
      expect(platforms).toContain("ebay");
      expect(platforms).toContain("mercari");
      expect(platforms).toContain("facebook");
      expect(platforms).toContain("offerup");
    });

    it("returns a primary title", () => {
      const result = generateTitlesForAllPlatforms(sampleInput);
      expect(result.primary).toBeTruthy();
      expect(result.primary.length).toBeGreaterThan(0);
    });

    it("each platform title respects its char limit", () => {
      const result = generateTitlesForAllPlatforms(sampleInput);
      const limits: Record<string, number> = {
        ebay: 80,
        mercari: 40,
        facebook: 99,
        offerup: 70,
      };
      for (const t of result.titles) {
        expect(t.charCount).toBeLessThanOrEqual(limits[t.platform] || 80);
      }
    });
  });

  describe("generateAlgorithmicTitle - branch coverage", () => {
    it("uses unknown platform default limit of 80", () => {
      const result = generateAlgorithmicTitle(sampleInput, "unknown_platform");
      expect(result.charCount).toBeLessThanOrEqual(80);
    });

    it("condenses title with short 'LN' for like_new when over limit", () => {
      // Mercari has 40 char limit, long input will trigger condensation
      const longInput: TitleGeneratorInput = {
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        variant: "512GB Titanium Black",
        condition: "like_new",
        category: "Electronics",
      };
      const result = generateAlgorithmicTitle(longInput, "mercari");
      expect(result.charCount).toBeLessThanOrEqual(40);
    });

    it("condenses title with 'NEW' for new condition when over limit", () => {
      const longInput: TitleGeneratorInput = {
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        variant: "512GB Titanium Black",
        condition: "new",
        category: "Electronics",
      };
      const result = generateAlgorithmicTitle(longInput, "mercari");
      expect(result.charCount).toBeLessThanOrEqual(40);
    });

    it("condenses with no short label for good condition", () => {
      const longInput: TitleGeneratorInput = {
        brand: "Samsung",
        model: "Galaxy S24 Ultra",
        variant: "512GB Titanium Black",
        condition: "good",
        category: "Electronics",
      };
      const result = generateAlgorithmicTitle(longInput, "mercari");
      expect(result.charCount).toBeLessThanOrEqual(40);
    });

    it("shows For Parts/Repair for poor condition", () => {
      const input: TitleGeneratorInput = {
        brand: "Sony",
        model: "PS5",
        variant: null,
        condition: "poor",
        category: null,
      };
      const result = generateAlgorithmicTitle(input, "facebook");
      expect(result.title).toContain("For Parts/Repair");
    });

    it("shows Fair for fair condition", () => {
      const input: TitleGeneratorInput = {
        brand: "Sony",
        model: "PS5",
        variant: null,
        condition: "fair",
        category: null,
      };
      const result = generateAlgorithmicTitle(input, "ebay");
      expect(result.title).toContain("Fair");
    });

    it("uses raw condition string for unknown condition", () => {
      const input: TitleGeneratorInput = {
        brand: "Test",
        model: "Item",
        variant: null,
        condition: "refurbished",
        category: null,
      };
      const result = generateAlgorithmicTitle(input);
      expect(result.title).toContain("refurbished");
    });

    it("truncates with ellipsis when condensed title still exceeds limit", () => {
      // Very long brand+model that even without condition exceeds mercari 40
      const longInput: TitleGeneratorInput = {
        brand: "Extraordinary Brand Name Here",
        model: "Super Long Model Name XYZ Pro Max Ultra",
        variant: "Limited Edition 2024",
        condition: "good",
        category: null,
      };
      const result = generateAlgorithmicTitle(longInput, "mercari");
      expect(result.charCount).toBeLessThanOrEqual(40);
      expect(result.title).toMatch(/\.\.\.$/);
    });
  });

  describe("generateLLMTitle", () => {
    it("falls back to algorithmic when no API key", async () => {
      const origKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const result = await generateLLMTitle(sampleInput, "ebay");
      expect(result.title).toContain("Apple");
      expect(result.platform).toBe("ebay");

      if (origKey) process.env.OPENAI_API_KEY = origKey;
    });

    it("uses LLM when API key is set", async () => {
      const origKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";

      const result = await generateLLMTitle(sampleInput, "ebay");
      expect(result.title).toBe(
        "Apple iPhone 15 Pro Max 256GB - Excellent Condition"
      );
      expect(result.platform).toBe("ebay");
      expect(result.keywords.length).toBeGreaterThan(0);

      if (origKey) {
        process.env.OPENAI_API_KEY = origKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });

    it("strips quotes from LLM response", async () => {
      const OpenAI = require("openai");
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                { message: { content: '"Quoted Title Here"' } },
              ],
            }),
          },
        },
      }));

      const origKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";

      const result = await generateLLMTitle(sampleInput, "ebay");
      expect(result.title).toBe("Quoted Title Here");

      // Restore mock
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content:
                      "Apple iPhone 15 Pro Max 256GB - Excellent Condition",
                  },
                },
              ],
            }),
          },
        },
      }));

      if (origKey) {
        process.env.OPENAI_API_KEY = origKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });

    it("truncates LLM title that exceeds platform limit", async () => {
      const OpenAI = require("openai");
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content:
                      "This is an extremely long title that definitely exceeds the forty character limit for Mercari listings and should be truncated",
                  },
                },
              ],
            }),
          },
        },
      }));

      const origKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";

      const result = await generateLLMTitle(sampleInput, "mercari");
      expect(result.charCount).toBeLessThanOrEqual(40);
      expect(result.title).toMatch(/\.\.\.$/);

      // Restore mock
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content:
                      "Apple iPhone 15 Pro Max 256GB - Excellent Condition",
                  },
                },
              ],
            }),
          },
        },
      }));

      if (origKey) {
        process.env.OPENAI_API_KEY = origKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });

    it("falls back to algorithmic on LLM error", async () => {
      const OpenAI = require("openai");
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error("API Error")),
          },
        },
      }));

      const origKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";

      const result = await generateLLMTitle(sampleInput, "ebay");
      expect(result.title).toContain("Apple");
      expect(result.platform).toBe("ebay");

      // Restore mock
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content:
                      "Apple iPhone 15 Pro Max 256GB - Excellent Condition",
                  },
                },
              ],
            }),
          },
        },
      }));

      if (origKey) {
        process.env.OPENAI_API_KEY = origKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });

    it("handles empty LLM response", async () => {
      const OpenAI = require("openai");
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: "" } }],
            }),
          },
        },
      }));

      const origKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";

      const result = await generateLLMTitle(sampleInput, "ebay");
      expect(result.platform).toBe("ebay");

      // Restore mock
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content:
                      "Apple iPhone 15 Pro Max 256GB - Excellent Condition",
                  },
                },
              ],
            }),
          },
        },
      }));

      if (origKey) {
        process.env.OPENAI_API_KEY = origKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });

    it("uses default platform limit for unknown platform", async () => {
      const origKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const result = await generateLLMTitle(sampleInput, "amazon");
      expect(result.charCount).toBeLessThanOrEqual(80);

      if (origKey) process.env.OPENAI_API_KEY = origKey;
    });
  });

  describe("fromIdentification", () => {
    it("converts ItemIdentification to TitleGeneratorInput", () => {
      const identification = {
        brand: "Nike",
        model: "Air Jordan 1",
        variant: "Chicago",
        year: 2023,
        condition: "like_new" as const,
        conditionNotes: "Worn once",
        searchQuery: "Nike Air Jordan 1 Chicago 2023",
        category: "Shoes",
        worthInvestigating: true,
        reasoning: "Popular sneaker",
      };

      const result = fromIdentification(identification);
      expect(result.brand).toBe("Nike");
      expect(result.model).toBe("Air Jordan 1");
      expect(result.variant).toBe("Chicago");
      expect(result.condition).toBe("like_new");
      expect(result.category).toBe("Shoes");
    });
  });
});

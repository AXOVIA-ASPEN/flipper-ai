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

  describe("generateLLMTitle", () => {
    it("falls back to algorithmic when no API key", async () => {
      const origKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const result = await generateLLMTitle(sampleInput, "ebay");
      expect(result.title).toContain("Apple");
      expect(result.platform).toBe("ebay");

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

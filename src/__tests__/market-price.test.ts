// Tests for market-price.ts
// We mock Playwright to avoid actual browser usage

jest.mock("playwright", () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn().mockResolvedValue(undefined),
          waitForSelector: jest.fn().mockResolvedValue(undefined),
          evaluate: jest.fn().mockResolvedValue([
            { title: "iPhone 14 Pro 256GB", price: "$500.00", shipping: "Free shipping", condition: "Used", url: "https://ebay.com/1", soldDate: "" },
            { title: "iPhone 14 Pro 256GB Blue", price: "$520.00", shipping: "+$10.00 shipping", condition: "Used", url: "https://ebay.com/2", soldDate: "" },
            { title: "iPhone 14 Pro 128GB", price: "$450.00", shipping: "Free shipping", condition: "Used", url: "https://ebay.com/3", soldDate: "" },
          ]),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

import { fetchMarketPrice, fetchMarketPricesBatch, closeBrowser } from "../lib/market-price";

describe("market-price", () => {
  afterAll(async () => {
    await closeBrowser();
  });

  describe("fetchMarketPrice", () => {
    it("returns market data for a valid query", async () => {
      const result = await fetchMarketPrice("iPhone 14 Pro 256GB");
      expect(result).not.toBeNull();
      expect(result?.source).toBe("ebay_scrape");
      expect(result?.soldListings.length).toBeGreaterThan(0);
      expect(result?.medianPrice).toBeGreaterThan(0);
      expect(result?.searchQuery).toBe("iPhone 14 Pro 256GB");
    });

    it("includes category in search when provided", async () => {
      const result = await fetchMarketPrice("iPhone 14 Pro", "electronics");
      expect(result).not.toBeNull();
    });

    it("calculates median, low, high, avg correctly", async () => {
      const result = await fetchMarketPrice("iPhone 14 Pro 256GB");
      expect(result).not.toBeNull();
      expect(result!.lowPrice).toBeLessThanOrEqual(result!.medianPrice);
      expect(result!.highPrice).toBeGreaterThanOrEqual(result!.medianPrice);
      expect(result!.salesCount).toBe(3);
    });
  });

  describe("fetchMarketPricesBatch", () => {
    it("processes multiple queries", async () => {
      const results = await fetchMarketPricesBatch([
        { searchQuery: "iPhone 14 Pro" },
        { searchQuery: "Samsung TV", category: "electronics" },
      ]);
      expect(results).toHaveLength(2);
    });
  });

  describe("closeBrowser", () => {
    it("closes without error", async () => {
      await expect(closeBrowser()).resolves.not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("returns null when no listings are found (empty evaluate)", async () => {
      // Re-mock with empty results
      const { chromium } = require("playwright");
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue([]),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      // Need fresh module to pick up new mock
      await closeBrowser(); // Reset browser instance
      const result = await fetchMarketPrice("nonexistent_item_xyz_123");
      expect(result).toBeNull();
    });

    it("returns null when all prices are zero", async () => {
      const { chromium } = require("playwright");
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue([
          { title: "Item", price: "$0.00", shipping: "Free", condition: "Used", url: "https://ebay.com/x", soldDate: "" },
        ]),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await closeBrowser();
      const result = await fetchMarketPrice("zero price item");
      expect(result).toBeNull();
    });

    it("handles page.goto error gracefully", async () => {
      const { chromium } = require("playwright");
      const mockContext = {
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn().mockRejectedValue(new Error("timeout")),
          waitForSelector: jest.fn(),
          evaluate: jest.fn(),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await closeBrowser();
      const result = await fetchMarketPrice("error item");
      expect(result).toBeNull();
    });

    it("handles unknown category gracefully", async () => {
      const { chromium } = require("playwright");
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue([
          { title: "Item A", price: "$100.00", shipping: "+$5.50 shipping", condition: "New", url: "https://ebay.com/a", soldDate: "" },
        ]),
      };
      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };
      chromium.launch.mockResolvedValue({
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await closeBrowser();
      const result = await fetchMarketPrice("test item", "unknown_category");
      expect(result).not.toBeNull();
      expect(result!.soldListings[0].shippingCost).toBe(5.5);
    });
  });
});

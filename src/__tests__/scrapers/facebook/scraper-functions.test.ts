/**
 * Facebook Marketplace Scraper - Function Tests
 * Tests for buildSearchUrl, parsePrice, generateExternalId,
 * scrapeFacebookMarketplace, and scrapeAndConvert
 */

// Mock Stagehand before importing
const mockInit = jest.fn().mockResolvedValue(undefined);
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockGoto = jest.fn().mockResolvedValue(undefined);
const mockWaitForTimeout = jest.fn().mockResolvedValue(undefined);
const mockAct = jest.fn().mockResolvedValue(undefined);
const mockExtract = jest.fn().mockResolvedValue({
  listings: [
    { title: "Test Item", price: "$50", location: "NYC" },
    { title: "Another Item", price: "$100", location: "LA" },
  ],
});
const mockGoBack = jest.fn().mockResolvedValue(undefined);

const mockPage = {
  goto: mockGoto,
  waitForTimeout: mockWaitForTimeout,
  act: mockAct,
  extract: mockExtract,
  goBack: mockGoBack,
};

jest.mock("@browserbasehq/stagehand", () => ({
  Stagehand: jest.fn().mockImplementation(() => ({
    init: mockInit,
    close: mockClose,
    page: mockPage,
  })),
}));

import {
  scrapeFacebookMarketplace,
  scrapeAndConvert,
  convertToRawListing,
} from "@/scrapers/facebook/scraper";
import type { FacebookScraperConfig } from "@/scrapers/facebook/types";

// We need to test internal functions. Since they're not exported,
// we test them indirectly through the main functions.

describe("Facebook Scraper Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtract.mockResolvedValue({
      listings: [
        { title: "Test Item", price: "$50", location: "NYC" },
        { title: "Another Item", price: "$100", location: "LA" },
      ],
    });
  });

  describe("scrapeFacebookMarketplace", () => {
    it("returns successful result with default config", async () => {
      const result = await scrapeFacebookMarketplace();

      expect(result.success).toBe(true);
      expect(result.listings).toHaveLength(2);
      expect(result.totalFound).toBe(2);
      expect(result.scrapedAt).toBeInstanceOf(Date);
      expect(mockInit).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });

    it("navigates to correct URL with keywords", async () => {
      await scrapeFacebookMarketplace({ keywords: ["iphone", "pro"] });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining("query=iphone+pro")
      );
    });

    it("navigates to correct URL with location", async () => {
      await scrapeFacebookMarketplace({ location: "sarasota" });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining("/marketplace/sarasota")
      );
    });

    it("navigates to correct URL with category", async () => {
      await scrapeFacebookMarketplace({ category: "electronics" });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining("/electronics")
      );
    });

    it("applies price filters to URL", async () => {
      await scrapeFacebookMarketplace({ minPrice: 50, maxPrice: 500 });

      const url = mockGoto.mock.calls[0][0];
      expect(url).toContain("minPrice=50");
      expect(url).toContain("maxPrice=500");
    });

    it("applies sort order", async () => {
      await scrapeFacebookMarketplace({ sortBy: "price_low" });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining("sortBy=PRICE_ASCEND")
      );
    });

    it("applies date_listed sort", async () => {
      await scrapeFacebookMarketplace({ sortBy: "date_listed" });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining("sortBy=CREATION_TIME_DESCEND")
      );
    });

    it("applies price_high sort", async () => {
      await scrapeFacebookMarketplace({ sortBy: "price_high" });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining("sortBy=PRICE_DESCEND")
      );
    });

    it("applies best_match sort", async () => {
      await scrapeFacebookMarketplace({ sortBy: "best_match" });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining("sortBy=BEST_MATCH")
      );
    });

    it("falls back to BEST_MATCH for unknown sort", async () => {
      await scrapeFacebookMarketplace({ sortBy: "unknown_sort" as any });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining("sortBy=BEST_MATCH")
      );
    });

    it("respects maxListings config", async () => {
      mockExtract.mockResolvedValue({
        listings: Array.from({ length: 30 }, (_, i) => ({
          title: `Item ${i}`,
          price: `$${i * 10}`,
        })),
      });

      const result = await scrapeFacebookMarketplace({ maxListings: 5 });
      expect(result.listings).toHaveLength(5);
    });

    it("defaults maxListings to 20", async () => {
      mockExtract.mockResolvedValue({
        listings: Array.from({ length: 25 }, (_, i) => ({
          title: `Item ${i}`,
          price: `$${i * 10}`,
        })),
      });

      const result = await scrapeFacebookMarketplace();
      expect(result.listings).toHaveLength(20);
    });

    it("handles Stagehand init failure gracefully", async () => {
      mockInit.mockRejectedValueOnce(new Error("Browser launch failed"));

      const result = await scrapeFacebookMarketplace();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Browser launch failed");
      expect(result.listings).toHaveLength(0);
    });

    it("handles extraction failure gracefully", async () => {
      mockExtract.mockRejectedValueOnce(new Error("Extraction timeout"));

      const result = await scrapeFacebookMarketplace();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Extraction timeout");
    });

    it("handles non-Error exceptions", async () => {
      mockExtract.mockRejectedValueOnce("string error");

      const result = await scrapeFacebookMarketplace();

      expect(result.success).toBe(false);
      expect(result.error).toBe("string error");
    });

    it("always closes Stagehand even on error", async () => {
      mockExtract.mockRejectedValueOnce(new Error("fail"));

      await scrapeFacebookMarketplace();

      expect(mockClose).toHaveBeenCalled();
    });

    it("handles close error gracefully", async () => {
      mockClose.mockRejectedValueOnce(new Error("close failed"));

      // Should not throw
      const result = await scrapeFacebookMarketplace();
      expect(result.success).toBe(true);
    });

    it("attempts to dismiss login popup", async () => {
      await scrapeFacebookMarketplace();

      // The act call for login popup dismissal
      expect(mockAct).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.stringContaining("login popup"),
        })
      );
    });

    it("handles login popup dismissal failure silently", async () => {
      mockAct.mockRejectedValueOnce(new Error("No popup found"));

      const result = await scrapeFacebookMarketplace();
      expect(result.success).toBe(true);
    });

    it("scrolls 3 times to load more listings", async () => {
      await scrapeFacebookMarketplace();

      const scrollCalls = mockAct.mock.calls.filter(
        (call) => typeof call[0]?.action === "string" && call[0].action.includes("Scroll")
      );
      expect(scrollCalls).toHaveLength(3);
    });

    it("handles null page instance", async () => {
      const { Stagehand } = require("@browserbasehq/stagehand");
      Stagehand.mockImplementationOnce(() => ({
        init: mockInit,
        close: mockClose,
        page: null,
      }));

      const result = await scrapeFacebookMarketplace();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to get page instance");
    });

    it("fetches details when includeDetails is true", async () => {
      const mockDetailExtract = jest.fn().mockResolvedValue({
        title: "Detailed Item",
        price: "$50",
        description: "Full description",
        condition: "Like New",
        location: "NYC",
        sellerName: "Seller",
        postedDate: "2026-01-01",
        images: ["img1.jpg"],
      });

      // First extract call returns previews, subsequent calls return details
      mockExtract
        .mockResolvedValueOnce({
          listings: [
            { title: "Item 1", price: "$50", location: "NYC" },
          ],
        })
        .mockResolvedValue({
          title: "Detailed Item",
          price: "$50",
          description: "Full description",
          condition: "Like New",
          location: "NYC",
          sellerName: "Seller",
          postedDate: "2026-01-01",
          images: ["img1.jpg"],
        });

      const result = await scrapeFacebookMarketplace({ includeDetails: true });

      expect(result.success).toBe(true);
      expect(result.listings[0].description).toBe("Full description");
      expect(mockGoBack).toHaveBeenCalled();
    });

    it("handles detail fetch error and falls back to preview data", async () => {
      mockExtract
        .mockResolvedValueOnce({
          listings: [
            { title: "Item 1", price: "$50", location: "NYC" },
          ],
        });

      // Detail extraction fails on the act (click) step
      mockAct
        .mockResolvedValueOnce(undefined) // login popup
        .mockResolvedValueOnce(undefined) // scroll 1
        .mockResolvedValueOnce(undefined) // scroll 2
        .mockResolvedValueOnce(undefined) // scroll 3
        .mockRejectedValueOnce(new Error("Click failed")); // click on listing

      const result = await scrapeFacebookMarketplace({ includeDetails: true });

      expect(result.success).toBe(true);
      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].title).toBe("Item 1");
    });

    it("preserves preview location when detail location is missing", async () => {
      mockExtract
        .mockResolvedValueOnce({
          listings: [
            { title: "Item 1", price: "$50", location: "Preview Location" },
          ],
        })
        .mockResolvedValueOnce({
          title: "Item 1",
          price: "$50",
          // no location in details
        });

      const result = await scrapeFacebookMarketplace({ includeDetails: true });

      expect(result.listings[0].location).toBe("Preview Location");
    });

    it("uses detail location when available", async () => {
      mockExtract
        .mockResolvedValueOnce({
          listings: [
            { title: "Item 1", price: "$50", location: "Preview Location" },
          ],
        })
        .mockResolvedValueOnce({
          title: "Item 1",
          price: "$50",
          location: "Detail Location",
        });

      const result = await scrapeFacebookMarketplace({ includeDetails: true });

      expect(result.listings[0].location).toBe("Detail Location");
    });

    it("includes config in result", async () => {
      const config: FacebookScraperConfig = { keywords: ["test"], maxListings: 5 };
      const result = await scrapeFacebookMarketplace(config);

      expect(result.config).toEqual(config);
    });

    it("builds URL without query params when none specified", async () => {
      await scrapeFacebookMarketplace({});

      expect(mockGoto).toHaveBeenCalledWith(
        "https://www.facebook.com/marketplace/search"
      );
    });

    it("uses custom category in URL when not in FACEBOOK_CATEGORIES", async () => {
      await scrapeFacebookMarketplace({ category: "custom-cat" });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining("/custom-cat")
      );
    });
  });

  describe("scrapeAndConvert", () => {
    it("returns converted RawListing array on success", async () => {
      const result = await scrapeAndConvert();

      expect(result.success).toBe(true);
      expect(result.listings).toHaveLength(2);
      expect(result.listings[0]).toHaveProperty("externalId");
      expect(result.listings[0]).toHaveProperty("url");
      expect(result.listings[0]).toHaveProperty("title", "Test Item");
      expect(result.listings[0]).toHaveProperty("askingPrice", 50);
    });

    it("passes config through to scraper", async () => {
      await scrapeAndConvert({ keywords: ["laptop"], maxListings: 5 });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining("query=laptop")
      );
    });

    it("returns error info on failure", async () => {
      mockInit.mockRejectedValueOnce(new Error("Failed"));

      const result = await scrapeAndConvert();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed");
      expect(result.listings).toHaveLength(0);
    });

    it("returns totalFound from scraper result", async () => {
      const result = await scrapeAndConvert();

      expect(result.totalFound).toBe(2);
    });
  });

  describe("URL building (indirect tests via navigation)", () => {
    it("combines location and category", async () => {
      await scrapeFacebookMarketplace({
        location: "miami",
        category: "vehicles",
      });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining("/marketplace/miami/vehicles")
      );
    });

    it("combines location, category, and keywords", async () => {
      await scrapeFacebookMarketplace({
        location: "miami",
        category: "vehicles",
        keywords: ["honda", "civic"],
      });

      const url = mockGoto.mock.calls[0][0];
      expect(url).toContain("/marketplace/miami/vehicles");
      expect(url).toContain("query=honda+civic");
    });

    it("uses /search path when no category specified", async () => {
      await scrapeFacebookMarketplace({ keywords: ["test"] });

      expect(mockGoto).toHaveBeenCalledWith(
        expect.stringContaining("/marketplace/search")
      );
    });

    it("handles all price + sort + keywords together", async () => {
      await scrapeFacebookMarketplace({
        keywords: ["chair"],
        minPrice: 10,
        maxPrice: 200,
        sortBy: "price_low",
      });

      const url = mockGoto.mock.calls[0][0];
      expect(url).toContain("query=chair");
      expect(url).toContain("minPrice=10");
      expect(url).toContain("maxPrice=200");
      expect(url).toContain("sortBy=PRICE_ASCEND");
    });
  });

  describe("generateExternalId (indirect)", () => {
    it("generates fb- prefixed IDs for normal listings", () => {
      const result = convertToRawListing({ title: "Normal item", price: "$10" }, 0);
      expect(result.externalId).toMatch(/^fb-\d+$/);
    });

    it("extracts ID from URL-like title with /item/ pattern", () => {
      const result = convertToRawListing(
        { title: "Check /item/12345678 out", price: "$10" },
        0
      );
      expect(result.externalId).toBe("12345678");
    });

    it("different indices produce different IDs for same title", () => {
      const id0 = convertToRawListing({ title: "Same", price: "$10" }, 0).externalId;
      const id1 = convertToRawListing({ title: "Same", price: "$10" }, 1).externalId;
      expect(id0).not.toBe(id1);
    });
  });
});

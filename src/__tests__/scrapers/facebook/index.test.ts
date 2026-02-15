/**
 * Facebook Scraper Index - Export Tests
 * Ensures all exports are properly re-exported from index.ts
 */

import {
  scrapeFacebookMarketplace,
  scrapeAndConvert,
  convertToRawListing,
  FACEBOOK_CATEGORIES,
  FacebookListingPreviewSchema,
  FacebookListingDetailSchema,
} from "@/scrapers/facebook";

// Mock Stagehand to prevent actual browser launch
jest.mock("@browserbasehq/stagehand", () => ({
  Stagehand: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    page: null,
  })),
}));

describe("Facebook Scraper Index Exports", () => {
  it("exports scrapeFacebookMarketplace function", () => {
    expect(typeof scrapeFacebookMarketplace).toBe("function");
  });

  it("exports scrapeAndConvert function", () => {
    expect(typeof scrapeAndConvert).toBe("function");
  });

  it("exports convertToRawListing function", () => {
    expect(typeof convertToRawListing).toBe("function");
  });

  it("exports FACEBOOK_CATEGORIES object", () => {
    expect(typeof FACEBOOK_CATEGORIES).toBe("object");
    expect(FACEBOOK_CATEGORIES).toHaveProperty("electronics");
  });

  it("exports FacebookListingPreviewSchema", () => {
    expect(FacebookListingPreviewSchema).toBeDefined();
    expect(typeof FacebookListingPreviewSchema.parse).toBe("function");
  });

  it("exports FacebookListingDetailSchema", () => {
    expect(FacebookListingDetailSchema).toBeDefined();
    expect(typeof FacebookListingDetailSchema.parse).toBe("function");
  });
});

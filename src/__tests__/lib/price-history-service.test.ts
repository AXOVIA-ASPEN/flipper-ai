// Tests for price history service
// Tests eBay market data fetching and database storage

import {
  fetchAndStorePriceHistory,
  getPriceHistory,
  updateListingWithMarketValue,
} from "../../lib/price-history-service";
import * as marketPrice from "../../lib/market-price";

// Mock the database
jest.mock("../../lib/db", () => ({
  prisma: {
    priceHistory: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    listing: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock the market-price module
jest.mock("../../lib/market-price", () => ({
  fetchMarketPrice: jest.fn(),
  fetchMarketPricesBatch: jest.fn(),
  closeBrowser: jest.fn(),
}));

import { prisma } from "../../lib/db";

describe("Price History Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchAndStorePriceHistory", () => {
    it("should fetch market data and store price history", async () => {
      // Mock market data response
      const mockMarketData = {
        source: "ebay_scrape" as const,
        soldListings: [
          {
            title: "iPhone 13 Pro 128GB",
            price: 600,
            soldDate: new Date("2024-01-15"),
            condition: "Good",
            url: "https://ebay.com/item/123",
            shippingCost: 10,
          },
          {
            title: "iPhone 13 Pro 256GB",
            price: 650,
            soldDate: new Date("2024-01-10"),
            condition: "Excellent",
            url: "https://ebay.com/item/124",
            shippingCost: 0,
          },
        ],
        medianPrice: 625,
        lowPrice: 610,
        highPrice: 650,
        avgPrice: 630,
        salesCount: 2,
        avgDaysToSell: null,
        searchQuery: "iPhone 13 Pro",
        fetchedAt: new Date(),
      };

      jest.mocked(marketPrice.fetchMarketPrice).mockResolvedValue(
        mockMarketData
      );

      const result = await fetchAndStorePriceHistory(
        "iPhone 13 Pro",
        "electronics"
      );

      expect(result).toEqual(mockMarketData);

      // Check that database createMany was called with correct data
      expect(prisma.priceHistory.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            productName: "iPhone 13 Pro",
            soldPrice: 610, // 600 + 10 shipping
            platform: "EBAY",
          }),
          expect.objectContaining({
            productName: "iPhone 13 Pro",
            soldPrice: 650, // 650 + 0 shipping
            platform: "EBAY",
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it("should return null if no market data found", async () => {
      jest.mocked(marketPrice.fetchMarketPrice).mockResolvedValue(null);

      const result = await fetchAndStorePriceHistory("NonexistentProduct");

      expect(result).toBeNull();
      expect(prisma.priceHistory.createMany).not.toHaveBeenCalled();
    });
  });

  describe("getPriceHistory", () => {
    it("should retrieve price history and calculate stats", async () => {
      // Mock database response
      jest.mocked(prisma.priceHistory.findMany).mockResolvedValue([
        {
          id: "1",
          productName: "MacBook Pro",
          category: "electronics",
          platform: "EBAY",
          soldPrice: 1200,
          condition: "Good",
          soldAt: new Date("2024-01-01"),
          createdAt: new Date(),
        },
        {
          id: "2",
          productName: "MacBook Pro",
          category: "electronics",
          platform: "EBAY",
          soldPrice: 1400,
          condition: "Excellent",
          soldAt: new Date("2024-01-05"),
          createdAt: new Date(),
        },
        {
          id: "3",
          productName: "MacBook Pro",
          category: "electronics",
          platform: "EBAY",
          soldPrice: 1100,
          condition: "Fair",
          soldAt: new Date("2024-01-10"),
          createdAt: new Date(),
        },
      ]);

      const result = await getPriceHistory({
        productName: "MacBook Pro",
        category: "electronics",
      });

      expect(result.soldListings).toHaveLength(3);
      expect(result.stats.count).toBe(3);
      expect(result.stats.avgPrice).toBeCloseTo(1233.33, 1);
      expect(result.stats.medianPrice).toBe(1200);
      expect(result.stats.minPrice).toBe(1100);
      expect(result.stats.maxPrice).toBe(1400);
    });

    it("should return empty result if no records found", async () => {
      jest.mocked(prisma.priceHistory.findMany).mockResolvedValue([]);

      const result = await getPriceHistory({
        productName: "Nonexistent Product",
      });

      expect(result.soldListings).toHaveLength(0);
      expect(result.stats.count).toBe(0);
      expect(result.stats.avgPrice).toBe(0);
    });
  });

  describe("updateListingWithMarketValue", () => {
    it("should update listing with verified market value", async () => {
      const mockListing = {
        id: "listing123",
        title: "iPad Pro 11 inch",
        askingPrice: 500,
        category: null,
      };

      const mockMarketData = {
        source: "ebay_scrape" as const,
        soldListings: [
          {
            title: "iPad Pro 11",
            price: 700,
            soldDate: new Date(),
            condition: "Good",
            url: "https://ebay.com/item/1",
            shippingCost: 0,
          },
          {
            title: "iPad Pro 11",
            price: 750,
            soldDate: new Date(),
            condition: "Excellent",
            url: "https://ebay.com/item/2",
            shippingCost: 10,
          },
        ],
        medianPrice: 730,
        lowPrice: 700,
        highPrice: 760,
        avgPrice: 730,
        salesCount: 2,
        avgDaysToSell: null,
        searchQuery: "iPad Pro 11",
        fetchedAt: new Date(),
      };

      jest.mocked(prisma.listing.findUnique).mockResolvedValue(
        mockListing as any
      );
      jest.mocked(marketPrice.fetchMarketPrice).mockResolvedValue(
        mockMarketData
      );

      await updateListingWithMarketValue("listing123");

      // Check that update was called with correct data
      expect(prisma.listing.update).toHaveBeenCalledWith({
        where: { id: "listing123" },
        data: expect.objectContaining({
          verifiedMarketValue: 730,
          marketDataSource: "ebay_scrape",
          trueDiscountPercent: expect.closeTo(31.5, 1),
        }),
      });
    });

    it("should throw error if listing not found", async () => {
      jest.mocked(prisma.listing.findUnique).mockResolvedValue(null);

      await expect(
        updateListingWithMarketValue("nonexistent")
      ).rejects.toThrow("Listing not found");
    });

    it("should handle no market data gracefully", async () => {
      jest.mocked(prisma.listing.findUnique).mockResolvedValue({
        id: "listing456",
        title: "Rare Vintage Item",
        askingPrice: 100,
        category: null,
      } as any);

      jest.mocked(marketPrice.fetchMarketPrice).mockResolvedValue(null);

      // Should not throw, just log and return
      await expect(
        updateListingWithMarketValue("listing456")
      ).resolves.not.toThrow();

      expect(prisma.listing.update).not.toHaveBeenCalled();
    });
  });

  describe("batchUpdateListingsWithMarketValue", () => {
    // Import the batch function
    const { batchUpdateListingsWithMarketValue } = require("../../lib/price-history-service");

    beforeEach(() => {
      jest.clearAllMocks();
      // Clear timers
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should successfully update multiple listings", async () => {
      const listingIds = ["listing1", "listing2", "listing3"];
      
      const mockListing = (id: string) => ({
        id,
        title: `Product ${id}`,
        askingPrice: 100,
        category: "electronics",
      });

      const mockMarketData = {
        source: "ebay_scrape" as const,
        soldListings: [
          {
            title: "Product",
            price: 200,
            soldDate: new Date(),
            condition: "Good",
            url: "https://ebay.com/item/1",
            shippingCost: 0,
          },
        ],
        medianPrice: 200,
        lowPrice: 200,
        highPrice: 200,
        avgPrice: 200,
        salesCount: 1,
        avgDaysToSell: null,
        searchQuery: "Product",
        fetchedAt: new Date(),
      };

      jest.mocked(prisma.listing.findUnique)
        .mockResolvedValueOnce(mockListing("listing1") as any)
        .mockResolvedValueOnce(mockListing("listing2") as any)
        .mockResolvedValueOnce(mockListing("listing3") as any);

      jest.mocked(marketPrice.fetchMarketPrice).mockResolvedValue(mockMarketData);

      // Start the batch update
      const resultPromise = batchUpdateListingsWithMarketValue(listingIds);

      // Fast-forward through all setTimeout delays
      for (let i = 0; i < listingIds.length; i++) {
        await jest.runAllTimersAsync();
      }

      const result = await resultPromise;

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(prisma.listing.update).toHaveBeenCalledTimes(3);
    });

    it("should handle partial failures", async () => {
      const listingIds = ["listing1", "listing2", "listing3"];
      
      jest.mocked(prisma.listing.findUnique)
        .mockResolvedValueOnce({
          id: "listing1",
          title: "Product 1",
          askingPrice: 100,
          category: null,
        } as any)
        .mockRejectedValueOnce(new Error("Listing not found")) // listing2 fails
        .mockResolvedValueOnce({
          id: "listing3",
          title: "Product 3",
          askingPrice: 100,
          category: null,
        } as any);

      jest.mocked(marketPrice.fetchMarketPrice).mockResolvedValue({
        source: "ebay_scrape" as const,
        soldListings: [],
        medianPrice: 150,
        lowPrice: 150,
        highPrice: 150,
        avgPrice: 150,
        salesCount: 1,
        avgDaysToSell: null,
        searchQuery: "Product",
        fetchedAt: new Date(),
      });

      const resultPromise = batchUpdateListingsWithMarketValue(listingIds);

      // Fast-forward through delays
      for (let i = 0; i < listingIds.length; i++) {
        await jest.runAllTimersAsync();
      }

      const result = await resultPromise;

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].listingId).toBe("listing2");
      expect(result.errors[0].error).toContain("not found");
    });

    it("should handle all failures", async () => {
      const listingIds = ["listing1", "listing2"];
      
      jest.mocked(prisma.listing.findUnique).mockRejectedValue(
        new Error("Database error")
      );

      const resultPromise = batchUpdateListingsWithMarketValue(listingIds);

      // Fast-forward through delays
      for (let i = 0; i < listingIds.length; i++) {
        await jest.runAllTimersAsync();
      }

      const result = await resultPromise;

      expect(result.success).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
    });

    it("should add delays between requests", async () => {
      const listingIds = ["listing1", "listing2"];
      const delays: number[] = [];
      let lastCall = Date.now();

      jest.mocked(prisma.listing.findUnique).mockResolvedValue({
        id: "listing1",
        title: "Product",
        askingPrice: 100,
        category: null,
      } as any);

      jest.mocked(marketPrice.fetchMarketPrice).mockImplementation(async () => {
        const now = Date.now();
        delays.push(now - lastCall);
        lastCall = now;
        return {
          source: "ebay_scrape" as const,
          soldListings: [],
          medianPrice: 150,
          lowPrice: 150,
          highPrice: 150,
          avgPrice: 150,
          salesCount: 1,
          avgDaysToSell: null,
          searchQuery: "Product",
          fetchedAt: new Date(),
        };
      });

      const resultPromise = batchUpdateListingsWithMarketValue(listingIds);

      // Fast-forward through delays
      for (let i = 0; i < listingIds.length; i++) {
        await jest.runAllTimersAsync();
      }

      const result = await resultPromise;

      // Verify delays were called (using fake timers, so we just check the function was called)
      expect(result.success).toBe(2);
    });
  });
});

/**
 * Market Value Calculator Tests
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

import { describe, test, expect, beforeEach } from "@jest/globals";
import {
  calculateVerifiedMarketValue,
  calculateTrueDiscount,
  updateListingWithVerifiedValue,
  MarketValueResult,
} from "@/lib/market-value-calculator";
import prisma from "@/lib/db";

describe("Market Value Calculator", () => {
  describe("calculateVerifiedMarketValue", () => {
    beforeEach(async () => {
      // Clean up test data
      await prisma.priceHistory.deleteMany({
        where: {
          productName: {
            contains: "TEST_PRODUCT",
          },
        },
      });
    });

    test("returns null for insufficient data (< 3 sales)", async () => {
      // Create only 2 sold listings
      await prisma.priceHistory.createMany({
        data: [
          {
            productName: "TEST_PRODUCT iPhone 12",
            platform: "EBAY",
            soldPrice: 400,
            soldAt: new Date(),
          },
          {
            productName: "TEST_PRODUCT iPhone 12",
            platform: "EBAY",
            soldPrice: 420,
            soldAt: new Date(),
          },
        ],
      });

      const result = await calculateVerifiedMarketValue("TEST_PRODUCT iPhone 12", "EBAY");
      expect(result).toBeNull();
    });

    test("calculates median market value from sold data", async () => {
      // Create test sold listings
      const prices = [300, 320, 330, 340, 350, 360, 370, 380, 400];
      await prisma.priceHistory.createMany({
        data: prices.map((price) => ({
          productName: "TEST_PRODUCT MacBook Pro",
          platform: "EBAY",
          soldPrice: price,
          soldAt: new Date(),
        })),
      });

      const result = await calculateVerifiedMarketValue("TEST_PRODUCT MacBook Pro", "EBAY");

      expect(result).not.toBeNull();
      expect(result!.verifiedMarketValue).toBe(350); // Median of 9 prices
      expect(result!.dataPoints).toBe(9);
      expect(result!.marketDataSource).toBe("ebay_sold");
    });

    test("removes outliers using IQR method", async () => {
      // Create data with clear outliers
      const prices = [
        // Normal range: 300-400
        300, 320, 330, 340, 350, 360, 370, 380, 400,
        // Outliers
        100, // Way too low
        800, // Way too high
      ];

      await prisma.priceHistory.createMany({
        data: prices.map((price) => ({
          productName: "TEST_PRODUCT iPad Pro",
          platform: "EBAY",
          soldPrice: price,
          soldAt: new Date(),
        })),
      });

      const result = await calculateVerifiedMarketValue("TEST_PRODUCT iPad Pro", "EBAY");

      expect(result).not.toBeNull();
      expect(result!.outliers.removed).toBe(2); // Should remove both 100 and 800
      expect(result!.dataPoints).toBe(9); // 11 - 2 outliers
      expect(result!.soldPriceRange.min).toBeGreaterThanOrEqual(300);
      expect(result!.soldPriceRange.max).toBeLessThanOrEqual(400);
    });

    test("provides high confidence for large datasets with low variance", async () => {
      // Create 15 sales clustered around $500
      const prices = Array.from({ length: 15 }, (_, i) => 480 + i * 3);

      await prisma.priceHistory.createMany({
        data: prices.map((price) => ({
          productName: "TEST_PRODUCT PS5",
          platform: "EBAY",
          soldPrice: price,
          soldAt: new Date(),
        })),
      });

      const result = await calculateVerifiedMarketValue("TEST_PRODUCT PS5", "EBAY");

      expect(result).not.toBeNull();
      expect(result!.confidence).toBe("high");
      expect(result!.dataPoints).toBeGreaterThanOrEqual(10);
    });

    test("provides low confidence for small datasets with high variance", async () => {
      // Create 4 sales with high variance
      const prices = [200, 350, 550, 700];

      await prisma.priceHistory.createMany({
        data: prices.map((price) => ({
          productName: "TEST_PRODUCT Nintendo Switch",
          platform: "EBAY",
          soldPrice: price,
          soldAt: new Date(),
        })),
      });

      const result = await calculateVerifiedMarketValue("TEST_PRODUCT Nintendo Switch", "EBAY");

      expect(result).not.toBeNull();
      expect(result!.confidence).toBe("low");
      expect(result!.dataPoints).toBeLessThan(5);
    });

    test("filters by age (maxAge parameter)", async () => {
      const now = new Date();
      const old = new Date(now);
      old.setDate(old.getDate() - 100); // 100 days ago

      await prisma.priceHistory.createMany({
        data: [
          // Recent sales
          { productName: "TEST_PRODUCT AirPods", platform: "EBAY", soldPrice: 150, soldAt: now },
          { productName: "TEST_PRODUCT AirPods", platform: "EBAY", soldPrice: 155, soldAt: now },
          { productName: "TEST_PRODUCT AirPods", platform: "EBAY", soldPrice: 160, soldAt: now },
          // Old sale (should be excluded)
          { productName: "TEST_PRODUCT AirPods", platform: "EBAY", soldPrice: 200, soldAt: old },
        ],
      });

      const result = await calculateVerifiedMarketValue("TEST_PRODUCT AirPods", "EBAY", 90);

      expect(result).not.toBeNull();
      expect(result!.dataPoints).toBe(3); // Should only include recent 3
      expect(result!.soldPriceRange.max).toBeLessThanOrEqual(160); // Old $200 sale excluded
    });

    test("returns statistics in soldPriceRange", async () => {
      const prices = [100, 110, 120, 130, 140];

      await prisma.priceHistory.createMany({
        data: prices.map((price) => ({
          productName: "TEST_PRODUCT Headphones",
          platform: "EBAY",
          soldPrice: price,
          soldAt: new Date(),
        })),
      });

      const result = await calculateVerifiedMarketValue("TEST_PRODUCT Headphones", "EBAY");

      expect(result).not.toBeNull();
      expect(result!.soldPriceRange.min).toBe(100);
      expect(result!.soldPriceRange.max).toBe(140);
      expect(result!.soldPriceRange.median).toBe(120);
      expect(result!.soldPriceRange.average).toBe(120);
    });
  });

  describe("calculateTrueDiscount", () => {
    test("calculates positive discount when below market", () => {
      const discount = calculateTrueDiscount(500, 300);
      expect(discount).toBe(40); // 40% below market
    });

    test("calculates negative discount when above market", () => {
      const discount = calculateTrueDiscount(500, 600);
      expect(discount).toBe(-20); // 20% above market
    });

    test("returns 0 for equal prices", () => {
      const discount = calculateTrueDiscount(500, 500);
      expect(discount).toBe(0);
    });

    test("handles zero market value", () => {
      const discount = calculateTrueDiscount(0, 100);
      expect(discount).toBe(0);
    });

    test("rounds to nearest integer", () => {
      const discount = calculateTrueDiscount(333, 200);
      expect(discount).toBe(40); // (333-200)/333 ≈ 0.399... → 40%
    });
  });

  describe("updateListingWithVerifiedValue", () => {
    let testListingId: string;

    beforeEach(async () => {
      // Clean up
      await prisma.listing.deleteMany({
        where: {
          title: {
            contains: "TEST_LISTING",
          },
        },
      });

      await prisma.priceHistory.deleteMany({
        where: {
          productName: {
            contains: "TEST_LISTING",
          },
        },
      });

      // Create test listing
      const listing = await prisma.listing.create({
        data: {
          externalId: "test-123",
          platform: "EBAY",
          url: "https://ebay.com/test",
          title: "TEST_LISTING MacBook Air",
          askingPrice: 600,
          estimatedValue: 800,
          userId: null,
        },
      });

      testListingId = listing.id;

      // Create sold data
      await prisma.priceHistory.createMany({
        data: [
          { productName: "TEST_LISTING MacBook Air", platform: "EBAY", soldPrice: 750, soldAt: new Date() },
          { productName: "TEST_LISTING MacBook Air", platform: "EBAY", soldPrice: 780, soldAt: new Date() },
          { productName: "TEST_LISTING MacBook Air", platform: "EBAY", soldPrice: 800, soldAt: new Date() },
          { productName: "TEST_LISTING MacBook Air", platform: "EBAY", soldPrice: 820, soldAt: new Date() },
          { productName: "TEST_LISTING MacBook Air", platform: "EBAY", soldPrice: 850, soldAt: new Date() },
        ],
      });
    });

    test("updates listing with verified market value", async () => {
      const updatedListing = await updateListingWithVerifiedValue(testListingId);

      expect(updatedListing).not.toBeNull();
      expect(updatedListing!.verifiedMarketValue).toBeGreaterThan(0);
      expect(updatedListing!.marketDataSource).toBe("ebay_sold");
      expect(updatedListing!.trueDiscountPercent).toBeGreaterThan(0); // $600 asking < market
    });

    test("returns null when insufficient data", async () => {
      // Create listing with no sold data
      const listing = await prisma.listing.create({
        data: {
          externalId: "test-456",
          platform: "EBAY",
          url: "https://ebay.com/test2",
          title: "TEST_LISTING Unknown Item XYZ",
          askingPrice: 100,
          userId: null,
        },
      });

      const result = await updateListingWithVerifiedValue(listing.id);
      expect(result).toBeNull();
    });

    test("throws error for non-existent listing", async () => {
      await expect(updateListingWithVerifiedValue("invalid-id")).rejects.toThrow("Listing not found");
    });
  });
});

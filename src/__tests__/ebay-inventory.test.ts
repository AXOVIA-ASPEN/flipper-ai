/**
 * Tests for src/lib/ebay-inventory.ts
 */

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  createDraftListing,
  publishOffer,
  getInventoryItem,
  deleteInventoryItem,
  EBAY_CONDITIONS,
} from "@/lib/ebay-inventory";

const validInput = {
  sku: "TEST-SKU-001",
  title: "Test Item",
  description: "A test item description",
  categoryId: "9355",
  condition: EBAY_CONDITIONS.USED_GOOD,
  price: 99.99,
  imageUrls: ["https://example.com/img.jpg"],
};

describe("ebay-inventory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EBAY_OAUTH_TOKEN = "test-token";
  });

  afterEach(() => {
    delete process.env.EBAY_OAUTH_TOKEN;
  });

  describe("createDraftListing", () => {
    it("creates inventory item then offer", async () => {
      // inventory item PUT → 204
      mockFetch.mockResolvedValueOnce({
        status: 204,
        ok: true,
      });
      // offer POST → 201
      mockFetch.mockResolvedValueOnce({
        status: 201,
        ok: true,
        json: async () => ({ offerId: "offer-abc" }),
      });

      const result = await createDraftListing(validInput);
      expect(result.success).toBe(true);
      expect(result.offerId).toBe("offer-abc");
      expect(result.status).toBe("DRAFT");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("returns FAILED when inventory item creation fails", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 400,
        ok: false,
        json: async () => ({
          errors: [{ errorId: 1, domain: "API", category: "REQUEST", message: "Bad SKU" }],
        }),
      });

      const result = await createDraftListing(validInput);
      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
      expect(result.errors).toContain("Bad SKU");
      expect(mockFetch).toHaveBeenCalledTimes(1); // didn't call offer
    });

    it("returns FAILED when offer creation fails", async () => {
      mockFetch.mockResolvedValueOnce({ status: 204, ok: true });
      mockFetch.mockResolvedValueOnce({
        status: 400,
        ok: false,
        json: async () => ({
          errors: [{ errorId: 2, domain: "API", category: "REQUEST", message: "Missing policy" }],
        }),
      });

      const result = await createDraftListing(validInput);
      expect(result.success).toBe(false);
      expect(result.status).toBe("FAILED");
    });

    it("throws when token is missing", async () => {
      delete process.env.EBAY_OAUTH_TOKEN;
      await expect(createDraftListing(validInput)).rejects.toThrow("Missing EBAY_OAUTH_TOKEN");
    });

    it("includes optional policy IDs in offer body", async () => {
      mockFetch.mockResolvedValueOnce({ status: 204, ok: true });
      mockFetch.mockResolvedValueOnce({
        status: 201,
        ok: true,
        json: async () => ({ offerId: "offer-policies" }),
      });

      await createDraftListing({
        ...validInput,
        fulfillmentPolicyId: "fulfillment-123",
        paymentPolicyId: "payment-456",
        returnPolicyId: "return-789",
        merchantLocationKey: "warehouse-1",
      });

      // Second call is the offer POST
      const offerBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(offerBody.listingPolicies.fulfillmentPolicyId).toBe("fulfillment-123");
      expect(offerBody.listingPolicies.paymentPolicyId).toBe("payment-456");
      expect(offerBody.listingPolicies.returnPolicyId).toBe("return-789");
      expect(offerBody.merchantLocationKey).toBe("warehouse-1");
    });

    it("includes only fulfillmentPolicyId when others are not provided", async () => {
      mockFetch.mockResolvedValueOnce({ status: 204, ok: true });
      mockFetch.mockResolvedValueOnce({
        status: 201,
        ok: true,
        json: async () => ({ offerId: "offer-partial" }),
      });

      await createDraftListing({
        ...validInput,
        fulfillmentPolicyId: "fulfillment-only",
      });

      const offerBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(offerBody.listingPolicies.fulfillmentPolicyId).toBe("fulfillment-only");
      expect(offerBody.listingPolicies.paymentPolicyId).toBeUndefined();
      expect(offerBody.listingPolicies.returnPolicyId).toBeUndefined();
      expect(offerBody.merchantLocationKey).toBeUndefined();
    });

    it("includes package weight and dimensions when provided", async () => {
      mockFetch.mockResolvedValueOnce({ status: 204, ok: true });
      mockFetch.mockResolvedValueOnce({
        status: 201,
        ok: true,
        json: async () => ({ offerId: "offer-xyz" }),
      });

      await createDraftListing({
        ...validInput,
        packageWeightLbs: 2.5,
        packageDimensions: { length: 12, width: 8, height: 4 },
      });

      const putBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(putBody.packageWeightAndSize.weight.value).toBe(2.5);
      expect(putBody.packageWeightAndSize.dimensions.length).toBe(12);
    });
  });

  describe("publishOffer", () => {
    it("publishes successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ listingId: "listing-123" }),
      });

      const result = await publishOffer("offer-abc");
      expect(result.success).toBe(true);
      expect(result.listingId).toBe("listing-123");
    });

    it("returns errors on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 400,
        ok: false,
        json: async () => ({
          errors: [{ errorId: 3, domain: "API", category: "REQUEST", message: "Not ready" }],
        }),
      });

      const result = await publishOffer("offer-abc");
      expect(result.success).toBe(false);
      expect(result.errors).toContain("Not ready");
    });
  });

  describe("getInventoryItem", () => {
    it("returns item data on success", async () => {
      const itemData = { sku: "TEST", product: { title: "Test" } };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => itemData,
      });

      const result = await getInventoryItem("TEST");
      expect(result).toEqual(itemData);
    });

    it("returns null on 404", async () => {
      mockFetch.mockResolvedValueOnce({ status: 404, ok: false });
      const result = await getInventoryItem("MISSING");
      expect(result).toBeNull();
    });
  });

  describe("deleteInventoryItem", () => {
    it("deletes successfully", async () => {
      mockFetch.mockResolvedValueOnce({ status: 204, ok: true });
      const result = await deleteInventoryItem("TEST");
      expect(result.success).toBe(true);
    });

    it("returns errors on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: async () => ({
          errors: [{ errorId: 4, domain: "API", category: "REQUEST", message: "Not found" }],
        }),
      });

      const result = await deleteInventoryItem("MISSING");
      expect(result.success).toBe(false);
    });
  });
});

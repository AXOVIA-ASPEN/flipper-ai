/**
 * Tests for Zod validation schemas
 */

import {
  PaginationSchema,
  PlatformEnum,
  OpportunityStatusEnum,
  OpportunityQuerySchema,
  CreateOpportunitySchema,
  ListingQuerySchema,
  CreateListingSchema,
  ScraperJobQuerySchema,
  CreateScraperJobSchema,
  SearchConfigQuerySchema,
  CreateSearchConfigSchema,
  validateBody,
  validateQuery,
} from "@/lib/validations";

describe("PaginationSchema", () => {
  it("accepts valid pagination", () => {
    const result = PaginationSchema.safeParse({ limit: "25", offset: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
      expect(result.data.offset).toBe(10);
    }
  });

  it("applies defaults", () => {
    const result = PaginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(0);
    }
  });

  it("rejects limit > 200", () => {
    const result = PaginationSchema.safeParse({ limit: "500" });
    expect(result.success).toBe(false);
  });

  it("rejects negative offset", () => {
    const result = PaginationSchema.safeParse({ offset: "-1" });
    expect(result.success).toBe(false);
  });
});

describe("PlatformEnum", () => {
  it("accepts valid platforms", () => {
    for (const p of ["CRAIGSLIST", "FACEBOOK_MARKETPLACE", "EBAY", "OFFERUP", "MERCARI"]) {
      expect(PlatformEnum.safeParse(p).success).toBe(true);
    }
  });

  it("rejects invalid platform", () => {
    expect(PlatformEnum.safeParse("AMAZON").success).toBe(false);
  });
});

describe("CreateOpportunitySchema", () => {
  it("accepts valid input", () => {
    const result = CreateOpportunitySchema.safeParse({
      listingId: "abc123",
      notes: "Looks good",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty listingId", () => {
    const result = CreateOpportunitySchema.safeParse({ listingId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing listingId", () => {
    const result = CreateOpportunitySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("notes are optional", () => {
    const result = CreateOpportunitySchema.safeParse({ listingId: "abc" });
    expect(result.success).toBe(true);
  });
});

describe("CreateListingSchema", () => {
  const validListing = {
    externalId: "ext-123",
    platform: "EBAY",
    url: "https://ebay.com/item/123",
    title: "Vintage Camera",
    askingPrice: 50,
  };

  it("accepts valid listing", () => {
    const result = CreateListingSchema.safeParse(validListing);
    expect(result.success).toBe(true);
  });

  it("accepts listing with all optional fields", () => {
    const result = CreateListingSchema.safeParse({
      ...validListing,
      description: "Great condition vintage camera",
      condition: "Good",
      location: "New York, NY",
      sellerName: "John",
      sellerContact: "john@example.com",
      imageUrls: ["https://img.com/1.jpg"],
      category: "Electronics",
      postedAt: "2026-01-15T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = CreateListingSchema.safeParse({ title: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL", () => {
    const result = CreateListingSchema.safeParse({
      ...validListing,
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = CreateListingSchema.safeParse({
      ...validListing,
      askingPrice: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid platform", () => {
    const result = CreateListingSchema.safeParse({
      ...validListing,
      platform: "AMAZON",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many image URLs", () => {
    const result = CreateListingSchema.safeParse({
      ...validListing,
      imageUrls: Array(21).fill("https://img.com/1.jpg"),
    });
    expect(result.success).toBe(false);
  });
});

describe("CreateScraperJobSchema", () => {
  it("accepts valid job", () => {
    const result = CreateScraperJobSchema.safeParse({
      platform: "CRAIGSLIST",
      location: "San Francisco",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing platform", () => {
    const result = CreateScraperJobSchema.safeParse({ location: "SF" });
    expect(result.success).toBe(false);
  });
});

describe("CreateSearchConfigSchema", () => {
  it("accepts valid config", () => {
    const result = CreateSearchConfigSchema.safeParse({
      name: "Bay Area Electronics",
      platform: "CRAIGSLIST",
      location: "San Francisco, CA",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(true); // default
    }
  });

  it("rejects missing name", () => {
    const result = CreateSearchConfigSchema.safeParse({
      platform: "EBAY",
      location: "NYC",
    });
    // name is required but empty string should fail
    expect(result.success).toBe(false);
  });

  it("accepts disabled config", () => {
    const result = CreateSearchConfigSchema.safeParse({
      name: "Test",
      platform: "EBAY",
      location: "LA",
      enabled: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(false);
    }
  });
});

describe("validateBody helper", () => {
  it("returns success with parsed data", () => {
    const result = validateBody(CreateOpportunitySchema, {
      listingId: "abc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.listingId).toBe("abc");
    }
  });

  it("returns error with message on failure", () => {
    const result = validateBody(CreateOpportunitySchema, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
      expect(result.details).toBeDefined();
    }
  });
});

describe("validateQuery helper", () => {
  it("converts URLSearchParams to object and validates", () => {
    const params = new URLSearchParams("limit=10&offset=5");
    const result = validateQuery(PaginationSchema, params);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
      expect(result.data.offset).toBe(5);
    }
  });
});

import { GET, POST } from "@/app/api/scraper/facebook/route";
import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getAuthUserId } from "@/lib/auth-middleware";

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    listing: {
      upsert: jest.fn(),
    },
    scraperJob: {
      create: jest.fn(),
      update: jest.fn(),
    },
    facebookToken: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth-middleware", () => ({
  getAuthUserId: jest.fn(),
}));

jest.mock("@/lib/value-estimator", () => ({
  estimateValue: jest.fn(() => ({
    estimatedValue: 150,
    estimatedLow: 100,
    estimatedHigh: 200,
    profitPotential: 50,
    profitLow: 25,
    profitHigh: 75,
    valueScore: 75,
    discountPercent: 33,
    resaleDifficulty: "EASY",
    reasoning: "Good flip opportunity",
    notes: "Test notes",
    shippable: true,
    negotiable: true,
    comparableUrls: [],
    tags: ["electronics", "phone"],
  })),
  detectCategory: jest.fn(() => "electronics"),
  generatePurchaseMessage: jest.fn(() => "Hi, is this still available?"),
}));

global.fetch = jest.fn();

describe("Facebook Marketplace Scraper API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/scraper/facebook", () => {
    it("should return platform configuration", async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.platform).toBe("facebook");
      expect(data.status).toBe("ready");
      expect(data.supportedCategories).toBeDefined();
      expect(Array.isArray(data.supportedCategories)).toBe(true);
      expect(data.authRequired).toBe(true);
    });
  });

  describe("POST /api/scraper/facebook", () => {
    const mockUserId = "test-user-123";
    const mockAccessToken = "mock-fb-token-123";
    const mockScraperJobId = "job-123";

    beforeEach(() => {
      (getAuthUserId as jest.Mock).mockResolvedValue(mockUserId);
      (prisma.scraperJob.create as jest.Mock).mockResolvedValue({
        id: mockScraperJobId,
        userId: mockUserId,
        platform: "FACEBOOK_MARKETPLACE",
        status: "RUNNING",
      });
      (prisma.scraperJob.update as jest.Mock).mockResolvedValue({
        id: mockScraperJobId,
        status: "COMPLETED",
      });
    });

    it("should require keywords", async () => {
      const request = new NextRequest("http://localhost/api/scraper/facebook", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("keywords");
    });

    it("should require Facebook access token", async () => {
      (prisma.facebookToken.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/scraper/facebook", {
        method: "POST",
        body: JSON.stringify({ keywords: "iPhone" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("access token");
    });

    it("should successfully scrape listings with access token in body", async () => {
      const mockFacebookResponse = {
        data: [
          {
            id: "fb-123",
            name: "iPhone 12",
            description: "Like new condition",
            price: "300",
            currency: "USD",
            condition: "used",
            location: { city: "Seattle", state: "WA" },
            images: [{ url: "https://example.com/image1.jpg" }],
            marketplace_listing_url: "https://facebook.com/marketplace/item/fb-123",
            created_time: "2024-01-01T12:00:00Z",
            seller: { id: "seller-1", name: "John Doe" },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFacebookResponse,
      });

      (prisma.listing.upsert as jest.Mock).mockResolvedValue({
        id: "listing-1",
        externalId: "fb-123",
        platform: "FACEBOOK_MARKETPLACE",
        title: "iPhone 12",
        status: "OPPORTUNITY",
      });

      const request = new NextRequest("http://localhost/api/scraper/facebook", {
        method: "POST",
        body: JSON.stringify({
          keywords: "iPhone",
          accessToken: mockAccessToken,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.platform).toBe("FACEBOOK_MARKETPLACE");
      expect(data.listingsSaved).toBe(1);
      expect(data.listings).toHaveLength(1);

      // Verify scraper job was created and updated
      expect(prisma.scraperJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            platform: "FACEBOOK_MARKETPLACE",
            status: "RUNNING",
          }),
        })
      );

      expect(prisma.scraperJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockScraperJobId },
          data: expect.objectContaining({
            status: "COMPLETED",
            listingsFound: 1,
          }),
        })
      );
    });

    it("should use stored Facebook token when not provided", async () => {
      const mockStoredToken = {
        userId: mockUserId,
        accessToken: mockAccessToken,
        expiresAt: new Date(Date.now() + 86400000), // Expires in 24 hours
      };

      (prisma.facebookToken.findUnique as jest.Mock).mockResolvedValue(
        mockStoredToken
      );

      const mockFacebookResponse = {
        data: [
          {
            id: "fb-456",
            name: "MacBook Pro",
            price: "1000",
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFacebookResponse,
      });

      (prisma.listing.upsert as jest.Mock).mockResolvedValue({
        id: "listing-2",
        externalId: "fb-456",
        platform: "FACEBOOK_MARKETPLACE",
        title: "MacBook Pro",
        status: "NEW",
      });

      const request = new NextRequest("http://localhost/api/scraper/facebook", {
        method: "POST",
        body: JSON.stringify({ keywords: "MacBook" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.facebookToken.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it("should handle Facebook API errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      const request = new NextRequest("http://localhost/api/scraper/facebook", {
        method: "POST",
        body: JSON.stringify({
          keywords: "test",
          accessToken: mockAccessToken,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Failed to scrape");

      // Verify scraper job was marked as failed
      expect(prisma.scraperJob.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockScraperJobId },
          data: expect.objectContaining({
            status: "FAILED",
            errorMessage: expect.any(String),
          }),
        })
      );
    });

    it("should apply price filters", async () => {
      const mockFacebookResponse = { data: [] };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFacebookResponse,
      });

      (prisma.listing.upsert as jest.Mock).mockResolvedValue({});

      const request = new NextRequest("http://localhost/api/scraper/facebook", {
        method: "POST",
        body: JSON.stringify({
          keywords: "iPhone",
          minPrice: 100,
          maxPrice: 500,
          accessToken: mockAccessToken,
        }),
      });

      await POST(request);

      // Verify fetch was called with correct URL including filters
      expect(global.fetch).toHaveBeenCalled();
      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain("min_price%3A100"); // URL encoded
      expect(fetchUrl).toContain("max_price%3A500"); // URL encoded
    });

    it("should normalize listings to Listing model", async () => {
      const mockFacebookResponse = {
        data: [
          {
            id: "fb-789",
            name: "Test Item",
            description: "Test description",
            price: "200",
            condition: "used",
            location: { city: "Portland", state: "OR", zip: "97201" },
            images: [
              { url: "https://example.com/img1.jpg" },
              { url: "https://example.com/img2.jpg" },
            ],
            created_time: "2024-01-15T10:30:00Z",
            seller: { id: "seller-2", name: "Jane Smith" },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockFacebookResponse,
      });

      (prisma.listing.upsert as jest.Mock).mockResolvedValue({
        id: "listing-3",
        externalId: "fb-789",
        platform: "FACEBOOK_MARKETPLACE",
      });

      const request = new NextRequest("http://localhost/api/scraper/facebook", {
        method: "POST",
        body: JSON.stringify({
          keywords: "test",
          accessToken: mockAccessToken,
        }),
      });

      await POST(request);

      // Verify listing was saved with correct data
      expect(prisma.listing.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            platform_externalId_userId: expect.objectContaining({
              platform: "FACEBOOK_MARKETPLACE",
              externalId: "fb-789",
            }),
          }),
          create: expect.objectContaining({
            platform: "FACEBOOK_MARKETPLACE",
            externalId: "fb-789",
            title: "Test Item",
            description: "Test description",
            askingPrice: 200,
            condition: "used",
            location: "Portland, OR, 97201",
            sellerName: "Jane Smith",
          }),
        })
      );
    });
  });
});

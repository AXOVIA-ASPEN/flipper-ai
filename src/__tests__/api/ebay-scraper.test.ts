import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/scraper/ebay/route";

const mockListingUpsert = jest.fn();
const mockPriceHistoryCreateMany = jest.fn();
const mockJobCreate = jest.fn();
const mockJobUpdate = jest.fn();

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    listing: {
      upsert: (...args: unknown[]) => mockListingUpsert(...args),
    },
    priceHistory: {
      createMany: (...args: unknown[]) => mockPriceHistoryCreateMany(...args),
    },
    scraperJob: {
      create: (...args: unknown[]) => mockJobCreate(...args),
      update: (...args: unknown[]) => mockJobUpdate(...args),
    },
  },
}));

function createRequest(body: Record<string, unknown>) {
  return new NextRequest(new URL("http://localhost/api/scraper/ebay"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("eBay Scraper API", () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.EBAY_OAUTH_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EBAY_OAUTH_TOKEN = "test-token";
    (global.fetch as unknown) = jest.fn();

    mockJobCreate.mockResolvedValue({ id: "job-1" });
    mockJobUpdate.mockResolvedValue({ id: "job-1" });
    mockListingUpsert.mockResolvedValue({
      id: "listing-1",
      status: "OPPORTUNITY",
    });
    mockPriceHistoryCreateMany.mockResolvedValue({ count: 1 });
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.EBAY_OAUTH_TOKEN = originalToken;
  });

  it("should describe supported metadata via GET", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.platform).toBe("ebay");
    expect(Array.isArray(data.supportedCategories)).toBe(true);
    expect(Array.isArray(data.supportedConditions)).toBe(true);
  });

  it("should require keywords in POST body", async () => {
    const response = await POST(createRequest({ keywords: "" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("keywords");
  });

  it("should return 500 when EBAY_OAUTH_TOKEN is missing", async () => {
    process.env.EBAY_OAUTH_TOKEN = "";

    const response = await POST(createRequest({ keywords: "iphone" }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("EBAY_OAUTH_TOKEN");
  });

  it("should scrape listings and store price history", async () => {
    const mockFetch = global.fetch as jest.Mock;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          itemSummaries: [
            {
              itemId: "ebay-1",
              title: "Apple iPhone 14 Pro",
              price: { value: "850", currency: "USD" },
              itemWebUrl: "https://ebay.com/itm/ebay-1",
              buyingOptions: ["FIXED_PRICE"],
              condition: "USED",
              image: { imageUrl: "https://img.example/iphone.jpg" },
              seller: { username: "trusted_seller", feedbackPercentage: "99.8", feedbackScore: 2021 },
              itemLocation: { city: "Austin", country: "US" },
              categories: [{ categoryId: "9355", categoryName: "Cell Phones" }],
              itemCreationDate: "2024-02-01T10:00:00.000Z",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          itemSummaries: [
            {
              itemId: "sold-1",
              title: "Apple iPhone 13 Pro Max",
              price: { value: "920", currency: "USD" },
              condition: "USED",
              itemEndDate: "2024-01-28T12:00:00.000Z",
            },
          ],
        }),
      });

    const response = await POST(
      createRequest({
        keywords: "iPhone",
        categoryId: "9355",
        condition: "USED",
        minPrice: 500,
        maxPrice: 1200,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.listingsSaved).toBe(1);
    expect(mockListingUpsert).toHaveBeenCalledTimes(1);
    expect(mockPriceHistoryCreateMany).toHaveBeenCalledTimes(1);
    expect(mockJobCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ platform: "EBAY" }),
      })
    );
    expect(mockJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
  });
});

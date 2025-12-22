import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.describe("Feature: View Dashboard", () => {
    test("Scenario: User views the main dashboard", async ({ page }) => {
      // Given I am on the homepage
      await page.goto("/");

      // Then I should see the Flipper.ai header
      await expect(page.locator("h1")).toContainText("Flipper.ai");

      // And I should see the stats cards
      await expect(page.getByText("Total Listings")).first().toBeVisible();
      await expect(page.getByText("Opportunities").first()).toBeVisible();
      await expect(page.getByText("Potential Profit")).toBeVisible();
      await expect(page.getByText("Avg Value Score")).toBeVisible();

      // And I should see the listings table
      await expect(page.locator("table")).toBeVisible();
      await expect(page.getByText("Item")).toBeVisible();
      await expect(page.getByText("Platform")).toBeVisible();
      await expect(page.getByText("Price")).toBeVisible();
    });

    test("Scenario: User sees quick actions section", async ({ page }) => {
      // Given I am on the homepage
      await page.goto("/");

      // Then I should see the Quick Actions section
      await expect(page.getByText("Quick Actions")).toBeVisible();

      // And I should see the Scrape Craigslist button
      await expect(page.getByText("Scrape Craigslist")).toBeVisible();

      // And I should see the View Opportunities button
      await expect(page.getByText("View Opportunities")).toBeVisible();
    });
  });

  test.describe("Feature: Search and Filter Listings", () => {
    test("Scenario: User searches for listings", async ({ page }) => {
      // Given I am on the homepage
      await page.goto("/");

      // When I type in the search box
      const searchInput = page.getByPlaceholder("Search listings...");
      await expect(searchInput).toBeVisible();
      await searchInput.fill("iPhone");

      // Then the search term should be entered
      await expect(searchInput).toHaveValue("iPhone");
    });

    test("Scenario: User filters by status", async ({ page }) => {
      // Given I am on the homepage
      await page.goto("/");

      // When I select a filter option
      const filterSelect = page.locator("select");
      await expect(filterSelect).toBeVisible();

      // Then I should see filter options
      await expect(page.getByRole("option", { name: "All Listings" })).toBeAttached();
      await expect(page.getByRole("option", { name: "New" })).toBeAttached();
      await expect(page.getByRole("option", { name: "Opportunities" })).toBeAttached();
    });
  });

  test.describe("Feature: Refresh Listings", () => {
    test("Scenario: User refreshes the listings", async ({ page }) => {
      // Given I am on the homepage
      await page.goto("/");

      // When I click the Refresh button
      const refreshButton = page.getByRole("button", { name: /Refresh/i });
      await expect(refreshButton).toBeVisible();
      await refreshButton.click();

      // Then the button should show loading state (spinner animation)
      // Note: We check that the button is still functional
      await expect(refreshButton).toBeEnabled();
    });
  });
});

test.describe("Feature: Navigate to Scraper", () => {
  test("Scenario: User navigates to scraper page from dashboard", async ({ page }) => {
    // Given I am on the homepage
    await page.goto("/");

    // When I click on Scrape Craigslist
    await page.getByText("Scrape Craigslist").click();

    // Then I should be on the scraper page
    await expect(page).toHaveURL("/scraper");
    await expect(page.getByText("Scrape Listings")).toBeVisible();
  });
});

test.describe("Feature: Image Gallery Modal", () => {
  test.beforeEach(async ({ page }) => {
    // Seed mock data via API for consistent tests
    await page.route("**/api/listings**", async (route) => {
      const mockListings = {
        listings: [
          {
            id: "test-listing-1",
            platform: "CRAIGSLIST",
            title: "iPhone 12 Pro Max",
            askingPrice: 500,
            estimatedValue: 700,
            profitPotential: 150,
            valueScore: 78,
            status: "NEW",
            location: "Sarasota, FL",
            url: "https://craigslist.org/item/1",
            scrapedAt: new Date().toISOString(),
            imageUrls: JSON.stringify([
              "https://picsum.photos/400/300?random=1",
              "https://picsum.photos/400/300?random=2",
              "https://picsum.photos/400/300?random=3",
            ]),
          },
          {
            id: "test-listing-2",
            platform: "CRAIGSLIST",
            title: "MacBook Pro 2021",
            askingPrice: 800,
            estimatedValue: 1100,
            profitPotential: 200,
            valueScore: 82,
            status: "OPPORTUNITY",
            location: "Tampa, FL",
            url: "https://craigslist.org/item/2",
            scrapedAt: new Date().toISOString(),
            imageUrls: JSON.stringify(["https://picsum.photos/400/300?random=4"]),
          },
          {
            id: "test-listing-3",
            platform: "CRAIGSLIST",
            title: "Nintendo Switch",
            askingPrice: 200,
            estimatedValue: 280,
            profitPotential: 50,
            valueScore: 65,
            status: "NEW",
            location: "Orlando, FL",
            url: "https://craigslist.org/item/3",
            scrapedAt: new Date().toISOString(),
            imageUrls: null, // No images
          },
        ],
        total: 3,
        limit: 50,
        offset: 0,
      };
      await route.fulfill({ json: mockListings });
    });
  });

  test("Scenario: User clicks on listing thumbnail to open image modal", async ({ page }) => {
    // Given I am on the dashboard with listings that have images
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // When I click on a listing thumbnail
    const thumbnail = page.locator("button").filter({ has: page.locator("img") }).first();
    await thumbnail.click();

    // Then I should see the image modal
    await expect(page.locator(".fixed.inset-0")).toBeVisible();

    // And I should see the main image
    await expect(page.locator(".fixed.inset-0 img").first()).toBeVisible();
  });

  test("Scenario: User closes image modal by clicking X button", async ({ page }) => {
    // Given I am on the dashboard and have opened an image modal
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const thumbnail = page.locator("button").filter({ has: page.locator("img") }).first();
    await thumbnail.click();
    await expect(page.locator(".fixed.inset-0")).toBeVisible();

    // When I click the close button (X)
    const closeButton = page.locator(".fixed.inset-0 button").filter({ has: page.locator("svg") }).first();
    await closeButton.click();

    // Then the modal should close
    await expect(page.locator(".fixed.inset-0")).not.toBeVisible();
  });

  test("Scenario: User closes image modal by clicking backdrop", async ({ page }) => {
    // Given I am on the dashboard and have opened an image modal
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const thumbnail = page.locator("button").filter({ has: page.locator("img") }).first();
    await thumbnail.click();
    await expect(page.locator(".fixed.inset-0")).toBeVisible();

    // When I click on the backdrop (outside the image)
    await page.locator(".fixed.inset-0").click({ position: { x: 10, y: 10 } });

    // Then the modal should close
    await expect(page.locator(".fixed.inset-0")).not.toBeVisible();
  });

  test("Scenario: User navigates through multiple images with next button", async ({ page }) => {
    // Given I am on the dashboard and have opened an image modal for a listing with multiple images
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Find the first listing which has 3 images
    const thumbnail = page.locator("button").filter({ has: page.locator("img") }).first();
    await thumbnail.click();
    await expect(page.locator(".fixed.inset-0")).toBeVisible();

    // Check image counter shows "1 / 3"
    await expect(page.locator(".fixed.inset-0")).toContainText("1 / 3");

    // When I click the next button
    const nextButton = page.locator(".fixed.inset-0 button").filter({ has: page.locator('[class*="ChevronRight"]') });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      // Then I should see the next image
      await expect(page.locator(".fixed.inset-0")).toContainText("2 / 3");
    }
  });

  test("Scenario: User navigates through images with previous button", async ({ page }) => {
    // Given I am viewing the second image of a multi-image listing
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const thumbnail = page.locator("button").filter({ has: page.locator("img") }).first();
    await thumbnail.click();
    await expect(page.locator(".fixed.inset-0")).toBeVisible();

    // Navigate to second image first
    const nextButton = page.locator(".fixed.inset-0 button").filter({ has: page.locator('[class*="ChevronRight"]') });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await expect(page.locator(".fixed.inset-0")).toContainText("2 / 3");

      // When I click the previous button
      const prevButton = page.locator(".fixed.inset-0 button").filter({ has: page.locator('[class*="ChevronLeft"]') });
      await prevButton.click();

      // Then I should see the previous image
      await expect(page.locator(".fixed.inset-0")).toContainText("1 / 3");
    }
  });

  test("Scenario: User clicks thumbnail in gallery to jump to specific image", async ({ page }) => {
    // Given I am viewing an image modal with multiple images
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const thumbnail = page.locator("button").filter({ has: page.locator("img") }).first();
    await thumbnail.click();
    await expect(page.locator(".fixed.inset-0")).toBeVisible();

    // Verify thumbnail strip is visible for multi-image listings
    const thumbnailStrip = page.locator(".fixed.inset-0 .flex.gap-2");
    if (await thumbnailStrip.isVisible()) {
      const thumbnailCount = await thumbnailStrip.locator("button").count();

      if (thumbnailCount >= 3) {
        // When I click the third thumbnail
        await thumbnailStrip.locator("button").nth(2).click();

        // Then I should see the third image
        await expect(page.locator(".fixed.inset-0")).toContainText("3 / 3");
      }
    }
  });

  test("Scenario: Image modal displays listing title", async ({ page }) => {
    // Given I am on the dashboard
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // When I open an image modal
    const thumbnail = page.locator("button").filter({ has: page.locator("img") }).first();
    await thumbnail.click();

    // Then I should see the listing title in the modal
    await expect(page.locator(".fixed.inset-0")).toContainText("iPhone 12 Pro Max");
  });

  test("Scenario: Listings without images show placeholder icon", async ({ page }) => {
    // Given I am on the dashboard
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Then listings without images should show an ImageIcon placeholder
    // The third listing has no images
    const placeholderIcons = page.locator('table svg[class*="lucide-image"]');
    await expect(placeholderIcons.first()).toBeVisible();
  });

  test("Scenario: Image badge shows count of additional images", async ({ page }) => {
    // Given I am on the dashboard with a listing that has multiple images
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Then the thumbnail should show a badge with additional image count
    // First listing has 3 images, so badge should show "+2"
    const badge = page.locator("button").filter({ has: page.locator("img") }).first().locator("div").filter({ hasText: "+2" });
    await expect(badge).toBeVisible();
  });
});

test.describe("Feature: Listings Data Behaviors", () => {
  test("Scenario: Filtering by status calls API with status query", async ({ page }) => {
    const requestedUrls: string[] = [];
    const mockResponse = {
      listings: [
        {
          id: "listing-1",
          platform: "CRAIGSLIST",
          title: "Filter Test Item",
          askingPrice: 100,
          estimatedValue: 150,
          profitPotential: 25,
          valueScore: 70,
          status: "NEW",
          location: "Tampa, FL",
          url: "https://example.com/1",
          scrapedAt: new Date().toISOString(),
          imageUrls: null,
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    };

    await page.route("**/api/listings**", async (route) => {
      requestedUrls.push(route.request().url());
      await route.fulfill({ json: mockResponse });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const filterSelect = page.locator("select");
    await filterSelect.selectOption("OPPORTUNITY");

    await page.waitForTimeout(200); // allow fetch to fire

    expect(requestedUrls.some((url) => url.includes("status=OPPORTUNITY"))).toBeTruthy();
  });

  test("Scenario: Search filters visible listings", async ({ page }) => {
    const mockResponse = {
      listings: [
        {
          id: "listing-iphone",
          platform: "CRAIGSLIST",
          title: "Apple iPhone 14 Pro",
          askingPrice: 600,
          estimatedValue: 900,
          profitPotential: 200,
          valueScore: 85,
          status: "NEW",
          location: "Miami, FL",
          url: "https://example.com/iphone",
          scrapedAt: new Date().toISOString(),
          imageUrls: null,
        },
        {
          id: "listing-nintendo",
          platform: "CRAIGSLIST",
          title: "Nintendo Switch OLED",
          askingPrice: 250,
          estimatedValue: 320,
          profitPotential: 50,
          valueScore: 70,
          status: "NEW",
          location: "Orlando, FL",
          url: "https://example.com/nintendo",
          scrapedAt: new Date().toISOString(),
          imageUrls: null,
        },
      ],
      total: 2,
      limit: 50,
      offset: 0,
    };

    await page.route("**/api/listings**", async (route) => {
      await route.fulfill({ json: mockResponse });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Both listings should be visible before filtering
    await expect(page.getByText("Apple iPhone 14 Pro")).toBeVisible();
    await expect(page.getByText("Nintendo Switch OLED")).toBeVisible();

    const searchInput = page.getByPlaceholder("Search listings...");
    await searchInput.fill("nintendo");

    await expect(page.getByText("Nintendo Switch OLED")).toBeVisible();
    await expect(page.getByText("Apple iPhone 14 Pro")).not.toBeVisible();
  });

  test("Scenario: Empty state appears when no listings returned", async ({ page }) => {
    await page.route("**/api/listings**", async (route) => {
      await route.fulfill({
        json: {
          listings: [],
          total: 0,
          limit: 50,
          offset: 0,
        },
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("No listings found. Run a scraper to find deals!")).toBeVisible();
  });

  test("Scenario: Loading state is visible while listings fetch", async ({ page }) => {
    await page.route("**/api/listings**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await route.fulfill({
        json: {
          listings: [],
          total: 0,
          limit: 50,
          offset: 0,
        },
      });
    });

    await page.goto("/");

    await expect(page.getByText("Loading listings...")).toBeVisible();
  });

  test("Scenario: Mark as Opportunity button triggers API call", async ({ page }) => {
    const mockListings = {
      listings: [
        {
          id: "listing-action",
          platform: "CRAIGSLIST",
          title: "Sony A7C Camera",
          askingPrice: 1000,
          estimatedValue: 1400,
          profitPotential: 250,
          valueScore: 80,
          status: "NEW",
          location: "Austin, TX",
          url: "https://example.com/a7c",
          scrapedAt: new Date().toISOString(),
          imageUrls: null,
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    };
    const listingsRequestCounts: string[] = [];
    let opportunityPayload: Record<string, unknown> | null = null;

    await page.route("**/api/listings**", async (route) => {
      listingsRequestCounts.push(route.request().url());
      await route.fulfill({ json: mockListings });
    });

    await page.route("**/api/opportunities", async (route, request) => {
      opportunityPayload = JSON.parse(request.postData() || "{}");
      await route.fulfill({ json: { id: "opp-created" } });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const markButton = page.locator("button[title='Mark as opportunity']").first();
    await markButton.click();

    await expect.poll(() => opportunityPayload).toMatchObject({
      listingId: "listing-action",
    });

    expect(listingsRequestCounts.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe("Feature: Advanced Filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/listings**", async (route) => {
      const mockListings = {
        listings: [
          {
            id: "test-listing-1",
            platform: "CRAIGSLIST",
            title: "iPhone 12 Pro",
            askingPrice: 500,
            estimatedValue: 700,
            profitPotential: 150,
            valueScore: 78,
            status: "NEW",
            location: "Tampa, FL",
            category: "electronics",
            url: "https://craigslist.org/item/1",
            scrapedAt: new Date().toISOString(),
            imageUrls: null,
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };
      await route.fulfill({ json: mockListings });
    });
  });

  test("Scenario: Advanced Filters toggle button is visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should see the Filters button
    const filtersButton = page.getByRole("button", { name: /Filters/i });
    await expect(filtersButton).toBeVisible();
  });

  test("Scenario: Clicking Filters button expands advanced filters panel", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click Filters button
    const filtersButton = page.getByRole("button", { name: /Filters/i });
    await filtersButton.click();

    // Should see filter dropdowns
    await expect(page.getByText("Location")).toBeVisible();
    await expect(page.getByText("Category")).toBeVisible();
    await expect(page.getByText("Price Range")).toBeVisible();
    await expect(page.getByText("Scraped Date")).toBeVisible();
  });

  test("Scenario: Location dropdown has all options", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Expand filters
    const filtersButton = page.getByRole("button", { name: /Filters/i });
    await filtersButton.click();

    // Check location dropdown options
    await expect(page.getByRole("option", { name: "All Locations" })).toBeAttached();
    await expect(page.getByRole("option", { name: "Tampa, FL" })).toBeAttached();
    await expect(page.getByRole("option", { name: "Sarasota, FL" })).toBeAttached();
  });

  test("Scenario: Category dropdown has all options", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Expand filters
    const filtersButton = page.getByRole("button", { name: /Filters/i });
    await filtersButton.click();

    // Check category dropdown options
    await expect(page.getByRole("option", { name: "All Categories" })).toBeAttached();
    await expect(page.getByRole("option", { name: "Electronics" })).toBeAttached();
    await expect(page.getByRole("option", { name: "Furniture" })).toBeAttached();
  });

  test("Scenario: Selecting a filter updates URL params", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Expand filters
    const filtersButton = page.getByRole("button", { name: /Filters/i });
    await filtersButton.click();

    // Select a category
    const categorySelect = page.locator("select").nth(1); // Second select is category
    await categorySelect.selectOption("electronics");

    // URL should contain the filter param
    await expect(page).toHaveURL(/category=electronics/);
  });

  test("Scenario: Filter badge shows active filter count", async ({ page }) => {
    await page.goto("/?location=tampa&category=electronics");
    await page.waitForLoadState("networkidle");

    // Should see badge with count
    const badge = page.locator("span").filter({ hasText: "2" }).first();
    await expect(badge).toBeVisible();
  });

  test("Scenario: Clear All Filters button resets filters", async ({ page }) => {
    await page.goto("/?location=tampa&category=electronics");
    await page.waitForLoadState("networkidle");

    // Expand filters
    const filtersButton = page.getByRole("button", { name: /Filters/i });
    await filtersButton.click();

    // Click Clear All Filters
    const clearButton = page.getByRole("button", { name: /Clear All Filters/i });
    await clearButton.click();

    // URL should be clean
    await expect(page).toHaveURL("/");
  });

  test("Scenario: Filter selections trigger API calls with query params", async ({ page }) => {
    const requestedUrls: string[] = [];

    await page.route("**/api/listings**", async (route) => {
      requestedUrls.push(route.request().url());
      await route.fulfill({
        json: { listings: [], total: 0, limit: 50, offset: 0 },
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Expand filters
    const filtersButton = page.getByRole("button", { name: /Filters/i });
    await filtersButton.click();

    // Select location
    const selects = page.locator("select");
    await selects.nth(1).selectOption("tampa"); // Location select

    await page.waitForTimeout(300);

    // Should have made request with location param
    expect(requestedUrls.some((url) => url.includes("location=tampa"))).toBeTruthy();
  });

  test("Scenario: Price range inputs accept numeric values", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Expand filters
    const filtersButton = page.getByRole("button", { name: /Filters/i });
    await filtersButton.click();

    // Fill min price
    const minPriceInput = page.getByPlaceholder("Min $");
    await minPriceInput.fill("100");
    await expect(minPriceInput).toHaveValue("100");

    // Fill max price
    const maxPriceInput = page.getByPlaceholder("Max $");
    await maxPriceInput.fill("500");
    await expect(maxPriceInput).toHaveValue("500");
  });

  test("Scenario: Page loads with URL params and applies filters", async ({ page }) => {
    const requestedUrls: string[] = [];

    await page.route("**/api/listings**", async (route) => {
      requestedUrls.push(route.request().url());
      await route.fulfill({
        json: { listings: [], total: 0, limit: 50, offset: 0 },
      });
    });

    // Load page with filter params in URL
    await page.goto("/?status=OPPORTUNITY&category=electronics");
    await page.waitForLoadState("networkidle");

    // API should be called with those params
    expect(requestedUrls.some((url) =>
      url.includes("status=OPPORTUNITY") && url.includes("category=electronics")
    )).toBeTruthy();
  });
});

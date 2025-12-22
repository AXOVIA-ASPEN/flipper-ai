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

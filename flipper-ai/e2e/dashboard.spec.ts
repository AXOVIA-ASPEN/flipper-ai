import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.describe("Feature: View Dashboard", () => {
    test("Scenario: User views the main dashboard", async ({ page }) => {
      // Given I am on the homepage
      await page.goto("/");

      // Then I should see the Flipper.ai header
      await expect(page.locator("h1")).toContainText("Flipper.ai");

      // And I should see the stats cards
      await expect(page.getByText("Total Listings")).toBeVisible();
      await expect(page.getByText("Opportunities")).toBeVisible();
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

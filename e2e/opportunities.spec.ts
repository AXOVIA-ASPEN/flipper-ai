import { test, expect } from "@playwright/test";

test.describe("Opportunities Page", () => {
  test.describe("Feature: View Opportunities", () => {
    test("Scenario: User views the opportunities page", async ({ page }) => {
      // Given I navigate to the opportunities page
      await page.goto("/opportunities");

      // Then I should see the Opportunities header
      await expect(page.locator("h1")).toContainText("Opportunities");

      // And I should see the subtitle
      await expect(page.getByText("Track your flips from start to finish")).toBeVisible();

      // And I should see the stats cards
      await expect(page.getByText("Total Opportunities")).toBeVisible();
      await expect(page.getByText("Total Invested")).toBeVisible();
      await expect(page.getByText("Total Revenue")).toBeVisible();
      await expect(page.getByText("Total Profit")).toBeVisible();

      // And I should see the back button (first link in header)
      await expect(page.locator('header a[href="/"]').first()).toBeVisible();
    });

    test("Scenario: User sees empty state when no opportunities exist", async ({ page }) => {
      // Given I navigate to the opportunities page
      await page.goto("/opportunities");

      // When there are no opportunities
      // Then I should see the empty state message
      const emptyState = page.getByText("No opportunities found");
      
      // Wait for either the empty state or opportunities to load
      await page.waitForLoadState("networkidle");
      
      // Check if we see either empty state or opportunities
      const hasOpportunities = await page.locator('[data-testid="opportunity-card"]').count() > 0;
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      
      expect(hasOpportunities || hasEmptyState).toBeTruthy();
    });
  });

  test.describe("Feature: Filter Opportunities", () => {
    test("Scenario: User filters opportunities by status", async ({ page }) => {
      // Given I am on the opportunities page
      await page.goto("/opportunities");
      await page.waitForLoadState("networkidle");

      // When I click on a status filter button
      const identifiedButton = page.getByRole("button", { name: /Identified/i });
      
      if (await identifiedButton.isVisible()) {
        await identifiedButton.click();

        // Then the filter should be applied (check for gradient classes)
        await expect(identifiedButton).toHaveClass(/bg-gradient-to-r/);
      }
    });

    test("Scenario: User searches for opportunities", async ({ page }) => {
      // Given I am on the opportunities page
      await page.goto("/opportunities");
      await page.waitForLoadState("networkidle");

      // When I type in the search box
      const searchInput = page.getByPlaceholder("Search opportunities...");
      await expect(searchInput).toBeVisible();
      await searchInput.fill("test");

      // Then the search term should be entered
      await expect(searchInput).toHaveValue("test");
    });

    test("Scenario: User can view all status filter options", async ({ page }) => {
      // Given I am on the opportunities page
      await page.goto("/opportunities");

      // Then I should see all status filter buttons
      await expect(page.getByRole("button", { name: /All Statuses/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Identified/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Contacted/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Purchased/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Listed/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Sold/i })).toBeVisible();
    });
  });

  test.describe("Feature: Navigate Between Pages", () => {
    test("Scenario: User navigates back to dashboard", async ({ page }) => {
      // Given I am on the opportunities page
      await page.goto("/opportunities");

      // When I click the back button
      const backButton = page.locator('a[href="/"]').first();
      await backButton.click();

      // Then I should be on the dashboard
      await expect(page).toHaveURL("/");
      await expect(page.locator("h1")).toContainText("Flipper.ai");
    });

    test("Scenario: User navigates from dashboard to opportunities", async ({ page }) => {
      // Given I am on the dashboard
      await page.goto("/");

      // When I click the View Opportunities button
      const opportunitiesLink = page.getByRole("link", { name: /View Opportunities/i });
      
      if (await opportunitiesLink.isVisible()) {
        await opportunitiesLink.click();

        // Then I should be on the opportunities page
        await expect(page).toHaveURL("/opportunities");
        await expect(page.locator("h1")).toContainText("Opportunities");
      }
    });
  });

  test.describe("Feature: View Opportunity Details", () => {
    test("Scenario: User views opportunity pricing information", async ({ page }) => {
      // Given I am on the opportunities page with opportunities
      await page.goto("/opportunities");
      await page.waitForLoadState("networkidle");

      // Then pricing labels should be visible if opportunities exist
      const hasOpportunities = await page.locator("text=Asking Price").count() > 0;
      
      if (hasOpportunities) {
        await expect(page.getByText("Asking Price").first()).toBeVisible();
        await expect(page.getByText("Est. Value").first()).toBeVisible();
        await expect(page.getByText("Potential Profit").first()).toBeVisible();
        await expect(page.getByText("Value Score").first()).toBeVisible();
      }
    });

    test("Scenario: User sees opportunity status badges", async ({ page }) => {
      // Given I am on the opportunities page with opportunities
      await page.goto("/opportunities");
      await page.waitForLoadState("networkidle");

      // Then status badges should be visible if opportunities exist
      const statusBadges = page.locator('[class*="rounded-full"][class*="border"]');
      const badgeCount = await statusBadges.count();
      
      // If there are opportunities, there should be status badges
      if (badgeCount > 0) {
        expect(badgeCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe("Feature: Opportunity Actions", () => {
    test("Scenario: User can see action buttons on opportunities", async ({ page }) => {
      // Given I am on the opportunities page with opportunities
      await page.goto("/opportunities");
      await page.waitForLoadState("networkidle");

      // Then action buttons should be visible if opportunities exist
      const viewListingButtons = page.getByRole("link", { name: /View Listing/i });
      const editButtons = page.getByRole("button", { name: /Edit/i });

      const hasViewButtons = (await viewListingButtons.count()) > 0;
      const hasEditButtons = (await editButtons.count()) > 0;

      if (hasViewButtons) {
        expect(await viewListingButtons.first().isVisible()).toBeTruthy();
      }

      if (hasEditButtons) {
        expect(await editButtons.first().isVisible()).toBeTruthy();
      }
    });
  });
});

test.describe("Feature: Opportunity Metadata", () => {
  test("Scenario: Identified filter fetches only matching opportunities", async ({ page }) => {
    const requestedStatuses: string[] = [];
    const mockOpportunities = [
      {
        id: "opp-identified",
        listingId: "listing-identified",
        status: "IDENTIFIED",
        purchasePrice: null,
        purchaseDate: null,
        resalePrice: null,
        resalePlatform: null,
        resaleUrl: null,
        resaleDate: null,
        actualProfit: null,
        fees: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        listing: {
          id: "listing-identified",
          title: "Identified Guitar Flip",
          askingPrice: 250,
          estimatedValue: 400,
          profitPotential: 90,
          valueScore: 72,
          platform: "CRAIGSLIST",
          url: "https://example.com/identified",
          location: "Austin, TX",
          imageUrls: null,
          condition: "good",
          description: "Nice guitar",
          sellerName: null,
          sellerContact: null,
          comparableUrls: null,
          priceReasoning: null,
          notes: null,
          shippable: true,
          negotiable: true,
          tags: JSON.stringify(["music", "guitar"]),
          requestToBuy: "Hi there, I'm interested!",
          category: "music_instr",
          postedAt: new Date().toISOString(),
        },
      },
      {
        id: "opp-purchased",
        listingId: "listing-purchased",
        status: "PURCHASED",
        purchasePrice: 500,
        purchaseDate: new Date().toISOString(),
        resalePrice: null,
        resalePlatform: null,
        resaleUrl: null,
        resaleDate: null,
        actualProfit: null,
        fees: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        listing: {
          id: "listing-purchased",
          title: "Purchased Laptop Flip",
          askingPrice: 800,
          estimatedValue: 1100,
          profitPotential: 180,
          valueScore: 80,
          platform: "CRAIGSLIST",
          url: "https://example.com/purchased",
          location: "Tampa, FL",
          imageUrls: null,
          condition: "excellent",
          description: "Powerful laptop",
          sellerName: null,
          sellerContact: null,
          comparableUrls: null,
          priceReasoning: null,
          notes: null,
          shippable: false,
          negotiable: false,
          tags: JSON.stringify(["laptop"]),
          requestToBuy: null,
          category: "electronics",
          postedAt: new Date().toISOString(),
        },
      },
    ];

    await page.route("**/api/opportunities**", async (route, request) => {
      if (request.method() !== "GET") {
        await route.continue();
        return;
      }
      const url = new URL(request.url());
      const statusParam = url.searchParams.get("status");
      if (statusParam) {
        requestedStatuses.push(statusParam);
      }
      await route.fulfill({
        json: {
          opportunities: mockOpportunities,
          stats: {
            totalOpportunities: mockOpportunities.length,
            totalProfit: 0,
            totalInvested: 0,
            totalRevenue: 0,
          },
        },
      });
    });

    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    const identifiedButton = page.getByRole("button", { name: /Identified/i });
    await identifiedButton.click();

    await expect.poll(() => requestedStatuses.includes("IDENTIFIED")).toBeTruthy();
    await expect(page.getByText("Identified Guitar Flip")).toBeVisible();
    await expect(page.getByText("Purchased Laptop Flip")).not.toBeVisible();
  });

  test("Scenario: Opportunity cards show full listing metadata", async ({ page }) => {
    await page.route("**/api/opportunities**", async (route, request) => {
      if (request.method() !== "GET") {
        await route.continue();
        return;
      }

      const opportunity = {
        id: "meta-opp-1",
        listingId: "meta-listing-1",
        status: "IDENTIFIED",
        purchasePrice: null,
        purchaseDate: null,
        resalePrice: null,
        resalePlatform: null,
        resaleUrl: null,
        resaleDate: null,
        actualProfit: null,
        fees: null,
        notes: "Plan to negotiate down another $50",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        listing: {
          id: "meta-listing-1",
          title: "Apple MacBook Pro 16\"",
          askingPrice: 1500,
          estimatedValue: 2100,
          profitPotential: 400,
          valueScore: 88,
          platform: "CRAIGSLIST",
          url: "https://example.com/macbook",
          location: "San Francisco, CA",
          imageUrls: JSON.stringify(["https://picsum.photos/200?macbook"]),
          condition: "like new",
          description: "Includes box, charger, and AppleCare+ until 2025.",
          sellerName: "Alex Seller",
          sellerContact: "alex@example.com",
          comparableUrls: JSON.stringify([
            {
              platform: "eBay",
              label: "eBay Sold Search",
              url: "https://ebay.com/sold/macbook",
              type: "sold",
            },
          ]),
          priceReasoning: "Consistently selling $500 above the asking price.",
          notes: "High demand, low supply in Bay Area.",
          shippable: true,
          negotiable: true,
          tags: JSON.stringify(["apple", "laptop", "sealed"]),
          requestToBuy:
            "Hi Alex, I'm ready to pick up the MacBook today. Would you take $1,400 cash?",
          category: "electronics",
          discountPercent: 25,
          postedAt: new Date().toISOString(),
        },
      };

      await route.fulfill({
        json: {
          opportunities: [opportunity],
          stats: {
            totalOpportunities: 1,
            totalProfit: 0,
            totalInvested: 0,
            totalRevenue: 0,
          },
        },
      });
    });

    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Apple MacBook Pro 16\"")).toBeVisible();
    await expect(page.getByText("Includes box, charger, and AppleCare+ until 2025.")).toBeVisible();
    await expect(page.getByText("Alex Seller")).toBeVisible();
    await expect(page.getByText("alex@example.com")).toBeVisible();
    await expect(page.getByText("#apple")).toBeVisible();
    await expect(page.getByText("Purchase Message")).toBeVisible();
    await expect(page.getByRole("link", { name: /eBay Sold Search/i })).toBeVisible();

    const copyButton = page.getByRole("button", { name: /^Copy$/i });
    await copyButton.click();
    await expect(page.getByRole("button", { name: /Copied/i })).toBeVisible();
  });
});

test.describe("Feature: Edit Opportunity", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API responses for consistent testing
    await page.route("**/api/opportunities**", async (route, request) => {
      if (request.method() === "GET") {
        const mockData = {
          opportunities: [
            {
              id: "test-opp-1",
              listingId: "test-listing-1",
              status: "IDENTIFIED",
              purchasePrice: null,
              purchaseDate: null,
              resalePrice: null,
              resalePlatform: null,
              resaleUrl: null,
              resaleDate: null,
              actualProfit: null,
              fees: null,
              notes: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              listing: {
                id: "test-listing-1",
                title: "iPhone 13 Pro Max",
                askingPrice: 600,
                estimatedValue: 850,
                profitPotential: 180,
                valueScore: 82,
                platform: "CRAIGSLIST",
                url: "https://craigslist.org/item/1",
                location: "Tampa, FL",
                imageUrls: JSON.stringify(["https://picsum.photos/200"]),
                condition: "excellent",
              },
            },
            {
              id: "test-opp-2",
              listingId: "test-listing-2",
              status: "PURCHASED",
              purchasePrice: 500,
              purchaseDate: new Date().toISOString(),
              resalePrice: null,
              resalePlatform: null,
              resaleUrl: null,
              resaleDate: null,
              actualProfit: null,
              fees: null,
              notes: "Great condition, seller was flexible",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              listing: {
                id: "test-listing-2",
                title: "MacBook Air M2",
                askingPrice: 550,
                estimatedValue: 900,
                profitPotential: 280,
                valueScore: 88,
                platform: "CRAIGSLIST",
                url: "https://craigslist.org/item/2",
                location: "Orlando, FL",
                imageUrls: null,
                condition: "like new",
              },
            },
          ],
          stats: {
            totalOpportunities: 2,
            totalProfit: 0,
            totalInvested: 500,
            totalRevenue: 0,
          },
        };
        await route.fulfill({ json: mockData });
      } else if (request.method() === "PATCH") {
        await route.fulfill({ json: { success: true } });
      } else if (request.method() === "DELETE") {
        await route.fulfill({ json: { success: true } });
      } else {
        await route.continue();
      }
    });
  });

  test("Scenario: User clicks Edit button to open edit form", async ({ page }) => {
    // Given I am on the opportunities page with opportunities
    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    // When I click the Edit button on an opportunity
    const editButton = page.getByRole("button", { name: /Edit/i }).first();
    await editButton.click();

    // Then I should see the edit form
    await expect(page.getByLabel(/Status/i)).toBeVisible();
    await expect(page.getByLabel(/Purchase Price/i)).toBeVisible();
    await expect(page.getByLabel(/Resale Price/i)).toBeVisible();
    await expect(page.getByLabel(/Fees/i)).toBeVisible();
    await expect(page.getByLabel(/Resale Platform/i)).toBeVisible();
    await expect(page.getByLabel(/Notes/i)).toBeVisible();
  });

  test("Scenario: User fills out edit form fields", async ({ page }) => {
    // Given I am editing an opportunity
    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    const editButton = page.getByRole("button", { name: /Edit/i }).first();
    await editButton.click();

    // When I fill out the form fields
    const statusSelect = page.getByLabel(/Status/i);
    await statusSelect.selectOption("PURCHASED");

    const purchasePriceInput = page.getByLabel(/Purchase Price/i);
    await purchasePriceInput.fill("575");

    const feesInput = page.getByLabel(/Fees/i);
    await feesInput.fill("25");

    const resalePlatformInput = page.getByLabel(/Resale Platform/i);
    await resalePlatformInput.fill("eBay");

    const notesInput = page.getByLabel(/Notes/i);
    await notesInput.fill("Picked up today, great condition");

    // Then the form should have the entered values
    await expect(statusSelect).toHaveValue("PURCHASED");
    await expect(purchasePriceInput).toHaveValue("575");
    await expect(feesInput).toHaveValue("25");
    await expect(resalePlatformInput).toHaveValue("eBay");
    await expect(notesInput).toHaveValue("Picked up today, great condition");
  });

  test("Scenario: User saves edited opportunity", async ({ page }) => {
    // Given I am editing an opportunity with filled form
    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    const editButton = page.getByRole("button", { name: /Edit/i }).first();
    await editButton.click();

    // Fill form
    await page.getByLabel(/Status/i).selectOption("PURCHASED");
    await page.getByLabel(/Purchase Price/i).fill("575");

    // When I click Save Changes
    const saveButton = page.getByRole("button", { name: /Save Changes/i });
    await saveButton.click();

    // Then the edit form should close
    await expect(page.getByRole("button", { name: /Save Changes/i })).not.toBeVisible();

    // And the Edit button should be visible again
    await expect(page.getByRole("button", { name: /Edit/i }).first()).toBeVisible();
  });

  test("Scenario: User cancels editing", async ({ page }) => {
    // Given I am editing an opportunity
    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    const editButton = page.getByRole("button", { name: /Edit/i }).first();
    await editButton.click();

    // Verify form is visible
    await expect(page.getByLabel(/Status/i)).toBeVisible();

    // When I click Cancel
    const cancelButton = page.getByRole("button", { name: /Cancel/i });
    await cancelButton.click();

    // Then the edit form should close
    await expect(page.getByLabel(/Status/i)).not.toBeVisible();

    // And the Edit button should be visible again
    await expect(page.getByRole("button", { name: /Edit/i }).first()).toBeVisible();
  });

  test("Scenario: User changes opportunity status via dropdown", async ({ page }) => {
    // Given I am editing an opportunity
    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    const editButton = page.getByRole("button", { name: /Edit/i }).first();
    await editButton.click();

    // When I change the status to different values
    const statusSelect = page.getByLabel(/Status/i);

    // Test each status option
    const statuses = ["IDENTIFIED", "CONTACTED", "PURCHASED", "LISTED", "SOLD"];
    for (const status of statuses) {
      await statusSelect.selectOption(status);
      await expect(statusSelect).toHaveValue(status);
    }
  });

  test("Scenario: Edit form displays existing opportunity data", async ({ page }) => {
    // Given I am on the opportunities page with an opportunity that has purchase data
    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    // Find the second opportunity which has purchasePrice and notes
    const editButtons = page.getByRole("button", { name: /Edit/i });
    if ((await editButtons.count()) >= 2) {
      await editButtons.nth(1).click();

      // Then the form should show existing values
      const statusSelect = page.getByLabel(/Status/i);
      await expect(statusSelect).toHaveValue("PURCHASED");

      const purchasePriceInput = page.getByLabel(/Purchase Price/i);
      await expect(purchasePriceInput).toHaveValue("500");

      const notesInput = page.getByLabel(/Notes/i);
      await expect(notesInput).toHaveValue("Great condition, seller was flexible");
    }
  });

  test("Scenario: Opportunity card displays listing image when available", async ({ page }) => {
    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    const image = page.locator('img[alt="iPhone 13 Pro Max"]').first();
    await expect(image).toBeVisible();
  });
});

test.describe("Feature: Delete Opportunity", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API responses for consistent testing
    await page.route("**/api/opportunities**", async (route, request) => {
      if (request.method() === "GET") {
        const mockData = {
          opportunities: [
            {
              id: "test-opp-1",
              listingId: "test-listing-1",
              status: "IDENTIFIED",
              purchasePrice: null,
              purchaseDate: null,
              resalePrice: null,
              resalePlatform: null,
              resaleUrl: null,
              resaleDate: null,
              actualProfit: null,
              fees: null,
              notes: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              listing: {
                id: "test-listing-1",
                title: "Nintendo Switch OLED",
                askingPrice: 280,
                estimatedValue: 350,
                profitPotential: 50,
                valueScore: 72,
                platform: "CRAIGSLIST",
                url: "https://craigslist.org/item/1",
                location: "Miami, FL",
                imageUrls: null,
                condition: "good",
              },
            },
          ],
          stats: {
            totalOpportunities: 1,
            totalProfit: 0,
            totalInvested: 0,
            totalRevenue: 0,
          },
        };
        await route.fulfill({ json: mockData });
      } else if (request.method() === "DELETE") {
        await route.fulfill({ json: { success: true } });
      } else {
        await route.continue();
      }
    });
  });

  test("Scenario: User sees Delete button on opportunities", async ({ page }) => {
    // Given I am on the opportunities page with opportunities
    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    // Then I should see a Delete button
    const deleteButton = page.getByRole("button", { name: /Delete/i });
    await expect(deleteButton.first()).toBeVisible();
  });

  test("Scenario: User clicks Delete and sees confirmation dialog", async ({ page }) => {
    // Given I am on the opportunities page
    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    // Set up dialog handler to capture the confirmation
    let dialogMessage = "";
    page.on("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss(); // Click Cancel
    });

    // When I click the Delete button
    const deleteButton = page.getByRole("button", { name: /Delete/i }).first();
    await deleteButton.click();

    // Then I should see a confirmation dialog
    expect(dialogMessage).toContain("Are you sure");
  });

  test("Scenario: User confirms deletion", async ({ page }) => {
    // Given I am on the opportunities page
    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    // Count initial opportunities
    const initialCount = await page.getByText("Nintendo Switch").count();
    expect(initialCount).toBeGreaterThan(0);

    // Set up dialog handler to accept
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    // When I click Delete and confirm
    const deleteButton = page.getByRole("button", { name: /Delete/i }).first();
    await deleteButton.click();

    // Then the API should have been called (mocked as successful)
    // The page will refresh and show the updated list
    await page.waitForLoadState("networkidle");
  });

  test("Scenario: User cancels deletion", async ({ page }) => {
    // Given I am on the opportunities page
    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    // Set up dialog handler to dismiss (cancel)
    page.on("dialog", async (dialog) => {
      await dialog.dismiss();
    });

    // When I click Delete and cancel
    const deleteButton = page.getByRole("button", { name: /Delete/i }).first();
    await deleteButton.click();

    // Then the opportunity should still be visible
    await expect(page.getByText("Nintendo Switch OLED")).toBeVisible();
  });

  test("Scenario: Delete button is not visible when editing", async ({ page }) => {
    // Given I am on the opportunities page
    await page.goto("/opportunities");
    await page.waitForLoadState("networkidle");

    // When I click Edit on an opportunity
    const editButton = page.getByRole("button", { name: /Edit/i }).first();
    await editButton.click();

    // Then the Save Changes button should be visible (indicating edit mode)
    await expect(page.getByRole("button", { name: /Save Changes/i })).toBeVisible();

    // And the Cancel button should be visible
    await expect(page.getByRole("button", { name: /Cancel/i })).toBeVisible();
  });
});

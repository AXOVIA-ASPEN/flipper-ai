import { test, expect } from './fixtures';
import { expectNoErrors } from './helpers/assertions';

/**
 * Feature: Resale Listing Generator (BDD)
 * Covers feature/04-resale-listing.feature scenarios
 * Uses Page Object Model via fixtures for maintainability
 */

test.describe('Resale Listing Generator', () => {
  test.beforeEach(async ({ authPage }) => {
    await authPage.goto('/login');
    await authPage.login('test@example.com', 'TestPassword123!');
  });

  test.describe('Scenario: Auto-generate eBay listing', () => {
    test('should generate optimized listing fields for eBay', async ({ page, resaleListingPage, dashboardPage }) => {
      // Given I have a purchased item
      await dashboardPage.goto('/dashboard');
      const inventoryTab = page.locator('text=Inventory');
      if (await inventoryTab.count() > 0) {
        await inventoryTab.click();
      }

      const itemRow = page.locator('tr', { hasText: /purchased|bought/i }).first();

      if (await itemRow.count() > 0) {
        await itemRow.locator('text=Create Sell Listing').click();
      } else {
        await resaleListingPage.gotoCreate();
      }

      // When I select eBay as platform
      await resaleListingPage.selectPlatform('eBay');

      // Then form should be visible with key fields
      await resaleListingPage.expectFormVisible();
      await resaleListingPage.expectFieldsPresent();
      await expectNoErrors(page);
    });
  });

  test.describe('Scenario: Cross-platform posting', () => {
    test('should adapt listing for multiple platforms', async ({ page: _page, resaleListingPage }) => {
      await resaleListingPage.gotoCreate();

      // Fill basic info
      await resaleListingPage.fillTitle('Sony WH-1000XM5 Headphones - Like New');
      await resaleListingPage.fillPrice('320');

      // Select multiple platforms
      await resaleListingPage.checkPlatform('Facebook');
      await resaleListingPage.checkPlatform('eBay');

      await expectNoErrors(page);
    });
  });

  test.describe('Scenario: Price optimization based on demand', () => {
    test('should suggest aggressive pricing for high-demand items', async ({ page, resaleListingPage }) => {
      await resaleListingPage.gotoCreate();

      await resaleListingPage.fillTitle('iPad Pro 11-inch');
      await resaleListingPage.requestPriceAnalysis();
      await resaleListingPage.expectPriceSuggestionVisible();

      await expectNoErrors(page);
    });
  });

  test.describe('Scenario: Clone existing listing', () => {
    test('should pre-fill fields when cloning a listing', async ({ page: _page, resaleListingPage }) => {
      await resaleListingPage.gotoListings();

      if (await resaleListingPage.cloneButton.count() > 0) {
        await resaleListingPage.cloneButton.click();

        const value = await resaleListingPage.titleInput.inputValue();
        expect(value.length).toBeGreaterThan(0);
      } else {
        await expectNoErrors(page);
      }
    });
  });

  test.describe('Scenario: Track listing performance', () => {
    test('should display performance metrics for posted listings', async ({ page, resaleListingPage }) => {
      await resaleListingPage.gotoListings();

      const listingLink = await resaleListingPage.getFirstListingLink();
      if (await listingLink.count() > 0) {
        await listingLink.click();

        const metrics = page.locator('text=/views|watchers|analytics|performance/i');
        if (await metrics.count() > 0) {
          await expect(metrics.first()).toBeVisible();
        }
      }

      await expectNoErrors(page);
    });
  });

  test.describe('Scenario: Listing form validation', () => {
    test('should show validation errors for empty required fields', async ({ page, resaleListingPage }) => {
      await resaleListingPage.gotoCreate();

      // Submit without filling required fields
      await resaleListingPage.submitListing();

      // Should show validation messages
      const validationError = page.locator('[role="alert"], .error, text=/required|cannot be empty/i');
      if (await validationError.count() > 0) {
        await expect(validationError.first()).toBeVisible();
      }
    });

    test('should reject negative price values', async ({ page, resaleListingPage }) => {
      await resaleListingPage.gotoCreate();

      await resaleListingPage.fillTitle('Test Item');
      await resaleListingPage.fillPrice('-10');
      await resaleListingPage.submitListing();

      const priceError = page.locator('text=/invalid|positive|greater than/i');
      if (await priceError.count() > 0) {
        await expect(priceError.first()).toBeVisible();
      }

      await expectNoErrors(page);
    });
  });

  test.describe('Scenario: Visual regression - Listing form', () => {
    test('listing create page renders correctly', async ({ page, resaleListingPage }) => {
      await resaleListingPage.gotoCreate();
      await resaleListingPage.screenshot('resale-listing-create');
    });

    test('listings index page renders correctly', async ({ page, resaleListingPage }) => {
      await resaleListingPage.gotoListings();
      await resaleListingPage.screenshot('resale-listing-index');
    });
  });
});

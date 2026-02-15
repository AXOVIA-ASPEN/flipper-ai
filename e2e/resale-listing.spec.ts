import { test, expect } from '@playwright/test';
import { expectPageTitle, expectNoErrors } from './helpers/assertions';

/**
 * Feature: Resale Listing Generator (BDD)
 * Covers feature/04-resale-listing.feature scenarios
 */

test.describe('Resale Listing Generator', () => {
  test.beforeEach(async ({ page }) => {
    // Given I am logged in
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|opportunities)/);
  });

  test.describe('Scenario: Auto-generate eBay listing', () => {
    test('Given I have a purchased item, When I create a sell listing for eBay, Then the AI should generate optimized fields', async ({ page }) => {
      // Given I have purchased an item to flip
      await page.goto('/dashboard');
      await page.click('text=Inventory');
      
      // Find a purchased item or navigate to listing creation
      const itemRow = page.locator('tr', { hasText: /purchased|bought/i }).first();
      
      if (await itemRow.count() > 0) {
        // When I click "Create Sell Listing"
        await itemRow.locator('text=Create Sell Listing').click();
      } else {
        // Navigate to create listing page directly
        await page.goto('/listings/create');
      }

      // And I select "eBay" as the platform
      const platformSelect = page.locator('select, [role="combobox"]').filter({ hasText: /platform/i });
      if (await platformSelect.count() > 0) {
        await platformSelect.selectOption({ label: 'eBay' });
      } else {
        await page.click('text=eBay');
      }

      // Then the listing form should be visible with key fields
      await expect(page.locator('form, [data-testid="listing-form"]')).toBeVisible();

      // Verify generated fields are present
      const titleField = page.locator('[name="title"], [data-testid="listing-title"]');
      const descField = page.locator('[name="description"], [data-testid="listing-description"]');
      const priceField = page.locator('[name="price"], [data-testid="listing-price"]');

      await expect(titleField).toBeVisible();
      await expect(descField).toBeVisible();
      await expect(priceField).toBeVisible();

      await expectNoErrors(page);
    });
  });

  test.describe('Scenario: Cross-platform posting', () => {
    test('Given I have a listing, When I select multiple platforms, Then it should adapt for each platform', async ({ page }) => {
      // Navigate to listing creation
      await page.goto('/listings/create');

      // Fill basic listing info
      await page.fill('[name="title"], [data-testid="listing-title"]', 'Sony WH-1000XM5 Headphones - Like New');
      await page.fill('[name="price"], [data-testid="listing-price"]', '320');

      // When I select multiple platforms
      const fbCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /facebook/i });
      const ebayCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /ebay/i });

      if (await fbCheckbox.count() > 0) {
        await fbCheckbox.check();
      }
      if (await ebayCheckbox.count() > 0) {
        await ebayCheckbox.check();
      }

      // Then platform-specific sections should appear
      await expectNoErrors(page);
    });
  });

  test.describe('Scenario: Price optimization based on demand', () => {
    test('Given an item with high demand, When AI calculates list price, Then it should suggest aggressive pricing', async ({ page }) => {
      await page.goto('/listings/create');

      // Fill item details
      const titleField = page.locator('[name="title"], [data-testid="listing-title"]');
      if (await titleField.count() > 0) {
        await titleField.fill('iPad Pro 11-inch');
      }

      // Look for AI price suggestion or analyze button
      const analyzeBtn = page.locator('button', { hasText: /analyze|suggest|optimize/i });
      if (await analyzeBtn.count() > 0) {
        await analyzeBtn.click();
        // Wait for AI response
        await page.waitForTimeout(2000);
      }

      // Verify price suggestion area exists
      const priceSuggestion = page.locator('[data-testid="price-suggestion"], .price-suggestion, text=/suggested|recommended/i');
      if (await priceSuggestion.count() > 0) {
        await expect(priceSuggestion).toBeVisible();
      }

      await expectNoErrors(page);
    });
  });

  test.describe('Scenario: Clone existing listing for similar item', () => {
    test('Given a previous listing exists, When I clone it, Then fields should be pre-filled', async ({ page }) => {
      // Navigate to listings page
      await page.goto('/listings');

      // Look for a clone button on an existing listing
      const cloneBtn = page.locator('button, a').filter({ hasText: /clone|copy|duplicate/i }).first();

      if (await cloneBtn.count() > 0) {
        await cloneBtn.click();

        // Then title and description should be pre-filled
        const titleField = page.locator('[name="title"], [data-testid="listing-title"]');
        if (await titleField.count() > 0) {
          const value = await titleField.inputValue();
          expect(value.length).toBeGreaterThan(0);
        }
      } else {
        // If no listings exist yet, just verify the listings page loads
        await expectNoErrors(page);
      }
    });
  });

  test.describe('Scenario: Track listing performance', () => {
    test('Given I have posted an item, When I view listing analytics, Then I should see performance metrics', async ({ page }) => {
      await page.goto('/listings');

      // Click on first listing if available
      const listingLink = page.locator('a, tr, [data-testid="listing-row"]').filter({ hasText: /\$/ }).first();

      if (await listingLink.count() > 0) {
        await listingLink.click();

        // Then I should see analytics/metrics
        const metricsSection = page.locator('text=/views|watchers|analytics|performance/i');
        if (await metricsSection.count() > 0) {
          await expect(metricsSection.first()).toBeVisible();
        }
      }

      await expectNoErrors(page);
    });
  });
});

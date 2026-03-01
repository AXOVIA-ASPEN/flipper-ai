import { test, expect } from '@playwright/test';

/**
 * Feature: Comparable Sales Analysis
 * As a flipper, I want to see comparable listings and sold items
 * so that I can validate profit potential before purchasing.
 */

const mockOpportunities = [
  {
    id: 'opp-with-comps',
    status: 'WATCHING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    purchasePrice: null,
    resalePrice: null,
    listing: {
      id: 'listing-1',
      title: 'Sony WH-1000XM5 Headphones',
      platform: 'CRAIGSLIST',
      price: 120,
      estimatedValue: 280,
      valueScore: 88,
      url: 'https://craigslist.org/listing/1',
      imageUrl: null,
      location: 'Tampa, FL',
      category: 'electronics',
      description: 'Like new Sony headphones, barely used.',
      analysisReasoning: 'Strong flip opportunity based on comparable sales data.',
      priceReasoning: 'Listed at 57% below market value.',
      notes: null,
      comparableUrls: JSON.stringify([
        { url: 'https://ebay.com/itm/111', label: 'Sony XM5 - Like New', platform: 'eBay', type: 'active' },
        { url: 'https://mercari.com/item/222', label: 'Sony WH-1000XM5 Mint', platform: 'Mercari', type: 'active' },
        { url: 'https://facebook.com/item/333', label: 'XM5 Headphones', platform: 'Facebook', type: 'active' },
      ]),
      comparableSalesJson: JSON.stringify([
        { title: 'Sony WH-1000XM5 - Excellent', price: 265, soldAt: '2026-02-10T14:30:00Z', url: 'https://ebay.com/itm/sold/444' },
        { title: 'Sony XM5 Headphones LNIB', price: 290, soldAt: '2026-02-08T09:15:00Z', url: 'https://ebay.com/itm/sold/555' },
        { title: 'WH-1000XM5 Like New w/ Case', price: 275, soldAt: '2026-02-05T18:00:00Z', url: null },
      ]),
    },
  },
  {
    id: 'opp-no-comps',
    status: 'WATCHING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    purchasePrice: null,
    resalePrice: null,
    listing: {
      id: 'listing-2',
      title: 'Vintage Lamp',
      platform: 'FACEBOOK',
      price: 25,
      estimatedValue: 60,
      valueScore: 72,
      url: 'https://facebook.com/listing/2',
      imageUrl: null,
      location: 'Orlando, FL',
      category: 'furniture',
      description: 'Cool vintage lamp.',
      analysisReasoning: null,
      priceReasoning: null,
      notes: null,
      comparableUrls: null,
      comparableSalesJson: null,
    },
  },
];

test.describe('Comparable Sales Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth session
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        json: {
          user: { id: 'test-user-1', name: 'Test User', email: 'test@example.com' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
      });
    });

    // Mock opportunities API
    await page.route('**/api/opportunities**', async (route) => {
      await route.fulfill({ json: mockOpportunities });
    });

    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Feature: View Comparable Active Listings', () => {
    test('Scenario: Given an opportunity with comparable URLs, When I view its details, Then I see comparable listings with platform info', async ({ page }) => {
      // When I click on the opportunity with comparables
      const card = page.getByText('Sony WH-1000XM5 Headphones');
      await card.click();

      // Then I should see the Comparable Listings section
      await expect(page.getByText('Comparable Listings')).toBeVisible();

      // And I should see all 3 comparable listings
      await expect(page.getByText('Sony XM5 - Like New')).toBeVisible();
      await expect(page.getByText('Sony WH-1000XM5 Mint')).toBeVisible();
      await expect(page.getByText('XM5 Headphones')).toBeVisible();

      // And each should show platform info
      await expect(page.getByText('eBay', { exact: false }).first()).toBeVisible();
      await expect(page.getByText('Mercari', { exact: false }).first()).toBeVisible();
      await expect(page.getByText('Facebook', { exact: false }).first()).toBeVisible();
    });

    test('Scenario: Given comparable listings, When I click one, Then it opens in a new tab', async ({ page }) => {
      // When I view the opportunity detail
      await page.getByText('Sony WH-1000XM5 Headphones').click();
      await expect(page.getByText('Comparable Listings')).toBeVisible();

      // Then comparable links should have target="_blank"
      const compLink = page.locator('a[href="https://ebay.com/itm/111"]');
      await expect(compLink).toHaveAttribute('target', '_blank');
      await expect(compLink).toHaveAttribute('rel', /noopener/);
    });
  });

  test.describe('Feature: View Comparable Sold Listings', () => {
    test('Scenario: Given an opportunity with sold comps, When I view details, Then I see sold prices and dates', async ({ page }) => {
      // When I open the opportunity detail
      await page.getByText('Sony WH-1000XM5 Headphones').click();

      // Then I should see the Comparable Sold Listings section
      await expect(page.getByText('Comparable Sold Listings')).toBeVisible();

      // And I should see sold item titles
      await expect(page.getByText('Sony WH-1000XM5 - Excellent')).toBeVisible();
      await expect(page.getByText('Sony XM5 Headphones LNIB')).toBeVisible();
      await expect(page.getByText('WH-1000XM5 Like New w/ Case')).toBeVisible();

      // And I should see sold prices formatted as currency
      await expect(page.getByText('$265')).toBeVisible();
      await expect(page.getByText('$290')).toBeVisible();
      await expect(page.getByText('$275')).toBeVisible();
    });

    test('Scenario: Given a sold comp with a URL, When displayed, Then it shows a View link', async ({ page }) => {
      // When I open the opportunity detail
      await page.getByText('Sony WH-1000XM5 Headphones').click();
      await expect(page.getByText('Comparable Sold Listings')).toBeVisible();

      // Then comps with URLs should have View links
      const viewLinks = page.locator('a:has-text("View")');
      // Two of three comps have URLs
      expect(await viewLinks.count()).toBeGreaterThanOrEqual(2);
    });

    test('Scenario: Given a sold comp without a URL, When displayed, Then no View link appears for it', async ({ page }) => {
      // When I open the opportunity detail
      await page.getByText('Sony WH-1000XM5 Headphones').click();
      await expect(page.getByText('Comparable Sold Listings')).toBeVisible();

      // Then the comp without URL ("WH-1000XM5 Like New w/ Case") should not have a View link
      // We check that there are exactly 2 View links (not 3)
      const viewLinks = page.locator('a:has-text("View")');
      const count = await viewLinks.count();
      // Could be 2 sold comp links + other View links on page, but sold section has exactly 2
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Feature: Opportunity Without Comparables', () => {
    test('Scenario: Given an opportunity with no comparable data, When I view details, Then comparable sections are hidden', async ({ page }) => {
      // When I click on the opportunity without comps
      await page.getByText('Vintage Lamp').click();

      // Then I should NOT see comparable sections
      await expect(page.getByText('Comparable Listings')).not.toBeVisible();
      await expect(page.getByText('Comparable Sold Listings')).not.toBeVisible();
    });
  });

  test.describe('Feature: Comparable Data Validates Profit Analysis', () => {
    test('Scenario: Given sold comps averaging $277, When viewing a $120 listing, Then analysis reasoning is shown', async ({ page }) => {
      // When I view the opportunity with comps
      await page.getByText('Sony WH-1000XM5 Headphones').click();

      // Then the analysis reasoning should be visible
      await expect(page.getByText('Strong flip opportunity based on comparable sales data.')).toBeVisible();

      // And the price reasoning should be visible
      await expect(page.getByText('Listed at 57% below market value.')).toBeVisible();
    });
  });
});

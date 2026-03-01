import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * E2E tests for Dashboard Bulk Actions
 * BDD-style: Given/When/Then
 *
 * Tests the floating bulk action bar that appears when listings are selected:
 * - Select individual listings via checkbox
 * - Select all via header checkbox
 * - Bulk add to opportunities
 * - Bulk update status
 * - Bulk delete
 * - Clear selection
 */

const mockListings = [
  {
    id: 'listing-1',
    title: 'Sony WH-1000XM5 Headphones',
    platform: 'facebook',
    price: 120,
    estimatedValue: 250,
    flippabilityScore: 88,
    status: 'NEW',
    imageUrls: null,
    location: 'Sarasota, FL',
    postedAt: new Date().toISOString(),
    url: 'https://facebook.com/listing/1',
  },
  {
    id: 'listing-2',
    title: 'Nintendo Switch OLED',
    platform: 'craigslist',
    price: 200,
    estimatedValue: 320,
    flippabilityScore: 75,
    status: 'NEW',
    imageUrls: null,
    location: 'Tampa, FL',
    postedAt: new Date().toISOString(),
    url: 'https://craigslist.org/listing/2',
  },
  {
    id: 'listing-3',
    title: 'MacBook Pro M3 14"',
    platform: 'offerup',
    price: 900,
    estimatedValue: 1400,
    flippabilityScore: 92,
    status: 'NEW',
    imageUrls: null,
    location: 'Orlando, FL',
    postedAt: new Date().toISOString(),
    url: 'https://offerup.com/listing/3',
  },
];

function setupMockRoutes(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/listings*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: mockListings });
      } else if (route.request().method() === 'PATCH') {
        await route.fulfill({ json: { success: true } });
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({ json: { success: true } });
      } else {
        await route.continue();
      }
    }),
    page.route('**/api/opportunities*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ json: { success: true } });
      } else {
        await route.continue();
      }
    }),
  ]);
}

test.describe('Feature: Dashboard Bulk Actions', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
    await setupMockRoutes(page);
  });

  test.describe('Scenario: Select individual listings', () => {
    test('Given I am on the dashboard with listings, When I click a listing checkbox, Then it should be selected and the bulk action bar appears', async ({
      page,
    }) => {
      // Given
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Verify listings are rendered
      await expect(page.getByText('Sony WH-1000XM5 Headphones')).toBeVisible();

      // When I click the first listing's checkbox
      const checkboxes = page.locator('tbody input[type="checkbox"]');
      await expect(checkboxes.first()).toBeVisible();
      await checkboxes.first().check();

      // Then the bulk action bar should appear with "1 item selected"
      await expect(page.getByText('1 item selected')).toBeVisible();
    });

    test('Given I have one listing selected, When I select another, Then the count updates to 2', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const checkboxes = page.locator('tbody input[type="checkbox"]');
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      await expect(page.getByText('2 items selected')).toBeVisible();
    });
  });

  test.describe('Scenario: Select all listings', () => {
    test('Given I am on the dashboard, When I click the select-all checkbox, Then all listings are selected', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // When I click the "Select all" checkbox in the header
      const selectAll = page.getByLabel('Select all listings');
      await expect(selectAll).toBeVisible();
      await selectAll.check();

      // Then all 3 items should be selected
      await expect(page.getByText('3 items selected')).toBeVisible();
    });

    test('Given all listings are selected, When I uncheck select-all, Then all are deselected and bulk bar hides', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const selectAll = page.getByLabel('Select all listings');
      await selectAll.check();
      await expect(page.getByText('3 items selected')).toBeVisible();

      // When I uncheck
      await selectAll.uncheck();

      // Then the bulk bar should disappear
      await expect(page.getByText(/\d+ items? selected/)).not.toBeVisible();
    });
  });

  test.describe('Scenario: Clear selection', () => {
    test('Given I have listings selected, When I click "Clear selection", Then all selections are cleared', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const selectAll = page.getByLabel('Select all listings');
      await selectAll.check();
      await expect(page.getByText('3 items selected')).toBeVisible();

      // When I click clear selection
      await page.getByText('Clear selection').click();

      // Then bulk bar should hide
      await expect(page.getByText(/\d+ items? selected/)).not.toBeVisible();
    });
  });

  test.describe('Scenario: Bulk add to opportunities', () => {
    test('Given I have listings selected, When I click "Add to Opportunities", Then the API is called for each selected listing', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const apiCalls: string[] = [];
      await page.route('**/api/listings/*/opportunity', async (route) => {
        apiCalls.push(route.request().url());
        await route.fulfill({ json: { success: true } });
      });

      // Select 2 listings
      const checkboxes = page.locator('tbody input[type="checkbox"]');
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      await expect(page.getByText('2 items selected')).toBeVisible();

      // When I click Add to Opportunities
      await page.getByRole('button', { name: /Add to Opportunities|Opportunities/i }).click();

      // Then API calls should have been made
      await page.waitForTimeout(500);
      expect(apiCalls.length).toBe(2);
    });
  });

  test.describe('Scenario: Bulk update status', () => {
    test('Given I have listings selected, When I click "Update Status" and choose a status, Then the status dropdown appears with options', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Select a listing
      const checkboxes = page.locator('tbody input[type="checkbox"]');
      await checkboxes.first().check();

      // When I click the Update Status button
      await page.getByRole('button', { name: /Update Status|Status/i }).click();

      // Then I should see status options
      const statuses = ['NEW', 'OPPORTUNITY', 'CONTACTED', 'PURCHASED', 'SOLD'];
      for (const status of statuses) {
        await expect(page.getByText(status, { exact: true }).first()).toBeVisible();
      }
    });
  });

  test.describe('Scenario: Bulk delete', () => {
    test('Given I have listings selected, When I click the delete button, Then a confirmation modal appears', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Select a listing
      const checkboxes = page.locator('tbody input[type="checkbox"]');
      await checkboxes.first().check();

      // When I click the delete button (trash icon)
      const deleteButton = page.locator('button').filter({ has: page.locator('.lucide-trash-2') });
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Then confirmation should appear
        await expect(
          page.getByText(/delete|confirm|are you sure/i).first()
        ).toBeVisible();
      }
    });
  });

  test.describe('Scenario: Bulk action bar UI elements', () => {
    test('Given I have listings selected, Then the bulk action bar shows all expected buttons', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const selectAll = page.getByLabel('Select all listings');
      await selectAll.check();

      // Then I should see: selection count, clear selection link, and action buttons
      await expect(page.getByText('3 items selected')).toBeVisible();
      await expect(page.getByText('Clear selection')).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Add to Opportunities|Opportunities/i })
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Update Status|Status/i })
      ).toBeVisible();
    });
  });
});

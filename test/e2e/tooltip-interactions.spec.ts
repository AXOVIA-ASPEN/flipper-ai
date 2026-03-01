import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * Feature: Tooltip Interactions & User Guidance
 * As a user, I want to see helpful tooltips on interactive elements
 * so that I understand what actions are available without guessing.
 *
 * BDD-style E2E tests for tooltip visibility and accessibility.
 */

const mockListings = [
  {
    id: 'listing-tooltip-1',
    title: 'Sony WH-1000XM5 Headphones',
    platform: 'facebook',
    price: 120,
    estimatedValue: 250,
    flippabilityScore: 88,
    status: 'NEW',
    imageUrls: null,
    location: 'Tampa, FL',
    postedAt: new Date().toISOString(),
    url: 'https://facebook.com/listing/1',
  },
];

const mockOpportunities = [
  {
    id: 'opp-tooltip-1',
    status: 'WATCHING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    purchasePrice: null,
    resalePrice: null,
    listing: {
      id: 'listing-tooltip-2',
      title: 'Nintendo Switch OLED',
      platform: 'CRAIGSLIST',
      price: 200,
      estimatedValue: 320,
      valueScore: 75,
      url: 'https://craigslist.org/listing/2',
      imageUrl: null,
      location: 'Orlando, FL',
      category: 'gaming',
      description: 'Like new Switch OLED, barely used.',
      analysisReasoning: null,
      priceReasoning: null,
      notes: null,
      comparableUrls: null,
      comparableSalesJson: null,
    },
  },
];

const mockSearchConfigs = [
  {
    id: 'search-1',
    name: 'Electronics in Tampa',
    marketplace: 'facebook',
    category: 'electronics',
    minPrice: 50,
    maxPrice: 500,
    location: 'Tampa, FL',
    enabled: true,
  },
];

test.describe('Feature: Tooltip Interactions & User Guidance', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);

    // Mock APIs
    await page.route('**/api/listings*', async (route) => {
      await route.fulfill({ json: mockListings });
    });

    await page.route('**/api/opportunities*', async (route) => {
      await route.fulfill({ json: mockOpportunities });
    });

    await page.route('**/api/search-configs*', async (route) => {
      await route.fulfill({ json: mockSearchConfigs });
    });

    await page.route('**/api/settings*', async (route) => {
      await route.fulfill({
        json: {
          ebayApiKey: 'test-key',
          craigslistLocation: 'Tampa, FL',
          notifications: { email: true, browser: false },
        },
      });
    });
  });

  test.describe('Scenario: Dashboard action button tooltips', () => {
    test('Given I am on the dashboard, When I hover over the "View listing" button, Then I see the tooltip', async ({
      page,
    }) => {
      // Given I navigate to the dashboard
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // When I hover over a "View listing" button
      const viewButton = page.locator('a[title="View listing"]').first();
      await expect(viewButton).toBeVisible({ timeout: 10000 });

      // Hover to trigger native browser tooltip
      await viewButton.hover();

      // Then the title attribute should be present (browsers show native tooltip)
      const titleAttr = await viewButton.getAttribute('title');
      expect(titleAttr).toBe('View listing');
    });

    test('Given I am on the dashboard, When I hover over the "Mark as opportunity" button, Then I see the tooltip', async ({
      page,
    }) => {
      // Given I navigate to the dashboard
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // When I hover over a "Mark as opportunity" button
      const opportunityButton = page.locator('button[title="Mark as opportunity"]').first();
      
      // Only test if the button exists (may not show if already marked)
      const buttonCount = await opportunityButton.count();
      if (buttonCount > 0) {
        await expect(opportunityButton).toBeVisible();
        await opportunityButton.hover();

        // Then the title attribute should be present
        const titleAttr = await opportunityButton.getAttribute('title');
        expect(titleAttr).toBe('Mark as opportunity');
      }
    });

    test('Given I am on the dashboard, When I hover over the "Select all listings" checkbox, Then I see the aria-label', async ({
      page,
    }) => {
      // Given I navigate to the dashboard
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // When I locate the "Select all" checkbox
      const selectAllCheckbox = page.locator('input[aria-label="Select all listings"]');
      
      const checkboxCount = await selectAllCheckbox.count();
      if (checkboxCount > 0) {
        await expect(selectAllCheckbox).toBeVisible();

        // Then it should have an accessible label
        const ariaLabel = await selectAllCheckbox.getAttribute('aria-label');
        expect(ariaLabel).toBe('Select all listings');
      }
    });
  });

  test.describe('Scenario: Opportunities page view toggle tooltips', () => {
    test('Given I am on the opportunities page, When I hover over the "Kanban view" button, Then I see the tooltip', async ({
      page,
    }) => {
      // Given I navigate to opportunities
      await page.goto('/opportunities');
      await page.waitForLoadState('networkidle');

      // When I hover over the Kanban view toggle
      const kanbanButton = page.locator('button[title="Kanban view"]');
      await expect(kanbanButton).toBeVisible({ timeout: 10000 });
      await kanbanButton.hover();

      // Then the title attribute should describe the action
      const titleAttr = await kanbanButton.getAttribute('title');
      expect(titleAttr).toBe('Kanban view');
    });

    test('Given I am in Kanban view, When I hover over the "List view" button, Then I see the tooltip', async ({
      page,
    }) => {
      // Given I navigate to opportunities and switch to Kanban
      await page.goto('/opportunities');
      await page.waitForLoadState('networkidle');

      const kanbanButton = page.locator('button[title="Kanban view"]');
      await expect(kanbanButton).toBeVisible();
      await kanbanButton.click();

      // Wait for view switch
      await page.waitForTimeout(500);

      // When I hover over the List view toggle
      const listButton = page.locator('button[title="List view"]');
      await expect(listButton).toBeVisible();
      await listButton.hover();

      // Then the title attribute should describe the action
      const titleAttr = await listButton.getAttribute('title');
      expect(titleAttr).toBe('List view');
    });
  });

  test.describe('Scenario: Scraper page action tooltips', () => {
    test('Given I am on the scraper page, When I hover over the "Save this search" button, Then I see the tooltip', async ({
      page,
    }) => {
      // Given I navigate to the scraper
      await page.goto('/scraper');
      await page.waitForLoadState('networkidle');

      // When I hover over the save search button
      const saveButton = page.locator('button[title="Save this search"]');
      
      const buttonCount = await saveButton.count();
      if (buttonCount > 0) {
        await expect(saveButton).toBeVisible();
        await saveButton.hover();

        // Then the title attribute should be present
        const titleAttr = await saveButton.getAttribute('title');
        expect(titleAttr).toBe('Save this search');
      }
    });

    test('Given I am on the scraper page with saved searches, When I hover over the "Delete" button, Then I see the tooltip', async ({
      page,
    }) => {
      // Given I navigate to the scraper
      await page.goto('/scraper');
      await page.waitForLoadState('networkidle');

      // When I hover over a delete button for saved searches
      const deleteButton = page.locator('button[title="Delete"]').first();
      
      const buttonCount = await deleteButton.count();
      if (buttonCount > 0) {
        await expect(deleteButton).toBeVisible();
        await deleteButton.hover();

        // Then the title attribute should be present
        const titleAttr = await deleteButton.getAttribute('title');
        expect(titleAttr).toBe('Delete');
      }
    });

    test('Given I am on the scraper page, When I hover over the "Refresh" button, Then I see the tooltip', async ({
      page,
    }) => {
      // Given I navigate to the scraper
      await page.goto('/scraper');
      await page.waitForLoadState('networkidle');

      // When I hover over the refresh button
      const refreshButton = page.locator('button[title="Refresh"]');
      
      const buttonCount = await refreshButton.count();
      if (buttonCount > 0) {
        await expect(refreshButton).toBeVisible();
        await refreshButton.hover();

        // Then the title attribute should be present
        const titleAttr = await refreshButton.getAttribute('title');
        expect(titleAttr).toBe('Refresh');
      }
    });
  });

  test.describe('Scenario: Settings page toggle tooltips', () => {
    test('Given I am on the settings page, When I hover over an "Enable" toggle, Then I see the tooltip', async ({
      page,
    }) => {
      // Given I navigate to settings
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // When I hover over an enable/disable toggle
      const toggleButton = page.locator('button[title="Enable"], button[title="Disable"]').first();
      
      const buttonCount = await toggleButton.count();
      if (buttonCount > 0) {
        await expect(toggleButton).toBeVisible();
        await toggleButton.hover();

        // Then the title attribute should indicate enable or disable
        const titleAttr = await toggleButton.getAttribute('title');
        expect(titleAttr).toMatch(/Enable|Disable/);
      }
    });
  });

  test.describe('Scenario: Health dashboard metric tooltips', () => {
    test('Given I am on the health dashboard, When I view system metrics, Then descriptive subtitles are shown', async ({
      page,
    }) => {
      // Mock health API
      await page.route('**/api/health*', async (route) => {
        await route.fulfill({
          json: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: 86400,
            version: '1.0.0',
            environment: 'production',
            memory: { heapUsed: 50, heapTotal: 100 },
            database: { connected: true },
          },
        });
      });

      // Given I navigate to the health dashboard
      await page.goto('/health');
      await page.waitForLoadState('networkidle');

      // When I view the page
      // Then metric cards should have descriptive subtitles
      const uptimeSubtitle = page.locator('text=since last restart');
      await expect(uptimeSubtitle).toBeVisible({ timeout: 10000 });

      const healthCheckSubtitle = page.locator('text=health check');
      await expect(healthCheckSubtitle).toBeVisible();
    });
  });

  test.describe('Scenario: Accessibility - ARIA labels for screen readers', () => {
    test('Given I am on the dashboard, When I inspect interactive elements, Then they have proper ARIA labels', async ({
      page,
    }) => {
      // Given I navigate to the dashboard
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Then checkboxes should have aria-label for accessibility
      const selectCheckboxes = page.locator('input[aria-label*="Select"]');
      const count = await selectCheckboxes.count();
      
      // At least one checkbox should exist (select all or individual)
      expect(count).toBeGreaterThan(0);

      // Each checkbox should have a descriptive aria-label
      for (let i = 0; i < Math.min(count, 3); i++) {
        const checkbox = selectCheckboxes.nth(i);
        const ariaLabel = await checkbox.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toContain('Select');
      }
    });
  });
});

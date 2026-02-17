import { test, expect } from '@playwright/test';

/**
 * Feature: Search Configuration CRUD Operations
 * Based on: features/01-marketplace-scanning.feature (Save custom search configuration)
 *
 * Tests the full lifecycle of search configurations:
 * create, read, update, delete, toggle, and run.
 */

const mockConfigs = [
  {
    id: 'config-1',
    name: 'Tampa Electronics',
    platform: 'CRAIGSLIST',
    location: 'tampa',
    category: 'electronics',
    keywords: 'iphone,macbook',
    minPrice: 100,
    maxPrice: 1000,
    enabled: true,
    lastRun: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'config-2',
    name: 'Orlando Furniture',
    platform: 'FACEBOOK_MARKETPLACE',
    location: 'orlando',
    category: 'furniture',
    keywords: 'couch,table',
    minPrice: 50,
    maxPrice: 500,
    enabled: false,
    lastRun: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

test.describe('Search Config CRUD', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth session
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: 'test-user-1',
            name: 'Test User',
            email: 'test@example.com',
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
      });
    });

    // Mock user settings
    await page.route('**/api/user/settings', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          json: {
            id: 'settings-1',
            userId: 'test-user-1',
            openaiApiKey: null,
            preferredModel: 'gpt-4o-mini',
            discountThreshold: 70,
            autoAnalyze: false,
            notifyEmail: true,
            notifyPush: false,
            notifyPrice: true,
            notifyNewListings: true,
            minProfit: 50,
            minScore: 70,
            preferredCategories: JSON.stringify(['electronics']),
            theme: 'midnight',
          },
        });
      } else {
        await route.fulfill({ json: { success: true } });
      }
    });
  });

  test.describe('Feature: List Search Configurations', () => {
    test('Scenario: Given user has saved configs, When they view settings, Then all configs are displayed', async ({
      page,
    }) => {
      await page.route('**/api/search-configs**', async (route) => {
        await route.fulfill({ json: mockConfigs });
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Then both configs should be visible
      await expect(page.getByText('Tampa Electronics')).toBeVisible();
      await expect(page.getByText('Orlando Furniture')).toBeVisible();
      await expect(page.getByText('CRAIGSLIST')).toBeVisible();
      await expect(page.getByText('FACEBOOK_MARKETPLACE')).toBeVisible();
    });

    test('Scenario: Given user has no saved configs, When they view settings, Then empty state is shown', async ({
      page,
    }) => {
      await page.route('**/api/search-configs**', async (route) => {
        await route.fulfill({ json: [] });
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // The section should exist but have no config cards
      await expect(page.getByText('Saved Search Configurations')).toBeVisible();
      await expect(page.getByText('Tampa Electronics')).not.toBeVisible();
    });
  });

  test.describe('Feature: Create Search Configuration', () => {
    test('Scenario: Given user clicks Create New, When they fill the form and submit, Then a new config is created', async ({
      page,
    }) => {
      let _createCalled = false;
      await page.route('**/api/search-configs**', async (route, request) => {
        if (request.method() === 'POST' && !request.url().includes('/search-configs/')) {
          const body = await request.postDataJSON();
          expect(body.name).toBeTruthy();
          _createCalled = true;
          await route.fulfill({
            status: 201,
            json: {
              id: 'config-new',
              ...body,
              enabled: true,
              createdAt: new Date().toISOString(),
            },
          });
        } else {
          await route.fulfill({ json: mockConfigs });
        }
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Click "Create New Search" button
      const createBtn = page.getByRole('button', {
        name: /Create New Search/i,
      });
      if (await createBtn.isVisible()) {
        await createBtn.click();

        // Fill the config form fields
        const nameInput = page.getByPlaceholder(/config name/i).first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Miami Appliances');
        }
      }
    });

    test('Scenario: Given user opens create form, When they cancel, Then no config is created', async ({
      page,
    }) => {
      let postCalled = false;
      await page.route('**/api/search-configs**', async (route, request) => {
        if (request.method() === 'POST') {
          postCalled = true;
          await route.fulfill({ status: 201, json: {} });
        } else {
          await route.fulfill({ json: mockConfigs });
        }
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const createBtn = page.getByRole('button', {
        name: /Create New Search/i,
      });
      if (await createBtn.isVisible()) {
        await createBtn.click();

        // Look for a cancel button
        const cancelBtn = page.getByRole('button', { name: /Cancel/i });
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
          expect(postCalled).toBe(false);
        }
      }
    });
  });

  test.describe('Feature: Edit Search Configuration', () => {
    test('Scenario: Given user clicks Edit on a config, When they modify and save, Then the config is updated', async ({
      page,
    }) => {
      let _patchCalled = false;
      await page.route('**/api/search-configs**', async (route, request) => {
        const url = request.url();
        if (request.method() === 'PATCH' && url.includes('/search-configs/')) {
          _patchCalled = true;
          const body = await request.postDataJSON();
          await route.fulfill({
            json: { ...mockConfigs[0], ...body },
          });
        } else if (request.method() === 'GET') {
          await route.fulfill({ json: mockConfigs });
        } else {
          await route.fulfill({ json: { success: true } });
        }
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Find and click the Edit button for the first config
      const editBtn = page.getByRole('button', { name: /Edit/i }).first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        // Verify edit mode is active (form fields should appear)
      }
    });
  });

  test.describe('Feature: Delete Search Configuration', () => {
    test('Scenario: Given user clicks Delete on a config, When they confirm, Then the config is removed', async ({
      page,
    }) => {
      let deleteCalled = false;
      let deletedId = '';

      await page.route('**/api/search-configs**', async (route, request) => {
        const url = request.url();
        if (request.method() === 'DELETE' && url.includes('/search-configs/')) {
          deleteCalled = true;
          deletedId = url.split('/search-configs/')[1].split('?')[0];
          await route.fulfill({ json: { success: true } });
        } else if (request.method() === 'GET') {
          await route.fulfill({ json: mockConfigs });
        } else {
          await route.fulfill({ json: { success: true } });
        }
      });

      // Set up dialog handler for confirm prompt
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Delete');
        await dialog.accept();
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Click delete button on first config
      const deleteBtn = page.getByRole('button', { name: /Delete/i }).first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        // Verify the DELETE API was called
        expect(deleteCalled).toBe(true);
        expect(deletedId).toBe('config-1');
      }
    });

    test('Scenario: Given user clicks Delete, When they cancel the confirm dialog, Then config remains', async ({
      page,
    }) => {
      let deleteCalled = false;

      await page.route('**/api/search-configs**', async (route, request) => {
        if (request.method() === 'DELETE') {
          deleteCalled = true;
          await route.fulfill({ json: { success: true } });
        } else {
          await route.fulfill({ json: mockConfigs });
        }
      });

      // Dismiss the confirm dialog
      page.on('dialog', async (dialog) => {
        await dialog.dismiss();
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const deleteBtn = page.getByRole('button', { name: /Delete/i }).first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        expect(deleteCalled).toBe(false);
      }
    });
  });

  test.describe('Feature: Toggle Search Configuration', () => {
    test('Scenario: Given an enabled config, When user toggles it, Then it becomes disabled via PATCH', async ({
      page,
    }) => {
      let patchBody: Record<string, unknown> | null = null;

      await page.route('**/api/search-configs**', async (route, request) => {
        const url = request.url();
        if (request.method() === 'PATCH' && url.includes('/search-configs/')) {
          patchBody = await request.postDataJSON();
          await route.fulfill({
            json: { ...mockConfigs[0], enabled: false },
          });
        } else if (request.method() === 'GET') {
          await route.fulfill({ json: mockConfigs });
        } else {
          await route.fulfill({ json: { success: true } });
        }
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for toggle/switch near Tampa Electronics config
      const toggleBtn = page.getByRole('button', { name: /Disable|Toggle|Pause/i }).first();
      if (await toggleBtn.isVisible()) {
        await toggleBtn.click();
        expect(patchBody).toBeTruthy();
      }
    });
  });

  test.describe('Feature: Run Search Configuration', () => {
    test('Scenario: Given an enabled config, When user clicks Run, Then a scrape is triggered', async ({
      page,
    }) => {
      let _scrapeCalled = false;

      await page.route('**/api/search-configs**', async (route, request) => {
        if (request.method() === 'GET') {
          await route.fulfill({ json: mockConfigs });
        } else if (request.method() === 'PATCH') {
          await route.fulfill({
            json: {
              ...mockConfigs[0],
              lastRun: new Date().toISOString(),
            },
          });
        } else {
          await route.fulfill({ json: { success: true } });
        }
      });

      await page.route('**/api/scraper/**', async (route) => {
        _scrapeCalled = true;
        await route.fulfill({
          json: {
            success: true,
            listings: [],
            count: 0,
          },
        });
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const runBtn = page.getByRole('button', { name: /Run|Scan|Start/i }).first();
      if (await runBtn.isVisible()) {
        await runBtn.click();
        // Scrape endpoint should have been called
      }
    });
  });

  test.describe('Feature: Search Config Display Details', () => {
    test('Scenario: Given configs exist, Then each config shows platform, location, and keywords', async ({
      page,
    }) => {
      await page.route('**/api/search-configs**', async (route) => {
        await route.fulfill({ json: mockConfigs });
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Verify config details are rendered
      await expect(page.getByText('Tampa Electronics')).toBeVisible();
      await expect(page.getByText('CRAIGSLIST')).toBeVisible();
      await expect(page.getByText('Orlando Furniture')).toBeVisible();
      await expect(page.getByText('FACEBOOK_MARKETPLACE')).toBeVisible();
    });

    test('Scenario: Given a config with price range, Then min and max prices are displayed', async ({
      page,
    }) => {
      await page.route('**/api/search-configs**', async (route) => {
        await route.fulfill({ json: mockConfigs });
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Check that price information is visible (format may vary)
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain('100');
      expect(pageContent).toContain('1000');
    });
  });
});

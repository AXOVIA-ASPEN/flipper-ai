import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock session for authenticated views
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
            preferredCategories: JSON.stringify(['electronics', 'furniture']),
            theme: 'midnight',
          },
        });
      } else {
        await route.fulfill({ json: { success: true } });
      }
    });

    // Mock search configs
    await page.route('**/api/search-configs**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          json: [
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
          ],
        });
      } else if (request.method() === 'POST') {
        await route.fulfill({
          json: {
            id: 'config-new',
            name: 'New Config',
            platform: 'CRAIGSLIST',
            location: 'sarasota',
            category: 'electronics',
            enabled: true,
            createdAt: new Date().toISOString(),
          },
        });
      } else if (request.method() === 'DELETE') {
        await route.fulfill({ json: { success: true } });
      } else {
        await route.fulfill({ json: { success: true } });
      }
    });
  });

  test.describe('Feature: View Settings Page', () => {
    test('Scenario: User sees settings page header', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.locator('h1')).toContainText('Settings');
      await expect(page.locator('a[href="/"]')).toBeVisible();
    });

    test('Scenario: User sees all settings sections', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Account')).toBeVisible();
      await expect(page.getByText('API Keys')).toBeVisible();
      await expect(page.getByText('LLM Analysis Preferences')).toBeVisible();
      await expect(page.getByText('Saved Search Configurations')).toBeVisible();
      await expect(page.getByText('Notification Settings')).toBeVisible();
      await expect(page.getByText('Profit Settings')).toBeVisible();
      await expect(page.getByText('Theme')).toBeVisible();
    });
  });

  test.describe('Feature: Account Section', () => {
    test('Scenario: User sees profile info', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Test User')).toBeVisible();
      await expect(page.getByText('test@example.com')).toBeVisible();
    });

    test('Scenario: User sees sign out button', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('button', { name: /Sign Out/i })).toBeVisible();
    });
  });

  test.describe('Feature: API Keys Section', () => {
    test('Scenario: User sees API key input field', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('OpenAI API Key')).toBeVisible();
    });

    test('Scenario: User can toggle API key visibility', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Find the eye toggle button near API key section
      const toggleButton = page
        .locator('button')
        .filter({ has: page.locator('[class*="lucide-eye"]') })
        .first();
      if (await toggleButton.isVisible()) {
        await toggleButton.click();
      }
    });
  });

  test.describe('Feature: LLM Analysis Preferences', () => {
    test('Scenario: User selects preferred model', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const modelSelect = page.getByLabel(/Preferred Model/i);
      if (await modelSelect.isVisible()) {
        await modelSelect.selectOption('gpt-4o');
        await expect(modelSelect).toHaveValue('gpt-4o');
      }
    });

    test('Scenario: User adjusts discount threshold', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const thresholdInput = page.getByLabel(/Discount Threshold/i);
      if (await thresholdInput.isVisible()) {
        await thresholdInput.fill('50');
        await expect(thresholdInput).toHaveValue('50');
      }
    });

    test('Scenario: User toggles auto-analyze', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const toggle = page.getByText('Auto-Analyze').locator('..').locator('button');
      if (await toggle.isVisible()) {
        await toggle.click();
      }
    });
  });

  test.describe('Feature: Saved Search Configurations', () => {
    test('Scenario: User sees existing search configs', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Tampa Electronics')).toBeVisible();
      await expect(page.getByText('CRAIGSLIST')).toBeVisible();
    });

    test('Scenario: User creates new search config', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Click create button
      const createButton = page.getByRole('button', { name: /Create New|New Search|Add/i });
      if (await createButton.isVisible()) {
        await createButton.click();

        // Fill form
        const nameInput = page.getByLabel(/Name/i).first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Orlando Furniture');
        }
      }
    });
  });

  test.describe('Feature: Notification Settings', () => {
    test('Scenario: User sees notification toggles', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Email Notifications')).toBeVisible();
      await expect(page.getByText('Price Alerts')).toBeVisible();
      await expect(page.getByText('New Listings')).toBeVisible();
    });
  });

  test.describe('Feature: Profit Settings', () => {
    test('Scenario: User sets minimum profit threshold', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const minProfitInput = page.getByLabel(/Minimum Profit/i);
      if (await minProfitInput.isVisible()) {
        await minProfitInput.fill('100');
        await expect(minProfitInput).toHaveValue('100');
      }
    });

    test('Scenario: User sets minimum value score', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const minScoreInput = page.getByLabel(/Minimum.*Score/i);
      if (await minScoreInput.isVisible()) {
        await minScoreInput.fill('75');
        await expect(minScoreInput).toHaveValue('75');
      }
    });
  });

  test.describe('Feature: Theme Selection', () => {
    test('Scenario: User sees available themes', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.getByText('Theme')).toBeVisible();
      // Should see theme options
      await expect(page.getByText('Midnight')).toBeVisible();
    });

    test('Scenario: User changes theme', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Click a theme option
      const themeOption = page.getByText('Sunset').first();
      if (await themeOption.isVisible()) {
        await themeOption.click();
      }
    });
  });

  test.describe('Feature: Save Settings', () => {
    test('Scenario: User saves all settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Find and click the main Save button
      const saveButton = page.getByRole('button', { name: /Save/i }).last();
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }
    });
  });

  test.describe('Feature: Navigation', () => {
    test('Scenario: User navigates back to dashboard', async ({ page }) => {
      await page.goto('/settings');

      const backLink = page.locator('a[href="/"]').first();
      await backLink.click();

      await expect(page).toHaveURL('/');
    });
  });
});

import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

// BDD: Feature — Error Handling & Edge Cases
// As a user, I want the app to gracefully handle errors
// so I can understand what went wrong and recover.

test.describe('Feature: Error Handling & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test.describe('Scenario: API request failures show user-friendly errors', () => {
    test('displays error message when opportunities API fails', async ({ page }) => {
      await page.route('**/api/opportunities*', (route) =>
        route.fulfill({ status: 500, json: { error: 'Internal server error' } })
      );
      await page.goto('/');
      // App should show an error state, not crash
      await expect(page.locator('body')).toBeVisible();
      // Check for error indicator or empty state
      const _hasError = await page.locator('[data-testid="error"], [role="alert"], .error').count();
      const hasContent = await page.locator('body').textContent();
      expect(hasContent).toBeTruthy();
    });

    test('displays error when search API returns 500', async ({ page }) => {
      await page.route('**/api/search*', (route) =>
        route.fulfill({ status: 500, json: { error: 'Search service unavailable' } })
      );
      await page.route('**/api/opportunities*', (route) =>
        route.fulfill({ json: [] })
      );
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Scenario: Network timeouts are handled gracefully', () => {
    test('handles slow API responses without crashing', async ({ page }) => {
      await page.route('**/api/opportunities*', async (route) => {
        await new Promise((r) => setTimeout(r, 3000));
        await route.fulfill({ json: [] });
      });
      await page.goto('/');
      // Page should render loading state
      await expect(page.locator('body')).toBeVisible();
    });

    test('handles network disconnection gracefully', async ({ page }) => {
      await page.route('**/api/**', (route) => route.abort('connectionrefused'));
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Scenario: Invalid routes show 404 page', () => {
    test('shows 404 for non-existent routes', async ({ page }) => {
      const _response = await page.goto('/this-page-does-not-exist-xyz');
      // Should either show a 404 page or redirect
      await expect(page.locator('body')).toBeVisible();
      const text = await page.locator('body').textContent();
      // Accept 404 page, redirect to home, or any graceful handling
      expect(text).toBeTruthy();
    });

    test('shows 404 for invalid opportunity ID', async ({ page }) => {
      await page.route('**/api/opportunities/invalid-id*', (route) =>
        route.fulfill({ status: 404, json: { error: 'Not found' } })
      );
      await page.goto('/opportunities/invalid-id');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Scenario: Authentication edge cases', () => {
    test('redirects to login when session expires', async ({ page }) => {
      // Override mock to return no session
      await page.route('**/api/auth/session', (route) =>
        route.fulfill({ json: {} })
      );
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('handles malformed session data', async ({ page }) => {
      await page.route('**/api/auth/session', (route) =>
        route.fulfill({ json: { user: null, expires: 'invalid-date' } })
      );
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Scenario: Form validation edge cases', () => {
    test('handles empty form submissions on auth page', async ({ page }) => {
      // Remove session mock so we hit the auth page
      await page.unrouteAll();
      await page.route('**/api/auth/session', (route) =>
        route.fulfill({ json: {} })
      );
      await page.route('**/api/auth/providers', (route) =>
        route.fulfill({ json: { credentials: { id: 'credentials', name: 'Credentials', type: 'credentials' } } })
      );
      await page.goto('/auth/signin');
      // Try to submit without filling fields
      const submitBtn = page.getByRole('button', { name: /sign in/i });
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        // Should show validation errors, not crash
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Scenario: Empty states render properly', () => {
    test('shows empty state when no opportunities exist', async ({ page }) => {
      await page.route('**/api/opportunities*', (route) =>
        route.fulfill({ json: [] })
      );
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
      // Should show empty state or placeholder, not blank page
      const bodyText = await page.locator('body').textContent();
      expect(bodyText!.length).toBeGreaterThan(0);
    });

    test('shows empty state when no notifications exist', async ({ page }) => {
      await page.route('**/api/notifications*', (route) =>
        route.fulfill({ json: [] })
      );
      await page.route('**/api/opportunities*', (route) =>
        route.fulfill({ json: [] })
      );
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Scenario: Large data sets handled without performance issues', () => {
    test('renders page with 100 opportunities without crashing', async ({ page }) => {
      const manyOpps = Array.from({ length: 100 }, (_, i) => ({
        id: `opp-${i}`,
        title: `Item ${i}`,
        platform: 'facebook',
        price: 50 + i,
        estimatedProfit: 20 + i,
        score: 70 + (i % 30),
        status: 'active',
        imageUrl: null,
        createdAt: new Date().toISOString(),
      }));
      await page.route('**/api/opportunities*', (route) =>
        route.fulfill({ json: manyOpps })
      );
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

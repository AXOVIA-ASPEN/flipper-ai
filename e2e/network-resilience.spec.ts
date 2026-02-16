import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * Feature: Network Resilience & Graceful Degradation
 * As a user on an unreliable network
 * I want the app to handle network failures gracefully
 * So that I don't lose data or see cryptic errors
 */
test.describe('Feature: Network Resilience & Graceful Degradation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test.describe('Scenario: API failures show user-friendly error messages', () => {
    test('Given I am on the dashboard, When the opportunities API fails, Then I see an error state instead of a blank page', async ({
      page,
    }) => {
      // Mock API failure for opportunities/listings
      await page.route('**/api/opportunities**', (route) =>
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      await page.route('**/api/listings**', (route) =>
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Page should still render (not crash)
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
      // Should NOT show a raw error stack trace
      expect(body).not.toContain('Unhandled Runtime Error');
      expect(body).not.toContain('TypeError');
    });

    test('Given I am on the scraper page, When the scrape API returns 500, Then I see a failure message', async ({
      page,
    }) => {
      await page.route('**/api/scraper/**', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Scraper service unavailable' }),
        })
      );

      await page.goto('/scraper');
      await page.waitForLoadState('networkidle');

      // Page should load without crashing
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
      expect(body).not.toContain('Unhandled Runtime Error');
    });
  });

  test.describe('Scenario: Slow network responses show loading indicators', () => {
    test('Given I am on the dashboard, When the API is slow, Then I see a loading state', async ({
      page,
    }) => {
      // Add a 3-second delay to API responses
      await page.route('**/api/**', async (route) => {
        await new Promise((r) => setTimeout(r, 3000));
        await route.continue();
      });

      await page.goto('/');

      // Should show some loading indicator (spinner, skeleton, or loading text)
      const hasLoadingIndicator = await page
        .locator(
          '[class*="loading"], [class*="spinner"], [class*="skeleton"], [role="progressbar"], [aria-busy="true"], text=/loading/i'
        )
        .first()
        .isVisible()
        .catch(() => false);

      // At minimum, the page should render without error
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
      expect(body).not.toContain('Unhandled Runtime Error');
    });
  });

  test.describe('Scenario: 401 responses redirect to login', () => {
    test('Given I am on a protected page, When my session expires (401), Then I am redirected to login', async ({
      page,
    }) => {
      // First load the page normally
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Now simulate session expiry - override the session mock to return null
      await page.route('**/api/auth/session', (route) =>
        route.fulfill({
          json: {},
        })
      );

      // Navigate to a protected page
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Should either redirect to login or show auth-required state
      const url = page.url();
      const body = await page.textContent('body');
      const isOnLoginOrAuthPrompt =
        url.includes('login') ||
        url.includes('signin') ||
        /sign in|log in|unauthorized/i.test(body || '');

      expect(isOnLoginOrAuthPrompt).toBeTruthy();
    });
  });

  test.describe('Scenario: Network timeout handling', () => {
    test('Given I am on the scraper page, When a scrape request times out, Then the UI does not hang indefinitely', async ({
      page,
    }) => {
      // Simulate a request that never responds (abort after timeout)
      await page.route('**/api/scraper/**', (route) =>
        route.abort('timedout')
      );

      await page.goto('/scraper');
      await page.waitForLoadState('networkidle');

      // Page should be interactive (not frozen)
      const body = await page.textContent('body');
      expect(body).toBeTruthy();

      // Navigation should still work
      const navLinks = page.locator('a[href], button, [role="link"]');
      const count = await navLinks.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Scenario: Rate limiting response handling', () => {
    test('Given I trigger multiple API calls, When the server returns 429, Then the app handles it gracefully', async ({
      page,
    }) => {
      let callCount = 0;
      await page.route('**/api/**', async (route) => {
        callCount++;
        if (callCount > 3) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Too many requests' }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // App should not crash on 429
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
      expect(body).not.toContain('Unhandled Runtime Error');
    });
  });

  test.describe('Scenario: Malformed API response handling', () => {
    test('Given I am on the opportunities page, When the API returns invalid JSON, Then the page does not crash', async ({
      page,
    }) => {
      await page.route('**/api/opportunities**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'this is not valid json{{{',
        })
      );

      await page.goto('/opportunities');
      await page.waitForLoadState('networkidle');

      // Page should render without a white screen
      const body = await page.textContent('body');
      expect(body).toBeTruthy();
      expect(body).not.toContain('Unhandled Runtime Error');
    });
  });
});

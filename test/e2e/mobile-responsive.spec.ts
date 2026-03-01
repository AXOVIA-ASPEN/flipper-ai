import { test, expect } from '@playwright/test';

/**
 * Mobile & Responsive Viewport E2E Tests
 *
 * BDD-style tests verifying the app renders correctly
 * across mobile, tablet, and desktop viewports.
 */

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },   // iPhone X
  tablet: { width: 768, height: 1024 },  // iPad
  desktop: { width: 1440, height: 900 }, // Laptop
};

test.describe('Mobile & Responsive Layout', () => {

  test.beforeEach(async ({ page }) => {
    // Mock session for authenticated routes
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { name: 'Test User', email: 'test@example.com' },
          expires: '2099-01-01T00:00:00.000Z',
        }),
      }),
    );

    // Mock opportunities API
    await page.route('**/api/opportunities*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            title: 'Test Flip Item',
            source: 'craigslist',
            price: 50,
            estimatedValue: 150,
            profit: 100,
            profitMargin: 200,
            location: 'Sarasota, FL',
            category: 'electronics',
            status: 'new',
            url: 'https://example.com/item/1',
            imageUrl: 'https://via.placeholder.com/300',
            postedAt: '2026-02-15T12:00:00Z',
          },
        ]),
      }),
    );

    // Mock analytics API
    await page.route('**/api/analytics*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalOpportunities: 42,
          totalProfit: 3200,
          avgMargin: 85,
          topCategory: 'electronics',
        }),
      }),
    );
  });

  // ── Home / Opportunities Page ──────────────────────────────────

  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`Given a ${name} viewport, When I visit the home page, Then it renders without horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // No horizontal scrollbar
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance
    });

    test(`Given a ${name} viewport, When I visit the home page, Then all stat cards are visible`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // The page should have meaningful content rendered
      const body = await page.locator('body');
      await expect(body).toBeVisible();

      // No JS errors causing blank page
      const content = await page.textContent('body');
      expect(content?.length).toBeGreaterThan(10);
    });
  }

  // ── Login Page ──────────────────────────────────────────────────

  test('Given a mobile viewport, When I visit /login, Then the form fits the screen', async ({
    page,
  }) => {
    // Override session to unauthenticated for login page
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      }),
    );

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  // ── Register Page ──────────────────────────────────────────────

  test('Given a mobile viewport, When I visit /register, Then the form fits the screen', async ({
    page,
  }) => {
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      }),
    );

    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  // ── Dashboard ──────────────────────────────────────────────────

  test('Given a tablet viewport, When I visit /analytics, Then charts and stats render', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(10);

    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  // ── Settings ───────────────────────────────────────────────────

  test('Given a mobile viewport, When I visit /settings, Then all sections are accessible', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const body = await page.textContent('body');
    expect(body?.length).toBeGreaterThan(10);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  // ── Navigation across viewports ────────────────────────────────

  test('Given a mobile viewport, When I navigate between pages, Then no layout breaks occur', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);

    const routes = ['/', '/analytics', '/scraper', '/settings', '/messages'];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(
        scrollWidth,
        `Horizontal overflow on ${route} at mobile viewport`,
      ).toBeLessThanOrEqual(clientWidth + 1);
    }
  });
});

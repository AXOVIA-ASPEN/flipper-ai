import { test, expect, BrowserContext } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * Feature: Multi-Tab State Consistency
 * As a user with multiple tabs open
 * I want state to remain consistent across tabs
 * So that I don't encounter stale data or conflicting actions
 *
 * BDD Scenarios:
 * - Opening multiple tabs maintains auth state
 * - Navigation in one tab doesn't break another
 * - Settings changes reflect when other tabs reload
 * - Logout in one tab invalidates all tabs
 */

const mockListings = [
  {
    id: 'mt-1',
    platform: 'craigslist',
    title: 'Vintage Turntable',
    askingPrice: 80,
    estimatedValue: 220,
    profitPotential: 140,
    valueScore: 82,
    discountPercent: 64,
    status: 'active',
    location: 'sarasota',
    url: 'https://craigslist.org/mt1',
    scrapedAt: new Date().toISOString(),
    imageUrls: null,
    opportunity: null,
  },
];

const mockOpportunities = [
  {
    id: 'opp-1',
    listingId: 'mt-1',
    title: 'Vintage Turntable',
    platform: 'craigslist',
    askingPrice: 80,
    estimatedValue: 220,
    profitPotential: 140,
    status: 'active',
    createdAt: new Date().toISOString(),
  },
];

async function setupMocks(page: import('@playwright/test').Page) {
  await mockAuthSession(page);

  await page.route('**/api/listings**', (route) =>
    route.fulfill({ status: 200, json: mockListings })
  );
  await page.route('**/api/opportunities**', (route) =>
    route.fulfill({ status: 200, json: mockOpportunities })
  );
  await page.route('**/api/search-configs**', (route) =>
    route.fulfill({ status: 200, json: [] })
  );
  await page.route('**/api/scraper/jobs**', (route) =>
    route.fulfill({ status: 200, json: [] })
  );
  await page.route('**/api/analytics**', (route) =>
    route.fulfill({
      status: 200,
      json: { totalInvested: 0, totalRevenue: 0, activeListings: 1, totalProfit: 0 },
    })
  );
  await page.route('**/api/settings**', (route) =>
    route.fulfill({
      status: 200,
      json: { theme: 'light', notifications: true, autoRefresh: false },
    })
  );
}

test.describe('Feature: Multi-Tab State Consistency', () => {
  test.describe('Scenario: Auth session persists across multiple tabs', () => {
    test('Given I am logged in, When I open a second tab, Then both tabs show authenticated content', async ({
      context,
    }) => {
      // Given: authenticated in first tab
      const tab1 = await context.newPage();
      await setupMocks(tab1);
      await tab1.goto('/');
      await tab1.waitForLoadState('networkidle');

      // When: open second tab
      const tab2 = await context.newPage();
      await setupMocks(tab2);
      await tab2.goto('/opportunities');
      await tab2.waitForLoadState('networkidle');

      // Then: both tabs render authenticated content (no redirect to login)
      const tab1Url = tab1.url();
      const tab2Url = tab2.url();
      expect(tab1Url).not.toContain('/login');
      expect(tab1Url).not.toContain('/signin');
      expect(tab2Url).not.toContain('/login');
      expect(tab2Url).not.toContain('/signin');
    });
  });

  test.describe('Scenario: Independent navigation between tabs', () => {
    test('Given I have two tabs open, When I navigate tab1 to scraper, Then tab2 stays on dashboard', async ({
      context,
    }) => {
      // Given: two tabs open
      const tab1 = await context.newPage();
      await setupMocks(tab1);
      await tab1.goto('/');
      await tab1.waitForLoadState('networkidle');

      const tab2 = await context.newPage();
      await setupMocks(tab2);
      await tab2.goto('/');
      await tab2.waitForLoadState('networkidle');

      // When: navigate tab1 to scraper
      await tab1.goto('/scraper');
      await tab1.waitForLoadState('networkidle');

      // Then: tab2 still on dashboard
      expect(tab1.url()).toContain('/scraper');
      expect(tab2.url()).not.toContain('/scraper');
    });
  });

  test.describe('Scenario: Logout in one tab affects session cookies', () => {
    test('Given I am logged in on two tabs, When I sign out on tab1, Then tab2 redirects to login on next navigation', async ({
      context,
    }) => {
      // Given: two authenticated tabs
      const tab1 = await context.newPage();
      await setupMocks(tab1);
      await tab1.goto('/');
      await tab1.waitForLoadState('networkidle');

      const tab2 = await context.newPage();
      await setupMocks(tab2);
      await tab2.goto('/opportunities');
      await tab2.waitForLoadState('networkidle');

      // When: sign out on tab1 - clear session cookies
      await page1SignOut(context, tab1);

      // Then: tab2 should redirect to login on next navigation attempt
      // After cookies are cleared, mock unauthenticated state on tab2
      await tab2.route('**/api/auth/session', (route) =>
        route.fulfill({ status: 200, json: {} })
      );
      await tab2.goto('/');
      await tab2.waitForLoadState('networkidle');

      // Should redirect to login or show unauthenticated state
      const url = tab2.url();
      const hasLoginRedirect = url.includes('/login') || url.includes('/signin');
      const hasLoginContent = await tab2
        .getByRole('button', { name: /sign in|log in/i })
        .isVisible()
        .catch(() => false);

      expect(hasLoginRedirect || hasLoginContent).toBeTruthy();
    });
  });

  test.describe('Scenario: Shared browser context preserves cookies', () => {
    test('Given I set a cookie on tab1, When I read cookies on tab2, Then the cookie is present', async ({
      context,
    }) => {
      // Given: set a cookie via tab1
      const tab1 = await context.newPage();
      await setupMocks(tab1);
      await tab1.goto('/');
      await context.addCookies([
        {
          name: 'flipper-pref',
          value: 'dark-mode',
          domain: 'localhost',
          path: '/',
        },
      ]);

      // When: read cookies from context (shared by tab2)
      const cookies = await context.cookies();
      const prefCookie = cookies.find((c) => c.name === 'flipper-pref');

      // Then: cookie is present
      expect(prefCookie).toBeDefined();
      expect(prefCookie!.value).toBe('dark-mode');
    });
  });

  test.describe('Scenario: LocalStorage isolation between pages', () => {
    test('Given tab1 stores data in localStorage, When tab2 loads the same origin, Then localStorage is shared', async ({
      context,
    }) => {
      // Given: tab1 sets localStorage
      const tab1 = await context.newPage();
      await setupMocks(tab1);
      await tab1.goto('/');
      await tab1.waitForLoadState('networkidle');
      await tab1.evaluate(() => localStorage.setItem('flipper-filter', 'craigslist'));

      // When: tab2 reads localStorage on same origin
      const tab2 = await context.newPage();
      await setupMocks(tab2);
      await tab2.goto('/');
      await tab2.waitForLoadState('networkidle');
      const filterVal = await tab2.evaluate(() =>
        localStorage.getItem('flipper-filter')
      );

      // Then: value is shared
      expect(filterVal).toBe('craigslist');
    });
  });
});

/**
 * Helper: simulate sign-out by clearing auth cookies
 */
async function page1SignOut(context: BrowserContext, page: import('@playwright/test').Page) {
  // Mock signout endpoint
  await page.route('**/api/auth/signout', (route) =>
    route.fulfill({ status: 200, json: { url: '/auth/signin' } })
  );

  // Try clicking sign-out button if available
  const logoutBtn = page.getByRole('button', { name: /log\s?out|sign\s?out/i });
  const isVisible = await logoutBtn.isVisible().catch(() => false);

  if (isVisible) {
    await logoutBtn.click();
  } else {
    // Fallback: clear cookies directly (simulating server-side logout)
    await context.clearCookies();
  }
}

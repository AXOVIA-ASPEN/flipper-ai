import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * Feature: App Navigation & Routing
 * As a user, I want consistent navigation and proper route handling
 * so that I can move between pages and get redirected appropriately.
 */

test.describe('Navigation & Routing', () => {
  test.describe('Feature: Unauthenticated Route Protection', () => {
    test('Scenario: Unauthenticated user visiting /dashboard is redirected to login', async ({ page }) => {
      // Given I am not logged in
      // When I navigate to a protected route
      await page.goto('/dashboard');
      // Then I should be redirected to the login page (or see login prompt)
      await page.waitForLoadState('networkidle');
      const url = page.url();
      const hasAuthRedirect =
        url.includes('/login') ||
        url.includes('/auth') ||
        url.includes('/signin');
      const hasLoginContent = await page
        .getByRole('button', { name: /sign in|log in|login/i })
        .isVisible()
        .catch(() => false);
      expect(hasAuthRedirect || hasLoginContent).toBeTruthy();
    });

    test('Scenario: Unauthenticated user visiting /settings is redirected to login', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      const url = page.url();
      const redirected =
        url.includes('/login') ||
        url.includes('/auth') ||
        url.includes('/signin');
      const hasLoginUI = await page
        .getByRole('button', { name: /sign in|log in|login/i })
        .isVisible()
        .catch(() => false);
      expect(redirected || hasLoginUI).toBeTruthy();
    });

    test('Scenario: Unauthenticated user can access login page', async ({ page }) => {
      // Given I am not logged in
      // When I visit the login page
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      // Then the page loads without error
      expect(page.url()).toContain('/login');
      // And I see a form or sign-in UI
      const hasForm = await page.locator('form, [role="form"]').count();
      const hasButton = await page
        .getByRole('button', { name: /sign in|log in|login|continue/i })
        .isVisible()
        .catch(() => false);
      expect(hasForm > 0 || hasButton).toBeTruthy();
    });

    test('Scenario: Unauthenticated user can access registration page', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/register');
      const hasForm = await page.locator('form, [role="form"]').count();
      const hasButton = await page
        .getByRole('button', { name: /sign up|register|create/i })
        .isVisible()
        .catch(() => false);
      expect(hasForm > 0 || hasButton).toBeTruthy();
    });
  });

  test.describe('Feature: Authenticated Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthSession(page);
    });

    test('Scenario: Authenticated user can navigate to all main pages', async ({ page }) => {
      // Given I am logged in
      const routes = [
        { path: '/dashboard', name: 'Dashboard' },
        { path: '/opportunities', name: 'Opportunities' },
        { path: '/scraper', name: 'Scraper' },
        { path: '/messages', name: 'Messages' },
        { path: '/settings', name: 'Settings' },
      ];

      for (const route of routes) {
        // When I navigate to each main route
        await page.goto(route.path);
        await page.waitForLoadState('networkidle');
        // Then the page loads without a hard error
        const response = await page.goto(route.path);
        const status = response?.status() ?? 0;
        expect(
          status < 500,
          `${route.name} (${route.path}) returned server error ${status}`,
        ).toBeTruthy();
      }
    });

    test('Scenario: Navigation links are present and functional', async ({ page }) => {
      // Given I am on the dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Then I should see navigation elements
      const nav = page.locator('nav, [role="navigation"], aside');
      const navCount = await nav.count();
      expect(navCount, 'Expected at least one navigation element').toBeGreaterThan(0);

      // And navigation should contain links to key pages
      const navLinks = page.locator('nav a, [role="navigation"] a, aside a');
      const linkCount = await navLinks.count();
      expect(linkCount, 'Expected navigation links').toBeGreaterThan(0);
    });

    test('Scenario: Browser back/forward navigation works', async ({ page }) => {
      // Given I navigate through multiple pages
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const _firstUrl = page.url();

      await page.goto('/opportunities');
      await page.waitForLoadState('networkidle');

      // When I press browser back
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // Then I should return to the previous page
      expect(page.url()).toContain('/dashboard');

      // When I press browser forward
      await page.goForward();
      await page.waitForLoadState('networkidle');

      // Then I should go to the next page
      expect(page.url()).toContain('/opportunities');
    });
  });

  test.describe('Feature: 404 / Unknown Routes', () => {
    test('Scenario: Visiting a non-existent route shows a not-found page', async ({ page }) => {
      // Given I navigate to a route that does not exist
      const response = await page.goto('/this-page-does-not-exist-12345');
      await page.waitForLoadState('networkidle');

      // Then I should see a 404 status or a not-found message
      const status = response?.status() ?? 0;
      const bodyText = await page.textContent('body');
      const has404Indicator =
        status === 404 ||
        /not found|404|page.*doesn.t exist/i.test(bodyText ?? '');
      expect(has404Indicator, 'Expected 404 page or not-found message').toBeTruthy();
    });
  });

  test.describe('Feature: Page Titles & Meta', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthSession(page);
    });

    test('Scenario: Each page has a non-empty title', async ({ page }) => {
      const routes = ['/', '/login', '/register', '/dashboard', '/opportunities'];

      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        const title = await page.title();
        expect(
          title.length,
          `Page ${route} should have a non-empty title`,
        ).toBeGreaterThan(0);
      }
    });
  });
});

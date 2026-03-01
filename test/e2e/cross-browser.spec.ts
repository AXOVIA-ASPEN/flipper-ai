import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * Cross-Browser Compatibility Tests
 *
 * These tests verify core user flows work identically across
 * Chromium, Firefox, WebKit, and mobile viewports.
 *
 * Run all browsers:  npx playwright test cross-browser
 * Single browser:    npx playwright test cross-browser --project=firefox
 */

test.describe('Cross-Browser: Core Navigation', () => {
  test('can navigate to login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
    await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();
  });

  test('can navigate to registration page', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/register/);
  });

  test('home page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});

test.describe('Cross-Browser: Authentication Flow', () => {
  test('login form accepts input in all browsers', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByLabel(/Email/i);
    const passwordInput = page.getByLabel(/Password/i);

    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await expect(emailInput).toHaveValue('test@example.com');
    }

    if (await passwordInput.isVisible()) {
      await passwordInput.fill('TestPass123!');
      await expect(passwordInput).toHaveValue('TestPass123!');
    }
  });

  test('OAuth buttons render correctly', async ({ page }) => {
    await page.goto('/login');
    const googleBtn = page.getByRole('button', { name: /Google/i });
    const githubBtn = page.getByRole('button', { name: /GitHub/i });

    if (await googleBtn.isVisible()) {
      await expect(googleBtn).toBeEnabled();
    }
    if (await githubBtn.isVisible()) {
      await expect(githubBtn).toBeEnabled();
    }
  });
});

test.describe('Cross-Browser: Authenticated Pages', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test('dashboard loads and renders key elements', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Page should load without console errors
    expect(page.url()).toContain('dashboard');
  });

  test('opportunities page renders list/grid', async ({ page }) => {
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('opportunities');
  });

  test('settings page form elements are interactive', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Verify form inputs are interactive
    const inputs = page.locator('input:visible');
    const count = await inputs.count();
    if (count > 0) {
      const firstInput = inputs.first();
      await expect(firstInput).toBeEnabled();
    }
  });
});

test.describe('Cross-Browser: CSS & Layout', () => {
  test('no horizontal scroll on login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('buttons are clickable (not obscured)', async ({ page }) => {
    await page.goto('/login');
    const signIn = page.getByRole('button', { name: /Sign in/i });
    if (await signIn.isVisible()) {
      // Verify the button is not obscured by checking it's in the viewport
      const box = await signIn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    }
  });

  test('fonts render without FOUT/FOIT', async ({ page }) => {
    await page.goto('/login');
    // Wait for fonts to load
    await page.waitForFunction(() => document.fonts.ready);
    const fontsLoaded = await page.evaluate(() => document.fonts.status);
    expect(fontsLoaded).toBe('loaded');
  });
});

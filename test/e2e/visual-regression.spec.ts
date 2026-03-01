import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * Visual Regression Testing Suite
 *
 * Captures baseline screenshots of all key pages and compares
 * against future changes to detect unintended visual regressions.
 *
 * Usage:
 *   First run:  npx playwright test visual-regression --update-snapshots
 *   CI runs:    npx playwright test visual-regression
 *
 * Snapshots stored in: e2e/visual-regression.spec.ts-snapshots/
 */

test.describe('Visual Regression: Public Pages', () => {
  test('Login page matches baseline', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('Registration page matches baseline', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('register-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('Landing/home page matches baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe('Visual Regression: Authenticated Pages', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  test('Dashboard matches baseline', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Wait for any loading spinners to resolve
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Opportunities page matches baseline', async ({ page }) => {
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('opportunities.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Search configuration page matches baseline', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('search-config.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Messages page matches baseline', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('messages.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Settings page matches baseline', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('settings.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Notifications page matches baseline', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('notifications.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});

test.describe('Visual Regression: Responsive Layouts', () => {
  test('Login page - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Login page - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login-tablet.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test.describe('Authenticated responsive', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthSession(page);
    });

    test('Dashboard - mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });

    test('Dashboard - tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('dashboard-tablet.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    });
  });
});

test.describe('Visual Regression: Component States', () => {
  test('Login form - error state', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Trigger validation errors
    const signInButton = page.getByRole('button', { name: /Sign in/i });
    if (await signInButton.isVisible()) {
      await signInButton.click();
      await page.waitForTimeout(300);
    }

    await expect(page).toHaveScreenshot('login-error-state.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('Dark mode toggle (if available)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check if dark mode toggle exists
    const darkToggle = page.getByRole('button', { name: /dark|theme|mode/i });
    if (await darkToggle.isVisible()) {
      await darkToggle.click();
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot('login-dark-mode.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
      });
    }
  });
});

/**
 * Visual Regression Tests - Homepage
 * Author: Stephen Boyett
 * Company: Axovia AI
 *
 * These tests capture screenshots and compare them to baselines to detect
 * unintended UI changes.
 *
 * To update baselines: npx playwright test --update-snapshots
 */

import { test, expect } from '@playwright/test';

test.describe('Homepage Visual Regression', () => {
  test('should match homepage screenshot (desktop)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for hero section to be visible
    await expect(page.locator('h1')).toBeVisible();

    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match homepage hero section (desktop)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const heroSection = page.locator('main').first();
    await expect(heroSection).toBeVisible();

    await expect(heroSection).toHaveScreenshot('homepage-hero-desktop.png', {
      animations: 'disabled',
    });
  });

  test('should match homepage screenshot (mobile)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only test');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

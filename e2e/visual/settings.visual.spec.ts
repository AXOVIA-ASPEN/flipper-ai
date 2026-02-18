/**
 * Visual Regression Tests - Settings Pages
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

import { test, expect } from '@playwright/test';

test.describe('Settings Visual Regression', () => {
  test('should match account settings page', async ({ page }) => {
    await page.goto('/settings/account');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('settings-account.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match API keys settings page', async ({ page }) => {
    await page.goto('/settings/api-keys');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('settings-api-keys.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match notifications settings page', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('settings-notifications.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match settings navigation tabs', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop-only test');

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const settingsTabs = page.locator('[role="tablist"]').first();
    if (await settingsTabs.isVisible()) {
      await expect(settingsTabs).toHaveScreenshot('settings-tabs.png', {
        animations: 'disabled',
      });
    }
  });
});

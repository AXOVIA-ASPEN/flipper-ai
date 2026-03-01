/**
 * Visual Regression Tests - Authentication Pages
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

import { test, expect } from '@playwright/test';

test.describe('Auth Pages Visual Regression', () => {
  test('should match login page screenshot', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    // Wait for form to be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();

    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match signup page screenshot', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[type="email"]')).toBeVisible();

    await expect(page).toHaveScreenshot('signup-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match login form component', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.waitForLoadState('networkidle');

    const loginForm = page.locator('form').first();
    await expect(loginForm).toBeVisible();

    await expect(loginForm).toHaveScreenshot('login-form.png', {
      animations: 'disabled',
    });
  });
});

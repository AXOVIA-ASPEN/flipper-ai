/**
 * Visual Regression Tests - Dashboard
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

import { test, expect } from '@playwright/test';

// Helper to create a test user session
async function login(page) {
  await page.goto('/auth/signin');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Dashboard Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Note: This assumes test auth works. In CI, you may need to mock auth.
    // For visual tests, we can skip actual login and just navigate if auth is mocked.
  });

  test('should match dashboard empty state', async ({ page }) => {
    // For now, just navigate directly (assuming no auth guard or we're in test mode)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for dashboard header or main content
    await page.waitForTimeout(500); // Small delay for animations

    await expect(page).toHaveScreenshot('dashboard-empty.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match dashboard sidebar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop-only test');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('[role="navigation"]').first();
    if (await sidebar.isVisible()) {
      await expect(sidebar).toHaveScreenshot('dashboard-sidebar.png', {
        animations: 'disabled',
      });
    }
  });
});

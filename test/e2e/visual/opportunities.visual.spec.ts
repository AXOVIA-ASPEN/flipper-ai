/**
 * Visual Regression Tests - Opportunities Page
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

import { test, expect } from '@playwright/test';

test.describe('Opportunities Visual Regression', () => {
  test('should match opportunities page empty state', async ({ page }) => {
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('opportunities-empty.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match opportunities card component', async ({ page }) => {
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');

    // Wait for any cards to load (or empty state)
    await page.waitForTimeout(500);

    const firstCard = page.locator('[data-testid="opportunity-card"]').first();
    if (await firstCard.isVisible()) {
      await expect(firstCard).toHaveScreenshot('opportunity-card.png', {
        animations: 'disabled',
      });
    }
  });

  test('should match opportunities filters section', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop-only test');

    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');

    const filters = page.locator('[role="search"]').first();
    if (await filters.isVisible()) {
      await expect(filters).toHaveScreenshot('opportunities-filters.png', {
        animations: 'disabled',
      });
    }
  });
});

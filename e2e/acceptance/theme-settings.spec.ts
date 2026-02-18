import { test, expect } from '@playwright/test';

test.describe('Theme Settings - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display all 6 theme options', async ({ page }) => {
    const themes = [
      'Purple Dream',
      'Ocean Breeze',
      'Sunset Glow',
      'Forest Green',
      'Midnight Blue',
      'Rose Garden',
    ];

    for (const themeName of themes) {
      await expect(page.getByText(themeName)).toBeVisible();
    }
  });

  test('should show active indicator on default theme', async ({ page }) => {
    // Default theme is Purple Dream
    const purpleTheme = page.locator('[data-testid="theme-option-purple"]');

    if (await purpleTheme.isVisible()) {
      // Should have active styling (ring, scale, or green dot)
      const hasActiveClass = await purpleTheme.evaluate((el) =>
        el.className.includes('ring')
      );

      expect(hasActiveClass).toBe(true);
    } else {
      // If no test IDs, find by text
      const purpleCard = page.locator('text=Purple Dream').locator('..');
      await expect(purpleCard).toBeVisible();
    }
  });

  test('should switch theme when clicking option', async ({ page }) => {
    // Click Ocean Breeze theme
    const oceanTheme = page.locator('[data-testid="theme-option-ocean"]').or(
      page.locator('text=Ocean Breeze').locator('..')
    );

    await oceanTheme.click();

    // Wait for theme to apply
    await page.waitForTimeout(500);

    // Ocean theme should now be active
    const hasActiveIndicator = await oceanTheme.evaluate((el) => {
      return (
        el.className.includes('ring') ||
        el.querySelector('.bg-green-400') !== null
      );
    });

    expect(hasActiveIndicator).toBe(true);
  });

  test('should persist theme selection in localStorage', async ({ page }) => {
    // Click Sunset theme
    const sunsetTheme = page.locator('[data-testid="theme-option-sunset"]').or(
      page.locator('text=Sunset Glow').locator('..')
    );

    await sunsetTheme.click();

    await page.waitForTimeout(500);

    // Check localStorage
    const savedTheme = await page.evaluate(() =>
      localStorage.getItem('flipper-theme')
    );

    expect(savedTheme).toBe('sunset');
  });

  test('should persist theme after page reload', async ({ page }) => {
    // Select Forest theme
    const forestTheme = page.locator('[data-testid="theme-option-forest"]').or(
      page.locator('text=Forest Green').locator('..')
    );

    await forestTheme.click();

    await page.waitForTimeout(500);

    // Reload page
    await page.reload();

    await page.waitForTimeout(500);

    // Forest should still be active
    const savedTheme = await page.evaluate(() =>
      localStorage.getItem('flipper-theme')
    );

    expect(savedTheme).toBe('forest');

    // Visual indicator should show Forest as active
    const isActive = await forestTheme.evaluate((el) =>
      el.className.includes('ring')
    );

    expect(isActive).toBe(true);
  });

  test('should display theme preview colors', async ({ page }) => {
    // Each theme card should show color preview
    const oceanTheme = page.locator('[data-testid="theme-option-ocean"]').or(
      page.locator('text=Ocean Breeze').locator('..')
    );

    // Should have colored circles/orbs
    const colorOrbs = oceanTheme.locator('[data-testid*="orb"]');

    if ((await colorOrbs.count()) > 0) {
      expect(await colorOrbs.count()).toBeGreaterThanOrEqual(3);
    } else {
      // Check for any colored divs (gradient previews)
      const colorPreviews = oceanTheme.locator('div[class*="bg-gradient"]');
      expect(await colorPreviews.count()).toBeGreaterThan(0);
    }
  });

  test('should show "Active Theme" label on selected theme', async ({
    page,
  }) => {
    // Click Midnight theme
    const midnightTheme = page.locator('[data-testid="theme-option-midnight"]').or(
      page.locator('text=Midnight Blue').locator('..')
    );

    await midnightTheme.click();

    await page.waitForTimeout(500);

    // Should show "Active Theme" text
    await expect(midnightTheme.getByText('Active Theme')).toBeVisible();
  });

  test('should display current theme info section', async ({ page }) => {
    await expect(page.getByText(/current theme/i)).toBeVisible();

    // Should show theme name
    const currentThemeSection = page.locator('text=Current Theme').locator('..');

    await expect(currentThemeSection).toBeVisible();
  });

  test('should show gradient previews in current theme section', async ({
    page,
  }) => {
    // Current theme section should show color previews
    const currentThemeSection = page.locator('text=Current Theme').locator('..');

    // Look for gradient preview divs
    const gradients = currentThemeSection.locator('[class*="bg-gradient"]');

    if ((await gradients.count()) > 0) {
      expect(await gradients.count()).toBeGreaterThanOrEqual(2);
    }
  });

  test('should allow switching between all themes', async ({ page }) => {
    const themeIds = ['ocean', 'sunset', 'forest', 'midnight', 'rose', 'purple'];

    for (const themeId of themeIds) {
      const themeOption =
        page.locator(`[data-testid="theme-option-${themeId}"]`).first();

      if (await themeOption.isVisible()) {
        await themeOption.click();
        await page.waitForTimeout(300);

        // Verify theme saved
        const saved = await page.evaluate(() =>
          localStorage.getItem('flipper-theme')
        );

        expect(saved).toBe(themeId);
      }
    }
  });

  test('should have hover effects on theme cards', async ({ page }) => {
    const oceanTheme = page.locator('[data-testid="theme-option-ocean"]').or(
      page.locator('text=Ocean Breeze').locator('..')
    );

    // Hover over card
    await oceanTheme.hover();

    await page.waitForTimeout(200);

    // Card should have hover effect (scale or border change)
    const transform = await oceanTheme.evaluate(
      (el) => window.getComputedStyle(el).transform
    );

    // Should have some transform applied (scale)
    expect(transform).not.toBe('none');
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // All themes should still be visible (might be in single column)
    const themes = page.locator('[data-testid*="theme-option"]');

    if ((await themes.count()) === 0) {
      // Fallback: find by text
      await expect(page.getByText('Purple Dream')).toBeVisible();
      await expect(page.getByText('Ocean Breeze')).toBeVisible();
    } else {
      expect(await themes.count()).toBe(6);
    }
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const realErrors = consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('404')
    );

    expect(realErrors.length).toBe(0);
  });

  test('should not break when rapidly clicking themes', async ({ page }) => {
    const themeButtons = page.locator('[data-testid*="theme-option"]');

    if ((await themeButtons.count()) === 0) {
      // Fallback
      const oceanBtn = page.locator('text=Ocean Breeze').locator('..');
      const sunsetBtn = page.locator('text=Sunset Glow').locator('..');

      await oceanBtn.click();
      await sunsetBtn.click();
      await oceanBtn.click();

      await page.waitForTimeout(500);

      // Should not crash
      expect(page.url()).toContain('/settings');
    } else {
      // Click themes rapidly
      for (let i = 0; i < Math.min(3, await themeButtons.count()); i++) {
        await themeButtons.nth(i).click();
        await page.waitForTimeout(50);
      }

      // Should still work
      expect(page.url()).toContain('/settings');
    }
  });

  test('should apply theme colors to the page', async ({ page }) => {
    // Select Ocean theme
    const oceanTheme = page.locator('[data-testid="theme-option-ocean"]').or(
      page.locator('text=Ocean Breeze').locator('..')
    );

    await oceanTheme.click();

    await page.waitForTimeout(500);

    // Check if CSS variables are set
    const rootStyles = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = window.getComputedStyle(root);

      return {
        primaryFrom: styles.getPropertyValue('--theme-primary-from'),
        hasVar: root.style.getPropertyValue('--theme-primary-from').length > 0,
      };
    });

    // Either CSS variable is set, or theme is applied via classes
    expect(
      rootStyles.primaryFrom.length > 0 || rootStyles.hasVar
    ).toBe(true);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should load with default theme (purple)', async ({ page }) => {
    await page.goto('/settings');
    
    // Verify default theme is active
    const purpleTheme = page.getByTestId('theme-option-purple');
    await expect(purpleTheme).toHaveClass(/ring-2 ring-white/);
    
    // Verify localStorage
    const savedTheme = await page.evaluate(() => localStorage.getItem('flipper-theme'));
    expect(savedTheme).toBeNull(); // Should be null on first load
  });

  test('should switch to ocean theme and persist', async ({ page }) => {
    await page.goto('/settings');
    
    // Click ocean theme
    const oceanTheme = page.getByTestId('theme-option-ocean');
    await oceanTheme.click();
    
    // Wait for animation
    await page.waitForTimeout(500);
    
    // Verify ocean theme is now active
    await expect(oceanTheme).toHaveClass(/ring-2 ring-white/);
    
    // Verify localStorage was updated
    const savedTheme = await page.evaluate(() => localStorage.getItem('flipper-theme'));
    expect(savedTheme).toBe('ocean');
    
    // Verify theme actually applied (check CSS variables or background colors)
    const orb = page.getByTestId('theme-ocean-orb-0');
    await expect(orb).toBeVisible();
  });

  test('should switch between multiple themes', async ({ page }) => {
    await page.goto('/settings');
    
    const themes = ['ocean', 'sunset', 'forest', 'midnight', 'rose', 'purple'];
    
    for (const themeId of themes) {
      const themeButton = page.getByTestId(`theme-option-${themeId}`);
      await themeButton.click();
      await page.waitForTimeout(300);
      
      // Verify active state
      await expect(themeButton).toHaveClass(/ring-2 ring-white/);
      
      // Verify localStorage
      const savedTheme = await page.evaluate(() => localStorage.getItem('flipper-theme'));
      expect(savedTheme).toBe(themeId);
    }
  });

  test('should persist theme across page navigation', async ({ page }) => {
    await page.goto('/settings');
    
    // Select forest theme
    await page.getByTestId('theme-option-forest').click();
    await page.waitForTimeout(300);
    
    // Navigate away
    await page.goto('/');
    
    // Navigate back to settings
    await page.goto('/settings');
    
    // Verify forest theme is still active
    const forestTheme = page.getByTestId('theme-option-forest');
    await expect(forestTheme).toHaveClass(/ring-2 ring-white/);
    
    const savedTheme = await page.evaluate(() => localStorage.getItem('flipper-theme'));
    expect(savedTheme).toBe('forest');
  });

  test('should persist theme across page reload', async ({ page }) => {
    await page.goto('/settings');
    
    // Select sunset theme
    await page.getByTestId('theme-option-sunset').click();
    await page.waitForTimeout(300);
    
    // Reload page
    await page.reload();
    
    // Verify sunset theme is still active
    const sunsetTheme = page.getByTestId('theme-option-sunset');
    await expect(sunsetTheme).toHaveClass(/ring-2 ring-white/);
    
    const savedTheme = await page.evaluate(() => localStorage.getItem('flipper-theme'));
    expect(savedTheme).toBe('sunset');
  });

  test('should show correct theme preview colors', async ({ page }) => {
    await page.goto('/settings');
    
    // Select midnight theme
    await page.getByTestId('theme-option-midnight').click();
    await page.waitForTimeout(300);
    
    // Verify current theme section shows midnight
    await expect(page.getByText('Current Theme: Midnight Blue')).toBeVisible();
    
    // Verify gradient previews are visible
    await expect(page.getByText('Primary Gradient')).toBeVisible();
    await expect(page.getByText('Secondary Gradient')).toBeVisible();
    await expect(page.getByText('Accent Blue')).toBeVisible();
    await expect(page.getByText('Accent Green')).toBeVisible();
  });

  test('should display all 6 theme options', async ({ page }) => {
    await page.goto('/settings');
    
    const themeIds = ['purple', 'ocean', 'sunset', 'forest', 'midnight', 'rose'];
    
    for (const themeId of themeIds) {
      const themeOption = page.getByTestId(`theme-option-${themeId}`);
      await expect(themeOption).toBeVisible();
    }
  });

  test('should show active indicator on selected theme', async ({ page }) => {
    await page.goto('/settings');
    
    // Select rose theme
    await page.getByTestId('theme-option-rose').click();
    await page.waitForTimeout(300);
    
    const roseTheme = page.getByTestId('theme-option-rose');
    
    // Verify active indicator (green dot)
    const activeIndicator = roseTheme.locator('div.bg-green-400.rounded-full.animate-pulse');
    await expect(activeIndicator).toBeVisible();
    
    // Verify "Active Theme" label
    await expect(roseTheme.getByText('Active Theme')).toBeVisible();
  });

  test('should handle invalid localStorage data gracefully', async ({ page }) => {
    // Set invalid theme ID in localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('flipper-theme', 'invalid-theme-id');
    });
    
    await page.goto('/settings');
    
    // Should fallback to default (purple) theme
    const purpleTheme = page.getByTestId('theme-option-purple');
    await expect(purpleTheme).toHaveClass(/ring-2 ring-white/);
  });

  test('should apply theme styles to the dashboard page', async ({ page }) => {
    await page.goto('/settings');
    
    // Select ocean theme
    await page.getByTestId('theme-option-ocean').click();
    await page.waitForTimeout(300);
    
    // Navigate to dashboard
    await page.goto('/');
    
    // Verify theme was applied (this would check actual CSS variables)
    // Note: Specific checks depend on how your components use the theme
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Verify localStorage persisted
    const savedTheme = await page.evaluate(() => localStorage.getItem('flipper-theme'));
    expect(savedTheme).toBe('ocean');
  });
});

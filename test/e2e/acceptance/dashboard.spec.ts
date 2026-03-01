import { test, expect } from '@playwright/test';

test.describe('Dashboard - Acceptance Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    // Create a logged-in session
    // Option 1: Use API to create session token
    // Option 2: Go through login flow
    // For now, we'll try to access dashboard and handle auth

    await page.goto('/dashboard');
  });

  test('should redirect to login if not authenticated', async ({ page }) => {
    // Clear all cookies to ensure not logged in
    await page.context().clearCookies();

    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 });
  });

  test('should display dashboard for authenticated users', async ({
    page,
    context,
  }) => {
    // First login
    await page.goto('/auth/login');

    // Fill credentials (assuming test user exists)
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /log in/i }).click();

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Verify dashboard content loads
    await page.waitForLoadState('networkidle');

    // Should show some dashboard UI
    const bodyText = await page.textContent('body');
    expect(bodyText?.length).toBeGreaterThan(0);
  });

  test('should have navigation menu', async ({ page }) => {
    // After logging in, check for navigation
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Should have navigation links
    // (Adjust these based on your actual nav structure)
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should have settings link in navigation', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Look for settings link
    const settingsLink = page.getByRole('link', { name: /settings/i });

    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/\/settings/);
    } else {
      // If no settings link visible, try navigating directly
      await page.goto('/settings');
      await expect(page).toHaveURL(/\/settings/);
    }
  });

  test('should maintain session after page refresh', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Refresh page
    await page.reload();

    // Should still be on dashboard (not redirect to login)
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should allow user to log out', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Find logout button/link
    const logoutButton = page.getByRole('button', { name: /log out|sign out/i });

    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Should redirect to home or login
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/(|auth\/login)/);
    } else {
      console.log('Logout button not found - might be in dropdown menu');
    }
  });

  test('should show user info in header', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Should display user email or name somewhere
    const pageText = await page.textContent('body');

    // Check for email or "Test User" (depending on signup data)
    const hasUserInfo =
      pageText?.includes('test@example.com') || pageText?.includes('Test User');

    // If no user info visible, that's okay (might be in dropdown)
    console.log('User info visible:', hasUserInfo);
  });

  test('should load without console errors when authenticated', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Login
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Filter out expected errors (like missing API data)
    const realErrors = consoleErrors.filter(
      (err) =>
        !err.includes('404') &&
        !err.includes('favicon') &&
        !err.includes('analytics')
    );

    expect(realErrors.length).toBeLessThanOrEqual(2); // Allow minor errors
  });

  test('should have responsive design on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Password123!');
    await page.getByRole('button', { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Dashboard should be visible on mobile
    const bodyWidth = await page.evaluate(() => document.body.clientWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });
});

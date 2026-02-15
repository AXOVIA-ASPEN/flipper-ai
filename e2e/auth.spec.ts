import { test, expect } from '@playwright/test';
import { TEST_USER, mockAuthSession } from './fixtures/auth';

test.describe('Authentication', () => {
  test.describe('Feature: User Login', () => {
    test('Scenario: Given a user on the login page, When they see the form, Then all login elements are visible', async ({ page }) => {
      await page.goto('/login');

      // Brand header
      await expect(page.getByText('Flipper.ai')).toBeVisible();
      await expect(page.getByText('Welcome back')).toBeVisible();

      // OAuth buttons
      await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Continue with GitHub/i })).toBeVisible();

      // Email form fields
      await expect(page.getByLabel(/Email/i)).toBeVisible();
      await expect(page.getByLabel(/Password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible();

      // Registration link
      await expect(page.getByRole('link', { name: /Create one free/i })).toBeVisible();
    });

    test('Scenario: Given a user on the login page, When they submit empty form, Then validation prevents submission', async ({ page }) => {
      await page.goto('/login');

      // HTML5 required validation should prevent submission
      const emailInput = page.getByLabel(/Email/i);
      await expect(emailInput).toHaveAttribute('required', '');

      const passwordInput = page.getByLabel(/Password/i);
      await expect(passwordInput).toHaveAttribute('required', '');
    });

    test('Scenario: Given a user on the login page, When they enter invalid credentials, Then an error message appears', async ({ page }) => {
      // Mock the signIn endpoint to return an error
      await page.route('**/api/auth/callback/credentials', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ url: '/login?error=CredentialsSignin' }),
        });
      });
      await page.route('**/api/auth/csrf', async (route) => {
        await route.fulfill({
          json: { csrfToken: 'test-csrf-token' },
        });
      });
      await page.route('**/api/auth/providers', async (route) => {
        await route.fulfill({
          json: {
            credentials: { id: 'credentials', name: 'Credentials', type: 'credentials' },
          },
        });
      });

      await page.goto('/login');
      await page.getByLabel(/Email/i).fill('bad@example.com');
      await page.getByLabel(/Password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /Sign in/i }).click();

      // Wait for error message
      await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 5000 });
    });

    test('Scenario: Given a user on the login page, When they toggle password visibility, Then the password field type changes', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.getByPlaceholder(/Enter your password/i);
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click the eye toggle button (it's adjacent to the password input)
      const toggleButton = page.locator('input[type="password"] + button, button:has(svg)').last();
      // More reliable: find button inside the password field's parent
      const passwordContainer = passwordInput.locator('..');
      const eyeButton = passwordContainer.locator('button');
      await eyeButton.click();

      await expect(passwordInput).toHaveAttribute('type', 'text');
    });

    test('Scenario: Given a user on the login page, When they click "Create one free", Then they navigate to registration', async ({ page }) => {
      await page.goto('/login');
      const registerLink = page.getByRole('link', { name: /Create one free/i });
      await expect(registerLink).toHaveAttribute('href', '/register');
    });
  });

  test.describe('Feature: User Registration', () => {
    test('Scenario: Given a visitor, When they navigate to register, Then the registration page loads', async ({ page }) => {
      await page.goto('/register');

      // Page should load without errors
      await expect(page).toHaveURL(/\/register/);
    });
  });

  test.describe('Feature: Protected Routes', () => {
    test('Scenario: Given an unauthenticated user, When they visit a protected page, Then they are redirected to login', async ({ page }) => {
      // Don't mock auth — leave unauthenticated
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({ json: {} });
      });

      await page.goto('/opportunities');

      // Should redirect to sign-in or show unauthenticated state
      // (exact behavior depends on middleware config)
      await page.waitForTimeout(2000);
      const url = page.url();
      const isRedirected = url.includes('signin') || url.includes('login');
      const hasAuthPrompt = await page.getByText(/sign in/i).isVisible().catch(() => false);

      expect(isRedirected || hasAuthPrompt).toBeTruthy();
    });

    test('Scenario: Given an authenticated user, When they visit a protected page, Then content loads normally', async ({ page }) => {
      await mockAuthSession(page);
      await page.goto('/opportunities');

      // Should NOT be redirected to login
      await page.waitForTimeout(1000);
      expect(page.url()).not.toContain('signin');
    });
  });
});

import { test, expect } from '@playwright/test';
import { TEST_USER } from './fixtures/auth';

test.describe('Password Reset', () => {
  test.describe('Feature: Forgot Password Flow', () => {
    test('Scenario: Given a user on the login page, When they click "Forgot password", Then they see the reset form', async ({
      page,
    }) => {
      await page.goto('/login');

      // Find and click the forgot password link
      const forgotLink = page.getByRole('link', { name: /Forgot/i });
      await expect(forgotLink).toBeVisible();
      await forgotLink.click();

      // Should navigate to a reset/forgot page
      await expect(page).toHaveURL(/forgot|reset/i);

      // Should show an email input and submit button
      await expect(page.getByLabel(/Email/i)).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Reset|Send|Submit/i })
      ).toBeVisible();
    });

    test('Scenario: Given a user on the forgot password page, When they submit an empty email, Then validation prevents submission', async ({
      page,
    }) => {
      await page.goto('/login');

      const forgotLink = page.getByRole('link', { name: /Forgot/i });
      // If no forgot link on /login, try /auth/signin
      if (!(await forgotLink.isVisible().catch(() => false))) {
        await page.goto('/auth/signin');
      }
      await page.getByRole('link', { name: /Forgot/i }).click();

      // Click submit without entering email
      await page.getByRole('button', { name: /Reset|Send|Submit/i }).click();

      // Email field should show validation (required or error)
      const emailInput = page.getByLabel(/Email/i);
      const isInvalid =
        (await emailInput.getAttribute('aria-invalid')) === 'true' ||
        (await emailInput.evaluate(
          (el: HTMLInputElement) => !el.validity.valid
        ));
      expect(isInvalid).toBeTruthy();
    });

    test('Scenario: Given a user on the forgot password page, When they submit a valid email, Then a success message appears', async ({
      page,
    }) => {
      // Mock the password reset API endpoint
      await page.route('**/api/auth/forgot-password', async (route) => {
        await route.fulfill({
          status: 200,
          json: { message: 'Reset link sent' },
        });
      });

      // Also mock generic NextAuth CSRF
      await page.route('**/api/auth/csrf', async (route) => {
        await route.fulfill({
          json: { csrfToken: 'test-csrf-token' },
        });
      });

      await page.goto('/login');
      const forgotLink = page.getByRole('link', { name: /Forgot/i });
      if (!(await forgotLink.isVisible().catch(() => false))) {
        await page.goto('/auth/signin');
      }
      await page.getByRole('link', { name: /Forgot/i }).click();

      // Fill in a valid email and submit
      await page.getByLabel(/Email/i).fill(TEST_USER.email);
      await page.getByRole('button', { name: /Reset|Send|Submit/i }).click();

      // Should show a success/confirmation message
      await expect(
        page.getByText(/sent|check your email|reset link|instructions/i)
      ).toBeVisible({ timeout: 5000 });
    });

    test('Scenario: Given a user on the forgot password page, When they submit an invalid email format, Then an error appears', async ({
      page,
    }) => {
      await page.goto('/login');
      const forgotLink = page.getByRole('link', { name: /Forgot/i });
      if (!(await forgotLink.isVisible().catch(() => false))) {
        await page.goto('/auth/signin');
      }
      await page.getByRole('link', { name: /Forgot/i }).click();

      // Enter invalid email format
      await page.getByLabel(/Email/i).fill('not-an-email');
      await page.getByRole('button', { name: /Reset|Send|Submit/i }).click();

      // Should show validation error
      const emailInput = page.getByLabel(/Email/i);
      const isInvalid =
        (await emailInput.getAttribute('aria-invalid')) === 'true' ||
        (await emailInput.evaluate(
          (el: HTMLInputElement) => !el.validity.valid
        )) ||
        (await page.getByText(/invalid|valid email/i).isVisible().catch(() => false));
      expect(isInvalid).toBeTruthy();
    });
  });

  test.describe('Feature: Reset Password Page', () => {
    test('Scenario: Given a user visits the reset page with a token, When the page loads, Then they see the new password form', async ({
      page,
    }) => {
      // Navigate to the reset page with a mock token
      await page.goto('/auth/reset-password?token=mock-reset-token');

      // Should show password fields
      const passwordFields = page.getByLabel(/password/i);
      const fieldCount = await passwordFields.count();

      // At minimum should have a new password field (possibly confirm too)
      expect(fieldCount).toBeGreaterThanOrEqual(1);

      // Should have a submit button
      await expect(
        page.getByRole('button', { name: /Reset|Update|Change|Submit|Save/i })
      ).toBeVisible();
    });

    test('Scenario: Given a user on the reset page, When they submit mismatched passwords, Then an error appears', async ({
      page,
    }) => {
      await page.goto('/auth/reset-password?token=mock-reset-token');

      const passwordFields = page.getByLabel(/password/i);
      const fieldCount = await passwordFields.count();

      if (fieldCount >= 2) {
        // Fill mismatched passwords
        await passwordFields.first().fill('NewPassword123!');
        await passwordFields.nth(1).fill('DifferentPassword456!');
        await page
          .getByRole('button', { name: /Reset|Update|Change|Submit|Save/i })
          .click();

        // Should show mismatch error
        await expect(
          page.getByText(/match|mismatch|don't match|do not match/i)
        ).toBeVisible({ timeout: 3000 });
      }
    });

    test('Scenario: Given a user on the reset page, When they submit a valid new password, Then they see a success message or redirect', async ({
      page,
    }) => {
      // Mock the reset password API
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 200,
          json: { message: 'Password updated successfully' },
        });
      });

      await page.goto('/auth/reset-password?token=mock-reset-token');

      const passwordFields = page.getByLabel(/password/i);
      const fieldCount = await passwordFields.count();

      await passwordFields.first().fill('NewSecurePassword123!');
      if (fieldCount >= 2) {
        await passwordFields.nth(1).fill('NewSecurePassword123!');
      }

      await page
        .getByRole('button', { name: /Reset|Update|Change|Submit|Save/i })
        .click();

      // Should redirect to login or show success
      await expect(page).toHaveURL(/login|signin|success/i, { timeout: 5000 }).catch(async () => {
        // Or show a success message on the same page
        await expect(
          page.getByText(/success|updated|changed|reset complete/i)
        ).toBeVisible({ timeout: 3000 });
      });
    });
  });

  test.describe('Feature: Reset Link with Invalid Token', () => {
    test('Scenario: Given a user visits the reset page with an expired/invalid token, When the API rejects it, Then an error is shown', async ({
      page,
    }) => {
      // Mock the token validation to return an error
      await page.route('**/api/auth/reset-password', async (route) => {
        await route.fulfill({
          status: 400,
          json: { error: 'Invalid or expired token' },
        });
      });

      await page.route('**/api/auth/verify-token*', async (route) => {
        await route.fulfill({
          status: 400,
          json: { error: 'Token expired' },
        });
      });

      await page.goto('/auth/reset-password?token=expired-token');

      const passwordFields = page.getByLabel(/password/i);
      const fieldCount = await passwordFields.count();

      if (fieldCount >= 1) {
        await passwordFields.first().fill('NewPassword123!');
        if (fieldCount >= 2) {
          await passwordFields.nth(1).fill('NewPassword123!');
        }
        await page
          .getByRole('button', { name: /Reset|Update|Change|Submit|Save/i })
          .click();
      }

      // Should show an error about invalid/expired token
      await expect(
        page.getByText(/expired|invalid|error|failed/i)
      ).toBeVisible({ timeout: 5000 });
    });
  });
});

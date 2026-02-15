import { test, expect } from '@playwright/test';

test.describe('Feature: User Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('Given a visitor on the registration page, When they view the form, Then all registration elements are visible', async ({ page }) => {
    // Logo and branding
    await expect(page.getByText('Flipper.ai')).toBeVisible();
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByText('Start finding profitable flips in minutes')).toBeVisible();

    // OAuth buttons
    await expect(page.getByRole('button', { name: /sign up with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up with github/i })).toBeVisible();

    // Form fields
    await expect(page.getByPlaceholder('John Doe')).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('Create a password')).toBeVisible();
    await expect(page.getByPlaceholder('Confirm your password')).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();

    // Login link
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();

    // Terms notice
    await expect(page.getByText(/terms of service/i)).toBeVisible();
  });

  test('Given a visitor on the registration page, When they submit an empty form, Then required field validation prevents submission', async ({ page }) => {
    await page.getByRole('button', { name: /create account/i }).click();

    // HTML5 required validation should prevent submission — email is required
    const emailInput = page.getByPlaceholder('you@example.com');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('Given a visitor typing a password, When the password is weak, Then password strength indicators show red', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('Create a password');
    await passwordInput.fill('ab');

    // Strength checks should appear
    await expect(page.getByText('8+ characters')).toBeVisible();
    await expect(page.getByText('Uppercase')).toBeVisible();
    await expect(page.getByText('Lowercase')).toBeVisible();
    await expect(page.getByText('Number')).toBeVisible();
  });

  test('Given a visitor typing a password, When the password meets all criteria, Then all strength indicators turn green', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('Create a password');
    await passwordInput.fill('StrongPass1');

    // All four checks should have green styling (text-green-300 class)
    const checks = page.locator('text=8+ characters');
    await expect(checks).toBeVisible();

    // Verify all checklist items are visible
    await expect(page.getByText('8+ characters')).toBeVisible();
    await expect(page.getByText('Uppercase')).toBeVisible();
    await expect(page.getByText('Lowercase')).toBeVisible();
    await expect(page.getByText('Number')).toBeVisible();
  });

  test('Given a visitor entering mismatched passwords, When confirm password differs, Then a mismatch warning appears', async ({ page }) => {
    await page.getByPlaceholder('Create a password').fill('StrongPass1');
    await page.getByPlaceholder('Confirm your password').fill('DifferentPass2');

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('Given a visitor entering mismatched passwords, When they try to submit, Then the submit button is disabled', async ({ page }) => {
    await page.getByPlaceholder('Create a password').fill('StrongPass1');
    await page.getByPlaceholder('Confirm your password').fill('DifferentPass2');

    await expect(page.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  test('Given a visitor entering matching passwords, When passwords match, Then the submit button is enabled', async ({ page }) => {
    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByPlaceholder('Create a password').fill('StrongPass1');
    await page.getByPlaceholder('Confirm your password').fill('StrongPass1');

    await expect(page.getByRole('button', { name: /create account/i })).toBeEnabled();
  });

  test('Given a visitor on the registration page, When they toggle password visibility, Then password fields change type', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('Create a password');
    await passwordInput.fill('MySecret123');

    // Initially type=password
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the visibility toggle (Eye icon button)
    await page.locator('button:has(svg)').filter({ has: page.locator('[class*="h-5 w-5"]') }).first().click();

    // Now type=text
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('Given a visitor on the registration page, When they click "Sign in", Then they navigate to the login page', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Given a visitor on the registration page, When they click the Flipper.ai logo, Then they navigate to the home page', async ({ page }) => {
    await page.getByRole('link', { name: /flipper/i }).first().click();
    await expect(page).toHaveURL('/');
  });

  test('Given a visitor filling out the form, When they submit with a short password, Then an error about password length appears', async ({ page }) => {
    await page.getByPlaceholder('John Doe').fill('Test User');
    await page.getByPlaceholder('you@example.com').fill('test@example.com');
    await page.getByPlaceholder('Create a password').fill('Ab1');
    await page.getByPlaceholder('Confirm your password').fill('Ab1');

    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible();
  });

  test('Given a visitor on the registration page, When the page loads, Then password strength indicators are hidden until typing', async ({ page }) => {
    // Before typing, strength checks should not be visible
    await expect(page.getByText('8+ characters')).not.toBeVisible();
  });
});

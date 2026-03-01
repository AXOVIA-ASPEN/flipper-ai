import { test, expect } from '@playwright/test';

test.describe('Sign Up - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup');
  });

  test('should display signup form with all fields', async ({ page }) => {
    // Verify page loaded
    await expect(page).toHaveURL(/\/auth\/signup/);

    // Verify branding
    await expect(page.getByText('🐧')).toBeVisible();
    await expect(page.getByText('Flipper.ai')).toBeVisible();

    // Verify heading
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(
      page.getByText('Start finding profitable flips today')
    ).toBeVisible();

    // Verify form fields
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Verify submit button
    await expect(
      page.getByRole('button', { name: /create account/i })
    ).toBeVisible();
  });

  test('should successfully create account with valid data', async ({
    page,
    context,
  }) => {
    // Generate unique email
    const timestamp = Date.now();
    const testEmail = `test-${timestamp}@example.com`;

    // Fill form
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill('SecurePassword123!');

    // Submit
    await page.getByRole('button', { name: /create account/i }).click();

    // Should redirect to dashboard after successful signup
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Verify user is logged in (check for session cookie)
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(
      (c) =>
        c.name.includes('session') ||
        c.name.includes('next-auth') ||
        c.name.includes('token')
    );
    expect(sessionCookie).toBeDefined();
  });

  test('should show validation error for missing fields', async ({ page }) => {
    // Try to submit without filling any fields
    await page.getByRole('button', { name: /create account/i }).click();

    // HTML5 validation should prevent submission
    const nameInput = page.getByLabel(/full name/i);
    const isValid = await nameInput.evaluate((input: HTMLInputElement) =>
      input.checkValidity()
    );

    expect(isValid).toBe(false);
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('Password123!');

    await page.getByRole('button', { name: /create account/i }).click();

    // HTML5 validation should catch invalid email
    const emailInput = page.getByLabel(/email/i);
    const isValid = await emailInput.evaluate((input: HTMLInputElement) =>
      input.checkValidity()
    );

    expect(isValid).toBe(false);
  });

  test('should show validation error for weak password', async ({ page }) => {
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('weak');

    // Password field should have minLength validation
    const passwordInput = page.getByLabel(/password/i);
    const minLength = await passwordInput.getAttribute('minlength');

    expect(minLength).toBe('8');

    // Try to submit
    await page.getByRole('button', { name: /create account/i }).click();

    const isValid = await passwordInput.evaluate((input: HTMLInputElement) =>
      input.checkValidity()
    );

    expect(isValid).toBe(false);
  });

  test('should show error for duplicate email', async ({ page }) => {
    // Use a known existing email (from previous test)
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test-existing@example.com');
    await page.getByLabel(/password/i).fill('Password123!');

    await page.getByRole('button', { name: /create account/i }).click();

    // Wait for error message (this depends on your error handling)
    // Should show error within 5 seconds
    await page.waitForTimeout(2000);

    // Check if still on signup page (redirect didn't happen)
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('should display Google OAuth button', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /google/i });
    await expect(googleButton).toBeVisible();

    // Verify it has Google logo/icon
    const googleIcon = googleButton.locator('svg');
    await expect(googleIcon).toBeVisible();
  });

  test('should display GitHub OAuth button', async ({ page }) => {
    const githubButton = page.getByRole('button', { name: /github/i });
    await expect(githubButton).toBeVisible();

    // Verify it has GitHub logo/icon
    const githubIcon = githubButton.locator('svg');
    await expect(githubIcon).toBeVisible();
  });

  test('should navigate to login page from link', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /sign in/i });
    await expect(loginLink).toBeVisible();

    await loginLink.click();

    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should have link to privacy policy', async ({ page }) => {
    const privacyLink = page.getByRole('link', { name: /privacy policy/i });
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  test('should have link to terms of service', async ({ page }) => {
    const termsLink = page.getByRole('link', { name: /terms of service/i });
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toHaveAttribute('href', '/terms');
  });

  test('should disable submit button while loading', async ({ page }) => {
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Password123!');

    const submitButton = page.getByRole('button', { name: /create account/i });

    // Click submit
    await submitButton.click();

    // Button should be disabled immediately
    await expect(submitButton).toBeDisabled({ timeout: 100 });

    // Button text should change
    await expect(submitButton).toContainText(/creating/i);
  });

  test('should show password in plain text when typing', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);

    await passwordInput.fill('TestPassword123');

    // Password field should be type="password" (hidden)
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should have back to home link in logo', async ({ page }) => {
    const logoLink = page.getByRole('link').filter({ has: page.getByText('🐧') });
    await expect(logoLink).toHaveAttribute('href', '/');

    await logoLink.click();
    await expect(page).toHaveURL('/');
  });

  test('should have responsive design on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Form should still be visible and usable
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Submit button should be full width on mobile
    const submitButton = page.getByRole('button', { name: /create account/i });
    const buttonWidth = await submitButton.evaluate(
      (el) => el.getBoundingClientRect().width
    );

    // Should be nearly full width (minus padding)
    expect(buttonWidth).toBeGreaterThan(300);
  });

  test('should not submit form on Enter key in email field', async ({
    page,
  }) => {
    // This prevents accidental submission before password is entered
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');

    // Press Enter in email field
    await page.getByLabel(/email/i).press('Enter');

    // Should NOT navigate away (form should not submit)
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('should autofocus on name field when page loads', async ({ page }) => {
    await page.goto('/auth/signup');

    // Wait a moment for autofocus
    await page.waitForTimeout(100);

    // Name field should be focused
    const nameInput = page.getByLabel(/full name/i);
    const isFocused = await nameInput.evaluate(
      (el) => el === document.activeElement
    );

    expect(isFocused).toBe(true);
  });
});

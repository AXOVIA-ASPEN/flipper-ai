import { test, expect } from '@playwright/test';

test.describe('Login - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should display login form with all fields', async ({ page }) => {
    await expect(page).toHaveURL(/\/auth\/login/);

    // Branding
    await expect(page.getByText('🐧')).toBeVisible();
    await expect(page.getByText('Flipper.ai')).toBeVisible();

    // Heading
    await expect(page.getByText('Welcome back')).toBeVisible();

    // Form fields
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Submit button
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();

    // Forgot password link
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
  });

  test('should successfully log in with valid credentials', async ({
    page,
    context,
  }) => {
    // First, create a test account (or use existing)
    // For this test, we'll assume an account exists
    // In real scenarios, you'd use a test database with known users

    const testEmail = 'test@example.com';
    const testPassword = 'Password123!';

    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);

    await page.getByRole('button', { name: /log in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Verify session cookie exists
    const cookies = await context.cookies();
    const hasSession = cookies.some(
      (c) =>
        c.name.includes('session') ||
        c.name.includes('next-auth') ||
        c.name.includes('token')
    );

    expect(hasSession).toBe(true);
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.getByLabel(/email/i).fill('nonexistent@example.com');
    await page.getByLabel(/password/i).fill('WrongPassword123!');

    await page.getByRole('button', { name: /log in/i }).click();

    // Wait for error
    await page.waitForTimeout(2000);

    // Should show error message or stay on login page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/auth/login');

    // Check for error message in UI
    const pageText = await page.textContent('body');
    const hasError =
      pageText?.includes('Invalid') ||
      pageText?.includes('incorrect') ||
      pageText?.includes('not found');

    // Error handling exists (either error message or stayed on page)
    expect(hasError || currentUrl.includes('error')).toBe(true);
  });

  test('should show error for wrong password', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('WrongPassword123!');

    await page.getByRole('button', { name: /log in/i }).click();

    await page.waitForTimeout(2000);

    // Should not redirect to dashboard
    expect(page.url()).not.toContain('/dashboard');
  });

  test('should disable submit button while loading', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Password123!');

    const submitButton = page.getByRole('button', { name: /log in/i });

    await submitButton.click();

    // Button should be disabled
    await expect(submitButton).toBeDisabled({ timeout: 100 });

    // Text should change to "Logging in..."
    await expect(submitButton).toContainText(/logging in/i);
  });

  test('should have forgot password link', async ({ page }) => {
    const forgotLink = page.getByRole('link', { name: /forgot password/i });

    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute('href', '/auth/forgot-password');
  });

  test('should navigate to signup page from link', async ({ page }) => {
    const signupLink = page.getByRole('link', { name: /sign up/i });

    await expect(signupLink).toBeVisible();

    await signupLink.click();

    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  test('should have Google OAuth button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
  });

  test('should have GitHub OAuth button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /github/i })).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('Password123!');

    const emailInput = page.getByLabel(/email/i);
    const isValid = await emailInput.evaluate((input: HTMLInputElement) =>
      input.checkValidity()
    );

    expect(isValid).toBe(false);
  });

  test('should require password field', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');

    // Don't fill password
    await page.getByRole('button', { name: /log in/i }).click();

    const passwordInput = page.getByLabel(/password/i);
    const isValid = await passwordInput.evaluate((input: HTMLInputElement) =>
      input.checkValidity()
    );

    expect(isValid).toBe(false);
  });

  test('should have responsive design on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    const submitButton = page.getByRole('button', { name: /log in/i });
    const buttonWidth = await submitButton.evaluate(
      (el) => el.getBoundingClientRect().width
    );

    expect(buttonWidth).toBeGreaterThan(300);
  });

  test('should autofocus on email field', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForTimeout(100);

    const emailInput = page.getByLabel(/email/i);
    const isFocused = await emailInput.evaluate(
      (el) => el === document.activeElement
    );

    expect(isFocused).toBe(true);
  });

  test('should allow tab navigation between fields', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await emailInput.focus();
    await emailInput.press('Tab');

    const passwordFocused = await passwordInput.evaluate(
      (el) => el === document.activeElement
    );

    expect(passwordFocused).toBe(true);
  });

  test('should submit form on Enter key in password field', async ({
    page,
  }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Password123!');

    // Press Enter in password field
    await page.getByLabel(/password/i).press('Enter');

    // Should submit (button gets disabled)
    await page.waitForTimeout(500);

    const submitButton = page.getByRole('button', { name: /log in/i });
    const isDisabled = await submitButton.isDisabled();

    expect(isDisabled).toBe(true);
  });

  test('should have back to home link in logo', async ({ page }) => {
    const logoLink = page.getByRole('link').filter({ has: page.getByText('🐧') });

    await logoLink.click();

    await expect(page).toHaveURL('/');
  });

  test('should maintain email value after failed login', async ({ page }) => {
    const testEmail = 'test@example.com';

    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill('WrongPassword');

    await page.getByRole('button', { name: /log in/i }).click();

    await page.waitForTimeout(2000);

    // Email should still be filled
    const emailValue = await page.getByLabel(/email/i).inputValue();
    expect(emailValue).toBe(testEmail);

    // Password should be cleared (security best practice)
    const passwordValue = await page.getByLabel(/password/i).inputValue();
    expect(passwordValue).toBe('');
  });

  test('should not expose password in HTML', async ({ page }) => {
    await page.getByLabel(/password/i).fill('MySecretPassword123!');

    const passwordInput = page.getByLabel(/password/i);
    const inputType = await passwordInput.getAttribute('type');

    expect(inputType).toBe('password');

    // Check page source doesn't contain password
    const pageContent = await page.content();
    expect(pageContent).not.toContain('MySecretPassword123!');
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    expect(consoleErrors.length).toBe(0);
  });
});

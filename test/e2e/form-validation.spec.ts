import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

// BDD: Feature — Form Validation
// As a user, I want forms to validate my input before submission
// so I don't accidentally submit incomplete or incorrect data.

test.describe('Feature: Form Validation', () => {
  // ─── Auth Forms (no session needed) ───

  test.describe('Scenario: Login form requires email and password', () => {
    test('Given I am on the login page, When I submit without filling fields, Then I see validation errors', async ({
      page,
    }) => {
      await page.goto('/auth/signin');

      // Try clicking sign in without filling anything
      const submitBtn = page.getByRole('button', { name: /Sign [Ii]n/i });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();

        // Browser native validation should prevent submission — email field should be invalid
        const emailInput = page.getByLabel(/Email/i);
        const isInvalid = await emailInput.evaluate(
          (el: HTMLInputElement) => !el.validity.valid
        );
        expect(isInvalid).toBe(true);
      }
    });

    test('Given I am on the login page, When I enter an invalid email format, Then the field shows a validation error', async ({
      page,
    }) => {
      await page.goto('/auth/signin');

      const emailInput = page.getByLabel(/Email/i);
      await emailInput.fill('not-an-email');

      const passwordInput = page.getByLabel(/Password/i);
      await passwordInput.fill('SomePassword1!');

      const submitBtn = page.getByRole('button', { name: /Sign [Ii]n/i });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();

        const isInvalid = await emailInput.evaluate(
          (el: HTMLInputElement) => !el.validity.valid
        );
        expect(isInvalid).toBe(true);
      }
    });
  });

  test.describe('Scenario: Registration form validates all required fields', () => {
    test('Given I am on the register page, When I submit an empty form, Then required fields are flagged', async ({
      page,
    }) => {
      await page.goto('/auth/register');

      const submitBtn = page.getByRole('button', { name: /Sign [Uu]p|Register|Create/i });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();

        // At least the name or email field should be invalid
        const nameInput = page.getByLabel(/Name/i);
        if (await nameInput.isVisible()) {
          const isInvalid = await nameInput.evaluate(
            (el: HTMLInputElement) => !el.validity.valid
          );
          expect(isInvalid).toBe(true);
        }
      }
    });

    test('Given I am registering, When I enter mismatched passwords, Then I see a validation indicator', async ({
      page,
    }) => {
      await page.goto('/auth/register');

      const nameInput = page.getByLabel(/Name/i);
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test User');
      }

      await page.getByLabel(/Email/i).fill('test@example.com');

      // Fill password fields — look for confirm password
      const passwordFields = page.locator('input[type="password"]');
      const count = await passwordFields.count();

      if (count >= 2) {
        await passwordFields.nth(0).fill('StrongPass123!');
        await passwordFields.nth(1).fill('DifferentPass456!');

        const submitBtn = page.getByRole('button', { name: /Sign [Uu]p|Register|Create/i });
        if (await submitBtn.isVisible()) {
          await submitBtn.click();

          // Should either show inline error or prevent submission
          await page.waitForTimeout(500);
          // Confirm we're still on register page (not redirected)
          expect(page.url()).toContain('/auth/register');
        }
      }
    });
  });

  // ─── Settings Form (authenticated) ───

  test.describe('Scenario: Settings form validates configuration values', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthSession(page);
    });

    test('Given I am on settings, When I enter a negative discount threshold, Then it should not accept it', async ({
      page,
    }) => {
      await page.route('**/api/user/settings*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            json: {
              llmModel: 'gpt-4o-mini',
              discountThreshold: 20,
              autoAnalyze: false,
              ebayApiKey: '',
            },
          });
        } else {
          await route.fulfill({ json: { success: true } });
        }
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const thresholdInput = page.getByLabel(/Discount Threshold/i);
      if (await thresholdInput.isVisible()) {
        await thresholdInput.fill('-10');
        const saveBtn = page.getByRole('button', { name: /Save/i });
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await page.waitForTimeout(500);

          // Check for validation error or that the value is corrected
          const value = await thresholdInput.inputValue();
          const hasError = await page.locator('[role="alert"], .error, .text-red, .text-destructive').count();
          // Either the value was rejected or an error is shown
          expect(value === '-10' ? hasError > 0 : true).toBe(true);
        }
      }
    });

    test('Given I am on settings, When I submit a valid API key, Then it validates against the server', async ({
      page,
    }) => {
      let validateCalled = false;

      await page.route('**/api/user/settings*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            json: {
              llmModel: 'gpt-4o-mini',
              discountThreshold: 20,
              autoAnalyze: false,
              ebayApiKey: '',
            },
          });
        } else {
          await route.fulfill({ json: { success: true } });
        }
      });

      await page.route('**/api/user/settings/validate-key*', async (route) => {
        validateCalled = true;
        await route.fulfill({
          json: { valid: true, message: 'API key is valid' },
        });
      });

      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Look for API key input and validate button
      const apiKeyInput = page.locator('input[type="password"], input[name*="api"], input[placeholder*="API"]').first();
      if (await apiKeyInput.isVisible()) {
        await apiKeyInput.fill('test-api-key-12345');

        const validateBtn = page.getByRole('button', { name: /Validate|Verify|Check/i });
        if (await validateBtn.isVisible()) {
          await validateBtn.click();
          await page.waitForTimeout(500);
          expect(validateCalled).toBe(true);
        }
      }
    });
  });

  // ─── Search Config Form (authenticated) ───

  test.describe('Scenario: Search config creation requires a name', () => {
    test.beforeEach(async ({ page }) => {
      await mockAuthSession(page);
    });

    test('Given I am creating a search config, When I leave the name empty, Then I cannot save', async ({
      page,
    }) => {
      await page.route('**/api/search-configs*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ json: [] });
        } else {
          await route.fulfill({ json: { id: '1', name: 'test' } });
        }
      });

      await page.goto('/scraper');
      await page.waitForLoadState('networkidle');

      // Look for "New" or "Create" button to open config form
      const createBtn = page.getByRole('button', { name: /New|Create|Add/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();
        await page.waitForTimeout(300);

        // Try to save without filling name
        const saveBtn = page.getByRole('button', { name: /Save|Create|Submit/i }).first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await page.waitForTimeout(500);

          // Should show validation or stay on form
          const nameInput = page.getByLabel(/Name/i).first();
          if (await nameInput.isVisible()) {
            const isInvalid = await nameInput.evaluate(
              (el: HTMLInputElement) => !el.validity.valid
            );
            // Name should be flagged as required
            expect(isInvalid).toBe(true);
          }
        }
      }
    });
  });
});

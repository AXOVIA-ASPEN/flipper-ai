import { test, expect } from '@playwright/test';

/**
 * Feature: User Onboarding Wizard (BDD)
 *
 * As a new Flipper AI user
 * I want to be guided through an onboarding wizard
 * So that I can configure my preferences before using the app
 *
 * Route under test: /onboarding
 *
 * These tests mock the onboarding API and check the wizard UI flow.
 */

test.describe('Feature: Onboarding Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept onboarding API calls
    await page.route('**/api/user/onboarding', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { onboardingComplete: false, onboardingStep: 1, totalSteps: 6 },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { onboardingComplete: false, onboardingStep: 2, totalSteps: 6 },
          }),
        });
      }
    });
  });

  test.describe('Scenario: New user sees step 1 (Welcome)', () => {
    test('Given I am a new user, When I visit /onboarding, Then I see the Welcome step', async ({
      page,
    }) => {
      // When
      await page.goto('/onboarding');

      // Then
      await expect(page.getByText('Step 1 of 6')).toBeVisible();
      await expect(page.getByText('Welcome to Flipper AI')).toBeVisible();
      await expect(page.getByText(/Welcome!/)).toBeVisible();
    });
  });

  test.describe('Scenario: Progress bar shows correct percentage', () => {
    test('Given I am on step 1, When I view the wizard, Then progress bar shows ~17%', async ({
      page,
    }) => {
      // Given / When
      await page.goto('/onboarding');

      // Then – progress bar should reflect step 1/6
      const progressbar = page.getByRole('progressbar');
      await expect(progressbar).toBeVisible();
      await expect(progressbar).toHaveAttribute('aria-valuenow', '17');
    });
  });

  test.describe('Scenario: User can advance to next step', () => {
    test('Given I am on step 1, When I click Continue, Then I see step 2', async ({ page }) => {
      // Given
      await page.goto('/onboarding');
      await expect(page.getByText('Step 1 of 6')).toBeVisible();

      // When
      await page.getByRole('button', { name: /Continue/i }).click();

      // Then
      await expect(page.getByText('Step 2 of 6')).toBeVisible();
      await expect(page.getByText('Choose Your Marketplaces')).toBeVisible();
    });
  });

  test.describe('Scenario: Marketplaces step shows all platforms', () => {
    test('Given I advance to step 2, When I view it, Then I see all marketplace options', async ({
      page,
    }) => {
      // Given
      await page.goto('/onboarding');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Then
      await expect(page.getByText('eBay')).toBeVisible();
      await expect(page.getByText('Facebook Marketplace')).toBeVisible();
      await expect(page.getByText('Craigslist')).toBeVisible();
      await expect(page.getByText('OfferUp')).toBeVisible();
      await expect(page.getByText('Mercari')).toBeVisible();
    });
  });

  test.describe('Scenario: Continue is disabled until marketplace selected', () => {
    test('Given I am on step 2 with no selection, Then Continue button is disabled', async ({
      page,
    }) => {
      // Given
      await page.goto('/onboarding');
      await page.getByRole('button', { name: /Continue/i }).click();

      // Then – no marketplace selected → Continue should be disabled
      const continueBtn = page.getByRole('button', { name: /Continue/i });
      await expect(continueBtn).toBeDisabled();
    });
  });

  test.describe('Scenario: Skip button completes onboarding', () => {
    test('Given I am on step 1, When I click Skip setup, Then onboarding ends', async ({
      page,
    }) => {
      // Override the POST to simulate complete=true
      await page.route('**/api/user/onboarding', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { onboardingComplete: true, onboardingStep: 6, totalSteps: 6 },
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { onboardingComplete: false, onboardingStep: 1, totalSteps: 6 },
            }),
          });
        }
      });

      // Given
      await page.goto('/onboarding');

      // When
      await page.getByRole('button', { name: /Skip setup/i }).click();

      // Then – redirected to dashboard
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Scenario: Already-completed onboarding redirects to dashboard', () => {
    test('Given onboarding is already complete, When I visit /onboarding, Then I am redirected', async ({
      page,
    }) => {
      // Override GET to return complete
      await page.route('**/api/user/onboarding', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { onboardingComplete: true, onboardingStep: 6, totalSteps: 6 },
          }),
        });
      });

      // When
      await page.goto('/onboarding');

      // Then
      await expect(page).toHaveURL('/');
    });
  });
});

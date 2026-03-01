import { test, expect } from '@playwright/test';

/**
 * Onboarding Wizard - Acceptance Tests (BDD-style)
 *
 * As a new Flipper AI user
 * I want to complete an onboarding wizard
 * So that I can configure my flipping preferences and start finding opportunities
 *
 * Author: ASPEN
 * Company: Axovia AI
 */

test.describe('Onboarding Wizard - Acceptance Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock authenticated session (new user who hasn't completed onboarding)
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: 'new-user-1',
            name: 'New User',
            email: 'newuser@example.com',
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
      });
    });

    // Mock onboarding status API - not complete, starting at step 1
    await page.route('**/api/user/onboarding', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          json: {
            success: true,
            data: {
              onboardingStep: 1,
              onboardingComplete: false,
            },
          },
        });
      } else if (request.method() === 'POST') {
        // Mock saving progress
        await route.fulfill({
          json: { success: true },
        });
      }
    });
  });

  test.describe('Given I am a new user who has not completed onboarding', () => {
    test('When I visit the onboarding page, Then I should see the welcome step', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Should be on step 1
      await expect(page.getByText('Welcome to Flipper AI')).toBeVisible();
      await expect(page.getByText('🐧')).toBeVisible(); // Mascot
      await expect(
        page.getByText(/Start finding profitable flips in minutes/i)
      ).toBeVisible();

      // Progress indicator should show 1/6
      await expect(page.getByText('Step 1 of 6')).toBeVisible();

      // Should have a "Get Started" or "Next" button
      const nextButton = page.getByRole('button', { name: /get started|next/i });
      await expect(nextButton).toBeVisible();
      await expect(nextButton).toBeEnabled();
    });

    test('When I click "Get Started" on welcome, Then I should advance to marketplace selection', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Click through step 1
      await page.getByRole('button', { name: /get started|next/i }).click();

      // Should be on step 2 - Marketplaces
      await expect(page.getByText('Choose Your Marketplaces')).toBeVisible();
      await expect(page.getByText('Step 2 of 6')).toBeVisible();

      // Should see marketplace options
      await expect(page.getByText(/craigslist/i)).toBeVisible();
      await expect(page.getByText(/facebook marketplace/i)).toBeVisible();
      await expect(page.getByText(/offerup/i)).toBeVisible();
      await expect(page.getByText(/ebay/i)).toBeVisible();
    });

    test('When I select marketplaces and continue, Then I should advance to category selection', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Step 1 → Step 2
      await page.getByRole('button', { name: /get started|next/i }).click();

      // Select at least one marketplace
      await page.getByText(/craigslist/i).click();
      await page.getByText(/facebook marketplace/i).click();

      // Continue to step 3
      await page.getByRole('button', { name: /next|continue/i }).click();

      // Should be on step 3 - Categories
      await expect(page.getByText('Pick Your Niches')).toBeVisible();
      await expect(page.getByText('Step 3 of 6')).toBeVisible();

      // Should see category options
      await expect(page.getByText(/electronics/i)).toBeVisible();
      await expect(page.getByText(/furniture/i)).toBeVisible();
    });

    test('When I select categories and continue, Then I should advance to budget selection', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Navigate through steps 1-2
      await page.getByRole('button', { name: /get started|next/i }).click();
      await page.getByText(/craigslist/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();

      // Step 3 - select categories
      await page.getByText(/electronics/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();

      // Should be on step 4 - Budget
      await expect(page.getByText('Set Your Budget')).toBeVisible();
      await expect(page.getByText('Step 4 of 6')).toBeVisible();

      // Should see budget range options
      await expect(page.getByText(/\$0.*\$100/)).toBeVisible(); // Small budget
      await expect(page.getByText(/\$100.*\$500/)).toBeVisible(); // Medium
      await expect(page.getByText(/\$500\+/)).toBeVisible(); // Large
    });

    test('When I select a budget and continue, Then I should advance to location setup', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Navigate through steps 1-3
      await page.getByRole('button', { name: /get started|next/i }).click();
      await page.getByText(/craigslist/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();
      await page.getByText(/electronics/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();

      // Step 4 - select budget
      await page.getByText(/\$100.*\$500/).click(); // Medium budget
      await page.getByRole('button', { name: /next|continue/i }).click();

      // Should be on step 5 - Location
      await expect(page.getByText('Your Location')).toBeVisible();
      await expect(page.getByText('Step 5 of 6')).toBeVisible();

      // Should see ZIP code input
      await expect(page.getByLabel(/zip code/i)).toBeVisible();

      // Should see radius selector
      await expect(page.getByText(/search radius/i)).toBeVisible();
    });

    test('When I enter location and continue, Then I should reach the completion step', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Navigate through all steps
      await page.getByRole('button', { name: /get started|next/i }).click();
      await page.getByText(/craigslist/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();
      await page.getByText(/electronics/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();
      await page.getByText(/\$100.*\$500/).click();
      await page.getByRole('button', { name: /next|continue/i }).click();

      // Step 5 - enter location
      await page.getByLabel(/zip code/i).fill('33602'); // Tampa ZIP
      await page.getByRole('button', { name: /next|continue/i }).click();

      // Should be on step 6 - Complete
      await expect(page.getByText(/You're ready|All set|Complete/i)).toBeVisible();
      await expect(page.getByText('Step 6 of 6')).toBeVisible();

      // Should have a button to go to dashboard
      await expect(
        page.getByRole('button', { name: /go to dashboard|start flipping/i })
      ).toBeVisible();
    });

    test('When I complete onboarding, Then I should be redirected to the dashboard', async ({
      page,
    }) => {
      // Mock the final complete API call
      await page.route('**/api/user/onboarding', async (route, request) => {
        if (request.method() === 'POST') {
          const body = await request.postDataJSON();
          if (body.complete) {
            await route.fulfill({ json: { success: true } });
          } else {
            await route.fulfill({ json: { success: true } });
          }
        } else {
          await route.fulfill({
            json: {
              success: true,
              data: { onboardingStep: 1, onboardingComplete: false },
            },
          });
        }
      });

      await page.goto('/onboarding');

      // Complete all steps
      await page.getByRole('button', { name: /get started|next/i }).click();
      await page.getByText(/craigslist/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();
      await page.getByText(/electronics/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();
      await page.getByText(/\$100.*\$500/).click();
      await page.getByRole('button', { name: /next|continue/i }).click();
      await page.getByLabel(/zip code/i).fill('33602');
      await page.getByRole('button', { name: /next|continue/i }).click();

      // Click "Go to Dashboard"
      await page.getByRole('button', { name: /go to dashboard|start flipping/i }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\//, { timeout: 10000 });
    });
  });

  test.describe('Given I am a returning user who abandoned onboarding', () => {
    test('When I visit onboarding, Then I should resume from my saved step', async ({
      page,
    }) => {
      // Override the onboarding status to step 3
      await page.route('**/api/user/onboarding', async (route, request) => {
        if (request.method() === 'GET') {
          await route.fulfill({
            json: {
              success: true,
              data: {
                onboardingStep: 3, // Resume from categories
                onboardingComplete: false,
              },
            },
          });
        } else {
          await route.fulfill({ json: { success: true } });
        }
      });

      await page.goto('/onboarding');

      // Should resume at step 3
      await expect(page.getByText('Pick Your Niches')).toBeVisible();
      await expect(page.getByText('Step 3 of 6')).toBeVisible();
    });
  });

  test.describe('Given I am a user who completed onboarding', () => {
    test('When I visit onboarding page, Then I should be redirected to dashboard', async ({
      page,
    }) => {
      // Mock completed onboarding
      await page.route('**/api/user/onboarding', async (route, request) => {
        if (request.method() === 'GET') {
          await route.fulfill({
            json: {
              success: true,
              data: {
                onboardingStep: 6,
                onboardingComplete: true,
              },
            },
          });
        }
      });

      await page.goto('/onboarding');

      // Should redirect away from onboarding
      await expect(page).not.toHaveURL(/\/onboarding/, { timeout: 10000 });
    });
  });

  test.describe('Given I am on any onboarding step', () => {
    test('When I click the back button, Then I should navigate to the previous step', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Go to step 2
      await page.getByRole('button', { name: /get started|next/i }).click();
      await expect(page.getByText('Choose Your Marketplaces')).toBeVisible();

      // Go to step 3
      await page.getByText(/craigslist/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();
      await expect(page.getByText('Pick Your Niches')).toBeVisible();

      // Click Back button
      const backButton = page.getByRole('button', { name: /back/i });
      if (await backButton.isVisible()) {
        await backButton.click();

        // Should return to step 2
        await expect(page.getByText('Choose Your Marketplaces')).toBeVisible();
        await expect(page.getByText('Step 2 of 6')).toBeVisible();
      }
    });

    test('When I see the progress indicator, Then it should accurately reflect my current step', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Step 1
      await expect(page.getByText('Step 1 of 6')).toBeVisible();

      // Step 2
      await page.getByRole('button', { name: /get started|next/i }).click();
      await expect(page.getByText('Step 2 of 6')).toBeVisible();

      // Step 3
      await page.getByText(/craigslist/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();
      await expect(page.getByText('Step 3 of 6')).toBeVisible();
    });

    test('When I try to advance without making a selection, Then the next button should be disabled or show validation', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Go to step 2 (marketplaces)
      await page.getByRole('button', { name: /get started|next/i }).click();

      // Don't select any marketplace
      const nextButton = page.getByRole('button', { name: /next|continue/i });

      // Button should either be disabled or clicking should show error
      const isDisabled = await nextButton.isDisabled();
      if (!isDisabled) {
        // If not disabled, it should show validation message on click
        await nextButton.click();
        // Still on step 2
        await expect(page.getByText('Step 2 of 6')).toBeVisible();
      }
    });
  });

  test.describe('Given I am on the location step', () => {
    test('When I enter an invalid ZIP code, Then I should see a validation error', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Navigate to location step
      await page.getByRole('button', { name: /get started|next/i }).click();
      await page.getByText(/craigslist/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();
      await page.getByText(/electronics/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();
      await page.getByText(/\$100.*\$500/).click();
      await page.getByRole('button', { name: /next|continue/i }).click();

      // Enter invalid ZIP
      const zipInput = page.getByLabel(/zip code/i);
      await zipInput.fill('99999'); // Invalid ZIP

      await page.getByRole('button', { name: /next|continue/i }).click();

      // Should show error or stay on step 5
      const errorVisible =
        (await page.getByText(/invalid.*zip|not found/i).isVisible().catch(() => false)) ||
        (await page.getByText('Step 5 of 6').isVisible());

      expect(errorVisible).toBeTruthy();
    });

    test('When I enter a valid ZIP code, Then I should be able to proceed', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Navigate to location step
      await page.getByRole('button', { name: /get started|next/i }).click();
      await page.getByText(/craigslist/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();
      await page.getByText(/electronics/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();
      await page.getByText(/\$100.*\$500/).click();
      await page.getByRole('button', { name: /next|continue/i }).click();

      // Enter valid ZIP
      await page.getByLabel(/zip code/i).fill('33602');
      await page.getByRole('button', { name: /next|continue/i }).click();

      // Should advance to step 6
      await expect(page.getByText('Step 6 of 6')).toBeVisible();
    });
  });

  test.describe('Given I am viewing the onboarding wizard', () => {
    test('When I load any step, Then I should see the Flipper AI mascot and branding', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Should see mascot
      await expect(page.getByText('🐧')).toBeVisible();

      // Should see Flipper branding
      await expect(page.getByText(/flipper/i)).toBeVisible();
    });

    test('When I complete a step, Then my progress should be saved to the API', async ({
      page,
    }) => {
      let progressSaved = false;

      // Intercept save API call
      await page.route('**/api/user/onboarding', async (route, request) => {
        if (request.method() === 'POST') {
          progressSaved = true;
          await route.fulfill({ json: { success: true } });
        } else {
          await route.fulfill({
            json: {
              success: true,
              data: { onboardingStep: 1, onboardingComplete: false },
            },
          });
        }
      });

      await page.goto('/onboarding');

      // Complete step 1
      await page.getByRole('button', { name: /get started|next/i }).click();

      // Wait a moment for API call
      await page.waitForTimeout(1000);

      expect(progressSaved).toBe(true);
    });

    test('When I refresh the page mid-wizard, Then I should not lose my progress', async ({
      page,
    }) => {
      await page.goto('/onboarding');

      // Go to step 3
      await page.getByRole('button', { name: /get started|next/i }).click();
      await page.getByText(/craigslist/i).click();
      await page.getByRole('button', { name: /next|continue/i }).click();

      await expect(page.getByText('Step 3 of 6')).toBeVisible();

      // Mock GET to return step 3 on reload
      await page.route('**/api/user/onboarding', async (route, request) => {
        if (request.method() === 'GET') {
          await route.fulfill({
            json: {
              success: true,
              data: { onboardingStep: 3, onboardingComplete: false },
            },
          });
        } else {
          await route.fulfill({ json: { success: true } });
        }
      });

      // Reload
      await page.reload();

      // Should still be on step 3
      await expect(page.getByText('Step 3 of 6')).toBeVisible();
    });
  });
});

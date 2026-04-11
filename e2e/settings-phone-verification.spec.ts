/**
 * @file e2e/settings-phone-verification.spec.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-10
 * @version 1.0
 * @brief Playwright E2E tests for phone verification UI and SMS gating (Story 11.2).
 *
 * @description
 * Covers the two UI-visible Acceptance Criteria from Story 11.2 that service-level
 * Cucumber tests cannot exercise:
 *
 *   AC-1: Phone number verification flow (enter number → receive code → verify)
 *   AC-5: SMS master toggle is disabled with prompt when phone is unverified
 *
 * Strategy: The Settings page is a plain Next.js Server Component — it renders
 * without a server-side auth redirect and delegates all data fetching to client
 * components that call /api/user/settings. We intercept those API calls via
 * page.route() to control the UI state, then assert real DOM interactions.
 *
 * All network calls to /api/user/phone/send-code and /api/user/phone/verify are
 * also intercepted so no real Twilio or database activity occurs.
 */

import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base settings payload returned by GET /api/user/settings. */
function makeSettings(overrides: Partial<SettingsPayload> = {}): { success: true; data: SettingsPayload } {
  return {
    success: true,
    data: {
      id: 'settings-1',
      userId: 'user-test',
      openaiApiKey: null,
      hasOpenaiApiKey: false,
      llmModel: 'gpt-4o-mini',
      discountThreshold: 50,
      autoAnalyze: true,
      emailNotifications: true,
      notifyNewDeals: true,
      notifyPriceDrops: true,
      notifySoldItems: true,
      notifyExpiring: true,
      notifyWeeklyDigest: false,
      notifyFrequency: 'instant',
      opportunityThreshold: 70,
      feeRateEbay: 13.0,
      feeRateMercari: 10.0,
      feeRateFacebook: 5.0,
      feeRateOfferup: 12.9,
      feeRateCraigslist: 0.0,
      homeLocation: null,
      maxPickupRadiusMiles: 50,
      holdingCostDailyRate: 2.0,
      messageApprovalRequired: false,
      pushNotifications: false,
      phoneNumber: null,
      phoneVerified: false,
      smsNotifications: false,
      notifyMessageReceived: true,
      notifyDraftReady: true,
      notifyMessageSent: false,
      notifyReviewReceived: true,
      notifyFlipGoneCold: true,
      notifyFlipTurnedHot: true,
      notifyPriceChanges: true,
      flipGoneColdHours: 24,
      flipTurnedHotCount: 3,
      notifyListingUnavailable: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      user: { id: 'user-test', email: 'test@example.com', name: 'Test User', image: null, subscriptionTier: 'FREE' },
      ...overrides,
    },
  };
}

interface SettingsPayload {
  [key: string]: unknown;
  phoneNumber: string | null;
  phoneVerified: boolean;
  smsNotifications: boolean;
}

/** Intercept GET /api/user/settings with the given payload. */
async function mockSettingsGet(page: Page, payload: ReturnType<typeof makeSettings>) {
  await page.route('/api/user/settings', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    }
    return route.continue();
  });
}

// ---------------------------------------------------------------------------
// AC-5: SMS toggle is disabled with prompt when phone is unverified
// ---------------------------------------------------------------------------

test.describe('AC-5: SMS toggle gating', () => {
  test('SMS master toggle is disabled with verification prompt when phone is not verified', async ({ page }) => {
    await mockSettingsGet(page, makeSettings({ phoneNumber: null, phoneVerified: false, smsNotifications: false }));

    await page.goto('/settings');

    // Wait for the NotificationSettings component to render
    await page.waitForSelector('text=SMS Text Alerts', { timeout: 10_000 });

    // The SMS toggle switch should be disabled (aria-disabled or opacity-50/cursor-not-allowed)
    const smsToggle = page.getByRole('switch', { name: 'Toggle SMS notifications' });
    await expect(smsToggle).toBeDisabled();

    // The verification prompt should be visible
    await expect(page.getByText('Verify your phone number to enable SMS alerts')).toBeVisible();
  });

  test('SMS master toggle title tooltip describes the verification requirement', async ({ page }) => {
    await mockSettingsGet(page, makeSettings({ phoneNumber: null, phoneVerified: false, smsNotifications: false }));

    await page.goto('/settings');
    await page.waitForSelector('text=SMS Text Alerts', { timeout: 10_000 });

    const smsToggle = page.getByRole('switch', { name: 'Toggle SMS notifications' });
    await expect(smsToggle).toHaveAttribute('title', 'Verify your phone number to enable SMS alerts');
  });

  test('SMS master toggle is enabled once phone is verified', async ({ page }) => {
    await mockSettingsGet(page, makeSettings({
      phoneNumber: '+12025551234',
      phoneVerified: true,
      smsNotifications: false,
    }));

    // Mock PATCH for the toggle
    await page.route('/api/user/settings', (route) => {
      if (route.request().method() === 'PATCH') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(makeSettings({ phoneNumber: '+12025551234', phoneVerified: true, smsNotifications: true })),
        });
      }
      return route.continue();
    });

    await page.goto('/settings');
    await page.waitForSelector('text=SMS Text Alerts', { timeout: 10_000 });

    const smsToggle = page.getByRole('switch', { name: 'Toggle SMS notifications' });
    await expect(smsToggle).not.toBeDisabled();
    await expect(page.getByText('Verify your phone number to enable SMS alerts')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AC-1: Phone number verification flow
// ---------------------------------------------------------------------------

test.describe('AC-1: Phone verification UI flow', () => {
  test('phone input and Send Code button are visible before verification', async ({ page }) => {
    await mockSettingsGet(page, makeSettings({ phoneNumber: null, phoneVerified: false }));

    await page.goto('/settings');
    await page.waitForSelector('text=SMS Text Alerts', { timeout: 10_000 });

    // Phone number input should be rendered in the idle state
    const phoneInput = page.getByLabel('Phone number for SMS notifications');
    await expect(phoneInput).toBeVisible();

    const sendCodeButton = page.getByRole('button', { name: 'Send Code' });
    await expect(sendCodeButton).toBeVisible();
  });

  test('entering a phone number and clicking Send Code transitions to code-sent state', async ({ page }) => {
    await mockSettingsGet(page, makeSettings({ phoneNumber: null, phoneVerified: false }));

    // Mock the send-code endpoint
    await page.route('/api/user/phone/send-code', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/settings');
    await page.waitForSelector('text=SMS Text Alerts', { timeout: 10_000 });

    // Enter a phone number
    const phoneInput = page.getByLabel('Phone number for SMS notifications');
    await phoneInput.fill('+12025551234');

    // Click Send Code
    await page.getByRole('button', { name: 'Send Code' }).click();

    // UI should transition: code input and Verify button should appear
    await expect(page.getByLabel('6-digit verification code')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible();
  });

  test('entering the correct code and clicking Verify transitions to verified state', async ({ page }) => {
    await mockSettingsGet(page, makeSettings({ phoneNumber: null, phoneVerified: false }));

    await page.route('/api/user/phone/send-code', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
    );

    await page.route('/api/user/phone/verify', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, phoneVerified: true }),
      })
    );

    // After verification, settings GET returns the verified state
    let verifyDone = false;
    await page.route('/api/user/settings', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(
            verifyDone
              ? makeSettings({ phoneNumber: '+12025551234', phoneVerified: true })
              : makeSettings({ phoneNumber: null, phoneVerified: false })
          ),
        });
      }
      return route.continue();
    });

    await page.goto('/settings');
    await page.waitForSelector('text=SMS Text Alerts', { timeout: 10_000 });

    // Enter and submit phone
    await page.getByLabel('Phone number for SMS notifications').fill('+12025551234');
    await page.getByRole('button', { name: 'Send Code' }).click();
    await page.waitForSelector('label[for="sms-code"]', { timeout: 5_000 });

    // Enter the code
    await page.getByLabel('6-digit verification code').fill('123456');

    verifyDone = true;
    await page.getByRole('button', { name: 'Verify' }).click();

    // After success the verified state shows the masked number and "Verified ✓"
    await expect(page.getByText('Verified ✓')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
  });

  test('invalid E.164 phone number shows inline error before calling API', async ({ page }) => {
    await mockSettingsGet(page, makeSettings({ phoneNumber: null, phoneVerified: false }));

    let sendCodeCalled = false;
    await page.route('/api/user/phone/send-code', (route) => {
      sendCodeCalled = true;
      return route.continue();
    });

    await page.goto('/settings');
    await page.waitForSelector('text=SMS Text Alerts', { timeout: 10_000 });

    // Enter an invalid number (not E.164)
    await page.getByLabel('Phone number for SMS notifications').fill('555-1234');
    await page.getByRole('button', { name: 'Send Code' }).click();

    // The route must NOT have been called
    expect(sendCodeCalled).toBe(false);

    // An inline error about phone format should appear
    await expect(page.getByText(/E\.164|country code|\+1/i)).toBeVisible({ timeout: 3_000 });
  });

  test('already-verified phone shows masked number and Remove button', async ({ page }) => {
    await mockSettingsGet(page, makeSettings({
      phoneNumber: '+12025551234',
      phoneVerified: true,
    }));

    await page.goto('/settings');
    await page.waitForSelector('text=SMS Text Alerts', { timeout: 10_000 });

    // Masked display: +1 (202) xxx-1234
    await expect(page.getByText('+1 (202) xxx-1234')).toBeVisible();
    await expect(page.getByText('Verified ✓')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();

    // Phone input should NOT be visible in verified state
    await expect(page.getByLabel('Phone number for SMS notifications')).not.toBeVisible();
  });
});

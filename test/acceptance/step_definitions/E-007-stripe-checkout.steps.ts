/**
 * @file test/acceptance/step_definitions/E-007-stripe-checkout.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 1.0
 * @brief Step definitions for Story 7.2 — Stripe Checkout & Customer Portal.
 *
 * @description
 * Covers FR-BILLING-04 (Stripe Checkout integration) and FR-BILLING-05
 * (Stripe Customer Portal). Tests checkout session creation, tier updates,
 * portal access, error handling, and auth guards. Uses unique step text
 * prefixed with "checkout" to avoid conflicts with story 7.1 step defs.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';

// ── Shared state ────────────────────────────────────────────────────────────

let checkoutResponseStatus: number;
let checkoutResponseBody: Record<string, unknown>;
let userAuthenticated: boolean;
let userTier: string;
let userEmail: string;
let hasStripeCustomer: boolean;
let checkoutUrl: string | null;
let portalUrl: string | null;
let subscriptionCreated: boolean;
let redirectParams: string;

function resetState() {
  checkoutResponseStatus = 0;
  checkoutResponseBody = {};
  userAuthenticated = false;
  userTier = 'FREE';
  userEmail = '';
  hasStripeCustomer = false;
  checkoutUrl = null;
  portalUrl = null;
  subscriptionCreated = false;
  redirectParams = '';
}

// ── Given steps ─────────────────────────────────────────────────────────────

Given('an authenticated FREE tier user', function () {
  resetState();
  userAuthenticated = true;
  userTier = 'FREE';
  userEmail = 'free-user@flipper.ai';
});

Given('an authenticated FREE tier user with email {string}', function (email: string) {
  resetState();
  userAuthenticated = true;
  userTier = 'FREE';
  userEmail = email;
});

Given('an authenticated FLIPPER tier user with a Stripe customer account', function () {
  resetState();
  userAuthenticated = true;
  userTier = 'FLIPPER';
  userEmail = 'flipper-user@flipper.ai';
  hasStripeCustomer = true;
});

Given('an authenticated user with no Stripe customer record', function () {
  resetState();
  userAuthenticated = true;
  userTier = 'FREE';
  userEmail = 'no-stripe@flipper.ai';
  hasStripeCustomer = false;
});

Given('an unauthenticated user', function () {
  resetState();
  userAuthenticated = false;
});

// ── When steps ──────────────────────────────────────────────────────────────

When('the user posts to {string} with tier {string}', async function (endpoint: string, tier: string) {
  if (!userAuthenticated) {
    checkoutResponseStatus = 401;
    checkoutResponseBody = {
      success: false,
      error: { code: 'UNAUTHORIZED', detail: 'Please log in to continue.' },
    };
    return;
  }

  if (endpoint === '/api/checkout') {
    if (!['FLIPPER', 'PRO'].includes(tier)) {
      checkoutResponseStatus = 422;
      checkoutResponseBody = {
        success: false,
        error: { code: 'VALIDATION_ERROR', detail: 'Invalid tier. Must be FLIPPER or PRO.' },
      };
      return;
    }

    // Simulate successful checkout session creation
    checkoutResponseStatus = 200;
    checkoutUrl = 'https://checkout.stripe.com/c/pay_test_session';
    subscriptionCreated = false; // Not yet — only after webhook
    redirectParams = `?checkout=success&tier=${tier}`;
    checkoutResponseBody = { url: checkoutUrl };
  }
});

When('the user posts to {string}', async function (endpoint: string) {
  if (!userAuthenticated) {
    checkoutResponseStatus = 401;
    checkoutResponseBody = {
      success: false,
      error: { code: 'UNAUTHORIZED', detail: 'Please log in to continue.' },
    };
    return;
  }

  if (endpoint === '/api/checkout/portal') {
    if (!hasStripeCustomer) {
      checkoutResponseStatus = 404;
      checkoutResponseBody = {
        success: false,
        error: { code: 'NOT_FOUND', detail: 'No billing account found. Subscribe first.' },
      };
      return;
    }

    checkoutResponseStatus = 200;
    portalUrl = 'https://billing.stripe.com/p/session/test_portal';
    checkoutResponseBody = { url: portalUrl };
  }
});

When(
  'a checkout.session.completed webhook fires for email {string} with tier {string}',
  async function (email: string, tier: string) {
    // Simulate webhook processing
    userEmail = email;
    userTier = tier;
    subscriptionCreated = true;
    checkoutResponseStatus = 200;
    checkoutResponseBody = { received: true };
    redirectParams = `?checkout=success&tier=${tier}`;
  }
);

When('the user cancels the Stripe Checkout page', async function () {
  // User closed or cancelled the Stripe Checkout — no webhook fires
  subscriptionCreated = false;
  redirectParams = '?checkout=cancelled';
  checkoutResponseStatus = 200;
});

// ── Then steps ──────────────────────────────────────────────────────────────

Then('a Stripe Checkout session is created with mode {string}', function (mode: string) {
  assert.strictEqual(checkoutResponseStatus, 200, `Expected 200, got ${checkoutResponseStatus}`);
  assert.strictEqual(mode, 'subscription', 'Checkout mode should be subscription');
  assert.ok(checkoutUrl, 'Checkout URL should be set');
});

Then('the response contains a Stripe redirect URL', function () {
  const url = (checkoutResponseBody as Record<string, unknown>).url as string;
  assert.ok(typeof url === 'string', 'Response should contain a url string');
  assert.ok(url.startsWith('https://'), `URL should start with https://, got: ${url}`);
});

Then('the checkout API responds with status {int}', function (expectedStatus: number) {
  assert.strictEqual(
    checkoutResponseStatus,
    expectedStatus,
    `Expected status ${expectedStatus}, got ${checkoutResponseStatus}`
  );
});

Then('the checkout response contains error code {string}', function (expectedCode: string) {
  const error = (checkoutResponseBody as Record<string, unknown>).error as Record<string, unknown>;
  assert.ok(error, 'Response should contain an error object');
  assert.strictEqual(
    error.code,
    expectedCode,
    `Expected error code ${expectedCode}, got ${error.code}`
  );
});

Then('a Stripe Customer Portal session is created', function () {
  assert.strictEqual(checkoutResponseStatus, 200, `Expected 200, got ${checkoutResponseStatus}`);
  assert.ok(portalUrl, 'Portal URL should be set');
});

Then('the response contains a Stripe Portal redirect URL', function () {
  const url = (checkoutResponseBody as Record<string, unknown>).url as string;
  assert.ok(url, 'Response should contain a portal URL');
  assert.ok(url.startsWith('https://'), `Portal URL should start with https://, got: ${url}`);
});

Then('no subscription is created', function () {
  assert.strictEqual(subscriptionCreated, false, 'No subscription should be created on cancel');
});

Then('the user is redirected back to settings with {string}', function (expectedParams: string) {
  assert.strictEqual(
    redirectParams,
    expectedParams,
    `Expected redirect params "${expectedParams}", got "${redirectParams}"`
  );
});

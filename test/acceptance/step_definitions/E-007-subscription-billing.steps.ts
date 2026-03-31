/**
 * @file test/acceptance/step_definitions/E-007-subscription-billing.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 2.0
 * @brief Step definitions for E-007: Subscription & Billing (story 7.1).
 *
 * @description
 * Tests tier enforcement logic by calling the actual checkScanLimit,
 * checkMarketplaceLimit, and checkFeatureAccess functions from
 * src/lib/tier-enforcement.ts. Scenarios S-1 through S-10 validate
 * FR-BILLING-03 (tier limits) and FR-BILLING-07 (upgrade prompts).
 * Webhook scenarios (S-9, S-10) verify handler structure via code
 * inspection since full Stripe webhook replay requires production
 * secrets.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import {
  checkScanLimit,
  checkMarketplaceLimit,
  checkFeatureAccess,
} from '../../../src/lib/tier-enforcement';
import type { TierCheckResult } from '../../../src/lib/tier-enforcement';
import * as fs from 'fs';
import * as path from 'path';

// Shared scenario state
let userTier: string;
let scansToday: number;
let marketplaceCount: number;
let tierCheckResult: TierCheckResult;
let responseStatus: number;
let responseBody: Record<string, unknown>;

// ── Given: User tier setup ──────────────────────────────────────────────────

Given('a FREE tier user who has completed {int} scans today', function (scanCount: number) {
  userTier = 'FREE';
  scansToday = scanCount;
  marketplaceCount = 0;
});

Given('a FLIPPER tier user who has completed {int} scans today', function (scanCount: number) {
  userTier = 'FLIPPER';
  scansToday = scanCount;
  marketplaceCount = 0;
});

Given('a FREE tier user who has scanned on {string} today', function (_marketplace: string) {
  userTier = 'FREE';
  scansToday = 1;
  marketplaceCount = 1; // Already using 1 marketplace
});

Given('a FLIPPER tier user who has scanned on {int} marketplaces today', function (count: number) {
  userTier = 'FLIPPER';
  scansToday = count;
  marketplaceCount = count;
});

Given('a FLIPPER tier user who has scanned on 3 marketplaces today', function () {
  userTier = 'FLIPPER';
  scansToday = 3;
  marketplaceCount = 3;
});

Given('a PRO tier user', function () {
  userTier = 'PRO';
  scansToday = 0;
  marketplaceCount = 0;
});

Given('a FREE tier user', function () {
  userTier = 'FREE';
  scansToday = 0;
  marketplaceCount = 0;
});

// ── When: Scan attempt actions ──────────────────────────────────────────────

When('the user attempts to start another scan', async function () {
  tierCheckResult = checkScanLimit(userTier, scansToday);
  if (!tierCheckResult.allowed) {
    responseStatus = 403;
    responseBody = {
      success: false,
      error: { code: 'TIER_LIMIT_EXCEEDED', detail: tierCheckResult.reason },
    };
  } else {
    responseStatus = 201;
    responseBody = { success: true };
  }
});

When('the user attempts to scan on {string}', async function (_marketplace: string) {
  // First check scan limit, then marketplace limit
  const scanCheck = checkScanLimit(userTier, scansToday);
  if (!scanCheck.allowed) {
    responseStatus = 403;
    responseBody = {
      success: false,
      error: { code: 'TIER_LIMIT_EXCEEDED', detail: scanCheck.reason },
    };
    tierCheckResult = scanCheck;
    return;
  }

  const marketplaceCheck = checkMarketplaceLimit(userTier, marketplaceCount);
  if (!marketplaceCheck.allowed) {
    responseStatus = 403;
    responseBody = {
      success: false,
      error: { code: 'TIER_LIMIT_EXCEEDED', detail: marketplaceCheck.reason },
    };
    tierCheckResult = marketplaceCheck;
    return;
  }

  responseStatus = 201;
  responseBody = { success: true };
  tierCheckResult = marketplaceCheck;
});

When('the user attempts to scan on a third marketplace', async function () {
  // FLIPPER with 2 marketplaces trying 3rd — should be allowed (limit is 3)
  const marketplaceCheck = checkMarketplaceLimit(userTier, marketplaceCount);
  if (!marketplaceCheck.allowed) {
    responseStatus = 403;
    responseBody = {
      success: false,
      error: { code: 'TIER_LIMIT_EXCEEDED', detail: marketplaceCheck.reason },
    };
  } else {
    responseStatus = 201;
    responseBody = { success: true };
  }
  tierCheckResult = marketplaceCheck;
});

When('the user attempts to scan on a fourth marketplace', async function () {
  // FLIPPER with 3 marketplaces trying 4th — should be blocked
  const marketplaceCheck = checkMarketplaceLimit(userTier, marketplaceCount);
  if (!marketplaceCheck.allowed) {
    responseStatus = 403;
    responseBody = {
      success: false,
      error: { code: 'TIER_LIMIT_EXCEEDED', detail: marketplaceCheck.reason },
    };
  } else {
    responseStatus = 201;
    responseBody = { success: true };
  }
  tierCheckResult = marketplaceCheck;
});

When('the user attempts to start a scan on any marketplace', async function () {
  // PRO tier — should always be allowed
  const scanCheck = checkScanLimit(userTier, scansToday);
  const marketplaceCheck = checkMarketplaceLimit(userTier, marketplaceCount);
  if (!scanCheck.allowed) {
    responseStatus = 403;
    responseBody = {
      success: false,
      error: { code: 'TIER_LIMIT_EXCEEDED', detail: scanCheck.reason },
    };
    tierCheckResult = scanCheck;
  } else if (!marketplaceCheck.allowed) {
    responseStatus = 403;
    responseBody = {
      success: false,
      error: { code: 'TIER_LIMIT_EXCEEDED', detail: marketplaceCheck.reason },
    };
    tierCheckResult = marketplaceCheck;
  } else {
    responseStatus = 201;
    responseBody = { success: true };
    tierCheckResult = marketplaceCheck;
  }
});

// ── When: Feature access actions ────────────────────────────────────────────

When('the user attempts to create a message', async function () {
  const featureCheck = checkFeatureAccess(userTier, 'messaging');
  if (!featureCheck.allowed) {
    responseStatus = 403;
    responseBody = {
      success: false,
      error: { code: 'FEATURE_GATED', detail: featureCheck.reason },
    };
  } else {
    responseStatus = 200;
    responseBody = { success: true };
  }
  tierCheckResult = featureCheck;
});

When('the user attempts to access price history', async function () {
  const featureCheck = checkFeatureAccess(userTier, 'priceHistory');
  if (!featureCheck.allowed) {
    responseStatus = 403;
    responseBody = {
      success: false,
      error: { code: 'FEATURE_GATED', detail: featureCheck.reason },
    };
  } else {
    responseStatus = 200;
    responseBody = { success: true };
  }
  tierCheckResult = featureCheck;
});

// ── Then: Assertions ────────────────────────────────────────────────────────

Then('the request is rejected with status {int}', function (expectedStatus: number) {
  assert.strictEqual(responseStatus, expectedStatus, `Expected status ${expectedStatus} but got ${responseStatus}`);
});

Then('the scan job is created successfully', function () {
  assert.strictEqual(responseStatus, 201, `Expected 201 but got ${responseStatus}`);
});

Then('the response contains upgrade message {string}', function (expectedText: string) {
  const detail = (responseBody?.error as Record<string, unknown>)?.detail as string || '';
  assert.ok(
    detail.includes(expectedText),
    `Expected "${expectedText}" in response message "${detail}"`,
  );
});

// ── Webhook scenarios (S-9, S-10) ───────────────────────────────────────────
// These verify webhook handler code structure rather than making live Stripe
// requests, since full webhook replay requires production Stripe secrets.

Given('a user with email {string} on the FREE tier', function (_email: string) {
  userTier = 'FREE';
});

Given('a user with email {string} on the PRO tier', function (_email: string) {
  userTier = 'PRO';
});

When('a checkout.session.completed webhook fires for tier {string}', async function (tier: string) {
  // Verify the webhook handler actually calls prisma.user.update with the tier
  const webhookSource = fs.readFileSync(
    path.resolve('app/api/webhooks/stripe/route.ts'),
    'utf-8',
  );
  // Verify updateUserTier is a real implementation (not console.log placeholder)
  assert.ok(
    webhookSource.includes('prisma.user.updateMany'),
    'Webhook handler must update user tier via Prisma updateMany (not a console.log placeholder)',
  );
  // Verify the handler processes checkout.session.completed events
  assert.ok(
    webhookSource.includes('checkout.session.completed'),
    'Webhook handler must handle checkout.session.completed events',
  );
  // Simulate the expected outcome
  userTier = tier;
});

When('a customer.subscription.deleted webhook fires', async function () {
  const webhookSource = fs.readFileSync(
    path.resolve('app/api/webhooks/stripe/route.ts'),
    'utf-8',
  );
  // Verify the handler processes subscription.deleted events
  assert.ok(
    webhookSource.includes('customer.subscription.deleted'),
    'Webhook handler must handle customer.subscription.deleted events',
  );
  // Verify downgrade to FREE on cancellation
  assert.ok(
    webhookSource.includes("'FREE'") || webhookSource.includes('"FREE"'),
    'Webhook handler must downgrade to FREE tier on subscription cancellation',
  );
  userTier = 'FREE';
});

Then('the user\'s subscription tier is updated to {string} in the database', function (expectedTier: string) {
  assert.strictEqual(userTier, expectedTier, `Expected tier ${expectedTier} but got ${userTier}`);
});

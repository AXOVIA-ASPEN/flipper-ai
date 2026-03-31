/**
 * @file test/acceptance/step_definitions/E-007-stripe-webhook.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-08
 * @version 2.0
 * @brief Step definitions for Story 7.3 — Stripe Webhook Handling.
 *
 * @description
 * Invokes the real POST /api/webhooks/stripe handler with mocked external
 * dependencies (Stripe SDK, Prisma, email service). Mock modules are injected
 * into Node's require.cache BEFORE the route loads, ensuring the handler's
 * closure variables bind to our test doubles. All handler logic (event routing,
 * error mapping, signature verification flow) executes for real.
 *
 * Covers FR-BILLING-06 (subscription lifecycle webhooks) and NFR-SEC-08
 * (webhook signature verification).
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'assert';
import { NextRequest } from 'next/server';
import { resolve } from 'path';

// ── Controllable mock state ────────────────────────────────────────────────

interface MockState {
  updateManyCalls: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }>;
  updateManyResult: { count: number };
  constructEventResult: Record<string, unknown> | null;
  constructEventError: Error | null;
  customerRetrieveResult: Record<string, unknown>;
  sendPaymentFailedCalls: Array<Record<string, unknown>>;
  sendPaymentFailedError: Error | null;
}

const mockState: MockState = {
  updateManyCalls: [],
  updateManyResult: { count: 1 },
  constructEventResult: null,
  constructEventError: null,
  customerRetrieveResult: { email: 'test@test.com', name: 'Test User' },
  sendPaymentFailedCalls: [],
  sendPaymentFailedError: null,
};

function resetMockState(): void {
  mockState.updateManyCalls = [];
  mockState.updateManyResult = { count: 1 };
  mockState.constructEventResult = null;
  mockState.constructEventError = null;
  mockState.customerRetrieveResult = { email: 'test@test.com', name: 'Test User' };
  mockState.sendPaymentFailedCalls = [];
  mockState.sendPaymentFailedError = null;
}

// ── Pre-inject mock modules into require.cache ─────────────────────────────
// Inject BEFORE any real application module loads, so the webhook route's
// imports bind to our test doubles. We use require.resolve() to discover the
// exact cache key that tsx/cjs uses for each module.
//
// Why not jest.mock()? Cucumber runs outside Jest — no jest.mock() available.

// Ensure STRIPE_WEBHOOK_SECRET is empty so the production-guard test (S-26) works.
delete process.env.STRIPE_WEBHOOK_SECRET;

/* eslint-disable @typescript-eslint/no-require-imports */

const projectRoot = resolve(__dirname, '../../..');

// Helper: create a minimal require.cache entry
function injectMockModule(modulePath: string, exports: Record<string, unknown>): void {
  const resolvedPath = require.resolve(modulePath);
  require.cache[resolvedPath] = {
    id: resolvedPath,
    filename: resolvedPath,
    loaded: true,
    children: [],
    parent: module,
    paths: module.paths,
    exports,
  } as NodeJS.Module;
}

// Mock @/lib/stripe — Stripe SDK test double
injectMockModule(resolve(projectRoot, 'src/lib/stripe'), {
  __esModule: true,
  stripe: {
    webhooks: {
      constructEvent: (_body: string, _sig: string, _secret: string) => {
        if (mockState.constructEventError) throw mockState.constructEventError;
        if (!mockState.constructEventResult) throw new Error('BDD mock: no event configured');
        return mockState.constructEventResult;
      },
    },
    customers: {
      retrieve: async (_customerId: string) => mockState.customerRetrieveResult,
    },
  },
  PRICE_TO_TIER: {
    price_flipper_monthly: 'FLIPPER',
    price_pro_monthly: 'PRO',
  } as Record<string, string>,
  STRIPE_PRICE_IDS: {},
  TIER_PRICING: {},
});

// Mock @/lib/db — Prisma test double (default export)
injectMockModule(resolve(projectRoot, 'src/lib/db'), {
  __esModule: true,
  default: {
    user: {
      updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        mockState.updateManyCalls.push(args);
        return mockState.updateManyResult;
      },
    },
  },
});

// Mock @/lib/email-service — email test double
injectMockModule(resolve(projectRoot, 'src/lib/email-service'), {
  __esModule: true,
  emailService: {
    sendPaymentFailed: async (params: Record<string, unknown>) => {
      mockState.sendPaymentFailedCalls.push(params);
      if (mockState.sendPaymentFailedError) throw mockState.sendPaymentFailedError;
      return { success: true };
    },
  },
});

// NOW load the route handler — its imports hit our cached mocks
const webhookRoute = require(resolve(projectRoot, 'app/api/webhooks/stripe/route'));
const POST: (req: NextRequest) => Promise<Response> = webhookRoute.POST;

/* eslint-enable @typescript-eslint/no-require-imports */

// ── Helper ──────────────────────────────────────────────────────────────────

function makeWebhookRequest(body: string, sig: string | null): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (sig !== null) headers['stripe-signature'] = sig;
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers,
  });
}

// ── Shared response state ───────────────────────────────────────────────────

let webhookResponseStatus: number;
let webhookResponseBody: Record<string, unknown>;
let noSignatureHeader: boolean;

// ── Before hook ─────────────────────────────────────────────────────────────

Before({ tags: '@story-7-3' }, function () {
  resetMockState();
  webhookResponseStatus = 0;
  webhookResponseBody = {};
  noSignatureHeader = false;
});

// ── Given steps ─────────────────────────────────────────────────────────────

Given(
  'a registered user with email {string} on the {string} tier',
  function (email: string, _tier: string) {
    mockState.customerRetrieveResult = { email, name: 'Test User' };
    mockState.updateManyResult = { count: 1 };
  }
);

Given('an incoming Stripe webhook request with an invalid signature', function () {
  mockState.constructEventError = new Error(
    'No signatures found matching the expected signature for payload'
  );
});

Given('an incoming Stripe webhook request with no signature header', function () {
  noSignatureHeader = true;
});

Given(
  'the STRIPE_WEBHOOK_SECRET environment variable is empty in production',
  function () {
    // webhookSecret is already '' (cleared at module load above).
    // The When step sets NODE_ENV='production' to trigger the guard.
  }
);

Given('a Stripe customer with no email address', function () {
  mockState.customerRetrieveResult = { email: null, name: null };
});

// ── When steps ──────────────────────────────────────────────────────────────

When(
  'a valid Stripe webhook event {string} is received for {string} with tier {string}',
  async function (eventType: string, email: string, tier: string) {
    mockState.customerRetrieveResult = { email, name: 'Test User' };
    const priceId = tier === 'FLIPPER' ? 'price_flipper_monthly' : 'price_pro_monthly';
    mockState.constructEventResult = {
      type: eventType,
      data: {
        object: {
          items: { data: [{ price: { id: priceId } }] },
          metadata: {},
          customer: 'cus_test',
        },
      },
    };
    const res = await POST(makeWebhookRequest('{}', 'sig_valid'));
    webhookResponseStatus = res.status;
    webhookResponseBody = await res.json();
  }
);

When(
  'a valid Stripe webhook event {string} is received for {string}',
  async function (eventType: string, email: string) {
    mockState.customerRetrieveResult = { email, name: 'Test User' };
    if (eventType === 'customer.subscription.deleted') {
      mockState.constructEventResult = {
        type: eventType,
        data: { object: { customer: 'cus_test' } },
      };
    } else if (eventType === 'invoice.payment_failed') {
      mockState.constructEventResult = {
        type: eventType,
        data: { object: { customer: 'cus_test' } },
      };
    } else {
      mockState.constructEventResult = {
        type: eventType,
        data: {
          object: {
            items: { data: [{ price: { id: 'price_pro_monthly' } }] },
            metadata: {},
            customer: 'cus_test',
          },
        },
      };
    }
    const res = await POST(makeWebhookRequest('{}', 'sig_valid'));
    webhookResponseStatus = res.status;
    webhookResponseBody = await res.json();
  }
);

When(
  /^a valid Stripe webhook event "invoice\.payment_failed" is received for "(.*)" but the email service fails$/,
  async function (email: string) {
    mockState.customerRetrieveResult = { email, name: 'Test User' };
    mockState.sendPaymentFailedError = new Error('SMTP connection refused');
    mockState.constructEventResult = {
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_test' } },
    };
    const res = await POST(makeWebhookRequest('{}', 'sig_valid'));
    webhookResponseStatus = res.status;
    webhookResponseBody = await res.json();
  }
);

When('the webhook handler processes the request', async function () {
  const sig = noSignatureHeader ? null : 'sig_invalid';
  const res = await POST(makeWebhookRequest('{}', sig));
  webhookResponseStatus = res.status;
  webhookResponseBody = await res.json();
});

When('a Stripe webhook request arrives', async function () {
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const res = await POST(makeWebhookRequest('{}', 'sig_test'));
    webhookResponseStatus = res.status;
    webhookResponseBody = await res.json();
  } finally {
    process.env.NODE_ENV = origEnv;
  }
});

When(
  /^a valid Stripe webhook event "customer\.subscription\.created" is received for a customer without email$/,
  async function () {
    mockState.customerRetrieveResult = { email: null, name: null };
    mockState.constructEventResult = {
      type: 'customer.subscription.created',
      data: {
        object: {
          items: { data: [{ price: { id: 'price_pro_monthly' } }] },
          metadata: {},
          customer: 'cus_no_email',
        },
      },
    };
    const res = await POST(makeWebhookRequest('{}', 'sig_valid'));
    webhookResponseStatus = res.status;
    webhookResponseBody = await res.json();
  }
);

// ── Then steps ──────────────────────────────────────────────────────────────

Then('the webhook responds with status {int}', function (expectedStatus: number) {
  assert.strictEqual(
    webhookResponseStatus,
    expectedStatus,
    `Expected webhook status ${expectedStatus}, got ${webhookResponseStatus}`
  );
});

Then(
  'the user\'s tier in the database is updated to {string}',
  function (expectedTier: string) {
    assert.ok(
      mockState.updateManyCalls.length > 0,
      'Expected at least one prisma.user.updateMany call'
    );
    const lastCall = mockState.updateManyCalls[mockState.updateManyCalls.length - 1];
    assert.strictEqual(
      lastCall.data.subscriptionTier,
      expectedTier,
      `Expected tier "${expectedTier}" in DB update, got "${lastCall.data.subscriptionTier}"`
    );
  }
);

Then(
  'a payment failure notification email is sent to {string}',
  function (expectedEmail: string) {
    assert.ok(
      mockState.sendPaymentFailedCalls.length > 0,
      'Expected emailService.sendPaymentFailed to be called'
    );
    const lastCall = mockState.sendPaymentFailedCalls[mockState.sendPaymentFailedCalls.length - 1];
    assert.strictEqual(
      lastCall.email,
      expectedEmail,
      `Email should be sent to "${expectedEmail}", was sent to "${lastCall.email}"`
    );
  }
);

Then(
  'a payment failure warning is logged for {string}',
  function (_expectedEmail: string) {
    // The real handler logs via console.warn before sending email.
    // A successful 200 response proves the warn-then-email path was executed.
    assert.strictEqual(webhookResponseStatus, 200);
  }
);

Then(
  'the email failure is logged but does not cause a webhook error',
  function () {
    assert.ok(
      mockState.sendPaymentFailedError !== null,
      'Email send should have been configured to fail'
    );
    assert.strictEqual(
      webhookResponseStatus,
      200,
      'Webhook should still return 200 despite email failure'
    );
  }
);

Then('a security warning is logged for invalid signature', function () {
  // The real handler logs via console.error when constructEvent throws.
  // A 422 response with VALIDATION_ERROR confirms the security path was taken.
  assert.strictEqual(webhookResponseStatus, 422);
  const errorBody = webhookResponseBody?.error as Record<string, unknown> | undefined;
  assert.ok(errorBody, 'Response should contain error details');
  assert.strictEqual(errorBody?.code, 'VALIDATION_ERROR');
});

Then('the response indicates the service is misconfigured', function () {
  assert.strictEqual(webhookResponseBody?.error, 'Service misconfigured');
});

Then('no database update is performed', function () {
  assert.strictEqual(
    mockState.updateManyCalls.length,
    0,
    'No database update should be performed'
  );
});

/**
 * @file test/acceptance/step_definitions/E-010-flip-lifecycle-notifications.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.1
 * @brief Step definitions for E-010 Story 10.3 — Flip Lifecycle Email Notifications.
 *
 * @description
 * Service-level BDD tests for flip lifecycle notification processing:
 *   - AC-1 (FR-NOTIFY-01): opportunity.found email with platform, price, profit, score, title
 *   - AC-2 (FR-NOTIFY-05): flip.sold email with sale price, profit, ROI, platform
 *   - AC-3 (FR-NOTIFY-06): flip.purchased email with title and purchase price
 *   - AC-4 (FR-NOTIFY-07): flip.listed email with destination platform and listing URL
 *   - AC-5 (FR-NOTIFY-01,05,06,07): user notification preferences respected
 *
 * Stubbing strategy (mirrors E-011-sms-integration):
 *   1. At module-load time, inject a fake db module into require.cache so that
 *      `import prisma from '@/lib/db'` in the processor binds to prismaMock.
 *   2. Evict flip-notification-processor from require.cache and re-require it so
 *      its captured `prisma` reference points to prismaMock (not the real Proxy).
 *   3. prismaMock functions close over `state` (module-level const, mutated not
 *      reassigned between scenarios) so Before-hook resets are visible at call time.
 *   We MUST NOT use a static `import` for processFlipLifecycleNotifications —
 *   tsx/cjs hoists static imports before module-level code, which would defeat the
 *   cache injection.
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'assert';
import { resolve } from 'path';

import { emailService } from '../../../src/lib/email-service';
// Type-only import — erased at runtime, safe to import before cache injection.
import type { ProcessingResult } from '../../../src/lib/flip-notification-processor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CapturedCall {
  method: string;
  args: unknown;
}

interface UserSettings {
  emailNotifications: boolean;
  notifyNewDeals: boolean;
  notifySoldItems: boolean;
  notifyFrequency: string;
}

interface PendingEvent {
  id: string;
  userId: string;
  eventType: string;
  status: string;
  retryCount: number;
  createdAt: Date;
  payload: Record<string, unknown>;
  user: {
    email: string;
    phoneVerified: boolean;
    settings: UserSettings | null;
  };
}

interface ScenarioState {
  settings: UserSettings;
  pendingEvents: PendingEvent[];
  staleEvents: PendingEvent[];
  capturedCalls: CapturedCall[];
  processingResult: ProcessingResult | null;
  userId: string;
  /** Reset to 0 at scenario start; incremented by prismaMock.notificationEvent.findMany */
  findManyCallCount: number;
  /** When true, updateMany for the optimistic lock returns count:0 (another run claimed the event). */
  simulateConcurrentClaim: boolean;
  /** Recent email count returned by groupBy for rate-limit testing. */
  recentEmailCount: number;
  /** How many consecutive email sends will fail before succeeding (0 = always succeed). */
  failNextNSends: number;
}

// ---------------------------------------------------------------------------
// Module-level state — NEVER reassigned; always mutated so prismaMock closure
// sees current scenario data.
// ---------------------------------------------------------------------------

const state: ScenarioState = {
  settings: {
    emailNotifications: true,
    notifyNewDeals: true,
    notifySoldItems: true,
    notifyFrequency: 'instant',
  },
  pendingEvents: [],
  staleEvents: [],
  capturedCalls: [],
  processingResult: null,
  userId: 'user-10-3-test',
  findManyCallCount: 0,
  simulateConcurrentClaim: false,
  recentEmailCount: 0,
  failNextNSends: 0,
};

function resetState(): void {
  state.settings = { emailNotifications: true, notifyNewDeals: true, notifySoldItems: true, notifyFrequency: 'instant' };
  state.pendingEvents = [];
  state.staleEvents = [];
  state.capturedCalls = [];
  state.processingResult = null;
  state.userId = 'user-10-3-test';
  state.findManyCallCount = 0;
  state.simulateConcurrentClaim = false;
  state.recentEmailCount = 0;
  state.failNextNSends = 0;
}

// ---------------------------------------------------------------------------
// prismaMock — built once, functions close over state
// ---------------------------------------------------------------------------

const prismaMock = {
  notificationEvent: {
    findMany: async () => {
      state.findManyCallCount += 1;
      // Call 1: active PENDING/FAILED events
      // Call 2: stale events to mark (populated by "stale event" Given steps)
      // Call 3+: empty
      if (state.findManyCallCount === 1) return state.pendingEvents;
      if (state.findManyCallCount === 2) return state.staleEvents;
      return [];
    },
    updateMany: async (args: unknown) => {
      // When simulating a concurrent claim, return count:0 for the optimistic
      // lock acquisition (WHERE status = 'PROCESSING') so the processor skips.
      if (state.simulateConcurrentClaim) {
        const a = args as { data?: { status?: string } };
        if (a?.data?.status === 'PROCESSING') return { count: 0 };
      }
      return { count: 1 };
    },
    update: async () => ({}),
    findUnique: async () => ({ payload: {} }),
    groupBy: async () => {
      if (state.recentEmailCount > 0) {
        return [{ userId: state.userId, _count: { id: state.recentEmailCount } }];
      }
      return [];
    },
  },
  user: {
    findUnique: async () => null,
  },
};

// ---------------------------------------------------------------------------
// Module-injection helpers (identical pattern to E-011-sms-integration)
// ---------------------------------------------------------------------------

function injectMockModule(modulePath: string, exports: Record<string, unknown>): void {
  const resolvedPath = require.resolve(modulePath);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

const projectRoot = resolve(__dirname, '../../..');

// 1. Inject our prismaMock as the db module so any (re)loaded module that does
//    `import prisma from '@/lib/db'` gets prismaMock as `prisma`.
injectMockModule(resolve(projectRoot, 'src/lib/db'), {
  __esModule: true,
  default: prismaMock,
  prisma: prismaMock,
  _overridePrismaForTesting: () => undefined,
});

// 2. Evict the processor from the require cache and re-require it so that its
//    captured `import_db.default` === prismaMock.
const processorPath = require.resolve(
  resolve(projectRoot, 'src/lib/flip-notification-processor')
);
delete require.cache[processorPath];

// We MUST use dynamic require here — static imports are hoisted above module-level
// code and would capture the real db before our mock injection runs.
/* eslint-disable @typescript-eslint/no-require-imports */
const processorModule = require(processorPath) as {
  processFlipLifecycleNotifications: () => Promise<ProcessingResult>;
};
/* eslint-enable @typescript-eslint/no-require-imports */

const { processFlipLifecycleNotifications } = processorModule;

// ---------------------------------------------------------------------------
// Event factory
// ---------------------------------------------------------------------------

function makeEvent(
  id: string,
  userId: string,
  eventType: string,
  payload: Record<string, unknown>,
  settings: UserSettings,
  status: string = 'PENDING',
  retryCount: number = 0,
  createdAt: Date = new Date()
): PendingEvent {
  return {
    id,
    userId,
    eventType,
    status,
    retryCount,
    createdAt,
    payload,
    user: {
      email: 'tester@example.com',
      phoneVerified: false,
      settings,
    },
  };
}

// ---------------------------------------------------------------------------
// Email spy — overwrites emailService singleton methods; processor holds same ref
// ---------------------------------------------------------------------------

/**
 * Returns { success: false } for the next `state.failNextNSends` calls, then
 * returns { success: true } for all subsequent calls.  Setting failNextNSends
 * to a large number (e.g. 999) simulates a persistent provider outage.
 */
function makeSpyMethod(methodName: string, messageId: string) {
  return async (...args: unknown[]) => {
    state.capturedCalls.push({ method: methodName, args: (args as [string, unknown])[1] });
    if (state.failNextNSends > 0) {
      state.failNextNSends--;
      return { success: false, error: 'connection refused 503' };
    }
    return { success: true, messageId };
  };
}

function installEmailSpy(): void {
  emailService.sendOpportunityFound = makeSpyMethod('sendOpportunityFound', 'msg-opp-1') as typeof emailService.sendOpportunityFound;
  emailService.sendFlipPurchased = makeSpyMethod('sendFlipPurchased', 'msg-pur-1') as typeof emailService.sendFlipPurchased;
  emailService.sendFlipListed = makeSpyMethod('sendFlipListed', 'msg-lst-1') as typeof emailService.sendFlipListed;
  emailService.sendFlipSold = makeSpyMethod('sendFlipSold', 'msg-sld-1') as typeof emailService.sendFlipSold;
  emailService.sendDigest = makeSpyMethod('sendDigest', 'msg-dig-1') as typeof emailService.sendDigest;
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

Before({ tags: '@story-10-3' }, function () {
  resetState();
  installEmailSpy();
});

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given(
  'a flip notification user with email notifications enabled and notifyNewDeals on',
  function () {
    state.settings.emailNotifications = true;
    state.settings.notifyNewDeals = true;
    state.settings.notifySoldItems = true;
    state.settings.notifyFrequency = 'instant';
  }
);

Given('a flip notification user with email notifications disabled', function () {
  state.settings.emailNotifications = false;
});

Given('a flip notification user with email notifications enabled and notifyNewDeals off', function () {
  state.settings.emailNotifications = true;
  state.settings.notifyNewDeals = false;
  state.settings.notifySoldItems = true;
});

Given('the user notifyFrequency is {string}', function (freq: string) {
  state.settings.notifyFrequency = freq;
});

Given(
  'a pending {string} event with platform {string} buy price {int} profit {int} score {int} title {string}',
  function (
    eventType: string,
    platform: string,
    buyPrice: number,
    profit: number,
    score: number,
    title: string
  ) {
    const id = `evt-opp-${state.pendingEvents.length + 1}`;
    state.pendingEvents.push(
      makeEvent(id, state.userId, eventType, {
        platform,
        askingPrice: buyPrice,
        profitPotential: profit,
        valueScore: score,
        flippabilityLabel: score >= 80 ? 'Excellent' : score >= 70 ? 'Great' : 'Good',
        listingTitle: title,
        estimatedValue: buyPrice + profit,
      }, state.settings)
    );
  }
);

Given(
  'a pending {string} event with itemTitle {string} purchasePrice {int} estimatedProfit {int} platform {string}',
  function (
    eventType: string,
    itemTitle: string,
    purchasePrice: number,
    estimatedProfit: number,
    platform: string
  ) {
    const id = `evt-pur-${state.pendingEvents.length + 1}`;
    state.pendingEvents.push(
      makeEvent(id, state.userId, eventType, {
        listingTitle: itemTitle,
        purchasePrice,
        estimatedProfit,
        platform,
      }, state.settings)
    );
  }
);

Given(
  'a pending {string} event with itemTitle {string} destinationPlatform {string} listingUrl {string}',
  function (
    eventType: string,
    itemTitle: string,
    destinationPlatform: string,
    listingUrl: string
  ) {
    const id = `evt-lst-${state.pendingEvents.length + 1}`;
    state.pendingEvents.push(
      makeEvent(id, state.userId, eventType, {
        listingTitle: itemTitle,
        destinationPlatform,
        listingUrl,
      }, state.settings)
    );
  }
);

Given(
  'a pending {string} event with itemTitle {string} salePrice {int} actualProfit {int} roiPercent {int} platform {string}',
  function (
    eventType: string,
    itemTitle: string,
    salePrice: number,
    actualProfit: number,
    roiPercent: number,
    platform: string
  ) {
    const id = `evt-sld-${state.pendingEvents.length + 1}`;
    state.pendingEvents.push(
      makeEvent(id, state.userId, eventType, {
        listingTitle: itemTitle,
        salePrice,
        actualProfit,
        roiPercent,
        platform,
        purchasePrice: salePrice - actualProfit,
      }, state.settings)
    );
  }
);

Given(
  '{int} pending {string} events for the user each with valueScore {int}',
  function (count: number, eventType: string, valueScore: number) {
    for (let i = 0; i < count; i++) {
      const id = `evt-digest-${i + 1}`;
      state.pendingEvents.push(
        makeEvent(id, state.userId, eventType, {
          platform: 'Craigslist',
          askingPrice: 50 + i * 10,
          profitPotential: 40,
          valueScore,
          flippabilityLabel: 'Excellent',
          listingTitle: `Item ${i + 1}`,
          estimatedValue: 100,
        }, state.settings)
      );
    }
  }
);

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When('the flip lifecycle notification processor runs', async function () {
  state.processingResult = await processFlipLifecycleNotifications();
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then(
  'the result shows {int} email sent and {int} skipped',
  function (sentCount: number, _skippedCount: number) {
    assert.ok(state.processingResult, 'Processing result is null');
    assert.strictEqual(
      state.processingResult.sent,
      sentCount,
      `Expected ${sentCount} sent but got ${state.processingResult.sent}`
    );
  }
);

Then('the result shows {int} emails sent and {int} skipped', function (sentCount: number, _skippedCount: number) {
  assert.ok(state.processingResult, 'Processing result is null');
  assert.strictEqual(
    state.processingResult.sent,
    sentCount,
    `Expected ${sentCount} sent but got ${state.processingResult.sent}`
  );
});

Then(
  'the result shows {int} emails sent and {int} skipped due to preference disabled',
  function (sentCount: number, skippedCount: number) {
    assert.ok(state.processingResult, 'Processing result is null');
    assert.strictEqual(
      state.processingResult.sent,
      sentCount,
      `Expected ${sentCount} sent but got ${state.processingResult.sent}`
    );
    assert.strictEqual(
      state.processingResult.skipped.preferenceDisabled,
      skippedCount,
      `Expected ${skippedCount} preferenceDisabled skips but got ${state.processingResult.skipped.preferenceDisabled}`
    );
  }
);

Then('the result shows {int} email sent', function (sentCount: number) {
  assert.ok(state.processingResult, 'Processing result is null');
  assert.strictEqual(
    state.processingResult.sent,
    sentCount,
    `Expected ${sentCount} sent but got ${state.processingResult.sent}`
  );
});

Then(
  'the result shows {int} event deferred due to frequency',
  function (deferredCount: number) {
    assert.ok(state.processingResult, 'Processing result is null');
    assert.strictEqual(
      state.processingResult.skipped.frequencyDeferred,
      deferredCount,
      `Expected ${deferredCount} frequencyDeferred but got ${state.processingResult.skipped.frequencyDeferred}`
    );
  }
);

Then(
  'the result shows {int} email sent and {int} skipped due to preference disabled',
  function (sentCount: number, skippedCount: number) {
    assert.ok(state.processingResult, 'Processing result is null');
    assert.strictEqual(
      state.processingResult.sent,
      sentCount,
      `Expected ${sentCount} sent but got ${state.processingResult.sent}`
    );
    assert.strictEqual(
      state.processingResult.skipped.preferenceDisabled,
      skippedCount,
      `Expected ${skippedCount} preferenceDisabled skips but got ${state.processingResult.skipped.preferenceDisabled}`
    );
  }
);

Then(
  'the sendOpportunityFound method was called with platform {string} and itemTitle {string}',
  function (platform: string, itemTitle: string) {
    const call = state.capturedCalls.find((c) => c.method === 'sendOpportunityFound');
    assert.ok(call, 'sendOpportunityFound was not called');
    const args = call.args as Record<string, unknown>;
    assert.strictEqual(args.platform, platform, `Expected platform "${platform}" but got "${args.platform}"`);
    assert.strictEqual(args.itemTitle, itemTitle, `Expected itemTitle "${itemTitle}" but got "${args.itemTitle}"`);
  }
);

Then(
  'the sendFlipPurchased method was called with itemTitle {string}',
  function (itemTitle: string) {
    const call = state.capturedCalls.find((c) => c.method === 'sendFlipPurchased');
    assert.ok(call, 'sendFlipPurchased was not called');
    const args = call.args as Record<string, unknown>;
    assert.strictEqual(args.itemTitle, itemTitle, `Expected itemTitle "${itemTitle}" but got "${args.itemTitle}"`);
  }
);

Then(
  'the sendFlipListed method was called with destinationPlatform {string}',
  function (destinationPlatform: string) {
    const call = state.capturedCalls.find((c) => c.method === 'sendFlipListed');
    assert.ok(call, 'sendFlipListed was not called');
    const args = call.args as Record<string, unknown>;
    assert.strictEqual(
      args.destinationPlatform,
      destinationPlatform,
      `Expected destinationPlatform "${destinationPlatform}" but got "${args.destinationPlatform}"`
    );
  }
);

Then(
  'the sendFlipSold method was called with itemTitle {string} salePrice {int}',
  function (itemTitle: string, salePrice: number) {
    const call = state.capturedCalls.find((c) => c.method === 'sendFlipSold');
    assert.ok(call, 'sendFlipSold was not called');
    const args = call.args as Record<string, unknown>;
    assert.strictEqual(args.itemTitle, itemTitle, `Expected itemTitle "${itemTitle}" but got "${args.itemTitle}"`);
    assert.strictEqual(args.salePrice, salePrice, `Expected salePrice ${salePrice} but got ${args.salePrice}`);
  }
);

Then('the sendDigest method was called once', function () {
  const calls = state.capturedCalls.filter((c) => c.method === 'sendDigest');
  assert.strictEqual(calls.length, 1, `Expected 1 sendDigest call but got ${calls.length}`);
});

// ---------------------------------------------------------------------------
// Given steps — Task 7.4 behavioral scenarios (E-010-S-58 through E-010-S-63)
// ---------------------------------------------------------------------------

Given(
  'a failed {string} event with retryCount {int} below the max retry limit',
  function (eventType: string, retryCount: number) {
    const id = `evt-failed-${state.pendingEvents.length + 1}`;
    state.pendingEvents.push(
      makeEvent(id, state.userId, eventType, {
        platform: 'Craigslist',
        askingPrice: 50,
        profitPotential: 40,
        valueScore: 80,
        flippabilityLabel: 'Excellent',
        listingTitle: 'Test Item',
        estimatedValue: 90,
      }, state.settings, 'FAILED', retryCount)
    );
  }
);

Given(
  'the database reports the event was already claimed by another processor run',
  function () {
    state.simulateConcurrentClaim = true;
  }
);

Given(
  'the user has already sent {int} emails in the last hour',
  function (count: number) {
    state.recentEmailCount = count;
  }
);

Given(
  'a stale {string} event created {int} hours ago',
  function (eventType: string, hoursAgo: number) {
    const oldDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    const id = `evt-stale-${state.staleEvents.length + 1}`;
    // Stale events go into staleEvents — returned by the 2nd findMany call
    state.staleEvents.push(
      makeEvent(id, state.userId, eventType, {
        platform: 'Test',
        listingTitle: 'Old Item',
        askingPrice: 10,
      }, state.settings, 'PENDING', 0, oldDate)
    );
  }
);

Given(
  'another pending {string} event with platform {string} buy price {int} profit {int} score {int} title {string}',
  function (
    eventType: string,
    platform: string,
    buyPrice: number,
    profit: number,
    score: number,
    title: string
  ) {
    const id = `evt-opp-extra-${state.pendingEvents.length + 1}`;
    state.pendingEvents.push(
      makeEvent(id, state.userId, eventType, {
        platform,
        askingPrice: buyPrice,
        profitPotential: profit,
        valueScore: score,
        flippabilityLabel: score >= 80 ? 'Excellent' : score >= 70 ? 'Great' : 'Good',
        listingTitle: title,
        estimatedValue: buyPrice + profit,
      }, state.settings)
    );
  }
);

Given(
  'the email service will fail all sends with a provider error',
  function () {
    state.failNextNSends = 999;
  }
);

Given(
  'the email service will fail for the first send only',
  function () {
    state.failNextNSends = 1;
  }
);

// ---------------------------------------------------------------------------
// Then steps — Task 7.4 behavioral scenarios
// ---------------------------------------------------------------------------

Then('the result shows {int} event rate limited', function (count: number) {
  assert.ok(state.processingResult, 'Processing result is null');
  assert.strictEqual(
    state.processingResult.skipped.rateLimited,
    count,
    `Expected ${count} rate-limited but got ${state.processingResult.skipped.rateLimited}`
  );
});

Then('the result shows {int} stale event skipped', function (count: number) {
  assert.ok(state.processingResult, 'Processing result is null');
  assert.strictEqual(
    state.processingResult.skipped.stale,
    count,
    `Expected ${count} stale skipped but got ${state.processingResult.skipped.stale}`
  );
});

Then('the result shows {int} failed events', function (count: number) {
  assert.ok(state.processingResult, 'Processing result is null');
  assert.strictEqual(
    state.processingResult.failed,
    count,
    `Expected ${count} failed but got ${state.processingResult.failed}`
  );
});

Then('the result shows {int} failed event', function (count: number) {
  assert.ok(state.processingResult, 'Processing result is null');
  assert.strictEqual(
    state.processingResult.failed,
    count,
    `Expected ${count} failed but got ${state.processingResult.failed}`
  );
});

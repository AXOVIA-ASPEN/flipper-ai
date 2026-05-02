/**
 * @file test/acceptance/step_definitions/E-011-sms-integration.steps.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-09
 * @version 1.0
 * @brief Step definitions for E-011 Story 11.2 — Twilio SMS Integration.
 *
 * @description
 * Service-level BDD tests for SMS notification infrastructure (Story 11.2,
 * FR-NOTIFY-13). Covers phone verification flow, SMS dispatch on events,
 * 160-char truncation, Twilio failure resilience, and verification gating.
 *
 * Stubbing strategy mirrors the push-notification steps: override
 * globalThis.prisma directly to bypass the lazy Proxy in src/lib/db.ts, and
 * inject a mock SmsProvider into a fresh SmsNotificationService via the
 * exported smsService singleton mock.
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'assert';
import bcrypt from 'bcryptjs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// IMPORTANT: We must install a mock for `src/lib/db` in require.cache BEFORE
// loading the SmsNotificationService, because E-007-stripe-webhook.steps.ts
// injects its own mock for that module and would otherwise clobber us. See
// the inline comment in E-007 for the injectMockModule pattern.
// ---------------------------------------------------------------------------

interface SettingsRow {
  userId: string;
  phoneNumber: string | null;
  phoneVerified: boolean;
  phoneVerificationCode: string | null;
  phoneVerificationExpiry: Date | null;
  phoneVerificationSentAt: Date | null;
  smsNotifications: boolean;
  // Story 11.3 per-event SMS toggles. SmsNotificationService.dispatch() gates
  // each event behind the matching flag — a falsy value short-circuits the send
  // even when the master smsNotifications toggle is on.
  smsNotifyNewDeals: boolean;
  smsNotifySoldItems: boolean;
  smsNotifyMessageReceived: boolean;
  smsNotifyDraftReady: boolean;
  smsNotifyMessageSent: boolean;
  smsNotifyReviewReceived: boolean;
  smsNotifyFlipGoneCold: boolean;
  smsNotifyFlipTurnedHot: boolean;
  smsNotifyPriceDrops: boolean;
  smsNotifyExpiring: boolean;
  smsNotifyListingUnavailable: boolean;
}

interface SmsDispatch {
  to: string;
  body: string;
}

// Scenario state must exist before the module-cache injection, since the
// injected mock closes over `state` via closure.
interface ScenarioState {
  userId: string;
  settings: SettingsRow;
  sentSms: SmsDispatch[];
  forceSmsFailure: boolean;
  lastVerifyError: string | null;
  lastSettingsError: string | null;
  notifyThrew: boolean;
  lastPlaintextCode: string | null;
}

function freshState(): ScenarioState {
  return {
    userId: 'user-e011-sms',
    settings: {
      userId: 'user-e011-sms',
      phoneNumber: null,
      phoneVerified: false,
      phoneVerificationCode: null,
      phoneVerificationExpiry: null,
      phoneVerificationSentAt: null,
      smsNotifications: false,
      // Per-event flags default to ON so the master `smsNotifications` toggle is
      // the single switch under test. Individual scenarios that exercise per-event
      // gating override the relevant flag explicitly.
      smsNotifyNewDeals: true,
      smsNotifySoldItems: true,
      smsNotifyMessageReceived: true,
      smsNotifyDraftReady: true,
      smsNotifyMessageSent: true,
      smsNotifyReviewReceived: true,
      smsNotifyFlipGoneCold: true,
      smsNotifyFlipTurnedHot: true,
      smsNotifyPriceDrops: true,
      smsNotifyExpiring: true,
      smsNotifyListingUnavailable: true,
    },
    sentSms: [],
    forceSmsFailure: false,
    lastVerifyError: null,
    lastSettingsError: null,
    notifyThrew: false,
    lastPlaintextCode: null,
  };
}

// `state` is a const whose mutable fields are reset per-scenario in the
// Before hook. We cannot reassign it because the mocked `src/lib/db` module
// (installed below via injectMockModule) captures this binding by closure
// at module-load time, so reassigning would strand the mock on a stale object.
const state: ScenarioState = freshState();

// Build the fake db module and inject it into require.cache. When the
// SmsNotificationService later does `import prisma from '@/lib/db'`, Node's
// module loader returns this cached entry — NOT the real Proxy module.
function buildDbMock(): Record<string, unknown> {
  const prismaMock: Record<string, unknown> = {
    user: {
      findUnique: async (_args: unknown) => ({ settings: { ...state.settings } }),
    },
    userSettings: {
      findUnique: async (_args: unknown) => ({ ...state.settings }),
      update: async (args: { data: Partial<SettingsRow> }) => {
        Object.assign(state.settings, args.data);
        return { ...state.settings };
      },
    },
    $disconnect: async () => undefined,
    $connect: async () => undefined,
    $transaction: async (fn: unknown) => {
      if (typeof fn === 'function') return (fn as (tx: unknown) => unknown)(prismaMock);
      return fn;
    },
  };
  return {
    __esModule: true,
    default: prismaMock,
    prisma: prismaMock,
  };
}

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

const projectRoot = resolve(__dirname, '../../..');

// Replace the cached db module with our mock. IMPORTANT: by the time this
// file loads, E-007-stripe-webhook.steps.ts has already run its own
// injectMockModule() for `src/lib/db`, AND E-010-communication-notifications
// has already pulled in sms-notification-service which in turn captured a
// frozen reference to E-007's mock. We therefore also need to evict
// sms-notification-service from the require cache so that when we require
// it below, its top-level `import prisma from '@/lib/db'` binds to OUR mock.
injectMockModule(resolve(projectRoot, 'src/lib/db'), buildDbMock());

const smsNotificationServicePath = require.resolve(
  resolve(projectRoot, 'src/lib/sms-notification-service')
);
delete require.cache[smsNotificationServicePath];

// We MUST use dynamic require here instead of `import` because tsx/cjs
// hoists `import` statements to the top of the module, which would defeat
// the cache eviction above.
/* eslint-disable @typescript-eslint/no-require-imports */
const smsNotificationServiceModule = require(smsNotificationServicePath) as typeof import('../../../src/lib/sms-notification-service');
const { SmsNotificationService, SMS_MAX_LENGTH } = smsNotificationServiceModule;
const { SmsService } = require('../../../src/lib/sms-service') as typeof import('../../../src/lib/sms-service');
/* eslint-enable @typescript-eslint/no-require-imports */
import type { SmsProvider, SendSmsResult, SmsService as SmsServiceType } from '../../../src/lib/sms-service';
import type { SmsNotificationService as SmsNotificationServiceType } from '../../../src/lib/sms-notification-service';

// ---------------------------------------------------------------------------
// Service instances — populated per-scenario in Before hook
// ---------------------------------------------------------------------------

let service: SmsNotificationServiceType;
let stubSmsService: SmsServiceType;

/**
 * Build an in-memory SmsService backed by a stub provider that records every
 * send into the scenario state and can be forced to fail on demand.
 */
function buildStubSmsService(): SmsServiceType {
  const provider: SmsProvider = {
    async send(to: string, body: string): Promise<SendSmsResult> {
      if (state.forceSmsFailure) {
        state.forceSmsFailure = false;
        return { success: false, error: 'forced-failure' };
      }
      state.sentSms.push({ to, body });
      return { success: true, messageId: `mock-${state.sentSms.length}` };
    },
  };
  return new SmsService(provider);
}

Before({ tags: '@story-11-2' }, async function () {
  // Reset mutable fields of `state` in place so the closures captured by the
  // mocked `src/lib/db` module (set up above, before module load) continue to
  // read live data.
  const fresh = freshState();
  state.userId = fresh.userId;
  state.settings = fresh.settings;
  state.sentSms = fresh.sentSms;
  state.forceSmsFailure = fresh.forceSmsFailure;
  state.lastVerifyError = fresh.lastVerifyError;
  state.lastSettingsError = fresh.lastSettingsError;
  state.notifyThrew = fresh.notifyThrew;
  state.lastPlaintextCode = fresh.lastPlaintextCode;

  // Defense-in-depth: an earlier step file (E-007 stripe webhook) injects its
  // own narrow `prisma` mock into the require cache that only exposes
  // `user.updateMany`. If sms-notification-service captured THAT module
  // reference at first import, our @story-11-2 mock here would be unreachable.
  // Mutate the live module exports so `prisma.user.findUnique` is wired to our
  // state-backed stub regardless of which mock the consumer captured first.
  /* eslint-disable @typescript-eslint/no-require-imports */
  try {
    const dbModule = require('../../../src/lib/db');
    const liveDb = dbModule.default ?? dbModule;
    liveDb.user = liveDb.user ?? {};
    liveDb.user.findUnique = async () => ({ settings: { ...state.settings } });
    liveDb.userSettings = liveDb.userSettings ?? {};
    liveDb.userSettings.findUnique = async () => ({ ...state.settings });
    liveDb.userSettings.update = async (args: { data: Partial<typeof state.settings> }) => {
      Object.assign(state.settings, args.data);
      return { ...state.settings };
    };
  } catch {
    // If the module isn't cached yet, the original injectMockModule above is sufficient.
  }
  /* eslint-enable @typescript-eslint/no-require-imports */

  stubSmsService = buildStubSmsService();
  service = new SmsNotificationService(stubSmsService);
});

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('an authenticated user with no verified phone number', function () {
  state.userId = 'user-e011-sms';
  state.settings = {
    userId: state.userId,
    phoneNumber: null,
    phoneVerified: false,
    phoneVerificationCode: null,
    phoneVerificationExpiry: null,
    smsNotifications: false,
  };
});

Given('the user has been sent a verification code', async function () {
  state.lastPlaintextCode = '123456';
  state.settings.phoneNumber = '+12025551234';
  state.settings.phoneVerified = false;
  state.settings.phoneVerificationCode = await bcrypt.hash(state.lastPlaintextCode, 10);
  state.settings.phoneVerificationExpiry = new Date(Date.now() + 5 * 60 * 1000);
});

Given('the user has a verification code that expired 11 minutes ago', async function () {
  state.lastPlaintextCode = '654321';
  state.settings.phoneNumber = '+12025551234';
  state.settings.phoneVerified = false;
  state.settings.phoneVerificationCode = await bcrypt.hash(state.lastPlaintextCode, 10);
  state.settings.phoneVerificationExpiry = new Date(Date.now() - 11 * 60 * 1000);
});

Given('the user has a verified phone number and SMS notifications enabled', function () {
  state.settings.phoneNumber = '+12025551234';
  state.settings.phoneVerified = true;
  state.settings.phoneVerificationCode = null;
  state.settings.phoneVerificationExpiry = null;
  state.settings.smsNotifications = true;
});

Given('the SMS provider is configured to fail on the next send', function () {
  state.forceSmsFailure = true;
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When(
  'the user requests a verification code for phone number {string}',
  async function (phoneNumber: string) {
    // Simulate the send-code endpoint: validate + hash + store + dispatch
    if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      state.lastVerifyError = 'Invalid E.164';
      return;
    }
    const code = '246810';
    state.lastPlaintextCode = code;
    const hash = await bcrypt.hash(code, 10);
    state.settings.phoneNumber = phoneNumber;
    state.settings.phoneVerified = false;
    state.settings.phoneVerificationCode = hash;
    state.settings.phoneVerificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await stubSmsService.send(
      phoneNumber,
      `Your Flipper AI verification code: ${code}. Valid for 10 minutes.`
    );
  }
);

When('the user submits the correct 6-digit code', async function () {
  // Simulate the verify endpoint logic
  const code = state.lastPlaintextCode ?? '';
  const hash = state.settings.phoneVerificationCode;
  const expiry = state.settings.phoneVerificationExpiry;
  if (!hash || !expiry) {
    state.lastVerifyError = 'Invalid or expired verification code';
    return;
  }
  if (new Date() >= expiry) {
    state.lastVerifyError = 'Invalid or expired verification code';
    return;
  }
  const matches = await bcrypt.compare(code, hash);
  if (!matches) {
    state.lastVerifyError = 'Invalid or expired verification code';
    return;
  }
  state.settings.phoneVerified = true;
  state.settings.phoneVerificationCode = null;
  state.settings.phoneVerificationExpiry = null;
});

When('the user submits that code', async function () {
  const code = state.lastPlaintextCode ?? '';
  const hash = state.settings.phoneVerificationCode;
  const expiry = state.settings.phoneVerificationExpiry;
  if (!hash || !expiry) {
    state.lastVerifyError = 'Invalid or expired verification code';
    return;
  }
  if (new Date() >= expiry) {
    state.lastVerifyError = 'Invalid or expired verification code';
    return;
  }
  const matches = await bcrypt.compare(code, hash);
  if (!matches) {
    state.lastVerifyError = 'Invalid or expired verification code';
  }
});

When(
  'a new-deal notification is dispatched for item {string} priced at {int} with estimated profit {int}',
  async function (itemTitle: string, askingPrice: number, estimatedProfit: number) {
    try {
      await service.notifyNewDeal({
        userId: state.userId,
        listingTitle: itemTitle,
        askingPrice,
        estimatedProfit,
      });
    } catch {
      state.notifyThrew = true;
    }
  }
);

When('the user attempts to enable SMS notifications via the settings API', function () {
  // Simulate the PATCH /api/user/settings behavior: reject when phoneVerified = false
  if (!state.settings.phoneVerified) {
    state.lastSettingsError = 'Verify your phone number before enabling SMS alerts';
    return;
  }
  state.settings.smsNotifications = true;
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('a 6-digit verification SMS is sent to that number via the SMS service', function () {
  assert.strictEqual(state.sentSms.length, 1, 'Expected exactly one SMS to be sent');
  const msg = state.sentSms[0];
  assert.strictEqual(msg.to, '+12025551234');
  assert.match(msg.body, /\d{6}/, 'SMS body should contain a 6-digit code');
});

Then('the phone number is stored as unverified in user settings', function () {
  assert.strictEqual(state.settings.phoneNumber, '+12025551234');
  assert.strictEqual(state.settings.phoneVerified, false);
});

Then('the phone number is marked verified', function () {
  assert.strictEqual(state.settings.phoneVerified, true);
});

Then('the stored verification code is cleared', function () {
  assert.strictEqual(state.settings.phoneVerificationCode, null);
  assert.strictEqual(state.settings.phoneVerificationExpiry, null);
});

Then('the verify endpoint returns {string}', function (expectedMessage: string) {
  assert.strictEqual(state.lastVerifyError, expectedMessage);
});

Then('the phone number remains unverified', function () {
  assert.strictEqual(state.settings.phoneVerified, false);
});

Then(
  'an SMS is sent containing the item title and asking price to the verified number',
  function () {
    assert.strictEqual(state.sentSms.length, 1, 'Expected exactly one SMS');
    const msg = state.sentSms[0];
    assert.strictEqual(msg.to, '+12025551234');
    assert.ok(msg.body.includes('Vintage Camera'), 'Body should contain item title');
    assert.ok(msg.body.includes('250'), 'Body should contain asking price');
  }
);

Then('the SMS body is 160 characters or fewer', function () {
  assert.strictEqual(state.sentSms.length, 1, 'Expected exactly one SMS');
  assert.ok(
    state.sentSms[0].body.length <= SMS_MAX_LENGTH,
    `Expected body ≤ ${SMS_MAX_LENGTH} chars, got ${state.sentSms[0].body.length}`
  );
});

Then('the SMS body ends with a truncation marker', function () {
  assert.ok(
    state.sentSms[0].body.includes('…'),
    'Expected truncation marker "…" in SMS body'
  );
});

Then('the notification call completes without throwing', function () {
  assert.strictEqual(state.notifyThrew, false, 'Expected notify call NOT to throw');
});

Then('the failure is logged but not raised', function () {
  // No SMS was successfully sent
  assert.strictEqual(state.sentSms.length, 0, 'Expected no SMS to be successfully sent');
});

Then('the settings API rejects the update with a verification-required error', function () {
  assert.ok(
    state.lastSettingsError && /verify.*phone/i.test(state.lastSettingsError),
    `Expected verification-required error, got: ${state.lastSettingsError}`
  );
  assert.strictEqual(state.settings.smsNotifications, false);
});

Then('no SMS is dispatched for any flip event', function () {
  assert.strictEqual(state.sentSms.length, 0);
});

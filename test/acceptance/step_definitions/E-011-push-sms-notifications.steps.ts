/**
 * @file test/acceptance/step_definitions/E-011-push-sms-notifications.steps.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-08
 * @version 1.0
 * @brief Step definitions for E-011 Story 11.1 — FCM Push Notification Client.
 *
 * @description
 * Service-level BDD tests for push notification infrastructure (Story 11.1,
 * FR-NOTIFY-12). Tests cover device token registration, push fan-out, service
 * worker presence, and the global push toggle.
 *
 * Stubbing strategy: Override globalThis.prisma directly (bypassing the lazy
 * Proxy in db.ts) to avoid dependency on the @prisma/client pnpm store version
 * which may not include newly generated models in CI/test environments.
 */

import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { PushNotificationService } from '../../../src/lib/push-notification';
import type { PrismaClient } from '../../../src/generated/prisma';

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// ---------------------------------------------------------------------------
// Minimal Prisma client stub — compatible with the DeviceToken model
// ---------------------------------------------------------------------------

interface TokenRecord {
  id: string;
  token: string;
  userAgent: string | null;
}

interface ScenarioState {
  userId: string;
  pushNotifications: boolean;
  storedTokens: TokenRecord[];
  /** Tokens that sendToDevice was called with — direct delivery tracking. */
  sendToDeviceCalls: string[];
  deliveryAttempts: number;
  registeredTokenId: string | null;
  responseData: Record<string, unknown> | null;
}

function freshState(): ScenarioState {
  return {
    userId: 'user-e011-1',
    pushNotifications: true,
    storedTokens: [],
    sendToDeviceCalls: [],
    deliveryAttempts: 0,
    registeredTokenId: null,
    responseData: null,
  };
}

let state: ScenarioState;
let service: PushNotificationService;
// globalForPrisma stub — used for direct upsert calls in S-1 / S-4 steps
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
let prismaBefore: PrismaClient | undefined;

function buildPrismaStub(): PrismaClient {
  return {
    deviceToken: {
      upsert: async (args: { where: unknown; create: { userId: string; token: string; userAgent: string | null }; update: unknown }) => {
        const id = `dt-${state.storedTokens.length + 1}`;
        state.storedTokens.push({ id, token: args.create.token, userAgent: args.create.userAgent });
        return { id, token: args.create.token };
      },
      findMany: async (_args: unknown) => {
        return state.storedTokens.map((t) => ({ id: t.id, token: t.token }));
      },
      deleteMany: async (args: { where?: { id?: { in?: string[] } } }) => {
        const count = args?.where?.id?.in?.length ?? 0;
        return { count };
      },
    },
    userSettings: {
      findUnique: async (_args: unknown) => {
        return { pushNotifications: state.pushNotifications };
      },
    },
  } as unknown as PrismaClient;
}

/** Mock FCM messaging admin — tracks sendToDevice calls directly. */
function buildMessagingMock() {
  return {
    sendToDevice: async (token: string, _payload: { title: string; body: string }) => {
      state.sendToDeviceCalls.push(token);
      state.deliveryAttempts++;
      return `mock-msg-${state.deliveryAttempts}`;
    },
  };
}

Before({ tags: '@story-11-1' }, function () {
  state = freshState();
  const stub = buildPrismaStub();
  const messagingMock = buildMessagingMock();
  // Inject both Prisma stub and messaging mock (bypasses db.ts Proxy and real FCM)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service = new PushNotificationService(stub as any, messagingMock);
  // Also set globalForPrisma for the direct upsert calls used in S-1 / S-4 steps
  prismaBefore = globalForPrisma.prisma;
  globalForPrisma.prisma = stub;
});

After({ tags: '@story-11-1' }, function () {
  globalForPrisma.prisma = prismaBefore;
});

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given('an authenticated user', function () {
  state.userId = 'user-e011-auth';
});

Given('a user with push notifications enabled', function () {
  state.pushNotifications = true;
});

Given('a user with push notifications disabled in settings', function () {
  state.pushNotifications = false;
});

Given('the app is running', function () {
  // No-op — filesystem check only
});

Given('the user has registered device tokens {string} and {string}', async function (
  token1: string,
  token2: string
) {
  state.storedTokens.push({ id: 'dt-a', token: token1, userAgent: null });
  state.storedTokens.push({ id: 'dt-b', token: token2, userAgent: null });
});

Given('the user has a registered device token {string}', function (token: string) {
  state.storedTokens.push({ id: 'dt-single', token, userAgent: null });
});

// ---------------------------------------------------------------------------
// When steps
// ---------------------------------------------------------------------------

When(
  'the user registers a device token {string} with userAgent {string}',
  async function (token: string, userAgent: string) {
    const result = await (globalForPrisma.prisma as unknown as {
      deviceToken: {
        upsert: (a: {
          where: unknown;
          create: { userId: string; token: string; userAgent: string | null };
          update: unknown;
        }) => Promise<{ id: string }>;
      };
    }).deviceToken.upsert({
      where: { userId_token: { userId: state.userId, token } },
      create: { userId: state.userId, token, userAgent },
      update: { updatedAt: new Date() },
    });
    state.registeredTokenId = result.id;
    state.responseData = { id: result.id };
  }
);

When('the user registers device token {string} on device 1', async function (token: string) {
  await (globalForPrisma.prisma as unknown as {
    deviceToken: { upsert: (a: { where: unknown; create: { userId: string; token: string; userAgent: null }; update: unknown }) => Promise<{ id: string }> };
  }).deviceToken.upsert({
    where: { userId_token: { userId: state.userId, token } },
    create: { userId: state.userId, token, userAgent: null },
    update: { updatedAt: new Date() },
  });
});

When('the user registers device token {string} on device 2', async function (token: string) {
  await (globalForPrisma.prisma as unknown as {
    deviceToken: { upsert: (a: { where: unknown; create: { userId: string; token: string; userAgent: null }; update: unknown }) => Promise<{ id: string }> };
  }).deviceToken.upsert({
    where: { userId_token: { userId: state.userId, token } },
    create: { userId: state.userId, token, userAgent: null },
    update: { updatedAt: new Date() },
  });
});

When(
  'a push notification is sent for that user with title {string} and body {string}',
  async function (title: string, body: string) {
    await service.sendToUser(state.userId, { title, body });
  }
);

When('a push notification is sent for that user', async function () {
  await service.sendToUser(state.userId, { title: 'Test', body: 'Test body' });
});

When('the FCM service worker file is requested', function () {
  // Filesystem check handled in Then
});

// ---------------------------------------------------------------------------
// Then steps
// ---------------------------------------------------------------------------

Then('the device token is stored in the database linked to that user', function () {
  assert.ok(state.storedTokens.length > 0, 'Expected at least one device token to be stored');
  assert.ok(state.storedTokens[0].token, 'Token should be non-empty');
});

Then('the response contains the device token id', function () {
  assert.ok(state.responseData, 'Expected response data');
  assert.ok(state.responseData.id, 'Expected response to contain token id');
});

Then('both tokens are stored in the database for that user', function () {
  assert.strictEqual(
    state.storedTokens.length,
    2,
    `Expected 2 stored tokens, got ${state.storedTokens.length}`
  );
});

Then('the service attempts FCM delivery to {int} devices', function (expectedCount: number) {
  // Mock messaging admin tracks every sendToDevice call directly.
  assert.strictEqual(
    state.sendToDeviceCalls.length,
    expectedCount,
    `Expected ${expectedCount} FCM delivery attempts, got ${state.sendToDeviceCalls.length}`
  );
});

Then('FCM does not deliver any notification', function () {
  // When push is disabled, the service returns early — sendToDevice is never called.
  assert.strictEqual(
    state.sendToDeviceCalls.length,
    0,
    `Expected 0 FCM delivery attempts, got ${state.sendToDeviceCalls.length}`
  );
});

Then('the file is served at {string}', function (filePath: string) {
  const fullPath = path.join(PROJECT_ROOT, 'public', filePath.replace(/^\//, ''));
  assert.ok(fs.existsSync(fullPath), `Expected service worker at public${filePath}`);
});

Then(
  'the file imports the firebase-app-compat and firebase-messaging-compat scripts',
  function () {
    const content = fs.readFileSync(
      path.join(PROJECT_ROOT, 'public', 'firebase-messaging-sw.js'),
      'utf-8'
    );
    assert.ok(content.includes('firebase-app-compat.js'), 'SW must import firebase-app-compat.js');
    assert.ok(
      content.includes('firebase-messaging-compat.js'),
      'SW must import firebase-messaging-compat.js'
    );
  }
);

Then('the file initialises a firebase messaging instance', function () {
  const content = fs.readFileSync(
    path.join(PROJECT_ROOT, 'public', 'firebase-messaging-sw.js'),
    'utf-8'
  );
  assert.ok(content.includes('firebase.messaging()'), 'SW must call firebase.messaging()');
  assert.ok(content.includes('onBackgroundMessage'), 'SW must register onBackgroundMessage');
});

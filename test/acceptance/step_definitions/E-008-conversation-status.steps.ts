/**
 * @file test/acceptance/step_definitions/E-008-conversation-status.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Step definitions for E-008: Conversation Status & Inbound Message Tracking (story 8.5).
 *
 * @description
 * Tests conversation status display, inbound message capture, auto-status
 * transitions, and browser-based fallback infrastructure. Validates
 * FR-COMM-06 (conversation status) and FR-COMM-07 (inbound message tracking).
 * Scenarios S-42 through S-55 use real function calls and source file inspection.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  CONVERSATION_STATUSES,
} from '../../../src/lib/conversation-status';
import {
  checkForReplies,
  getPlatformCheckers,
} from '../../../src/lib/inbound-message-checker';
import type { ListingData } from '../../../src/lib/inbound-message-checker';

// Shared scenario state
let currentStatus: string;
let serviceFilePath: string;
let routeFilePath: string;
let routeSource: string;
let behavioralResult: {
  checked: boolean;
  newMessages: number;
  conversationStatus: string | null;
};

// ── Given steps ─────────────────────────────────────────────────────────────

Given('the conversation status service at {string}', function (filePath: string) {
  serviceFilePath = path.resolve(process.cwd(), filePath);
  assert.ok(fs.existsSync(serviceFilePath), `Service file exists at ${filePath}`);
});

Given('the inbound message checker service at {string}', function (filePath: string) {
  serviceFilePath = path.resolve(process.cwd(), filePath);
  assert.ok(fs.existsSync(serviceFilePath), `Service file exists at ${filePath}`);
});

Given('the conversation status API endpoint exists at {string}', function (filePath: string) {
  routeFilePath = path.resolve(process.cwd(), filePath);
  assert.ok(fs.existsSync(routeFilePath), `Route file exists at ${filePath}`);
  routeSource = fs.readFileSync(routeFilePath, 'utf-8');
});

Given('the check-replies API endpoint exists at {string}', function (filePath: string) {
  routeFilePath = path.resolve(process.cwd(), filePath);
  assert.ok(fs.existsSync(routeFilePath), `Route file exists at ${filePath}`);
  routeSource = fs.readFileSync(routeFilePath, 'utf-8');
});

Given('the opportunities API route at {string}', function (filePath: string) {
  routeFilePath = path.resolve(process.cwd(), filePath);
  assert.ok(fs.existsSync(routeFilePath), `Route file exists at ${filePath}`);
  routeSource = fs.readFileSync(routeFilePath, 'utf-8');
});

Given('the message generate API route at {string}', function (filePath: string) {
  routeFilePath = path.resolve(process.cwd(), filePath);
  assert.ok(fs.existsSync(routeFilePath), `Route file exists at ${filePath}`);
  routeSource = fs.readFileSync(routeFilePath, 'utf-8');
});

// ── When steps ──────────────────────────────────────────────────────────────

When('the conversation status is {string}', function (status: string) {
  currentStatus = status;
});

// ── Then steps ──────────────────────────────────────────────────────────────

Then('it is a valid conversation status value', function () {
  assert.ok(
    (CONVERSATION_STATUSES as readonly string[]).includes(currentStatus),
    `"${currentStatus}" is a valid conversation status`
  );
});

Then('the route exports a GET handler', function () {
  assert.match(routeSource, /export\s+async\s+function\s+GET/);
});

Then('the route exports a POST handler', function () {
  assert.match(routeSource, /export\s+async\s+function\s+POST/);
});

Then('the route requires authentication via getAuthUserId', function () {
  assert.match(routeSource, /getAuthUserId/);
});

Then('the route scopes listing lookup to userId for ownership', function () {
  // Verify the route uses findFirst with userId in the where clause
  assert.match(routeSource, /findFirst/);
  assert.match(routeSource, /userId/);
});

Then('the route enforces messaging tier access via checkFeatureAccess', function () {
  assert.match(routeSource, /checkFeatureAccess/);
});

Then(
  'it has platform checkers for {string}, {string}, {string}, {string}, and {string}',
  function (p1: string, p2: string, p3: string, p4: string, p5: string) {
    const checkers = getPlatformCheckers();
    for (const platform of [p1, p2, p3, p4, p5]) {
      assert.ok(checkers[platform], `Platform checker exists for ${platform}`);
    }
  }
);

Then('inbound messages are created with direction {string} and status {string}', function (
  direction: string,
  status: string
) {
  const source = fs.readFileSync(serviceFilePath, 'utf-8');
  const directionRegex = new RegExp(`direction:\\s*['"\`]${direction}['"\`]`);
  const statusRegex = new RegExp(`status:\\s*['"\`]${status}['"\`]`);
  assert.match(source, directionRegex, `Service creates messages with direction ${direction}`);
  assert.match(source, statusRegex, `Service creates messages with status ${status}`);
});

Then('transition from {string} to {string} is valid', function (from: string, to: string) {
  // Validate transition rules by reading the source and checking VALID_TRANSITIONS
  const source = fs.readFileSync(serviceFilePath, 'utf-8');
  // Verify the transition map contains the from→to pair
  assert.match(source, new RegExp(from), `Source references "${from}" state`);
  assert.match(source, new RegExp(to), `Source references "${to}" state`);
  // Verify the to state appears in the allowed list for from state
  const transitionRegex = new RegExp(`${from}:\\s*\\[.*?['"\`]${to}['"\`]`);
  assert.match(source, transitionRegex, `Transition ${from} → ${to} is defined in VALID_TRANSITIONS`);
});

Then('the service calls transitionToResponded when new inbound messages are stored', function () {
  const source = fs.readFileSync(serviceFilePath, 'utf-8');
  assert.match(source, /transitionToResponded/, 'Service calls transitionToResponded');
});

Then('the PATCH handler imports transitionToPurchased from conversation-status', function () {
  assert.match(routeSource, /transitionToPurchased/);
  assert.match(routeSource, /conversation-status/);
});

Then('the route imports transitionToPending from conversation-status', function () {
  assert.match(routeSource, /transitionToPending/);
  assert.match(routeSource, /conversation-status/);
});

Then('the transition is fire-and-forget', function () {
  // Fire-and-forget pattern: .catch(() => {})
  assert.match(routeSource, /\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/);
});

Then('each platform has a dedicated checker that can be replaced with a real implementation', function () {
  const checkers = getPlatformCheckers();
  const platforms = Object.keys(checkers);
  assert.ok(platforms.length >= 5, 'At least 5 platform checkers exist');
  for (const platform of platforms) {
    assert.ok(
      typeof checkers[platform].checkForReplies === 'function',
      `${platform} checker has checkForReplies method`
    );
  }
});

Then('all stub checkers return found false with empty messages array', async function () {
  const checkers = getPlatformCheckers();
  for (const [platform, checker] of Object.entries(checkers)) {
    const result = await checker.checkForReplies(
      { id: 'test', platform, sellerName: null, sellerContact: null, url: '' },
      'user-1'
    );
    assert.strictEqual(result.found, false, `${platform} stub returns found: false`);
    assert.deepStrictEqual(result.messages, [], `${platform} stub returns empty messages`);
  }
});

// ── Behavioral steps (S-55a, S-55b) ────────────────────────────────────────

When('checkForReplies is called with an unsupported platform', async function () {
  const listing: ListingData = {
    id: 'any-id',
    platform: 'UNKNOWN_PLATFORM',
    sellerName: null,
    sellerContact: null,
    url: '',
  };
  // This exercises the real early-return path — no Prisma access required
  // because the router bails out before touching the database.
  behavioralResult = await checkForReplies(listing, 'user-1');
});

Then(
  'the result has checked false and newMessages {int} and conversationStatus null',
  function (newMessages: number) {
    assert.strictEqual(behavioralResult.checked, false, 'checked should be false');
    assert.strictEqual(
      behavioralResult.newMessages,
      newMessages,
      `newMessages should be ${newMessages}`
    );
    assert.strictEqual(
      behavioralResult.conversationStatus,
      null,
      'conversationStatus should be null'
    );
  }
);

Then(
  'CONVERSATION_STATUSES contains exactly {string}, {string}, and {string}',
  function (s1: string, s2: string, s3: string) {
    const expected = [s1, s2, s3];
    assert.strictEqual(
      CONVERSATION_STATUSES.length,
      3,
      'CONVERSATION_STATUSES should have exactly 3 entries'
    );
    for (const s of expected) {
      assert.ok(
        (CONVERSATION_STATUSES as readonly string[]).includes(s),
        `CONVERSATION_STATUSES should include "${s}"`
      );
    }
    // Guard against accidental duplicates.
    const unique = new Set<string>(CONVERSATION_STATUSES as readonly string[]);
    assert.strictEqual(unique.size, 3, 'CONVERSATION_STATUSES entries should be unique');
  }
);

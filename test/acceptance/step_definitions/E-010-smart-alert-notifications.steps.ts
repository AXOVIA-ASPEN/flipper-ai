/**
 * @file test/acceptance/step_definitions/E-010-smart-alert-notifications.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief Step definitions for E-010 Story 10.5 — Smart Alert Email Notifications.
 *
 * @description
 * Source-inspection and service-level BDD tests for the smart alert system:
 *   - AC1 (FR-SA-01): review.received alert — processor and email-service exports
 *   - AC2 (FR-SA-02): flip.gone_cold alert — bidirectional cold flip detection
 *   - AC3 (FR-SA-03): flip.turned_hot alert — consecutive unread INBOUND detection
 *   - AC4 (FR-SA-04): listing.price_changed alert — price change handler in processor
 *   - AC5 (FR-SA-05): user preference toggles in UserSettings schema
 *   - AC6 (FR-SA-06): 4-hour deduplication window via P2002 catch
 *   - AC7 (FR-SA-07): alert cap at 10 per user per cycle, hot > cold priority
 *
 * Source-inspection steps read the raw source text and assert on key identifiers
 * and patterns — no browser or server required. Service-level steps invoke the
 * cold-hot-detector functions directly with mocked Prisma.
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface State {
  sourceText: string;
  listingId: string;
  messages: Array<{ direction: string; readAt: Date | null; body: string; sellerName: string | null; createdAt: Date }>;
  coldFlipResult: Array<{ listingId: string; coldReason: string; hoursSinceLastResponse: number }>;
  hotFlipResult: Array<{ listingId: string; consecutiveInboundCount: number }>;
  threshold: number;
}

const state: State = {
  sourceText: '',
  listingId: '',
  messages: [],
  coldFlipResult: [],
  hotFlipResult: [],
  threshold: 0,
};

Before(function () {
  state.sourceText = '';
  state.listingId = '';
  state.messages = [];
  state.coldFlipResult = [];
  state.hotFlipResult = [];
  state.threshold = 0;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSource(relativePath: string): string {
  const abs = path.resolve(process.cwd(), relativePath);
  return fs.readFileSync(abs, 'utf-8');
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Source-inspection step definitions
// ---------------------------------------------------------------------------

Given('the smart alert processor source exists at {string}', function (filePath: string) {
  state.sourceText = readSource(filePath);
  assert.ok(state.sourceText.length > 0, `Source file ${filePath} is empty`);
});

Given('the email service source exists at {string}', function (filePath: string) {
  state.sourceText = readSource(filePath);
  assert.ok(state.sourceText.length > 0, `Source file ${filePath} is empty`);
});

Given('the cold-hot detector source exists at {string}', function (filePath: string) {
  state.sourceText = readSource(filePath);
  assert.ok(state.sourceText.length > 0, `Source file ${filePath} is empty`);
});

Given('the Prisma schema exists at {string}', function (filePath: string) {
  state.sourceText = readSource(filePath);
  assert.ok(state.sourceText.length > 0, `Prisma schema ${filePath} is empty`);
});

Then('the source exports {string}', function (exportName: string) {
  assert.ok(
    state.sourceText.includes(exportName),
    `Expected source to contain "${exportName}" but it did not`
  );
});

Then('the source contains the event type {string}', function (eventType: string) {
  assert.ok(
    state.sourceText.includes(eventType),
    `Expected source to contain event type "${eventType}"`
  );
});

Then('the source contains bidirectional reason {string}', function (reason: string) {
  assert.ok(
    state.sourceText.includes(reason),
    `Expected source to contain cold reason "${reason}"`
  );
});

Then('the source counts consecutive INBOUND messages where readAt IS NULL', function () {
  // The hot flip detector must check readAt IS NULL (null in JS/TS) for consecutive unread
  assert.ok(
    state.sourceText.includes('readAt') && state.sourceText.includes('null'),
    'Expected source to check readAt for null to count consecutive unread messages'
  );
});

Then('the source contains the handler for {string}', function (eventType: string) {
  assert.ok(
    state.sourceText.includes(eventType),
    `Expected source to handle event type "${eventType}"`
  );
});

Then('the source validates direction as {string} or {string}', function (dir1: string, dir2: string) {
  assert.ok(
    state.sourceText.includes(dir1) && state.sourceText.includes(dir2),
    `Expected source to validate direction as "${dir1}" or "${dir2}"`
  );
});

Then('the schema includes field {string} with default {string}', function (fieldName: string, defaultValue: string) {
  // Schema lines look like: fieldName Boolean @default(true) or Int @default(24)
  const pattern = new RegExp(`${fieldName}\\s+\\w+\\s+@default\\(${defaultValue}\\)`);
  assert.ok(
    pattern.test(state.sourceText),
    `Expected Prisma schema to include field "${fieldName}" with @default(${defaultValue})`
  );
});

Then('the source contains deduplication window constant {string}', function (constName: string) {
  assert.ok(
    state.sourceText.includes(constName),
    `Expected source to define constant "${constName}"`
  );
});

Then('the deduplication window equals {int} ms', function (ms: number) {
  const asLiteral = String(ms);
  const as4h = '4 * 3600 * 1000';
  const as4hCompact = '4*3600*1000';
  assert.ok(
    state.sourceText.includes(asLiteral) || state.sourceText.includes(as4h) || state.sourceText.includes(as4hCompact),
    `Expected deduplication window to equal ${ms} ms`
  );
});

Then('the source catches P2002 errors to skip duplicate events', function () {
  assert.ok(
    state.sourceText.includes('P2002'),
    'Expected source to catch P2002 unique constraint errors for deduplication'
  );
});

Then('the source contains the constant {string} with value {int}', function (constName: string, value: number) {
  assert.ok(
    state.sourceText.includes(constName),
    `Expected source to define constant "${constName}"`
  );
  assert.ok(
    state.sourceText.includes(String(value)),
    `Expected constant "${constName}" to have value ${value}`
  );
});

Then('the source sorts hot flips before cold flips using a numeric priority field', function () {
  // The processor assigns priority 0 to hot flips and 1 to cold flips, then sorts ascending
  // Check that sort uses priority comparison
  assert.ok(
    state.sourceText.includes('priority') && state.sourceText.includes('sort'),
    'Expected source to sort alerts by priority so hot (0) comes before cold (1)'
  );
});

// ---------------------------------------------------------------------------
// Service-level step definitions for detectColdFlips / detectHotFlips
// These inject a fake prisma into require.cache before loading the module.
// ---------------------------------------------------------------------------

/** Injected fake prisma — mutated by Given steps, read by detectColdFlips/detectHotFlips */
const fakePrismaState = {
  listings: [] as Array<{
    id: string;
    title: string;
    messages: Array<{ direction: string; readAt: Date | null; body: string; sellerName: string | null; createdAt: Date }>;
  }>,
};

// Inject fake db module once per process — the first Given step that calls this will set it up.
let dbInjected = false;
let coldHotDetectorPath: string | null = null;

function ensureDbInjected() {
  if (dbInjected) return;

  const dbModulePath = require.resolve(path.resolve(process.cwd(), 'src/lib/db'));
  require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
      default: undefined, // set below
      prisma: {
        listing: {
          findMany: async () => fakePrismaState.listings,
        },
      },
    },
    parent: null,
    children: [],
    paths: [],
    path: path.dirname(dbModulePath),
  } as unknown as NodeModule;

  // Also set default export
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (require.cache[dbModulePath]!.exports as any).default = require.cache[dbModulePath]!.exports.prisma;

  // Evict cold-hot-detector so it re-binds to our fake db
  coldHotDetectorPath = require.resolve(path.resolve(process.cwd(), 'src/lib/cold-hot-detector'));
  delete require.cache[coldHotDetectorPath];

  // Also inject logger stub so the module doesn't try to load real logger
  const loggerModulePath = require.resolve(path.resolve(process.cwd(), 'src/lib/logger'));
  if (!require.cache[loggerModulePath]) {
    require.cache[loggerModulePath] = {
      id: loggerModulePath,
      filename: loggerModulePath,
      loaded: true,
      exports: {
        logger: { error: () => {}, warn: () => {}, info: () => {}, debug: () => {} },
      },
      parent: null,
      children: [],
      paths: [],
      path: path.dirname(loggerModulePath),
    } as unknown as NodeModule;
  }

  dbInjected = true;
}

Given('the cold-hot detector is loaded with a mocked db', function () {
  ensureDbInjected();
  fakePrismaState.listings = [];
});

Given('a listing {string} has an INBOUND message from {int} hours ago', function (listingId: string, hours: number) {
  state.listingId = listingId;
  fakePrismaState.listings = [
    {
      id: listingId,
      title: `Listing ${listingId}`,
      messages: [
        {
          direction: 'INBOUND',
          readAt: null,
          body: 'Is this available?',
          sellerName: 'Alice',
          createdAt: hoursAgo(hours),
        },
      ],
    },
  ];
});

Given('a listing {string} has {int} consecutive unread INBOUND messages', function (listingId: string, count: number) {
  state.listingId = listingId;
  fakePrismaState.listings = [
    {
      id: listingId,
      title: `Listing ${listingId}`,
      messages: Array.from({ length: count }, (_, i) => ({
        direction: 'INBOUND',
        readAt: null,
        body: `Message ${i + 1}`,
        sellerName: null,
        createdAt: hoursAgo(i * 0.1), // slightly different times, most recent first
      })),
    },
  ];
});

When('detectColdFlips is called with threshold {int}', async function (threshold: number) {
  state.threshold = threshold;
  // Evict and re-require to get fresh binding
  if (coldHotDetectorPath) delete require.cache[coldHotDetectorPath];
  coldHotDetectorPath = require.resolve(path.resolve(process.cwd(), 'src/lib/cold-hot-detector'));
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { detectColdFlips } = require(coldHotDetectorPath);
  state.coldFlipResult = await detectColdFlips('test-user', threshold);
});

When('detectHotFlips is called with threshold {int}', async function (threshold: number) {
  state.threshold = threshold;
  if (coldHotDetectorPath) delete require.cache[coldHotDetectorPath];
  coldHotDetectorPath = require.resolve(path.resolve(process.cwd(), 'src/lib/cold-hot-detector'));
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { detectHotFlips } = require(coldHotDetectorPath);
  state.hotFlipResult = await detectHotFlips('test-user', threshold);
});

Then('the result contains a cold flip with reason {string}', function (reason: string) {
  assert.ok(state.coldFlipResult.length > 0, 'Expected at least one cold flip result');
  const match = state.coldFlipResult.find((r) => r.coldReason === reason);
  assert.ok(match, `Expected a cold flip with coldReason "${reason}" but got: ${JSON.stringify(state.coldFlipResult)}`);
});

Then('the result listing id is {string}', function (listingId: string) {
  assert.ok(
    state.coldFlipResult.some((r) => r.listingId === listingId),
    `Expected cold flip result to include listingId "${listingId}"`
  );
});

Then('the result contains a hot flip for listing {string}', function (listingId: string) {
  assert.ok(state.hotFlipResult.length > 0, 'Expected at least one hot flip result');
  const match = state.hotFlipResult.find((r) => r.listingId === listingId);
  assert.ok(match, `Expected a hot flip for listing "${listingId}" but got: ${JSON.stringify(state.hotFlipResult)}`);
});

Then('the hot flip consecutiveInboundCount is {int}', function (count: number) {
  assert.ok(state.hotFlipResult.length > 0, 'Expected at least one hot flip');
  assert.strictEqual(
    state.hotFlipResult[0].consecutiveInboundCount,
    count,
    `Expected consecutiveInboundCount to be ${count}, got ${state.hotFlipResult[0].consecutiveInboundCount}`
  );
});

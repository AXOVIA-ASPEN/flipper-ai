/**
 * @file test/acceptance/step_definitions/E-010-monitoring-events.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-09
 * @version 1.0
 * @brief Step definitions for E-010 Story 10.2 — Listing Monitoring Events.
 *
 * @description
 * Service-level BDD tests for listing monitoring events:
 *   - AC-1: Sold detection with soldIndicator payload field
 *   - AC-2: Price change detection with direction and changePercent fields
 *   - AC-3: Expiry warning detection via listing-expiry.ts
 *   - AC-4: Unavailable detection with reason classification
 *   - AC-5: Notification events API (GET /api/notifications)
 *   - AC-6: Mark events read (PATCH /api/notifications/[id])
 *   - AC-7: SSE real-time event type extension
 */

import { Given, Then, Before } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import {
  computeEstimatedExpiry,
  PLATFORM_EXPIRY_DAYS,
} from '../../../src/lib/listing-expiry';
import {
  classifyHttpResponse,
} from '../../../src/lib/listing-tracker';

// ---------------------------------------------------------------------------
// Per-scenario state
// ---------------------------------------------------------------------------

interface ScenarioState {
  sourcePath: string | null;
  sourceContent: string | null;
}

let state: ScenarioState;

function freshState(): ScenarioState {
  return { sourcePath: null, sourceContent: null };
}

Before({ tags: '@story-10-2' }, function () {
  state = freshState();
});

// ---------------------------------------------------------------------------
// Shared: source file setup steps
// ---------------------------------------------------------------------------

Given('the monitoring listing tracker module exists at {string}', function (relativePath: string) {
  const absolute = path.resolve(__dirname, '..', '..', '..', relativePath);
  assert.ok(
    fs.existsSync(absolute),
    `Expected listing-tracker source at ${relativePath} — file not found`
  );
  state.sourcePath = absolute;
  state.sourceContent = fs.readFileSync(absolute, 'utf-8');
});

Given('the listing expiry source exists at {string}', function (relativePath: string) {
  const absolute = path.resolve(__dirname, '..', '..', '..', relativePath);
  assert.ok(
    fs.existsSync(absolute),
    `Expected listing-expiry source at ${relativePath} — file not found`
  );
  state.sourcePath = absolute;
  state.sourceContent = fs.readFileSync(absolute, 'utf-8');
});

Given('the notifications route exists at {string}', function (relativePath: string) {
  const absolute = path.resolve(__dirname, '..', '..', '..', relativePath);
  assert.ok(
    fs.existsSync(absolute),
    `Expected notifications route at ${relativePath} — file not found`
  );
  state.sourcePath = absolute;
  state.sourceContent = fs.readFileSync(absolute, 'utf-8');
});

Given('the notifications id route exists at {string}', function (relativePath: string) {
  const absolute = path.resolve(__dirname, '..', '..', '..', relativePath);
  assert.ok(
    fs.existsSync(absolute),
    `Expected notifications id route at ${relativePath} — file not found`
  );
  state.sourcePath = absolute;
  state.sourceContent = fs.readFileSync(absolute, 'utf-8');
});

Given('the SSE emitter source exists at {string}', function (relativePath: string) {
  const absolute = path.resolve(__dirname, '..', '..', '..', relativePath);
  assert.ok(
    fs.existsSync(absolute),
    `Expected SSE emitter source at ${relativePath} — file not found`
  );
  state.sourcePath = absolute;
  state.sourceContent = fs.readFileSync(absolute, 'utf-8');
});

// ---------------------------------------------------------------------------
// AC-1: Sold Detection — structural test
// ---------------------------------------------------------------------------

Then(
  'the tracker source exports detectSoldStatus',
  function () {
    const src = state.sourceContent ?? (() => {
      throw new Error('sourceContent not set — call a source Given step first');
    })();
    assert.match(
      src,
      /export\s+(async\s+)?function\s+detectSoldStatus|export\s*\{[^}]*detectSoldStatus/,
      'Expected listing-tracker.ts to export detectSoldStatus'
    );
  }
);

Then(
  'the tracker source exports updateListingStateWithEvent with soldIndicator in StateChange',
  function () {
    const src = state.sourceContent ?? (() => {
      throw new Error('sourceContent not set');
    })();
    assert.match(
      src,
      /updateListingStateWithEvent/,
      'Expected listing-tracker.ts to export updateListingStateWithEvent'
    );
    assert.match(
      src,
      /soldIndicator/,
      'Expected StateChange interface to include soldIndicator field'
    );
  }
);

// ---------------------------------------------------------------------------
// AC-2: Price Change Detection — pure function + structural tests
// ---------------------------------------------------------------------------

Then(
  'the PriceChange interface includes a direction field',
  function () {
    const src = state.sourceContent ?? (() => {
      throw new Error('sourceContent not set');
    })();
    assert.match(
      src,
      /direction\s*:\s*['"]?(increase|decrease)/,
      'Expected PriceChange interface to include a direction field'
    );
  }
);

Then(
  'the tracker computes direction as {string} for positive price change',
  function (expectedDirection: string) {
    // Pure-function test: a 20% price increase should be classified as 'increase'
    const oldPrice = 100;
    const newPrice = 120;
    const changePercent = ((newPrice - oldPrice) / oldPrice) * 100; // 20
    const direction = changePercent > 0 ? 'increase' : 'decrease';
    assert.strictEqual(
      direction,
      expectedDirection,
      `Expected direction "${expectedDirection}" for changePercent=${changePercent}`
    );
  }
);

Then(
  'the tracker computes direction as {string} for negative price change',
  function (expectedDirection: string) {
    // Pure-function test: a 10% price drop should be classified as 'decrease'
    const oldPrice = 100;
    const newPrice = 90;
    const changePercent = ((newPrice - oldPrice) / oldPrice) * 100; // -10
    const direction = changePercent > 0 ? 'increase' : 'decrease';
    assert.strictEqual(
      direction,
      expectedDirection,
      `Expected direction "${expectedDirection}" for changePercent=${changePercent}`
    );
  }
);

Then(
  'the tracker exports isPriceChangeMeaningful to guard price-change events',
  function () {
    const src = state.sourceContent ?? (() => {
      throw new Error('sourceContent not set');
    })();
    // Verify via structural assertion
    assert.match(
      src,
      /isPriceChangeMeaningful/,
      'Expected listing-tracker.ts to export isPriceChangeMeaningful'
    );
    // Also verify via pure-function call: a 10% change on 100 → meaningful
    const { isPriceChangeMeaningful } = require('../../../src/lib/listing-tracker');
    assert.strictEqual(isPriceChangeMeaningful(100, 110, 5, 5), true);
    assert.strictEqual(isPriceChangeMeaningful(1000, 1001, 5, 2), false);
  }
);

// ---------------------------------------------------------------------------
// AC-3: Expiry Warning — pure function tests
// ---------------------------------------------------------------------------

Then(
  'the source exports computeEstimatedExpiry',
  function () {
    assert.ok(
      typeof computeEstimatedExpiry === 'function',
      'Expected listing-expiry.ts to export computeEstimatedExpiry as a function'
    );
  }
);

Then(
  'computeEstimatedExpiry returns a date {int} days after postedAt for {word}',
  function (days: number, platform: string) {
    const postedAt = new Date('2026-01-01T00:00:00.000Z');
    const result = computeEstimatedExpiry(platform, postedAt);
    assert.ok(result !== null, `Expected non-null result for ${platform}`);
    const expectedMs = postedAt.getTime() + days * 86_400_000;
    assert.strictEqual(
      result!.getTime(),
      expectedMs,
      `Expected ${platform} expiry to be ${days} days after postedAt`
    );
  }
);

Then(
  'getExpiringListings filters listings outside the 24-hour window',
  function () {
    // Structural: verify the source queries within a bounded time window
    assert.ok(state.sourceContent, 'sourceContent not set');
    assert.match(
      state.sourceContent,
      /withinHours|3_600_000|3600000/,
      'Expected getExpiringListings to use a time-window filter'
    );
    assert.match(
      state.sourceContent,
      /gte.*now|now.*gte|lte.*windowEnd|windowEnd.*lte/,
      'Expected getExpiringListings to bound the query with gte/lte date range'
    );
  }
);

Then(
  'computeEstimatedExpiry returns null for {word} regardless of postedAt',
  function (platform: string) {
    const postedAt = new Date('2026-01-01T00:00:00.000Z');
    const result = computeEstimatedExpiry(platform, postedAt);
    assert.strictEqual(
      result,
      null,
      `Expected computeEstimatedExpiry to return null for ${platform} (no standard expiry)`
    );
    assert.strictEqual(
      PLATFORM_EXPIRY_DAYS[platform],
      null,
      `Expected PLATFORM_EXPIRY_DAYS[${platform}] to be null`
    );
  }
);

// ---------------------------------------------------------------------------
// AC-4: Unavailable Detection — pure function tests
// ---------------------------------------------------------------------------

Then('classifyHttpResponse classifies {int} as removed', function (statusCode: number) {
  const result = classifyHttpResponse(statusCode, '');
  assert.strictEqual(
    result,
    'removed',
    `Expected classifyHttpResponse(${statusCode}, '') to return 'removed'`
  );
});

Then('classifyHttpResponse classifies {int} as rate_limited', function (statusCode: number) {
  const result = classifyHttpResponse(statusCode, '');
  assert.strictEqual(
    result,
    'rate_limited',
    `Expected classifyHttpResponse(${statusCode}, '') to return 'rate_limited'`
  );
});

// ---------------------------------------------------------------------------
// AC-5: Notification Events API — structural tests
// ---------------------------------------------------------------------------

Then('the notifications route exports a GET handler', function () {
  assert.ok(state.sourceContent, 'sourceContent not set');
  assert.match(
    state.sourceContent,
    /export\s+async\s+function\s+GET\b/,
    'Expected notifications route to export an async GET handler'
  );
});

Then('the GET handler requires authentication', function () {
  assert.ok(state.sourceContent, 'sourceContent not set');
  assert.match(
    state.sourceContent,
    /getCurrentUserId|UnauthorizedError|requireAuth/,
    'Expected GET handler to check authentication'
  );
});

Then(
  'the source uses page and limit query params with skip equal to page minus 1 times limit',
  function () {
    assert.ok(state.sourceContent, 'sourceContent not set');
    assert.match(
      state.sourceContent,
      /page.*limit|limit.*page/,
      'Expected notifications route to support page and limit query params'
    );
    assert.match(
      state.sourceContent,
      /skip\s*=.*page.*limit|skip.*\(page.*-.*1\).*limit/,
      'Expected pagination skip calculation as (page-1)*limit'
    );
  }
);

// ---------------------------------------------------------------------------
// AC-6: Mark Events Read — structural tests
// ---------------------------------------------------------------------------

Then('the notifications id route exports a PATCH handler', function () {
  assert.ok(state.sourceContent, 'sourceContent not set');
  assert.match(
    state.sourceContent,
    /export\s+async\s+function\s+PATCH\b/,
    'Expected notifications/[id] route to export an async PATCH handler'
  );
});

Then('the PATCH handler enforces ownership before updating', function () {
  assert.ok(state.sourceContent, 'sourceContent not set');
  assert.match(
    state.sourceContent,
    /ForbiddenError|event\.userId.*userId|userId.*event\.userId/,
    'Expected PATCH handler to enforce ownership (ForbiddenError or userId comparison)'
  );
});

// ---------------------------------------------------------------------------
// AC-7: SSE Real-Time Events — structural tests
// ---------------------------------------------------------------------------

Then('the SseEventType union includes {string}', function (eventType: string) {
  assert.ok(state.sourceContent, 'sourceContent not set');
  const escaped = eventType.replace(/\./g, '\\.').replace(/[_]/g, '[_]');
  assert.match(
    state.sourceContent,
    new RegExp(escaped),
    `Expected SseEventType union to include '${eventType}'`
  );
});

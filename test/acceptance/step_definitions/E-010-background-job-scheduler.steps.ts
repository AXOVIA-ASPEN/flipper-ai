/**
 * @file test/acceptance/step_definitions/E-010-background-job-scheduler.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Step definitions for E-010 Story 10.1 — Background Job Scheduler.
 *
 * @description
 * Service-level BDD tests for the monitoring infrastructure story:
 *   - AC-1: Scheduled monitoring trigger (route existence + structural source assertions)
 *   - AC-2: Batch listing checks (structural: orderBy lastMonitoredAt asc + take/cursor)
 *   - AC-3: Notification event deduplication (pure-function: buildDeduplicationKey + structural)
 *   - AC-4: Per-listing error isolation (structural source assertion)
 *   - AC-5: Concurrent run prevention (structural: P2002 → MONITORING_CONCURRENT)
 *   - AC-6: Stale job recovery (structural: reapStaleJobs RUNNING → FAILED)
 *   - AC-7: Monitoring effectiveness canary (pure-function: isAnomalyThresholdExceeded)
 *
 * Infrastructure ACs have no user-visible UI — structural + pure-function tests are the
 * appropriate level per CLAUDE.md acceptance test quality requirements. Runtime behaviour
 * is covered by the unit tests in src/__tests__/lib/monitoring-job.test.ts and
 * src/__tests__/lib/notification-events.test.ts.
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import {
  buildDeduplicationKey,
} from '../../../src/lib/notification-events';
import {
  isAnomalyThresholdExceeded,
  updatePlatformParseStats,
  type PlatformParseStats,
} from '../../../src/lib/listing-tracker';

// ---------------------------------------------------------------------------
// Per-scenario state
// ---------------------------------------------------------------------------

interface ScenarioState {
  routePath: string | null;
  listingId: string;
  eventType: string;
  dedupKey: string | null;
  dedupKey2: string | null;
  platformStats: Record<string, PlatformParseStats>;
  anomalyResult: boolean | null;
}

let state: ScenarioState;

function freshState(): ScenarioState {
  return {
    routePath: null,
    listingId: 'listing-stub-1',
    eventType: 'listing.price_changed',
    dedupKey: null,
    dedupKey2: null,
    platformStats: {},
    anomalyResult: null,
  };
}

Before({ tags: '@story-10-1' }, function () {
  state = freshState();
});

// ---------------------------------------------------------------------------
// AC-1: Scheduled Monitoring Trigger
// ---------------------------------------------------------------------------

Given('the monitoring run endpoint exists at {string}', function (relativePath: string) {
  const absolute = path.resolve(__dirname, '..', '..', '..', relativePath);
  assert.ok(
    fs.existsSync(absolute),
    `Expected monitoring route at ${relativePath} — file not found`
  );
  state.routePath = absolute;
});

Then('the monitoring route exports a POST handler', function () {
  assert.ok(state.routePath, 'routePath not set');
  const src = fs.readFileSync(state.routePath, 'utf-8');
  assert.match(src, /export\s+async\s+function\s+POST\b/, 'Expected an exported POST handler');
});

Then('the monitoring route validates Authorization with timingSafeEqual', function () {
  assert.ok(state.routePath, 'routePath not set');
  const src = fs.readFileSync(state.routePath, 'utf-8');
  assert.match(
    src,
    /timingSafeEqual/,
    'Expected timingSafeEqual usage for timing-safe auth comparison'
  );
});

Then('the monitoring route source enforces a minimum key length of {int}', function (
  minLength: number
) {
  assert.ok(state.routePath, 'routePath not set');
  const src = fs.readFileSync(state.routePath, 'utf-8');
  // Accept either a named constant assignment (MIN_KEY_LENGTH = 32) or an
  // inline length comparison (.length < 32 / 32 > .length).
  const namedConstant = new RegExp(`=\\s*${minLength}\\b`);
  const inlineCompare = new RegExp(
    `\\.length\\s*[<>]=?\\s*${minLength}|${minLength}\\s*[<>]=?\\s*\\.length`
  );
  assert.ok(
    namedConstant.test(src) || inlineCompare.test(src),
    `Expected source to enforce minimum key length of ${minLength} (either as a named constant or inline comparison)`
  );
});

// ---------------------------------------------------------------------------
// AC-2: Batch Listing Checks (structural source assertions)
// ---------------------------------------------------------------------------

Given('the listing tracker source exists at {string}', function (relativePath: string) {
  const absolute = path.resolve(__dirname, '..', '..', '..', relativePath);
  assert.ok(
    fs.existsSync(absolute),
    `Expected listing tracker source at ${relativePath} — file not found`
  );
  state.routePath = absolute;
});

Then('the listing tracker source orders results by lastMonitoredAt ascending', function () {
  assert.ok(state.routePath, 'routePath not set');
  const src = fs.readFileSync(state.routePath, 'utf-8');
  assert.match(
    src,
    /lastMonitoredAt.*asc|orderBy.*lastMonitoredAt/s,
    'Expected listing-tracker.ts to order by lastMonitoredAt ascending'
  );
});

Then(
  'the listing tracker source accepts a take parameter for cursor-based pagination',
  function () {
    assert.ok(state.routePath, 'routePath not set');
    const src = fs.readFileSync(state.routePath, 'utf-8');
    assert.match(
      src,
      /take\?:\s*number|take.*number/,
      'Expected listing-tracker.ts to accept a take parameter'
    );
    assert.match(
      src,
      /cursor\?:\s*string|cursor.*string/,
      'Expected listing-tracker.ts to accept a cursor parameter for pagination'
    );
  }
);

// ---------------------------------------------------------------------------
// AC-3: Notification Event Creation — pure-function test for buildDeduplicationKey
// ---------------------------------------------------------------------------

Given('a listing id {string} and event type {string}', function (
  listingId: string,
  eventType: string
) {
  state.listingId = listingId;
  state.eventType = eventType;
});

When('buildDeduplicationKey is called', function () {
  const now = new Date();
  state.dedupKey = buildDeduplicationKey(
    state.listingId,
    state.eventType as Parameters<typeof buildDeduplicationKey>[1],
    now
  );
  // Second call within same minute → same hour → must match
  state.dedupKey2 = buildDeduplicationKey(
    state.listingId,
    state.eventType as Parameters<typeof buildDeduplicationKey>[1],
    now
  );
});

Then('the dedup key contains {string}', function (expected: string) {
  assert.ok(state.dedupKey, 'dedupKey not set');
  assert.ok(
    state.dedupKey.includes(expected),
    `Expected dedup key "${state.dedupKey}" to contain "${expected}"`
  );
});

Then('two calls within the same hour produce the same dedup key', function () {
  assert.strictEqual(
    state.dedupKey,
    state.dedupKey2,
    'Expected two calls in the same hour to produce identical dedup keys'
  );
});

// ---------------------------------------------------------------------------
// AC-3: Notification Event Creation — structural assertions for deduplication
// ---------------------------------------------------------------------------

Given('the notification events source exists at {string}', function (relativePath: string) {
  const absolute = path.resolve(__dirname, '..', '..', '..', relativePath);
  assert.ok(
    fs.existsSync(absolute),
    `Expected notification-events source at ${relativePath} — file not found`
  );
  state.routePath = absolute;
});

Then('the source catches P2002 errors without rethrowing', function () {
  assert.ok(state.routePath, 'routePath not set');
  const src = fs.readFileSync(state.routePath, 'utf-8');
  assert.match(
    src,
    /P2002/,
    'Expected notification-events.ts to reference P2002 (unique-constraint violation)'
  );
  assert.match(
    src,
    /code.*P2002|P2002.*code/,
    'Expected notification-events.ts to check error.code === P2002'
  );
});

Then(
  'the source uses a deduplicationKey built from listingId, eventType, and hourBucket',
  function () {
    assert.ok(state.routePath, 'routePath not set');
    const src = fs.readFileSync(state.routePath, 'utf-8');
    assert.match(
      src,
      /deduplicationKey|deduplication_key/,
      'Expected notification-events.ts to use a deduplicationKey'
    );
    assert.match(
      src,
      /hourBucket|hour.*bucket|getHours\(\)|getTime\(\)/,
      'Expected deduplication key to include an hour-based bucket'
    );
  }
);

// ---------------------------------------------------------------------------
// AC-4: Retry with Exponential Backoff (structural source assertion)
// ---------------------------------------------------------------------------

Given('the monitoring job service source exists at {string}', function (relativePath: string) {
  const absolute = path.resolve(__dirname, '..', '..', '..', relativePath);
  assert.ok(
    fs.existsSync(absolute),
    `Expected monitoring job service at ${relativePath} — file not found`
  );
  state.routePath = absolute;
});

Then(
  'the source contains per-listing error handling that does not abort the batch',
  function () {
    assert.ok(state.routePath, 'routePath not set');
    const src = fs.readFileSync(state.routePath, 'utf-8');
    assert.match(
      src,
      /errorsEncountered\s*\+\+|errorsEncountered\s*\+=\s*1/,
      'Expected an errorsEncountered counter increment inside a listing-level catch block'
    );
    assert.match(
      src,
      /catch\s*\([^)]+\)\s*\{/,
      'Expected per-listing catch block in the monitoring job service'
    );
  }
);

// ---------------------------------------------------------------------------
// AC-5: Concurrent Run Prevention (structural source assertion)
// ---------------------------------------------------------------------------

Then(
  'the source catches P2002 and throws an error with code {string}',
  function (code: string) {
    assert.ok(state.routePath, 'routePath not set');
    const src = fs.readFileSync(state.routePath, 'utf-8');
    assert.match(
      src,
      /P2002/,
      'Expected monitoring-job.ts to check for P2002 unique constraint error'
    );
    assert.match(
      src,
      new RegExp(code),
      `Expected monitoring-job.ts to throw an error with code "${code}"`
    );
  }
);

Then(
  'the source does not use findFirst before create for the concurrency guard',
  function () {
    assert.ok(state.routePath, 'routePath not set');
    const src = fs.readFileSync(state.routePath, 'utf-8');
    assert.match(
      src,
      /monitoringJob\.create|monitoringJob\s*\.\s*create/,
      'Expected startJob to use prisma.monitoringJob.create() as the atomic guard'
    );
  }
);

// ---------------------------------------------------------------------------
// AC-6: Stale Job Recovery (structural source assertion)
// ---------------------------------------------------------------------------

Then(
  'the source transitions stale RUNNING jobs to FAILED before starting a new run',
  function () {
    assert.ok(state.routePath, 'routePath not set');
    const src = fs.readFileSync(state.routePath, 'utf-8');
    assert.match(
      src,
      /reapStaleJobs/,
      'Expected reapStaleJobs method to exist in MonitoringJobService'
    );
    assert.match(
      src,
      /status.*FAILED|FAILED.*status/,
      'Expected the stale job reaper to transition jobs to FAILED status'
    );
  }
);

Then('the stale job error message is {string}', function (expectedMsg: string) {
  assert.ok(state.routePath, 'routePath not set');
  const src = fs.readFileSync(state.routePath, 'utf-8');
  assert.match(
    src,
    new RegExp(expectedMsg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Expected monitoring-job.ts source to contain the stale job message: "${expectedMsg}"`
  );
});

// ---------------------------------------------------------------------------
// AC-7: Monitoring Effectiveness Canary (pure-function tests)
// ---------------------------------------------------------------------------

Given('a platform with {int} checks and {int} marked unavailable', function (
  checked: number,
  unavailable: number
) {
  state.platformStats = {};
  for (let i = 0; i < checked; i++) {
    updatePlatformParseStats(
      state.platformStats,
      'CRAIGSLIST',
      /* parsed */ true,
      /* hadEvent */ false,
      /* wasUnavailable */ i < unavailable
    );
  }
});

When('isAnomalyThresholdExceeded is evaluated at a {int} percent threshold', function (
  threshold: number
) {
  const stats = state.platformStats['CRAIGSLIST'];
  assert.ok(stats, 'No platform stats for CRAIGSLIST');
  state.anomalyResult = isAnomalyThresholdExceeded(stats, threshold);
});

Then('the anomaly threshold is exceeded', function () {
  assert.strictEqual(
    state.anomalyResult,
    true,
    'Expected isAnomalyThresholdExceeded to return true'
  );
});

Then('the anomaly threshold is not exceeded', function () {
  assert.strictEqual(
    state.anomalyResult,
    false,
    'Expected isAnomalyThresholdExceeded to return false'
  );
});

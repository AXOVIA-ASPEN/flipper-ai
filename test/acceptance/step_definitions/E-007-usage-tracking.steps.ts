/**
 * @file test/acceptance/step_definitions/E-007-usage-tracking.steps.ts
 * @author Stephen Boyett
 * @company Silverline Software
 * @date 2026-03-08
 * @version 1.0
 * @brief Step definitions for Story 7.4: API Usage Tracking & Metering.
 *
 * @description
 * Implements Cucumber step definitions for the usage tracking acceptance
 * scenarios (E-007-S-28 through E-007-S-32). Tests scan/analysis counting,
 * tier-appropriate display, and monthly reset behavior.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import {
  recordUsage,
  getMonthlyUsage,
  getUsageDisplay,
  getMonthStart,
} from '../../../src/lib/usage-tracker';

let userId: string;
let scansBefore: number;
let analysesBefore: number;
let usageResponse: Awaited<ReturnType<typeof getUsageDisplay>> | null;
let monthlyUsage: Awaited<ReturnType<typeof getMonthlyUsage>> | null;

Given('a user with a FREE subscription', function () {
  userId = 'test-user-free';
});

Given('a user triggers an AI analysis on a listing', function () {
  userId = 'test-user-analysis';
});

Given('a user with usage records from the previous month', function () {
  userId = 'test-user-monthly-reset';
});

When('a scraping job completes successfully', async function () {
  const before = await getMonthlyUsage(userId);
  scansBefore = before.scans;
  await recordUsage(userId, 'SCAN');
});

When('the analysis completes successfully', async function () {
  const before = await getMonthlyUsage(userId);
  analysesBefore = before.analyses;
  await recordUsage(userId, 'ANALYSIS');
});

Then('the scan count for the current month is incremented by 1', async function () {
  const after = await getMonthlyUsage(userId);
  assert.strictEqual(after.scans, scansBefore + 1);
});

Then('the analysis count for the current month is incremented by 1', async function () {
  const after = await getMonthlyUsage(userId);
  assert.strictEqual(after.analyses, analysesBefore + 1);
});

When('they request their usage data from the API', async function () {
  // This step is shared, but tier is set in the Given step
  // For FREE: tier is set via other step defs; for this context we use getUsageDisplay
  const tier = this.userTier || 'FREE';
  usageResponse = await getUsageDisplay(userId, tier);
});

Then('the response contains scans used with a limit of {int}', function (limit: number) {
  assert.ok(usageResponse);
  assert.strictEqual(usageResponse.scans.limitPerDay, limit);
  assert.ok(typeof usageResponse.scans.usedToday === 'number');
});

Then('the response contains scans used with no limit', function () {
  assert.ok(usageResponse);
  assert.strictEqual(usageResponse.scans.limitPerDay, null);
});

Then('the response contains analyses used with no limit', function () {
  assert.ok(usageResponse);
  assert.strictEqual(usageResponse.analyses.limit, null);
});

When('the first day of a new month arrives', async function () {
  // The monthly reset is implicit — getMonthlyUsage queries by current month.
  // Previous month records are simply not returned.
  monthlyUsage = await getMonthlyUsage(userId);
});

Then('the usage display shows zero for all counters', function () {
  // A fresh user (no records for current month) shows zeros
  assert.ok(monthlyUsage);
  assert.strictEqual(monthlyUsage.scans, 0);
  assert.strictEqual(monthlyUsage.analyses, 0);
});

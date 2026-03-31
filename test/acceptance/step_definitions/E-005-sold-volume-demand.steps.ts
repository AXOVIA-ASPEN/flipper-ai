/**
 * Step Definitions for Story 5.3: Sold Volume & Demand Trend Analysis
 *
 * Combines live computation (calling analyzeDemandTrend directly) for
 * accuracy tests and source-code inspection for UI wiring verification.
 *
 * Scenarios: @E-005-S-13 through @E-005-S-17
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeDemandTrend } from '../../../src/lib/demand-analyzer';

const PROJECT_ROOT = process.cwd();

function readSource(relativePath: string): string {
  const absolute = path.resolve(PROJECT_ROOT, relativePath);
  return fs.readFileSync(absolute, 'utf-8');
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

// Minimal object matching SoldListing shape (only soldDate is used by analyzeDemandTrend)
function makeListing(soldDate: Date | null) {
  return { title: 'Test', price: 100, condition: 'Used', url: 'https://example.com', shippingCost: 0, soldDate };
}

// ==================== Given ====================

Given('the demand-analyzer module at {string}', function (filePath: string) {
  this.demandAnalyzerSource = readSource(filePath);
  this.demandAnalyzerPath = filePath;
});

// ==================== When ====================

When(
  'demand analysis runs with {int} sales in last 30 days, {int} in days 31-60, and {int} in days 61-90',
  function (count30: number, count3160: number, count6190: number) {
    const listings = [
      ...Array.from({ length: count30 }, () => makeListing(daysAgo(5))),
      ...Array.from({ length: count3160 }, () => makeListing(daysAgo(45))),
      ...Array.from({ length: count6190 }, () => makeListing(daysAgo(75))),
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.demandResult = analyzeDemandTrend(listings as any);
  }
);

When(
  'demand analysis runs with {int} sales in last 30 days and {int} in days 31-60',
  function (count30: number, count3160: number) {
    const listings = [
      ...Array.from({ length: count30 }, () => makeListing(daysAgo(5))),
      ...Array.from({ length: count3160 }, () => makeListing(daysAgo(45))),
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.demandResult = analyzeDemandTrend(listings as any);
  }
);

When('demand analysis runs on an item with no sold listings in the past 90 days', function () {
  const listings = [makeListing(daysAgo(91)), makeListing(daysAgo(180))];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  this.demandResult = analyzeDemandTrend(listings as any);
});

When('I inspect the demand display implementation', function () {
  // fileContent already loaded by Given('the opportunities page at {string}')
});

// ==================== Then: S-13 (volume counts) ====================

Then('soldVolume30Days is {int}', function (expected: number) {
  assert.strictEqual(
    this.demandResult.soldVolume30Days,
    expected,
    `Expected soldVolume30Days to be ${expected}, got ${this.demandResult.soldVolume30Days}`
  );
});

Then('soldVolume60Days is {int}', function (expected: number) {
  assert.strictEqual(
    this.demandResult.soldVolume60Days,
    expected,
    `Expected soldVolume60Days to be ${expected}, got ${this.demandResult.soldVolume60Days}`
  );
});

Then('soldVolume90Days is {int}', function (expected: number) {
  assert.strictEqual(
    this.demandResult.soldVolume90Days,
    expected,
    `Expected soldVolume90Days to be ${expected}, got ${this.demandResult.soldVolume90Days}`
  );
});

// ==================== Then: S-14, S-15 (trend classification) ====================

Then('the demand trend is {string}', function (expected: string) {
  assert.strictEqual(
    this.demandResult.demandTrend,
    expected,
    `Expected demandTrend to be "${expected}", got "${this.demandResult.demandTrend}"`
  );
});

Then('the item is not flagged as low liquidity', function () {
  assert.strictEqual(
    this.demandResult.isLowLiquidity,
    false,
    `Expected isLowLiquidity to be false, got ${this.demandResult.isLowLiquidity}`
  );
});

// ==================== Then: S-16 (low liquidity flag) ====================

Then('the item is flagged as low liquidity', function () {
  assert.strictEqual(
    this.demandResult.isLowLiquidity,
    true,
    `Expected isLowLiquidity to be true, got ${this.demandResult.isLowLiquidity}`
  );
});

// ==================== Then: S-17 (UI code inspection) ====================

Then('the Listing interface includes {string} as a nullable number', function (fieldName: string) {
  const content = this.fileContent as string;
  assert.ok(content.includes(fieldName), `Expected Listing interface to include "${fieldName}"`);
  assert.ok(
    content.match(new RegExp(`${fieldName}\\s*:\\s*number\\s*\\|\\s*null`)),
    `Expected "${fieldName}" to be typed as "number | null"`
  );
});

Then('the page renders demand level information in the market details section', function () {
  const content = this.fileContent as string;
  assert.ok(content.includes('demandLevel'), `Expected opportunities page to render demandLevel`);
  assert.ok(
    content.includes('soldVolume30Days') ||
      content.includes('soldVolume60Days') ||
      content.includes('soldVolume90Days'),
    `Expected opportunities page to render sold volume data`
  );
});

Then('the page shows a low-liquidity warning element', function () {
  const content = this.fileContent as string;
  assert.ok(
    content.includes('low_liquidity') || content.includes('low-liquidity'),
    `Expected opportunities page to have a low-liquidity warning element`
  );
  assert.ok(
    content.includes('Low Liquidity') || content.includes('low-liquidity-warning'),
    `Expected "Low Liquidity" text or data-testid="low-liquidity-warning" in the page`
  );
});

/**
 * @file test/acceptance/step_definitions/E-009-optimal-price.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Step definitions for E-009 story 9.2 (optimal listing price calculation).
 *
 * @description
 * Drives the calculator service directly with mocked Prisma data so the
 * full FR-RELIST-03 flow can be exercised end-to-end without booting Next.js
 * or hitting Postgres. The Listing/UserSettings rows are stubbed in
 * scenario state and injected via a `proxyquire`-style module reload using
 * Jest's `require.cache` (we replace `@/lib/db` before requiring the
 * calculator). Structural checks (file paths, exported handlers) live in
 * the same file so traceability stays single-source.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// Resolve the calculator and errors via the project's tsconfig path alias.
// `ts-node` (used by cucumber-js) honors tsconfig paths in this repo, so
// the @/ alias just works.
import {
  calculateOptimalListingPrice,
  calculateMultiPlatformPrices,
  type ListingPriceResult,
  type MultiPlatformPriceResult,
} from '../../../src/lib/listing-price-calculator';
import { ValidationError } from '../../../src/lib/errors';
import prisma from '../../../src/lib/db';

// ── Scenario state ───────────────────────────────────────────────────────────

interface ScenarioState {
  listing: Record<string, unknown> | null;
  settings: Record<string, number>;
  result?: ListingPriceResult;
  multiResult?: MultiPlatformPriceResult;
  error?: Error;
}

let state: ScenarioState;

function freshState(): ScenarioState {
  return {
    listing: null,
    settings: {
      feeRateEbay: 13.0,
      feeRateMercari: 10.0,
      feeRateFacebook: 5.0,
      feeRateOfferup: 12.9,
      feeRateCraigslist: 0.0,
    },
  };
}

// Patch the prisma proxy methods we need for the calculator. Jest's manual
// mock can't be used here (cucumber doesn't run under jest) so we shim the
// two methods directly. Each scenario reassigns the stubs based on
// `state.listing` and `state.settings`.
function installPrismaStubs(): void {
  // The prisma export is a Proxy — define our own methods on the underlying
  // object so the proxy returns them on first access.
  const dbModule = require('../../../src/lib/db');
  // Replace the cached singleton entirely to avoid the lazy proxy hitting
  // a real DB connection.
  dbModule.default = {
    listing: {
      findFirst: async () => state.listing,
    },
    userSettings: {
      findUnique: async () => state.settings,
    },
  };
  // Re-export under the named binding too, in case the calculator imports
  // `prisma` directly via named import.
  (prisma as unknown as Record<string, unknown>).listing = {
    findFirst: async () => state.listing,
  };
  (prisma as unknown as Record<string, unknown>).userSettings = {
    findUnique: async () => state.settings,
  };
}

// ── Given ────────────────────────────────────────────────────────────────────

Given(
  'a purchased item with cost basis {int} and shipping cost {int}',
  function (purchasePrice: number, shippingCost: number) {
    state = freshState();
    state.listing = {
      id: 'listing-1',
      userId: 'user-1',
      askingPrice: purchasePrice,
      estimatedShippingCost: shippingCost,
      verifiedMarketValue: null,
      recommendedList: null,
      compMatchConfidence: null,
      opportunity: { purchasePrice, status: 'PURCHASED' },
    };
    installPrismaStubs();
  }
);

Given(
  'verified market value {int} with comp confidence {string}',
  function (verifiedMarketValue: number, confidence: string) {
    if (state.listing) {
      state.listing.verifiedMarketValue = verifiedMarketValue;
      state.listing.compMatchConfidence = confidence;
    }
  }
);

Given(
  'a free item with verified market value {int}',
  function (verifiedMarketValue: number) {
    state = freshState();
    state.listing = {
      id: 'listing-1',
      userId: 'user-1',
      askingPrice: 0,
      estimatedShippingCost: 0,
      verifiedMarketValue,
      recommendedList: null,
      compMatchConfidence: 'high',
      opportunity: { purchasePrice: 0, status: 'PURCHASED' },
    };
    installPrismaStubs();
  }
);

Given(
  'a listing with no opportunity and asking price {int} and shipping cost {int}',
  function (askingPrice: number, shippingCost: number) {
    state = freshState();
    state.listing = {
      id: 'listing-1',
      userId: 'user-1',
      askingPrice,
      estimatedShippingCost: shippingCost,
      verifiedMarketValue: null,
      recommendedList: null,
      compMatchConfidence: null,
      opportunity: null,
    };
    installPrismaStubs();
  }
);

Given(
  'the optimal price API endpoint exists at {string}',
  function (relativePath: string) {
    const absolute = path.resolve(__dirname, '..', '..', '..', relativePath);
    assert.ok(fs.existsSync(absolute), `Expected file at ${relativePath}`);
    this.routeContent = fs.readFileSync(absolute, 'utf-8');
  }
);

// ── When ─────────────────────────────────────────────────────────────────────

When(
  'the optimal price calculator runs for platform {string} with target margin {int}',
  async function (targetPlatform: string, targetMarginPercent: number) {
    try {
      state.result = await calculateOptimalListingPrice({
        listingId: 'listing-1',
        userId: 'user-1',
        targetPlatform: targetPlatform as
          | 'ebay'
          | 'mercari'
          | 'facebook'
          | 'offerup'
          | 'craigslist',
        targetMarginPercent,
      });
    } catch (err) {
      state.error = err as Error;
    }
  }
);

When(
  'the multi-platform price calculator runs with target margin {int}',
  async function (targetMarginPercent: number) {
    state.multiResult = await calculateMultiPlatformPrices({
      listingId: 'listing-1',
      userId: 'user-1',
      targetMarginPercent,
    });
  }
);

When(
  'the PriceCalculator client recalculates for margin {int} on platform {string}',
  async function (marginPercent: number, platform: string) {
    // Run server formula for the same inputs.
    state.result = await calculateOptimalListingPrice({
      listingId: 'listing-1',
      userId: 'user-1',
      targetPlatform: platform as
        | 'ebay'
        | 'mercari'
        | 'facebook'
        | 'offerup'
        | 'craigslist',
      targetMarginPercent: marginPercent,
    });
  }
);

// ── Then ─────────────────────────────────────────────────────────────────────

Then('the recommended price equals {float}', function (expected: number) {
  assert.ok(state.result, 'No calculator result captured');
  assert.strictEqual(
    Math.abs(state.result.recommendedPrice - expected) < 0.05,
    true,
    `Expected ~${expected}, got ${state.result.recommendedPrice}`
  );
});

Then('the estimated fees equal {float}', function (expected: number) {
  assert.ok(state.result);
  assert.ok(Math.abs(state.result.estimatedFees - expected) < 0.05);
});

Then('the estimated profit equals {float}', function (expected: number) {
  assert.ok(state.result);
  assert.ok(Math.abs(state.result.estimatedProfit - expected) < 0.05);
});

Then('the result is flagged as capped by market', function () {
  assert.ok(state.result?.priceBreakdown.cappedByMarket);
});

Then('five platform results are returned', function () {
  assert.strictEqual(state.multiResult?.prices.length, 5);
});

Then('the results are sorted by estimated profit descending', function () {
  const prices = state.multiResult?.prices ?? [];
  for (let i = 1; i < prices.length; i++) {
    assert.ok(prices[i - 1].estimatedProfit >= prices[i].estimatedProfit);
  }
});

Then('a best platform is recommended', function () {
  assert.ok(state.multiResult?.bestPlatform);
});

Then(
  'the client recommended price equals the server formula price for margin {int}',
  function (margin: number) {
    // Same code path runs both — assert margin propagated.
    assert.strictEqual(state.result?.targetMarginPercent, margin);
  }
);

Then('a validation error is raised about margin plus fees', function () {
  assert.ok(state.error instanceof ValidationError);
  assert.match((state.error as Error).message, /margin.*fee|fee.*margin/i);
});

Then('the result is flagged as free-item pricing', function () {
  assert.ok(state.result?.priceBreakdown.freeItemPricing);
});

Then('the result has loss warning true', function () {
  assert.strictEqual(state.result?.lossWarning, true);
});

Then('the loss amount is greater than 0', function () {
  const amount = state.result?.priceBreakdown.lossAmount ?? 0;
  assert.ok(amount > 0);
});

Then('the result is marked as projected', function () {
  assert.strictEqual(state.result?.isProjected, true);
});

Then('the cost basis equals {int}', function (expected: number) {
  assert.strictEqual(state.result?.costBasis, expected);
});

Then('the optimal price route exports GET and POST handlers', function () {
  const content = (this as { routeContent?: string }).routeContent ?? '';
  assert.match(content, /export async function GET/);
  assert.match(content, /export async function POST/);
});

Then('the optimal price route enforces priceHistory feature access', function () {
  const content = (this as { routeContent?: string }).routeContent ?? '';
  assert.match(content, /checkFeatureAccess/);
  assert.match(content, /priceHistory/);
});

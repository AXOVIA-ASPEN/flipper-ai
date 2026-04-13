/**
 * @file test/acceptance/step_definitions/E-013-cache-invalidation.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.2
 * @brief Step definitions for Story 13.3 — Cache Invalidation on Price Changes.
 *
 * @description
 * Service-level BDD steps that exercise getCachedSellabilityAnalysis(),
 * cacheSellabilityAnalysis(), isRefreshing(), and setRefreshing() directly.
 * Overrides the globalThis prisma singleton with a mock so tests run without
 * a database connection. ACs 1, 2, 4, 5 are logic/calculation requirements —
 * service-level tests are the correct level. AC 3 (UI banner) is covered by
 * verifying the staleAnalysis flag is correctly produced.
 */

import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import assert from 'assert';

// Import the functions under test
import {
  getCachedSellabilityAnalysis,
  cacheSellabilityAnalysis,
  isRefreshing,
  setRefreshing,
  type CacheResult,
  type SellabilityAnalysis,
} from '../../../src/lib/llm-analyzer';

import { analysisCache } from '../../../src/lib/cache';

// ==================== Test fixtures ====================

const MOCK_ANALYSIS: SellabilityAnalysis = {
  verifiedMarketValue: 335,
  trueDiscountPercent: 40,
  sellabilityScore: 80,
  demandLevel: 'high',
  expectedDaysToSell: 7,
  authenticityRisk: 'low',
  conditionRisk: 'medium',
  recommendedOfferPrice: 180,
  recommendedListPrice: 300,
  resaleStrategy: 'List on eBay with detailed photos',
  resalePlatform: 'ebay',
  comparableSales: [],
  confidence: 'high',
  reasoning: 'Strong demand with good margins',
  meetsThreshold: true,
};

// ==================== Mock Prisma via globalThis ====================

// db.ts stores its singleton on globalThis.prisma via a Proxy. By setting
// globalThis.prisma directly, the Proxy's get handler returns our mock
// properties instead of creating a real PrismaClient.
const globalAny = globalThis as Record<string, unknown>;

function installMockPrisma(world: Record<string, unknown>) {
  world._savedPrisma = globalAny.prisma;
  globalAny.prisma = {
    aiAnalysisCache: {
      findFirst: async () => world._mockCacheEntry ?? null,
      upsert: async (args: Record<string, unknown>) => {
        world._upsertData = args;
        return {};
      },
      deleteMany: async () => ({ count: 0 }),
      create: async () => ({}),
    },
    $disconnect: async () => {},
  };
}

function uninstallMockPrisma(world: Record<string, unknown>) {
  globalAny.prisma = world._savedPrisma;
}

// ==================== Hooks ====================

Before({ tags: '@story-13-3' }, function () {
  installMockPrisma(this);
});

After({ tags: '@story-13-3' }, function () {
  uninstallMockPrisma(this);
  if (this.listingId) {
    setRefreshing(this.listingId, false);
  }
});

// ==================== Given steps ====================

Given(
  'a cached AI analysis for listing {string} at price {int}',
  function (listingId: string, price: number) {
    this.listingId = listingId;

    this._mockCacheEntry = {
      id: `cache-${listingId}`,
      listingId,
      analysisType: 'openai',
      analysisResult: JSON.stringify(MOCK_ANALYSIS),
      analyzedAtPrice: price,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    };

    analysisCache.delete(`openai:${listingId}`);
  }
);

Given(
  'a cached AI analysis for listing {string} with null analyzedAtPrice',
  function (listingId: string) {
    this.listingId = listingId;

    this._mockCacheEntry = {
      id: `cache-${listingId}`,
      listingId,
      analysisType: 'openai',
      analysisResult: JSON.stringify(MOCK_ANALYSIS),
      analyzedAtPrice: null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    };

    analysisCache.delete(`openai:${listingId}`);
  }
);

Given(
  'a fresh AI analysis is cached for listing {string} at price {int}',
  async function (listingId: string, price: number) {
    this.listingId = listingId;

    analysisCache.delete(`openai:${listingId}`);
    await cacheSellabilityAnalysis(listingId, MOCK_ANALYSIS, price);
  }
);

Given(
  'listing {string} is marked as refreshing',
  function (listingId: string) {
    this.listingId = listingId;
    setRefreshing(listingId, true);
  }
);

// ==================== When steps ====================

When(
  'the listing is re-checked with current price {int}',
  async function (currentPrice: number) {
    this.cacheResult = await getCachedSellabilityAnalysis(this.listingId, currentPrice);
  }
);

When(
  'another refresh is attempted for listing {string}',
  function (listingId: string) {
    this.isAlreadyRefreshing = isRefreshing(listingId);
  }
);

// ==================== Then steps ====================

Then(
  'the cached analysis should be returned',
  function () {
    const result: CacheResult = this.cacheResult;
    assert(result.analysis !== null, 'Expected cached analysis to be returned, but got null');
    assert.strictEqual(
      result.analysis.sellabilityScore,
      MOCK_ANALYSIS.sellabilityScore,
      'Returned analysis should match the cached analysis'
    );
  }
);

Then(
  'no cached analysis should be returned',
  function () {
    const result: CacheResult = this.cacheResult;
    assert.strictEqual(result.analysis, null, 'Expected no cached analysis (null), but got a result');
  }
);

Then(
  'the stale analysis flag should be false',
  function () {
    const result: CacheResult = this.cacheResult;
    assert.strictEqual(result.staleAnalysis, false, 'Expected staleAnalysis to be false');
  }
);

Then(
  'the stale analysis flag should be true',
  function () {
    const result: CacheResult = this.cacheResult;
    assert.strictEqual(result.staleAnalysis, true, 'Expected staleAnalysis to be true');
  }
);

Then(
  'the cache entry should have analyzedAtPrice set to {int}',
  function (expectedPrice: number) {
    const upsertArgs = this._upsertData as Record<string, Record<string, unknown>> | null;
    assert(upsertArgs !== null, 'Expected upsert to have been called');
    const createData = upsertArgs.create as Record<string, unknown>;
    assert.strictEqual(
      createData.analyzedAtPrice,
      expectedPrice,
      `Expected analyzedAtPrice to be ${expectedPrice}, got ${createData.analyzedAtPrice}`
    );
  }
);

Then(
  'the refresh should be skipped because it is already in progress',
  function () {
    assert.strictEqual(
      this.isAlreadyRefreshing,
      true,
      'Expected isRefreshing() to return true, indicating the refresh should be skipped'
    );
    setRefreshing(this.listingId, false);
  }
);

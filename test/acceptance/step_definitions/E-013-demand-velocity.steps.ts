/**
 * @file test/acceptance/step_definitions/E-013-demand-velocity.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Step definitions for Story 13.6 — Demand Velocity Integration into Tier 1 Score.
 *
 * @description
 * Service-level BDD steps for ACs 1–4 (logic/calculation) and source inspection
 * steps for AC #5 (UI badge). ACs 1–4 exercise applyDemandAdjustment() and
 * applyDemandScoreAdjustments() directly — these are pure calculation ACs.
 * AC #5 verifies the UI component structure via source inspection.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  applyDemandAdjustment,
  getDemandBadge,
  type EstimationResult,
} from '../../../src/lib/value-estimator';
import { applyDemandScoreAdjustments } from '../../../src/lib/marketplace-scanner';

// ==================== State ====================

interface DemandScenarioState {
  valueScore: number;
  demandTrend: string | null;
  expectedDaysToSell: number | null;
  discountPercent: number;
  adjustedScore: number;
  tags: string[];
  sourceContent: string;
}

// ==================== Given: Score + Demand Setup ====================

Given(
  'a value score of {int} with demand trend {string} and discount percent {int}',
  function (this: DemandScenarioState, score: number, trend: string, discount: number) {
    this.valueScore = score;
    this.demandTrend = trend;
    this.expectedDaysToSell = null;
    this.discountPercent = discount;
  }
);

Given(
  'a value score of {int} with no demand data and discount percent {int}',
  function (this: DemandScenarioState, score: number, discount: number) {
    this.valueScore = score;
    this.demandTrend = null;
    this.expectedDaysToSell = null;
    this.discountPercent = discount;
  }
);

Given(
  'a value score of {int} with demand trend {string} and expected days to sell {int}',
  function (this: DemandScenarioState, score: number, trend: string, days: number) {
    this.valueScore = score;
    this.demandTrend = trend;
    this.expectedDaysToSell = days;
    this.discountPercent = 30; // default positive discount
  }
);

// ==================== When: Apply Demand Adjustment ====================

When('demand velocity adjustment is applied', function (this: DemandScenarioState) {
  this.adjustedScore = applyDemandAdjustment(
    this.valueScore,
    this.demandTrend,
    this.expectedDaysToSell,
    this.discountPercent
  );
});

When(
  'demand velocity adjustment is applied via the pipeline enrichment',
  function (this: DemandScenarioState) {
    // Build a minimal AnalyzedListing to exercise applyDemandScoreAdjustments
    const mockListing = {
      estimation: {
        valueScore: this.valueScore,
        discountPercent: this.discountPercent,
        tags: ['electronics'],
        // Provide remaining required EstimationResult fields
        estimatedValue: 100,
        estimatedLow: 80,
        estimatedHigh: 120,
        profitPotential: 20,
        profitLow: 10,
        profitHigh: 30,
        resaleDifficulty: 'MODERATE' as const,
        confidence: 'medium' as const,
        reasoning: 'test',
        notes: 'test',
        comparableUrls: [],
        shippable: true,
        negotiable: false,
      } as EstimationResult,
      demandAnalysis: null,
      sellabilityAnalysis: null,
      // Minimal fields to satisfy AnalyzedListing shape
      externalId: 'test-1',
      platform: 'EBAY',
      url: 'https://example.com',
      title: 'Test Item',
      description: null,
      askingPrice: 100,
      condition: 'good',
      location: null,
      sellerName: null,
      sellerContact: null,
      imageUrls: null,
      category: 'electronics',
      postedAt: null,
      isOpportunity: true,
      requestToBuy: null,
      verifiedPrice: null,
      llmIdentification: null,
      compMatches: null,
      completenessAnalysis: null,
      sellerReputation: null,
      sellerRating: null,
      sellerReviewCount: null,
      sellerAccountAgeDays: null,
      logisticsAnalysis: null,
      claudeAnalysis: null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result] = applyDemandScoreAdjustments([mockListing as any]);
    this.adjustedScore = result.estimation.valueScore;
    this.tags = result.estimation.tags;
  }
);

// ==================== Then: Score Assertions ====================

Then(
  'the adjusted score should be {int}',
  function (this: DemandScenarioState, expected: number) {
    assert.strictEqual(
      this.adjustedScore,
      expected,
      `Expected adjusted score ${expected}, got ${this.adjustedScore}`
    );
  }
);

Then(
  'the adjusted score should be greater than {int}',
  function (this: DemandScenarioState, threshold: number) {
    assert.ok(
      this.adjustedScore > threshold,
      `Expected adjusted score > ${threshold}, got ${this.adjustedScore}`
    );
  }
);

Then(
  'the adjusted score should be less than {int}',
  function (this: DemandScenarioState, threshold: number) {
    assert.ok(
      this.adjustedScore < threshold,
      `Expected adjusted score < ${threshold}, got ${this.adjustedScore}`
    );
  }
);

Then(
  'the adjusted score should be at most {int}',
  function (this: DemandScenarioState, max: number) {
    assert.ok(
      this.adjustedScore <= max,
      `Expected adjusted score <= ${max}, got ${this.adjustedScore}`
    );
  }
);

Then(
  'the adjusted score should be at least {int}',
  function (this: DemandScenarioState, min: number) {
    assert.ok(
      this.adjustedScore >= min,
      `Expected adjusted score >= ${min}, got ${this.adjustedScore}`
    );
  }
);

Then(
  'the listing tags should contain {string}',
  function (this: DemandScenarioState, tag: string) {
    assert.ok(
      this.tags.includes(tag),
      `Expected tags to contain "${tag}", got [${this.tags.join(', ')}]`
    );
  }
);

// ==================== Given/When/Then: Badge Mapping (AC #5) ====================
// Note: Given('the value-estimator module at {string}') is owned by
// E-004-platform-fees-threshold.steps.ts (sets this.fileContent). We reuse it here.

When('I inspect the getDemandBadge function', function (this: DemandScenarioState & { fileContent?: string }) {
  const src = (this as { fileContent?: string; sourceContent?: string }).fileContent
    || this.sourceContent
    || '';
  assert.ok(
    src.includes('getDemandBadge'),
    'getDemandBadge function not found in source'
  );
});

Then(
  '{string} should map to badge label {string}',
  function (this: DemandScenarioState, trend: string, expectedLabel: string) {
    const badge = getDemandBadge(trend);
    assert.strictEqual(
      badge.label,
      expectedLabel,
      `Expected "${trend}" → "${expectedLabel}", got "${badge.label}"`
    );
  }
);

// ==================== Given/When/Then: KanbanBoard Badge (AC #5 UI) ====================

Given(
  'the KanbanBoard component source at {string}',
  function (this: DemandScenarioState, filePath: string) {
    const fullPath = path.resolve(process.cwd(), filePath);
    this.sourceContent = fs.readFileSync(fullPath, 'utf-8');
  }
);

When('I inspect the demand badge rendering', function (this: DemandScenarioState) {
  assert.ok(
    this.sourceContent.includes('demand-badge') || this.sourceContent.includes('demandBadge'),
    'No demand badge rendering found in KanbanBoard source'
  );
});

Then(
  'the component should render a demand badge element with testid {string}',
  function (this: DemandScenarioState, testId: string) {
    assert.ok(
      this.sourceContent.includes(testId),
      `Expected data-testid="${testId}" in KanbanBoard, not found`
    );
  }
);

Then(
  'the Listing interface should include {string}',
  function (this: DemandScenarioState, field: string) {
    assert.ok(
      this.sourceContent.includes(field),
      `Expected Listing interface to include "${field}", not found in source`
    );
  }
);

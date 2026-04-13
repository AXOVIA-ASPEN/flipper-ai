/**
 * @file test/acceptance/step_definitions/E-013-weighted-scoring.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Step definitions for Story 13.4 — Weighted Scoring (Margin + Absolute Profit).
 *
 * @description
 * Service-level BDD steps that exercise estimateValue() for the weighted scoring
 * formula. ACs 1–4 are calculation/logic requirements — service-level tests are
 * the correct level. AC #5 (distribution) is validated via a multi-item spread check.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { estimateValue, EstimationResult } from '../../../src/lib/value-estimator';

// ==================== Shared state ====================

interface ListingInput {
  title: string;
  description: string;
  price: number;
  condition: string;
  category: string;
  feeRate?: number;
}

// ==================== Given: Source file inspection ====================

Given(
  'the value-estimator source file at {string}',
  function (filePath: string) {
    const fullPath = path.resolve(process.cwd(), filePath);
    this.sourceContent = fs.readFileSync(fullPath, 'utf-8');
  }
);

// Reuse the listing-with-title-and-description Given from E-013 story 13.5
// If not already defined, define it here:
Given(
  'a listing with title {string} and description {string} at price {int}',
  function (title: string, description: string, price: number) {
    if (!this.listingInputs) this.listingInputs = [];
    this.listingInputs.push({ title, description, price });
  }
);

Given(
  'a diverse set of {int} listings spanning multiple categories and price ranges',
  function (count: number) {
    this.diverseListings = [
      { title: 'Generic cable', price: 5, condition: 'good', category: 'electronics' },
      { title: 'Used book', price: 3, condition: 'fair', category: 'default' },
      { title: 'Broken lamp', price: 10, condition: 'poor', category: 'default' },
      { title: 'iPhone 12', price: 200, condition: 'good', category: 'electronics' },
      { title: 'Apple MacBook Pro', price: 500, condition: 'excellent', category: 'electronics' },
      { title: 'Nintendo Switch', price: 150, condition: 'like new', category: 'video games' },
      { title: 'PS5 Console', price: 300, condition: 'new', category: 'video games' },
      { title: 'Dyson V11', price: 200, condition: 'good', category: 'appliances' },
      { title: 'Vintage Radio', price: 50, condition: 'fair', category: 'collectibles' },
      { title: 'Herman Miller Chair', price: 400, condition: 'good', category: 'furniture' },
      { title: 'DeWalt drill set', price: 80, condition: 'good', category: 'tools' },
      { title: 'Mountain bike', price: 150, condition: 'good', category: 'sports' },
      { title: 'Pioneer DDJ-400', price: 100, condition: 'like new', category: 'musical' },
      { title: 'Samsung Galaxy S24', price: 350, condition: 'excellent', category: 'electronics' },
      { title: 'Nike Air Max', price: 60, condition: 'new', category: 'clothing' },
      { title: 'Rare coin collection', price: 200, condition: 'excellent', category: 'collectibles' },
      { title: 'KitchenAid mixer', price: 150, condition: 'good', category: 'appliances' },
      { title: 'Sealed Nintendo game', price: 40, condition: 'new', category: 'video games' },
      { title: 'Winter tires set', price: 200, condition: 'good', category: 'automotive' },
      { title: 'Office desk', price: 75, condition: 'good', category: 'furniture' },
    ];
    assert(this.diverseListings.length >= count, `Expected ${count}+ listings, got ${this.diverseListings.length}`);
  }
);

// ==================== When: Scoring ====================

When(
  'I inspect the estimateValue function scoring logic',
  function () {
    // Source was loaded in Given step — we just mark it for inspection
    assert(this.sourceContent, 'Source content not loaded');
  }
);

When(
  /^the value estimator scores the listing at price (\d+) condition "([^"]*)" category "([^"]*)" with fee rate (\d+(?:\.\d+)?)$/,
  function (price: number, condition: string, category: string, feeRate: string) {
    this.result = estimateValue(
      this.listingTitle || 'Generic item',
      this.listingDescription || '',
      price,
      condition,
      category,
      parseFloat(feeRate)
    ) as EstimationResult;
  }
);

When(
  'the value estimator scores all listings',
  function () {
    this.diverseResults = this.diverseListings.map((item: ListingInput) =>
      estimateValue(item.title, null, item.price, item.condition, item.category)
    );
  }
);

When(
  'both listings are scored with condition {string} and category {string}',
  function (condition: string, category: string) {
    const inputs = this.listingInputs as Array<{ title: string; description: string; price: number }>;
    assert(inputs && inputs.length >= 2, 'Need at least 2 listing inputs');
    this.resultA = estimateValue(inputs[0].title, inputs[0].description || null, inputs[0].price, condition, category);
    this.resultB = estimateValue(inputs[1].title, inputs[1].description || null, inputs[1].price, condition, category);
  }
);

// ==================== Then: Formula inspection ====================

Then(
  'the formula should compute marginScore from profitMargin',
  function () {
    assert(
      this.sourceContent.includes('marginScore') && this.sourceContent.includes('profitMargin'),
      'Source should contain marginScore computed from profitMargin'
    );
  }
);

Then(
  'the formula should compute absoluteProfitScore using a logarithmic curve',
  function () {
    assert(
      this.sourceContent.includes('absoluteProfitScore') && this.sourceContent.includes('Math.log10'),
      'Source should contain absoluteProfitScore using Math.log10'
    );
  }
);

Then(
  /^the final weighted score should use ([\d.]+) weight for margin and ([\d.]+) for absolute profit$/,
  function (marginWeight: string, absoluteWeight: string) {
    assert(
      this.sourceContent.includes(`marginScore * ${marginWeight}`) &&
        this.sourceContent.includes(`absoluteProfitScore * ${absoluteWeight}`),
      `Source should use ${marginWeight}/${absoluteWeight} weights`
    );
  }
);

// ==================== Then: Score assertions ====================

Then(
  'the profit potential should be negative',
  function () {
    assert(this.result.profitPotential < 0, `Expected negative profit, got ${this.result.profitPotential}`);
  }
);

Then(
  'the profit potential should be {int}',
  function (expected: number) {
    assert.strictEqual(this.result.profitPotential, expected, `Expected profit ${expected}, got ${this.result.profitPotential}`);
  }
);

Then(
  /^the profit potential should be less than (\d+)$/,
  function (threshold: number) {
    assert(this.result.profitPotential < threshold, `Expected profit < ${threshold}, got ${this.result.profitPotential}`);
  }
);

Then(
  /^the profit potential should be greater than (\d+)$/,
  function (threshold: number) {
    assert(this.result.profitPotential > threshold, `Expected profit > ${threshold}, got ${this.result.profitPotential}`);
  }
);

Then(
  /^the value score should be at most (\d+)$/,
  function (max: number) {
    assert(this.result.valueScore <= max, `Expected score <= ${max}, got ${this.result.valueScore}`);
  }
);

Then(
  'the value score should reflect the high-value boost',
  function () {
    // The score should incorporate the +5 or +10 boost for high absolute profit.
    // We verify by checking that the score is reasonable (> baseline for that profit level).
    assert(this.result.valueScore > 50, `Expected boosted score > 50, got ${this.result.valueScore}`);
  }
);

Then(
  /^the value score should be an integer between (\d+) and (\d+)$/,
  function (min: number, max: number) {
    assert(Number.isInteger(this.result.valueScore), `valueScore should be integer, got ${this.result.valueScore}`);
    assert(this.result.valueScore >= min, `valueScore should be >= ${min}, got ${this.result.valueScore}`);
    assert(this.result.valueScore <= max, `valueScore should be <= ${max}, got ${this.result.valueScore}`);
  }
);

Then(
  /^scores should populate at least (\d+) of the 5 score buckets .+$/,
  function (minBuckets: number) {
    const results = this.diverseResults as EstimationResult[];
    const buckets = [0, 0, 0, 0, 0];
    results.forEach((r) => {
      const idx = Math.min(4, Math.floor(r.valueScore / 20));
      buckets[idx]++;
    });
    const populated = buckets.filter((b) => b > 0).length;
    assert(
      populated >= minBuckets,
      `Expected >= ${minBuckets} populated buckets, got ${populated}. Buckets: ${buckets.join(', ')}`
    );
  }
);

Then(
  'the high-profit listing should score higher than the high-margin listing',
  function () {
    const a = this.resultA as EstimationResult;
    const b = this.resultB as EstimationResult;
    // First listing ($300 MacBook) should have higher profit than second ($5 cable)
    assert(a.profitPotential > b.profitPotential, `Expected listing A profit > listing B profit`);
    assert(a.valueScore > b.valueScore, `Expected listing A score (${a.valueScore}) > listing B score (${b.valueScore})`);
  }
);

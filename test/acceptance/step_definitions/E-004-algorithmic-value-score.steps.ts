/**
 * Step Definitions for Story 4.1: Algorithmic Value Score
 * Tests the algorithmic scoring engine by calling estimateValue() and detectCategory()
 * directly — no HTTP server needed for pure-function BDD tests.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import { estimateValue, detectCategory } from '../../../src/lib/value-estimator';

// ==================== Given: Listing Setup ====================

Given(
  'a listing titled {string} priced at {int} in {string} condition',
  function (title: string, price: number, condition: string) {
    this.title = title;
    this.price = price;
    this.condition = condition;
    this.description = null;
  }
);

Given(
  'a listing titled {string} with description {string}',
  function (title: string, description: string) {
    this.title = title;
    this.description = description;
    this.price = 100;
    this.condition = 'good';
  }
);

// ==================== When: Scoring Engine Invocation ====================

When('the algorithmic scoring engine evaluates the listing', function () {
  const category = detectCategory(this.title, this.description);
  this.result = estimateValue(
    this.title,
    this.description,
    this.price,
    this.condition,
    category
  );
  this.detectedCategory = category;
});

When('the value score category detector runs', function () {
  this.detectedCategory = detectCategory(this.title, this.description);
});

// ==================== Then: Score Assertions ====================

Then('the value score should be between {int} and {int}', function (min: number, max: number) {
  const score = this.result.valueScore;
  assert(
    score >= min && score <= max,
    `Expected value score between ${min} and ${max}, got ${score}`
  );
});

Then('the detected category should be {string}', function (expected: string) {
  assert.strictEqual(
    this.detectedCategory,
    expected,
    `Expected category '${expected}', got '${this.detectedCategory}'`
  );
});

Then('the result tags should include {string}', function (tag: string) {
  const tags: string[] = this.result.tags;
  assert(
    tags.includes(tag),
    `Expected tags to include '${tag}', but got: [${tags.join(', ')}]`
  );
});

// ==================== Then: Estimated Value Assertions ====================

Then('the estimated value should be at least {int}', function (minimum: number) {
  const value = this.result.estimatedValue;
  assert(
    value >= minimum,
    `Expected estimated value >= ${minimum}, got ${value}`
  );
});

Then('the estimated value should be at most {int}', function (maximum: number) {
  const value = this.result.estimatedValue;
  assert(
    value <= maximum,
    `Expected estimated value <= ${maximum}, got ${value}`
  );
});

Then('the estimated value should be between {int} and {int}', function (min: number, max: number) {
  const value = this.result.estimatedValue;
  assert(
    value >= min && value <= max,
    `Expected estimated value between ${min} and ${max}, got ${value}`
  );
});

Then('the estimated low value should be at least {int}', function (minimum: number) {
  const value = this.result.estimatedLow;
  assert(
    value >= minimum,
    `Expected estimatedLow >= ${minimum}, got ${value}`
  );
});

Then('the estimated high value should be at least {int}', function (minimum: number) {
  const value = this.result.estimatedHigh;
  assert(
    value >= minimum,
    `Expected estimatedHigh >= ${minimum}, got ${value}`
  );
});

Then(
  'the estimated value should be greater than the asking price of {int}',
  function (askingPrice: number) {
    const value = this.result.estimatedValue;
    assert(
      value > askingPrice,
      `Expected estimated value > ${askingPrice}, got ${value}`
    );
  }
);

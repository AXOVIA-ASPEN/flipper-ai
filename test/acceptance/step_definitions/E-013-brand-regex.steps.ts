/**
 * @file test/acceptance/step_definitions/E-013-brand-regex.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Step definitions for Story 13.5 — Brand Regex Refinement.
 *
 * @description
 * Service-level BDD steps that exercise estimateValue() to validate
 * title-only matching, negative pattern suppression, full-text risk
 * keyword matching, and sealed/NIB contextual logic. All 5 ACs are
 * logic/calculation requirements — service-level tests are the correct level.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import { estimateValue, EstimationResult } from '../../../src/lib/value-estimator';

// ==================== Given: Listing Setup ====================

Given(
  /^a listing with title "([^"]*)" and description "([^"]*)"$/,
  function (title: string, description: string) {
    this.currentTitle = title;
    this.currentDescription = description || null;
  }
);

Given(
  /^a listing with title "([^"]*)" and description that mentions "([^"]*)" after (\d+) characters$/,
  function (title: string, keyword: string, charOffset: number) {
    this.currentTitle = title;
    this.currentDescription = 'x'.repeat(charOffset) + ` ${keyword}`;
  }
);

// ==================== When: Score Listing ====================

When(
  /^the value estimator scores the listing at price (\d+) condition "([^"]*)" category "([^"]*)"$/,
  function (price: number, condition: string, category: string) {
    this.lastResult = estimateValue(
      this.currentTitle,
      this.currentDescription,
      price,
      condition,
      category
    );
  }
);

// ==================== Then: Tag Assertions ====================

Then(
  /^the result tags should contain "([^"]*)"$/,
  function (tag: string) {
    const result: EstimationResult = this.lastResult;
    assert(
      result.tags.includes(tag),
      `Expected tags to contain "${tag}", but got: [${result.tags.join(', ')}]`
    );
  }
);

Then(
  /^the result tags should not contain "([^"]*)"$/,
  function (tag: string) {
    const result: EstimationResult = this.lastResult;
    assert(
      !result.tags.includes(tag),
      `Expected tags NOT to contain "${tag}", but got: [${result.tags.join(', ')}]`
    );
  }
);

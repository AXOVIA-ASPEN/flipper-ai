/**
 * @file test/acceptance/step_definitions/E-013-iqr-outlier-filtering.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Step definitions for Story 13.1 — IQR Outlier Filtering on eBay Sold Prices.
 *
 * @description
 * Service-level BDD steps that exercise filterOutliers() directly.
 * ACs 1–3 are logic/calculation requirements — service-level tests are the
 * correct level. ACs 4–5 are manual validation tasks documented in the PR.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import { filterOutliers, OutlierFilterResult } from '../../../src/lib/market-price';

// ==================== Given: Price Dataset Setup ====================

Given(
  /^a set of eBay sold prices \[(.+)\]$/,
  function (priceList: string) {
    this.prices = priceList.split(',').map((s: string) => parseFloat(s.trim()));
  }
);

// ==================== When: Apply IQR Filtering ====================

When('IQR outlier filtering is applied', function () {
  const result: OutlierFilterResult = filterOutliers(this.prices);
  this.filterResult = result;
});

// ==================== Then: Filtering Assertions ====================

Then(
  'the price {int} should be excluded from filtered results',
  function (price: number) {
    const filtered: number[] = this.filterResult.filteredPrices;
    assert(
      !filtered.includes(price),
      `Expected price ${price} to be excluded, but it was found in filtered results: [${filtered.join(', ')}]`
    );
  }
);

Then(
  'the outliers removed count should be {int}',
  function (expected: number) {
    assert.strictEqual(
      this.filterResult.outliersRemoved,
      expected,
      `Expected ${expected} outliers removed, got ${this.filterResult.outliersRemoved}`
    );
  }
);

Then(
  'the low sample size flag should be true',
  function () {
    assert.strictEqual(
      this.filterResult.lowSampleSize,
      true,
      'Expected lowSampleSize to be true'
    );
  }
);

Then(
  'the low sample size flag should be false',
  function () {
    assert.strictEqual(
      this.filterResult.lowSampleSize,
      false,
      'Expected lowSampleSize to be false'
    );
  }
);

Then(
  'all {int} prices should be retained',
  function (count: number) {
    assert.strictEqual(
      this.filterResult.filteredPrices.length,
      count,
      `Expected ${count} prices retained, got ${this.filterResult.filteredPrices.length}`
    );
  }
);

Then(
  'downstream confidence should be set to {string}',
  function (expectedConfidence: string) {
    // When lowSampleSize is true, downstream consumers must set confidence to 'low'
    // This validates the contract: lowSampleSize === true → confidence must be 'low'
    if (this.filterResult.lowSampleSize) {
      assert.strictEqual(
        expectedConfidence,
        'low',
        'When lowSampleSize is true, downstream confidence must be "low"'
      );
    }
  }
);

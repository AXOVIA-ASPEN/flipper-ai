/**
 * Step Definitions for Story 5.1: Claude Sonnet Structural Analysis
 *
 * Tests via source-code inspection — no HTTP server required.
 * Verifies that enrichOpportunitiesWithClaudeTier2 is exported, wired into all
 * scraper routes, and that formatForStorage persists Claude analysis fields.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

function readSource(relativePath: string): string {
  const absolute = path.resolve(process.cwd(), relativePath);
  return fs.readFileSync(absolute, 'utf-8');
}

// ==================== Given ====================

Given('the marketplace-scanner source at {string}', function (filePath: string) {
  this.source = readSource(filePath);
  this.filePath = filePath;
});

Given('the eBay scraper route at {string}', function (filePath: string) {
  this.ebaySource = readSource(filePath);
});

// ==================== When ====================

When('I inspect the claude-analyzer exported functions', function () {
  // Source already loaded in Given — nothing extra to do
});

When('I inspect the {string} function', function (_fnName: string) {
  // Source already loaded in Given — nothing extra to do
});

When('I inspect the scraper POST handlers', function () {
  // Sources loaded lazily in Then steps
});

// ==================== Then ====================

Then('{string} is exported as a function', function (fnName: string) {
  assert.ok(
    this.source.includes(`export async function ${fnName}`) ||
      this.source.includes(`export function ${fnName}`),
    `Expected "${fnName}" to be exported as a function in ${this.filePath}`
  );
});

Then('it imports {string} from the claude-analyzer module', function (fnName: string) {
  assert.ok(
    this.source.includes(fnName) && this.source.includes('claude-analyzer'),
    `Expected "${fnName}" to be imported from claude-analyzer in ${this.filePath}`
  );
});

Then('the AnalyzedListing interface has an optional {string} field', function (fieldName: string) {
  assert.ok(
    this.source.includes(`${fieldName}?:`),
    `Expected AnalyzedListing to have optional field "${fieldName}" in ${this.filePath}`
  );
});

Then(
  '{string} is populated from claudeAnalysis with fallback to sellabilityAnalysis',
  function (fieldName: string) {
    // The formatForStorage function should use the pattern: claudeAnalysis?.X ?? sellabilityAnalysis?.X
    const pattern = `claudeAnalysis?.${fieldName === 'analysisConfidence' ? 'confidence' : 'reasoning'}`;
    assert.ok(
      this.source.includes(pattern),
      `Expected formatForStorage to use claudeAnalysis.${fieldName === 'analysisConfidence' ? 'confidence' : 'reasoning'} in ${this.filePath}`
    );
  }
);

Then('the eBay route calls {string}', function (fnName: string) {
  assert.ok(
    this.ebaySource.includes(fnName + '('),
    `Expected eBay route to call "${fnName}(" — found no invocation`
  );
});

Then('the eBay route writes to {string} after saving each listing', function (model: string) {
  assert.ok(
    this.ebaySource.includes(`prisma.${model}.create`),
    `Expected eBay route to write to prisma.${model}.create`
  );
});

Then(
  'the Craigslist route at {string} calls {string}',
  function (filePath: string, fnName: string) {
    const source = readSource(filePath);
    assert.ok(
      source.includes(fnName + '('),
      `Expected Craigslist route to call "${fnName}(" — found no invocation in ${filePath}`
    );
  }
);

Then(
  'the Facebook route at {string} calls {string}',
  function (filePath: string, fnName: string) {
    const source = readSource(filePath);
    assert.ok(
      source.includes(fnName + '('),
      `Expected Facebook route to call "${fnName}(" — found no invocation in ${filePath}`
    );
  }
);

Then(
  'the Mercari route at {string} calls {string}',
  function (filePath: string, fnName: string) {
    const source = readSource(filePath);
    assert.ok(
      source.includes(fnName + '('),
      `Expected Mercari route to call "${fnName}(" — found no invocation in ${filePath}`
    );
  }
);

Then(
  'the OfferUp route at {string} calls {string}',
  function (filePath: string, fnName: string) {
    const source = readSource(filePath);
    assert.ok(
      source.includes(fnName + '('),
      `Expected OfferUp route to call "${fnName}(" — found no invocation in ${filePath}`
    );
  }
);

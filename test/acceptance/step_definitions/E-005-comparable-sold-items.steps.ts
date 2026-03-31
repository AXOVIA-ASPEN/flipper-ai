/**
 * Step Definitions for Story 5.2: Comparable Sold Item Matching
 *
 * Tests via source-code inspection — no HTTP server or API calls required.
 * Verifies that:
 *   - findComparableSales() and filterByBrandModel() are exported from comp-matcher.ts
 *   - CompMatchResult and ComparableSale interfaces have the required display fields
 *   - calcConfidence() is exported and the opportunities page renders a confidence badge
 *   - insufficientData field exists in CompMatchResult and the page handles it
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

Given('the comp-matcher module at {string}', function (filePath: string) {
  this.source = readSource(filePath);
  this.filePath = filePath;
});

// ==================== When ====================

When('I inspect the comp-matcher exports', function () {
  // Source already loaded in Given — assertions performed in Then steps.
});

When('I inspect the comp-matcher type definitions', function () {
  // Source already loaded in Given — assertions performed in Then steps.
});

// ==================== Then: S-9 (comp-matcher exports) ====================

Then('it imports {string} from the market-price module', function (fnName: string) {
  assert.ok(
    this.source.includes(fnName) && this.source.includes('market-price'),
    `Expected "${fnName}" to be imported from market-price in ${this.filePath}`
  );
});

// ==================== Then: S-10 (CompMatchResult / ComparableSale shape) ====================

Then(
  'the {string} interface includes the {string} field',
  function (interfaceName: string, fieldName: string) {
    // Find the interface block
    const interfaceStart = this.source.indexOf(`export interface ${interfaceName}`);
    assert.ok(
      interfaceStart > -1,
      `Expected "export interface ${interfaceName}" in ${this.filePath}`
    );
    const interfaceBody = this.source.substring(interfaceStart);
    // Find the closing brace of this interface
    const closingBrace = interfaceBody.indexOf('}');
    const block = closingBrace > -1 ? interfaceBody.substring(0, closingBrace + 1) : interfaceBody;
    assert.ok(
      block.includes(fieldName),
      `Expected interface "${interfaceName}" to include field "${fieldName}" in ${this.filePath}`
    );
  }
);

// ==================== Then: S-11 (calcConfidence + opportunities confidence badge) ====================

Then(
  'the opportunities page at {string} renders a confidence badge for comparable sales',
  function (filePath: string) {
    const pageSource = readSource(filePath);
    assert.ok(
      pageSource.includes('compMatchConfidence'),
      `Expected opportunities page to reference compMatchConfidence in ${filePath}`
    );
    assert.ok(
      pageSource.includes('Confidence') || pageSource.includes('confidence'),
      `Expected opportunities page to render a confidence badge in ${filePath}`
    );
  }
);

// ==================== Then: S-12 (insufficientData flag + page insufficient state) ====================

Then(
  '"CompMatchResult" includes an "insufficientData" boolean field',
  function () {
    const interfaceStart = this.source.indexOf('export interface CompMatchResult');
    assert.ok(interfaceStart > -1, `Expected CompMatchResult interface in ${this.filePath}`);
    const rest = this.source.substring(interfaceStart);
    const closingBrace = rest.indexOf('}');
    const block = closingBrace > -1 ? rest.substring(0, closingBrace + 1) : rest;
    assert.ok(
      block.includes('insufficientData'),
      `Expected CompMatchResult to include "insufficientData" field in ${this.filePath}`
    );
    assert.ok(
      block.includes('boolean'),
      `Expected "insufficientData" to be typed as boolean in ${this.filePath}`
    );
  }
);

Then(
  'the opportunities page at {string} shows an insufficient data state',
  function (filePath: string) {
    const pageSource = readSource(filePath);
    assert.ok(
      pageSource.includes('insufficient'),
      `Expected opportunities page to handle insufficient data state in ${filePath}`
    );
  }
);

/**
 * Step Definitions for Story 5.5: Logistics & Shipping Cost Analysis
 *
 * Tests via source-code inspection — no HTTP server or API calls required.
 * Verifies that:
 *   - classifyItemLogistics() uses GPT-4o-mini with category fallback
 *   - estimateShippingCosts() uses Shippo SDK with graceful degradation
 *   - calculateDistance() uses Geoapify with in-memory cache
 *   - analyzeLogistics() orchestrates all three and never throws
 *   - All 5 scraper routes call logistics analysis
 *   - UI pages display logistics data
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

Given('the logistics-classifier module at {string}', function (filePath: string) {
  this.source = readSource(filePath);
  this.filePath = filePath;
});

Given('the shipping-estimator module at {string}', function (filePath: string) {
  this.source = readSource(filePath);
  this.filePath = filePath;
});

Given('the distance-calculator module at {string}', function (filePath: string) {
  this.source = readSource(filePath);
  this.filePath = filePath;
});

Given('the logistics-analyzer module at {string}', function (filePath: string) {
  this.source = readSource(filePath);
  this.filePath = filePath;
});

// ==================== When ====================

When('I inspect the logistics classifier exports', function () {
  // Source already loaded — assertions in Then steps
});

When('I inspect the shipping estimator exports', function () {
  // Source already loaded — assertions in Then steps
});

When('I inspect the distance calculator exports', function () {
  // Source already loaded — assertions in Then steps
});

When('I inspect the logistics analyzer exports', function () {
  // Source already loaded — assertions in Then steps
});

When('I inspect the logistics wiring in scraper routes', function () {
  // Source already loaded from Given('the eBay scraper route') — other routes loaded in Then
});

When('I inspect the logistics display implementation', function () {
  // fileContent is set by Given('the opportunities page at {string}')
  this.fileBody = this.fileContent;
});

// ==================== Then: S-18 (logistics-classifier) ====================

Then('it uses the {string} model for logistics classification', function (modelName: string) {
  // After the AI-router refactor, the logistics-classifier delegates model
  // selection to the centralized prompt registry. Accept either a literal
  // model string in the source or the prompt-config model declared in
  // src/lib/ai/prompts/identification.ts under `logisticsClassification`.
  if (this.source.includes(`'${modelName}'`)) return;
  if (this.source.includes("completeAI('logisticsClassification'") ||
      this.source.includes('completeAI("logisticsClassification"')) {
    const promptModule = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/ai/prompts/identification.ts'),
      'utf-8'
    );
    const declStart = promptModule.indexOf('export const logisticsClassification');
    assert.ok(declStart > -1, 'logisticsClassification PromptConfig declaration not found');
    const declBody = promptModule.substring(declStart, declStart + 1500);
    const match = declBody.match(/model:\s*['"]([^'"]+)['"]/);
    assert.ok(match, 'logisticsClassification prompt config has no model field');
    assert.strictEqual(
      match?.[1],
      modelName,
      `Expected logisticsClassification prompt model '${modelName}', got '${match?.[1]}'`
    );
    return;
  }
  assert.fail(
    `Expected logistics-classifier to use model '${modelName}' (literal in source OR via completeAI('logisticsClassification') + prompt config)`
  );
});

Then('it defines a CATEGORY_SIZE_DEFAULTS fallback map', function () {
  assert.ok(
    this.source.includes('CATEGORY_SIZE_DEFAULTS'),
    `Expected CATEGORY_SIZE_DEFAULTS fallback map in ${this.filePath}`
  );
});

// ==================== Then: S-19 (shipping-estimator) ====================

Then('it imports {string} from the shippo package', function (exportName: string) {
  assert.ok(
    this.source.includes(`import { ${exportName} } from 'shippo'`) ||
    this.source.includes(`import {${exportName}} from 'shippo'`),
    `Expected "import { ${exportName} } from 'shippo'" in ${this.filePath}`
  );
});

Then('it returns null gracefully when SHIPPO_API_TOKEN is not set', function () {
  assert.ok(
    this.source.includes('SHIPPO_API_TOKEN'),
    `Expected SHIPPO_API_TOKEN guard in ${this.filePath}`
  );
  assert.ok(
    this.source.includes('return null'),
    `Expected "return null" graceful path in ${this.filePath}`
  );
});

// ==================== Then: S-20 (distance-calculator) ====================

Then('it uses the Geoapify geocoding API', function () {
  assert.ok(
    this.source.includes('geoapify'),
    `Expected Geoapify API reference in ${this.filePath}`
  );
});

Then('it returns null gracefully when GEOAPIFY_API_KEY is not set', function () {
  assert.ok(
    this.source.includes('GEOAPIFY_API_KEY'),
    `Expected GEOAPIFY_API_KEY guard in ${this.filePath}`
  );
  assert.ok(
    this.source.includes('return null'),
    `Expected "return null" graceful path in ${this.filePath}`
  );
});

// ==================== Then: S-21 (logistics-analyzer) ====================

Then('it imports {string} from the logistics-classifier', function (fnName: string) {
  assert.ok(
    this.source.includes(`from './logistics-classifier'`) ||
    this.source.includes(`from "./logistics-classifier"`),
    `Expected import from logistics-classifier in ${this.filePath}`
  );
  assert.ok(
    this.source.includes(fnName),
    `Expected "${fnName}" in ${this.filePath}`
  );
});

Then('it imports {string} from the shipping-estimator', function (fnName: string) {
  assert.ok(
    this.source.includes(`from './shipping-estimator'`) ||
    this.source.includes(`from "./shipping-estimator"`),
    `Expected import from shipping-estimator in ${this.filePath}`
  );
  assert.ok(
    this.source.includes(fnName),
    `Expected "${fnName}" in ${this.filePath}`
  );
});

Then('it imports {string} from the distance-calculator', function (fnName: string) {
  assert.ok(
    this.source.includes(`from './distance-calculator'`) ||
    this.source.includes(`from "./distance-calculator"`),
    `Expected import from distance-calculator in ${this.filePath}`
  );
  assert.ok(
    this.source.includes(fnName),
    `Expected "${fnName}" in ${this.filePath}`
  );
});

Then('it has a safe default fallback that never throws', function () {
  assert.ok(
    this.source.includes('createSafeDefault') || this.source.includes('safeDefault') ||
    (this.source.includes('catch') && this.source.includes('return')),
    `Expected safe default fallback (catch block with return) in ${this.filePath}`
  );
});

// ==================== Then: S-22 (scraper routes wiring) ====================
// Note: Then('the {Platform} route at/calls {string}') for eBay/Craigslist/
// Facebook/Mercari/OfferUp are owned by E-005-claude-analyzer.steps.ts.
// They read source from path parameter or `this.ebaySource`, which is set
// by Given('the eBay scraper route at {string}') in claude-analyzer.

// ==================== Then: S-23 (UI logistics display) ====================

Then(
  'the Listing interface includes {string} as a nullable boolean',
  function (fieldName: string) {
    const src = this.fileContent || this.fileBody || this.source;
    assert.ok(
      src.includes(fieldName),
      `Expected Listing interface to include "${fieldName}"`
    );
    assert.ok(
      src.match(new RegExp(`${fieldName}\\s*:\\s*boolean\\s*\\|\\s*null`)),
      `Expected "${fieldName}" to be typed as "boolean | null"`
    );
  }
);

Then('the page renders a size category row in the market details section', function () {
  const src = this.fileContent || this.fileBody;
  assert.ok(
    src.includes('sizeCategory') && src.includes('Size Category'),
    `Expected "Size Category" row rendering sizeCategory in opportunities page`
  );
});

Then('the page shows an outside-pickup-radius warning element', function () {
  const src = this.fileContent || this.fileBody;
  assert.ok(
    src.includes('outside-pickup-radius-warning') || src.includes('outsidePickupRadius'),
    `Expected outside-pickup-radius warning element in opportunities page`
  );
  assert.ok(
    src.includes('Outside Pickup Radius') || src.includes('outside pickup'),
    `Expected "Outside Pickup Radius" text in the warning element`
  );
});

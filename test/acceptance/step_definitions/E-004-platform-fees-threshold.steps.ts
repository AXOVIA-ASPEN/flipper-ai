/**
 * Step Definitions for Story 4.2: Platform-Specific Fees & Opportunity Threshold
 *
 * Uses static code analysis + direct function calls to verify:
 *   - getPlatformFeeRate() exported from marketplace-scanner with correct defaults
 *   - estimateValue() accepts optional feeRate parameter (6th arg)
 *   - Settings API validates and exposes opportunityThreshold and fee rates
 *   - Scraper routes (OfferUp exemplar) wire in platform fee + configurable threshold
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import { expect } from '@playwright/test';
import { estimateValue } from '../../../src/lib/value-estimator';
import {
  getPlatformFeeRate,
  PLATFORM_FEE_DEFAULTS,
} from '../../../src/lib/marketplace-scanner';

const PROJECT_ROOT = process.cwd();

function readSourceFile(relativePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

// ==================== Given ====================

Given('the marketplace-scanner module at {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  expect(content).toContain('getPlatformFeeRate');
  this.fileContent = content;
});

Given('the value-estimator module at {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  expect(content).toContain('estimateValue');
  this.fileContent = content;
});

Given('the user settings API route at {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  expect(content).toContain('opportunityThreshold');
  this.fileContent = content;
});

Given('the OfferUp scraper route file at {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  expect(content).toContain('getPlatformFeeRate');
  this.fileContent = content;
});

// ==================== When ====================

When('I inspect the estimateValue function signature', function () {
  // File content already set in Given; assertions done in Then
  // Also compute actual results for Then steps
  const withLowFee = estimateValue('Apple iPhone 12', null, 300, null, 'electronics', 0.05);
  const withHighFee = estimateValue('Apple iPhone 12', null, 300, null, 'electronics', 0.13);
  const withNoFee = estimateValue('Apple iPhone 12', null, 300, null, 'electronics');
  this.resultLowFee = withLowFee;
  this.resultHighFee = withHighFee;
  this.resultNoFee = withNoFee;
});

When('I inspect the PATCH handler validation logic', function () {
  // File content already set in Given; assertions done in Then
});

When('I inspect the OfferUp scraper POST handler', function () {
  const fnStart = this.fileContent.indexOf('export async function POST');
  expect(fnStart).toBeGreaterThan(-1);
  this.fnBody = this.fileContent.substring(fnStart);
});

// ==================== Then: S-8 (marketplace-scanner exports) ====================

Then('"getPlatformFeeRate" is exported as a function', function () {
  expect(this.fileContent).toContain('export function getPlatformFeeRate');
  // Also verify it actually works
  expect(typeof getPlatformFeeRate).toBe('function');
});

Then('"PLATFORM_FEE_DEFAULTS" is exported as a constant', function () {
  expect(this.fileContent).toContain('PLATFORM_FEE_DEFAULTS');
  expect(typeof PLATFORM_FEE_DEFAULTS).toBe('object');
});

Then('the default fee rate for {string} is {float}', function (platform: string, expectedRate: number) {
  const rate = getPlatformFeeRate(platform, null);
  expect(rate).toBeCloseTo(expectedRate, 3);
});

// ==================== Then: S-9 (estimateValue feeRate parameter) ====================

Then('it accepts an optional feeRate parameter as the sixth argument', function () {
  // Verify by checking the function signature in source and that it compiles/runs
  expect(this.fileContent).toContain('feeRate?');
  expect(this.resultLowFee).toBeDefined();
  expect(this.resultHighFee).toBeDefined();
});

Then('when feeRate is {float} the profit reasoning mentions {string}', function (feeRate: number, expectedPercent: string) {
  const result = estimateValue('Apple iPhone 12', null, 300, null, 'electronics', feeRate);
  expect(result.reasoning).toContain(expectedPercent);
});

Then('when no feeRate is provided it defaults to 13% fee', function () {
  expect(this.resultNoFee.reasoning).toContain('13%');
});

// ==================== Then: S-10 (settings API validation) ====================

Then(
  'it validates opportunityThreshold must be an integer between 10 and 100',
  function () {
    expect(this.fileContent).toContain('opportunityThreshold');
    expect(this.fileContent).toContain('ot < 10');
    expect(this.fileContent).toContain('ot > 100');
  }
);

Then('the GET handler returns opportunityThreshold in the response data', function () {
  // Check that the GET handler response includes opportunityThreshold
  const getHandlerIdx = this.fileContent.indexOf('export async function GET');
  expect(getHandlerIdx).toBeGreaterThan(-1);
  const getHandlerBody = this.fileContent.substring(getHandlerIdx);
  expect(getHandlerBody).toContain('opportunityThreshold');
});

Then(
  'the UserSettings schema includes opportunityThreshold with default 70',
  function () {
    const schemaContent = readSourceFile('prisma/schema.prisma');
    expect(schemaContent).toContain('opportunityThreshold');
    expect(schemaContent).toContain('@default(70)');
  }
);

// ==================== Then: S-11 (OfferUp scraper uses fee/threshold) ====================

Then('it imports getPlatformFeeRate from marketplace-scanner', function () {
  expect(this.fileContent).toContain('getPlatformFeeRate');
  expect(this.fileContent).toContain('marketplace-scanner');
});

Then(
  'it extracts feeRate using getPlatformFeeRate with the OFFERUP platform',
  function () {
    expect(this.fnBody).toContain("getPlatformFeeRate('OFFERUP'");
  }
);

Then(
  'it extracts opportunityThreshold from userSettings with fallback to 70',
  function () {
    expect(this.fnBody).toContain('opportunityThreshold');
    expect(this.fnBody).toContain('?? 70');
  }
);

Then('the estimateValue call passes feeRate as the sixth argument', function () {
  expect(this.fnBody).toContain('feeRate');
  expect(this.fnBody).toContain('estimateValue(');
});

// ==================== When: S-12 (threshold guard) ====================

When('I inspect the opportunity threshold guard logic', function () {
  // fileContent already set in Given; fnBody set in previous When
  const fnStart = this.fileContent.indexOf('export async function POST');
  expect(fnStart).toBeGreaterThan(-1);
  this.fnBody = this.fileContent.substring(fnStart);
});

// ==================== Then: S-12 (listings below threshold not saved) ====================

Then(
  'it compares estimation.valueScore against opportunityThreshold not a hardcoded value',
  function () {
    expect(this.fnBody).toContain('opportunityThreshold');
    // Ensure no raw "< 70" or ">= 70" guard remains in the POST handler body
    expect(this.fnBody).not.toMatch(/valueScore\s*[<>]=?\s*70(?!\s*\))/);
  }
);

Then(
  'listings where valueScore is less than opportunityThreshold are not saved to the database',
  function () {
    // The guard must use opportunityThreshold, not a literal
    expect(this.fnBody).toMatch(/valueScore\s*[<>=]+\s*opportunityThreshold/);
  }
);

Then(
  'the Craigslist v2 route at {string} uses opportunityThreshold for the same guard',
  function (filePath: string) {
    const content = readSourceFile(filePath);
    const fnStart = content.indexOf('export async function POST');
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = content.substring(fnStart);
    expect(fnBody).toContain('opportunityThreshold');
    expect(fnBody).toMatch(/valueScore\s*[<>=]+\s*opportunityThreshold/);
  }
);

Then(
  'the Facebook scraper route at {string} uses opportunityThreshold for the same guard',
  function (filePath: string) {
    const content = readSourceFile(filePath);
    expect(content).toContain('opportunityThreshold');
    expect(content).toMatch(/valueScore\s*[<>=]+\s*opportunityThreshold/);
  }
);

Then(
  'the Mercari scraper route at {string} uses opportunityThreshold for the same guard',
  function (filePath: string) {
    const content = readSourceFile(filePath);
    expect(content).toContain('opportunityThreshold');
    expect(content).toMatch(/valueScore\s*[<>=]+\s*opportunityThreshold/);
  }
);

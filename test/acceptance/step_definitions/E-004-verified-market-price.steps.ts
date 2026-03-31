/**
 * Step Definitions for Story 4.4: Verified Market Price Lookup
 *
 * Uses static code analysis to verify that lookupVerifiedMarketPrice() from
 * market-value-calculator.ts is correctly integrated into the scanning pipeline:
 *   - lookupVerifiedMarketPrice() and VerifiedPriceLookupResult exported from market-value-calculator
 *   - Two-step lookup: DB first (calculateVerifiedMarketValue), Playwright fallback (fetchMarketPrice)
 *   - enrichWithVerifiedMarketPrice() exported from marketplace-scanner
 *   - formatForStorage() maps all verified price fields to DB columns
 *   - eBay scraper uses enrichWithVerifiedMarketPrice (centralized pipeline)
 *   - Facebook scraper has inline lookupVerifiedMarketPrice + closeBrowser
 *   - Dashboard and Opportunities UI surface "Verified Value" when available
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import { expect } from '@playwright/test';

const PROJECT_ROOT = process.cwd();

function readSourceFile(relativePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

// ==================== Given ====================

Given('the market-value-calculator module at {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  expect(content).toContain('lookupVerifiedMarketPrice');
  this.fileContent = content;
});

Given(
  'the market-price-enrichment module is integrated in {string}',
  function (filePath: string) {
    const content = readSourceFile(filePath);
    expect(content).toContain('enrichWithVerifiedMarketPrice');
    this.fileContent = content;
  }
);

Given('the Facebook scraper route file at {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  expect(content).toContain('lookupVerifiedMarketPrice');
  this.fileContent = content;
});

Given('the dashboard page at {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  expect(content).toContain('verifiedMarketValue');
  this.fileContent = content;
});

// Note: 'the opportunities page at {string}' is defined in E-006-kanban-lifecycle.steps.ts
// and shared across all E-004/E-005/E-006 scenarios. Do not redefine it here.

// ==================== When ====================

When('I inspect the market-value-calculator exported functions', function () {
  // File content already loaded in Given; assertions performed in Then steps.
  // Make fileContent available as fnBody for Then steps that inspect function bodies.
  if (!this.fnBody) this.fnBody = this.fileContent;
});

When('I inspect the lookupVerifiedMarketPrice function body', function () {
  const fnStart = this.fileContent.indexOf(
    'export async function lookupVerifiedMarketPrice'
  );
  expect(fnStart).toBeGreaterThan(-1);
  const fnRest = this.fileContent.substring(fnStart);
  const nextExportIdx = fnRest.indexOf('\nexport ', 1);
  this.fnBody = nextExportIdx > 0 ? fnRest.substring(0, nextExportIdx) : fnRest;
});

When('I inspect the Facebook scraper POST handler', function () {
  const fnStart = this.fileContent.indexOf('export async function POST');
  expect(fnStart).toBeGreaterThan(-1);
  this.fnBody = this.fileContent.substring(fnStart);
});

When('I inspect the Listing interface and value display', function () {
  const interfaceStart = this.fileContent.indexOf('interface Listing {');
  expect(interfaceStart).toBeGreaterThan(-1);
  // Capture enough of the file to cover both the interface and the JSX value display
  this.interfaceBody = this.fileContent.substring(interfaceStart, interfaceStart + 600);
  this.fileBody = this.fileContent;
});

When('I inspect the mini-stat card for market value', function () {
  // The verified value display logic is in the JSX render section
  this.fileBody = this.fileContent;
});

// ==================== Then: S-16 (market-value-calculator exports) ====================

Then('"lookupVerifiedMarketPrice" is exported as an async function', function () {
  expect(this.fileContent).toContain(
    'export async function lookupVerifiedMarketPrice'
  );
});

Then('"VerifiedPriceLookupResult" is exported as an interface', function () {
  expect(this.fileContent).toContain('export interface VerifiedPriceLookupResult');
});

// ==================== Then: S-17 (two-step lookup implementation) ====================

Then(
  'it calls calculateVerifiedMarketValue as the first lookup step',
  function () {
    expect(this.fnBody).toContain('calculateVerifiedMarketValue(');
  }
);

Then(
  'it calls fetchMarketPrice as the fallback when DB has insufficient data',
  function () {
    expect(this.fnBody).toContain('fetchMarketPrice(');
  }
);

Then('it returns null for empty searchQuery', function () {
  expect(this.fnBody).toContain('searchQuery');
  // The function guards against empty/falsy searchQuery
  expect(this.fnBody).toMatch(/if\s*\(!searchQuery/);
});

Then('it returns null for askingPrice <= 0', function () {
  expect(this.fnBody).toContain('askingPrice');
  // The function guards against non-positive asking price
  expect(this.fnBody).toMatch(/askingPrice\s*<=\s*0/);
});

// ==================== Then: S-18 (marketplace-scanner enrichWithVerifiedMarketPrice) ====================

Then('"enrichWithVerifiedMarketPrice" is exported as an async function', function () {
  expect(this.fileContent).toContain(
    'export async function enrichWithVerifiedMarketPrice'
  );
});

Then(
  'the module imports lookupVerifiedMarketPrice from market-value-calculator',
  function () {
    expect(this.fileContent).toContain('lookupVerifiedMarketPrice');
    expect(this.fileContent).toContain('market-value-calculator');
  }
);

Then('the module imports closeBrowser from market-price', function () {
  expect(this.fileContent).toContain('closeBrowser');
  expect(this.fileContent).toContain('market-price');
});

// ==================== Then: S-19 (formatForStorage verified price fields) ====================

Then('it maps verifiedMarketValue from verifiedPrice', function () {
  expect(this.fnBody).toContain('verifiedMarketValue');
  expect(this.fnBody).toContain('verifiedPrice');
});

Then('it maps trueDiscountPercent from verifiedPrice', function () {
  expect(this.fnBody).toContain('trueDiscountPercent');
});

Then('it maps marketDataSource from verifiedPrice', function () {
  expect(this.fnBody).toContain('marketDataSource');
});

Then('it maps marketDataDate from verifiedPrice', function () {
  expect(this.fnBody).toContain('marketDataDate');
});

Then('it maps comparableSalesJson from verifiedPrice', function () {
  expect(this.fnBody).toContain('comparableSalesJson');
});

// ==================== Then: S-20 (eBay scraper uses enrichWithVerifiedMarketPrice) ====================

Then(
  'it imports enrichWithVerifiedMarketPrice from marketplace-scanner',
  function () {
    expect(this.fileContent).toContain('enrichWithVerifiedMarketPrice');
    expect(this.fileContent).toContain('marketplace-scanner');
  }
);

Then(
  'it calls enrichWithVerifiedMarketPrice on the enriched opportunities array',
  function () {
    expect(this.fnBody).toContain('enrichWithVerifiedMarketPrice(');
  }
);

// ==================== Then: S-21 (Facebook scraper inline verified price lookup) ====================

Then(
  'it imports lookupVerifiedMarketPrice from market-value-calculator',
  function () {
    expect(this.fileContent).toContain('lookupVerifiedMarketPrice');
    expect(this.fileContent).toContain('market-value-calculator');
  }
);

Then('it imports closeBrowser from market-price', function () {
  expect(this.fileContent).toContain('closeBrowser');
  expect(this.fileContent).toContain('market-price');
});

Then('it calls closeBrowser after the listings processing loop', function () {
  expect(this.fnBody).toContain('closeBrowser()');
});

// ==================== Then: S-22 (Dashboard UI shows "Verified Value") ====================

Then(
  'the Listing interface includes verifiedMarketValue as nullable number',
  function () {
    expect(this.interfaceBody).toContain('verifiedMarketValue');
    expect(this.interfaceBody).toMatch(/verifiedMarketValue\s*:\s*number\s*\|\s*null/);
  }
);

Then(
  'the Listing interface includes trueDiscountPercent as nullable number',
  function () {
    expect(this.interfaceBody).toContain('trueDiscountPercent');
    expect(this.interfaceBody).toMatch(/trueDiscountPercent\s*:\s*number\s*\|\s*null/);
  }
);

Then(
  'the value card label shows "Verified Value" when verifiedMarketValue is not null',
  function () {
    expect(this.fileBody).toContain('Verified Value');
    expect(this.fileBody).toContain('verifiedMarketValue');
  }
);

// ==================== Then: S-23 (Opportunities page mini-stat card) ====================

Then(
  'it shows "Verified Value" label when verifiedMarketValue is not null',
  function () {
    expect(this.fileBody).toContain('Verified Value');
    expect(this.fileBody).toContain('verifiedMarketValue');
  }
);

Then(
  'it displays verifiedMarketValue when available falling back to estimatedValue',
  function () {
    expect(this.fileBody).toContain('verifiedMarketValue');
    expect(this.fileBody).toContain('estimatedValue');
    // The nullish coalescing operator is used to fall back
    expect(this.fileBody).toMatch(/verifiedMarketValue\s*\?\?/);
  }
);

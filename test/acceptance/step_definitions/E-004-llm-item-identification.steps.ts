/**
 * Step Definitions for Story 4.3: LLM Item Identification
 *
 * Uses static code analysis to verify that identifyItem() from llm-identifier.ts
 * is correctly integrated into the marketplace scanning pipeline:
 *   - enrichOpportunitiesWithLLM() exported from marketplace-scanner.ts
 *   - formatForStorage() maps all LLM identification fields to DB columns
 *   - Error handling in enrichOpportunitiesWithLLM() is graceful (try/catch)
 *   - eBay scraper route wires in enrichOpportunitiesWithLLM after processListings()
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

Given(
  'the llm-identifier module is integrated in {string}',
  function (filePath: string) {
    const content = readSourceFile(filePath);
    expect(content).toContain('enrichOpportunitiesWithLLM');
    this.fileContent = content;
  }
);

Given(
  'the eBay scraper route file at {string}',
  function (filePath: string) {
    const content = readSourceFile(filePath);
    expect(content).toContain('enrichOpportunitiesWithLLM');
    this.fileContent = content;
  }
);

// ==================== When ====================

When('I inspect the marketplace-scanner exported functions', function () {
  // File content already loaded in Given; assertions performed in Then steps
});

When('I inspect the formatForStorage function body', function () {
  const fnStart = this.fileContent.indexOf('export function formatForStorage');
  expect(fnStart).toBeGreaterThan(-1);
  const fnRest = this.fileContent.substring(fnStart);
  const nextExportIdx = fnRest.indexOf('\nexport ', 1);
  this.fnBody = nextExportIdx > 0 ? fnRest.substring(0, nextExportIdx) : fnRest;
});

When('I inspect the enrichOpportunitiesWithLLM function body', function () {
  const fnStart = this.fileContent.indexOf(
    'export async function enrichOpportunitiesWithLLM'
  );
  expect(fnStart).toBeGreaterThan(-1);
  const fnRest = this.fileContent.substring(fnStart);
  const nextExportIdx = fnRest.indexOf('\nexport ', 1);
  this.fnBody = nextExportIdx > 0 ? fnRest.substring(0, nextExportIdx) : fnRest;
});

When('I inspect the eBay scraper POST handler', function () {
  const fnStart = this.fileContent.indexOf('export async function POST');
  expect(fnStart).toBeGreaterThan(-1);
  this.fnBody = this.fileContent.substring(fnStart);
});

// ==================== Then ====================

Then('"enrichOpportunitiesWithLLM" is exported as an async function', function () {
  expect(this.fileContent).toContain(
    'export async function enrichOpportunitiesWithLLM'
  );
});

Then('the module imports identifyItem from llm-identifier', function () {
  expect(this.fileContent).toContain("from './llm-identifier'");
  expect(this.fileContent).toContain('identifyItem');
});

Then('it maps identifiedBrand from llmIdentification', function () {
  expect(this.fnBody).toContain('identifiedBrand');
  expect(this.fnBody).toContain('llmIdentification');
});

Then('it maps identifiedModel from llmIdentification', function () {
  expect(this.fnBody).toContain('identifiedModel');
});

Then('it maps identifiedYear from llmIdentification', function () {
  expect(this.fnBody).toContain('identifiedYear');
});

Then('it maps identifiedSearchQuery from llmIdentification', function () {
  expect(this.fnBody).toContain('identifiedSearchQuery');
});

Then('it sets llmAnalyzed based on llmIdentification presence', function () {
  expect(this.fnBody).toContain('llmAnalyzed');
  expect(this.fnBody).toContain('llmIdentification');
});

Then('it has a try-catch block around the identifyItem call', function () {
  expect(this.fnBody).toContain('try {');
  expect(this.fnBody).toContain('identifyItem(');
  expect(this.fnBody).toContain('} catch (');
});

Then('on error the listing is returned with null llmIdentification', function () {
  expect(this.fnBody).toContain('llmIdentification: null');
});

Then('it imports enrichOpportunitiesWithLLM from marketplace-scanner', function () {
  expect(this.fileContent).toContain('enrichOpportunitiesWithLLM');
  expect(this.fileContent).toContain('marketplace-scanner');
});

Then(
  'it calls enrichOpportunitiesWithLLM on the opportunities array',
  function () {
    expect(this.fnBody).toContain('enrichOpportunitiesWithLLM(');
    expect(this.fnBody).toContain('processedResults.opportunities');
  }
);

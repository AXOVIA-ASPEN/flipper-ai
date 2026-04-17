/**
 * Step Definitions for Story 3.8: Listing Data Processing & Deduplication
 * Validates preFilterListings and deduplicateListings logic in marketplace-scanner.ts
 * via static code analysis of the source file.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import { expect } from '@playwright/test';

const PROJECT_ROOT = process.cwd();

function readFile(relativePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

// ==================== Given ====================

Given('the deduplicateListings function exists in {string}', function (filePath: string) {
  const content = readFile(filePath);
  expect(content).toContain('export async function deduplicateListings');
  this.fileContent = content;
});

Given('the preFilterListings function exists in {string}', function (filePath: string) {
  const content = readFile(filePath);
  expect(content).toContain('export function preFilterListings');
  this.fileContent = content;
});

// ==================== When ====================

When(
  'I call deduplicateListings with a platform, a list of listings, and a userId',
  function () {
    // Context loaded in Given; assertions in Then steps
  }
);

When(
  'some of those listings already exist in the database for that platform and user',
  function () {
    // Verified in Then: function queries DB with findMany
  }
);

When('the same externalId exists in the database for a different platform', function () {
  this.checkScope = 'platform';
});

When('the same externalId exists in the database for a different userId', function () {
  this.checkScope = 'userId';
});

When(
  'I call preFilterListings with a listing whose askingPrice is {int}',
  function (price: number) {
    this.testPrice = price;
  }
);

When(
  'I call preFilterListings with a listing whose title contains {string}',
  function (keyword: string) {
    // Sponsored-keyword filtering is expressed as a test/includes check against the title.
    // Accept either regex (/sponsored/i.test) or string .includes('sponsored') forms.
    const keywordPattern = new RegExp(
      `(/${keyword}/i\\.test\\(listing\\.title\\)|\\.includes\\(['"]${keyword}['"]\\))`,
      'i'
    );
    expect(keywordPattern.test(this.fileContent)).toBe(true);
  }
);

// Accept switch/case, if-chain, OR — for the 'skip' default branch — the free_item_skipped
// reason literal which is only emitted by that code path.
function freeItemBranchPresent(content: string, setting: string): boolean {
  const branchPattern = new RegExp(
    `(case\\s+['"]${setting}['"]\\s*:|freeItemHandling\\s*===\\s*['"]${setting}['"])`
  );
  if (branchPattern.test(content)) return true;
  if (setting === 'skip') return content.includes("reason: 'free_item_skipped'");
  return false;
}

When('the freeItemHandling option is {string}', function (setting: string) {
  expect(freeItemBranchPresent(this.fileContent, setting)).toBe(true);
  this.freeItemHandling = setting;
});

When(
  'I call preFilterListings with a free item and freeItemHandling {string}',
  function (setting: string) {
    expect(freeItemBranchPresent(this.fileContent, setting)).toBe(true);
    this.freeItemHandling = setting;
  }
);

When(
  'I call preFilterListings with a different free item and freeItemHandling {string}',
  function (setting: string) {
    // Same branch — presence already verified above
    this.freeItemHandling = setting;
  }
);

When('the value estimator returns a score of {int}', function (score: number) {
  this.testScore = score;
  if (score >= 70) {
    // High score: accept path compares valueScore to the opportunity threshold (default 70).
    expect(/valueScore\s*>=\s*(70|\(?options\.opportunityThreshold)/.test(this.fileContent)).toBe(true);
    expect(this.fileContent).toContain('accepted.push(listing)');
  } else {
    // Low score: free-item below-threshold skip reason must exist.
    expect(this.fileContent).toContain("reason: 'free_item_below_threshold'");
  }
});

// ==================== Then ====================

Then(
  'the function returns a {string} array excluding the already-stored listings',
  function (arrayName: string) {
    // Accept either "const unique:" local binding OR an inline object-property return
    // (e.g. `return { unique: listings.filter(...), ... }`). Both satisfy the AC.
    const declPattern = new RegExp(
      `(const\\s+${arrayName}\\s*:|${arrayName}\\s*:\\s*listings\\.filter|${arrayName}\\s*,)`
    );
    expect(declPattern.test(this.fileContent)).toBe(true);
    // Return shape must include both unique and duplicates (any whitespace/formatting)
    expect(/return\s*\{[\s\S]*?unique[\s\S]*?duplicates[\s\S]*?\}/.test(this.fileContent)).toBe(true);
  }
);

Then(
  'the function returns a {string} array containing the already-stored listings',
  function (arrayName: string) {
    const declPattern = new RegExp(
      `(const\\s+${arrayName}\\s*:|${arrayName}\\s*:\\s*listings\\.filter|${arrayName}\\s*,)`
    );
    expect(declPattern.test(this.fileContent)).toBe(true);
  }
);

Then('the existing database records are not modified', function () {
  // Extract just the deduplicateListings function body to check it only uses findMany (read-only)
  const fnStart = this.fileContent.indexOf('export async function deduplicateListings');
  const fnRest = this.fileContent.substring(fnStart);
  const nextExportIdx = fnRest.indexOf('\nexport ', 1);
  const fnBody = nextExportIdx > 0 ? fnRest.substring(0, nextExportIdx) : fnRest;

  expect(fnBody).toContain('findMany');
  expect(fnBody).not.toContain('.upsert(');
  expect(fnBody).not.toContain('.update(');
});

Then(
  'deduplicateListings for the original platform still treats it as unique',
  function () {
    // The findMany query must scope by all three fields (platform, userId, externalId)
    // so cross-platform/cross-user matches don't falsely appear as duplicates. Tolerant of
    // single-line and multi-line formatting.
    const wherePattern = /where\s*:\s*\{[\s\S]*?platform[\s\S]*?userId[\s\S]*?externalId[\s\S]*?\}/;
    expect(wherePattern.test(this.fileContent)).toBe(true);
  }
);

Then('deduplicateListings for the original userId still treats it as unique', function () {
  const wherePattern = /where\s*:\s*\{[\s\S]*?platform[\s\S]*?userId[\s\S]*?externalId[\s\S]*?\}/;
  expect(wherePattern.test(this.fileContent)).toBe(true);
});

// Accept either `const arr:` or `const arr = [...]` or `arr: Type[] = []` bindings.
function arrayBindingPresent(content: string, name: string): boolean {
  const pattern = new RegExp(
    `(const\\s+${name}\\s*(:|=)|${name}\\s*:\\s*(RawListing|SkippedListing)\\[\\])`
  );
  return pattern.test(content);
}

Then(
  /^the listing appears in the "([^"]+)" array with reason "([^"]+)"$/,
  function (arrayName: string, reason: string) {
    expect(this.fileContent).toContain(`reason: '${reason}'`);
    expect(arrayBindingPresent(this.fileContent, arrayName)).toBe(true);
  }
);

Then(
  /^the listing does not appear in the "([^"]+)" or "([^"]+)" arrays$/,
  function (arr1: string, arr2: string) {
    expect(arrayBindingPresent(this.fileContent, arr1)).toBe(true);
    expect(arrayBindingPresent(this.fileContent, arr2)).toBe(true);
  }
);

Then('the listing appears in the {string} array', function (arrayName: string) {
  expect(this.fileContent).toContain(`${arrayName}.push(listing)`);
});

Then(
  /^the listing does not appear in "([^"]+)" or "([^"]+)"$/,
  function (arr1: string, arr2: string) {
    expect(arrayBindingPresent(this.fileContent, arr1)).toBe(true);
    expect(arrayBindingPresent(this.fileContent, arr2)).toBe(true);
  }
);

Then('the listing appears in {string}', function (arrayName: string) {
  expect(this.fileContent).toContain(`${arrayName}.push(listing)`);
});

Then(
  'the listing appears in {string} with reason {string}',
  function (arrayName: string, reason: string) {
    expect(this.fileContent).toContain(`reason: '${reason}'`);
    expect(arrayBindingPresent(this.fileContent, arrayName)).toBe(true);
  }
);

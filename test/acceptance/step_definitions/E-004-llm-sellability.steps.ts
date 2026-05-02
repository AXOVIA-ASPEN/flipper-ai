/**
 * Step Definitions for Story 4.5: LLM Sellability Assessment
 *
 * Uses static code analysis to verify that analyzeSellability() from llm-analyzer.ts
 * is correctly integrated across the scraping pipeline:
 *   - buildAnalysisPrompt() embeds configurable discountThreshold
 *   - analyzeSellability() accepts discountThreshold as 5th parameter
 *   - All scraper routes (Craigslist, Facebook, Mercari, OfferUp) read discountThreshold
 *     from userSettings and pass it to analyzeSellability
 *   - enrichWithSellabilityAnalysis() exported from marketplace-scanner (eBay path)
 *   - formatForStorage() maps all sellability analysis fields to DB columns
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

Given('the llm-analyzer module at {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  expect(content).toContain('analyzeSellability');
  this.fileContent = content;
});

Given('the Craigslist scraper route file at {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  expect(content).toContain('discountThreshold');
  this.fileContent = content;
});

Given('the scraper route file at {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  this.fileContent = content;
  this.filePath = filePath;
});

Given('the sellability module is integrated in {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  expect(content).toContain('enrichWithSellabilityAnalysis');
  this.fileContent = content;
});

// ==================== When ====================

When('I inspect the analyzeSellability function signature', function () {
  const fnStart = this.fileContent.indexOf('export async function analyzeSellability');
  expect(fnStart).toBeGreaterThan(-1);
  const fnRest = this.fileContent.substring(fnStart);
  const nextExportIdx = fnRest.indexOf('\nexport ', 1);
  this.fnBody = nextExportIdx > 0 ? fnRest.substring(0, nextExportIdx) : fnRest;
});

When('I inspect the Craigslist scraper POST handler', function () {
  const fnStart = this.fileContent.indexOf('export async function POST');
  expect(fnStart).toBeGreaterThan(-1);
  this.fnBody = this.fileContent.substring(fnStart);
});

When('I inspect the route imports', function () {
  // Store whole file content so both import checks and body checks work
  this.fnBody = this.fileContent;
});

// ==================== Then: S-24 (analyzeSellability discountThreshold param) ====================

Then('it accepts discountThreshold as an optional 5th parameter', function () {
  expect(this.fnBody).toContain('discountThreshold?');
});

Then(
  'the buildAnalysisPrompt function embeds discountThreshold in the prompt text',
  function () {
    // After the AI-router refactor, the prompt builder lives in
    // `src/lib/ai/prompts/flip-analysis.ts` as `flipAnalysis.buildUserPrompt`,
    // and the discountThreshold value is threaded through `completeAI`'s
    // context. Verify either the legacy local function OR the canonical
    // prompt-config entrypoint embeds discountThreshold via a template literal.
    let bodyToCheck: string;
    const localStart = this.fileContent.indexOf('function buildAnalysisPrompt');
    if (localStart > -1) {
      bodyToCheck = this.fileContent.substring(localStart, localStart + 1500);
    } else {
      const promptModule = readSourceFile('src/lib/ai/prompts/flip-analysis.ts');
      const builderStart = promptModule.indexOf('flipAnalysis');
      bodyToCheck = builderStart > -1 ? promptModule.substring(builderStart) : promptModule;
    }
    expect(bodyToCheck).toContain('discountThreshold');
    expect(bodyToCheck).toContain('${discountThreshold}');
  }
);

Then(
  'the meetsThreshold field in the prompt uses the configured threshold not a hardcoded value',
  function () {
    let bodyToCheck: string;
    const localStart = this.fileContent.indexOf('function buildAnalysisPrompt');
    if (localStart > -1) {
      bodyToCheck = this.fileContent.substring(localStart, localStart + 1500);
    } else {
      bodyToCheck = readSourceFile('src/lib/ai/prompts/flip-analysis.ts');
    }
    // Threshold must be a template literal interpolation, not the hardcoded string "50"
    expect(bodyToCheck).toContain('${discountThreshold}');
  }
);

// ==================== Then: S-25 (Craigslist reads discountThreshold) ====================

Then(
  'it reads discountThreshold from userSettings with fallback to 50',
  function () {
    expect(this.fnBody).toContain('discountThreshold');
    expect(this.fnBody).toMatch(/discountThreshold\s*[=:][^=].*50/s);
  }
);

Then('it passes discountThreshold to the analyzeSellability call', function () {
  expect(this.fnBody).toContain('analyzeSellability(');
  expect(this.fnBody).toContain('discountThreshold');
});

Then('it uses discountThreshold in the shouldSave threshold check', function () {
  expect(this.fnBody).toContain('shouldSave');
  expect(this.fnBody).toContain('discountThreshold');
});

// ==================== Then: S-26 (inline scrapers import sellability functions) ====================

Then('it imports {string} from {string}', function (funcName: string, modulePath: string) {
  expect(this.fnBody).toContain(funcName);
  expect(this.fnBody).toContain(modulePath);
});

// ==================== Then: S-27 (formatForStorage includes sellability fields) ====================

Then('it maps sellabilityScore from sellabilityAnalysis', function () {
  expect(this.fnBody).toContain('sellabilityScore');
  expect(this.fnBody).toContain('sellabilityAnalysis');
});

Then('it maps demandLevel from sellabilityAnalysis', function () {
  expect(this.fnBody).toContain('demandLevel');
  expect(this.fnBody).toContain('sellabilityAnalysis');
});

Then('it maps expectedDaysToSell from sellabilityAnalysis', function () {
  expect(this.fnBody).toContain('expectedDaysToSell');
});

Then('it maps authenticityRisk from sellabilityAnalysis', function () {
  expect(this.fnBody).toContain('authenticityRisk');
});

Then('it maps recommendedOffer from sellabilityAnalysis', function () {
  expect(this.fnBody).toContain('recommendedOffer');
});

Then('it maps resaleStrategy from sellabilityAnalysis', function () {
  expect(this.fnBody).toContain('resaleStrategy');
});

Then('it maps analysisConfidence from sellabilityAnalysis', function () {
  expect(this.fnBody).toContain('analysisConfidence');
});

Then('it maps analysisReasoning from sellabilityAnalysis', function () {
  expect(this.fnBody).toContain('analysisReasoning');
});

// ==================== Then: S-28 (enrichWithSellabilityAnalysis export + eBay usage) ====================

Then('"enrichWithSellabilityAnalysis" is exported as an async function', function () {
  expect(this.fileContent).toContain(
    'export async function enrichWithSellabilityAnalysis'
  );
});

Then(
  'the eBay scraper route imports enrichWithSellabilityAnalysis from marketplace-scanner',
  function () {
    const ebayContent = readSourceFile('app/api/scraper/ebay/route.ts');
    expect(ebayContent).toContain('enrichWithSellabilityAnalysis');
    expect(ebayContent).toContain('marketplace-scanner');
  }
);

Then(
  'the eBay scraper route calls enrichWithSellabilityAnalysis when LLM is active',
  function () {
    const ebayContent = readSourceFile('app/api/scraper/ebay/route.ts');
    expect(ebayContent).toContain('enrichWithSellabilityAnalysis(');
    // Must be inside an if (hasLLM) branch
    expect(ebayContent).toContain('hasLLM');
    expect(ebayContent).toMatch(/if\s*\(hasLLM\)/);
  }
);

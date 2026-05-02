/**
 * Step Definitions for Story 5.4: Item Completeness & Seller Reputation Analysis
 *
 * Tests via source-code inspection — no HTTP server or API calls required.
 * Verifies that:
 *   - analyzeItemCompleteness() from item-completeness-analyzer.ts uses GPT-4o Vision
 *   - analyzeSellerReputation() from seller-reputation-analyzer.ts defines EBAY/MERCARI thresholds
 *   - CRAIGSLIST, FACEBOOK_MARKETPLACE, OFFERUP are in the skip platforms set
 *   - enrichWithCompletenessAndReputation() in marketplace-scanner.ts escalates authenticityRisk
 *   - completenessLabel is displayed on the Opportunities page
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

Given('the item-completeness-analyzer module at {string}', function (filePath: string) {
  this.source = readSource(filePath);
  this.filePath = filePath;
});

Given('the completeness and reputation pipeline in {string}', function (filePath: string) {
  this.source = readSource(filePath);
  this.filePath = filePath;
});

Given('the seller-reputation-analyzer module at {string}', function (filePath: string) {
  this.source = readSource(filePath);
  this.filePath = filePath;
});

// ==================== When ====================

When('I inspect the completeness analyzer exports', function () {
  // Source already loaded in Given — assertions performed in Then steps.
});

When('I inspect the seller reputation analyzer exports', function () {
  // Source already loaded in Given — assertions performed in Then steps.
});

When('I inspect the enrichWithCompletenessAndReputation function', function () {
  const fnStart = this.source.indexOf('export async function enrichWithCompletenessAndReputation');
  assert.ok(fnStart > -1, 'enrichWithCompletenessAndReputation not found in source');
  const fnRest = this.source.substring(fnStart);
  const nextExportIdx = fnRest.indexOf('\nexport ', 1);
  this.fnBody = nextExportIdx > 0 ? fnRest.substring(0, nextExportIdx) : fnRest;
});

When('I inspect the skip platforms configuration', function () {
  // Source already loaded in Given — assertions performed in Then steps.
});

When('I inspect the Listing interface and completeness display', function () {
  // fileContent is set by Given('the opportunities page at {string}')
  // Expose as fileBody for Then steps in this story
  this.fileBody = this.fileContent;
});

// ==================== Then: S-4 (item-completeness-analyzer) ====================

Then('it uses the {string} model for Vision analysis', function (modelName: string) {
  // After the AI-router refactor, model selection moved to the centralized
  // prompt registry. The analyzer module calls completeAI('itemCompleteness', ...)
  // and the model lives on the itemCompleteness PromptConfig.
  if (this.source.includes(`model: '${modelName}'`)) return;
  if (this.source.includes("completeAI('itemCompleteness'") ||
      this.source.includes('completeAI("itemCompleteness"')) {
    const promptModule = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/ai/prompts/identification.ts'),
      'utf-8'
    );
    // Anchor on the actual `export const itemCompleteness` declaration to avoid
    // matching JSDoc references earlier in the file.
    const declStart = promptModule.indexOf('export const itemCompleteness');
    assert.ok(declStart > -1, 'itemCompleteness PromptConfig declaration not found');
    const declBody = promptModule.substring(declStart, declStart + 1500);
    const match = declBody.match(/model:\s*['"]([^'"]+)['"]/);
    assert.ok(match, 'itemCompleteness prompt config has no model field');
    assert.strictEqual(
      match?.[1],
      modelName,
      `Expected itemCompleteness prompt model '${modelName}', got '${match?.[1]}'`
    );
    return;
  }
  assert.fail(
    `Expected item-completeness-analyzer to use model '${modelName}' (literal in source OR via completeAI('itemCompleteness') + prompt config)`
  );
});

Then('it returns null immediately for empty imageUrls', function () {
  assert.ok(
    this.source.includes('imageUrls.length === 0'),
    `Expected early-return guard for empty imageUrls in ${this.filePath}`
  );
});

// ==================== Then: shared interface export ====================

Then('{string} is exported as an interface', function (interfaceName: string) {
  const src = this.source || this.fileContent || this.routeContent || this.sourceContent || '';
  const where = this.filePath || '<unknown source>';
  assert.ok(
    src.includes(`export interface ${interfaceName}`) || src.includes(`export type ${interfaceName}`),
    `Expected "${interfaceName}" to be exported as an interface or type in ${where}`
  );
});

// ==================== Then: S-5 (opportunities page completeness display) ====================

Then(
  'the Listing interface includes {string} as a nullable string',
  function (fieldName: string) {
    assert.ok(
      this.fileContent.includes(fieldName),
      `Expected Listing interface to include "${fieldName}"`
    );
    assert.ok(
      this.fileContent.match(new RegExp(`${fieldName}\\s*:\\s*string\\s*\\|\\s*null`)),
      `Expected "${fieldName}" to be typed as "string | null"`
    );
  }
);

Then('the page renders completenessLabel in the market details section', function () {
  assert.ok(
    this.fileContent.includes('completenessLabel'),
    `Expected opportunities page to render completenessLabel`
  );
  assert.ok(
    this.fileContent.includes('Item Completeness'),
    `Expected "Item Completeness" label in market details section`
  );
});

// ==================== Then: S-6 (seller-reputation-analyzer thresholds) ====================

Then('it defines a reputation threshold for {string}', function (platform: string) {
  assert.ok(
    this.source.includes(`${platform}:`),
    `Expected seller-reputation-analyzer to define threshold for ${platform} in ${this.filePath}`
  );
});

// ==================== Then: S-7 (enrichWithCompletenessAndReputation risk escalation) ====================

Then(
  'it imports {string} from the seller-reputation-analyzer',
  function (fnName: string) {
    assert.ok(
      this.source.includes(fnName) && this.source.includes('seller-reputation-analyzer'),
      `Expected "${fnName}" to be imported from seller-reputation-analyzer in ${this.filePath}`
    );
  }
);

Then(
  'it escalates authenticityRisk to {string} when riskEscalation is true',
  function (riskLevel: string) {
    const body = this.fnBody ?? this.source;
    assert.ok(
      body.includes(`authenticityRisk: '${riskLevel}'`),
      `Expected authenticityRisk escalation to '${riskLevel}' in enrichWithCompletenessAndReputation`
    );
    assert.ok(
      body.includes('riskEscalation'),
      `Expected enrichWithCompletenessAndReputation to check riskEscalation`
    );
  }
);

// ==================== Then: S-8 (skip platforms) ====================

Then('{string} is listed as a skip platform', function (platform: string) {
  assert.ok(
    this.source.includes(`'${platform}'`),
    `Expected "${platform}" to be in the SKIP_PLATFORMS set in ${this.filePath}`
  );
});

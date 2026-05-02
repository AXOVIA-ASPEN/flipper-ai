/**
 * @file test/acceptance/step_definitions/E-013-structured-json.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-12
 * @version 1.0
 * @brief Step definitions for Story 13.2 — Structured JSON Response Format for LLM Analysis.
 *
 * @description
 * Static code analysis steps that verify the llm-analyzer.ts module uses
 * OpenAI's native json_object mode, has removed regex-based extraction,
 * includes retry logic with Sentry error logging, and preserves the
 * SellabilityAnalysis response schema. All ACs are logic/infrastructure
 * requirements — static analysis is the correct test level.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();

function readSourceFile(relativePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

// ==================== Given ====================

Given(
  'the llm-analyzer source file at {string}',
  function (filePath: string) {
    this.sourceContent = readSourceFile(filePath);
    this.filePath = filePath;
  }
);

// ==================== When: AC #1 — Native JSON mode ====================

When(
  'I inspect the analyzeSellability OpenAI call configuration',
  function () {
    // After the AI-router refactor, analyzeSellability calls completeAI('flipAnalysis', ...)
    // and JSON mode is configured by the prompt registry + threaded through providers.
    // Verify both layers: the prompt config marks the task as JSON, and the OpenAI
    // provider translates that to native response_format.
    const fnStart = this.sourceContent.indexOf('export async function analyzeSellability');
    assert(fnStart > -1, 'analyzeSellability function not found');
    this.fnBody = this.sourceContent.substring(fnStart);

    this.flipAnalysisPromptSource = readSourceFile('src/lib/ai/prompts/flip-analysis.ts');
    this.openaiProviderSource = readSourceFile('src/lib/ai/providers/openai.ts');
  }
);

// ==================== Then: AC #1 — Native JSON mode ====================

Then(
  'it should include response_format with type {string}',
  function (formatType: string) {
    // analyzeSellability must route through completeAI('flipAnalysis', ...)
    assert(
      this.fnBody.includes("completeAI('flipAnalysis'"),
      'Expected analyzeSellability to call completeAI(\'flipAnalysis\', ...) — refactored AI router'
    );
    // The flipAnalysis prompt config must declare JSON response format
    assert(
      /flipAnalysis[\s\S]*?responseFormat:\s*'json'/.test(this.flipAnalysisPromptSource as string),
      'Expected flipAnalysis prompt config to set responseFormat: \'json\''
    );
    // The OpenAI provider must translate that config to native response_format
    assert(
      (this.openaiProviderSource as string).includes(`response_format = { type: '${formatType}' }`),
      `Expected OpenAI provider to set response_format = { type: '${formatType}' } when responseFormat === 'json'`
    );
  }
);

Then(
  'the system prompt should contain the word {string}',
  function (keyword: string) {
    // After the AI-router refactor, the system prompt lives on the
    // flipAnalysis PromptConfig.systemPrompt — not inline in analyzeSellability.
    // Try inline first (legacy shape), then fall back to the prompt config.
    const inlineMatch = this.fnBody.match(
      /role:\s*['"]system['"][\s\S]*?content:\s*[\s\S]*?['"`]([^'"`]+)['"`]/
    );
    if (inlineMatch) {
      assert(
        inlineMatch[1].includes(keyword),
        `System prompt does not contain "${keyword}": ${inlineMatch[1]}`
      );
      return;
    }
    const promptModule = readSourceFile('src/lib/ai/prompts/flip-analysis.ts');
    const systemPromptMatch = promptModule.match(
      /flipAnalysis[\s\S]*?systemPrompt:\s*\n?\s*['"`]([^'"`]+)['"`]/
    );
    assert(
      systemPromptMatch,
      'flipAnalysis.systemPrompt not found — neither inline analyzeSellability nor prompt config has it'
    );
    assert(
      systemPromptMatch[1].includes(keyword),
      `flipAnalysis system prompt does not contain "${keyword}": ${systemPromptMatch[1]}`
    );
  }
);

// ==================== When: AC #2 — Regex extraction removed ====================

When(
  'I search for regex-based JSON extraction patterns',
  function () {
    // Look for the old regex pattern that was used to extract JSON
    // Check if source contains .match( followed by a regex opening /
    const regexMatchPattern = '.match(/';
    this.hasRegexExtraction = this.sourceContent.includes(regexMatchPattern);
    this.hasDirectParse = this.sourceContent.includes('JSON.parse(responseText)') ||
      this.sourceContent.includes('JSON.parse(retryText)');
  }
);

// ==================== Then: AC #2 — Regex extraction removed ====================

Then(
  'no regex extraction pattern should be found',
  function () {
    assert.strictEqual(
      this.hasRegexExtraction,
      false,
      'Regex-based JSON extraction pattern still exists in source'
    );
  }
);

Then(
  'direct JSON.parse should be used for response parsing',
  function () {
    assert.strictEqual(
      this.hasDirectParse,
      true,
      'Direct JSON.parse not found — response parsing may still use regex'
    );
  }
);

// ==================== When: AC #3 — Retry logic ====================

When(
  'I inspect the JSON parse error handling in analyzeSellability',
  function () {
    const fnStart = this.sourceContent.indexOf('export async function analyzeSellability');
    assert(fnStart > -1, 'analyzeSellability function not found');
    this.fnBody = this.sourceContent.substring(fnStart);
  }
);

// ==================== Then: AC #3 — Retry logic ====================

Then(
  'there should be a retry with a simplified prompt on parse failure',
  function () {
    // Check for the retry pattern: catch block that runs a fallback path on JSON.parse failure
    assert(
      this.fnBody.includes('retrying with simplified prompt') ||
        this.fnBody.includes('simplified prompt'),
      'No retry with simplified prompt found in parse error handling'
    );
    // After the AI-router refactor, retries route through completeAI() with a
    // simpler task ("quickDiscountCheck"). Verify there are at least 2 AI invocations.
    const completeAiCalls = (this.fnBody.match(/completeAI\(/g) || []).length;
    const legacyCalls = (this.fnBody.match(/client\.chat\.completions\.create/g) || []).length;
    const totalCalls = completeAiCalls + legacyCalls;
    assert(
      totalCalls >= 2,
      `Expected at least 2 AI invocations (primary + retry), found ${totalCalls} ` +
        `(completeAI: ${completeAiCalls}, legacy: ${legacyCalls})`
    );
  }
);

Then(
  'on second failure it should return null for algorithmic fallback',
  function () {
    // After the retry catch, should return null
    assert(
      this.fnBody.includes('return null'),
      'Missing return null after retry failure (algorithmic fallback path)'
    );
  }
);

// ==================== When: AC #4 — Sentry error logging ====================

When(
  'I inspect the error logging in the retry catch block',
  function () {
    const fnStart = this.sourceContent.indexOf('export async function analyzeSellability');
    assert(fnStart > -1, 'analyzeSellability function not found');
    this.fnBody = this.sourceContent.substring(fnStart);
  }
);

// ==================== Then: AC #4 — Sentry error logging ====================

Then(
  'Sentry.captureException should be called with the error',
  function () {
    assert(
      this.fnBody.includes('Sentry.captureException'),
      'Sentry.captureException not found in analyzeSellability error handling'
    );
  }
);

Then(
  'the extra context should include the original response text',
  function () {
    // Verify Sentry is called with extra context containing the response
    assert(
      this.fnBody.includes('originalResponse') || this.fnBody.includes('responseText'),
      'Sentry extra context does not include original response text'
    );
  }
);

// ==================== When: AC #5 — Schema unchanged ====================

When(
  'I inspect the SellabilityAnalysis interface and buildResult function',
  function () {
    this.hasInterface = this.sourceContent.includes('export interface SellabilityAnalysis');
    this.hasBuildResult = this.sourceContent.includes('function buildResult');
  }
);

// ==================== Then: AC #5 — Schema unchanged ====================

Then(
  'all original fields should be preserved in the response schema',
  function () {
    assert(this.hasInterface, 'SellabilityAnalysis interface not found');

    const requiredFields = [
      'verifiedMarketValue',
      'trueDiscountPercent',
      'sellabilityScore',
      'demandLevel',
      'expectedDaysToSell',
      'authenticityRisk',
      'conditionRisk',
      'recommendedOfferPrice',
      'recommendedListPrice',
      'resaleStrategy',
      'resalePlatform',
      'comparableSales',
      'confidence',
      'reasoning',
      'meetsThreshold',
    ];

    for (const field of requiredFields) {
      assert(
        this.sourceContent.includes(field),
        `Required field "${field}" missing from SellabilityAnalysis`
      );
    }
  }
);

Then(
  'the buildResult validation functions should still be applied',
  function () {
    assert(this.hasBuildResult, 'buildResult function not found');

    const requiredValidators = [
      'validateDemandLevel',
      'validateRisk',
      'validateConfidence',
    ];

    for (const validator of requiredValidators) {
      assert(
        this.sourceContent.includes(validator),
        `Validation function "${validator}" missing — schema validation not preserved`
      );
    }

    // Verify score clamping is preserved
    assert(
      this.sourceContent.includes('Math.min(100, Math.max(0,'),
      'sellabilityScore clamping (0-100) not preserved in buildResult'
    );
  }
);

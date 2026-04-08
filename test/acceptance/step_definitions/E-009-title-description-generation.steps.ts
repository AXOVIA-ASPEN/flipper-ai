/**
 * @file test/acceptance/step_definitions/E-009-title-description-generation.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-08
 * @version 1.0
 * @brief Step definitions for E-009 story 9.1 (AI title & description generation).
 *
 * @description
 * Drives the real title-generator and description-generator modules with
 * synthetic identification data to validate FR-RELIST-01 (SEO titles +
 * platform conventions), FR-RELIST-02 (platform-specific descriptions),
 * and FR-RELIST-07 (algorithmic fallback). Also asserts that the
 * generate-resale-content API route exists and that the posting queue
 * route imports the generator modules — those structural checks back the
 * UI integration ACs without booting Next.js.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateAlgorithmicTitle,
  generateLLMTitle,
} from '../../../src/lib/title-generator';
import type {
  TitleGeneratorInput,
  GeneratedTitle,
} from '../../../src/lib/title-generator';
import {
  generateAlgorithmicDescription,
  generateLLMDescription,
} from '../../../src/lib/description-generator';
import type {
  DescriptionGeneratorInput,
  GeneratedDescription,
} from '../../../src/lib/description-generator';

// Shared scenario state
let titleInput: TitleGeneratorInput;
let descInput: DescriptionGeneratorInput;
let generatedTitle: GeneratedTitle | null = null;
let generatedDescription: GeneratedDescription | null = null;
let savedOpenAIKey: string | undefined;

// ── Given: build inputs ──────────────────────────────────────────────────────

Given(
  'a purchased item with brand {string} model {string} variant {string} condition {string}',
  function (brand: string, model: string, variant: string, condition: string) {
    titleInput = {
      brand: brand || null,
      model: model || null,
      variant: variant || null,
      condition,
      category: null,
      keywords: [],
    };
    generatedTitle = null;
    generatedDescription = null;
  }
);

Given(
  'a purchased item with brand {string} model {string} variant {string} condition {string} and asking price {int}',
  function (
    brand: string,
    model: string,
    variant: string,
    condition: string,
    askingPrice: number
  ) {
    titleInput = {
      brand: brand || null,
      model: model || null,
      variant: variant || null,
      condition,
      category: null,
      keywords: [],
    };
    descInput = {
      brand: brand || null,
      model: model || null,
      variant: variant || null,
      condition,
      category: null,
      askingPrice,
      originalPrice: askingPrice,
      defects: [],
      features: [],
      sellerNotes: null,
    };
    generatedTitle = null;
    generatedDescription = null;
  }
);

Given('the OpenAI API key is not configured', function () {
  savedOpenAIKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
});

// ── When: generator actions ──────────────────────────────────────────────────

When('the title generator runs for platform {string}', function (platform: string) {
  generatedTitle = generateAlgorithmicTitle(titleInput, platform);
});

When(
  'the title generator runs for platform {string} using LLM mode',
  async function (platform: string) {
    // generateLLMTitle falls back to algorithmic when OPENAI_API_KEY is missing,
    // which is the algorithmic-fallback path AC4 cares about.
    generatedTitle = await generateLLMTitle(titleInput, platform);
    if (savedOpenAIKey !== undefined) process.env.OPENAI_API_KEY = savedOpenAIKey;
  }
);

When(
  'the description generator runs for platform {string}',
  function (platform: string) {
    generatedDescription = generateAlgorithmicDescription(descInput, platform);
  }
);

When(
  'the description generator runs for platform {string} using LLM mode',
  async function (platform: string) {
    generatedDescription = await generateLLMDescription(descInput, platform);
    if (savedOpenAIKey !== undefined) process.env.OPENAI_API_KEY = savedOpenAIKey;
  }
);

// ── Then: title assertions ───────────────────────────────────────────────────

Then('the generated title is at most {int} characters', function (limit: number) {
  assert.ok(generatedTitle, 'Expected a generated title');
  assert.ok(
    generatedTitle!.title.length <= limit,
    `Title length ${generatedTitle!.title.length} exceeds limit ${limit}: "${generatedTitle!.title}"`
  );
});

Then('the generated title contains {string}', function (substring: string) {
  assert.ok(generatedTitle, 'Expected a generated title');
  assert.ok(
    generatedTitle!.title.includes(substring),
    `Expected title "${generatedTitle!.title}" to contain "${substring}"`
  );
});

Then('a title is still produced', function () {
  assert.ok(generatedTitle, 'Expected a generated title (algorithmic fallback)');
  assert.ok(
    generatedTitle!.title.length > 0,
    'Expected non-empty title from algorithmic fallback'
  );
});

// ── Then: description assertions ─────────────────────────────────────────────

Then('the generated description is non-empty', function () {
  assert.ok(generatedDescription, 'Expected a generated description');
  assert.ok(
    generatedDescription!.description.trim().length > 0,
    'Expected non-empty description'
  );
});

Then('the generated description mentions the condition', function () {
  assert.ok(generatedDescription, 'Expected a generated description');
  assert.ok(
    /condition|wear|new|used/i.test(generatedDescription!.description),
    `Expected description to mention condition: "${generatedDescription!.description}"`
  );
});

Then('the generated description mentions {string}', function (phrase: string) {
  assert.ok(generatedDescription, 'Expected a generated description');
  assert.ok(
    generatedDescription!.description.includes(phrase),
    `Expected description to mention "${phrase}". Got: "${generatedDescription!.description}"`
  );
});

Then('a description is still produced', function () {
  assert.ok(
    generatedDescription,
    'Expected a generated description (algorithmic fallback)'
  );
  assert.ok(
    generatedDescription!.description.length > 0,
    'Expected non-empty description from algorithmic fallback'
  );
});

// ── Then: editable draft assertions ─────────────────────────────────────────

Then('both the title and description are mutable strings', function () {
  assert.ok(generatedTitle, 'Expected a generated title');
  assert.ok(generatedDescription, 'Expected a generated description');
  assert.strictEqual(
    typeof generatedTitle!.title,
    'string',
    'Title must be a string'
  );
  assert.strictEqual(
    typeof generatedDescription!.description,
    'string',
    'Description must be a string'
  );
});

// ── Then: API route structural assertions ──────────────────────────────────

Given(
  'the resale content generation API endpoint exists at {string}',
  function (routePath: string) {
    const fullPath = path.resolve(process.cwd(), routePath);
    assert.ok(
      fs.existsSync(fullPath),
      `Expected API route file to exist at ${routePath}`
    );
  }
);

Then(
  'the resale content route returns the unified shape with titles, descriptions, primary, source, and warnings',
  function () {
    const routePath = path.resolve(
      process.cwd(),
      'app/api/listings/[id]/generate-resale-content/route.ts'
    );
    const content = fs.readFileSync(routePath, 'utf-8');
    for (const key of [
      'titles',
      'descriptions',
      'primary',
      'source',
      'warnings',
    ]) {
      assert.ok(
        new RegExp(`\\b${key}\\b`).test(content),
        `Expected route to include "${key}" in its response shape`
      );
    }
  }
);

Given('the posting queue route exists at {string}', function (routePath: string) {
  const fullPath = path.resolve(process.cwd(), routePath);
  assert.ok(
    fs.existsSync(fullPath),
    `Expected posting queue route to exist at ${routePath}`
  );
});

Then(
  'the posting queue route imports the algorithmic title and description generators',
  function () {
    const routePath = path.resolve(process.cwd(), 'app/api/posting-queue/route.ts');
    const content = fs.readFileSync(routePath, 'utf-8');
    assert.ok(
      /generateAlgorithmicTitle/.test(content),
      'Expected posting queue route to import generateAlgorithmicTitle'
    );
    assert.ok(
      /generateAlgorithmicDescription/.test(content),
      'Expected posting queue route to import generateAlgorithmicDescription'
    );
  }
);

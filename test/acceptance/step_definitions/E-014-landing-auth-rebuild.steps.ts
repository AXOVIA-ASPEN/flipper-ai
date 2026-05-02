/**
 * @file test/acceptance/step_definitions/E-014-landing-auth-rebuild.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Step definitions for Story 14.4 — Landing Page and Auth Pages Rebuild.
 *
 * @description
 * Covers scenarios E-014-S-37 through E-014-S-50. Pure filesystem assertions
 * verify the five rebuilt pages contain zero banned Tailwind palette classes,
 * zero FLIPPER-14-2 interim markers, and zero legacy bg-theme-/var(--theme-)
 * references. Playwright E2E scenarios verify canonical fp-glass card rendering,
 * absence of animate-blob orbs, accessible aria-labels on eye-toggle controls,
 * and zero axe-core critical/serious violations across all five public-facing pages.
 * Navigation flow scenarios confirm the landing-page CTA routes to /register.
 */

import { When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import AxeBuilder from '@axe-core/playwright';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { CustomWorld } from '../support/world';

setDefaultTimeout(120 * 1000);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3200';

// Five pages rebuilt by Story 14.4
const REBUILT_FILES = [
  'app/page.tsx',
  'app/(auth)/login/page.tsx',
  'app/(auth)/register/page.tsx',
  'app/(auth)/forgot-password/page.tsx',
  'app/(auth)/reset-password/page.tsx',
];

// Non-canonical Tailwind palette color classes that must not appear in rebuilt files.
// Mirrors AC #7's regex exactly — purple is the canonical accent and MUST NOT be banned
// (see story 14.4 AC #7 regex). Green/red are banned on auth pages via AC #7's carve-out
// language; password-strength meters use inline hex values so zero Tailwind-class matches
// still hold (see ADR-14.4-D).
const BANNED_PALETTE_PATTERN =
  /(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|green|amber|yellow|orange|red)-\d+/g;

const FLIPPER_14_2_PATTERN = /FLIPPER-14-2/g;

const LEGACY_THEME_PATTERN = /bg-theme-|text-theme-|shadow-theme-|ring-theme-|var\(--theme-/g;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFile(relPath: string): string {
  const absPath = path.join(process.cwd(), relPath);
  return fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf-8') : '';
}

function countAcrossFiles(files: string[], pattern: RegExp): number {
  let total = 0;
  for (const relPath of files) {
    const content = readFile(relPath);
    // Construct a fresh regex each iteration to reset lastIndex on the global pattern.
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = content.match(re);
    if (matches) total += matches.length;
  }
  return total;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

When(
  'I load {string} in the browser without authentication',
  async function (this: CustomWorld, routePath: string) {
    await this.page.goto(`${BASE_URL}${routePath}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });
  }
);

// ─── Source file assertions (positive) ───────────────────────────────────────

Then(
  '{string} contains the string {string}',
  function (this: CustomWorld, relPath: string, searchStr: string) {
    const content = readFile(relPath);
    assert.ok(
      content.includes(searchStr),
      `Expected ${relPath} to contain "${searchStr}" but it does not`
    );
  }
);

// ─── DOM class assertions ─────────────────────────────────────────────────────

Then(
  'no DOM element has the class {string}',
  async function (this: CustomWorld, className: string) {
    const count = await this.page.evaluate(
      (cls: string) => document.querySelectorAll('.' + cls).length,
      className
    );
    assert.strictEqual(
      count,
      0,
      `Expected no elements with class "${className}" but found ${count}`
    );
  }
);

Then(
  'at least one DOM element has the class {string}',
  async function (this: CustomWorld, className: string) {
    const count = await this.page.evaluate(
      (cls: string) => document.querySelectorAll('.' + cls).length,
      className
    );
    assert.ok(count > 0, `Expected at least one element with class "${className}" but found none`);
  }
);

Then(
  'at least one input element has the class {string}',
  async function (this: CustomWorld, className: string) {
    const count = await this.page.evaluate(
      (cls: string) =>
        Array.from(document.querySelectorAll('input')).filter((el) => el.classList.contains(cls))
          .length,
      className
    );
    assert.ok(count > 0, `Expected at least one <input> with class "${className}" but found none`);
  }
);

// ─── Banned palette counter ───────────────────────────────────────────────────

When(
  'I count banned palette matches across the five rebuilt landing and auth pages',
  function (this: CustomWorld) {
    this._matchCount = countAcrossFiles(REBUILT_FILES, BANNED_PALETTE_PATTERN);
  }
);

Then('the count of banned palette matches is zero', function (this: CustomWorld) {
  assert.strictEqual(
    this._matchCount,
    0,
    `Expected zero banned palette class matches but found ${this._matchCount}`
  );
});

// ─── FLIPPER-14-2 interim marker counter ─────────────────────────────────────

When(
  'I count FLIPPER-14-2 occurrences across the five rebuilt landing and auth pages',
  function (this: CustomWorld) {
    this._matchCount = countAcrossFiles(REBUILT_FILES, FLIPPER_14_2_PATTERN);
  }
);

Then('the count of FLIPPER-14-2 occurrences is zero', function (this: CustomWorld) {
  assert.strictEqual(
    this._matchCount,
    0,
    `Expected zero FLIPPER-14-2 occurrences but found ${this._matchCount}`
  );
});

// ─── Legacy theme class counter ───────────────────────────────────────────────

When(
  'I count legacy theme class references across the five rebuilt landing and auth pages',
  function (this: CustomWorld) {
    this._matchCount = countAcrossFiles(REBUILT_FILES, LEGACY_THEME_PATTERN);
  }
);

Then('the count of legacy theme class references is zero', function (this: CustomWorld) {
  assert.strictEqual(
    this._matchCount,
    0,
    `Expected zero legacy theme class references but found ${this._matchCount}`
  );
});

// ─── Navigation interaction ───────────────────────────────────────────────────

When(
  'I click the first button with text {string}',
  async function (this: CustomWorld, buttonText: string) {
    // Wait for the document `load` event so React event handlers (router.push,
    // onClick) are wired before we click. `networkidle` is unreliable in dev —
    // Next.js HMR poll and Sentry beacons can keep the network busy past any
    // reasonable timeout; `load` is bounded by the document load event.
    await this.page.waitForLoadState('load', { timeout: 30_000 });
    const target = this.page
      .locator(`button:has-text("${buttonText}"), a:has-text("${buttonText}")`)
      .first();
    const startUrl = this.page.url();
    await target.click({ timeout: 10_000 });
    // Wait for either an in-app router.push() URL change OR a full document load.
    await this.page
      .waitForFunction((prev) => window.location.href !== prev, startUrl, { timeout: 15_000 })
      .catch(() => {
        // If the URL didn't change (e.g., button has no navigation), continue —
        // the assertion step will surface the failure with the actual URL.
      });
  }
);

Then(
  'the current page URL contains {string}',
  async function (this: CustomWorld, urlFragment: string) {
    const url = this.page.url();
    assert.ok(
      url.includes(urlFragment),
      `Expected current URL to contain "${urlFragment}" but got "${url}"`
    );
  }
);

// ─── Axe-core accessibility ───────────────────────────────────────────────────

Then(
  'the page passes axe-core with zero critical and serious violations',
  async function (this: CustomWorld) {
    const results = await new AxeBuilder({ page: this.page }).analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    assert.strictEqual(
      blocking.length,
      0,
      `axe-core found ${blocking.length} critical/serious violation(s):\n` +
        blocking.map((v) => `  [${v.impact}] ${v.id}: ${v.description}`).join('\n')
    );
  }
);

// ─── Eye-toggle aria-label ────────────────────────────────────────────────────

Then(
  'the password eye-toggle button has an aria-label of {string} or {string}',
  async function (this: CustomWorld, label1: string, label2: string) {
    const found = await this.page.evaluate(
      ([l1, l2]: string[]) =>
        !!(
          document.querySelector(`button[aria-label="${l1}"]`) ||
          document.querySelector(`button[aria-label="${l2}"]`)
        ),
      [label1, label2]
    );
    assert.ok(
      found,
      `Expected a button with aria-label "${label1}" or "${label2}" but none was found`
    );
  }
);

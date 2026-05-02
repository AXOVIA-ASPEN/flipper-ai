/**
 * @file test/acceptance/step_definitions/E-014-remove-multi-theme.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Step definitions for Story 14.2 — Remove Competing Multi-Theme System.
 *
 * @description
 * Covers scenarios E-014-S-6 through E-014-S-14. Scenarios S-6 to S-11 are
 * pure filesystem assertion steps using Node.js fs (no child-process rg) to
 * verify that the legacy (bg|text|shadow|ring)-theme-* CSS classes and their
 * supporting TypeScript modules have been fully removed.
 * Scenarios S-12 to S-14 are Playwright E2E regressions verifying that the
 * affected pages (/settings, /login, /opportunities) still render after cleanup.
 *
 * Pattern for filesystem checks: countMatchesInFiles() walks directories
 * recursively using fs.readdirSync + fs.readFileSync and applies a RegExp —
 * no host-tool dependency avoids CI breakage on machines without rg.
 */

import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { CustomWorld } from '../support/world';

setDefaultTimeout(120 * 1000);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3200';

// Console errors that are expected in acceptance-test environment (no real backend).
const IGNORABLE_CONSOLE_PATTERNS = [
  'favicon',
  'Failed to load resource',
  '401',
  '403',
  'Unauthorized',
  'TypeError: Failed to fetch',
  'NetworkError',
  'ERR_CONNECTION_REFUSED',
];

// ─── Filesystem helpers ───────────────────────────────────────────────────────

const TS_EXTS = ['.ts', '.tsx', '.css'];

function walkFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, exts));
    } else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

function countMatchesInFiles(dirs: string[], pattern: RegExp, exts: string[] = TS_EXTS): number {
  const projectRoot = path.resolve(process.cwd());
  let total = 0;
  for (const dir of dirs) {
    const absDir = path.join(projectRoot, dir);
    for (const file of walkFiles(absDir, exts)) {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(pattern);
      if (matches) total += matches.length;
    }
  }
  return total;
}

function fileContains(relPath: string, str: string): boolean {
  const absPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(absPath)) return false;
  return fs.readFileSync(absPath, 'utf-8').includes(str);
}

// Legacy theme-class pattern — matches the 4 prefix families.
const THEME_CLASS_PATTERN = /\b(bg|text|shadow|ring)-theme-/g;

// CSS selector pattern for globals.css: a line that starts with a period followed by the prefix.
const THEME_CSS_SELECTOR_PATTERN = /^\.(bg|text|shadow|ring)-theme-/m;

// ─── Given steps ─────────────────────────────────────────────────────────────

Given('the project is at the current commit', function (this: CustomWorld) {
  // No-op: just confirms we're checking the live working tree.
  this._projectRoot = process.cwd();
});

// ─── When steps ──────────────────────────────────────────────────────────────

When(
  'a pattern search for theme CSS selectors runs against {string}',
  function (this: CustomWorld, relPath: string) {
    const absPath = path.join(process.cwd(), relPath);
    const content = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf-8') : '';
    this._matchCount = content.match(/\.(bg|text|shadow|ring)-theme-/g)?.length ?? 0;
  }
);

When(
  'a theme-class pattern search runs across {string} and {string} directories',
  function (this: CustomWorld, dir1: string, dir2: string) {
    this._matchCount = countMatchesInFiles([dir1, dir2], THEME_CLASS_PATTERN);
  }
);

When(
  'I navigate to {string} and monitor for console errors',
  async function (this: CustomWorld, routePath: string) {
    this._consoleErrors = [];
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this._consoleErrors.push(msg.text());
      }
    });
    await this.page.goto(`${BASE_URL}${routePath}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90_000,
    });
  }
);

// ─── Then steps — filesystem ──────────────────────────────────────────────────

Then('zero theme-pattern matches are found', function (this: CustomWorld) {
  assert.strictEqual(
    this._matchCount,
    0,
    `Expected zero theme-class matches but found ${this._matchCount}`
  );
});

Then(
  'the source file {string} does not exist',
  function (this: CustomWorld, relPath: string) {
    const absPath = path.join(process.cwd(), relPath);
    assert.strictEqual(
      fs.existsSync(absPath),
      false,
      `Expected ${relPath} to be deleted but it still exists`
    );
  }
);

Then(
  '{string} does not contain the string {string}',
  function (this: CustomWorld, relPath: string, searchStr: string) {
    assert.strictEqual(
      fileContains(relPath, searchStr),
      false,
      `Expected ${relPath} to not contain "${searchStr}" but it does`
    );
  }
);

Then(
  'no file in {string} or {string} imports from {string}',
  function (this: CustomWorld, dir1: string, dir2: string, importPath: string) {
    const count = countMatchesInFiles(
      [dir1, dir2],
      new RegExp(`from ['"]${importPath.replace(/\//g, '\\/')}['"]`, 'g'),
      ['.ts', '.tsx']
    );
    assert.strictEqual(count, 0, `Expected zero imports from "${importPath}" but found ${count}`);
  }
);

// ─── Then steps — Playwright E2E ─────────────────────────────────────────────

Then(
  'the page renders without uncaught console errors',
  function (this: CustomWorld) {
    const errors: string[] = (this._consoleErrors || []).filter(
      (e: string) => !IGNORABLE_CONSOLE_PATTERNS.some((p) => e.includes(p))
    );
    assert.strictEqual(
      errors.length,
      0,
      `Unexpected console errors on page load:\n${errors.join('\n')}`
    );
  }
);

Then(
  'no element with a data-testid starting with {string} is present in the DOM',
  async function (this: CustomWorld, prefix: string) {
    const count = await this.page.evaluate((attrPrefix: string) => {
      return document.querySelectorAll(`[data-testid^="${attrPrefix}"]`).length;
    }, prefix);
    assert.strictEqual(
      count,
      0,
      `Expected no elements with data-testid starting with "${prefix}" but found ${count}`
    );
  }
);

Then(
  'no element has a class matching the legacy theme-class patterns',
  async function (this: CustomWorld) {
    const count = await this.page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('[class]'));
      return allElements.filter((el) => {
        const cls = el.getAttribute('class') || '';
        return /(^|\s)(bg|text|shadow|ring)-theme-/.test(cls);
      }).length;
    });
    assert.strictEqual(
      count,
      0,
      `Expected no elements with legacy theme classes but found ${count}`
    );
  }
);

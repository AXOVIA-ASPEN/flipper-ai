/**
 * @file test/acceptance/step_definitions/E-014-settings-polish.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 2.0
 * @brief Step definitions for Story 14.8 — Settings & Component-Level Polish.
 *
 * @description
 * Covers Cucumber scenarios @E-014-S-68 through @E-014-S-87. Splits into:
 *   - Source-level regression guards (S-68, S-72, S-73, S-74, S-76, S-77): fast
 *     code-level checks that catch palette regressions / file deletions / token
 *     wraps in CI without a browser. These are guards, NOT AC validators.
 *   - Genuine Playwright E2E journeys (S-79, S-80, S-81, S-82, S-83, S-84,
 *     S-85, S-86, S-87): real navigations to /settings tabs and /messages,
 *     mock API responses via Playwright route interception, assert computed
 *     CSS, ARIA contracts, axe-core results, and modal focus-trap behavior.
 *
 * The existing reusable source-read steps from E-014-shared-ui-state.steps.ts,
 * E-014-price-calculator.steps.ts, and E-002-settings.steps.ts are inherited
 * via Cucumber's global step registry. The "Given I am logged in" step lives
 * in E-002-auth-access.steps.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'assert';
import { CustomWorld } from '../support/world';

setDefaultTimeout(120 * 1000);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3200';

const STORY_14_8_FILES = [
  'src/components/NotificationSettings.tsx',
  'src/components/BillingSettings.tsx',
  'src/components/IntegrationsSettings.tsx',
  'src/components/MessagingSettings.tsx',
  'src/components/ScoringSettings.tsx',
  'src/components/LogisticsSettings.tsx',
  'src/components/UsageDisplay.tsx',
  'src/components/MeetingModal.tsx',
  'src/components/MeetingRouteCard.tsx',
  'src/components/ResaleContentEditor.tsx',
  'src/components/ApprovalQueue.tsx',
  'src/components/MessageApprovalCard.tsx',
  'src/components/UpgradePrompt.tsx',
  'src/components/posting-queue/CrossPostModal.tsx',
  'src/components/FilterPanel.tsx',
  'src/components/posting-queue/QueueItemCard.tsx',
];

const TOGGLE_SETTINGS_FILES = [
  'src/components/NotificationSettings.tsx',
  'src/components/MessagingSettings.tsx',
];

const PALETTE_RE =
  /\b(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|fuchsia|pink|rose|emerald|amber|yellow|red|orange|green)-\d+\b/g;
const LIGHT_MODE_RE = /\bbg-(white|gray-\d+)\b/g;
const CLASSNAME_RE = /className\s*=\s*(?:\{[^}]*\}|"[^"]*"|'[^']*'|`[^`]*`)/g;

interface ScanResult {
  paletteCount: number;
  lightCount: number;
  perFile: Record<string, { palette: number; light: number }>;
}

function readFile(relPath: string): string {
  const fullPath = path.resolve(process.cwd(), relPath);
  return fs.readFileSync(fullPath, 'utf-8');
}

function extractClassNameStrings(content: string): string[] {
  const out: string[] = [];
  const matches = content.match(CLASSNAME_RE);
  if (matches) out.push(...matches);
  return out;
}

function countMatchesInClassNames(content: string, regex: RegExp): number {
  let total = 0;
  for (const cn of extractClassNameStrings(content)) {
    const localRe = new RegExp(regex.source, regex.flags);
    const matches = cn.match(localRe);
    if (matches) total += matches.length;
  }
  return total;
}

// ─── Story 14.8 source-scan steps ─────────────────────────────────────────────

When(
  'I scan the Story 14.8 component scope for palette and light-mode className tokens',
  function (this: CustomWorld) {
    const result: ScanResult = { paletteCount: 0, lightCount: 0, perFile: {} };
    for (const relPath of STORY_14_8_FILES) {
      const content = readFile(relPath);
      const palette = countMatchesInClassNames(content, PALETTE_RE);
      const light = countMatchesInClassNames(content, LIGHT_MODE_RE);
      result.paletteCount += palette;
      result.lightCount += light;
      result.perFile[relPath] = { palette, light };
    }
    this.testData.story148Scan = result;
  }
);

Then('the palette token count should be {int}', function (this: CustomWorld, expected: number) {
  const scan = this.testData.story148Scan as ScanResult | undefined;
  assert.ok(scan, 'Expected story148Scan to be populated by a prior When step');
  if (scan.paletteCount !== expected) {
    const offenders = Object.entries(scan.perFile)
      .filter(([, v]) => v.palette > 0)
      .map(([f, v]) => `  - ${f}: ${v.palette} palette`)
      .join('\n');
    assert.fail(
      `Expected palette count ${expected} but got ${scan.paletteCount}\nOffenders:\n${offenders}`
    );
  }
});

Then('the light-mode token count should be {int}', function (this: CustomWorld, expected: number) {
  const scan = this.testData.story148Scan as ScanResult | undefined;
  assert.ok(scan, 'Expected story148Scan to be populated by a prior When step');
  if (scan.lightCount !== expected) {
    const offenders = Object.entries(scan.perFile)
      .filter(([, v]) => v.light > 0)
      .map(([f, v]) => `  - ${f}: ${v.light} light-mode`)
      .join('\n');
    assert.fail(
      `Expected light-mode count ${expected} but got ${scan.lightCount}\nOffenders:\n${offenders}`
    );
  }
});

When(
  'I scan the Story 14.8 component scope for canonical glass surfaces',
  function (this: CustomWorld) {
    const missing: string[] = [];
    for (const relPath of STORY_14_8_FILES) {
      const content = readFile(relPath);
      if (!/fp-glass(-sm)?|fp-glow-card/.test(content)) {
        missing.push(relPath);
      }
    }
    this.testData.story148GlassMissing = missing;
  }
);

Then(
  'every component contains at least one of fp-glass, fp-glass-sm, or fp-glow-card',
  function (this: CustomWorld) {
    const missing = (this.testData.story148GlassMissing as string[] | undefined) ?? [];
    assert.deepStrictEqual(
      missing,
      [],
      `Components missing canonical glass surfaces:\n${missing.join('\n')}`
    );
  }
);

When(
  'I scan the toggle-bearing settings files for the canonical purple active token',
  function (this: CustomWorld) {
    const missingPurple: string[] = [];
    const missingTransition: string[] = [];
    for (const relPath of TOGGLE_SETTINGS_FILES) {
      const content = readFile(relPath);
      if (!content.includes('#7c3aed')) missingPurple.push(relPath);
      if (!content.includes("transition: 'background-color 150ms ease'")) {
        missingTransition.push(relPath);
      }
    }
    this.testData.toggleScan = { missingPurple, missingTransition };
  }
);

Then(
  'every toggle-bearing settings file contains {string} at least once',
  function (this: CustomWorld, token: string) {
    const scan = this.testData.toggleScan as
      | { missingPurple: string[]; missingTransition: string[] }
      | undefined;
    assert.ok(scan, 'Expected toggleScan to be populated by a prior When step');
    if (token === '#7c3aed') {
      assert.deepStrictEqual(
        scan.missingPurple,
        [],
        `Toggle files missing #7c3aed: ${scan.missingPurple.join(', ')}`
      );
    } else if (token === "transition: 'background-color 150ms ease'") {
      assert.deepStrictEqual(
        scan.missingTransition,
        [],
        `Toggle files missing canonical transition: ${scan.missingTransition.join(', ')}`
      );
    } else {
      assert.fail(`Unrecognized toggle token: ${token}`);
    }
  }
);

When(
  'I scan the toggle-bearing settings files for switch ARIA contracts',
  function (this: CustomWorld) {
    const missingRole: string[] = [];
    const missingChecked: string[] = [];
    for (const relPath of TOGGLE_SETTINGS_FILES) {
      const content = readFile(relPath);
      if (!content.includes('role="switch"')) missingRole.push(relPath);
      if (!/aria-checked/.test(content)) missingChecked.push(relPath);
    }
    this.testData.toggleAriaScan = { missingRole, missingChecked };
  }
);

Then(
  'every toggle-bearing settings file contains role="switch" and aria-checked at least once',
  function (this: CustomWorld) {
    const scan = this.testData.toggleAriaScan as
      | { missingRole: string[]; missingChecked: string[] }
      | undefined;
    assert.ok(scan, 'Expected toggleAriaScan to be populated by a prior When step');
    assert.deepStrictEqual(
      scan.missingRole,
      [],
      `Toggle files missing role="switch": ${scan.missingRole.join(', ')}`
    );
    assert.deepStrictEqual(
      scan.missingChecked,
      [],
      `Toggle files missing aria-checked: ${scan.missingChecked.join(', ')}`
    );
  }
);

// Note: `the source file {string} does not exist` is owned by
// E-014-remove-multi-theme.steps.ts — reused here, no duplicate registration.

// ─── Genuine Playwright E2E steps (S-79 onwards) ─────────────────────────────

Given(
  'the {string} settings endpoint returns a mocked response',
  async function (this: CustomWorld, endpoint: string) {
    await this.page.route(`**${endpoint}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      });
    });
  }
);

Given(
  'the invoices endpoint returns a single paid invoice',
  async function (this: CustomWorld) {
    await this.page.route('**/api/invoices', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'in_test_1',
              number: 'INV-001',
              createdAt: Math.floor(Date.now() / 1000),
              amount: 4900,
              currency: 'usd',
              status: 'paid',
              hostedInvoiceUrl: 'https://stripe.example/invoice/1',
              invoicePdfUrl: 'https://stripe.example/invoice/1.pdf',
            },
          ],
        }),
      });
    });
  }
);

Given(
  'the invoices endpoint returns no invoices',
  async function (this: CustomWorld) {
    await this.page.route('**/api/invoices', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
  }
);

Given(
  'the messages approval endpoint returns no pending approvals',
  async function (this: CustomWorld) {
    await this.page.route('**/api/messages?**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], pagination: { total: 0 } }),
      });
    });
  }
);

Given(
  'the messages approval endpoint returns a 500 error',
  async function (this: CustomWorld) {
    await this.page.route('**/api/messages?**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { detail: 'Internal Server Error' } }),
      });
    });
  }
);

Then(
  'the page contains at least one element with class {string}',
  async function (this: CustomWorld, className: string) {
    const locator = this.page.locator(`.${className}`);
    // Wait for first match to attach (handles client-render + async-data hydration).
    // If still zero after the wait window, fail with the canonical message.
    try {
      await locator.first().waitFor({ state: 'attached', timeout: 10000 });
    } catch {
      // Fall through to count-based assertion below for the canonical error.
    }
    const count = await locator.count();
    expect(count, `expected ≥1 .${className} on ${this.page.url()}, found ${count}`).toBeGreaterThan(0);
  }
);

Then(
  'the page does NOT contain any element with class {string}',
  async function (this: CustomWorld, className: string) {
    const locator = this.page.locator(`.${className}`);
    const count = await locator.count();
    expect(count, `expected zero .${className} on ${this.page.url()}, found ${count}`).toBe(0);
  }
);

Then(
  'the element {string} has computed background-color {string}',
  async function (this: CustomWorld, selector: string, expected: string) {
    const el = this.page.locator(selector).first();
    await el.waitFor({ state: 'attached', timeout: 15000 });
    const actual = await el.evaluate((node) => window.getComputedStyle(node).backgroundColor);
    expect(actual, `${selector} background-color`).toBe(expected);
  }
);

Then(
  'the element with role {string} and accessible name matching {string} has aria-checked {string}',
  async function (this: CustomWorld, role: string, namePattern: string, expected: string) {
    const el = this.page.getByRole(role as 'switch', { name: new RegExp(namePattern, 'i') });
    await expect(el.first()).toHaveAttribute('aria-checked', expected, { timeout: 15000 });
  }
);

Then(
  'the page passes axe-core scoped to {string} with zero critical and serious violations',
  async function (this: CustomWorld, selector: string) {
    await this.page.locator(selector).first().waitFor({ state: 'attached', timeout: 15000 });
    const results = await new AxeBuilder({ page: this.page })
      .include(selector)
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (blocking.length > 0) {
      // Make the failure surface the actual violation list — Playwright's
      // expect(...).toBe() drops the second-arg label, so we throw explicitly.
      const detail = blocking
        .map((v) => `  [${v.impact}] ${v.id}: ${v.description}\n    nodes: ${v.nodes.map((n) => n.target.join(', ')).join(' | ')}`)
        .join('\n');
      throw new Error(
        `axe-core found ${blocking.length} critical/serious violation(s) inside ${selector}:\n${detail}`
      );
    }
    expect(blocking.length).toBe(0);
  }
);

When(
  'I press Tab {int} times',
  async function (this: CustomWorld, n: number) {
    for (let i = 0; i < n; i += 1) {
      await this.page.keyboard.press('Tab');
    }
  }
);

When('I press Escape', async function (this: CustomWorld) {
  await this.page.keyboard.press('Escape');
});

Then(
  'focus is inside the element {string}',
  async function (this: CustomWorld, selector: string) {
    const inside = await this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const active = document.activeElement;
      return el && active ? el.contains(active) : false;
    }, selector);
    expect(inside, `expected focus to be inside ${selector}, but it is not`).toBe(true);
  }
);

Then(
  'the data-testid {string} is visible on the page',
  async function (this: CustomWorld, testId: string) {
    const el = this.page.locator(`[data-testid="${testId}"]`);
    await expect(el.first()).toBeVisible({ timeout: 15000 });
  }
);

/**
 * @file test/acceptance/step_definitions/E-014-onboarding-dark-migration.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Step definitions for Story 14.5 — Onboarding Wizard Dark Migration.
 *
 * @description
 * Covers scenarios E-014-S-51 through E-014-S-57. Real Playwright E2E journeys
 * navigate to /onboarding (authenticated via the shared "Given I am logged in"
 * cookie fixture from E-002-auth-access.steps.ts) and assert on computed
 * styles, class lists, and filesystem palette counts. The filesystem grep
 * uses a local walkFiles helper (no child-process dependency) covering the
 * src/components/Onboarding and app/onboarding directories.
 */

import { When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { CustomWorld } from '../support/world';

setDefaultTimeout(120 * 1000);

// ─── Filesystem helpers ───────────────────────────────────────────────────────

const TS_EXTS = ['.ts', '.tsx'];

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

// Matches the Tailwind palette classes banned by Story 14.5 AC #5.
// Intentionally includes `gray` — the epics.md AC omits it but the story
// DoD expands the pattern to catch text-gray-* / border-gray-* too.
const BANNED_PALETTE_PATTERN =
  /(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|pink|rose|emerald|amber|yellow|red|orange|gray)-\d/g;
const BANNED_BG_PATTERN = /bg-(white|gray-\d)/g;
const BANNED_BORDER_GRAY_PATTERN = /border-gray-\d/g;

// ─── Navigation helpers ───────────────────────────────────────────────────────

// The load step is borrowed from Story 14.1's step-defs file via the shared
// `When I load the {string} route in the browser` phrasing — reused here.
//
// The reusable Continue/Back/option interactions are unique to the wizard and
// defined locally to keep the onboarding vocabulary isolated from other stories.

async function clickOnboardingContinue(page: CustomWorld['page']): Promise<void> {
  const continueBtn = page.locator('button.fp-btn-primary').first();
  await continueBtn.click({ timeout: 10_000 });
  // Give React a tick to re-render the next step
  await page.waitForTimeout(200);
}

// ─── Wrapper-class assertions ─────────────────────────────────────────────────

Then(
  'the onboarding page wrapper has no class containing {string} or {string} or {string} or {string}',
  async function (this: CustomWorld, a: string, b: string, c: string, d: string) {
    const banned = [a, b, c, d];
    const offending = await this.page.evaluate((patterns: string[]) => {
      const wrappers = Array.from(document.querySelectorAll('.min-h-screen'));
      for (const el of wrappers) {
        const cls = el.getAttribute('class') || '';
        for (const p of patterns) {
          if (cls.includes(p)) return { class: cls, matched: p };
        }
      }
      return null;
    }, banned);
    assert.strictEqual(
      offending,
      null,
      `Expected no .min-h-screen wrapper with a class matching any of [${banned.join(
        ', '
      )}] but found one: ${JSON.stringify(offending)}`
    );
  }
);

// ─── Progress bar assertions ─────────────────────────────────────────────────

Then(
  'the onboarding progress bar container has the class {string}',
  async function (this: CustomWorld, className: string) {
    const has = await this.page.evaluate((cls: string) => {
      const el = document.querySelector('[role="progressbar"]');
      return !!el && el.classList.contains(cls);
    }, className);
    assert.strictEqual(
      has,
      true,
      `Expected progressbar element to have class "${className}" but it did not`
    );
  }
);

Then(
  'the onboarding progress fill element has the class {string}',
  async function (this: CustomWorld, className: string) {
    const has = await this.page.evaluate((cls: string) => {
      const track = document.querySelector('[role="progressbar"]');
      const fill = track?.querySelector(':scope > *');
      return !!fill && fill.classList.contains(cls);
    }, className);
    assert.strictEqual(
      has,
      true,
      `Expected progress fill element to have class "${className}" but it did not`
    );
  }
);

Then(
  'the onboarding progress fill computed background includes {string}',
  async function (this: CustomWorld, expected: string) {
    const bg = await this.page.evaluate(() => {
      const track = document.querySelector('[role="progressbar"]');
      const fill = track?.querySelector(':scope > *');
      if (!fill) return null;
      const style = window.getComputedStyle(fill as Element);
      // `backgroundImage` carries the gradient when `background` shorthand sets one.
      return style.backgroundImage || style.background;
    });
    assert.ok(
      typeof bg === 'string' && bg.includes(expected),
      `Expected progress fill background to include "${expected}" but got "${bg}"`
    );
  }
);

// ─── Button class assertions ─────────────────────────────────────────────────

Then(
  'the onboarding Continue button has the class {string}',
  async function (this: CustomWorld, className: string) {
    const has = await this.page.evaluate((cls: string) => {
      const btn = document.querySelector('button.' + cls);
      return !!btn && (btn.textContent || '').toLowerCase().includes('continue');
    }, className);
    assert.strictEqual(
      has,
      true,
      `Expected a Continue button with class "${className}" but did not find one`
    );
  }
);

Then(
  'the onboarding Back button has the class {string}',
  async function (this: CustomWorld, className: string) {
    const has = await this.page.evaluate((cls: string) => {
      const buttons = Array.from(document.querySelectorAll('button.' + cls));
      return buttons.some((b) => (b.textContent || '').toLowerCase().includes('back'));
    }, className);
    assert.strictEqual(
      has,
      true,
      `Expected a Back button with class "${className}" but did not find one`
    );
  }
);

Then(
  'the onboarding {string} button has the class {string}',
  async function (this: CustomWorld, buttonText: string, className: string) {
    const has = await this.page.evaluate(
      ([text, cls]: string[]) => {
        const buttons = Array.from(document.querySelectorAll('button.' + cls));
        return buttons.some((b) =>
          (b.textContent || '').toLowerCase().includes(text.toLowerCase())
        );
      },
      [buttonText, className]
    );
    assert.strictEqual(
      has,
      true,
      `Expected a "${buttonText}" button with class "${className}" but did not find one`
    );
  }
);

// ─── Navigation actions ─────────────────────────────────────────────────────

When(
  'I click the onboarding Continue button to advance to step {int}',
  async function (this: CustomWorld, targetStep: number) {
    await clickOnboardingContinue(this.page);
    // Verify the progress bar actually advanced
    const currentStep = await this.page.evaluate(() => {
      const span = Array.from(document.querySelectorAll('span')).find((el) =>
        /Step \d+ of \d+/i.test(el.textContent || '')
      );
      if (!span) return null;
      const match = (span.textContent || '').match(/Step (\d+) of/i);
      return match ? parseInt(match[1], 10) : null;
    });
    assert.strictEqual(
      currentStep,
      targetStep,
      `Expected to be on step ${targetStep} but current step is ${currentStep}`
    );

    // Track that this step's wrapper was canonical (used by S-57).
    if (!this.testData.onboardingStepsSeen) {
      this.testData.onboardingStepsSeen = [];
    }
    const wrapperClass = await this.page.evaluate(() => {
      const el = document.querySelector('.min-h-screen');
      return el ? el.getAttribute('class') || '' : '';
    });
    this.testData.onboardingStepsSeen.push({
      step: targetStep,
      wrapperClass,
    });
  }
);

When(
  'I select the onboarding marketplace option {string}',
  async function (this: CustomWorld, label: string) {
    // Click the <label> whose text contains the marketplace name.
    const clicked = await this.page.evaluate((text: string) => {
      const labels = Array.from(document.querySelectorAll('label'));
      const target = labels.find((l) => (l.textContent || '').includes(text));
      if (!target) return false;
      (target as HTMLElement).click();
      return true;
    }, label);
    assert.strictEqual(clicked, true, `Could not locate marketplace option "${label}"`);
    await this.page.waitForTimeout(150);
  }
);

// ─── Selection-card computed-style assertions ───────────────────────────────

Then(
  'the selected marketplace card has a computed border color containing {string}',
  async function (this: CustomWorld, expected: string) {
    const border = await this.page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const selected = labels.find((l) => !!l.querySelector('input:checked'));
      if (!selected) return null;
      const style = window.getComputedStyle(selected);
      return (
        style.borderColor ||
        style.borderTopColor ||
        style.borderLeftColor ||
        ''
      );
    });
    assert.ok(
      typeof border === 'string' && border.includes(expected),
      `Expected selected marketplace card border to include "${expected}" but got "${border}"`
    );
  }
);

Then(
  'the selected marketplace card has a computed background color containing {string}',
  async function (this: CustomWorld, expected: string) {
    const bg = await this.page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const selected = labels.find((l) => !!l.querySelector('input:checked'));
      if (!selected) return null;
      const style = window.getComputedStyle(selected);
      // The inline style sets `background` shorthand which maps to backgroundColor.
      return style.backgroundColor || style.background || '';
    });
    assert.ok(
      typeof bg === 'string' && bg.includes(expected),
      `Expected selected marketplace card background to include "${expected}" but got "${bg}"`
    );
  }
);

Then(
  'no onboarding marketplace card has a class containing {string} or {string}',
  async function (this: CustomWorld, bad1: string, bad2: string) {
    const offenders = await this.page.evaluate(
      ([a, b]: string[]) => {
        const labels = Array.from(document.querySelectorAll('label'));
        return labels
          .map((l) => l.getAttribute('class') || '')
          .filter((cls) => cls.includes(a) || cls.includes(b));
      },
      [bad1, bad2]
    );
    assert.strictEqual(
      offenders.length,
      0,
      `Expected no marketplace card class to include "${bad1}" or "${bad2}" but found: ${JSON.stringify(
        offenders
      )}`
    );
  }
);

// ─── ZIP input assertions ───────────────────────────────────────────────────

Then(
  'the onboarding ZIP input has the class {string}',
  async function (this: CustomWorld, className: string) {
    const has = await this.page.evaluate((cls: string) => {
      const input = document.querySelector('#zip-code');
      return !!input && input.classList.contains(cls);
    }, className);
    assert.strictEqual(
      has,
      true,
      `Expected #zip-code to have class "${className}" but it did not`
    );
  }
);

When('I focus the onboarding ZIP input', async function (this: CustomWorld) {
  await this.page.locator('#zip-code').focus();
  await this.page.waitForTimeout(100);
});

Then(
  'the onboarding ZIP input has a computed border color containing {string}',
  async function (this: CustomWorld, expected: string) {
    const border = await this.page.evaluate(() => {
      const input = document.querySelector('#zip-code');
      if (!input) return null;
      const style = window.getComputedStyle(input as Element);
      return (
        style.borderColor ||
        style.borderTopColor ||
        style.boxShadow ||
        ''
      );
    });
    assert.ok(
      typeof border === 'string' && border.includes(expected),
      `Expected #zip-code focus border to include "${expected}" but got "${border}"`
    );
  }
);

// ─── Palette counters (filesystem) ──────────────────────────────────────────

const ONBOARDING_DIRS = ['src/components/Onboarding', 'app/onboarding'];

When(
  'I count banned palette matches across the onboarding folder files',
  function (this: CustomWorld) {
    const a = countMatchesInFiles(ONBOARDING_DIRS, BANNED_PALETTE_PATTERN);
    const b = countMatchesInFiles(ONBOARDING_DIRS, BANNED_BG_PATTERN);
    const c = countMatchesInFiles(['src/components/Onboarding'], BANNED_BORDER_GRAY_PATTERN);
    this.testData.onboardingPaletteCount = a + b + c;
  }
);

Then('the count of onboarding palette matches is zero', function (this: CustomWorld) {
  const total = this.testData.onboardingPaletteCount as number;
  assert.strictEqual(
    total,
    0,
    `Expected zero palette matches across onboarding folders but found ${total}`
  );
});

// ─── Full-journey assertion ──────────────────────────────────────────────────

Then(
  'every captured onboarding step had a wrapper without the class {string}',
  function (this: CustomWorld, bannedClass: string) {
    const seen = (this.testData.onboardingStepsSeen || []) as Array<{
      step: number;
      wrapperClass: string;
    }>;
    assert.ok(seen.length > 0, 'No onboarding steps were captured during navigation');
    const offending = seen.filter(({ wrapperClass }) => wrapperClass.includes(bannedClass));
    assert.strictEqual(
      offending.length,
      0,
      `Expected no step wrapper to contain "${bannedClass}" but found: ${JSON.stringify(
        offending
      )}`
    );
  }
);

// Re-export helpers for parity with sibling E-014 files (no-op at runtime).
export { countMatchesInFiles, walkFiles };

// `Given I am logged in` is provided by E-002-auth-access.steps.ts.
// `When I load the {string} route in the browser` is provided by
// E-014-frontend-design-migration.steps.ts.

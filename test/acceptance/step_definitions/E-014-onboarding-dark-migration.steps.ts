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

import { When, Then, Before, setDefaultTimeout } from '@cucumber/cucumber';
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
// That step waits only for `domcontentloaded`, so the onboarding page's async
// fetch of /api/user/onboarding hasn't resolved and the wizard hasn't mounted
// yet. Every DOM-query step below awaits `waitForOnboardingWizard` first so
// the assertion never races the React mount.
//
// The reusable Continue/Back/option interactions are unique to the wizard and
// defined locally to keep the onboarding vocabulary isolated from other stories.

async function waitForOnboardingWizard(page: CustomWorld['page']): Promise<void> {
  // The wizard's glass card is the canonical readiness sentinel. The loading
  // screen has no .fp-glass, so this selector only matches once the initial
  // API fetch has settled and WizardLayout has mounted.
  await page.waitForSelector('.fp-glass button.fp-btn-primary', { timeout: 20_000 });
}

// Reset onboarding state before every Story 14.5 scenario so the shared test
// user lands on step 1 even if a prior run completed onboarding. Without this,
// app/onboarding/page.tsx redirects to "/" and the wizard selector times out.
// Runs before `Given I am logged in` (which sets the session cookie), so we
// reset via Prisma directly rather than the authenticated API route.
Before({ tags: '@story-14-5' }, async function (this: CustomWorld) {
  try {
    await this.db.user.updateMany({
      where: { firebaseUid: 'test-user-id' },
      data: { onboardingComplete: false, onboardingStep: 0 },
    });
  } catch {
    // If the test user doesn't exist yet, the navigation step will surface a
    // clearer failure than this hook should swallow.
  }
});

async function clickOnboardingContinue(page: CustomWorld['page']): Promise<void> {
  await waitForOnboardingWizard(page);
  const continueBtn = page.locator('button.fp-btn-primary').first();
  await continueBtn.click({ timeout: 10_000 });
  // Give React a tick to re-render the next step
  await page.waitForTimeout(300);
}

// ─── Purple-color tolerance helper ────────────────────────────────────────────

// Computed rgba values drift slightly from the declared CSS color values
// — headless Chrome applies color-space conversion and (for class-based focus
// rules) compositing. We parse the expected "R, G, B" triple from the Gherkin
// step (so the assertion stays parameterized) and match on a ±tolerance window.
function parseRgbTriple(triple: string): { r: number; g: number; b: number } | null {
  const match = triple.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
  };
}

function matchesRgbTripleWithTolerance(colorString: string, expected: string): boolean {
  const target = parseRgbTriple(expected);
  if (!target) return false;
  const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return false;
  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);
  return (
    Math.abs(r - target.r) <= 15 &&
    Math.abs(g - target.g) <= 20 &&
    Math.abs(b - target.b) <= 10
  );
}

// ─── Wrapper-class assertions ─────────────────────────────────────────────────

Then(
  'the onboarding page wrapper has no class containing {string} or {string} or {string} or {string}',
  async function (this: CustomWorld, a: string, b: string, c: string, d: string) {
    await waitForOnboardingWizard(this.page);
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
    await waitForOnboardingWizard(this.page);
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
    await waitForOnboardingWizard(this.page);
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
    await waitForOnboardingWizard(this.page);
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
    await waitForOnboardingWizard(this.page);
    const has = await this.page.evaluate((cls: string) => {
      const buttons = Array.from(document.querySelectorAll('button.' + cls));
      return buttons.some((b) => (b.textContent || '').toLowerCase().includes('continue'));
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
    await waitForOnboardingWizard(this.page);
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
    await waitForOnboardingWizard(this.page);
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
    await waitForOnboardingWizard(this.page);
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
    const captured = await this.page.evaluate(() => {
      const wrapperEl = document.querySelector('.min-h-screen');
      const continueBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        /(continue|finish setup|go to dashboard)/i.test(b.textContent || '')
      );
      return {
        wrapperClass: wrapperEl ? wrapperEl.getAttribute('class') || '' : '',
        continueBtnClass: continueBtn ? continueBtn.getAttribute('class') || '' : '',
      };
    });
    this.testData.onboardingStepsSeen.push({
      step: targetStep,
      wrapperClass: captured.wrapperClass,
      continueBtnClass: captured.continueBtnClass,
    });
  }
);

When(
  'I select the onboarding marketplace option {string}',
  async function (this: CustomWorld, label: string) {
    await waitForOnboardingWizard(this.page);
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
    await waitForOnboardingWizard(this.page);
    const border = await this.page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.space-y-3 label'));
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
      typeof border === 'string' && matchesRgbTripleWithTolerance(border, expected),
      `Expected selected marketplace card border to match "${expected}" (±tolerance) but got "${border}"`
    );
  }
);

Then(
  'the selected marketplace card has a computed background color containing {string}',
  async function (this: CustomWorld, expected: string) {
    await waitForOnboardingWizard(this.page);
    const bg = await this.page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.space-y-3 label'));
      const selected = labels.find((l) => !!l.querySelector('input:checked'));
      if (!selected) return null;
      const style = window.getComputedStyle(selected);
      // The inline style sets `background` shorthand which maps to backgroundColor.
      return style.backgroundColor || style.background || '';
    });
    assert.ok(
      typeof bg === 'string' && matchesRgbTripleWithTolerance(bg, expected),
      `Expected selected marketplace card background to match "${expected}" (±tolerance) but got "${bg}"`
    );
  }
);

Then(
  'no onboarding marketplace card has a class containing {string} or {string}',
  async function (this: CustomWorld, bad1: string, bad2: string) {
    await waitForOnboardingWizard(this.page);
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
    await waitForOnboardingWizard(this.page);
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
      // Check borderColor first; fall back to box-shadow which carries the
      // 3px purple focus ring when :focus is active.
      return (
        style.borderColor ||
        style.borderTopColor ||
        style.boxShadow ||
        ''
      );
    });
    assert.ok(
      typeof border === 'string' && matchesRgbTripleWithTolerance(border, expected),
      `Expected #zip-code focus border to match "${expected}" (±tolerance) but got "${border}"`
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

// ─── Full-journey assertions ─────────────────────────────────────────────────

type CapturedStep = {
  step: number;
  wrapperClass: string;
  continueBtnClass: string;
};

Then(
  'every captured onboarding step had a wrapper without the class {string}',
  function (this: CustomWorld, bannedClass: string) {
    const seen = (this.testData.onboardingStepsSeen || []) as CapturedStep[];
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

// AC #6(a): the AC bans every `bg-gradient-*` variant on the outermost
// wrapper, not just the legacy `bg-gradient-to-br`. Use a single broad-prefix
// step so a future regression to `bg-gradient-to-r` (or any direction) fails.
Then(
  'every captured onboarding step had a wrapper without any {string} class',
  function (this: CustomWorld, bannedPrefix: string) {
    const seen = (this.testData.onboardingStepsSeen || []) as CapturedStep[];
    assert.ok(seen.length > 0, 'No onboarding steps were captured during navigation');
    const pattern = new RegExp(`(^|\\s)${bannedPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[A-Za-z0-9-]*`);
    const offending = seen.filter(({ wrapperClass }) => pattern.test(wrapperClass));
    assert.strictEqual(
      offending.length,
      0,
      `Expected no step wrapper to contain a class starting with "${bannedPrefix}" but found: ${JSON.stringify(
        offending
      )}`
    );
  }
);

// AC #6(c): every Continue button across the full journey must carry
// fp-btn-primary — verifying once on step 1 (S-53) does not satisfy the AC.
Then(
  'every captured onboarding Continue button had the class {string}',
  function (this: CustomWorld, expectedClass: string) {
    const seen = (this.testData.onboardingStepsSeen || []) as CapturedStep[];
    assert.ok(seen.length > 0, 'No onboarding steps were captured during navigation');
    const offending = seen.filter(
      ({ continueBtnClass }) => !continueBtnClass.split(/\s+/).includes(expectedClass)
    );
    assert.strictEqual(
      offending.length,
      0,
      `Expected every captured Continue button to have class "${expectedClass}" but found: ${JSON.stringify(
        offending
      )}`
    );
  }
);

// AC #6(e): the journey must end at the dashboard. Click the StepComplete CTA
// and verify the URL pathname becomes "/".
When('I click the onboarding {string} button', async function (this: CustomWorld, label: string) {
  await waitForOnboardingWizard(this.page);
  // Use Playwright's locator click (not page.evaluate's .click()) so the
  // click is awaited as a real user interaction and the test stays paused
  // until Next.js client-side navigation finishes.
  const button = this.page.locator('button', { hasText: label }).first();
  await button.waitFor({ state: 'visible', timeout: 10_000 });
  await Promise.all([
    this.page
      .waitForURL((url) => !url.pathname.startsWith('/onboarding'), { timeout: 15_000 })
      .catch(() => undefined),
    button.click({ timeout: 10_000 }),
  ]);
});

Then('the browser URL pathname is {string}', async function (this: CustomWorld, expected: string) {
  const url = new URL(this.page.url());
  assert.strictEqual(
    url.pathname,
    expected,
    `Expected URL pathname "${expected}" but got "${url.pathname}" (full url: ${this.page.url()})`
  );
});

// Re-export helpers for parity with sibling E-014 files (no-op at runtime).
export { countMatchesInFiles, walkFiles };

// `Given I am logged in` is provided by E-002-auth-access.steps.ts.
// `When I load the {string} route in the browser` is provided by
// E-014-frontend-design-migration.steps.ts.

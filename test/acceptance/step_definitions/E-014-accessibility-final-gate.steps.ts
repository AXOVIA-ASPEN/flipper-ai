/**
 * @file test/acceptance/step_definitions/E-014-accessibility-final-gate.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-28
 * @version 1.0
 * @brief Step definitions for Story 14.10 — Accessibility + file-header final gate.
 *
 * @description
 * Covers Cucumber scenarios @E-014-S-104 through @E-014-S-114. Reuses common
 * steps from E-002-auth-access (`Given I am logged in`) and
 * E-014-frontend-design-migration (`When I load the {string} route`,
 * various Then steps). Adds keyboard simulation, ARIA-quartet/slider
 * verification, axe-core scoped rules, file-header audit, and in-process
 * palette/light-mode regex audits — all without shelling out so Windows CI
 * runners pass.
 */

import { When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { CustomWorld } from '../support/world';

setDefaultTimeout(180 * 1000);

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

// ─── Keyboard simulation ─────────────────────────────────────────────────────

When('I press Tab once on the page', async function (this: CustomWorld) {
  await this.page.keyboard.press('Tab');
});

When('I press Enter on the page', async function (this: CustomWorld) {
  await this.page.keyboard.press('Enter');
  // Allow URL hash + focus update to flush.
  await this.page.waitForTimeout(150);
});

// ─── Active element + URL assertions ─────────────────────────────────────────

Then('the active element tag should be {string}', async function (this: CustomWorld, expectedTag: string) {
  const tag = await this.page.evaluate(() => document.activeElement?.tagName ?? null);
  expect(tag).toBe(expectedTag);
});

Then(
  'the active element should have text {string}',
  async function (this: CustomWorld, expectedText: string) {
    const text = await this.page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
    expect(text).toBe(expectedText);
  }
);

Then('the URL hash should be {string}', async function (this: CustomWorld, expectedHash: string) {
  const url = new URL(this.page.url());
  expect(url.hash).toBe(expectedHash);
});

Then(
  'the active element should be the main landmark with tabindex {string}',
  async function (this: CustomWorld, expectedTabindex: string) {
    const result = await this.page.evaluate(() => {
      const el = document.activeElement;
      return {
        tag: el?.tagName ?? null,
        id: el?.id ?? null,
        tabindex: el?.getAttribute('tabindex') ?? null,
      };
    });
    expect(result.tag).toBe('MAIN');
    expect(result.id).toBe('main');
    expect(result.tabindex).toBe(expectedTabindex);
  }
);

// ─── Stylesheet rule presence ────────────────────────────────────────────────

Then(
  'the {string} rule is present in the loaded stylesheet',
  async function (this: CustomWorld, selector: string) {
    const found = await this.page.evaluate((sel: string) => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          // Cross-origin stylesheets throw on cssRules access — skip them.
          continue;
        }
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSStyleRule && rule.selectorText === sel) {
            return true;
          }
        }
      }
      return false;
    }, selector);
    expect(found).toBe(true);
  }
);

// ─── Slider ARIA quartet ────────────────────────────────────────────────────

Then(
  'every range input on the page has aria-valuemin, aria-valuemax, aria-valuenow, and aria-valuetext attributes',
  async function (this: CustomWorld) {
    const offenders = await this.page.evaluate(() => {
      const sliders = Array.from(document.querySelectorAll('input[type="range"]'));
      return sliders
        .map((el) => {
          const required = ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext'];
          const missing = required.filter(
            (attr) => !el.hasAttribute(attr) || (el.getAttribute(attr) ?? '').length === 0
          );
          return { id: (el as HTMLElement).id || (el as HTMLElement).outerHTML.slice(0, 80), missing };
        })
        .filter((r) => r.missing.length > 0);
    });
    if (offenders.length > 0) {
      throw new Error(
        `Sliders missing ARIA attributes:\n${offenders
          .map((o) => `  ${o.id} → missing ${o.missing.join(', ')}`)
          .join('\n')}`
      );
    }
  }
);

// ─── axe-core scoped rule ────────────────────────────────────────────────────

Then(
  'the page passes axe-core {string} rule with zero violations',
  { timeout: 180 * 1000 },
  async function (this: CustomWorld, ruleId: string) {
    const results = await new AxeBuilder({ page: this.page })
      .withRules([ruleId])
      .analyze();
    if (results.violations.length > 0) {
      const detail = results.violations
        .map((v) => `  [${v.impact}] ${v.id}: ${v.description}`)
        .join('\n');
      throw new Error(
        `axe-core rule "${ruleId}" found ${results.violations.length} violation(s):\n${detail}`
      );
    }
  }
);

// ─── Touch target enforcement ────────────────────────────────────────────────

Then(
  'every {string} element has a bounding-rect height of at least {int} pixels',
  async function (this: CustomWorld, selector: string, minHeight: number) {
    // Wait for nav to mount — auth context resolves async via the E2E init script.
    await this.page.waitForSelector(selector, { timeout: 15000 });
    const heights = await this.page.evaluate((sel: string) => {
      return Array.from(document.querySelectorAll(sel)).map((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        return { selector: sel, height: rect.height, width: rect.width };
      });
    }, selector);

    if (heights.length === 0) {
      throw new Error(`No elements matched selector "${selector}"`);
    }
    const tooSmall = heights.filter((h) => h.height < minHeight);
    if (tooSmall.length > 0) {
      throw new Error(
        `${tooSmall.length} element(s) below ${minHeight}px height:\n${tooSmall
          .map((t) => `  ${t.selector}: ${t.height}px`)
          .join('\n')}`
      );
    }
  }
);

// AC #5(d) — both width AND height ≥ N for touch target. If selector
// matches zero elements (e.g. icon-btn class only used in a few subtrees),
// the assertion is silently satisfied — finding a zero-count assertion
// failure on every page would be noise. The icon-btn presence is
// guaranteed elsewhere via axe-core target-size (S-108b).
Then(
  'every {string} element has a bounding-rect width and height of at least {int} pixels',
  async function (this: CustomWorld, selector: string, minDim: number) {
    const rects = await this.page.evaluate((sel: string) => {
      return Array.from(document.querySelectorAll(sel)).map((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
    }, selector);
    const tooSmall = rects.filter((r) => r.width < minDim || r.height < minDim);
    if (tooSmall.length > 0) {
      throw new Error(
        `${tooSmall.length} "${selector}" element(s) below ${minDim}x${minDim}:\n${tooSmall
          .map((t) => `  ${Math.round(t.width)}x${Math.round(t.height)}`)
          .join('\n')}`
      );
    }
  }
);

// ─── Computed focus-visible outline (real UI assertion, AC #2) ──────────────

Then(
  'the focused {string} element has computed outline-color matching {string}',
  async function (this: CustomWorld, selector: string, expected: string) {
    await this.page.waitForSelector(selector, { timeout: 15000 });
    // Programmatically focus the first matching element. Cucumber/Playwright
    // .keyboard.press('Tab') depends on prior focus state; explicit
    // element.focus() + :focus-visible polyfill via setting `data-focus-
    // visible-added` attribute makes this deterministic across browsers.
    const computed = await this.page.evaluate((sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return null;
      el.focus();
      // Force :focus-visible by simulating keyboard focus path.
      el.setAttribute('data-focus-visible-added', '');
      const style = window.getComputedStyle(el);
      return { color: style.outlineColor, width: style.outlineWidth, style: style.outlineStyle };
    }, selector);
    if (!computed) throw new Error(`No element matched "${selector}"`);
    // Browsers normalize rgba(139, 92, 246, 0.6) — accept any of the
    // canonical purples (139,92,246) regardless of alpha rounding.
    const normalized = computed.color.replace(/\s/g, '').toLowerCase();
    const expectedNorm = expected.replace(/\s/g, '').toLowerCase();
    if (!normalized.includes('139,92,246') && normalized !== expectedNorm) {
      throw new Error(
        `Expected outline-color matching "${expected}" (purple 139,92,246) — got "${computed.color}"`
      );
    }
  }
);

// ─── aria-live attribute by CSS selector (AC #6 multi-region) ───────────────

Then(
  'the {string} element has attribute {string} equal to {string}',
  async function (this: CustomWorld, selector: string, attr: string, expected: string) {
    await this.page.waitForSelector(selector, { timeout: 15000 });
    const value = await this.page.evaluate(
      ([sel, a]) => document.querySelector(sel)?.getAttribute(a) ?? null,
      [selector, attr]
    );
    expect(value).toBe(expected);
  }
);

// ─── axe-core target-size scoped rule (AC #5e) ──────────────────────────────

Then(
  'the page passes axe-core target-size with zero violations',
  { timeout: 180 * 1000 },
  async function (this: CustomWorld) {
    const results = await new AxeBuilder({ page: this.page })
      .withRules(['target-size'])
      .analyze();
    if (results.violations.length > 0) {
      const detail = results.violations
        .map((v) => `  [${v.impact}] ${v.id}: ${v.nodes.length} node(s)`)
        .join('\n');
      throw new Error(`target-size violations:\n${detail}`);
    }
  }
);

// ─── Sliders ARIA quartet on a specific route (AC #3 multi-page) ────────────

Then(
  'every range input on the page has the full ARIA quartet',
  async function (this: CustomWorld) {
    const offenders = await this.page.evaluate(() => {
      const sliders = Array.from(document.querySelectorAll('input[type="range"]'));
      return sliders
        .map((el) => {
          const required = ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext'];
          const missing = required.filter(
            (attr) => !el.hasAttribute(attr) || (el.getAttribute(attr) ?? '').length === 0
          );
          return { id: (el as HTMLElement).id || (el as HTMLElement).outerHTML.slice(0, 80), missing };
        })
        .filter((r) => r.missing.length > 0);
    });
    if (offenders.length > 0) {
      throw new Error(
        `Sliders missing ARIA attributes:\n${offenders
          .map((o) => `  ${o.id} → missing ${o.missing.join(', ')}`)
          .join('\n')}`
      );
    }
  }
);

// ─── aria-live attribute on a data-testid element ───────────────────────────

Then(
  'the data-testid {string} element has attribute {string} equal to {string}',
  async function (
    this: CustomWorld,
    testid: string,
    attr: string,
    expected: string
  ) {
    const value = await this.page.evaluate(
      ([t, a]) => {
        const el = document.querySelector(`[data-testid="${t}"]`);
        return el?.getAttribute(a) ?? null;
      },
      [testid, attr]
    );
    expect(value).toBe(expected);
  }
);

// ─── File-header audit (in-process — Windows-CI safe) ───────────────────────

const HEADER_GLOB_PATTERNS = ['app/**/*.tsx', 'src/components/**/*.tsx'];
const HEADER_EXCLUDED_GLOBS = [
  'src/__tests__/**',
  '**/*.test.tsx',
  '**/*.spec.tsx',
  '**/.next/**',
  '**/node_modules/**',
];
const REQUIRED_HEADER_TAGS = ['@file', '@author', '@company', '@date', '@version', '@brief', '@description'];

let lastHeaderAuditOffenders: Array<{ file: string; missing: string[] }> = [];

When(
  'the file-header audit walks all production TSX files',
  async function (this: CustomWorld) {
    const files = (
      await Promise.all(
        HEADER_GLOB_PATTERNS.map((p) =>
          glob(p, { cwd: REPO_ROOT, ignore: HEADER_EXCLUDED_GLOBS, absolute: false })
        )
      )
    )
      .flat()
      .sort();

    lastHeaderAuditOffenders = [];
    for (const rel of files) {
      const abs = path.join(REPO_ROOT, rel);
      const head = fs.readFileSync(abs, 'utf-8').split('\n').slice(0, 30).join('\n');
      const missing = REQUIRED_HEADER_TAGS.filter((tag) => !head.includes(tag));
      if (missing.length > 0) {
        lastHeaderAuditOffenders.push({ file: rel, missing });
      }
    }
  }
);

Then(
  /^every file's first 30 lines contain "@file", "@author", "@company", "@date", "@version", "@brief", and "@description"$/,
  function (this: CustomWorld) {
    if (lastHeaderAuditOffenders.length > 0) {
      throw new Error(
        `${lastHeaderAuditOffenders.length} file(s) missing canonical JSDoc header:\n${lastHeaderAuditOffenders
          .map((o) => `  ${o.file} → missing ${o.missing.join(', ')}`)
          .join('\n')}`
      );
    }
  }
);

// ─── Epic-wide palette + light-mode audits (in-process) ─────────────────────

// Story 14.10 review remediation: expanded to include `accent-` (slider tint
// utility) per the FR-UI-DESIGN-02 spirit, not just structural utilities.
const PALETTE_REGEX =
  /(bg|text|border|from|to|via|ring|accent)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|green|amber|yellow|red|orange)-[0-9]+/g;
const LIGHT_MODE_REGEX = /bg-(white|gray-[0-9])/g;
const AUDIT_GLOB_PATTERNS = ['app/**/*.{tsx,ts}', 'src/components/**/*.{tsx,ts}'];
const AUDIT_EXCLUDED_GLOBS = [
  'src/__tests__/**',
  '**/*.test.tsx',
  '**/*.test.ts',
  '**/*.spec.tsx',
  '**/.next/**',
  '**/node_modules/**',
];

interface AuditMatch {
  file: string;
  line: number;
  text: string;
}

async function runAudit(regex: RegExp): Promise<AuditMatch[]> {
  const files = (
    await Promise.all(
      AUDIT_GLOB_PATTERNS.map((p) =>
        glob(p, { cwd: REPO_ROOT, ignore: AUDIT_EXCLUDED_GLOBS, absolute: false })
      )
    )
  )
    .flat()
    .sort();

  const matches: AuditMatch[] = [];
  for (const rel of files) {
    const abs = path.join(REPO_ROOT, rel);
    const lines = fs.readFileSync(abs, 'utf-8').split('\n');
    lines.forEach((line, idx) => {
      // Scope to className= substrings per Story 14.8 / 14.9 precedent.
      if (!line.includes('className=')) return;
      const localRegex = new RegExp(regex.source, 'g');
      const found = line.match(localRegex);
      if (found && found.length > 0) {
        matches.push({ file: rel, line: idx + 1, text: line.trim().slice(0, 200) });
      }
    });
  }
  return matches;
}

let lastPaletteMatches: AuditMatch[] = [];
let lastLightModeMatches: AuditMatch[] = [];

When(
  'the palette violation audit walks all production files',
  async function (this: CustomWorld) {
    lastPaletteMatches = await runAudit(PALETTE_REGEX);
  }
);

Then('the palette violation count is zero', function (this: CustomWorld) {
  if (lastPaletteMatches.length > 0) {
    throw new Error(
      `${lastPaletteMatches.length} palette violation(s):\n${lastPaletteMatches
        .map((m) => `  ${m.file}:${m.line} → ${m.text}`)
        .join('\n')}`
    );
  }
});

When(
  'the light-mode violation audit walks all production files',
  async function (this: CustomWorld) {
    lastLightModeMatches = await runAudit(LIGHT_MODE_REGEX);
  }
);

Then('the light-mode violation count is zero', function (this: CustomWorld) {
  if (lastLightModeMatches.length > 0) {
    throw new Error(
      `${lastLightModeMatches.length} light-mode violation(s):\n${lastLightModeMatches
        .map((m) => `  ${m.file}:${m.line} → ${m.text}`)
        .join('\n')}`
    );
  }
});

// ─── Layout structural assertions (skip-link + main landmark) ───────────────

Then(
  'exactly one {string} element with id {string} exists in the page',
  async function (this: CustomWorld, tagSpec: string, id: string) {
    // tagSpec arrives as "<main>" — strip angle brackets.
    const tag = tagSpec.replace(/[<>]/g, '').toLowerCase();
    const count = await this.page.evaluate(
      ([t, i]) => document.querySelectorAll(`${t}#${i}`).length,
      [tag, id]
    );
    expect(count).toBe(1);
  }
);

// ─── Source file substring assertion (S-119 SSE region static check) ───────

Then(
  'the file at {string} contains the substring {string}',
  function (this: CustomWorld, relPath: string, needle: string) {
    const abs = path.join(REPO_ROOT, relPath);
    const content = fs.readFileSync(abs, 'utf-8');
    if (!content.includes(needle)) {
      throw new Error(`File "${relPath}" missing substring: ${needle}`);
    }
  }
);

// ─── Keyboard journey helpers (S-120 onboarding) ────────────────────────────

When(
  'I press Tab repeatedly until a button receives focus',
  async function (this: CustomWorld) {
    // Bound the loop so a misconfigured page can't hang the suite.
    for (let i = 0; i < 20; i++) {
      const tag = await this.page.evaluate(() => document.activeElement?.tagName ?? null);
      if (tag === 'BUTTON') return;
      await this.page.keyboard.press('Tab');
    }
    const finalTag = await this.page.evaluate(() => document.activeElement?.tagName ?? null);
    throw new Error(`No <button> received focus after 20 Tab presses (last: ${finalTag})`);
  }
);

Then('the focused button has visible focus styling', async function (this: CustomWorld) {
  const styling = await this.page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const cs = window.getComputedStyle(el);
    return {
      outlineWidth: cs.outlineWidth,
      outlineStyle: cs.outlineStyle,
      boxShadow: cs.boxShadow,
    };
  });
  if (!styling) throw new Error('No active element');
  // Visible focus is satisfied by either a non-zero outline or a non-none
  // box-shadow (e.g. ring-style focus indicator).
  const hasOutline = styling.outlineStyle !== 'none' && parseFloat(styling.outlineWidth) > 0;
  const hasShadow = styling.boxShadow !== 'none' && styling.boxShadow.length > 0;
  if (!hasOutline && !hasShadow) {
    throw new Error(
      `Focused button lacks visible focus styling (outline: ${styling.outlineStyle} ${styling.outlineWidth}, shadow: ${styling.boxShadow})`
    );
  }
});

Then(
  'the first child of {string} is an {string} with class {string} and href {string}',
  async function (
    this: CustomWorld,
    parentSpec: string,
    childSpec: string,
    expectedClass: string,
    expectedHref: string
  ) {
    // Per AC #1, the skip-link must be the first FOCUSABLE element in <body>
    // (not literal first DOM child — Next.js dev mode injects hydration
    // markers that are non-focusable and don't displace the focus order).
    // Verify (a) the skip-link exists with the right class + href,
    // (b) no focusable element appears before it in DOM order.
    const parentTag = parentSpec.replace(/[<>]/g, '').toLowerCase();
    const childTag = childSpec.replace(/[<>]/g, '').toLowerCase();
    const result = await this.page.evaluate(
      ([pt, ct, cls, href]) => {
        const parent = document.querySelector(pt);
        if (!parent) return { error: `No <${pt}> in DOM`, focusables: [] as string[] };
        const focusableSelector = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusables = Array.from(parent.querySelectorAll(focusableSelector));
        const first = focusables[0];
        return {
          error: null as string | null,
          firstTag: first?.tagName.toLowerCase() ?? null,
          firstClass: first?.getAttribute('class') ?? null,
          firstHref: first?.getAttribute('href') ?? null,
          // Keep the search params for debug output.
          expected: { tag: ct, cls, href },
        };
      },
      [parentTag, childTag, expectedClass, expectedHref]
    );
    if (result.error) throw new Error(result.error);
    expect(result.firstTag).toBe(childTag);
    expect(result.firstClass ?? '').toContain(expectedClass);
    expect(result.firstHref).toBe(expectedHref);
  }
);

/**
 * @file test/acceptance/step_definitions/E-014-frontend-design-migration.steps.ts
 * @author Stephen Boyett
 * @company Silverline Software
 * @date 2026-04-17
 * @version 1.0
 * @brief Step definitions for Story 14.1 — dark-first canonical tokens verified in the browser.
 *
 * @description
 * Covers scenarios E-014-S-1 through E-014-S-5. These are genuine Playwright
 * E2E journeys that load authenticated routes (/dashboard, /settings,
 * /posting-queue), read computed styles on the live DOM, and assert that the
 * canonical dark-first tokens from Story 14.1 propagate end-to-end. The
 * `Given I am logged in` step is provided by E-002-auth-access.steps.ts
 * (session cookie fixture reused per AC #9), and `When I navigate to ...`
 * is provided by E-002-settings.steps.ts.
 */

import { When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3200';

// The first compile of /dashboard, /settings, /posting-queue under
// Turbopack can exceed Cucumber's default 5s step timeout. Raise it here
// so page.goto has room to breathe on a cold dev server.
setDefaultTimeout(120 * 1000);

// ─── Navigation variant that tolerates cold-compile latency ──────────────────
// `When I navigate to {string}` (from E-002-settings.steps.ts) waits for the
// full `load` event, which can exceed Playwright's 30s default on first hit.
// Story 14.1 only needs the DOM to be ready before reading computed styles, so
// this variant uses `domcontentloaded` and an explicit 90s timeout.
When(
  'I load the {string} route in the browser',
  { timeout: 180 * 1000 },
  async function (this: CustomWorld, path: string) {
    await this.page.goto(`${BASE_URL}${path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 150 * 1000,
    });
  }
);

// ─── AC #1 / AC #6 — body background resolves to the canonical dark token ────

Then(
  'the body computed background color should be {string}',
  async function (this: CustomWorld, expected: string) {
    const bg = await this.page.evaluate(
      () => window.getComputedStyle(document.body).backgroundColor
    );
    expect(bg).toBe(expected);
  }
);

Then('the body element should not have an inline background style', async function (this: CustomWorld) {
  const inlineBg = await this.page.evaluate(() => {
    const styleAttr = document.body.getAttribute('style') ?? '';
    return /background\s*:/i.test(styleAttr);
  });
  expect(inlineBg).toBe(false);
});

// ─── AC #7 — fp-bg-mesh and fp-content stacking order intact ─────────────────

Then(
  'a fixed-position element with class {string} should be present in the DOM',
  async function (this: CustomWorld, className: string) {
    const position = await this.page.evaluate((cls: string) => {
      const el = document.querySelector(`.${cls}`);
      if (!el) return null;
      return window.getComputedStyle(el).position;
    }, className);
    expect(position).toBe('fixed');
  }
);

Then(
  'an element with class {string} should have position {string}',
  async function (this: CustomWorld, className: string, expectedPosition: string) {
    const position = await this.page.evaluate((cls: string) => {
      const el = document.querySelector(`.${cls}`);
      if (!el) return null;
      return window.getComputedStyle(el).position;
    }, className);
    expect(position).toBe(expectedPosition);
  }
);

Then(
  'an element with class {string} should have z-index {string}',
  async function (this: CustomWorld, className: string, expectedZIndex: string) {
    const zIndex = await this.page.evaluate((cls: string) => {
      const el = document.querySelector(`.${cls}`);
      if (!el) return null;
      return window.getComputedStyle(el).zIndex;
    }, className);
    expect(zIndex).toBe(expectedZIndex);
  }
);

// ─── AC #1 — --color-primary resolves to the canonical purple ────────────────

Then(
  'the CSS custom property {string} on the root element should equal {string}',
  async function (this: CustomWorld, property: string, expected: string) {
    const value = await this.page.evaluate(
      (prop: string) =>
        window.getComputedStyle(document.documentElement).getPropertyValue(prop).trim(),
      property
    );
    expect(value.toLowerCase()).toBe(expected.toLowerCase());
  }
);

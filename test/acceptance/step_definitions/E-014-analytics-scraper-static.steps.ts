/**
 * @file test/acceptance/step_definitions/E-014-analytics-scraper-static.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-26
 * @version 1.0
 * @brief Step definitions for Story 14.9 — Analytics, Scraper, Health, and Static pages.
 *
 * @description
 * Covers Cucumber scenarios @E-014-S-93 through @E-014-S-103 (11 scenarios). Most steps
 * are inherited from the existing E-014 step registry — `Given I am logged in` from
 * E-002-auth-access, `When I load the {string} route in the browser` from
 * E-014-frontend-design-migration, source-scan steps (`I read the source of {string}` etc.)
 * from E-014-price-calculator, `the page contains at least one element with class {string}`
 * + `the data-testid {string} is visible on the page` from E-014-settings-polish, and the
 * multi-page axe-core fan-out helper from E-014-opportunities-listings-messaging. This file
 * adds only the Story 14.9-specific API stubs (analytics seeded data / empty data / scraper
 * jobs / search-configs).
 */

import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

setDefaultTimeout(120 * 1000);

Given(
  'the analytics API returns seeded profit-loss data',
  async function (this: CustomWorld) {
    await this.page.route('**/api/analytics/profit-loss**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalNetProfit: 1250.5,
          totalInvested: 800,
          totalRevenue: 2050.5,
          completedDeals: 7,
          avgProfitPerFlip: 178.64,
          avgDaysHeld: 12,
          successRate: 87,
          overallROI: 156,
          trends: [
            { period: '2026-01', profit: 350, revenue: 600, costs: 250 },
            { period: '2026-02', profit: 420, revenue: 720, costs: 300 },
            { period: '2026-03', profit: 480.5, revenue: 730.5, costs: 250 },
          ],
          categoryBreakdown: [
            { category: 'Electronics', totalProfit: 500, count: 3 },
            { category: 'Tools', totalProfit: 350.5, count: 2 },
            { category: 'Sporting', totalProfit: 400, count: 2 },
          ],
          platformBreakdown: [
            { platform: 'CRAIGSLIST', count: 4, totalProfit: 700, avgProfit: 175, successRate: 100 },
            { platform: 'OFFERUP', count: 3, totalProfit: 550.5, avgProfit: 183.5, successRate: 67 },
          ],
          bestDeal: {
            id: 'deal-1',
            title: 'Vintage iPhone bundle',
            platform: 'CRAIGSLIST',
            netProfit: 320,
            roiPercent: 213,
          },
          worstDeal: {
            id: 'deal-2',
            title: 'Damaged toolset',
            platform: 'OFFERUP',
            netProfit: -45.5,
            roiPercent: -23,
          },
          items: [
            {
              id: 'item-1',
              title: 'iPhone bundle',
              platform: 'CRAIGSLIST',
              status: 'SOLD',
              purchasePrice: 150,
              resalePrice: 470,
              netProfit: 320,
              roiPercent: 213,
              daysHeld: 6,
            },
          ],
        }),
      });
    });
  }
);

Given(
  'the analytics API returns no items',
  async function (this: CustomWorld) {
    await this.page.route('**/api/analytics/profit-loss**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalNetProfit: 0,
          totalInvested: 0,
          totalRevenue: 0,
          completedDeals: 0,
          avgProfitPerFlip: 0,
          avgDaysHeld: 0,
          successRate: 0,
          overallROI: 0,
          trends: [],
          categoryBreakdown: [],
          platformBreakdown: [],
          bestDeal: null,
          worstDeal: null,
          items: [],
        }),
      });
    });
  }
);

Given(
  'the scraper jobs API returns no jobs',
  async function (this: CustomWorld) {
    await this.page.route('**/api/scraper-jobs**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jobs: [] }),
      });
    });
  }
);

Given(
  'the search-configs API returns no configs',
  async function (this: CustomWorld) {
    await this.page.route('**/api/search-configs**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ configs: [] }),
      });
    });
  }
);

// ─── Story 14.9 stronger scenario bindings (post-review hardening) ─────────────

Given(
  'the scraper jobs API returns one COMPLETED job',
  async function (this: CustomWorld) {
    await this.page.route('**/api/scraper-jobs**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [
            {
              id: 'job-1',
              platform: 'craigslist',
              status: 'COMPLETED',
              listingsFound: 5,
              opportunitiesCount: 2,
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              location: 'tampa',
              category: 'electronics',
            },
          ],
        }),
      });
    });
  }
);

Given(
  'the analytics API responds slowly so the loading state is visible',
  async function (this: CustomWorld) {
    await this.page.route('**/api/analytics/profit-loss**', async (route) => {
      // Hold the request open long enough for assertions on the loading state.
      await new Promise((r) => setTimeout(r, 1500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalNetProfit: 0,
          totalInvested: 0,
          totalRevenue: 0,
          completedDeals: 0,
          avgProfitPerFlip: 0,
          avgDaysHeld: 0,
          successRate: 0,
          overallROI: 0,
          trends: [],
          categoryBreakdown: [],
          platformBreakdown: [],
          bestDeal: null,
          worstDeal: null,
          items: [],
        }),
      });
    });
  }
);

Given(
  'the analytics API returns an error',
  async function (this: CustomWorld) {
    await this.page.route('**/api/analytics/profit-loss**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', detail: 'simulated failure' } }),
      });
    });
  }
);

When(
  'I click the {string} job-history filter button',
  async function (this: CustomWorld, label: string) {
    await this.page.getByRole('button', { name: label, exact: true }).first().click();
  }
);

When(
  'I trigger an SSE progress event for the scraper page',
  async function (this: CustomWorld) {
    // Stall the platform scraper endpoints so the page stays in `loading=true` long enough
    // for the progress indicator to mount and the gradient assertion to run. The component
    // renders the progress bar (with the canonical inline purple-gradient style) the moment
    // loading flips on, even before any SSE event arrives.
    const stall = async (route: import('@playwright/test').Route) => {
      await new Promise((r) => setTimeout(r, 4000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { jobId: 'job-fixture', status: 'RUNNING' } }),
      });
    };
    await this.page.route('**/api/scraper/craigslist', stall);
    await this.page.route('**/api/scraper/offerup', stall);
    await this.page.getByTestId('scraper-submit').click();
    // Wait for the indicator to mount before downstream assertions run.
    await this.page.getByTestId('scrape-progress-indicator').waitFor({ state: 'visible', timeout: 10000 });
  }
);

When(
  'I click the {string} button on the page',
  async function (this: CustomWorld, label: string) {
    // Match by aria-label (preferred for icon-only buttons) OR by accessible name (text content).
    // Some buttons on the scraper page are icon-only with descriptive aria-label; others have text.
    const ariaLabelMatch = this.page.locator(`button[aria-label="${label}"]`).first();
    if ((await ariaLabelMatch.count()) > 0) {
      // Wait until the button is actually clickable (page hydrated, not covered).
      // Without this, hydration-mid-DOMContentLoaded can swallow the click in React's
      // event delegation and the resulting modal never opens.
      await expect(ariaLabelMatch).toBeVisible({ timeout: 10000 });
      await ariaLabelMatch.scrollIntoViewIfNeeded().catch(() => undefined);
      await ariaLabelMatch.click();
      return;
    }
    const byRole = this.page.getByRole('button', { name: label, exact: false }).first();
    await expect(byRole).toBeVisible({ timeout: 10000 });
    await byRole.scrollIntoViewIfNeeded().catch(() => undefined);
    await byRole.click();
  }
);

Then(
  'the data-testid {string} has computed background-image containing the canonical purple gradient',
  async function (this: CustomWorld, testId: string) {
    const locator = this.page.getByTestId(testId);
    await expect(locator).toBeVisible({ timeout: 10000 });
    const bg = await locator.evaluate((el) => getComputedStyle(el as HTMLElement).backgroundImage);
    expect(bg).toMatch(/linear-gradient/);
    // Canonical purple primary #7c3aed → rgb(124, 58, 237) (case-insensitive, with optional alpha)
    expect(bg).toMatch(/rgba?\(\s*124,\s*58,\s*237/);
  }
);

Then(
  'the data-testid {string} has aria-pressed equal to {string}',
  async function (this: CustomWorld, testId: string, expected: string) {
    const locator = this.page.getByTestId(testId);
    await expect(locator).toBeVisible({ timeout: 10000 });
    await expect(locator).toHaveAttribute('aria-pressed', expected);
  }
);

Then(
  'the page renders at least one element matching CSS selector {string}',
  async function (this: CustomWorld, selector: string) {
    // Wait for the first match to appear so async UI transitions (loading → error,
    // dialog open, etc.) get a fair chance to mount before we assert.
    await this.page.locator(selector).first().waitFor({ state: 'attached', timeout: 15000 });
    const count = await this.page.locator(selector).count();
    expect(count).toBeGreaterThan(0);
  }
);

Then(
  'the page brand title {string} renders with a non-transparent computed color',
  async function (this: CustomWorld, text: string) {
    const locator = this.page.getByText(text, { exact: false }).first();
    await expect(locator).toBeVisible({ timeout: 10000 });
    const color = await locator.evaluate((el) => getComputedStyle(el as HTMLElement).color);
    // text-transparent regression would surface as `rgba(0, 0, 0, 0)` or `transparent`.
    expect(color).not.toMatch(/rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)/);
    expect(color).not.toBe('transparent');
  }
);

Then(
  'every element matching {string} on the page is keyboard-focusable',
  async function (this: CustomWorld, selector: string) {
    const handles = await this.page.locator(selector).elementHandles();
    expect(handles.length).toBeGreaterThan(0);
    for (const handle of handles) {
      const focusable = await handle.evaluate((el) => {
        const tag = el.tagName.toLowerCase();
        if (['a', 'button', 'input', 'select', 'textarea'].includes(tag)) return true;
        const tabindex = (el as HTMLElement).getAttribute('tabindex');
        return tabindex !== null && parseInt(tabindex, 10) >= 0;
      });
      expect(focusable).toBe(true);
    }
  }
);


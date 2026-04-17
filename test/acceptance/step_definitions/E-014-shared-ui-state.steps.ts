/**
 * @file test/acceptance/step_definitions/E-014-shared-ui-state.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Step definitions for Story 14.3 — shared UI state components (S-20 through S-27).
 *
 * @description
 * Covers Cucumber scenarios @E-014-S-20 through @E-014-S-27 verifying:
 *   - The src/components/ui/ directory exists with canonical file headers (S-20)
 *   - Dashboard renders LoadingSkeleton with role=status and .fp-shimmer (S-21)
 *   - Posting-queue renders ErrorBanner (.fp-alert-danger + retry) on 500 (S-22)
 *   - Posting-queue renders EmptyState (.fp-glass, heading, CTA) on empty (S-23)
 *   - scoreColor boundary matrix (S-24, service-level pure logic test)
 *   - Listings detail renders ErrorBanner when listing not found (S-25)
 *   - Messages page renders EmptyState when thread list empty (S-26)
 *   - Inline min-h-screen loading blocks removed from target pages (S-27)
 *
 * Authentication: reuses `Given I am logged in` from E-002-auth-access.steps.ts.
 * API mocking: uses page.route() to intercept XHR without real DB state.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { scoreColor } from '../../../src/components/ui/ScoreRing';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

setDefaultTimeout(120 * 1000);

// ─── Filesystem / header assertions (S-20, S-27) ─────────────────────────────

const CANONICAL_HEADER_TOKENS = ['@file', '@author Stephen Boyett', '@company Axovia AI', '@date', '@version', '@brief', '@description'];

Then(
  'the source file {string} exists with canonical header tokens',
  function (this: CustomWorld, relativePath: string) {
    const fullPath = path.join(process.cwd(), relativePath);
    expect(fs.existsSync(fullPath), `File not found: ${relativePath}`).toBe(true);
    const content = fs.readFileSync(fullPath, 'utf-8');
    for (const token of CANONICAL_HEADER_TOKENS) {
      expect(content, `Missing header token "${token}" in ${relativePath}`).toContain(token);
    }
  }
);

Then(
  'the source file {string} exists',
  function (this: CustomWorld, relativePath: string) {
    const fullPath = path.join(process.cwd(), relativePath);
    expect(fs.existsSync(fullPath), `File not found: ${relativePath}`).toBe(true);
  }
);

When(
  'a grep for inline loading block patterns runs across the five target pages',
  function (this: CustomWorld) {
    const targetFiles = [
      'app/dashboard/page.tsx',
      'app/opportunities/page.tsx',
      'app/listings/[id]/page.tsx',
      'app/messages/page.tsx',
      'app/posting-queue/page.tsx',
    ];
    const inlineLoadingPattern = /min-h-screen flex items-center justify-center.*Loading/s;

    this.testData.inlineLoadingMatches = targetFiles.flatMap((relPath) => {
      const fullPath = path.join(process.cwd(), relPath);
      if (!fs.existsSync(fullPath)) return [];
      const content = fs.readFileSync(fullPath, 'utf-8');
      return inlineLoadingPattern.test(content) ? [relPath] : [];
    });
  }
);

Then('zero inline loading blocks are found', function (this: CustomWorld) {
  const matches = this.testData.inlineLoadingMatches as string[];
  expect(
    matches,
    `Found inline loading blocks in: ${matches.join(', ')}`
  ).toHaveLength(0);
});

// ─── scoreColor boundary matrix (S-24, service-level) ────────────────────────

Given(
  'the scoreColor function is imported from {string}',
  function (this: CustomWorld, _modulePath: string) {
    // scoreColor is imported at the top of this file; nothing to do at step-time.
  }
);

When(
  'scoreColor is called with score {int}',
  function (this: CustomWorld, score: number) {
    this.testData.scoreColorResult = scoreColor(score);
  }
);

Then(
  'the returned colour should be {string}',
  function (this: CustomWorld, expected: string) {
    expect(this.testData.scoreColorResult).toBe(expected);
  }
);

// ─── API route interception helpers ──────────────────────────────────────────

Given(
  'the {string} route is intercepted to delay response',
  async function (this: CustomWorld, routePattern: string) {
    await this.page.route(`**${routePattern}**`, async (route) => {
      await new Promise((r) => setTimeout(r, 5000)); // hold for 5 s so loading state is visible
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true, data: [] }) });
    });
  }
);

Given(
  'the {string} route returns status 500',
  async function (this: CustomWorld, routePattern: string) {
    await this.page.route(`**${routePattern}**`, (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal Server Error' }) })
    );
  }
);

Given(
  'the {string} route returns an empty queue',
  async function (this: CustomWorld, routePattern: string) {
    await this.page.route(`**${routePattern}**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [],
          total: 0,
          stats: { pending: 0, inProgress: 0, posted: 0, failed: 0 },
        }),
      })
    );
  }
);

Given(
  'the {string} route returns an empty thread list',
  async function (this: CustomWorld, routePattern: string) {
    await this.page.route(`**${routePattern}**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
    );
  }
);

// ─── Navigation step used by Story 14.3 scenarios ────────────────────────────
// (Story 14.1 defined "I load the {string} route in the browser" — reused here)

// ─── Visibility assertions ────────────────────────────────────────────────────

Then(
  'an element matching {string} is visible',
  async function (this: CustomWorld, selector: string) {
    const el = this.page.locator(selector);
    await expect(el.first()).toBeVisible({ timeout: 15000 });
  }
);

Then(
  'the loading skeleton has role {string} with aria-busy {string}',
  async function (this: CustomWorld, role: string, ariaBusy: string) {
    const el = this.page.locator(`[data-testid="loading-skeleton"]`);
    await expect(el.first()).toHaveAttribute('role', role);
    await expect(el.first()).toHaveAttribute('aria-busy', ariaBusy);
  }
);

Then(
  'the loading skeleton contains at least one {string} child',
  async function (this: CustomWorld, selector: string) {
    const shimmer = this.page.locator(`[data-testid="loading-skeleton"] ${selector}`);
    await expect(shimmer.first()).toBeVisible({ timeout: 10000 });
  }
);

Then(
  'an element with class {string} and role {string} is visible',
  async function (this: CustomWorld, className: string, role: string) {
    const el = this.page.locator(`.${className}[role="${role}"]`);
    await expect(el.first()).toBeVisible({ timeout: 15000 });
  }
);

Then(
  'a retry button with class {string} is visible',
  async function (this: CustomWorld, className: string) {
    const btn = this.page.locator(`button.${className}`);
    await expect(btn.first()).toBeVisible({ timeout: 10000 });
  }
);

Then(
  'an element matching {string} with class {string} is visible',
  async function (this: CustomWorld, selector: string, className: string) {
    const el = this.page.locator(`${selector}.${className}`);
    await expect(el.first()).toBeVisible({ timeout: 15000 });
  }
);

Then(
  'the empty state contains the heading {string}',
  async function (this: CustomWorld, headingText: string) {
    const heading = this.page.locator(`[data-testid="empty-state"] h3`);
    await expect(heading).toContainText(headingText, { timeout: 10000 });
  }
);

Then(
  'the empty state contains a link or button matching {string}',
  async function (this: CustomWorld, labelPattern: string) {
    const re = new RegExp(labelPattern, 'i');
    const linkOrBtn = this.page.locator(
      `[data-testid="empty-state"] a, [data-testid="empty-state"] button`
    ).filter({ hasText: re });
    await expect(linkOrBtn.first()).toBeVisible({ timeout: 10000 });
  }
);

Then(
  'the empty state contains the text {string}',
  async function (this: CustomWorld, text: string) {
    const el = this.page.locator(`[data-testid="empty-state"]`);
    await expect(el).toContainText(text, { timeout: 10000 });
  }
);

Then(
  'the empty state contains a link to {string} labelled {string}',
  async function (this: CustomWorld, href: string, label: string) {
    const link = this.page.locator(`[data-testid="empty-state"] a[href="${href}"]`);
    await expect(link).toContainText(label, { timeout: 10000 });
  }
);

Then(
  'an element with class {string} is visible on the page',
  async function (this: CustomWorld, className: string) {
    const el = this.page.locator(`.${className}`);
    await expect(el.first()).toBeVisible({ timeout: 20000 });
  }
);

// ─── S-28: ScoreRing Playwright E2E (Task 5a.4) ──────────────────────────────

Given(
  'the {string} route returns one opportunity with valueScore {int}',
  async function (this: CustomWorld, routePattern: string, valueScore: number) {
    const opportunity = {
      id: 'test-opp-001',
      listingId: 'test-listing-001',
      status: 'IDENTIFIED',
      purchasePrice: null,
      purchaseDate: null,
      resalePrice: null,
      resalePlatform: null,
      resaleUrl: null,
      resaleDate: null,
      actualProfit: null,
      fees: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      listing: {
        id: 'test-listing-001',
        title: 'Test Item for ScoreRing E2E',
        askingPrice: 50,
        estimatedValue: 100,
        estimatedLow: null,
        estimatedHigh: null,
        discountPercent: 50,
        profitPotential: 50,
        valueScore,
        platform: 'craigslist',
        url: 'https://example.com/listing/1',
        location: 'Test City',
        imageUrls: null,
        condition: 'Good',
        description: null,
        sellerName: null,
        sellerContact: null,
        comparableUrls: null,
        priceReasoning: null,
        notes: null,
        shippable: null,
        negotiable: null,
        tags: null,
        requestToBuy: null,
        category: 'Electronics',
        postedAt: null,
        identifiedBrand: null,
        identifiedModel: null,
        identifiedVariant: null,
        identifiedCondition: null,
        verifiedMarketValue: null,
        marketDataSource: null,
        marketDataDate: null,
        comparableSalesJson: null,
        sellabilityScore: null,
        demandLevel: null,
        expectedDaysToSell: null,
        authenticityRisk: null,
        recommendedOffer: null,
        recommendedList: null,
        resaleStrategy: null,
        trueDiscountPercent: null,
        llmAnalyzed: null,
        analysisDate: null,
        analysisConfidence: null,
        analysisReasoning: null,
        compMatchConfidence: null,
        soldVolume30Days: null,
        soldVolume60Days: null,
        soldVolume90Days: null,
        completenessLabel: null,
        sellerRating: null,
        sellerReviewCount: null,
        sizeCategory: null,
        estimatedShippingCost: null,
        pickupDistanceMiles: null,
        outsidePickupRadius: null,
        adjustedProfitMargin: null,
      },
    };
    await this.page.route(`**${routePattern}**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          opportunities: [opportunity],
          stats: { totalOpportunities: 1, totalProfit: 0, totalInvested: 0, totalRevenue: 0 },
        }),
      })
    );
  }
);

Then(
  'the ScoreRing foreground circle has stroke colour {string}',
  async function (this: CustomWorld, expectedStroke: string) {
    // The ScoreRing SVG has two <circle> elements: [0] background track, [1] foreground fill.
    const scoreRing = this.page.locator('[data-testid="score-ring"]');
    await expect(scoreRing.first()).toBeVisible({ timeout: 15000 });
    const fillCircle = scoreRing.first().locator('circle').nth(1);
    const strokeAttr = await fillCircle.getAttribute('stroke');
    expect(strokeAttr).toBe(expectedStroke);
  }
);

Then(
  'no element with class {string} is present on the page',
  async function (this: CustomWorld, className: string) {
    const el = this.page.locator(`.${className}`);
    await expect(el).toHaveCount(0, { timeout: 5000 });
  }
);

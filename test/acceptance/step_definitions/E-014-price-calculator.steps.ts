/**
 * @file test/acceptance/step_definitions/E-014-price-calculator.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Step definitions for Story 14.6 — PriceCalculator canonical reference (@E-014-S-29..S-36).
 *
 * @description
 * Implements source-level regex regression guards plus one full-stack Playwright
 * E2E scenario that mocks /api/listings/:id + /api/listings/:id/optimal-price to
 * render the listings detail page on a seeded mock listing id.
 *
 * Shared steps already defined elsewhere:
 *   - "I am logged in"   → E-002-auth-access.steps.ts
 *   - "I load the {string} route in the browser" → E-014-frontend-design-migration.steps.ts
 *   - "an element matching {string} with class {string} is visible" → E-014-shared-ui-state.steps.ts
 *   - "the source file {string} exists" → E-014-shared-ui-state.steps.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

setDefaultTimeout(120 * 1000);

const PALETTE_REGEX =
  /(bg|text|border|from|to|via|ring)-(blue|cyan|teal|sky|indigo|violet|fuchsia|pink|rose|emerald|green|amber|yellow|red|orange|gray|purple|white)-\d+/g;

// ─── Source-level scenario helpers ───────────────────────────────────────────

When(
  'I read the source of {string}',
  function (this: CustomWorld, relativePath: string) {
    const fullPath = path.join(process.cwd(), relativePath);
    this.testData.sourceContent = fs.readFileSync(fullPath, 'utf-8');
    this.testData.sourcePath = relativePath;
  }
);

Then(
  'the source should contain the pattern {string}',
  function (this: CustomWorld, pattern: string) {
    const content = this.testData.sourceContent as string;
    expect(
      content.includes(pattern),
      `Expected "${this.testData.sourcePath}" to contain: ${pattern}`
    ).toBe(true);
  }
);

Then(
  'the source should not contain the pattern {string}',
  function (this: CustomWorld, pattern: string) {
    const content = this.testData.sourceContent as string;
    expect(
      content.includes(pattern),
      `Expected "${this.testData.sourcePath}" NOT to contain: ${pattern}`
    ).toBe(false);
  }
);

Then(
  'the raw Tailwind palette class count should equal {int}',
  function (this: CustomWorld, expected: number) {
    const content = this.testData.sourceContent as string;
    const matches = content.match(PALETTE_REGEX) ?? [];
    expect(
      matches.length,
      `Raw palette matches in ${this.testData.sourcePath}: ${matches.slice(0, 10).join(', ')}${matches.length > 10 ? '…' : ''}`
    ).toBe(expected);
  }
);

// ─── S-35: Full listing detail Playwright E2E — mock both JSON endpoints ─────

Given(
  'the {string} route returns a mocked listing with optimal pricing',
  async function (this: CustomWorld, routePattern: string) {
    // Mock the listing fetch used by ListingDetail's fetchListing().
    const mockListing = {
      id: 'mock-listing-14-6',
      platform: 'EBAY',
      title: 'Mock Listing for Story 14.6',
      description: 'Integration test listing — PriceCalculator canonical rebuild.',
      askingPrice: 58,
      estimatedValue: 120,
      profitPotential: 30,
      valueScore: 85,
      discountPercent: 50,
      trueDiscountPercent: 50,
      status: 'IDENTIFIED',
      location: 'Test City',
      url: 'https://example.com/listing',
      scrapedAt: new Date().toISOString(),
      imageUrls: null,
      images: [],
      verifiedMarketValue: 200,
      demandLevel: 'HIGH',
      identifiedBrand: 'TestBrand',
      identifiedModel: null,
      identifiedCondition: 'Good',
      comparableSalesJson: null,
      resaleStrategy: null,
      opportunity: null,
    };
    await this.page.route(`**${routePattern}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ listing: mockListing, staleAnalysis: false }),
      })
    );

    // Mock the optimal-price endpoint that PriceCalculator fetches on mount.
    const mockPrices = {
      success: true,
      data: {
        prices: [
          {
            targetPlatform: 'mercari',
            recommendedPrice: 96.67,
            estimatedFees: 9.67,
            estimatedProfit: 29.0,
            estimatedShippingCost: 8,
            targetMarginPercent: 30,
            feeRatePercent: 10,
            verifiedMarketValue: 200,
            costBasis: 58,
            isProjected: false,
            marketDataAvailable: true,
            lossWarning: false,
            aiRecommendedPrice: 100,
            priceBreakdown: { cappedByMarket: false, freeItemPricing: false },
            impossible: false,
          },
        ],
        bestPlatform: 'mercari',
        isProjected: false,
      },
    };
    await this.page.route('**/api/listings/*/optimal-price', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPrices),
      })
    );
  }
);

Then(
  'the element {string} has aria-live {string}',
  async function (this: CustomWorld, selector: string, expected: string) {
    const el = this.page.locator(selector);
    await expect(el.first()).toHaveAttribute('aria-live', expected, {
      timeout: 15000,
    });
  }
);

Then(
  'the slider {string} has aria-valuemin, aria-valuemax, aria-valuenow, and aria-valuetext populated',
  async function (this: CustomWorld, selector: string) {
    // Don't assert visibility — a range input inside a flex container can be
    // reported as "hidden" by Playwright when the layout metrics are zero at
    // query time on first paint. The ACs only require the ARIA attrs be
    // populated, which we can read directly via attached-to-DOM status.
    const slider = this.page.locator(selector).first();
    await slider.waitFor({ state: 'attached', timeout: 15000 });
    for (const attr of ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext']) {
      const value = await slider.getAttribute(attr);
      expect(value, `slider missing ${attr}`).toBeTruthy();
    }
  }
);

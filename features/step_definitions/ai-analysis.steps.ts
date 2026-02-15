/**
 * AI Analysis Step Definitions
 * Author: ASPEN
 * Company: Axovia AI
 *
 * Step definitions for AI flippability scoring and analysis
 */

import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

setDefaultTimeout(30 * 1000);

// ==================== AI ENGINE INITIALIZATION ====================

Given('the AI scoring engine is initialized', async function (this: CustomWorld) {
  // Verify AI service is ready
  const response = await this.page.evaluate(async () => {
    const res = await fetch('/api/ai/health');
    return res.json();
  });

  expect(response.status).toBe('ready');
  console.log('✅ AI scoring engine initialized');
});

// ==================== LISTING SETUP ====================

Given('an eBay listing:', async function (this: CustomWorld, dataTable) {
  const listing = dataTable.rowsHash();

  // Store listing data in world context
  this.currentListing = {
    marketplace: 'ebay',
    title: listing.Title,
    price: parseFloat(listing.Price.replace(/[^0-9.]/g, '')),
    condition: listing.Condition,
    sellerLocation: listing['Seller Location'],
    category: listing.Category,
  };

  console.log('✅ eBay listing created:', this.currentListing.title);
});

Given('a Craigslist listing:', async function (this: CustomWorld, dataTable) {
  const listing = dataTable.rowsHash();

  this.currentListing = {
    marketplace: 'craigslist',
    title: listing.Title,
    price: parseFloat(listing.Price.replace(/[^0-9.]/g, '')),
    description: listing.Description,
  };

  console.log('✅ Craigslist listing created:', this.currentListing.title);
});

Given('a Facebook Marketplace listing:', async function (this: CustomWorld, dataTable) {
  const listing = dataTable.rowsHash();

  this.currentListing = {
    marketplace: 'facebook',
    title: listing.Title,
    price: parseFloat(listing.Price.replace(/[^0-9.]/g, '')),
    condition: listing.Condition,
  };

  console.log('✅ Facebook listing created:', this.currentListing.title);
});

Given(
  'a listing with description {string}',
  async function (this: CustomWorld, description: string) {
    this.currentListing = {
      ...this.currentListing,
      description,
    };
  }
);

Given('the seller is {int} miles away', async function (this: CustomWorld, distance: number) {
  this.currentListing = {
    ...this.currentListing,
    sellerDistance: distance,
  };
});

Given('a listing with condition {string}', async function (this: CustomWorld, condition: string) {
  this.currentListing = {
    marketplace: 'test',
    title: 'Test Item',
    price: 100,
    condition,
  };
});

Given('asking price of ${int}', async function (this: CustomWorld, price: number) {
  this.currentListing = {
    ...this.currentListing,
    price,
  };
});

// ==================== MARKET DATA ====================

Given(
  'the market value for {string} is ${int}',
  async function (this: CustomWorld, itemName: string, marketValue: number) {
    // Mock market value API response
    await this.page.route('**/api/market-value**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          item: itemName,
          averagePrice: marketValue,
          confidence: 'high',
          sampleSize: 50,
        }),
      });
    });

    console.log(`✅ Market value set: ${itemName} = $${marketValue}`);
  }
);

Given('an item titled {string}', async function (this: CustomWorld, title: string) {
  this.currentListing = {
    marketplace: 'test',
    title,
    price: 0,
  };
});

Given('eBay sold listings show:', async function (this: CustomWorld, dataTable) {
  const soldListings = dataTable.hashes();

  // Mock sold listings API
  await this.page.route('**/api/sold-listings**', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        listings: soldListings.map((l) => ({
          price: parseFloat(l.Price.replace(/[^0-9.]/g, '')),
          soldDate: l.Date,
          condition: l.Condition,
        })),
      }),
    });
  });

  console.log(`✅ Mocked ${soldListings.length} sold listings`);
});

// ==================== AI ANALYSIS EXECUTION ====================

When('the AI analyzer evaluates the listing', async function (this: CustomWorld) {
  // Send listing to AI analysis endpoint
  const response = await this.page.evaluate(async (listing) => {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing }),
    });
    return res.json();
  }, this.currentListing);

  this.analysisResult = response;
  console.log('✅ AI analysis complete:', this.analysisResult);

  await this.screenshot('ai-analysis-complete');
});

When('the AI calculates estimated value', async function (this: CustomWorld) {
  const response = await this.page.evaluate(async (listing) => {
    const res = await fetch('/api/ai/estimate-value', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing }),
    });
    return res.json();
  }, this.currentListing);

  this.analysisResult = response;
  console.log('✅ Value estimation complete');
});

When('I view the flippability analysis', async function (this: CustomWorld) {
  // Navigate to analysis page
  await this.page.goto(`/opportunities/${this.currentListing.id || 'test'}`);

  // Wait for analysis to load
  const analysisSection = this.page.locator('[data-testid="flippability-analysis"]');
  await expect(analysisSection).toBeVisible({ timeout: 10000 });

  await this.screenshot('viewing-flippability-analysis');
});

// ==================== SCORE ASSERTIONS ====================

Then(
  'the flippability score should be between {int} and {int}',
  async function (this: CustomWorld, min: number, max: number) {
    const score = this.analysisResult?.flippabilityScore;

    expect(score).toBeGreaterThanOrEqual(min);
    expect(score).toBeLessThanOrEqual(max);

    console.log(`✅ Score ${score} is between ${min}-${max}`);
  }
);

Then(
  'the flippability score should be below {int}',
  async function (this: CustomWorld, maxScore: number) {
    const score = this.analysisResult?.flippabilityScore;

    expect(score).toBeLessThan(maxScore);
    console.log(`✅ Score ${score} is below ${maxScore}`);
  }
);

Then(
  'the flippability score should be above {int}',
  async function (this: CustomWorld, minScore: number) {
    const score = this.analysisResult?.flippabilityScore;

    expect(score).toBeGreaterThan(minScore);
    console.log(`✅ Score ${score} is above ${minScore}`);
  }
);

Then(
  'the confidence level should be {string}',
  async function (this: CustomWorld, expectedConfidence: string) {
    const confidence = this.analysisResult?.confidence;

    expect(confidence.toLowerCase()).toBe(expectedConfidence.toLowerCase());
    console.log(`✅ Confidence level: ${confidence}`);
  }
);

// ==================== PROFIT CALCULATION ====================

Then(
  'the estimated profit should be calculated as:',
  async function (this: CustomWorld, dataTable) {
    const expected = dataTable.rowsHash();
    const profit = this.analysisResult?.profitEstimate;

    // Parse expected values
    const expectedBuyPrice = parseFloat(expected['Buy Price'].replace(/[^0-9.]/g, ''));
    const expectedMarketValue = parseFloat(expected['Market Value'].replace(/[^0-9.]/g, ''));
    const expectedFees = parseFloat(expected['Fees (15%)'].replace(/[^0-9.]/g, ''));
    const expectedNetProfit = parseFloat(expected['Net Profit'].replace(/[^0-9.]/g, ''));

    // Verify calculations (allow 1% tolerance)
    expect(profit.buyPrice).toBeCloseTo(expectedBuyPrice, 0);
    expect(profit.marketValue).toBeCloseTo(expectedMarketValue, 0);
    expect(profit.fees).toBeCloseTo(expectedFees, 0);
    expect(profit.netProfit).toBeCloseTo(expectedNetProfit, 0);

    console.log('✅ Profit calculations verified');
    await this.screenshot('profit-breakdown');
  }
);

// ==================== RISK ANALYSIS ====================

Then(
  'the risk factors should include {string}',
  async function (this: CustomWorld, riskFactor: string) {
    const riskFactors = this.analysisResult?.riskFactors || [];

    const found = riskFactors.some((factor: string) =>
      factor.toLowerCase().includes(riskFactor.toLowerCase())
    );

    expect(found).toBeTruthy();
    console.log(`✅ Risk factor found: ${riskFactor}`);
  }
);

Then(
  'the difficulty rating should be {string}',
  async function (this: CustomWorld, expectedDifficulty: string) {
    const difficulty = this.analysisResult?.difficulty;

    expect(difficulty.toLowerCase()).toBe(expectedDifficulty.toLowerCase());
    console.log(`✅ Difficulty: ${difficulty}`);
  }
);

Then(
  'the difficulty rating should be {string} or {string}',
  async function (this: CustomWorld, difficulty1: string, difficulty2: string) {
    const difficulty = this.analysisResult?.difficulty?.toLowerCase();

    const matches =
      difficulty === difficulty1.toLowerCase() || difficulty === difficulty2.toLowerCase();
    expect(matches).toBeTruthy();

    console.log(`✅ Difficulty: ${difficulty}`);
  }
);

Then('the difficulty rating should increase', async function (this: CustomWorld) {
  const difficulty = this.analysisResult?.difficulty;

  // Medium or High indicates increased difficulty
  expect(['medium', 'high']).toContain(difficulty.toLowerCase());
  console.log(`✅ Difficulty increased to: ${difficulty}`);
});

// ==================== BRAND & CONDITION ANALYSIS ====================

Then('the analysis should show {string}', async function (this: CustomWorld, expectedText: string) {
  const analysisText = JSON.stringify(this.analysisResult);

  expect(analysisText.toLowerCase()).toContain(expectedText.toLowerCase());
  console.log(`✅ Analysis contains: ${expectedText}`);
});

// ==================== SHIPPING & LOGISTICS ====================

Then('the {string} flag should be false', async function (this: CustomWorld, flagName: string) {
  const value = this.analysisResult?.[flagName];

  expect(value).toBe(false);
  console.log(`✅ ${flagName} = false`);
});

Then('a warning should show {string}', async function (this: CustomWorld, warningText: string) {
  const warnings = this.analysisResult?.warnings || [];

  const found = warnings.some((w: string) => w.includes(warningText));
  expect(found).toBeTruthy();

  console.log(`✅ Warning found: ${warningText}`);
});

// ==================== PRICE HISTORY ====================

Then('I should see a price history chart', async function (this: CustomWorld) {
  const chart = this.page.locator('[data-testid="price-history-chart"]');
  await expect(chart).toBeVisible();

  await this.screenshot('price-history-chart-visible');
});

Then(
  'the average sold price should be displayed as {string}',
  async function (this: CustomWorld, expectedAverage: string) {
    const averageElement = this.page.locator('[data-testid="average-sold-price"]');
    const averageText = await averageElement.textContent();

    expect(averageText).toContain(expectedAverage);
    console.log(`✅ Average price: ${averageText}`);
  }
);

Then(
  'the recommended list price should be {string}',
  async function (this: CustomWorld, priceRange: string) {
    const recommendedElement = this.page.locator('[data-testid="recommended-price"]');
    const recommendedText = await recommendedElement.textContent();

    expect(recommendedText).toContain(priceRange);
    console.log(`✅ Recommended price: ${recommendedText}`);
  }
);

// ==================== CONDITION MULTIPLIERS ====================

Then(
  'the condition multiplier should be approximately {float}',
  async function (this: CustomWorld, expectedMultiplier: number) {
    const multiplier = this.analysisResult?.conditionMultiplier;

    // Allow 10% tolerance
    expect(multiplier).toBeCloseTo(expectedMultiplier, 1);
    console.log(`✅ Condition multiplier: ${multiplier}`);
  }
);

Then(
  'the estimated resale value should be around ${int}',
  async function (this: CustomWorld, expectedValue: number) {
    const resaleValue = this.analysisResult?.estimatedResaleValue;

    // Allow $10 tolerance
    expect(Math.abs(resaleValue - expectedValue)).toBeLessThanOrEqual(10);
    console.log(`✅ Estimated resale value: $${resaleValue}`);
  }
);

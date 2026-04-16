/**
 * @file test/acceptance/step_definitions/E-013-scoring-refinement.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-15
 * @version 1.0
 * @brief Step definitions for Story 13.7 — Collaborative Scoring Algorithm Refinement.
 *
 * @description
 * Service-level BDD steps that verify the refined scoring algorithm outputs.
 * All ACs in Story 13.7 are calculation/logic requirements (category multipliers,
 * brand boosts, formula weights, threshold behavior) — service-level tests are
 * the correct level per the story DoD.
 *
 * AC #8 (decision log) is verified via file-system check.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { estimateValue, detectCategory, EstimationResult } from '../../../src/lib/value-estimator';
import { analyzeListing, AnalyzedListing } from '../../../src/lib/marketplace-scanner';

// ==================== Shared state per scenario ====================

interface ScenarioWorld {
  listingInput?: {
    title: string;
    price: number;
    condition: string;
    category: string;
    feeRate?: number;
    profitPotential?: number;
    valueScore?: number;
  };
  estimation?: EstimationResult;
  analyzed?: AnalyzedListing;
  genericEstimation?: EstimationResult;
  detectedCategories?: string[];
  refinementLogContent?: string;
}

// ==================== Given: Listing inputs ====================

Given(
  'an electronics listing priced at {int} with good condition',
  function (this: ScenarioWorld, price: number) {
    this.listingInput = { title: 'Generic gadget', price, condition: 'good', category: 'electronics' };
  }
);

Given(
  'a musical listing priced at {int} with new condition',
  function (this: ScenarioWorld, price: number) {
    this.listingInput = { title: 'Generic instrument', price, condition: 'new', category: 'musical' };
  }
);

Given(
  'a generic collectibles listing priced at {int} with good condition',
  function (this: ScenarioWorld, price: number) {
    this.listingInput = { title: 'Generic item', price, condition: 'good', category: 'collectibles' };
  }
);

Given(
  'a {string} listing priced at {int}',
  function (this: ScenarioWorld, title: string, price: number) {
    this.listingInput = { title, price, condition: 'good', category: 'default' };
  }
);

Given(
  'a {string} listing priced at {int} in default category',
  function (this: ScenarioWorld, title: string, price: number) {
    this.listingInput = { title, price, condition: 'good', category: 'default' };
  }
);

Given(
  'a default-category listing with asking price {int}, new condition, {int}% fee',
  function (this: ScenarioWorld, price: number, feePct: number) {
    this.listingInput = { title: 'Generic item', price, condition: 'new', category: 'default', feeRate: feePct / 100 };
  }
);

Given('the item has ${int} profit potential', function (this: ScenarioWorld, _profit: number) {
  // Marker step — combined with the preceding Given to set up controlled inputs
});

Given(
  /^a collectibles listing priced at (\d+) with new condition and vintage\/rare\/sealed tags$/,
  function (this: ScenarioWorld, price: string) {
    this.listingInput = {
      title: 'Vintage Rare Limited Edition sealed item',
      price: parseInt(price, 10),
      condition: 'new',
      category: 'collectibles',
    };
  }
);

Given(
  'a raw listing with value score of {int} and profit potential of {int}',
  function (this: ScenarioWorld, score: number, profit: number) {
    this.listingInput = {
      title: 'Test listing',
      price: 100,
      condition: 'good',
      category: 'default',
      valueScore: score,
      profitPotential: profit,
    };
  }
);

Given(
  'analyzeListing is called with a listing producing valueScore {int} and profitPotential {int}',
  function (this: ScenarioWorld, _score: number, profit: number) {
    // Call the real analyzeListing() to exercise the actual isOpportunity logic.
    // threshold=0 bypasses score check so we isolate the profit-floor behavior.
    // default category (1.2-1.5), new (1.0), 0% fee → profitPotential ≈ round(0.35 * asking).
    // profit<25: asking=$57 → profit=20. profit>=25: asking=$143 → profit=51.
    const askingPrice = profit < 25 ? 57 : 143;
    this.analyzed = analyzeListing('craigslist', {
      title: 'Test item for profit floor',
      externalId: 'profit-floor-test',
      url: 'http://test',
      askingPrice,
      description: null,
      condition: 'new',
      category: 'default',
    } as Parameters<typeof analyzeListing>[1], {
      opportunityThreshold: 0,
      opportunityMinProfit: 25,
      feeRate: 0,
    });
  }
);

Given(
  'listings titled {string}, {string}, {string}, {string}',
  function (this: ScenarioWorld, t1: string, t2: string, t3: string, t4: string) {
    this.detectedCategories = [t1, t2, t3, t4].map((t) => detectCategory(t, null));
  }
);

Given('the scoring refinement session has been completed', function (this: ScenarioWorld) {
  // Marker — verification happens in the Then step
});

// ==================== When: Run the algorithm ====================

When('the scoring algorithm runs', function (this: ScenarioWorld) {
  if (!this.listingInput) throw new Error('No listing input set');
  const li = this.listingInput;
  this.estimation = estimateValue(li.title, null, li.price, li.condition, li.category, li.feeRate);

  // For brand-boost comparison scenarios, also score a generic version
  const genericTitle = li.title.toLowerCase().includes('milwaukee') ? 'Generic drill' :
                       li.title.toLowerCase().includes('fender') ? 'Generic guitar' :
                       li.title.toLowerCase().includes('moog') ? 'Generic synthesizer' :
                       'Generic item';
  this.genericEstimation = estimateValue(genericTitle, null, li.price, li.condition, li.category, li.feeRate);
});

When('the listing is analyzed', function (this: ScenarioWorld) {
  if (!this.listingInput) throw new Error('No listing input set');
  const li = this.listingInput;
  // For opportunity-floor tests, we construct a listing that produces the desired score/profit
  // by controlling the inputs. Easier path: call analyzeListing directly and inspect.
  this.analyzed = analyzeListing('craigslist', {
    title: li.title,
    externalId: 'test',
    url: 'http://test',
    askingPrice: li.price,
    description: null,
    condition: li.condition,
    category: li.category,
  } as Parameters<typeof analyzeListing>[1]);
});

When('category detection runs on each', function (this: ScenarioWorld) {
  // Already done in the Given step
});

When('the refinement log is inspected', function (this: ScenarioWorld) {
  const logPath = path.resolve(process.cwd(), 'docs/scoring-refinement-log.md');
  this.refinementLogContent = fs.readFileSync(logPath, 'utf-8');
});

// ==================== Then: Assertions ====================

Then(
  'the estimated low should be at least {int}',
  function (this: ScenarioWorld, minLow: number) {
    assert.ok(
      this.estimation!.estimatedLow >= minLow,
      `Expected estimatedLow >= ${minLow}, got ${this.estimation!.estimatedLow}`
    );
  }
);

Then(
  'the estimated high should be at most {int}',
  function (this: ScenarioWorld, maxHigh: number) {
    assert.ok(
      this.estimation!.estimatedHigh <= maxHigh,
      `Expected estimatedHigh <= ${maxHigh}, got ${this.estimation!.estimatedHigh}`
    );
  }
);

Then(
  'the estimated value should reflect a {float}x-{float}x markup',
  function (this: ScenarioWorld, minMult: number, maxMult: number) {
    const price = this.listingInput!.price;
    // With condition multiplier for "new" = 1.0
    const expectedLow = price * minMult;
    const expectedHigh = price * maxMult;
    assert.ok(
      this.estimation!.estimatedLow >= expectedLow * 0.9,
      `Expected estimatedLow near ${expectedLow}, got ${this.estimation!.estimatedLow}`
    );
    assert.ok(
      this.estimation!.estimatedHigh <= expectedHigh * 1.1,
      `Expected estimatedHigh near ${expectedHigh}, got ${this.estimation!.estimatedHigh}`
    );
  }
);

Then('the resale difficulty should be EASY or VERY_EASY', function (this: ScenarioWorld) {
  const diff = this.estimation!.resaleDifficulty;
  assert.ok(
    diff === 'EASY' || diff === 'VERY_EASY',
    `Expected EASY or VERY_EASY difficulty, got ${diff}`
  );
});

Then(
  'the tags should include {string}',
  function (this: ScenarioWorld, tag: string) {
    assert.ok(
      this.estimation!.tags.includes(tag),
      `Expected tags to include "${tag}", got: ${this.estimation!.tags.join(', ')}`
    );
  }
);

Then(
  'a generic drill at the same price should score lower',
  function (this: ScenarioWorld) {
    assert.ok(
      this.estimation!.valueScore > this.genericEstimation!.valueScore,
      `Expected branded item (score=${this.estimation!.valueScore}) to outscore generic (score=${this.genericEstimation!.valueScore})`
    );
  }
);

Then('the vintage tag should be applied', function (this: ScenarioWorld) {
  assert.ok(
    this.estimation!.tags.includes('vintage'),
    `Expected vintage tag. Got tags: ${this.estimation!.tags.join(', ')}`
  );
});

Then(
  'the estimated value should reflect a {float}x boost, not {float}x',
  function (this: ScenarioWorld, newBoost: number, _oldBoost: number) {
    // The vintage boost is now 1.3 (was 1.4). For default category (1.2-1.5), good cond (0.75), asking 100:
    // new: estLow = 100*1.2*0.75*1.3 = 117, estHigh = 100*1.5*0.75*1.3 = 146
    // old: estLow = 100*1.2*0.75*1.4 = 126, estHigh = 100*1.5*0.75*1.4 = 158
    const price = this.listingInput!.price;
    const expectedMax = price * 1.5 * 0.75 * newBoost * 1.05;
    assert.ok(
      this.estimation!.estimatedHigh <= expectedMax,
      `Expected estimatedHigh <= ~${Math.round(expectedMax)} (for ${newBoost}x boost), got ${this.estimation!.estimatedHigh}`
    );
  }
);

Then('the value score should be {int}', function (this: ScenarioWorld, expected: number) {
  assert.strictEqual(this.estimation!.valueScore, expected);
});

Then(
  'the profit potential should exceed {int}',
  function (this: ScenarioWorld, threshold: number) {
    assert.ok(
      this.estimation!.profitPotential > threshold,
      `Expected profitPotential > ${threshold}, got ${this.estimation!.profitPotential}`
    );
  }
);

Then(
  'the value score should be {int} \\(capped)',
  function (this: ScenarioWorld, expected: number) {
    assert.strictEqual(this.estimation!.valueScore, expected);
  }
);

Then('isOpportunity should be false', function (this: ScenarioWorld) {
  assert.strictEqual(this.analyzed!.isOpportunity, false);
});

Then('isOpportunity should be true', function (this: ScenarioWorld) {
  assert.strictEqual(this.analyzed!.isOpportunity, true);
});

Then('the analyzed listing isOpportunity should be false', function (this: ScenarioWorld) {
  assert.strictEqual(this.analyzed!.isOpportunity, false);
});

Then('the analyzed listing isOpportunity should be true', function (this: ScenarioWorld) {
  assert.strictEqual(this.analyzed!.isOpportunity, true);
});

Then('docs\\/scoring-refinement-log.md should exist', function (this: ScenarioWorld) {
  assert.ok(this.refinementLogContent && this.refinementLogContent.length > 0);
});

Then(
  'it should contain sections for category multipliers, brand boosts, formula tuning, and threshold calibration',
  function (this: ScenarioWorld) {
    const content = this.refinementLogContent!;
    assert.ok(/category multiplier/i.test(content), 'Missing category multiplier section');
    assert.ok(/brand boost/i.test(content), 'Missing brand boost section');
    assert.ok(/formula/i.test(content), 'Missing formula section');
    assert.ok(/threshold/i.test(content), 'Missing threshold section');
  }
);

Then('it should document the before\\/after backtesting comparison', function (this: ScenarioWorld) {
  assert.ok(/before.*after|after.*before/i.test(this.refinementLogContent!));
});

Then(
  'each should be categorized as electronics, not other',
  function (this: ScenarioWorld) {
    for (const cat of this.detectedCategories!) {
      assert.strictEqual(cat, 'electronics', `Expected electronics, got ${cat}`);
    }
  }
);

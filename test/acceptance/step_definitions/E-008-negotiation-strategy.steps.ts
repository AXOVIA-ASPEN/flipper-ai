/**
 * @file test/acceptance/step_definitions/E-008-negotiation-strategy.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-31
 * @version 1.0
 * @brief Step definitions for E-008: Negotiation Strategy (story 8.2).
 *
 * @description
 * Tests AI negotiation strategy generation and counter-offer analysis by calling
 * the actual generateFallbackStrategy and fallback counter-offer analysis functions
 * from src/lib/negotiation-strategy.ts. Scenarios S-17 through S-29 validate
 * FR-COMM-03 (AI negotiation strategy, market data recommendations, counter-offer
 * analysis, algorithmic fallback).
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import {
  generateFallbackStrategy,
  generateFallbackCounterAnalysis,
} from '../../../src/lib/negotiation-strategy';
import type {
  NegotiationStrategyInput,
  NegotiationStrategy,
  CounterOfferAnalysis,
} from '../../../src/lib/negotiation-strategy';

// Shared scenario state
let negotiationInput: NegotiationStrategyInput;
let negotiationStrategy: NegotiationStrategy;
let counterOfferResult: CounterOfferAnalysis;
let aiUnavailableForNegotiation = false;

// ── Given: Negotiation listing setup ─────────────────────────────────────────

Given(
  'a listing for negotiation with asking price {int} and market value {int} on {string}',
  function (askingPrice: number, marketValue: number, platform: string) {
    aiUnavailableForNegotiation = false;
    negotiationInput = {
      listingId: 'test-listing-negotiation',
      askingPrice,
      verifiedMarketValue: marketValue,
      estimatedValue: marketValue - 10,
      condition: 'Good',
      daysListed: 10,
      negotiable: true,
      demandLevel: 'medium',
      sellabilityScore: 70,
      platform,
      recommendedOffer: null,
      marketDataDate: null,
    };
  }
);

Given(
  'a listing for negotiation with asking price {int} and estimated value {int} on {string}',
  function (askingPrice: number, estimatedValue: number, platform: string) {
    aiUnavailableForNegotiation = false;
    negotiationInput = {
      listingId: 'test-listing-negotiation',
      askingPrice,
      verifiedMarketValue: null,
      estimatedValue,
      condition: 'Good',
      daysListed: 10,
      negotiable: true,
      demandLevel: 'medium',
      sellabilityScore: 70,
      platform,
      recommendedOffer: null,
      marketDataDate: null,
    };
  }
);

Given('the listing has demand level {string}', function (demandLevel: string) {
  negotiationInput.demandLevel = demandLevel;
});

Given('the listing has been listed for {int} days', function (days: number) {
  negotiationInput.daysListed = days;
});

Given('the listing is marked as non-negotiable', function () {
  negotiationInput.negotiable = false;
});

Given('the listing has no verified market value', function () {
  negotiationInput.verifiedMarketValue = null;
});

Given('the AI API is unavailable for negotiation', function () {
  aiUnavailableForNegotiation = true;
});

// ── When: Strategy generation ────────────────────────────────────────────────

When('the negotiation strategy is generated', function () {
  // Always use fallback strategy in acceptance tests (no real OpenAI calls)
  // This tests the algorithmic strategy logic directly
  negotiationStrategy = generateFallbackStrategy(negotiationInput);
});

When(
  'the counter-offer of {int} is analyzed against our previous offer of {int}',
  function (counterPrice: number, ourOffer: number) {
    // Use the actual library fallback counter-offer analysis (algorithmic, no OpenAI)
    counterOfferResult = generateFallbackCounterAnalysis(
      negotiationInput,
      counterPrice,
      ourOffer
    );
  }
);

// ── Then: Strategy assertions ────────────────────────────────────────────────

Then('the strategy includes an initial offer price greater than {int}', function (min: number) {
  assert.ok(
    negotiationStrategy.initialOfferPrice > min,
    `Expected initial offer > ${min}, got ${negotiationStrategy.initialOfferPrice}`
  );
});

Then(
  'the strategy includes a walk-away price greater than or equal to the initial offer',
  function () {
    assert.ok(
      negotiationStrategy.walkAwayPrice >= negotiationStrategy.initialOfferPrice,
      `Walk-away (${negotiationStrategy.walkAwayPrice}) should be >= initial offer (${negotiationStrategy.initialOfferPrice})`
    );
  }
);

Then('the strategy includes negotiation tactics', function () {
  assert.ok(
    Array.isArray(negotiationStrategy.negotiationTactics) &&
      negotiationStrategy.negotiationTactics.length > 0,
    'Expected at least one negotiation tactic'
  );
});

Then('the strategy includes counter-offer suggestions', function () {
  assert.ok(
    Array.isArray(negotiationStrategy.counterOfferSuggestions) &&
      negotiationStrategy.counterOfferSuggestions.length > 0,
    'Expected at least one counter-offer suggestion'
  );
});

Then('the strategy includes a confidence level', function () {
  assert.ok(
    ['low', 'medium', 'high'].includes(negotiationStrategy.confidence),
    `Expected valid confidence level, got "${negotiationStrategy.confidence}"`
  );
});

Then('the strategy includes a disclaimer', function () {
  assert.ok(
    negotiationStrategy.disclaimer && negotiationStrategy.disclaimer.length > 0,
    'Expected non-empty disclaimer'
  );
});

Then('the initial offer is closer to asking price than default', function () {
  // Generate default strategy (medium demand) for comparison
  const defaultInput = { ...negotiationInput, demandLevel: 'medium' };
  const defaultResult = generateFallbackStrategy(defaultInput);

  assert.ok(
    negotiationStrategy.initialOfferPrice > defaultResult.initialOfferPrice,
    `High-demand offer (${negotiationStrategy.initialOfferPrice}) should be higher than default (${defaultResult.initialOfferPrice})`
  );
});

Then('the initial offer is more aggressive than default', function () {
  // Generate default strategy (10 days) for comparison
  const defaultInput = { ...negotiationInput, daysListed: 10 };
  const defaultResult = generateFallbackStrategy(defaultInput);

  assert.ok(
    negotiationStrategy.initialOfferPrice < defaultResult.initialOfferPrice,
    `Stale listing offer (${negotiationStrategy.initialOfferPrice}) should be lower than default (${defaultResult.initialOfferPrice})`
  );
});

Then('the initial offer is close to asking price', function () {
  // Non-negotiable: 95% of asking price
  const expectedOffer = Math.round(negotiationInput.askingPrice * 0.95);
  assert.strictEqual(
    negotiationStrategy.initialOfferPrice,
    expectedOffer,
    `Expected offer close to asking (${expectedOffer}), got ${negotiationStrategy.initialOfferPrice}`
  );
});

Then('the strategy walk-away price reflects {int}% platform fees', function (feePercent: number) {
  // For Craigslist (0% fee), walk-away should be higher than eBay (13% fee)
  const marketValue =
    negotiationInput.verifiedMarketValue ??
    negotiationInput.estimatedValue ??
    negotiationInput.askingPrice;
  const feeRate = feePercent / 100;
  const expectedMaxPayable = Math.round(marketValue * (1 - feeRate) - 10);

  assert.ok(
    negotiationStrategy.walkAwayPrice <= expectedMaxPayable + 1, // +1 for rounding
    `Walk-away (${negotiationStrategy.walkAwayPrice}) should be <= max payable (${expectedMaxPayable}) with ${feePercent}% fees`
  );
});

Then('the strategy is generated successfully with low or medium confidence', function () {
  assert.ok(
    ['low', 'medium'].includes(negotiationStrategy.confidence),
    `Expected low or medium confidence without verified market value, got "${negotiationStrategy.confidence}"`
  );
});

Then('the strategy is marked as fallback', function () {
  assert.strictEqual(
    negotiationStrategy.isFallback,
    true,
    'Expected strategy to be marked as fallback'
  );
});

Then('the initial offer reflects aging listing discount', function () {
  // For a listing aged 20 days: base 0.85 - 0.05 = 0.80 (80% of asking)
  const expectedOffer = Math.round(negotiationInput.askingPrice * 0.80);
  assert.strictEqual(
    negotiationStrategy.initialOfferPrice,
    expectedOffer,
    `Expected aging discount offer (${expectedOffer}), got ${negotiationStrategy.initialOfferPrice}`
  );
});

// ── Then: Counter-offer assertions ───────────────────────────────────────────

Then('the recommendation is {string}', function (expected: string) {
  assert.strictEqual(
    counterOfferResult.recommendation,
    expected,
    `Expected recommendation "${expected}", got "${counterOfferResult.recommendation}"`
  );
});

Then('a suggested counter price is provided', function () {
  assert.ok(
    counterOfferResult.suggestedCounterPrice != null &&
      counterOfferResult.suggestedCounterPrice > 0,
    `Expected suggested counter price > 0, got ${counterOfferResult.suggestedCounterPrice}`
  );
});

Then('the reasoning mentions price escalation', function () {
  assert.ok(
    counterOfferResult.reasoning.toLowerCase().includes('price escalation') ||
      counterOfferResult.reasoning.toLowerCase().includes('escalation'),
    `Expected reasoning to mention price escalation, got: "${counterOfferResult.reasoning}"`
  );
});

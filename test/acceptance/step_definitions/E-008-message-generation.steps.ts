/**
 * @file test/acceptance/step_definitions/E-008-message-generation.steps.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-03-30
 * @version 1.0
 * @brief Step definitions for E-008: Seller Communication (story 8.1).
 *
 * @description
 * Tests AI message generation by calling the actual generatePurchaseMessage
 * and generateFallbackMessage functions from src/lib/message-generator.ts.
 * Scenarios S-1 through S-16 validate FR-COMM-01 (AI purchase message
 * generation, draft display, template fallback) and FR-COMM-02 (multiple
 * message types). API route structure is validated via code inspection.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import {
  generatePurchaseMessage,
  generateFallbackMessage,
  getPlatformTone,
} from '../../../src/lib/message-generator';
import type { MessageGeneratorInput, GeneratedMessage, MessageType } from '../../../src/lib/message-generator';
import * as fs from 'fs';
import * as path from 'path';

// Shared scenario state
let listingInput: MessageGeneratorInput;
let generatedMessage: GeneratedMessage;
let apiUnavailable: boolean;
let sellerName: string | null;
let offerPrice: number | null;

// Reset state before each scenario
Given('a listing on {string} with title {string} priced at {int}', function (
  platform: string,
  title: string,
  price: number
) {
  apiUnavailable = false;
  sellerName = null;
  offerPrice = null;
  listingInput = {
    listingTitle: title,
    askingPrice: price,
    platform,
    sellerName: null,
    messageType: 'inquiry',
    offerPrice: null,
    itemCondition: null,
    additionalContext: null,
  };
});

Given('the seller name is {string}', function (name: string) {
  sellerName = name;
  listingInput.sellerName = name;
});

Given('the buyer offers {int}', function (price: number) {
  offerPrice = price;
  listingInput.offerPrice = price;
});

Given('the AI API is unavailable', function () {
  apiUnavailable = true;
});

// ── When: Message generation actions ──────────────────────────────────────

When('the message generator creates a purchase message', async function () {
  if (apiUnavailable) {
    // Explicitly use fallback path when AI is declared unavailable
    generatedMessage = generateFallbackMessage(listingInput);
  } else {
    // Exercise the full production code path: generatePurchaseMessage checks
    // for OPENAI_API_KEY and falls back to templates when absent. This tests
    // the real function including validation and API-key detection logic.
    generatedMessage = await generatePurchaseMessage(listingInput);
  }
});

When('the message generator creates a {string} message', async function (messageType: string) {
  listingInput.messageType = messageType as MessageType;
  if (apiUnavailable) {
    generatedMessage = generateFallbackMessage(listingInput);
  } else {
    generatedMessage = await generatePurchaseMessage(listingInput);
  }
});

// ── Then: Tone assertions ─────────────────────────────────────────────────

Then('the generated message has a {string} tone', function (expectedTone: string) {
  assert.strictEqual(
    generatedMessage.tone,
    expectedTone,
    `Expected tone "${expectedTone}" but got "${generatedMessage.tone}"`
  );
});

Then('the generated message platform is {string}', function (expectedPlatform: string) {
  assert.strictEqual(
    generatedMessage.platform,
    expectedPlatform,
    `Expected platform "${expectedPlatform}" but got "${generatedMessage.platform}"`
  );
});

// ── Then: Message type assertions ─────────────────────────────────────────

Then('the generated message type is {string}', function (expectedType: string) {
  assert.strictEqual(
    generatedMessage.messageType,
    expectedType,
    `Expected message type "${expectedType}" but got "${generatedMessage.messageType}"`
  );
});

// ── Then: Content assertions ──────────────────────────────────────────────

Then('the generated message contains a subject line', function () {
  assert.ok(
    generatedMessage.subject && generatedMessage.subject.length > 0,
    'Expected non-empty subject line'
  );
});

Then('the generated message contains a body', function () {
  assert.ok(
    generatedMessage.body && generatedMessage.body.length > 0,
    'Expected non-empty body'
  );
});

Then('the generated message has a non-empty subject', function () {
  assert.ok(
    generatedMessage.subject && generatedMessage.subject.length > 0,
    'Expected non-empty subject'
  );
});

Then('the generated message has a non-empty body', function () {
  assert.ok(
    generatedMessage.body && generatedMessage.body.length > 0,
    'Expected non-empty body'
  );
});

Then('the generated message body references the seller {string}', function (name: string) {
  assert.ok(
    generatedMessage.body.includes(name),
    `Expected body to reference seller "${name}" but got: "${generatedMessage.body}"`
  );
});

Then('the generated message can be edited before sending', function () {
  // The message is returned as a GeneratedMessage object with mutable subject/body
  // This validates the structural contract that messages are editable drafts
  assert.ok(typeof generatedMessage.subject === 'string', 'Subject should be a string (editable)');
  assert.ok(typeof generatedMessage.body === 'string', 'Body should be a string (editable)');
  // Verify the message is not marked as sent
  assert.ok(!('sentAt' in generatedMessage), 'Draft message should not have sentAt');
});

// ── Then: Fallback assertions ─────────────────────────────────────────────

Then('the generated message is a fallback template', function () {
  assert.strictEqual(
    generatedMessage.isFallback,
    true,
    'Expected message to be a fallback template'
  );
});

Then('the generated message body contains a price placeholder', function () {
  assert.ok(
    generatedMessage.body.includes('[your price]'),
    `Expected body to contain "[your price]" placeholder but got: "${generatedMessage.body}"`
  );
});

// ── Then: API route structure assertions ──────────────────────────────────

Given('the message generation API endpoint exists at {string}', function (routePath: string) {
  const fullPath = path.resolve(process.cwd(), routePath);
  assert.ok(
    fs.existsSync(fullPath),
    `Expected API route file to exist at ${routePath}`
  );
});

Then('the route creates messages with initial status {string}', function (status: string) {
  const routePath = path.resolve(process.cwd(), 'app/api/messages/generate/route.ts');
  const content = fs.readFileSync(routePath, 'utf-8');
  // Match both single and double quotes for resilience against formatting changes
  const pattern = new RegExp(`status:\\s*['"\`]${status}['"\`]`);
  assert.ok(
    pattern.test(content),
    `Expected route to create messages with status "${status}"`
  );
});

Then('the route sets direction to {string}', function (direction: string) {
  const routePath = path.resolve(process.cwd(), 'app/api/messages/generate/route.ts');
  const content = fs.readFileSync(routePath, 'utf-8');
  const pattern = new RegExp(`direction:\\s*['"\`]${direction}['"\`]`);
  assert.ok(
    pattern.test(content),
    `Expected route to set direction to "${direction}"`
  );
});

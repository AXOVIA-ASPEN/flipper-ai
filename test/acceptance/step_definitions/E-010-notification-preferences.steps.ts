/**
 * @file test/acceptance/step_definitions/E-010-notification-preferences.steps.ts
 * @author Stephen Boyett
 * @company Axovia
 * @date 2026-04-10
 * @version 1.0
 * @brief Step definitions for E-010 Story 10.6 — Notification Preferences UI.
 *
 * @description
 * Source-inspection BDD tests for the notification preferences redesign.
 * All scenarios are source-level inspections — they read the component and
 * API route source files and assert on the presence of key identifiers,
 * patterns, and validation logic. No browser or live server required.
 *
 * Scenarios covered:
 *   - AC1 (FR-NOTIFY-12): category-based UI — all sections present
 *   - AC1 (FR-NOTIFY-12): all 12 notification toggle fields referenced
 *   - AC2 (FR-NOTIFY-12): optimistic toggle with rollback pattern
 *   - AC3 (FR-NOTIFY-12): notifyListingUnavailable default true in schema
 *   - AC3 (FR-NOTIFY-12): settings API handles notifyListingUnavailable
 *   - AC4 (FR-NOTIFY-12): Phase 2 Coming Soon placeholders
 *   - AC5 (FR-NOTIFY-09/10/12): flipGoneColdHours threshold config
 *   - AC5 (FR-NOTIFY-09/10/12): flipTurnedHotCount threshold config
 */

import { Given, Then } from '@cucumber/cucumber';
import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  sourceText: '',
  sourcePath: '',
};

// ---------------------------------------------------------------------------
// Step: Load source file
// ---------------------------------------------------------------------------

Given('the NotificationSettings component source exists at {string}', (relativePath: string) => {
  const fullPath = path.resolve(process.cwd(), relativePath);
  assert.ok(fs.existsSync(fullPath), `Component source not found: ${fullPath}`);
  state.sourcePath = fullPath;
  state.sourceText = fs.readFileSync(fullPath, 'utf8');
});

Given('the settings route source exists at {string}', (relativePath: string) => {
  const fullPath = path.resolve(process.cwd(), relativePath);
  assert.ok(fs.existsSync(fullPath), `Route source not found: ${fullPath}`);
  state.sourcePath = fullPath;
  state.sourceText = fs.readFileSync(fullPath, 'utf8');
});

// ---------------------------------------------------------------------------
// Category / label assertions
// ---------------------------------------------------------------------------

Then('the source contains the category label {string}', (label: string) => {
  assert.ok(
    state.sourceText.includes(label),
    `Expected source to contain category label "${label}"`
  );
});

// ---------------------------------------------------------------------------
// Field reference assertions
// ---------------------------------------------------------------------------

Then('the source references the field {string}', (field: string) => {
  assert.ok(
    state.sourceText.includes(field),
    `Expected source to reference field "${field}"`
  );
});

// ---------------------------------------------------------------------------
// Optimistic toggle pattern
// ---------------------------------------------------------------------------

Then('the source contains {string}', (pattern: string) => {
  assert.ok(
    state.sourceText.includes(pattern),
    `Expected source to contain "${pattern}"`
  );
});

Then('the source uses the PATCH method for saving toggles', () => {
  assert.ok(
    state.sourceText.includes("method: 'PATCH'") || state.sourceText.includes('method: "PATCH"'),
    'Expected source to use PATCH method for saving toggles'
  );
});

// ---------------------------------------------------------------------------
// Phase 2 Coming Soon
// ---------------------------------------------------------------------------

Then('the source renders disabled push toggle buttons for each event row', () => {
  // Story 11.3 replaces literal "Coming Soon" placeholders with a real ToggleButton
  // wired to a `channel="Push"` prop and disabled via `pushDisabled`/`disabled`. Accept
  // either the legacy phrasing or the canonical channel="Push" + disabled wiring.
  const src = state.sourceText;
  const hasPushChannel = src.includes('channel="Push"') || src.includes("channel='Push'");
  const hasPushDisabled = src.includes('pushDisabled') || src.includes('pushColumnDisabled');
  const hasLegacyPhrasing =
    src.includes('Push notifications for') || src.includes('push notification');
  assert.ok(
    hasLegacyPhrasing || (hasPushChannel && hasPushDisabled),
    'Expected source to render disabled push toggle buttons (legacy phrasing OR ToggleButton channel="Push" + pushDisabled)'
  );
});

Then('the source renders disabled SMS toggle buttons for each event row', () => {
  const src = state.sourceText;
  const hasSmsChannel = src.includes('channel="SMS"') || src.includes("channel='SMS'");
  const hasSmsDisabled = src.includes('smsDisabled') || src.includes('smsColumnDisabled');
  const hasLegacyPhrasing =
    src.includes('SMS notifications for') || src.includes('sms notification');
  assert.ok(
    hasLegacyPhrasing || (hasSmsChannel && hasSmsDisabled),
    'Expected source to render disabled SMS toggle buttons (legacy phrasing OR ToggleButton channel="SMS" + smsDisabled)'
  );
});

// ---------------------------------------------------------------------------
// Threshold validation
// ---------------------------------------------------------------------------

Then('the source validates flipGoneColdHours minimum of {int} and maximum of {int}', (min: number, max: number) => {
  const src = state.sourceText;
  assert.ok(src.includes('flipGoneColdHours'), 'Expected source to reference flipGoneColdHours');
  // Check for lower-bound comparison pattern (e.g., "hours < 1" or "< 1" near flipGoneColdHours)
  const lowerBound = new RegExp(`hours\\s*<\\s*${min}|between ${min} and ${max}`);
  assert.ok(
    lowerBound.test(src),
    `Expected source to enforce flipGoneColdHours lower bound (< ${min})`
  );
  // Check for upper-bound comparison pattern (e.g., "hours > 168")
  const upperBound = new RegExp(`hours\\s*>\\s*${max}|between ${min} and ${max}`);
  assert.ok(
    upperBound.test(src),
    `Expected source to enforce flipGoneColdHours upper bound (> ${max})`
  );
});

Then('the source validates flipTurnedHotCount minimum of {int} and maximum of {int}', (min: number, max: number) => {
  const src = state.sourceText;
  assert.ok(src.includes('flipTurnedHotCount'), 'Expected source to reference flipTurnedHotCount');
  // Check for lower-bound comparison pattern (e.g., "count < 1")
  const lowerBound = new RegExp(`count\\s*<\\s*${min}|between ${min} and ${max}`);
  assert.ok(
    lowerBound.test(src),
    `Expected source to enforce flipTurnedHotCount lower bound (< ${min})`
  );
  // Check for upper-bound comparison pattern (e.g., "count > 20")
  const upperBound = new RegExp(`count\\s*>\\s*${max}|between ${min} and ${max}`);
  assert.ok(
    upperBound.test(src),
    `Expected source to enforce flipTurnedHotCount upper bound (> ${max})`
  );
});

// ---------------------------------------------------------------------------
// Settings API route assertions
// ---------------------------------------------------------------------------

Then('the source extracts {string} from the request body', (field: string) => {
  assert.ok(
    state.sourceText.includes(field),
    `Expected settings route to extract "${field}" from the request body`
  );
});

Then('the source applies Boolean coercion to {string}', (field: string) => {
  // Look for Boolean(...) coercion applied to the field
  const pattern = new RegExp(`Boolean\\(${field}\\)`);
  assert.ok(
    pattern.test(state.sourceText),
    `Expected source to apply Boolean() coercion to "${field}"`
  );
});

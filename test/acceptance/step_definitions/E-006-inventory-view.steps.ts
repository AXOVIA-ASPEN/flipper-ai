/**
 * @file test/acceptance/step_definitions/E-006-inventory-view.steps.ts
 * @author Stephen Boyett
 * @company Silverline Software
 * @date 2026-03-08
 * @version 1.0
 * @brief BDD step definitions for Story 6.6 inventory view and SSE updates.
 *
 * @description
 * Uses static code analysis to verify:
 *   - Inventory view filters PURCHASED items and renders holding cost fields (AC #1)
 *   - Aging inventory flag at 30+ days (AC #2)
 *   - Dashboard SSE integration for real-time data refresh (AC #3)
 *   - SSE error banner and exponential backoff reconnection (AC #4)
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();

function readSourceFile(relativePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

// ==================== Given ====================

Given('the holding cost utility at {string}', function (filePath: string) {
  this.fileContent = readSourceFile(filePath);
  this.filePath = filePath;
});

// ==================== When ====================

When('I inspect the inventory view rendering', function () {
  // fileContent already set by Given step
});

When('I inspect the isAgingInventory function', function () {
  // fileContent already set by Given step
});

When('I inspect the SSE integration', function () {
  // fileContent already set by Given step
});

When('I inspect the SSE error handling', function () {
  // fileContent already set by Given step
});

// ==================== Then — S-30: Inventory view ====================

Then('it filters opportunities to those with status {string}', function (status: string) {
  const content: string = this.fileContent;
  const hasStatusFilter =
    content.includes(`status === '${status}'`) ||
    content.includes(`opp.status === '${status}'`) ||
    content.includes(`status === "${status}"`) ||
    content.includes(`opp.status === "${status}"`);
  if (!hasStatusFilter) {
    throw new Error(`Expected opportunities page to filter by status "${status}" but found none in ${this.filePath}`);
  }
});

Then('each inventory card shows the listing title', function () {
  const content: string = this.fileContent;
  if (!content.includes('listing.title') || !content.includes('inventory')) {
    throw new Error('Expected inventory cards to display listing.title');
  }
});

Then('each inventory card shows the purchase price', function () {
  const content: string = this.fileContent;
  if (!content.includes('purchasePrice')) {
    throw new Error('Expected inventory cards to display purchasePrice');
  }
});

Then('each inventory card shows the days held computed from purchaseDate', function () {
  const content: string = this.fileContent;
  if (!content.includes('daysHeld') || !content.includes('purchaseDate')) {
    throw new Error('Expected inventory cards to compute and display daysHeld from purchaseDate');
  }
});

Then('each inventory card shows the carrying cost computed using calculateCarryingCost', function () {
  const content: string = this.fileContent;
  if (!content.includes('calculateCarryingCost') && !content.includes('carryingCost')) {
    throw new Error('Expected inventory cards to compute and display carryingCost using calculateCarryingCost');
  }
});

Then('each inventory card shows the market value from listing.estimatedValue', function () {
  const content: string = this.fileContent;
  if (!content.includes('estimatedValue')) {
    throw new Error('Expected inventory cards to display listing.estimatedValue');
  }
});

Then('when no PURCHASED items exist it renders {string} empty state text', function (emptyText: string) {
  const content: string = this.fileContent;
  if (!content.includes(emptyText)) {
    throw new Error(`Expected inventory empty state to include text "${emptyText}" in ${this.filePath}`);
  }
});

// ==================== Then — S-31: Aging inventory ====================

Then('it returns false for daysHeld of {int}', function (days: number) {
  const { isAgingInventory } = require(path.join(PROJECT_ROOT, 'src/lib/holding-cost'));
  const result: boolean = isAgingInventory(days);
  if (result !== false) {
    throw new Error(`Expected isAgingInventory(${days}) to return false, got ${result}`);
  }
});

Then('it returns true for daysHeld of {int}', function (days: number) {
  const { isAgingInventory } = require(path.join(PROJECT_ROOT, 'src/lib/holding-cost'));
  const result: boolean = isAgingInventory(days);
  if (result !== true) {
    throw new Error(`Expected isAgingInventory(${days}) to return true, got ${result}`);
  }
});

Then('the opportunities page applies an {string} badge when isAgingInventory returns true', function (badgeText: string) {
  const content = readSourceFile('app/opportunities/page.tsx');
  if (!content.includes(badgeText) || !content.includes('isAgingInventory')) {
    throw new Error(`Expected opportunities page to apply "${badgeText}" badge using isAgingInventory`);
  }
});

Then('the carrying cost is rendered with bold red styling when the item is aging', function () {
  const content = readSourceFile('app/opportunities/page.tsx');
  if (!content.includes('text-red-') || !content.includes('font-bold')) {
    throw new Error('Expected aging inventory to render carrying cost with bold red styling');
  }
});

// ==================== Then — S-32: SSE dashboard refresh ====================

Then('it imports useSseEvents from {string}', function (importPath: string) {
  const content: string = this.fileContent;
  if (!content.includes('useSseEvents') || !content.includes(importPath)) {
    throw new Error(`Expected dashboard to import useSseEvents from "${importPath}" in ${this.filePath}`);
  }
});

Then('it subscribes to {string}, {string}, and {string} event types', function (e1: string, e2: string, e3: string) {
  const content: string = this.fileContent;
  if (!content.includes(e1) || !content.includes(e2) || !content.includes(e3)) {
    throw new Error(`Expected dashboard to subscribe to SSE event types: ${e1}, ${e2}, ${e3}`);
  }
});

Then('it has a useEffect that calls fetchListings when the most recent event receivedAt timestamp changes', function () {
  const content: string = this.fileContent;
  if (!content.includes('receivedAt') || !content.includes('fetchListings')) {
    throw new Error('Expected dashboard to call fetchListings on SSE event receivedAt change');
  }
});

Then('it renders a connection status indicator showing {string} when isConnected is true', function (label: string) {
  const content: string = this.fileContent;
  if (!content.includes(label) || !content.includes('isConnected')) {
    throw new Error(`Expected dashboard to show "${label}" when isConnected is true`);
  }
});

Then('it renders a {string} indicator when isConnected is false', function (label: string) {
  const content: string = this.fileContent;
  if (!content.includes(label)) {
    throw new Error(`Expected dashboard to show "${label}" indicator when isConnected is false`);
  }
});

// ==================== Then — S-33: SSE error banner ====================

Then('it renders a non-blocking amber banner when lastError is not null', function () {
  const content: string = this.fileContent;
  if (!content.includes('lastError') || !content.includes('amber')) {
    throw new Error('Expected dashboard to render an amber banner when lastError is not null');
  }
});

Then('the banner includes a dismiss button that hides the banner', function () {
  const content: string = this.fileContent;
  if (!content.includes('Dismiss') && !content.includes('dismiss')) {
    throw new Error('Expected SSE error banner to include a dismiss button');
  }
});

Then('the useSseEvents hook at {string} implements exponential backoff reconnection internally', function (filePath: string) {
  const content = readSourceFile(filePath);
  if (!content.includes('exponential') && !content.includes('currentDelay') && !content.includes('backoff')) {
    throw new Error(`Expected ${filePath} to implement exponential backoff reconnection`);
  }
});

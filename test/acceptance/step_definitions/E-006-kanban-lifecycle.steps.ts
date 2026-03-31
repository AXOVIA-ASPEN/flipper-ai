/**
 * Step Definitions for Story 6.2: Kanban Board with Lifecycle Tracking
 *
 * Uses static code analysis to verify that:
 *   - KanbanBoard renders all 6 lifecycle columns including PASSED
 *   - handleKanbanStatusChange intercepts PURCHASED/LISTED/SOLD moves to open modals
 *   - PURCHASED modal requires purchase price before confirming
 *   - LISTED modal requires resale URL before confirming
 *   - SOLD modal requires sale price and optionally fees; forwards purchasePrice for server-side profit calculation
 *   - PASSED drag calls updateOpportunity directly without opening a modal
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

Given('the KanbanBoard component at {string}', function (filePath: string) {
  this.fileContent = readSourceFile(filePath);
  this.filePath = filePath;
});

Given('the opportunities page at {string}', function (filePath: string) {
  this.fileContent = readSourceFile(filePath);
  this.filePath = filePath;
});

// ==================== When ====================

When('I inspect the COLUMNS constant', function () {
  // Content already loaded; analysis done in Then steps
});

When('I inspect the handleKanbanStatusChange function', function () {
  // Content already loaded; analysis done in Then steps
});

When('I inspect the PURCHASED modal', function () {
  // Content already loaded; analysis done in Then steps
});

When('I inspect the LISTED modal', function () {
  // Content already loaded; analysis done in Then steps
});

When('I inspect the SOLD modal', function () {
  // Content already loaded; analysis done in Then steps
});

// ==================== Then: COLUMNS array (S-10) ====================

Then('it contains exactly 6 columns', function () {
  const content: string = this.fileContent;
  // Match COLUMNS array and count entries
  const columnsMatch = content.match(/const COLUMNS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!columnsMatch) throw new Error('COLUMNS constant not found in KanbanBoard.tsx');
  const columnEntries = columnsMatch[1].match(/\{[^}]+id:\s*['"][A-Z]+['"]/g);
  if (!columnEntries || columnEntries.length !== 6) {
    throw new Error(
      `Expected exactly 6 columns, found ${columnEntries ? columnEntries.length : 0}`
    );
  }
});

Then('column {string} is present', function (columnId: string) {
  const content: string = this.fileContent;
  const pattern = new RegExp(`id:\\s*['"]${columnId}['"]`);
  if (!pattern.test(content)) {
    throw new Error(`Column "${columnId}" not found in KanbanBoard COLUMNS`);
  }
});

// ==================== Then: handleKanbanStatusChange (S-11, S-15) ====================

Then(
  'it intercepts moves to {string}, {string}, and {string}',
  function (status1: string, status2: string, status3: string) {
    const content: string = this.fileContent;
    // Verify handleKanbanStatusChange contains the intercept condition
    const intercepts = [status1, status2, status3].every((s) =>
      content.includes(`'${s}'`)
    );
    if (!intercepts) {
      throw new Error(
        `handleKanbanStatusChange does not intercept ${status1}, ${status2}, ${status3}`
      );
    }
    // Verify setPendingKanbanMove is called (the intercept mechanism)
    if (!content.includes('setPendingKanbanMove')) {
      throw new Error('handleKanbanStatusChange does not use setPendingKanbanMove');
    }
  }
);

Then('it calls updateOpportunity directly for other statuses', function () {
  const content: string = this.fileContent;
  // Verify the else branch calls updateOpportunity directly
  if (!content.includes('updateOpportunity(id, { status: newStatus })')) {
    throw new Error('handleKanbanStatusChange does not call updateOpportunity directly for other statuses');
  }
});

Then('dragging to {string} does not trigger a modal', function (status: string) {
  const content: string = this.fileContent;
  // PASSED should NOT be in the intercept condition
  const interceptPattern =
    /if\s*\([^)]*'PURCHASED'[^)]*\|\|[^)]*'LISTED'[^)]*\|\|[^)]*'SOLD'[^)]*\)/;
  if (!interceptPattern.test(content)) {
    throw new Error('handleKanbanStatusChange intercept condition not found');
  }
  // Verify PASSED is not in the intercept condition
  const interceptMatch = content.match(
    /if\s*\(newStatus === 'PURCHASED'\s*\|\|\s*newStatus === 'LISTED'\s*\|\|\s*newStatus === 'SOLD'\)/
  );
  if (!interceptMatch) {
    throw new Error('Expected intercept condition without PASSED');
  }
});

Then('it calls updateOpportunity directly with status {string}', function (status: string) {
  const content: string = this.fileContent;
  // Verify the else branch calls updateOpportunity
  if (!content.includes(`updateOpportunity(id, { status: newStatus })`)) {
    throw new Error(`handleKanbanStatusChange does not call updateOpportunity for ${status} (non-intercepted) statuses`);
  }
});

// ==================== Then: PURCHASED modal (S-12) ====================

Then(
  'it renders when pendingKanbanMove targetStatus is {string}',
  function (targetStatus: string) {
    const content: string = this.fileContent;
    const pattern = new RegExp(
      `pendingKanbanMove\\??\\.targetStatus\\s*===\\s*['"]${targetStatus}['"]`
    );
    if (!pattern.test(content)) {
      throw new Error(`Modal for targetStatus "${targetStatus}" not found`);
    }
  }
);

Then('it has a required purchase price input', function () {
  const content: string = this.fileContent;
  if (!content.includes('modal-purchase-price')) {
    throw new Error('PURCHASED modal does not have a purchase price input (id: modal-purchase-price)');
  }
});

Then('the confirm button is disabled when purchase price is empty', function () {
  const content: string = this.fileContent;
  if (!content.includes('disabled={!modalPurchasePrice}')) {
    throw new Error('PURCHASED modal confirm button does not have disabled={!modalPurchasePrice}');
  }
});

Then(
  'confirming calls updateOpportunity with status {string} and purchasePrice and purchaseDate',
  function (status: string) {
    const content: string = this.fileContent;
    if (!content.includes(`status: '${status}'`) || !content.includes('purchasePrice') || !content.includes('purchaseDate')) {
      throw new Error(
        `PURCHASED modal confirm does not call updateOpportunity with status=${status}, purchasePrice, purchaseDate`
      );
    }
  }
);

// ==================== Then: LISTED modal (S-13) ====================

Then('it has a required resale URL input', function () {
  const content: string = this.fileContent;
  if (!content.includes('modal-resale-url')) {
    throw new Error('LISTED modal does not have a resale URL input (id: modal-resale-url)');
  }
});

Then(
  'confirming calls updateOpportunity with status {string} and resaleUrl',
  function (status: string) {
    const content: string = this.fileContent;
    if (!content.includes(`status: '${status}'`) || !content.includes('resaleUrl')) {
      throw new Error(
        `LISTED modal confirm does not call updateOpportunity with status=${status}, resaleUrl`
      );
    }
  }
);

// ==================== Then: SOLD modal (S-14) ====================

Then('it has a required sale price input', function () {
  const content: string = this.fileContent;
  if (!content.includes('modal-sale-price')) {
    throw new Error('SOLD modal does not have a sale price input (id: modal-sale-price)');
  }
});

Then('it has an optional fees input', function () {
  const content: string = this.fileContent;
  if (!content.includes('modal-fees')) {
    throw new Error('SOLD modal does not have a fees input (id: modal-fees)');
  }
});

Then(
  'confirming calls updateOpportunity with status {string}, resalePrice, fees, resaleDate, and purchasePrice',
  function (status: string) {
    const content: string = this.fileContent;
    const hasStatus = content.includes(`status: '${status}'`);
    const hasResalePrice = content.includes('resalePrice');
    const hasFees = content.includes('payload.fees');
    const hasResaleDate = content.includes('resaleDate');
    const hasPurchasePrice = content.includes('payload.purchasePrice') || content.includes('opp?.purchasePrice');
    if (!hasStatus || !hasResalePrice || !hasFees || !hasResaleDate || !hasPurchasePrice) {
      throw new Error(
        `SOLD modal confirm missing required fields: status=${hasStatus}, resalePrice=${hasResalePrice}, fees=${hasFees}, resaleDate=${hasResaleDate}, purchasePrice=${hasPurchasePrice}`
      );
    }
  }
);

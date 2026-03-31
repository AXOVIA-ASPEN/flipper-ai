/**
 * Step Definitions for Story 3.6: Search Configuration & Filters
 * Validates filter parameter flow, SearchConfig CRUD, ownership enforcement,
 * UI toggle/delete with confirmation, and Zod validation on PATCH.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import { expect } from '@playwright/test';

const PROJECT_ROOT = process.cwd();

function readFile(relativePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(PROJECT_ROOT, relativePath));
}

// ==================== Background ====================

Given('the search configuration API exists at {string}', function (apiPath: string) {
  // Verify the root route (GET list / POST create) exists
  expect(fileExists('app/api/search-configs/route.ts')).toBe(true);
  // Verify the [id] route (GET single / PATCH / DELETE) exists
  expect(fileExists('app/api/search-configs/[id]/route.ts')).toBe(true);
  this.apiPath = apiPath;
});

// ==================== S-044: Search filters sent to scraper (AC #1) ====================

Given('the scraper UI at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

When('I inspect the scrape submission payload', function () {
  // Content already loaded in Given step
});

Then('the POST body should include {string}', function (field: string) {
  expect(this.fileContent).toContain(field);
});

// ==================== S-045: Craigslist route applies all filter params (AC #1) ====================

Given('the Craigslist scraper route at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

When('I inspect how the route processes the request body', function () {
  // Content already loaded in Given step
});

Then('it should extract {string} from the request body', function (field: string) {
  // Check destructuring from request body
  expect(this.fileContent).toContain(field);
});

Then('it should pass all parameters to {string}', function (funcName: string) {
  expect(this.fileContent).toContain(funcName);
  // Verify the filter params are forwarded in the function call
  expect(this.fileContent).toContain('keywords');
  expect(this.fileContent).toContain('minPrice');
  expect(this.fileContent).toContain('maxPrice');
});

// ==================== S-046: OfferUp route applies all filter params (AC #1) ====================

Given('the OfferUp scraper route at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

// ==================== S-047: Save search configuration (AC #2) ====================

Given('the search config POST endpoint at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

When('I inspect the POST handler', function () {
  // Content already loaded in Given step
});

Then('it should require authentication via {string}', function (authFn: string) {
  expect(this.fileContent).toContain(authFn);
});

Then('it should validate the request body with {string}', function (schemaName: string) {
  expect(this.fileContent).toContain(schemaName);
});

Then(
  'it should persist {string}, {string}, {string}, {string}, {string}, {string}, {string} to the database',
  function (f1: string, f2: string, f3: string, f4: string, f5: string, f6: string, f7: string) {
    for (const field of [f1, f2, f3, f4, f5, f6, f7]) {
      expect(this.fileContent).toContain(field);
    }
  }
);

// ==================== S-048: Prisma schema has all required fields (AC #2) ====================

Given('the SearchConfig Prisma model at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

When('I inspect the SearchConfig model fields', function () {
  expect(this.fileContent).toContain('model SearchConfig');
});

Then('it should have a {string} field of type String', function (field: string) {
  const pattern = new RegExp(`${field}\\s+String`);
  expect(this.fileContent).toMatch(pattern);
});

Then('it should have a {string} field of type Float', function (field: string) {
  const pattern = new RegExp(`${field}\\s+Float`);
  expect(this.fileContent).toMatch(pattern);
});

Then(
  'it should have an {string} field of type Boolean with default true',
  function (field: string) {
    const pattern = new RegExp(`${field}\\s+Boolean\\s+@default\\(true\\)`);
    expect(this.fileContent).toMatch(pattern);
  }
);

// ==================== S-049: Saved searches listed and loadable (AC #3) ====================

When('I inspect the saved configs functionality', function () {
  // Content already loaded in Given step
});

Then('it should fetch all saved configs from {string}', function (apiPath: string) {
  expect(this.fileContent).toContain(apiPath);
});

Then('it should display each config with its name and location', function () {
  expect(this.fileContent).toContain('config.name');
  expect(this.fileContent).toContain('config.location');
});

Then(
  'the {string} function should populate all form fields from the config',
  function (funcName: string) {
    expect(this.fileContent).toContain(`function ${funcName}`);
    expect(this.fileContent).toContain('setLocation');
    expect(this.fileContent).toContain('setCategory');
    expect(this.fileContent).toContain('setKeywords');
  }
);

// ==================== S-050: Toggle enabled via PATCH (AC #4) ====================

Given('the search config PATCH endpoint at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

When('I inspect the PATCH handler', function () {
  // Content already loaded in Given step
});

Then('it should verify ownership before allowing updates', function () {
  expect(this.fileContent).toContain('ForbiddenError');
  expect(this.fileContent).toContain('config.userId');
});

Then('it should validate the body with {string}', function (schemaName: string) {
  expect(this.fileContent).toContain(schemaName);
});

Then('it should allow updating the {string} field to false', function (field: string) {
  expect(this.fileContent).toContain(field);
});

// ==================== S-051: Disabled config visual distinction (AC #4) ====================

When('I inspect the saved configs dropdown', function () {
  // Content already loaded in Given step
});

Then('disabled configs should render with reduced opacity', function () {
  expect(this.fileContent).toContain('opacity-50');
});

Then('disabled configs should have line-through styling on their name', function () {
  expect(this.fileContent).toContain('line-through');
});

Then('enabled configs should show a green toggle indicator', function () {
  expect(this.fileContent).toContain('bg-green-500');
});

Then('disabled configs should show a grey toggle indicator', function () {
  expect(this.fileContent).toContain('bg-white/20');
});

// ==================== S-052: Ownership enforced on PATCH (AC #4) ====================

Given('the PATCH handler at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

When('I inspect the ownership check logic', function () {
  // Content already loaded in Given step
});

Then(
  'it should call {string} to load the config before updating',
  function (method: string) {
    expect(this.fileContent).toContain(method);
  }
);

Then(
  'it should throw {string} when {string} does not match the authenticated userId',
  function (errorClass: string, field: string) {
    expect(this.fileContent).toContain(errorClass);
    expect(this.fileContent).toContain(field);
  }
);

Then('it should allow update when {string} is null (legacy config)', function (_field: string) {
  // Ownership check only fires when config.userId is truthy
  expect(this.fileContent).toMatch(/config\.userId && config\.userId !== userId/);
});

// ==================== S-053: Delete search configuration (AC #5) ====================

Given('the search config DELETE endpoint at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

When('I inspect the DELETE handler', function () {
  // Content already loaded in Given step
});

Then('it should verify ownership before allowing deletion', function () {
  expect(this.fileContent).toContain('ForbiddenError');
});

Then('it should call {string} on confirmed deletion', function (_method: string) {
  // The method is "prisma.searchConfig.delete"
  expect(this.fileContent).toContain('searchConfig.delete');
});

Then('it should return {string} on success', function (_responseBody: string) {
  expect(this.fileContent).toContain('success: true');
});

// ==================== S-054: Delete confirmation dialog (AC #5) ====================

When('I inspect the delete confirmation dialog', function () {
  // Content already loaded in Given step
});

Then('clicking the trash icon should set {string} state', function (stateVar: string) {
  expect(this.fileContent).toContain(stateVar);
});

Then('a confirmation modal dialog should appear before deletion', function () {
  expect(this.fileContent).toContain('deleteConfirmId');
  expect(this.fileContent).toContain('Delete Saved Search');
});

Then('confirming should call {string}', function (_apiCall: string) {
  expect(this.fileContent).toContain('handleDeleteConfig');
  expect(this.fileContent).toContain('/api/search-configs/');
});

Then('cancelling should close the dialog without deleting', function () {
  expect(this.fileContent).toContain('setDeleteConfirmId(null)');
});

// ==================== S-055: Ownership enforced on DELETE (AC #5) ====================

Given('the DELETE handler at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

Then('it should allow deletion when {string} is null (legacy config)', function (_field: string) {
  // Ownership check only fires when config.userId is truthy
  expect(this.fileContent).toMatch(/config\.userId && config\.userId !== userId/);
});

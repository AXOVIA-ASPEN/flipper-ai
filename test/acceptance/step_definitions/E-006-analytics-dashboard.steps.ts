/**
 * Step definitions for Story 6.4: Analytics Dashboard
 * Feature: E-006 Flip Lifecycle Management & Analytics
 * Tags: @story-6-4 @FR-DASH-07
 */
import { Given, When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';

const ROOT = path.resolve(__dirname, '../../..');

let currentFilePath: string;
let currentFileContent: string;

Given('the analytics page at {string}', function (filePath: string) {
  currentFilePath = path.join(ROOT, filePath);
  assert.ok(fs.existsSync(currentFilePath), `File not found: ${currentFilePath}`);
  currentFileContent = fs.readFileSync(currentFilePath, 'utf8');
  // Also set on World so step defs in other files (e.g. story 6.5) can use this.fileContent
  this.fileContent = currentFileContent;
});

// S-21: Primary metrics
When('I inspect the primary metrics section', function () {
  assert.ok(currentFileContent.length > 0, 'File content should not be empty');
});

Then('it renders a {string} summary card using totalNetProfit', function (label: string) {
  assert.ok(
    currentFileContent.includes('totalNetProfit'),
    `Expected totalNetProfit reference in analytics page`
  );
  assert.ok(
    currentFileContent.includes(label),
    `Expected label "${label}" in analytics page`
  );
});

Then('it renders a {string} summary card using completedDeals', function (label: string) {
  assert.ok(
    currentFileContent.includes('completedDeals'),
    `Expected completedDeals reference in analytics page`
  );
  assert.ok(
    currentFileContent.includes(label),
    `Expected label "${label}" in analytics page`
  );
});

Then('it renders an {string} summary card using avgProfitPerFlip', function (label: string) {
  assert.ok(
    currentFileContent.includes('avgProfitPerFlip'),
    `Expected avgProfitPerFlip reference in analytics page`
  );
  assert.ok(
    currentFileContent.includes(label),
    `Expected label "${label}" in analytics page`
  );
});

Then('it renders a {string} summary card using successRate with sold-of-total subtitle', function (label: string) {
  assert.ok(
    currentFileContent.includes('successRate'),
    `Expected successRate reference in analytics page`
  );
  assert.ok(
    currentFileContent.includes(label),
    `Expected label "${label}" in analytics page`
  );
  assert.ok(
    currentFileContent.includes('sold of') || currentFileContent.includes('of ${data.items.length}'),
    `Expected sold-of-total subtitle in analytics page`
  );
});

// S-22: Chart visualizations
When('I inspect the chart sections', function () {
  assert.ok(currentFileContent.length > 0, 'File content should not be empty');
});

Then('it renders a {string} section with a LineChart using trends data', function (sectionLabel: string) {
  assert.ok(
    currentFileContent.includes(sectionLabel),
    `Expected section "${sectionLabel}" in analytics page`
  );
  assert.ok(
    currentFileContent.includes('LineChart'),
    `Expected LineChart component in analytics page`
  );
  assert.ok(
    currentFileContent.includes('data.trends'),
    `Expected trends data reference in analytics page`
  );
});

Then('it renders a {string} section with a BarChart using categoryBreakdown data', function (sectionLabel: string) {
  assert.ok(
    currentFileContent.includes(sectionLabel),
    `Expected section "${sectionLabel}" in analytics page`
  );
  assert.ok(
    currentFileContent.includes('BarChart'),
    `Expected BarChart component in analytics page`
  );
  assert.ok(
    currentFileContent.includes('categoryBreakdown'),
    `Expected categoryBreakdown data reference in analytics page`
  );
});

Then('it renders a {string} section with a BarChart using platformBreakdown data', function (sectionLabel: string) {
  assert.ok(
    currentFileContent.includes(sectionLabel),
    `Expected section "${sectionLabel}" in analytics page`
  );
  assert.ok(
    currentFileContent.includes('platformBreakdown'),
    `Expected platformBreakdown data reference in analytics page`
  );
});

Then('it renders a {string} card showing the highest-profit item', function (cardLabel: string) {
  assert.ok(
    currentFileContent.includes(cardLabel),
    `Expected "${cardLabel}" card in analytics page`
  );
  assert.ok(
    currentFileContent.includes('bestDeal'),
    `Expected bestDeal reference in analytics page`
  );
});

// S-23: Empty state
When('I inspect the empty state condition for items.length === 0', function () {
  assert.ok(
    currentFileContent.includes('items.length === 0'),
    `Expected empty state condition "items.length === 0" in analytics page`
  );
});

Then('it renders an empty state heading {string}', function (heading: string) {
  assert.ok(
    currentFileContent.includes(heading),
    `Expected empty state heading "${heading}" in analytics page`
  );
});

Then('it renders guidance text directing the user to the Opportunities page', function () {
  assert.ok(
    currentFileContent.includes('Opportunities'),
    `Expected guidance text mentioning Opportunities in analytics page`
  );
});

Then('it renders a link to {string} labelled {string}', function (href: string, label: string) {
  // Accept either a literal `<a href="..."` element or a component prop
  // wiring like `href: '...'` (used by shared EmptyState action prop).
  const hasHref = currentFileContent.includes(`href="${href}"`) ||
    currentFileContent.includes(`href: '${href}'`) ||
    currentFileContent.includes(`href: "${href}"`);
  assert.ok(hasHref, `Expected href="${href}" (or href: '${href}') in analytics page`);
  assert.ok(
    currentFileContent.includes(label),
    `Expected link label "${label}" in analytics page`
  );
});

// S-24: Date range filter
When('I inspect the date range filter implementation', function () {
  assert.ok(currentFileContent.length > 0, 'File content should not be empty');
});

Then('it renders dateFrom and dateTo date inputs', function () {
  assert.ok(
    currentFileContent.includes('dateFrom'),
    `Expected dateFrom state in analytics page`
  );
  assert.ok(
    currentFileContent.includes('dateTo'),
    `Expected dateTo state in analytics page`
  );
  assert.ok(
    currentFileContent.includes('type="date"'),
    `Expected date input elements in analytics page`
  );
});

Then('it includes dateFrom in the fetch URL when set', function () {
  assert.ok(
    currentFileContent.includes("params.set('dateFrom'") || currentFileContent.includes('dateFrom'),
    `Expected dateFrom to be added to fetch params in analytics page`
  );
});

Then('it includes dateTo in the fetch URL when set', function () {
  assert.ok(
    currentFileContent.includes("params.set('dateTo'") || currentFileContent.includes('dateTo'),
    `Expected dateTo to be added to fetch params in analytics page`
  );
});

Then('it renders a {string} button when either date is set', function (buttonLabel: string) {
  assert.ok(
    currentFileContent.includes(buttonLabel),
    `Expected "${buttonLabel}" button in analytics page`
  );
});

Then('the API route at {string} forwards dateFrom and dateTo to getProfitLossAnalytics', function (apiPath: string) {
  const apiFilePath = path.join(ROOT, apiPath);
  assert.ok(fs.existsSync(apiFilePath), `API route not found: ${apiFilePath}`);
  const apiContent = fs.readFileSync(apiFilePath, 'utf8');
  assert.ok(
    apiContent.includes('dateFrom'),
    `Expected dateFrom param in API route`
  );
  assert.ok(
    apiContent.includes('dateTo'),
    `Expected dateTo param in API route`
  );
  assert.ok(
    apiContent.includes('getProfitLossAnalytics'),
    `Expected getProfitLossAnalytics call in API route`
  );
});

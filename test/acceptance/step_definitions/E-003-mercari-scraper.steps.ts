/**
 * Step Definitions for Story 3.4: Mercari Scraper
 * Validates scraper module structure, API integration, Playwright fallback,
 * exponential backoff, anti-detection, and marketplace-scanner integration.
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

// ==================== Background & Module References ====================

Given('the Mercari scraper module at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

Given('the Mercari types at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

Given('the Mercari route at {string}', function (filePath: string) {
  const content = readFile(filePath);
  this.fileContent = content;
  this.routeContent = content;
});

// ==================== AC #1: Internal API Primary Method ====================

When('I inspect the Mercari API integration', function () {
  // Content already loaded
});

Then('it should call the Mercari internal API at {string}', function (baseUrl: string) {
  // Check types.ts for the constant definition
  const typesContent = readFile('src/scrapers/mercari/types.ts');
  expect(typesContent).toContain(baseUrl);
});

Then('it should use POST method to the {string} endpoint', function (endpoint: string) {
  expect(this.fileContent).toContain(`callMercariApi('${endpoint}', 'POST'`);
});

Then('it should include browser-mimicking headers with {string} set to {string}', function (header: string, value: string) {
  expect(this.fileContent).toContain(`'${header}': '${value}'`);
});

Then('it should include {string}, {string}, and {string} headers', function (h1: string, h2: string, h3: string) {
  expect(this.fileContent).toContain(`'${h1}'`);
  expect(this.fileContent).toContain(`'${h2}'`);
  expect(this.fileContent).toContain(`'${h3}'`);
});

// ==================== AC #2: Playwright Fallback ====================

When('I inspect the Mercari Playwright fallback', function () {
  // Content already loaded
});

Then('it should have a {string} exported async function', function (fnName: string) {
  expect(this.fileContent).toContain(`export async function ${fnName}`);
});

Then('it should launch Chromium with {string}', function (arg: string) {
  expect(this.fileContent).toContain(arg);
});

Then('it should navigate to {string} with search params', function (url: string) {
  const typesContent = readFile('src/scrapers/mercari/types.ts');
  expect(typesContent).toContain(url);
});

Then('it should extract listing data via page.evaluate DOM traversal', function () {
  expect(this.fileContent).toContain('page.evaluate');
});

// "it should close the browser in a finally block" is defined in E-003-craigslist-scraper.steps.ts

Then('it should have a 60-second session timeout', function () {
  const typesContent = readFile('src/scrapers/mercari/types.ts');
  expect(typesContent).toContain('SESSION_TIMEOUT_MS');
  expect(typesContent).toContain('60_000');
});

// ==================== AC #3: RawListing Normalization ====================

When('I inspect the Mercari listing normalization', function () {
  // Content already loaded
});

Then('it should have a {string} exported function', function (fnName: string) {
  expect(this.fileContent).toContain(`function ${fnName}`);
});

Then('it should map item.id to externalId', function () {
  expect(this.fileContent).toContain('externalId: item.id');
});

Then('it should map item.name to title', function () {
  expect(this.fileContent).toContain('title: item.name');
});

Then('it should map item.price to askingPrice', function () {
  expect(this.fileContent).toContain('askingPrice: item.price');
});

Then('it should use normalizeCondition for condition mapping', function () {
  expect(this.fileContent).toContain('normalizeCondition(item)');
});

Then('it should use formatLocation for location extraction', function () {
  expect(this.fileContent).toContain('formatLocation(item)');
});

Then('it should use collectImageUrls for image URL collection', function () {
  expect(this.fileContent).toContain('collectImageUrls(item)');
});

// ==================== AC #4: Exponential Backoff ====================

When('I inspect the Mercari rate limit handling', function () {
  // Content already loaded
});

Then('it should detect HTTP 429 status as rate limiting', function () {
  expect(this.fileContent).toContain('status === 429');
});

Then('it should detect HTML responses as rate limiting via isRateLimitOrBlock', function () {
  expect(this.fileContent).toContain('isRateLimitOrBlock');
  expect(this.fileContent).toContain("text/html");
});

Then('it should retry up to MAX_RETRIES times before Playwright fallback', function () {
  expect(this.fileContent).toContain('SCRAPER_CONFIG.MAX_RETRIES');
  expect(this.fileContent).toContain('scrapeMercariWithPlaywright');
});

Then('it should apply exponential backoff with BACKOFF_BASE_MS base delay', function () {
  expect(this.fileContent).toContain('SCRAPER_CONFIG.BACKOFF_BASE_MS');
  expect(this.fileContent).toContain('Math.pow(2, attempt - 1)');
});

Then('it should throw RateLimitError when both API and Playwright fail', function () {
  expect(this.fileContent).toContain('throw new RateLimitError');
});

// ==================== Anti-Detection Measures ====================

When('I inspect the Mercari anti-detection configuration', function () {
  // Content already loaded
});

Then('the user agent pool should contain at least 6 entries', function () {
  const uaMatches = this.fileContent.match(/Mozilla\/5\.0/g);
  expect(uaMatches).not.toBeNull();
  expect(uaMatches!.length).toBeGreaterThanOrEqual(6);
});

Then('all Mercari user agents should reference Chrome version 130 or higher', function () {
  const chromeVersions = this.fileContent.match(/Chrome\/(\d+)/g);
  expect(chromeVersions).not.toBeNull();
  for (const match of chromeVersions!) {
    const version = parseInt(match.replace('Chrome/', ''), 10);
    expect(version).toBeGreaterThanOrEqual(130);
  }
});

Then('viewport randomization should be configured between 1280-1920 width and 800-1080 height', function () {
  expect(this.fileContent).toContain('VIEWPORT_MIN_WIDTH');
  expect(this.fileContent).toContain('VIEWPORT_MAX_WIDTH');
  expect(this.fileContent).toContain('1280');
  expect(this.fileContent).toContain('1920');
  expect(this.fileContent).toContain('800');
  expect(this.fileContent).toContain('1080');
});

Then('it should include randomized Accept-Language header variants', function () {
  expect(this.fileContent).toContain('ACCEPT_LANGUAGE_VARIANTS');
});

// ==================== Module Structure ====================

When('I inspect the Mercari scraper module structure', function () {
  // Content already loaded
});

Then('{string} should contain the Mercari scraping logic', function (filePath: string) {
  expect(fileExists(filePath)).toBe(true);
  const content = readFile(filePath);
  expect(content).toContain('scrapeMercariSearch');
});

// ==================== Marketplace Scanner Integration ====================

When('I inspect the Mercari analysis pipeline', function () {
  // Content already loaded
});

Then('it should use {string} from marketplace-scanner', function (fnName: string) {
  expect(this.fileContent).toContain(fnName);
});

Then('it should emit SSE events via sseEmitter for real-time notifications', function () {
  expect(this.fileContent).toContain('sseEmitter.emit');
});

// ==================== Standardized Error Handling ====================

When('I inspect the Mercari error handling', function () {
  // Content already loaded
});

Then('it should use {string} from errors module for RFC 7807 responses', function (fnName: string) {
  expect(this.fileContent).toContain(fnName);
});

Then('it should use ValidationError for missing keywords', function () {
  expect(this.fileContent).toContain('ValidationError');
});

Then('the scraper should use ExternalServiceError for API failures', function () {
  const scraperContent = readFile('src/scrapers/mercari/scraper.ts');
  expect(scraperContent).toContain('ExternalServiceError');
});

Then('the scraper should use RateLimitError for rate limit detection', function () {
  const scraperContent = readFile('src/scrapers/mercari/scraper.ts');
  expect(scraperContent).toContain('RateLimitError');
});

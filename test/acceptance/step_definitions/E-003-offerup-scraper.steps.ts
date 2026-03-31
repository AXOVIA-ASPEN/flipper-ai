/**
 * Step Definitions for Story 3.5: OfferUp Scraper
 * Validates scraper module structure, anti-detection, data extraction,
 * browser lifecycle, marketplace-scanner integration, and error handling.
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

// ==================== Given: File Loaders ====================

Given('the OfferUp scraper configuration at {string}', function (filePath: string) {
  this.filePath = filePath;
  this.fileContent = readFile(filePath);
});

Given('the OfferUp scraper module at {string}', function (filePath: string) {
  this.filePath = filePath;
  this.fileContent = readFile(filePath);
});

Given('the OfferUp types at {string}', function (filePath: string) {
  this.filePath = filePath;
  this.fileContent = readFile(filePath);
});

Given('the OfferUp route at {string}', function (filePath: string) {
  this.filePath = filePath;
  this.fileContent = readFile(filePath);
});

Given('the OfferUp scraper module exports {string}', function (exportName: string) {
  const content = readFile('src/scrapers/offerup/index.ts');
  expect(content).toContain(exportName);
  this.fileContent = readFile('app/api/scraper/offerup/route.ts');
});

// ==================== When: Inspection Contexts ====================

When('I inspect the OfferUp browser launch configuration', function () {
  // Content already loaded via Given
});

When('I inspect the toRawListing function', function () {
  expect(this.fileContent).toContain('toRawListing');
});

When('I inspect the OfferUpItem interface', function () {
  expect(this.fileContent).toContain('interface OfferUpItem');
});

When('I inspect the OfferUp anti-detection features', function () {
  // Content already loaded via Given
});

When('I inspect the OfferUp retry logic in withRetry', function () {
  expect(this.fileContent).toContain('withRetry');
});

When('I inspect the OfferUp scraper module structure', function () {
  expect(fileExists('src/scrapers/offerup')).toBe(true);
});

When('I inspect the OfferUp analysis pipeline', function () {
  // Content already loaded via Given
});

When('I inspect the OfferUp concurrent job guard logic', function () {
  // fileContent set to route.ts by the Given step
});

When('I inspect the OfferUp session timeout logic', function () {
  // Content already loaded via Given
});

When('I inspect the OfferUp error handling', function () {
  // Content already loaded via Given
});

// ==================== S-034: Browser launch anti-detection ====================

Then('the OfferUp user agent pool should contain at least 6 entries', function () {
  const typesContent = readFile('src/scrapers/offerup/types.ts');
  const uaMatches = typesContent.match(/Mozilla\/5\.0/g);
  expect(uaMatches).not.toBeNull();
  expect(uaMatches!.length).toBeGreaterThanOrEqual(6);
});

Then('all OfferUp user agents should reference Chrome version 130 or higher', function () {
  const typesContent = readFile('src/scrapers/offerup/types.ts');
  const chromeVersions = typesContent.match(/Chrome\/(\d+)/g);
  expect(chromeVersions).not.toBeNull();
  for (const match of chromeVersions!) {
    const version = parseInt(match.replace('Chrome/', ''), 10);
    expect(version).toBeGreaterThanOrEqual(130);
  }
});

Then('it should block resource types including images, fonts, and analytics for speed', function () {
  expect(this.fileContent).toContain('context.route');
  expect(this.fileContent).toContain('route.abort()');
  expect(this.fileContent).toMatch(/png|jpg|jpeg|gif|webp/);
  expect(this.fileContent).toContain('analytics');
});

// ==================== S-035: RawListing normalization ====================

Then('it should map OfferUpItem fields to RawListing format', function () {
  expect(this.fileContent).toContain('export function toRawListing');
  expect(this.fileContent).toContain('RawListing');
  expect(this.fileContent).toContain('externalId: item.externalId');
});

Then('it should set sellerContact to explicit null', function () {
  expect(this.fileContent).toContain('sellerContact: null');
});

Then('it should use the search location as fallback when listing location is empty', function () {
  expect(this.fileContent).toContain('searchLocation');
  expect(this.fileContent).toMatch(/item\.location\s*\|\|/);
});

Then('it should map externalId, url, title, askingPrice, condition, sellerName, imageUrls, and postedAt', function () {
  expect(this.fileContent).toContain('externalId');
  expect(this.fileContent).toContain('url: item.url');
  expect(this.fileContent).toContain('title: item.title');
  expect(this.fileContent).toContain('askingPrice: item.price');
  expect(this.fileContent).toContain('condition');
  expect(this.fileContent).toContain('sellerName');
  expect(this.fileContent).toContain('imageUrls');
  expect(this.fileContent).toContain('postedAt');
});

// ==================== S-037: Anti-detection measures ====================

Then('it should rotate user agents from a pool of current Chrome versions', function () {
  expect(this.fileContent).toContain('getRandomUserAgent');
  expect(this.fileContent).toContain('USER_AGENTS');
});

Then(/^it should add randomized delays between interactions \(500ms-2s\)$/, function () {
  expect(this.fileContent).toContain('randomDelay');
  expect(this.fileContent).toContain('MIN_DELAY_MS');
  expect(this.fileContent).toContain('MAX_DELAY_MS');
});

Then(/^it should add rate-limit delays after extraction \(1s-2s\)$/, function () {
  expect(this.fileContent).toContain('RATE_LIMIT_MIN_DELAY_MS');
  expect(this.fileContent).toContain('RATE_LIMIT_MAX_DELAY_MS');
});

// ==================== S-038: Exponential backoff ====================

Then('the OfferUp scraper should retry up to 3 times before failing', function () {
  expect(this.fileContent).toContain('MAX_RETRIES');
  expect(this.fileContent).toContain('SCRAPER_CONFIG.MAX_RETRIES');
});

Then('it should apply exponential backoff with 2000ms base delay', function () {
  expect(this.fileContent).toContain('BACKOFF_BASE_MS');
  const typesContent = readFile('src/scrapers/offerup/types.ts');
  expect(typesContent).toContain('BACKOFF_BASE_MS: 2000');
});

Then('it should detect captcha and {string} pages as blocks', function (pageText: string) {
  expect(this.fileContent).toContain('captcha');
  expect(this.fileContent).toContain(pageText);
});

Then('it should throw the last error after all retries are exhausted', function () {
  expect(this.fileContent).toContain('throw lastError');
});

// ==================== S-039: Module structure ====================

Given('the OfferUp scraper module directory at {string}', function (dirPath: string) {
  this.dirPath = dirPath;
  expect(fs.existsSync(path.join(PROJECT_ROOT, dirPath))).toBe(true);
});

Then('{string} should contain the OfferUp scraping logic', function (filePath: string) {
  expect(fileExists(filePath)).toBe(true);
  const content = readFile(filePath);
  expect(content).toContain('scrapeOfferUp');
});

// ==================== S-040: Marketplace scanner integration ====================

Then('the OfferUp route uses {string} for database-ready listing storage', function (fnName: string) {
  expect(this.fileContent).toContain(fnName);
});

Then('the OfferUp route uses {string} for scan summary response', function (fnName: string) {
  expect(this.fileContent).toContain(fnName);
});

Then('it should emit SSE events via sseEmitter after DB save with DB-assigned IDs', function () {
  expect(this.fileContent).toContain('sseEmitter.emit');
  expect(this.fileContent).toContain('savedListing.id');
  expect(this.fileContent).toContain("type: 'listing.found'");
});

// ==================== S-041: Concurrent job guard ====================

Then('the route should check for existing RUNNING jobs with platform OFFERUP before starting', function () {
  expect(this.fileContent).toContain('hasRunningJob');
  expect(this.fileContent).toContain("'OFFERUP'");
});

Then("it should throw ConflictError if a job is already running", function () {
  expect(this.fileContent).toContain('ConflictError');
});

// ==================== S-042: Session timeout ====================

Then('it should wrap the scrape operation in Promise.race with a 60-second timeout', function () {
  expect(this.fileContent).toContain('Promise.race');
  expect(this.fileContent).toContain('SESSION_TIMEOUT_MS');
  const typesContent = readFile('src/scrapers/offerup/types.ts');
  expect(typesContent).toContain('SESSION_TIMEOUT_MS: 60_000');
});

Then('it should return a failure result with failureReason {string} when exceeded', function (reason: string) {
  expect(this.fileContent).toContain('failureReason');
  expect(this.fileContent).toContain(`'${reason}'`);
  expect(this.fileContent).toContain('success: false');
});

Then('it should always close the browser in a finally block', function () {
  expect(this.fileContent).toContain('finally');
  expect(this.fileContent).toMatch(/\.close\(\)/);
});

// ==================== S-043: Standardized error handling ====================

Then('it should use ValidationError for missing location', function () {
  expect(this.fileContent).toContain('ValidationError');
  expect(this.fileContent).toContain('location');
});

Then('it should use RateLimitError for block and captcha detection', function () {
  expect(this.fileContent).toContain('RateLimitError');
});

Then('it should use ExternalServiceError for unexpected scraping failures', function () {
  expect(this.fileContent).toContain('ExternalServiceError');
});

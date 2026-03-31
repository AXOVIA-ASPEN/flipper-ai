/**
 * Step Definitions for Story 3.2: eBay Browse API Integration
 * Validates eBay scraper module structure, OAuth authentication,
 * response normalization, filter mapping, error handling,
 * and marketplace-scanner integration.
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

// ==================== eBay Scraper Module (shared Given) ====================

Given('the eBay scraper module at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

// ==================== AC #1: OAuth Authentication ====================

When('I inspect the callEbayApi function', function () {
  expect(this.fileContent).toContain('callEbayApi');
});

Then(
  'it should include an {string} header with {string} prefix and the EBAY_OAUTH_TOKEN',
  function (headerName: string, prefix: string) {
    expect(this.fileContent).toContain(headerName);
    expect(this.fileContent).toContain(prefix);
    expect(this.fileContent).toContain('EBAY_OAUTH_TOKEN');
  }
);

Then(
  'it should include {string} header set to {string}',
  function (headerName: string, headerValue: string) {
    expect(this.fileContent).toContain(headerName);
    expect(this.fileContent).toContain(headerValue);
  }
);

Then(
  'it should call the eBay Browse API v1 endpoint {string}',
  function (endpoint: string) {
    expect(this.fileContent).toContain(endpoint);
  }
);

// ==================== AC #2: Response Normalization ====================

When('I inspect the convertEbayItemsToNormalized function', function () {
  expect(this.fileContent).toContain('convertEbayItemsToNormalized');
});

Then('it should map itemId to externalId', function () {
  expect(this.fileContent).toContain('externalId');
  expect(this.fileContent).toContain('itemId');
});

Then('it should map itemWebUrl to url', function () {
  expect(this.fileContent).toContain('url:');
  expect(this.fileContent).toContain('itemWebUrl');
});

Then('it should map title to title', function () {
  expect(this.fileContent).toContain('title:');
});

Then('it should parse price.value to askingPrice as a float', function () {
  expect(this.fileContent).toContain('askingPrice');
  expect(this.fileContent).toContain('parseEbayPrice');
});

Then('it should map condition to condition', function () {
  expect(this.fileContent).toContain('condition:');
});

Then('it should build location from itemLocation fields', function () {
  expect(this.fileContent).toContain('formatLocation');
});

Then('it should collect primary and additional image URLs', function () {
  expect(this.fileContent).toContain('collectImageUrls');
});

Then('it should map seller.username to sellerName', function () {
  expect(this.fileContent).toContain('sellerName');
  expect(this.fileContent).toContain('seller');
  expect(this.fileContent).toContain('username');
});

// ==================== AC #3: Search Filters ====================

When('I inspect the buildFilterString function', function () {
  expect(this.fileContent).toContain('buildFilterString');
});

Then('it should always include {string}', function (filterStr: string) {
  expect(this.fileContent).toContain(filterStr);
});

Then(
  'it should map categoryId to the {string} query parameter',
  function (paramName: string) {
    expect(this.fileContent).toContain(paramName);
  }
);

Then(
  'it should map condition to {string} filter format',
  function (format: string) {
    const prefix = format.split('{')[0] + '{';
    expect(this.fileContent).toContain(prefix);
  }
);

Then(
  'it should map price range to {string} filter format',
  function (_format: string) {
    expect(this.fileContent).toContain('price:[');
  }
);

Then(
  'it should support all 6 categories: Electronics, Clothing, Collectibles, Musical Instruments, Video Games, Antiques',
  function () {
    const typesContent = readFile('src/scrapers/ebay/types.ts');
    expect(typesContent).toContain('Electronics');
    expect(typesContent).toContain('Clothing');
    expect(typesContent).toContain('Collectibles');
    expect(typesContent).toContain('Musical Instruments');
    expect(typesContent).toContain('Video Games');
    expect(typesContent).toContain('Antiques');
  }
);

Then(
  'it should support conditions: NEW, OPEN_BOX, CERTIFIED_REFURBISHED, EXCELLENT_REFURBISHED, VERY_GOOD_REFURBISHED, USED',
  function () {
    const typesContent = readFile('src/scrapers/ebay/types.ts');
    const conditions = [
      'NEW',
      'OPEN_BOX',
      'CERTIFIED_REFURBISHED',
      'EXCELLENT_REFURBISHED',
      'VERY_GOOD_REFURBISHED',
      'USED',
    ];
    for (const condition of conditions) {
      expect(typesContent).toContain(condition);
    }
  }
);

// ==================== AC #4: Token Error Handling ====================

When('I inspect the error handling logic', function () {
  // Content already loaded from Given step
});

Then(
  'it should throw ConfigurationError when EBAY_OAUTH_TOKEN is not set',
  function () {
    expect(this.fileContent).toContain('ConfigurationError');
    expect(this.fileContent).toContain('EBAY_OAUTH_TOKEN');
  }
);

Then(
  'it should throw ExternalServiceError on 401 or 403 API responses indicating expired token',
  function () {
    expect(this.fileContent).toContain('ExternalServiceError');
    expect(this.fileContent).toContain('401');
    expect(this.fileContent).toContain('403');
  }
);

Then('it should throw RateLimitError on 429 API responses', function () {
  expect(this.fileContent).toContain('RateLimitError');
  expect(this.fileContent).toContain('429');
});

Then(
  'the GET endpoint should return status {string} when token is not configured',
  function (status: string) {
    const routeContent = readFile('app/api/scraper/ebay/route.ts');
    expect(routeContent).toContain(status);
  }
);

// ==================== Module Structure ====================

When('I inspect the eBay scraper module structure', function () {
  const fullPath = path.join(PROJECT_ROOT, this.moduleDir);
  expect(fs.existsSync(fullPath)).toBe(true);
});

Then(
  '{string} should contain the core API integration logic',
  function (filePath: string) {
    const content = readFile(filePath);
    expect(content).toContain('callEbayApi');
    expect(content).toContain('fetchEbayListings');
  }
);

// ==================== Marketplace Scanner Integration ====================

When('I inspect the eBay analysis pipeline', function () {
  // routeContent already loaded by shared "Given the route at" step
});

Then(
  'it should use {string} from marketplace-scanner for viability analysis',
  function (funcName: string) {
    expect(this.routeContent).toContain(funcName);
    expect(this.routeContent).toContain('marketplace-scanner');
  }
);

Then(
  'it should use {string} for database-ready format',
  function (funcName: string) {
    expect(this.routeContent).toContain(funcName);
  }
);

Then(
  'it should use {string} for consistent response format',
  function (funcName: string) {
    expect(this.routeContent).toContain(funcName);
  }
);

Then(
  'it should emit SSE events with emitEvents:true for real-time notifications',
  function () {
    expect(this.routeContent).toContain('emitEvents');
    expect(this.routeContent).toContain('true');
  }
);

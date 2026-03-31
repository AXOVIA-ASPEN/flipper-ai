/**
 * Step Definitions for Story 3.1: Craigslist Scraper
 * Validates scraper module structure, anti-detection, data extraction,
 * browser lifecycle, and integration with marketplace-scanner.
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

Given('the Craigslist scraper module exists', function () {
  expect(fileExists('src/scrapers/craigslist/index.ts')).toBe(true);
  expect(fileExists('src/scrapers/craigslist/scraper.ts')).toBe(true);
  expect(fileExists('src/scrapers/craigslist/types.ts')).toBe(true);
});

// ==================== Anti-detection (AC #1) ====================

Given('the scraper configuration at {string}', function (filePath: string) {
  this.filePath = filePath;
  this.fileContent = readFile(filePath);
});

When('I inspect the browser launch configuration', function () {
  // Content already loaded
});

Then('it should launch Chromium in headless mode', function () {
  expect(this.fileContent).toContain('headless: true');
});

Then(
  'it should pass {string} as a launch argument',
  function (arg: string) {
    expect(this.fileContent).toContain(arg);
  }
);

Then('it should set a custom user agent from a rotation pool', function () {
  expect(this.fileContent).toContain('getRandomUserAgent');
});

Then('the user agent pool should contain at least 5 entries', function () {
  const typesContent = readFile('src/scrapers/craigslist/types.ts');
  const uaMatches = typesContent.match(/Mozilla\/5\.0/g);
  expect(uaMatches).not.toBeNull();
  expect(uaMatches!.length).toBeGreaterThanOrEqual(5);
});

Then(
  'all user agents should reference Chrome version 130 or higher',
  function () {
    const typesContent = readFile('src/scrapers/craigslist/types.ts');
    const chromeVersions = typesContent.match(/Chrome\/(\d+)/g);
    expect(chromeVersions).not.toBeNull();
    for (const match of chromeVersions!) {
      const version = parseInt(match.replace('Chrome/', ''), 10);
      expect(version).toBeGreaterThanOrEqual(130);
    }
  }
);

// ==================== Multi-selector (AC #2) ====================

Given('the scraper extraction logic at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

When('I inspect the DOM extraction selectors', function () {
  // Content already loaded
});

Then('it should try {string} first', function (selector: string) {
  expect(this.fileContent).toContain(selector);
});

Then('it should fall back to {string}', function (selector: string) {
  expect(this.fileContent).toContain(selector);
});

Then('it should filter out sponsored listings', function () {
  expect(this.fileContent).toContain('sponsored');
});

// ==================== Data extraction (AC #3) ====================

Given('the scraper types at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

When('I inspect the CraigslistItem interface', function () {
  expect(this.fileContent).toContain('interface CraigslistItem');
});

Then('it should include a {string} field', function (field: string) {
  expect(this.fileContent).toContain(`${field}:`);
});

Then(
  'it should include a {string} field of type number',
  function (field: string) {
    const pattern = new RegExp(`${field}:\\s*number`);
    expect(this.fileContent).toMatch(pattern);
  }
);

Then('it should include an optional {string} field', function (field: string) {
  expect(this.fileContent).toContain(`${field}?:`);
});

// ==================== Browser cleanup (AC #4) ====================

Given('the scraper function at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

When('I inspect the scrapeCraigslist function', function () {
  expect(this.fileContent).toContain('export async function scrapeCraigslist');
});

Then('it should close the browser in a finally block', function () {
  expect(this.fileContent).toContain('finally');
  expect(this.fileContent).toMatch(/\.close\(\)/);
});

Then('it should handle browser close errors gracefully', function () {
  // The finally block should have a try-catch around browser.close()
  expect(this.fileContent).toMatch(/finally\s*\{[\s\S]*?try[\s\S]*?\.close\(\)[\s\S]*?catch/);
});

// ==================== Anti-detection (AC #5) ====================

When('I inspect the anti-detection features', function () {
  // Content already loaded
});

Then(
  'it should rotate user agents from a pool of current versions',
  function () {
    expect(this.fileContent).toContain('getRandomUserAgent');
    expect(this.fileContent).toContain('USER_AGENTS');
  }
);

Then('it should add randomized delays between interactions', function () {
  expect(this.fileContent).toContain('randomDelay');
});

Then(
  'it should set navigator.webdriver to false via addInitScript',
  function () {
    expect(this.fileContent).toContain('addInitScript');
    expect(this.fileContent).toContain('webdriver');
  }
);

Then(
  'it should use randomized viewport dimensions between 1280x800 and 1920x1080',
  function () {
    expect(this.fileContent).toContain('getRandomViewport');
    // Derive the types.ts path from the loaded scraper file's directory
    const typesPath = path.join(path.dirname(this.filePath), 'types.ts');
    const typesContent = readFile(typesPath);
    expect(typesContent).toContain('VIEWPORT_MIN_WIDTH: 1280');
    expect(typesContent).toContain('VIEWPORT_MAX_WIDTH: 1920');
    expect(typesContent).toContain('VIEWPORT_MIN_HEIGHT: 800');
    expect(typesContent).toContain('VIEWPORT_MAX_HEIGHT: 1080');
  }
);

// ==================== Module structure ====================

Given(
  'the scraper module directory at {string}',
  function (dirPath: string) {
    this.moduleDir = dirPath;
  }
);

When('I inspect the scraper module structure', function () {
  // Verify directory exists
  expect(fileExists(this.moduleDir)).toBe(true);
});

Then(
  '{string} should exist as the public entry point',
  function (filePath: string) {
    expect(fileExists(filePath)).toBe(true);
    const content = readFile(filePath);
    expect(content).toContain('export');
  }
);

Then(
  '{string} should contain the core scraping logic',
  function (filePath: string) {
    expect(fileExists(filePath)).toBe(true);
    const content = readFile(filePath);
    expect(content).toMatch(/export async function scrape\w+/);
  }
);

Then(
  '{string} should contain TypeScript interfaces',
  function (filePath: string) {
    expect(fileExists(filePath)).toBe(true);
    const content = readFile(filePath);
    expect(content).toContain('interface');
  }
);

Then(
  'the route at {string} should import from {string}',
  function (routePath: string, importPath: string) {
    const content = readFile(routePath);
    expect(content).toContain(importPath);
  }
);

// ==================== Concurrent job guard ====================

Given(
  'the scraper module exports {string}',
  function (exportName: string) {
    const content = readFile('src/scrapers/craigslist/index.ts');
    expect(content).toContain(exportName);
  }
);

When('I inspect the concurrent job guard logic', function () {
  this.routeContent = readFile('app/api/scraper/craigslist/route.ts');
});

Then(
  'the route should check for existing RUNNING jobs before starting a new one',
  function () {
    expect(this.routeContent).toContain('hasRunningJob');
  }
);

Then(
  'it should return a 403 error if a job is already running',
  function () {
    expect(this.routeContent).toContain('ForbiddenError');
  }
);

// ==================== Zero-results detection ====================

Given(
  'the scraper response type includes {string}',
  function (field: string) {
    const content = readFile('src/scrapers/craigslist/types.ts');
    expect(content).toContain(field);
  }
);

When(
  'the page loads but no listings are extracted',
  function () {
    const content = readFile('src/scrapers/craigslist/scraper.ts');
    this.scraperContent = content;
  }
);

Then('the scraper should return success as false', function () {
  expect(this.scraperContent).toContain('success: false');
});

Then(
  'the failure reason should be {string}',
  function (reason: string) {
    expect(this.scraperContent).toContain(reason);
  }
);

Then('the route should emit a {string} SSE event', function (eventType: string) {
  const routeContent = readFile('app/api/scraper/craigslist/route.ts');
  expect(routeContent).toContain(`type: '${eventType}'`);
});

// ==================== Marketplace scanner integration ====================

Given('the route at {string}', function (filePath: string) {
  this.routeContent = readFile(filePath);
});

When('I inspect the analysis pipeline', function () {
  // Content already loaded
});

Then(
  'it should use {string} from marketplace-scanner for algorithmic analysis',
  function (funcName: string) {
    expect(this.routeContent).toContain(funcName);
    expect(this.routeContent).toContain('marketplace-scanner');
  }
);

Then(
  'it should use {string} for response formatting',
  function (funcName: string) {
    expect(this.routeContent).toContain(funcName);
  }
);

Then(
  'it should include a summary with averageScore and categoryCounts in the response',
  function () {
    expect(this.routeContent).toContain('summary');
    expect(this.routeContent).toContain('averageScore');
    expect(this.routeContent).toContain('categoryCounts');
  }
);

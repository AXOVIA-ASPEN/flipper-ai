/**
 * Step Definitions for Story 3.3: Facebook Marketplace Scraper
 * Validates Graph API integration, Stagehand fallback, normalization,
 * anti-detection, rate limiting, and marketplace-scanner integration.
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

// ==================== Background / Context ====================

Given('the Facebook route at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

Given('the Facebook scraper module at {string}', function (filePath: string) {
  this.fileContent = readFile(filePath);
});

// ==================== AC #1: Graph API primary path ====================

When('I inspect the Facebook Graph API integration', function () {
  // Content already loaded
});

Then('it should call the Facebook Graph API v19.0 marketplace_search endpoint', function () {
  expect(this.fileContent).toContain('graph.facebook.com/v19.0');
  expect(this.fileContent).toContain('marketplace_search');
});

Then('it should use {string} from token-store for decrypted OAuth token retrieval', function (funcName: string) {
  expect(this.fileContent).toContain(funcName);
  expect(this.fileContent).toContain('token-store');
});

Then('it should check token expiry before making API calls', function () {
  expect(this.fileContent).toContain('expiresAt');
  expect(this.fileContent).toContain('expired');
});

Then('it should include {string} as a query parameter', function (param: string) {
  expect(this.fileContent).toContain(param);
});

// ==================== AC #2: Stagehand fallback ====================

When('I inspect the Facebook fallback chain', function () {
  // Content already loaded
});

Then('it should import {string} from the Stagehand scraper module', function (importName: string) {
  expect(this.fileContent).toContain(importName);
  expect(this.fileContent).toContain('@/scrapers/facebook/scraper');
});

Then('it should catch Graph API errors and attempt Stagehand fallback', function () {
  // Route should have try-catch around Graph API with Stagehand in the catch
  expect(this.fileContent).toContain('Graph API failed');
  expect(this.fileContent).toContain('scrapeAndConvert');
});

Then('it should map category IDs to Stagehand category names via CATEGORY_ID_TO_STAGEHAND_NAME', function () {
  expect(this.fileContent).toContain('CATEGORY_ID_TO_STAGEHAND_NAME');
  expect(this.fileContent).toContain('mapToStagehandConfig');
});

Then('it should track the method used as {string} or {string} in the response', function (method1: string, method2: string) {
  expect(this.fileContent).toContain(`'${method1}'`);
  expect(this.fileContent).toContain(`'${method2}'`);
  expect(this.fileContent).toContain('method');
});

// ==================== AC #3: RawListing normalization ====================

When('I inspect the Facebook listing normalization', function () {
  // Content already loaded
});

Then('it should have a {string} function for Graph API results', function (funcName: string) {
  expect(this.fileContent).toContain(`function ${funcName}`);
});

Then('it should map item.id to externalId for Graph API listings', function () {
  expect(this.fileContent).toContain('externalId: item.id');
});

Then('it should parse price strings to numeric askingPrice values', function () {
  expect(this.fileContent).toContain('parsePrice');
  expect(this.fileContent).toContain('askingPrice');
});

Then('it should format location from city, state, and zip fields', function () {
  expect(this.fileContent).toContain('formatLocation');
  expect(this.fileContent).toContain('city');
  expect(this.fileContent).toContain('state');
  expect(this.fileContent).toContain('zip');
});

// ==================== AC #3: Stagehand normalization ====================

When('I inspect the Facebook Stagehand normalization', function () {
  // Content already loaded
});

Then('it should have a {string} export for Stagehand results', function (funcName: string) {
  expect(this.fileContent).toContain(`export function ${funcName}`);
});

Then('it should generate external IDs from URL patterns or title-price hashes', function () {
  expect(this.fileContent).toContain('generateExternalId');
  expect(this.fileContent).toMatch(/\/item\/\(\\d\+\)/);
  expect(this.fileContent).toContain('fb-');
});

Then('it should handle price strings like {string} and {string}', function (_price1: string, _price2: string) {
  expect(this.fileContent).toContain('parsePrice');
  // Verify the price parsing strips non-numeric characters.
  // Escape the caret — otherwise JS parses it as an anchor and the regex can never match.
  expect(this.fileContent).toMatch(/replace\([^)]*\[\^0-9\.\]/);
});

// ==================== AC #4: Rate limiting ====================

When('I inspect the Facebook rate limit handling', function () {
  // Content already loaded
});

Then('it should detect HTTP 429 responses as rate limiting', function () {
  expect(this.fileContent).toContain('429');
  expect(this.fileContent).toContain('rate limit');
});

Then('it should apply exponential backoff with initial delay of {int}ms', function (ms: number) {
  expect(this.fileContent).toContain(`INITIAL_BACKOFF_MS = ${ms}`);
  expect(this.fileContent).toContain('Math.pow(2');
});

Then('it should cap backoff at {int}ms maximum', function (ms: number) {
  expect(this.fileContent).toContain(`MAX_BACKOFF_MS = ${ms}`);
  expect(this.fileContent).toContain('Math.min');
});

Then('it should retry up to {int} times before failing', function (retries: number) {
  expect(this.fileContent).toContain(`MAX_RETRIES = ${retries}`);
});

// ==================== AC #4: Auth error handling ====================

When('I inspect the Facebook auth error handling', function () {
  // Content already loaded
});

Then('it should detect 401 and 403 responses as token errors', function () {
  expect(this.fileContent).toContain('response.status === 401');
  expect(this.fileContent).toContain('response.status === 403');
});

Then('it should emit SSE {string} events on auth failures', function (eventType: string) {
  expect(this.fileContent).toContain(`type: '${eventType}'`);
});

Then('it should throw UnauthorizedError for expired or revoked tokens', function () {
  expect(this.fileContent).toContain('UnauthorizedError');
  expect(this.fileContent).toContain('expired');
});

Then('it should NOT retry on auth errors', function () {
  // After throwing UnauthorizedError, the catch block re-throws without retry
  expect(this.fileContent).toContain('if (error instanceof UnauthorizedError) throw error');
});

// ==================== Concurrent job guard ====================

When('I inspect the Facebook concurrent job guard', function () {
  // Content already loaded
});

Then('the route should check for RUNNING jobs with platform FACEBOOK_MARKETPLACE', function () {
  expect(this.fileContent).toContain("platform: 'FACEBOOK_MARKETPLACE'");
  expect(this.fileContent).toContain("status: 'RUNNING'");
  expect(this.fileContent).toContain('scraperJob.findFirst');
});

Then('it should throw ValidationError if a job is already running', function () {
  expect(this.fileContent).toContain('ValidationError');
  expect(this.fileContent).toContain('already running');
});

// ==================== Marketplace scanner integration ====================

When('I inspect the Facebook analysis pipeline', function () {
  // Content already loaded
});

Then('it should use {string} from marketplace-scanner for batch analysis', function (funcName: string) {
  expect(this.fileContent).toContain(funcName);
  expect(this.fileContent).toContain('marketplace-scanner');
});

Then('it should use {string} for database-ready listing format', function (funcName: string) {
  expect(this.fileContent).toContain(funcName);
});

Then('it should use {string} for response summary generation', function (funcName: string) {
  expect(this.fileContent).toContain(funcName);
});

Then('it should pass emitEvents true and userId for SSE event emission', function () {
  expect(this.fileContent).toContain('emitEvents: true');
  expect(this.fileContent).toContain('userId');
});

Then('it should emit {string} SSE events during listing saves', function (eventType: string) {
  expect(this.fileContent).toContain(`type: '${eventType}'`);
});

Then('it should emit {string} SSE events on successful completion', function (eventType: string) {
  expect(this.fileContent).toContain(`type: '${eventType}'`);
});

// ==================== Module structure ====================

When('I inspect the Facebook scraper module structure', function () {
  expect(fileExists(this.moduleDir)).toBe(true);
});

Then('{string} should exist as a public entry point', function (filePath: string) {
  expect(fileExists(filePath)).toBe(true);
  const content = readFile(filePath);
  expect(content).toContain('export');
});

Then('{string} should contain Stagehand scraping logic', function (filePath: string) {
  expect(fileExists(filePath)).toBe(true);
  const content = readFile(filePath);
  expect(content).toContain('Stagehand');
  expect(content).toContain('scrapeFacebookMarketplace');
});

Then('{string} should contain Zod schemas and TypeScript interfaces', function (filePath: string) {
  expect(fileExists(filePath)).toBe(true);
  const content = readFile(filePath);
  expect(content).toContain('z.object');
  expect(content).toContain('interface');
});

Then('{string} should contain encrypted token management', function (filePath: string) {
  expect(fileExists(filePath)).toBe(true);
  const content = readFile(filePath);
  expect(content).toContain('getToken');
  expect(content).toContain('encrypt');
});

Then('{string} should contain OAuth flow logic', function (filePath: string) {
  expect(fileExists(filePath)).toBe(true);
  const content = readFile(filePath);
  expect(content).toContain('OAuth');
});

// ==================== Anti-detection: Stagehand jitter ====================

When('I inspect the Facebook Stagehand anti-detection features', function () {
  // Content already loaded
});

Then('it should add randomized delay jitter between detail page fetches', function () {
  expect(this.fileContent).toContain('jitterMs');
  expect(this.fileContent).toContain('Math.random()');
});

Then('it should dismiss login popups via AI actions', function () {
  expect(this.fileContent).toContain('login popup');
  expect(this.fileContent).toContain('close');
});

Then('it should close Stagehand in a finally block', function () {
  expect(this.fileContent).toContain('finally');
  expect(this.fileContent).toContain('stagehand.close()');
});

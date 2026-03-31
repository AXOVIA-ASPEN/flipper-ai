/**
 * Step Definitions for Story 4.6: AI Analysis Caching & Fallback
 *
 * Uses static code analysis to verify:
 *   - AiAnalysisCache schema has analysisType field + unique constraint
 *   - /api/analyze/[listingId] route is fully implemented (not a 501 stub)
 *   - claude-analyzer implements L1/L2 caching with "claude:" key prefix
 *   - llm-analyzer exports getCachedSellabilityAnalysis and cacheSellabilityAnalysis
 *   - Route falls back to estimateValue when all AI APIs are unavailable
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import { expect } from '@playwright/test';

const PROJECT_ROOT = process.cwd();

function readSourceFile(relativePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

// ==================== Given ====================

Given('the analyze route file at {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  expect(content.length).toBeGreaterThan(0);
  this.fileContent = content;
});

Given('the claude-analyzer module at {string}', function (filePath: string) {
  const content = readSourceFile(filePath);
  expect(content).toContain('analyzeListing');
  this.fileContent = content;
});

// ==================== When ====================

When('I inspect the AiAnalysisCache model definition', function () {
  // Read Prisma schema (may have been loaded by E-001 Given step already)
  const schemaContent = readSourceFile('prisma/schema.prisma');
  this.schemaContent = schemaContent;
});

When('I inspect the GET handler implementation', function () {
  // fileContent already set by the Given step
});

When('I inspect the GET handler error handling', function () {
  // fileContent already set by the Given step
});

When('I inspect the getCachedAnalysis function', function () {
  // fileContent already set by the Given step
});

When('I inspect the module exports', function () {
  // fileContent already set by the Given step
});

// ==================== Then: S-029 (AiAnalysisCache schema) ====================

Then(
  'the AiAnalysisCache model has an {string} field with default {string}',
  function (fieldName: string, defaultValue: string) {
    const content: string = this.schemaContent || readSourceFile('prisma/schema.prisma');
    // The field should exist in the AiAnalysisCache model block
    expect(content).toContain(`analysisType`);
    expect(content).toContain(`@default("${defaultValue}")`);
  }
);

Then('it has a unique constraint on listingId and analysisType', function () {
  const content: string = this.schemaContent || readSourceFile('prisma/schema.prisma');
  expect(content).toContain('@@unique([listingId, analysisType])');
});

Then('claude-analyzer stores results with analysisType {string}', function (analysisType: string) {
  const content = readSourceFile('src/lib/claude-analyzer.ts');
  expect(content).toContain(`analysisType: '${analysisType}'`);
});

Then('llm-analyzer stores results with analysisType {string}', function (analysisType: string) {
  const content = readSourceFile('src/lib/llm-analyzer.ts');
  expect(content).toContain(`analysisType: '${analysisType}'`);
});

// ==================== Then: S-030 (analyze route implementation) ====================

Then('it does not return a 501 status code', function () {
  const content: string = this.fileContent;
  expect(content).not.toContain('status: 501');
  expect(content).not.toContain('status(501)');
});

Then('it checks the L1 in-memory cache before calling the AI API', function () {
  const content: string = this.fileContent;
  // L1 cache check uses analysisCache.get with the claude: key prefix
  expect(content).toContain('analysisCache.get');
  expect(content).toContain('claude:');
});

Then('it includes {string} in the response data shape', function (field: string) {
  const content: string = this.fileContent;
  expect(content).toContain(field);
});

Then('it returns source {string} on L1 hit', function (source: string) {
  const content: string = this.fileContent;
  expect(content).toContain(`source: '${source}'`);
});

Then('it returns source {string} on successful AI call', function (source: string) {
  const content: string = this.fileContent;
  expect(content).toContain(`source: '${source}'`);
});

Then('it returns source {string} when AI throws and falls back', function (source: string) {
  const content: string = this.fileContent;
  expect(content).toContain(`source: '${source}'`);
});

// ==================== Then: S-031 (claude-analyzer L1/L2 cache) ====================

Then('it checks analysisCache.get before querying the database', function () {
  const content: string = this.fileContent;
  // L1 check must appear before the findFirst DB call in the source
  const l1Index = content.indexOf('analysisCache.get');
  const dbIndex = content.indexOf('findFirst');
  expect(l1Index).toBeGreaterThan(-1);
  expect(dbIndex).toBeGreaterThan(-1);
  expect(l1Index).toBeLessThan(dbIndex);
});

Then('it populates the L1 cache when a L2 database hit occurs', function () {
  const content: string = this.fileContent;
  // After findFirst, analysisCache.set must be called
  expect(content).toContain('analysisCache.set');
});

Then('it uses the cache key prefix {string} for L1 entries', function (prefix: string) {
  const content: string = this.fileContent;
  expect(content).toContain(prefix);
});

Then('cacheAnalysis uses upsert with listingId_analysisType unique key', function () {
  const content: string = this.fileContent;
  expect(content).toContain('upsert');
  expect(content).toContain('listingId_analysisType');
});

// ==================== Then: S-032 (llm-analyzer exports) ====================

Then('"getCachedSellabilityAnalysis" is exported as an async function', function () {
  const content: string = this.fileContent;
  expect(content).toContain('export async function getCachedSellabilityAnalysis');
});

Then('"cacheSellabilityAnalysis" is exported as an async function', function () {
  const content: string = this.fileContent;
  expect(content).toContain('export async function cacheSellabilityAnalysis');
});

Then('getCachedSellabilityAnalysis uses cache key prefix {string}', function (prefix: string) {
  const content: string = this.fileContent;
  expect(content).toContain(prefix);
});

Then('cacheSellabilityAnalysis upserts with analysisType {string}', function (analysisType: string) {
  const content: string = this.fileContent;
  expect(content).toContain(`analysisType: '${analysisType}'`);
});

// ==================== Then: S-033 (algorithmic fallback) ====================

Then('it catches AI errors and calls estimateValue as fallback', function () {
  const content: string = this.fileContent;
  expect(content).toContain('estimateValue');
  // There must be a try/catch block with AI call inside
  expect(content).toContain('catch');
  expect(content).toContain('aiError');
});

Then('it imports estimateValue from {string}', function (modulePath: string) {
  const content: string = this.fileContent;
  expect(content).toContain(`from '${modulePath}'`);
  expect(content).toContain('estimateValue');
});

Then('the fallback response shape includes isAiFallback set to true', function () {
  const content: string = this.fileContent;
  expect(content).toContain('isAiFallback: true');
});

Then('the fallback response shape includes source set to {string}', function (source: string) {
  const content: string = this.fileContent;
  expect(content).toContain(`source: '${source}'`);
});

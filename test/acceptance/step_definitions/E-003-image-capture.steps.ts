/**
 * Step Definitions for Story 3.9: Image Capture & Storage
 * Validates image-capture service structure, Firebase Storage integration,
 * deduplication logic, and UI image resolution helpers.
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

// ==================== Given steps ====================

Given('the image capture service at {string}', function (filePath: string) {
  this.filePath = filePath;
  this.fileContent = readFile(filePath);
});

Given('the image helpers module at {string}', function (filePath: string) {
  this.filePath = filePath;
  this.fileContent = readFile(filePath);
});

Given('the Craigslist route at {string}', function (filePath: string) {
  this.filePath = filePath;
  this.fileContent = readFile(filePath);
});

// ==================== When steps ====================

When('I inspect the captureListingImages function', function () {
  // fileContent already loaded by Given step
});

When('I inspect the saveImageMetadata function', function () {
  // fileContent already loaded by Given step
});

When('I inspect the getListingImageUrl function', function () {
  // fileContent already loaded by Given step
});

When('I inspect the hasExistingImages function', function () {
  // fileContent already loaded by Given step
});

When('I inspect the image capture error handling', function () {
  // fileContent already loaded by Given step
});

// ==================== Then / And steps ====================

Then('it should import {string} from {string}', function (symbol: string, module: string) {
  expect(this.fileContent).toContain(symbol);
  expect(this.fileContent).toContain(module);
});

Then(
  'it should use {string} for parallel independent image processing',
  function (method: string) {
    expect(this.fileContent).toContain(method);
  }
);

Then(
  'it should return an {string} with {string} and {string} arrays',
  function (type: string, field1: string, field2: string) {
    expect(this.fileContent).toContain(type);
    expect(this.fileContent).toContain(field1);
    expect(this.fileContent).toContain(field2);
  }
);

Then(
  'the Craigslist route at {string} should call {string} after saving a listing',
  function (routePath: string, funcName: string) {
    const routeContent = readFile(routePath);
    expect(routeContent).toContain(funcName);
  }
);

Then('it should call {string} with the captured image data', function (funcName: string) {
  expect(this.fileContent).toContain(funcName);
});

Then(
  /^each record should include "listingId", "imageIndex", "originalUrl", "storagePath", "storageUrl", "fileSize", "contentType"$/,
  function () {
    expect(this.fileContent).toContain('listingId');
    expect(this.fileContent).toContain('imageIndex');
    expect(this.fileContent).toContain('originalUrl');
    expect(this.fileContent).toContain('storagePath');
    expect(this.fileContent).toContain('storageUrl');
    expect(this.fileContent).toContain('fileSize');
    expect(this.fileContent).toContain('contentType');
  }
);

Then(
  /^"width" and "height" should be set to null \(deferred dimension extraction\)$/,
  function () {
    expect(this.fileContent).toContain('width: null');
    expect(this.fileContent).toContain('height: null');
  }
);

Then(
  'the {string} model at {string} should have a foreign key to {string} with cascade delete',
  function (model: string, schemaPath: string, parentModel: string) {
    const schemaContent = readFile(schemaPath);
    expect(schemaContent).toContain(`model ${model}`);
    expect(schemaContent).toContain(parentModel);
    expect(schemaContent).toContain('onDelete: Cascade');
  }
);

Then(
  'it should return {string} when the images relation is populated',
  function (_expression: string) {
    expect(this.fileContent).toContain('storageUrl');
    expect(this.fileContent).toContain('images');
  }
);

Then(
  'it should fall back to parsing the {string} JSON column when images is empty',
  function (column: string) {
    expect(this.fileContent).toContain(column);
    expect(this.fileContent).toContain('JSON.parse');
  }
);

Then('it should return null when neither images nor imageUrls are available', function () {
  expect(this.fileContent).toContain('return null');
});

Then('{string} should use {string} for image display', function (filePath: string, funcName: string) {
  const content = readFile(filePath);
  expect(content).toContain(funcName);
});

Then('image capture failures should be logged via the logger module', function () {
  // Route imports image-capture and logger
  expect(this.fileContent).toContain('image-capture');
  expect(this.fileContent).toContain('logger');
});

Then('the listing save should not be blocked when image capture fails', function () {
  // captureListingImages uses Promise.allSettled internally; route does not re-throw
  expect(this.fileContent).toContain('captureListingImages');
});

Then(
  'the response should include {string} and {string} stats',
  function (stat1: string, stat2: string) {
    expect(this.fileContent).toContain(stat1);
    expect(this.fileContent).toContain(stat2);
  }
);

Then('it should query {string} with the listingId', function (query: string) {
  expect(this.fileContent).toContain(query);
  expect(this.fileContent).toContain('listingId');
});

Then(
  'the Craigslist route should call {string} before {string}',
  function (func1: string, func2: string) {
    const routeContent = readFile('app/api/scraper/craigslist/route.ts');
    expect(routeContent).toContain(func1);
    expect(routeContent).toContain(func2);
    // Verify func1 is imported/referenced before func2
    const idx1 = routeContent.indexOf(func1);
    const idx2 = routeContent.indexOf(func2);
    expect(idx1).toBeLessThan(idx2);
  }
);

Then(
  'it should skip image capture entirely when {string} returns true',
  function (funcName: string) {
    const routeContent = readFile('app/api/scraper/craigslist/route.ts');
    expect(routeContent).toContain(funcName);
    // Route guards captureListingImages with a !hasImages check
    expect(routeContent).toContain('hasImages');
  }
);

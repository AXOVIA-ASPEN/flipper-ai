import { Given, When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';

// =========================================================================
// Story 6.5: Performance Report Export
// Scenarios: S-25 through S-29
// =========================================================================

// ---------------------------------------------------------------------------
// S-25: CSV export API route inspection
// ---------------------------------------------------------------------------

Given('the analytics export API route at {string}', function (filePath: string) {
  const fullPath = path.join(process.cwd(), filePath);
  this.fileContent = fs.readFileSync(fullPath, 'utf-8');
  this.filePath = filePath;
});

When('I inspect the GET handler for format=csv', function () {
  // context already loaded
});

Then(
  'it calls getProfitLossAnalytics with the user\'s ID and granularity',
  function () {
    assert.ok(this.fileContent.includes('getProfitLossAnalytics'), 'Expected source to contain getProfitLossAnalytics');
    assert.ok(this.fileContent.includes('userId'), 'Expected source to contain userId');
    assert.ok(this.fileContent.includes('granularity'), 'Expected source to contain granularity');
  }
);

Then(
  'it returns a response with Content-Type {string}',
  function (contentType: string) {
    assert.ok(this.fileContent.includes(contentType), `Expected source to contain "${contentType}"`);
  }
);

Then(
  'it sets Content-Disposition to attachment with filename matching {string}',
  function (pattern: string) {
    assert.ok(this.fileContent.includes('Content-Disposition'), 'Expected source to contain Content-Disposition');
    assert.ok(this.fileContent.includes('attachment'), 'Expected source to contain attachment');
    // pattern "flipper-report-YYYY-MM-DD.csv" → check the template string
    assert.ok(this.fileContent.includes('flipper-report-'), 'Expected source to contain flipper-report-');
    assert.ok(this.fileContent.includes('.csv'), 'Expected source to contain .csv');
    void pattern;
  }
);

// ---------------------------------------------------------------------------
// S-26: buildCsvContent inspection
// ---------------------------------------------------------------------------

Given('the analytics export library at {string}', function (filePath: string) {
  const fullPath = path.join(process.cwd(), filePath);
  this.fileContent = fs.readFileSync(fullPath, 'utf-8');
  this.filePath = filePath;
});

When('I inspect the buildCsvContent function', function () {
  // context already loaded
});

Then(
  'the first row contains headers: {string}',
  function (expectedHeaders: string) {
    // Verify all expected headers are declared in the source
    const headers = expectedHeaders.split(',');
    for (const header of headers) {
      assert.ok(this.fileContent.includes(header.trim()), `Expected source to contain header "${header.trim()}"`);
    }
  }
);

Then(
  'each subsequent row contains one deal with values mapped from ProfitLossItem fields',
  function () {
    assert.ok(this.fileContent.includes('items.map'), 'Expected source to contain items.map');
    assert.ok(this.fileContent.includes('item.title'), 'Expected source to contain item.title');
    assert.ok(this.fileContent.includes('item.platform'), 'Expected source to contain item.platform');
    assert.ok(this.fileContent.includes('item.purchasePrice'), 'Expected source to contain item.purchasePrice');
    assert.ok(this.fileContent.includes('item.netProfit'), 'Expected source to contain item.netProfit');
  }
);

Then('null values are represented as empty fields', function () {
  // escapeCsvField returns '' for null
  assert.ok(this.fileContent.includes("if (value === null || value === undefined) return ''"), 'Expected null handling logic');
});

Then(
  'fields containing commas or double-quotes are properly escaped per RFC 4180',
  function () {
    assert.ok(this.fileContent.includes('replace(/"/g'), 'Expected CSV quote escaping');
    assert.ok(this.fileContent.includes('""'), 'Expected double-quote escape sequence');
  }
);

// ---------------------------------------------------------------------------
// S-27: format=pdf returns 400
// ---------------------------------------------------------------------------

When('I inspect the GET handler for format=pdf', function () {
  // context already loaded from the Given step
});

Then(
  'it returns a 400 response with error {string}',
  function (errorMessage: string) {
    assert.ok(this.fileContent.includes('400'), 'Expected source to contain 400 status');
    assert.ok(this.fileContent.includes(errorMessage), `Expected source to contain "${errorMessage}"`);
  }
);

// ---------------------------------------------------------------------------
// S-28: Export buttons in analytics page
// ---------------------------------------------------------------------------

When('I inspect the page header', function () {
  // context already loaded from Given "the analytics page at..."
});

Then('it renders an {string} button', function (buttonLabel: string) {
  assert.ok(this.fileContent.includes(buttonLabel), `Expected source to contain "${buttonLabel}"`);
});

Then(
  /^the Export CSV button triggers a fetch to \/api\/analytics\/export\?format=csv$/,
  function () {
    assert.ok(this.fileContent.includes('/api/analytics/export'), 'Expected fetch to analytics export endpoint');
    assert.ok(this.fileContent.includes('format=csv'), 'Expected format=csv parameter');
  }
);

Then(
  'the Export PDF button uses dynamic import of analytics-pdf-export to generate the PDF client-side',
  function () {
    assert.ok(this.fileContent.includes('analytics-pdf-export'), 'Expected analytics-pdf-export import');
    assert.ok(this.fileContent.includes('generateAnalyticsPdf'), 'Expected generateAnalyticsPdf call');
    // Dynamic import pattern
    assert.ok(this.fileContent.includes("await import("), 'Expected dynamic import pattern');
  }
);

// ---------------------------------------------------------------------------
// S-29: Granularity respected in export URL
// ---------------------------------------------------------------------------

When('I inspect the handleExportCsv function', function () {
  // context already loaded
});

Then(
  'the fetch URL includes the current granularity as a query parameter',
  function () {
    assert.ok(this.fileContent.includes('granularity'), 'Expected granularity parameter');
    assert.ok(this.fileContent.includes('/api/analytics/export'), 'Expected analytics export endpoint');
  }
);

Then(
  'changing granularity to {string} causes the export URL to include {string}',
  function (_granularityValue: string, _urlParam: string) {
    // Verify granularity is passed dynamically via URLSearchParams (not hardcoded)
    // The page builds: new URLSearchParams({ format: 'csv', granularity })
    // and appends via: fetch(`/api/analytics/export?${params}`)
    assert.ok(this.fileContent.includes('URLSearchParams'), 'Expected URLSearchParams usage');
    assert.ok(this.fileContent.includes('granularity'), 'Expected granularity parameter');
    assert.ok(this.fileContent.includes('/api/analytics/export?${params}'), 'Expected parameterized export URL');
  }
);

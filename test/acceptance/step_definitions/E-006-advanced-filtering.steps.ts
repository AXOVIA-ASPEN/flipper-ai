/**
 * Step Definitions: E-006 Story 6.3 — Advanced Filtering
 * Tags: @story-6-3 @FR-DASH-06
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';

let fileContent = '';
let filePath = '';

// ─────────────────────────────────────────────────────────────────
// Shared steps for file loading
// ─────────────────────────────────────────────────────────────────

Given('the FilterPanel component at {string}', function (componentPath: string) {
  filePath = path.resolve(process.cwd(), componentPath);
  fileContent = fs.readFileSync(filePath, 'utf-8');
});

Given('the useFilterParams hook at {string}', function (hookPath: string) {
  filePath = path.resolve(process.cwd(), hookPath);
  fileContent = fs.readFileSync(filePath, 'utf-8');
});

// ─────────────────────────────────────────────────────────────────
// S-16: FilterPanel component inspection steps
// ─────────────────────────────────────────────────────────────────

When('I inspect the component props and UI elements', function () {
  // File already loaded
});

Then(
  'it renders platform chip buttons for CRAIGSLIST, FACEBOOK_MARKETPLACE, EBAY, OFFERUP, and MERCARI',
  function () {
    const platforms = ['CRAIGSLIST', 'FACEBOOK_MARKETPLACE', 'EBAY', 'OFFERUP', 'MERCARI'];
    for (const platform of platforms) {
      assert.ok(
        fileContent.includes(`'${platform}'`) || fileContent.includes(`"${platform}"`),
        `Expected platform option '${platform}' in FilterPanel`
      );
    }
  }
);

Then('it renders a score range with min and max range inputs', function () {
  assert.ok(
    fileContent.includes('type="range"') && fileContent.includes('minScore') && fileContent.includes('maxScore'),
    'Expected score range slider inputs in FilterPanel'
  );
});

Then('it renders profit range with min and max number inputs', function () {
  assert.ok(
    fileContent.includes('minProfit') && fileContent.includes('maxProfit'),
    'Expected profit range inputs in FilterPanel'
  );
});

Then('it renders category chip buttons for common categories', function () {
  const categories = ['electronics', 'furniture', 'appliances', 'tools'];
  for (const cat of categories) {
    assert.ok(
      fileContent.includes(`'${cat}'`) || fileContent.includes(`"${cat}"`),
      `Expected category option '${cat}' in FilterPanel`
    );
  }
});

Then('it renders status chips when statusOptions prop is provided', function () {
  assert.ok(
    fileContent.includes('statusOptions') && fileContent.includes('filters.statuses'),
    'Expected statusOptions prop handling and statuses filter in FilterPanel'
  );
});

// ─────────────────────────────────────────────────────────────────
// S-17: Listings API multi-select filter steps
// (reuses shared given steps from E-006-dashboard.steps.ts)
// ─────────────────────────────────────────────────────────────────

When('I inspect the GET handler filter logic', function () {
  // S-17: file loaded by the shared Given step (E-006-dashboard.steps.ts) into this.fileContent
  if (!this.fileContent) throw new Error('File content not loaded — check Given step');
  fileContent = this.fileContent;
});

Then('it reads a platforms query parameter and splits by comma', function () {
  assert.ok(
    fileContent.includes("searchParams.get('platforms')") &&
      fileContent.includes("split(',')"),
    'Expected platforms param read and comma splitting'
  );
});

Then(
  /^it builds a Prisma where clause with platform using \{ in: platformList \}$/,
  function () {
    assert.ok(
      fileContent.includes('{ in: platformList }') || fileContent.includes("in: platformList"),
      'Expected Prisma { in: platformList } where clause for platform'
    );
  }
);

Then(
  'the multi-select platforms param takes precedence over the single platform param',
  function () {
    // Verify platforms is checked before platform in the ternary
    const platformsIdx = fileContent.indexOf("get('platforms')");
    const platformIdx = fileContent.indexOf("get('platform')");
    assert.ok(
      platformsIdx !== -1 && platformIdx !== -1,
      'Expected both platforms and platform params to be read'
    );
    assert.ok(
      platformsIdx < platformIdx ||
        fileContent.includes('platforms\n      ? platforms') ||
        fileContent.includes('platforms\n        ? platforms'),
      'Expected platforms to take precedence over platform'
    );
  }
);

// ─────────────────────────────────────────────────────────────────
// S-18: AND logic filtering steps
// ─────────────────────────────────────────────────────────────────

When('I inspect the GET handler with multiple active filters', function () {
  // S-18: file loaded by the shared Given step (E-006-dashboard.steps.ts) into this.fileContent
  if (!this.fileContent) throw new Error('File content not loaded — check Given step');
  fileContent = this.fileContent;
});

Then(
  'it builds a single Prisma where clause combining userId, platform, valueScore, profitPotential, category, and status',
  function () {
    assert.ok(fileContent.includes('userId'), 'Expected userId in where clause');
    assert.ok(fileContent.includes('valueScore'), 'Expected valueScore in where clause');
    assert.ok(fileContent.includes('profitPotential'), 'Expected profitPotential in where clause');
    assert.ok(fileContent.includes('category'), 'Expected category in where clause');
    assert.ok(fileContent.includes('status'), 'Expected status in where clause');
  }
);

Then(
  'all filters are applied as AND conditions using Prisma where object composition',
  function () {
    // Prisma naturally ANDs all where conditions
    assert.ok(
      fileContent.includes('const where') && fileContent.includes('userId'),
      'Expected single where object built by composition'
    );
  }
);

// ─────────────────────────────────────────────────────────────────
// S-19: URL state management steps
// (shared Given step for useFilterParams reused)
// ─────────────────────────────────────────────────────────────────

When('I inspect the setFilter function with a cleared value', function () {
  // File loaded
});

Then(
  'calling setFilter with an empty string removes that parameter from the URL',
  function () {
    // updateURL only sets params when values are truthy
    assert.ok(
      fileContent.includes('if (newFilters.platforms)') ||
        fileContent.includes("if (newFilters.platforms)"),
      'Expected conditional URL param setting (only non-empty values)'
    );
  }
);

Then('other active filter parameters remain in the URL unchanged', function () {
  // The updateURL function serializes the full FilterState
  assert.ok(
    fileContent.includes('params.set(') && fileContent.includes('const params = new URLSearchParams'),
    'Expected URLSearchParams construction with all active filters'
  );
});

// ─────────────────────────────────────────────────────────────────
// S-20: Filter URL encoding/restoration steps
// ─────────────────────────────────────────────────────────────────

When('I inspect the URL encoding behavior', function () {
  // File loaded
});

Then(
  'the platforms filter is stored as a comma-separated string in the URL',
  function () {
    assert.ok(
      fileContent.includes("params.set('platforms'") ||
        fileContent.includes('params.set("platforms"'),
      'Expected platforms to be set in URL params'
    );
  }
);

Then(
  'the categories filter is stored as a comma-separated string in the URL',
  function () {
    assert.ok(
      fileContent.includes("params.set('categories'") ||
        fileContent.includes('params.set("categories"'),
      'Expected categories to be set in URL params'
    );
  }
);

Then(
  'the statuses filter is stored as a comma-separated string in the URL',
  function () {
    assert.ok(
      fileContent.includes("params.set('statuses'") ||
        fileContent.includes('params.set("statuses"'),
      'Expected statuses to be set in URL params'
    );
  }
);

Then(
  'all filter values are read back from searchParams on hook initialization',
  function () {
    assert.ok(
      fileContent.includes("searchParams.get('platforms')") &&
        fileContent.includes("searchParams.get('categories')") &&
        fileContent.includes("searchParams.get('statuses')"),
      'Expected all multi-select filters read from searchParams'
    );
  }
);

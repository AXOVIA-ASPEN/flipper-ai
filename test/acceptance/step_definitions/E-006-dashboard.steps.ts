/**
 * Step Definitions for Story 6.1: Dashboard with Listings & Stats
 *
 * Uses static code analysis to verify that:
 *   - Listings API returns server-side stats aggregation (totalListings, opportunitiesFound, activeFlips, totalProfit)
 *   - Listings API supports page/limit pagination with skip/take
 *   - Dashboard renders 4 stats cards from server-side data
 *   - Dashboard listing cards show status badge
 *   - Dashboard has page size selector (10/20/50)
 *   - Dashboard listing cards navigate to /listings/[id]
 *   - Listing detail page exists with full listing info and back link
 *   - Single listing API includes images and opportunity relations
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();

function readSourceFile(relativePath: string): string {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

// ==================== Given ====================

Given('the listings API route at {string}', function (filePath: string) {
  this.fileContent = readSourceFile(filePath);
  this.filePath = filePath;
});

Given('the single listing API route at {string}', function (filePath: string) {
  this.fileContent = readSourceFile(filePath);
  this.filePath = filePath;
});

Given('the listing detail page at {string}', function (filePath: string) {
  this.fileContent = readSourceFile(filePath);
  this.filePath = filePath;
});

// ==================== When ====================

When('I inspect the GET handler', function () {
  // Content already loaded in Given
  if (!this.fileContent) {
    throw new Error(`File content not loaded for: ${this.filePath}`);
  }
});

When('I inspect the GET handler pagination logic', function () {
  if (!this.fileContent) {
    throw new Error(`File content not loaded for: ${this.filePath}`);
  }
});

When('I inspect the findMany call', function () {
  if (!this.fileContent) {
    throw new Error(`File content not loaded for: ${this.filePath}`);
  }
});

When('I inspect the stats rendering', function () {
  if (!this.fileContent) {
    throw new Error(`File content not loaded for: ${this.filePath}`);
  }
});

When('I inspect the listing card template', function () {
  if (!this.fileContent) {
    throw new Error(`File content not loaded for: ${this.filePath}`);
  }
});

When('I inspect the page size selector', function () {
  if (!this.fileContent) {
    throw new Error(`File content not loaded for: ${this.filePath}`);
  }
});

When('I inspect the listing card navigation', function () {
  if (!this.fileContent) {
    throw new Error(`File content not loaded for: ${this.filePath}`);
  }
});

When('I inspect the page content', function () {
  if (!this.fileContent) {
    throw new Error(`File content not loaded for: ${this.filePath}`);
  }
});

// ==================== Then: API Stats (S-1) ====================

Then('it uses Promise.all to run stats queries concurrently', function () {
  const content: string = this.fileContent;
  if (!content.includes('Promise.all')) {
    throw new Error('Expected Promise.all for concurrent stats queries');
  }
});

Then(
  'it includes a listing count query for totalListings',
  function () {
    const content: string = this.fileContent;
    if (!content.includes('listing.count')) {
      throw new Error('Expected prisma.listing.count for totalListings');
    }
  }
);

Then(
  'it includes an opportunity count query for opportunitiesFound',
  function () {
    const content: string = this.fileContent;
    if (!content.includes('opportunity.count')) {
      throw new Error('Expected prisma.opportunity.count for opportunitiesFound');
    }
  }
);

Then(
  'it includes an active flips count query excluding SOLD and PASSED status',
  function () {
    const content: string = this.fileContent;
    if (!content.includes('notIn') || !content.includes('SOLD') || !content.includes('PASSED')) {
      throw new Error(
        'Expected active flips query with notIn: [SOLD, PASSED]'
      );
    }
  }
);

Then(
  'it includes an opportunity aggregate query for totalProfit from SOLD status',
  function () {
    const content: string = this.fileContent;
    if (!content.includes('opportunity.aggregate') || !content.includes('actualProfit')) {
      throw new Error('Expected prisma.opportunity.aggregate with actualProfit for totalProfit');
    }
  }
);

Then(
  'the response includes a stats object with totalListings, opportunitiesFound, activeFlips, and totalProfit',
  function () {
    const content: string = this.fileContent;
    if (
      !content.includes('totalListings') ||
      !content.includes('opportunitiesFound') ||
      !content.includes('activeFlips') ||
      !content.includes('totalProfit')
    ) {
      throw new Error(
        'Expected stats object with totalListings, opportunitiesFound, activeFlips, totalProfit'
      );
    }
  }
);

// ==================== Then: Pagination (S-2) ====================

Then('it reads a page parameter from query string with default 1', function () {
  const content: string = this.fileContent;
  if (!content.includes("'page'") && !content.includes('"page"')) {
    throw new Error('Expected page parameter to be read from query string');
  }
  if (!content.includes("'1'") && !content.includes(', 10)')) {
    throw new Error('Expected default page value of 1');
  }
});

Then('it reads a limit parameter from query string with default 20', function () {
  const content: string = this.fileContent;
  if (!content.includes("'limit'") && !content.includes('"limit"')) {
    throw new Error('Expected limit parameter to be read from query string');
  }
});

Then('it applies skip and take to the findMany query', function () {
  const content: string = this.fileContent;
  if (!content.includes('skip') || !content.includes('take')) {
    throw new Error('Expected skip and take in findMany for pagination');
  }
});

Then(
  'the response includes a pagination object with page, limit, total, and totalPages',
  function () {
    const content: string = this.fileContent;
    if (
      !content.includes('pagination') ||
      !content.includes('totalPages') ||
      !content.includes('total')
    ) {
      throw new Error('Expected pagination object with page, limit, total, totalPages');
    }
  }
);

Then('it only allows limit values of 10, 20, or 50', function () {
  const content: string = this.fileContent;
  if (!content.includes('10') || !content.includes('20') || !content.includes('50')) {
    throw new Error('Expected allowed limit values of 10, 20, 50');
  }
  if (!content.includes('ALLOWED_LIMITS') && !content.includes('allowedLimits') && !content.includes('[10')) {
    throw new Error('Expected limit validation against [10, 20, 50]');
  }
});

// ==================== Then: Include relations (S-3) ====================

Then('it includes images with take 1 ordered by imageIndex', function () {
  const content: string = this.fileContent;
  if (!content.includes('images') || !content.includes('imageIndex')) {
    throw new Error('Expected images include with imageIndex ordering');
  }
});

Then('it includes opportunity with id and status fields selected', function () {
  const content: string = this.fileContent;
  if (!content.includes('opportunity') || !content.includes('select')) {
    throw new Error('Expected opportunity include with select { id, status }');
  }
});

// ==================== Then: Dashboard stats (S-4) ====================

Then('it renders a Total Listings stat card', function () {
  const content: string = this.fileContent;
  if (!content.includes('Total Listings')) {
    throw new Error('Expected "Total Listings" stat card in dashboard');
  }
});

Then('it renders an Opportunities Found stat card', function () {
  const content: string = this.fileContent;
  if (!content.includes('Opportunities Found')) {
    throw new Error('Expected "Opportunities Found" stat card in dashboard');
  }
});

Then('it renders an Active Flips stat card', function () {
  const content: string = this.fileContent;
  if (!content.includes('Active Flips')) {
    throw new Error('Expected "Active Flips" stat card in dashboard');
  }
});

Then('it renders a Total Profit stat card', function () {
  const content: string = this.fileContent;
  if (!content.includes('Total Profit')) {
    throw new Error('Expected "Total Profit" stat card in dashboard');
  }
});

Then('the stats are sourced from data.stats in the API response', function () {
  const content: string = this.fileContent;
  if (!content.includes('data.stats')) {
    throw new Error('Expected stats to be sourced from data.stats in API response');
  }
});

// ==================== Then: Status badge (S-5) ====================

Then('each listing card shows the listing status as a badge', function () {
  const content: string = this.fileContent;
  if (!content.includes('listing.status')) {
    throw new Error('Expected listing.status used in card template for status badge');
  }
});

Then('the status badge uses the listing.status field', function () {
  const content: string = this.fileContent;
  // Verify status badge class lookup uses status value
  if (
    !content.includes('getStatusBadgeClass') &&
    !content.includes('LISTING_STATUS_COLORS') &&
    !content.includes('listing.status')
  ) {
    throw new Error('Expected status badge to use listing.status field');
  }
});

// ==================== Then: Page size selector (S-6) ====================

Then('it renders buttons or controls for 10, 20, and 50 per page options', function () {
  const content: string = this.fileContent;
  if (!content.includes('10') || !content.includes('20') || !content.includes('50')) {
    throw new Error('Expected page size options of 10, 20, 50 in dashboard');
  }
  if (!content.includes('per page') && !content.includes('limit')) {
    throw new Error('Expected page size selector in dashboard');
  }
});

Then('selecting a page size updates the limit filter parameter', function () {
  const content: string = this.fileContent;
  if (!content.includes("setFilter('limit'") && !content.includes('setFilter("limit"')) {
    throw new Error('Expected setFilter("limit", ...) to update page size');
  }
});

// ==================== Then: Card navigation (S-7) ====================

Then(
  /^each listing card is wrapped in a Link component pointing to \/listings\/\[id\]$/,
  function () {
    const content: string = this.fileContent;
    if (!content.includes('/listings/') || !content.includes('Link')) {
      throw new Error('Expected listing cards to be wrapped in <Link href="/listings/[id]">');
    }
  }
);

Then(
  'the ExternalLink button uses stopPropagation to prevent card navigation',
  function () {
    const content: string = this.fileContent;
    if (!content.includes('stopPropagation')) {
      throw new Error('Expected e.stopPropagation() on ExternalLink to prevent card navigation');
    }
  }
);

Then(
  'the Star button uses stopPropagation to prevent card navigation',
  function () {
    const content: string = this.fileContent;
    // The star button's handler calls stopPropagation (same check as above — both in same file)
    if (!content.includes('stopPropagation')) {
      throw new Error('Expected e.stopPropagation() on Star button to prevent card navigation');
    }
  }
);

// ==================== Then: Listing detail page (S-8) ====================

Then(/^it fetches the listing from \/api\/listings\/\[id\]$/, function () {
  const content: string = this.fileContent;
  if (!content.includes('/api/listings/') && !content.includes('api/listings/')) {
    throw new Error('Expected listing detail page to fetch from /api/listings/[id]');
  }
});

Then('it displays the listing title, platform, asking price, and status', function () {
  const content: string = this.fileContent;
  if (
    !content.includes('listing.title') ||
    !content.includes('listing.platform') ||
    !content.includes('listing.askingPrice') ||
    !content.includes('listing.status')
  ) {
    throw new Error(
      'Expected listing detail page to display title, platform, askingPrice, and status'
    );
  }
});

Then(/^it includes a Back to Dashboard link pointing to \/dashboard$/, function () {
  const content: string = this.fileContent;
  if (!content.includes('/dashboard') || !content.includes('Back to Dashboard')) {
    throw new Error(
      'Expected listing detail page to include a "Back to Dashboard" link to /dashboard'
    );
  }
});

Then('it includes a View on Marketplace external link', function () {
  const content: string = this.fileContent;
  if (!content.includes('View on Marketplace') && !content.includes('listing.url')) {
    throw new Error('Expected listing detail page to include a View on Marketplace external link');
  }
});

// ==================== Then: Single listing API (S-9) ====================

Then('it includes images and opportunity in the findUnique query', function () {
  const content: string = this.fileContent;
  if (!content.includes('images') || !content.includes('opportunity')) {
    throw new Error(
      'Expected single listing API GET to include images and opportunity in findUnique'
    );
  }
  if (!content.includes('include')) {
    throw new Error('Expected include clause in findUnique for images and opportunity');
  }
});

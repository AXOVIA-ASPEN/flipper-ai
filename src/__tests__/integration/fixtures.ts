/**
 * Test Fixtures
 *
 * Reusable test data generators for integration tests.
 * Each generator returns sensible defaults that can be overridden.
 */

let listingCounter = 0;
let jobCounter = 0;
let configCounter = 0;

/**
 * Reset counters (call in beforeEach if needed)
 */
export function resetCounters(): void {
  listingCounter = 0;
  jobCounter = 0;
  configCounter = 0;
}

/**
 * Generate a mock listing with sensible defaults
 */
export function createMockListing(overrides: Partial<{
  externalId: string;
  platform: string;
  url: string;
  title: string;
  description: string;
  askingPrice: number;
  condition: string;
  location: string;
  sellerName: string;
  sellerContact: string;
  imageUrls: string;
  category: string;
  status: string;
  valueScore: number;
  estimatedValue: number;
  estimatedLow: number;
  estimatedHigh: number;
  profitPotential: number;
  profitLow: number;
  profitHigh: number;
  discountPercent: number;
  resaleDifficulty: string;
  comparableUrls: string;
  priceReasoning: string;
  notes: string;
  shippable: boolean;
  negotiable: boolean;
  tags: string;
  requestToBuy: string;
}> = {}) {
  listingCounter++;
  return {
    externalId: `ext-${listingCounter}`,
    platform: 'CRAIGSLIST',
    url: `https://craigslist.org/item/${listingCounter}`,
    title: `Test Item ${listingCounter}`,
    description: 'A test item in good condition',
    askingPrice: 100,
    condition: 'good',
    location: 'Tampa, FL',
    sellerName: 'Test Seller',
    sellerContact: null,
    imageUrls: null,
    category: 'electronics',
    status: 'NEW',
    valueScore: 50,
    estimatedValue: 150,
    estimatedLow: 120,
    estimatedHigh: 180,
    profitPotential: 50,
    profitLow: 20,
    profitHigh: 80,
    discountPercent: 33,
    resaleDifficulty: 'MODERATE',
    comparableUrls: null,
    priceReasoning: null,
    notes: null,
    shippable: true,
    negotiable: false,
    tags: null,
    requestToBuy: null,
    ...overrides,
  };
}

/**
 * Generate mock listing data for POST request body
 */
export function createMockListingRequest(overrides: Partial<{
  externalId: string;
  platform: string;
  url: string;
  title: string;
  description: string;
  askingPrice: number;
  condition: string;
  location: string;
  sellerName: string;
  sellerContact: string;
  imageUrls: string[];
  category: string;
  postedAt: string;
}> = {}) {
  listingCounter++;
  return {
    externalId: `ext-${listingCounter}`,
    platform: 'CRAIGSLIST',
    url: `https://craigslist.org/item/${listingCounter}`,
    title: `Test Item ${listingCounter}`,
    description: 'A test item in good condition',
    askingPrice: 100,
    condition: 'good',
    location: 'Tampa, FL',
    sellerName: 'Test Seller',
    ...overrides,
  };
}

/**
 * Generate a mock opportunity with sensible defaults
 */
export function createMockOpportunity(
  listingId: string,
  overrides: Partial<{
    status: string;
    purchasePrice: number;
    purchaseDate: Date;
    purchaseNotes: string;
    resalePrice: number;
    resalePlatform: string;
    resaleUrl: string;
    resaleDate: Date;
    actualProfit: number;
    fees: number;
    notes: string;
  }> = {}
) {
  return {
    listingId,
    status: 'IDENTIFIED',
    purchasePrice: null,
    purchaseDate: null,
    purchaseNotes: null,
    resalePrice: null,
    resalePlatform: null,
    resaleUrl: null,
    resaleDate: null,
    actualProfit: null,
    fees: null,
    notes: null,
    ...overrides,
  };
}

/**
 * Generate a mock scraper job with sensible defaults
 */
export function createMockScraperJob(overrides: Partial<{
  platform: string;
  location: string;
  category: string;
  status: string;
  listingsFound: number;
  opportunitiesFound: number;
  errorMessage: string;
  startedAt: Date;
  completedAt: Date;
}> = {}) {
  jobCounter++;
  return {
    platform: 'CRAIGSLIST',
    location: 'tampa',
    category: 'electronics',
    status: 'PENDING',
    listingsFound: 0,
    opportunitiesFound: 0,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

/**
 * Generate a mock search config with sensible defaults
 */
export function createMockSearchConfig(overrides: Partial<{
  name: string;
  platform: string;
  location: string;
  category: string;
  keywords: string;
  minPrice: number;
  maxPrice: number;
  enabled: boolean;
  lastRun: Date;
}> = {}) {
  configCounter++;
  return {
    name: `Search Config ${configCounter}`,
    platform: 'CRAIGSLIST',
    location: 'tampa',
    category: 'electronics',
    keywords: null,
    minPrice: null,
    maxPrice: null,
    enabled: true,
    lastRun: null,
    ...overrides,
  };
}

/**
 * Generate multiple mock listings
 */
export function createMockListings(
  count: number,
  overrides: Partial<ReturnType<typeof createMockListing>> = {}
): ReturnType<typeof createMockListing>[] {
  return Array.from({ length: count }, () => createMockListing(overrides));
}

/**
 * Generate multiple mock scraper jobs
 */
export function createMockScraperJobs(
  count: number,
  overrides: Partial<ReturnType<typeof createMockScraperJob>> = {}
): ReturnType<typeof createMockScraperJob>[] {
  return Array.from({ length: count }, () => createMockScraperJob(overrides));
}

/**
 * Generate multiple mock search configs
 */
export function createMockSearchConfigs(
  count: number,
  overrides: Partial<ReturnType<typeof createMockSearchConfig>> = {}
): ReturnType<typeof createMockSearchConfig>[] {
  return Array.from({ length: count }, () => createMockSearchConfig(overrides));
}

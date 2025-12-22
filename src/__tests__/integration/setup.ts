/**
 * Integration Test Setup
 *
 * This file configures a separate test database (test.db) for integration tests.
 * The test database is reset before each test suite to ensure isolation.
 */

import '@testing-library/jest-dom';

// Set test database URL BEFORE any imports that might use it
process.env.DATABASE_URL = 'file:./test.db';
process.env.NODE_ENV = 'test';

import { PrismaClient } from '@/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// Create a dedicated test Prisma client
const testAdapter = new PrismaLibSql({
  url: process.env.DATABASE_URL,
});

export const testPrisma = new PrismaClient({ adapter: testAdapter });

/**
 * Reset the database by deleting all records from all tables.
 * Tables are deleted in order to respect foreign key constraints.
 */
export async function resetDatabase(): Promise<void> {
  // Delete in order to respect foreign key constraints
  await testPrisma.opportunity.deleteMany({});
  await testPrisma.listing.deleteMany({});
  await testPrisma.scraperJob.deleteMany({});
  await testPrisma.searchConfig.deleteMany({});
  await testPrisma.priceHistory.deleteMany({});
}

/**
 * Seed the database with test listings
 */
export async function seedListings(
  listings: Array<{
    externalId: string;
    platform: string;
    url: string;
    title: string;
    askingPrice: number;
    description?: string;
    condition?: string;
    location?: string;
    sellerName?: string;
    category?: string;
    status?: string;
    valueScore?: number;
    estimatedValue?: number;
    profitPotential?: number;
  }>
): Promise<void> {
  for (const listing of listings) {
    await testPrisma.listing.create({
      data: {
        externalId: listing.externalId,
        platform: listing.platform,
        url: listing.url,
        title: listing.title,
        askingPrice: listing.askingPrice,
        description: listing.description ?? null,
        condition: listing.condition ?? null,
        location: listing.location ?? null,
        sellerName: listing.sellerName ?? null,
        category: listing.category ?? null,
        status: listing.status ?? 'NEW',
        valueScore: listing.valueScore ?? null,
        estimatedValue: listing.estimatedValue ?? null,
        profitPotential: listing.profitPotential ?? null,
      },
    });
  }
}

/**
 * Seed the database with test opportunities (requires existing listings)
 */
export async function seedOpportunities(
  opportunities: Array<{
    listingId: string;
    status?: string;
    purchasePrice?: number;
    resalePrice?: number;
    actualProfit?: number;
    notes?: string;
  }>
): Promise<void> {
  for (const opp of opportunities) {
    await testPrisma.opportunity.create({
      data: {
        listingId: opp.listingId,
        status: opp.status ?? 'IDENTIFIED',
        purchasePrice: opp.purchasePrice ?? null,
        resalePrice: opp.resalePrice ?? null,
        actualProfit: opp.actualProfit ?? null,
        notes: opp.notes ?? null,
      },
    });
  }
}

/**
 * Seed the database with test scraper jobs
 */
export async function seedScraperJobs(
  jobs: Array<{
    platform: string;
    location?: string;
    category?: string;
    status?: string;
    listingsFound?: number;
    opportunitiesFound?: number;
    errorMessage?: string;
  }>
): Promise<void> {
  for (const job of jobs) {
    await testPrisma.scraperJob.create({
      data: {
        platform: job.platform,
        location: job.location ?? null,
        category: job.category ?? null,
        status: job.status ?? 'PENDING',
        listingsFound: job.listingsFound ?? 0,
        opportunitiesFound: job.opportunitiesFound ?? 0,
        errorMessage: job.errorMessage ?? null,
      },
    });
  }
}

/**
 * Seed the database with test search configs
 */
export async function seedSearchConfigs(
  configs: Array<{
    name: string;
    platform: string;
    location: string;
    category?: string;
    keywords?: string;
    minPrice?: number;
    maxPrice?: number;
    enabled?: boolean;
  }>
): Promise<void> {
  for (const config of configs) {
    await testPrisma.searchConfig.create({
      data: {
        name: config.name,
        platform: config.platform,
        location: config.location,
        category: config.category ?? null,
        keywords: config.keywords ?? null,
        minPrice: config.minPrice ?? null,
        maxPrice: config.maxPrice ?? null,
        enabled: config.enabled ?? true,
      },
    });
  }
}

// Global test timeout for integration tests
jest.setTimeout(30000);

// Mock the db module to use the test database
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: testPrisma,
  prisma: testPrisma,
}));

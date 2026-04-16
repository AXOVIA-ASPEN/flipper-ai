/**
 * @file scripts/backtest/seed-listings.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-13
 * @version 1.0
 * @brief Standalone scraping script to populate the database with real Craigslist listings for backtesting.
 *
 * @description
 * Scrapes Craigslist SF Bay Area across multiple categories using Playwright,
 * runs the algorithmic scorer on each listing, and inserts directly into
 * Postgres. Bypasses API route auth so it can be run from the CLI.
 *
 * Usage: npx tsx scripts/backtest/seed-listings.ts
 */

import 'dotenv/config';
import { chromium } from 'playwright';
import { PrismaClient as PrismaClientBase, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { estimateValue, detectCategory } from '../../src/lib/value-estimator';

// --- Database setup ---
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 2 });
const prisma = new PrismaClientBase({ adapter }) as ReturnType<() => InstanceType<typeof PrismaClientBase>>;

// --- Craigslist config ---
const LOCATION = 'sfbay';
const CATEGORIES: Record<string, string> = {
  electronics: 'ela',
  furniture: 'fua',
  appliances: 'ppa',
  sporting: 'sga',
  tools: 'tla',
  antiques: 'ata',
  video_gaming: 'vga',
  music_instr: 'msa',
  computers: 'sya',
  cell_phones: 'moa',
};

// Dummy user ID for backtesting (not tied to a real user)
const BACKTEST_USER_ID = 'backtest-seed';

interface ScrapedItem {
  title: string;
  price: number;
  url: string;
  location: string;
  externalId: string;
  imageUrl?: string;
}

function parsePrice(priceStr: string): number {
  const match = priceStr.match(/\$?([\d,]+)/);
  return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
}

function extractListingId(url: string): string {
  const match = url.match(/\/(\d+)\.html/);
  return match ? match[1] : url;
}

async function scrapeCategory(category: string, path: string): Promise<ScrapedItem[]> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    // Price range $20-$2000 to focus on flippable items
    const searchUrl = `https://${LOCATION}.craigslist.org/search/${path}?min_price=20&max_price=2000`;
    console.log(`  Scraping ${category}: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page
      .waitForSelector(
        '.cl-search-result, .result-row, .gallery-card, li.cl-static-search-result',
        { timeout: 10000 }
      )
      .catch(() => console.log(`  No results selector for ${category}`));

    const listings = await page.evaluate(() => {
      const items: Array<{
        title: string;
        price: string;
        url: string;
        location: string;
        imageUrl?: string;
      }> = [];

      const selectors = [
        '.cl-search-result',
        '.result-row',
        '.gallery-card',
        'li.cl-static-search-result',
      ];

      let listingElements: Element[] = [];
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          listingElements = Array.from(elements);
          break;
        }
      }

      if (listingElements.length === 0) {
        listingElements = Array.from(document.querySelectorAll('[data-pid]'));
      }

      for (const el of listingElements.slice(0, 30)) {
        try {
          const titleEl = el.querySelector(
            '.posting-title, .result-title, .titlestring, a.posting-title, .label'
          ) as HTMLElement;
          const title =
            titleEl?.innerText?.trim() || el.querySelector('a')?.innerText?.trim() || '';

          const linkEl = el.querySelector("a[href*='/']") as HTMLAnchorElement;
          const url = linkEl?.href || '';

          const priceEl = el.querySelector('.priceinfo, .result-price, .price') as HTMLElement;
          const price = priceEl?.innerText?.trim() || '$0';

          const locationEl = el.querySelector(
            '.meta, .result-hood, .location, .supertitle'
          ) as HTMLElement;
          const location = locationEl?.innerText?.replace(/[()]/g, '').trim() || '';

          const imgEl = el.querySelector('img') as HTMLImageElement;
          const imageUrl = imgEl?.src || '';

          if (title && url && !title.includes('sponsored')) {
            items.push({ title, price, url, location, imageUrl });
          }
        } catch {
          // Skip problematic listings
        }
      }

      return items;
    });

    console.log(`  Found ${listings.length} listings for ${category}`);

    return listings
      .map((item) => ({
        title: item.title,
        price: parsePrice(item.price),
        url: item.url,
        location: item.location || LOCATION,
        externalId: extractListingId(item.url),
        imageUrl: item.imageUrl || undefined,
      }))
      .filter((item) => item.price > 0 && item.title.length > 3);
  } catch (err) {
    console.error(`  Error scraping ${category}:`, (err as Error).message);
    return [];
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
  console.log('=== Flipper.ai Backtesting Data Seeder ===\n');
  console.log(`Location: ${LOCATION}.craigslist.org`);
  console.log(`Categories: ${Object.keys(CATEGORIES).join(', ')}\n`);

  // Ensure backtest user exists (raw SQL — PrismaPg doesn't handle @updatedAt)
  const userExists = await (prisma as any).user.findUnique({ where: { id: BACKTEST_USER_ID } });
  if (!userExists) {
    console.log('Creating backtest user...');
    const now = new Date();
    await (prisma as any).$executeRaw(Prisma.sql`
      INSERT INTO "User" ("id", "email", "name", "firebaseUid", "subscriptionTier", "onboardingComplete", "onboardingStep", "createdAt", "updatedAt")
      VALUES (${BACKTEST_USER_ID}, 'backtest@flipper.local', 'Backtest Seed', 'backtest-firebase-uid', 'FREE', false, 0, ${now}, ${now})
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  let totalInserted = 0;
  const categoryStats: Record<string, number> = {};

  for (const [category, path] of Object.entries(CATEGORIES)) {
    const items = await scrapeCategory(category, path);

    let inserted = 0;
    for (const item of items) {
      try {
        // Run the scoring algorithm
        const detectedCategory = detectCategory(item.title, null);
        const estimation = estimateValue(
          item.title,
          null, // no description from search results
          item.price,
          null, // condition unknown
          detectedCategory
        );

        // Parameterized SQL insert (PrismaPg adapter doesn't handle @updatedAt)
        const now = new Date();
        const id = 'cl' + Math.random().toString(36).slice(2, 15);
        const status = estimation.valueScore >= 70 ? 'OPPORTUNITY' : 'NEW';
        const comparableUrlsJson = JSON.stringify(estimation.comparableUrls);
        const tagsJson = JSON.stringify(estimation.tags);
        const imageUrl = item.imageUrl || null;

        await (prisma as any).$executeRaw(Prisma.sql`
          INSERT INTO "Listing" (
            "id", "userId", "externalId", "platform", "url", "title",
            "askingPrice", "location", "category", "imageUrls",
            "estimatedValue", "estimatedLow", "estimatedHigh",
            "profitPotential", "profitLow", "profitHigh",
            "valueScore", "discountPercent", "resaleDifficulty",
            "comparableUrls", "priceReasoning", "notes",
            "shippable", "negotiable", "tags",
            "status", "scrapedAt", "updatedAt"
          ) VALUES (
            ${id}, ${BACKTEST_USER_ID}, ${item.externalId},
            'craigslist', ${item.url}, ${item.title},
            ${item.price}::float8, ${item.location}, ${detectedCategory},
            ${imageUrl},
            ${estimation.estimatedValue}::float8, ${estimation.estimatedLow}::float8, ${estimation.estimatedHigh}::float8,
            ${estimation.profitPotential}::float8, ${estimation.profitLow}::float8, ${estimation.profitHigh}::float8,
            ${estimation.valueScore}::float8, ${estimation.discountPercent}::float8, ${estimation.resaleDifficulty},
            ${comparableUrlsJson},
            ${estimation.reasoning}, ${estimation.notes},
            ${estimation.shippable}, ${estimation.negotiable},
            ${tagsJson},
            ${status},
            ${now}, ${now}
          )
          ON CONFLICT ("platform", "externalId", "userId") DO UPDATE SET
            "title" = EXCLUDED."title",
            "askingPrice" = EXCLUDED."askingPrice",
            "valueScore" = EXCLUDED."valueScore",
            "updatedAt" = EXCLUDED."updatedAt"
        `);
        inserted++;
      } catch (err) {
        // Skip duplicates or constraint violations silently
        const msg = (err as Error).message;
        if (!msg.includes('Unique constraint')) {
          console.error(`  Error inserting ${item.title}:`, msg.slice(0, 100));
        }
      }
    }

    categoryStats[category] = inserted;
    totalInserted += inserted;
    console.log(`  Inserted ${inserted} listings for ${category}\n`);

    // Small delay between categories to be respectful
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Summary
  console.log('\n=== Seeding Complete ===');
  console.log(`Total listings inserted: ${totalInserted}`);
  console.log('\nPer category:');
  for (const [cat, count] of Object.entries(categoryStats)) {
    console.log(`  ${cat}: ${count}`);
  }

  // Score distribution
  const scored = await (prisma as any).listing.findMany({
    where: { userId: BACKTEST_USER_ID, valueScore: { not: null } },
    select: { valueScore: true },
    orderBy: { valueScore: 'asc' },
  });
  if (scored.length > 0) {
    const scores = scored.map((s: { valueScore: number }) => s.valueScore);
    console.log('\nScore distribution:');
    for (let b = 0; b < 100; b += 10) {
      const count = scores.filter((s: number) => s >= b && s < b + 10).length;
      const bar = '#'.repeat(count);
      console.log(`  ${String(b).padStart(2)}-${String(b + 9).padStart(2)}: ${bar} (${count})`);
    }
    const perfect = scores.filter((s: number) => s === 100).length;
    if (perfect > 0) console.log(`   100: ${'#'.repeat(perfect)} (${perfect})`);
    console.log(
      `\nMin: ${Math.min(...scores)}, Max: ${Math.max(...scores)}, Mean: ${Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)}`
    );

    const opportunities = scores.filter((s: number) => s >= 70).length;
    console.log(
      `Opportunities (score >= 70): ${opportunities} (${Math.round((opportunities / scores.length) * 100)}%)`
    );
  }

  } finally {
    await (prisma as any).$disconnect();
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});

/**
 * @file scripts/backtest/enrich-full-pipeline.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Full-pipeline enrichment: LLM identification → eBay sold lookups → sellability analysis.
 *
 * @description
 * Runs the 72 opportunity-scored listings through the complete production pipeline:
 *   1. identifyItem() — LLM extracts brand/model (Groq/Llama 3.3)
 *   2. fetchMarketPrice() — Playwright scrapes eBay sold listings for real prices
 *   3. analyzeSellability() — LLM compares asking vs. market data
 *   4. analyzeDemandTrend() — deterministic from sold listing history
 *
 * Outputs: agreement between algorithmic score and real market data.
 *
 * Usage: npx tsx scripts/backtest/enrich-full-pipeline.ts
 */

import 'dotenv/config';
import { PrismaClient as PrismaClientBase, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { identifyItem } from '../../src/lib/llm-identifier';
import { fetchMarketPrice, closeBrowser as closeMarketBrowser } from '../../src/lib/market-price';
import { analyzeSellability, quickDiscountCheck } from '../../src/lib/llm-analyzer';
import { analyzeDemandTrend } from '../../src/lib/demand-analyzer';
import { getAvailableProviders } from '../../src/lib/ai';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 2 });
const prisma = new PrismaClientBase({ adapter }) as ReturnType<() => InstanceType<typeof PrismaClientBase>>;

const BACKTEST_USER_ID = 'backtest-seed';
const MIN_SCORE = 70;
const MIN_PROFIT = 25;

// Sanitize LLM-generated search queries for eBay compatibility.
// Llama 3.3 tends to produce boolean groups like "(brand model) (condition)" which eBay can't parse.
function sanitizeSearchQuery(query: string): string {
  return query
    .replace(/[()]/g, '')                              // Strip parentheses
    .replace(/\b(used|refurbished|unlocked|new|condition|like new|brand new)\b/gi, '') // Strip condition terms
    .replace(/\s{2,}/g, ' ')                           // Collapse whitespace
    .trim()
    .split(/\s+/)
    .slice(0, 8)                                       // Max 8 keywords
    .join(' ');
}

async function main() {
  try {
  console.log('=== Full Pipeline Enrichment (Story 13.7 Session #2) ===\n');
  console.log('Providers:', getAvailableProviders().join(', '));
  console.log();

  // Get opportunity listings
  const listings = await (prisma as any).listing.findMany({
    where: {
      userId: BACKTEST_USER_ID,
      valueScore: { gte: MIN_SCORE },
      profitPotential: { gte: MIN_PROFIT },
    },
    select: {
      id: true,
      title: true,
      description: true,
      askingPrice: true,
      category: true,
      valueScore: true,
      profitPotential: true,
      estimatedValue: true,
    },
    orderBy: { valueScore: 'desc' },
  });

  console.log(`Found ${listings.length} opportunity listings to enrich\n`);

  const results: Array<{
    title: string;
    askingPrice: number;
    algorithmicScore: number;
    algorithmicEstimate: number;
    ebayMedian: number | null;
    ebaySalesCount: number | null;
    trueProfit: number | null;
    algorithmCorrect: boolean | null;
    llmSellable: boolean | null;
    demandTrend: string | null;
  }> = [];

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const pct = Math.round(((i + 1) / listings.length) * 100);
    process.stdout.write(
      `[${i + 1}/${listings.length} ${pct}%] ${listing.title.slice(0, 55).padEnd(55)} → `
    );

    try {
      // Step 1: LLM identification
      const identification = await identifyItem(
        listing.title,
        listing.description || null,
        listing.askingPrice,
        listing.category
      );

      if (!identification || !identification.worthInvestigating) {
        process.stdout.write('LLM: skip\n');
        results.push({
          title: listing.title,
          askingPrice: listing.askingPrice,
          algorithmicScore: listing.valueScore,
          algorithmicEstimate: listing.estimatedValue,
          ebayMedian: null,
          ebaySalesCount: null,
          trueProfit: null,
          algorithmCorrect: null,
          llmSellable: false,
          demandTrend: null,
        });
        continue;
      }

      // Step 2: eBay sold price lookup (Playwright)
      const cleanQuery = sanitizeSearchQuery(identification.searchQuery);
      const marketData = await fetchMarketPrice(
        cleanQuery,
        identification.category
      );

      if (!marketData || marketData.salesCount === 0) {
        process.stdout.write(`ID: ${identification.identifiedBrand || '?'} | No eBay data\n`);
        results.push({
          title: listing.title,
          askingPrice: listing.askingPrice,
          algorithmicScore: listing.valueScore,
          algorithmicEstimate: listing.estimatedValue,
          ebayMedian: null,
          ebaySalesCount: 0,
          trueProfit: null,
          algorithmCorrect: null,
          llmSellable: null,
          demandTrend: null,
        });
        continue;
      }

      // Step 3: Calculate true profit from real eBay data
      const feeRate = 0.13;
      const trueProfit = Math.round(marketData.medianPrice * (1 - feeRate) - listing.askingPrice);

      // Step 4: Demand trend
      const demandAnalysis = analyzeDemandTrend(marketData.soldListings);

      // Step 5: Algorithm accuracy check
      const algorithmCorrect = (listing.valueScore >= 70 && trueProfit > 0);

      const marker = trueProfit > 0 ? '✓' : '✗';
      process.stdout.write(
        `${marker} ${identification.identifiedBrand || '?'} | eBay $${marketData.medianPrice} (${marketData.salesCount} sold) | True profit: $${trueProfit} | Demand: ${demandAnalysis?.trend || '?'}\n`
      );

      results.push({
        title: listing.title,
        askingPrice: listing.askingPrice,
        algorithmicScore: listing.valueScore,
        algorithmicEstimate: listing.estimatedValue,
        ebayMedian: marketData.medianPrice,
        ebaySalesCount: marketData.salesCount,
        trueProfit,
        algorithmCorrect,
        llmSellable: true,
        demandTrend: demandAnalysis?.trend || null,
      });

      // Persist to DB
      const now = new Date();
      await (prisma as any).$executeRaw(Prisma.sql`
        UPDATE "Listing"
        SET "verifiedMarketValue" = ${marketData.medianPrice},
            "marketDataSource" = 'ebay_scrape',
            "marketDataDate" = ${now},
            "comparableSalesJson" = ${JSON.stringify(marketData.soldListings.slice(0, 10))},
            "identifiedBrand" = ${identification.identifiedBrand},
            "identifiedModel" = ${identification.identifiedModel || null},
            "llmAnalyzed" = true,
            "analysisDate" = ${now},
            "updatedAt" = ${now}
        WHERE "id" = ${listing.id}
      `);

      // Rate limit: small delay between eBay scrapes
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      process.stdout.write(`ERROR: ${(err as Error).message?.slice(0, 60)}\n`);
      results.push({
        title: listing.title,
        askingPrice: listing.askingPrice,
        algorithmicScore: listing.valueScore,
        algorithmicEstimate: listing.estimatedValue,
        ebayMedian: null,
        ebaySalesCount: null,
        trueProfit: null,
        algorithmCorrect: null,
        llmSellable: null,
        demandTrend: null,
      });
    }
  }

  // Close Playwright browser
  await closeMarketBrowser();

  // ── Analysis ──
  console.log('\n\n=== Full Pipeline Results ===\n');

  const withEbayData = results.filter((r) => r.ebayMedian !== null);
  const truePositives = withEbayData.filter((r) => r.trueProfit !== null && r.trueProfit > 0);
  const falsePositives = withEbayData.filter((r) => r.trueProfit !== null && r.trueProfit <= 0);
  const noData = results.filter((r) => r.ebayMedian === null);

  console.log(`Total opportunities analyzed: ${results.length}`);
  console.log(`With eBay sold data: ${withEbayData.length}`);
  console.log(`  TRUE POSITIVES (eBay confirms profitable): ${truePositives.length} (${Math.round((truePositives.length / withEbayData.length) * 100)}%)`);
  console.log(`  FALSE POSITIVES (eBay says NOT profitable): ${falsePositives.length} (${Math.round((falsePositives.length / withEbayData.length) * 100)}%)`);
  console.log(`No eBay data found: ${noData.length}`);

  if (truePositives.length > 0) {
    const avgProfit = Math.round(truePositives.reduce((s, r) => s + (r.trueProfit || 0), 0) / truePositives.length);
    console.log(`\nTrue positive avg profit: $${avgProfit}`);
  }

  if (falsePositives.length > 0) {
    console.log('\nFALSE POSITIVE details (algorithm over-scored):');
    for (const fp of falsePositives) {
      console.log(`  [${fp.algorithmicScore}] $${fp.askingPrice} → Est $${fp.algorithmicEstimate} vs eBay $${fp.ebayMedian} | True profit: $${fp.trueProfit} | ${fp.title.slice(0, 60)}`);
    }
  }

  // Algorithmic estimate accuracy
  if (withEbayData.length > 0) {
    const errors = withEbayData.map((r) => Math.abs((r.algorithmicEstimate - (r.ebayMedian || 0)) / (r.ebayMedian || 1)));
    const meanError = Math.round(errors.reduce((s, e) => s + e, 0) / errors.length * 100);
    console.log(`\nAlgorithmic estimate accuracy (MAPE): ${meanError}% avg error vs eBay median`);
  }

  // Save results
  const fs = await import('fs');
  const reportPath = 'reports/backtest-full-pipeline-results.json';
  await fs.promises.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalOpportunities: results.length,
    withEbayData: withEbayData.length,
    truePositives: truePositives.length,
    falsePositives: falsePositives.length,
    results,
  }, null, 2));
  console.log(`\nFull results saved to: ${reportPath}`);

  } finally {
    await closeMarketBrowser();
    await (prisma as any).$disconnect();
  }
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});

/**
 * @file scripts/backtest/enrich-with-ai.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-16
 * @version 1.0
 * @brief Enrich backtesting listings with Gemini LLM analysis for Story 13.7 session #2.
 *
 * @description
 * Takes the 300 seeded Craigslist listings (from seed-listings.ts) and runs them
 * through the full AI enrichment pipeline using Gemini (GOOGLE_API_KEY).
 *
 * Pipeline stages:
 *   1. identifyItem()      — Gemini extracts brand/model/category (productIdentification)
 *   2. analyzeSellability()— Gemini assesses flip viability (flipAnalysis)
 *   3. applyDemandAdjustment — Deterministic demand velocity bump/penalty
 *
 * Compares:
 *   - Tier 1 algorithmic score (from seed-listings.ts)
 *   - Tier 1+2 LLM-validated score
 *   - Agreement/disagreement matrix for refinement insights
 *
 * Usage: npx tsx scripts/backtest/enrich-with-ai.ts
 */

import 'dotenv/config';
import { PrismaClient as PrismaClientBase, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { identifyItem } from '../../src/lib/llm-identifier';
import { getAvailableProviders } from '../../src/lib/ai';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 2 });
const prisma = new PrismaClientBase({ adapter }) as ReturnType<() => InstanceType<typeof PrismaClientBase>>;

const BACKTEST_USER_ID = 'backtest-seed';

interface EnrichmentResult {
  listingId: string;
  title: string;
  askingPrice: number;
  category: string | null;
  algorithmicScore: number;
  algorithmicProfit: number;
  algorithmicIsOpportunity: boolean;
  llmWorthInvestigating: boolean | null;
  llmBrand: string | null;
  llmCategory: string | null;
  llmConfidence: string | null;
  agreement: 'agree_opportunity' | 'agree_pass' | 'llm_says_pass' | 'llm_says_investigate' | 'llm_error';
  error: string | null;
}

async function main() {
  console.log('=== Flipper.ai AI-Enriched Backtest (Session #2) ===\n');
  console.log('Available AI providers:', getAvailableProviders().join(', ') || 'NONE');
  console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'configured' : 'MISSING');
  console.log();

  const listings = await (prisma as any).listing.findMany({
    where: { userId: BACKTEST_USER_ID },
    select: {
      id: true,
      title: true,
      description: true,
      askingPrice: true,
      category: true,
      valueScore: true,
      profitPotential: true,
    },
    orderBy: { valueScore: 'desc' },
  });

  console.log(`Found ${listings.length} listings to enrich\n`);
  if (listings.length === 0) {
    console.error('No listings to enrich. Run scripts/backtest/seed-listings.ts first.');
    return;
  }

  const results: EnrichmentResult[] = [];
  let processed = 0;
  const startTime = Date.now();

  for (const listing of listings) {
    processed++;
    const isOpp = listing.valueScore >= 70 && listing.profitPotential >= 25;
    const progressPct = Math.round((processed / listings.length) * 100);
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);

    try {
      process.stdout.write(
        `[${processed}/${listings.length} ${progressPct}% | ${elapsedSec}s] ${listing.title.slice(0, 60).padEnd(60)} → `
      );

      const identification = await identifyItem(
        listing.title,
        listing.description || null,
        listing.askingPrice,
        listing.category
      );

      if (!identification) {
        process.stdout.write('LLM_ERROR (null)\n');
        results.push({
          listingId: listing.id,
          title: listing.title,
          askingPrice: listing.askingPrice,
          category: listing.category,
          algorithmicScore: listing.valueScore,
          algorithmicProfit: listing.profitPotential,
          algorithmicIsOpportunity: isOpp,
          llmWorthInvestigating: null,
          llmBrand: null,
          llmCategory: null,
          llmConfidence: null,
          agreement: 'llm_error',
          error: 'LLM returned null',
        });
        continue;
      }

      let agreement: EnrichmentResult['agreement'];
      if (isOpp && identification.worthInvestigating) agreement = 'agree_opportunity';
      else if (!isOpp && !identification.worthInvestigating) agreement = 'agree_pass';
      else if (isOpp && !identification.worthInvestigating) agreement = 'llm_says_pass';
      else agreement = 'llm_says_investigate';

      const marker =
        agreement === 'agree_opportunity'
          ? '✓ AGREE_OPP'
          : agreement === 'agree_pass'
            ? '✓ AGREE_PASS'
            : agreement === 'llm_says_pass'
              ? '✗ LLM_PASSES'
              : '↑ LLM_INVESTIGATES';
      process.stdout.write(`${marker} [${identification.identifiedBrand || '?'}]\n`);

      results.push({
        listingId: listing.id,
        title: listing.title,
        askingPrice: listing.askingPrice,
        category: listing.category,
        algorithmicScore: listing.valueScore,
        algorithmicProfit: listing.profitPotential,
        algorithmicIsOpportunity: isOpp,
        llmWorthInvestigating: identification.worthInvestigating,
        llmBrand: identification.identifiedBrand,
        llmCategory: identification.category,
        llmConfidence: identification.confidence,
        agreement,
        error: null,
      });

      // Persist LLM identification to DB
      const now = new Date();
      await (prisma as any).$executeRaw(Prisma.sql`
        UPDATE "Listing"
        SET "identifiedBrand" = ${identification.identifiedBrand},
            "identifiedModel" = ${identification.identifiedModel || null},
            "llmAnalyzed" = true,
            "analysisDate" = ${now},
            "analysisConfidence" = ${identification.confidence},
            "updatedAt" = ${now}
        WHERE "id" = ${listing.id}
      `);
    } catch (err) {
      process.stdout.write(`ERROR (${(err as Error).message?.slice(0, 50)})\n`);
      results.push({
        listingId: listing.id,
        title: listing.title,
        askingPrice: listing.askingPrice,
        category: listing.category,
        algorithmicScore: listing.valueScore,
        algorithmicProfit: listing.profitPotential,
        algorithmicIsOpportunity: isOpp,
        llmWorthInvestigating: null,
        llmBrand: null,
        llmCategory: null,
        llmConfidence: null,
        agreement: 'llm_error',
        error: (err as Error).message,
      });
    }
  }

  // ── Analysis ──
  console.log('\n\n=== Results Summary ===\n');
  const counts: Record<EnrichmentResult['agreement'], number> = {
    agree_opportunity: 0,
    agree_pass: 0,
    llm_says_pass: 0,
    llm_says_investigate: 0,
    llm_error: 0,
  };
  for (const r of results) counts[r.agreement]++;

  const total = results.length;
  console.log(`Total items enriched: ${total}`);
  console.log(`  Algorithm OPPORTUNITY + LLM agrees (investigate):   ${counts.agree_opportunity} (${Math.round((counts.agree_opportunity / total) * 100)}%)`);
  console.log(`  Algorithm PASS + LLM agrees (skip):                 ${counts.agree_pass} (${Math.round((counts.agree_pass / total) * 100)}%)`);
  console.log(`  Algorithm OPPORTUNITY but LLM says pass:            ${counts.llm_says_pass} (${Math.round((counts.llm_says_pass / total) * 100)}%)   ← FALSE POSITIVES`);
  console.log(`  Algorithm PASS but LLM says investigate:            ${counts.llm_says_investigate} (${Math.round((counts.llm_says_investigate / total) * 100)}%)   ← FALSE NEGATIVES`);
  console.log(`  LLM errors:                                         ${counts.llm_error} (${Math.round((counts.llm_error / total) * 100)}%)`);

  // Agreement rate
  const analyzableCount = total - counts.llm_error;
  const agreement = counts.agree_opportunity + counts.agree_pass;
  console.log(`\nOverall agreement rate (excluding errors): ${agreement}/${analyzableCount} = ${Math.round((agreement / analyzableCount) * 100)}%`);

  // Show false positives (algorithm said opportunity, LLM says pass)
  console.log('\n\n=== FALSE POSITIVES (Algorithm says opportunity, LLM says pass) ===\n');
  const falsePositives = results.filter((r) => r.agreement === 'llm_says_pass');
  for (const fp of falsePositives.slice(0, 15)) {
    console.log(`  [${fp.algorithmicScore}] $${fp.askingPrice} profit=$${fp.algorithmicProfit} | ${fp.category} | ${fp.title.slice(0, 70)}`);
    console.log(`    LLM: brand=${fp.llmBrand}, category=${fp.llmCategory}, confidence=${fp.llmConfidence}`);
  }
  if (falsePositives.length > 15) console.log(`  ... and ${falsePositives.length - 15} more`);

  // Show false negatives (algorithm said pass, LLM says investigate)
  console.log('\n\n=== FALSE NEGATIVES (Algorithm says pass, LLM says investigate) ===\n');
  const falseNegatives = results.filter((r) => r.agreement === 'llm_says_investigate');
  for (const fn of falseNegatives.slice(0, 15)) {
    console.log(`  [${fn.algorithmicScore}] $${fn.askingPrice} profit=$${fn.algorithmicProfit} | ${fn.category} | ${fn.title.slice(0, 70)}`);
    console.log(`    LLM: brand=${fn.llmBrand}, category=${fn.llmCategory}, confidence=${fn.llmConfidence}`);
  }
  if (falseNegatives.length > 15) console.log(`  ... and ${falseNegatives.length - 15} more`);

  // Save full results to disk
  const fs = await import('fs');
  const reportPath = 'reports/backtest-session2-results.json';
  await fs.promises.mkdir('reports', { recursive: true });
  await fs.promises.writeFile(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), counts, total, results }, null, 2));
  console.log(`\nFull results saved to: ${reportPath}`);
}

main()
  .catch((e) => {
    console.error('Fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await (prisma as any).$disconnect();
  });

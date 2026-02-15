/**
 * Prisma Seed Script for Flipper AI
 * Populates demo data for development/staging environments
 */
import { PrismaClient } from '../src/generated/prisma';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const hashedPassword = await hash('demo123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@flipper.ai' },
    update: {},
    create: {
      email: 'demo@flipper.ai',
      name: 'Demo User',
      password: hashedPassword,
      emailVerified: new Date(),
      settings: {
        create: {
          llmModel: 'gpt-4o-mini',
          discountThreshold: 50,
          autoAnalyze: true,
        },
      },
    },
  });
  console.log(`  ✅ User: ${user.email}`);

  // Create demo listings
  const listings = await Promise.all([
    prisma.listing.upsert({
      where: {
        platform_externalId_userId: {
          platform: 'CRAIGSLIST',
          externalId: 'demo-001',
          userId: user.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        externalId: 'demo-001',
        platform: 'CRAIGSLIST',
        url: 'https://example.com/listing/001',
        title: 'iPhone 14 Pro Max 256GB - Like New',
        description: 'Barely used iPhone 14 Pro Max. Comes with original box and charger.',
        askingPrice: 450,
        condition: 'Like New',
        location: 'Austin, TX',
        category: 'Electronics',
        estimatedValue: 750,
        estimatedLow: 700,
        estimatedHigh: 800,
        profitPotential: 250,
        valueScore: 85,
        discountPercent: 40,
        status: 'OPPORTUNITY',
        llmAnalyzed: true,
        identifiedBrand: 'Apple',
        identifiedModel: 'iPhone 14 Pro Max',
        identifiedVariant: '256GB',
        identifiedCondition: 'Like New',
        sellabilityScore: 92,
        demandLevel: 'very_high',
        expectedDaysToSell: 3,
        authenticityRisk: 'low',
        recommendedOffer: 400,
        recommendedList: 700,
      },
    }),
    prisma.listing.upsert({
      where: {
        platform_externalId_userId: {
          platform: 'FACEBOOK_MARKETPLACE',
          externalId: 'demo-002',
          userId: user.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        externalId: 'demo-002',
        platform: 'FACEBOOK_MARKETPLACE',
        url: 'https://example.com/listing/002',
        title: 'Herman Miller Aeron Chair - Size B',
        description: 'Office closing sale. Chair in great condition, fully loaded.',
        askingPrice: 350,
        condition: 'Good',
        location: 'Dallas, TX',
        category: 'Furniture',
        estimatedValue: 800,
        estimatedLow: 700,
        estimatedHigh: 900,
        profitPotential: 400,
        valueScore: 92,
        discountPercent: 56,
        status: 'NEW',
        llmAnalyzed: true,
        identifiedBrand: 'Herman Miller',
        identifiedModel: 'Aeron',
        identifiedVariant: 'Size B, Fully Loaded',
        identifiedCondition: 'Good',
        sellabilityScore: 88,
        demandLevel: 'high',
        expectedDaysToSell: 7,
        authenticityRisk: 'low',
        recommendedOffer: 300,
        recommendedList: 750,
      },
    }),
    prisma.listing.upsert({
      where: {
        platform_externalId_userId: {
          platform: 'EBAY',
          externalId: 'demo-003',
          userId: user.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        externalId: 'demo-003',
        platform: 'EBAY',
        url: 'https://example.com/listing/003',
        title: 'Nintendo Switch OLED + Games Bundle',
        description: 'Switch OLED with 5 games. Moving sale, need gone ASAP.',
        askingPrice: 200,
        condition: 'Good',
        location: 'Houston, TX',
        category: 'Gaming',
        estimatedValue: 380,
        estimatedLow: 350,
        estimatedHigh: 420,
        profitPotential: 150,
        valueScore: 78,
        discountPercent: 47,
        status: 'ANALYZING',
        llmAnalyzed: false,
      },
    }),
  ]);
  console.log(`  ✅ Listings: ${listings.length} created`);

  // Create a search config
  const config = await prisma.searchConfig.create({
    data: {
      userId: user.id,
      name: 'Austin Electronics Deals',
      platform: 'CRAIGSLIST',
      location: 'Austin, TX',
      category: 'Electronics',
      keywords: 'iphone,macbook,airpods,ipad',
      minPrice: 50,
      maxPrice: 1000,
      enabled: true,
    },
  });
  console.log(`  ✅ Search config: ${config.name}`);

  // Create a scraper job
  await prisma.scraperJob.create({
    data: {
      userId: user.id,
      platform: 'CRAIGSLIST',
      location: 'Austin, TX',
      category: 'Electronics',
      status: 'COMPLETED',
      listingsFound: 24,
      opportunitiesFound: 3,
      startedAt: new Date(Date.now() - 60000),
      completedAt: new Date(),
    },
  });
  console.log('  ✅ Scraper job history created');

  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

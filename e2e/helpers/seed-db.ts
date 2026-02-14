/**
 * Database seeding helpers for E2E tests.
 * Uses Prisma client directly to seed/cleanup test data.
 * 
 * Usage: Import in global-setup.ts or call from test fixtures.
 */

// Dynamic import to avoid bundling issues in test runner
async function getPrisma() {
  const { PrismaClient } = await import('../../src/generated/prisma');
  return new PrismaClient();
}

export async function seedTestListings(count = 5) {
  const prisma = await getPrisma();
  try {
    const listings = [];
    for (let i = 0; i < count; i++) {
      listings.push(
        prisma.listing.create({
          data: {
            externalId: `e2e-listing-${i}`,
            platform: 'CRAIGSLIST',
            title: `E2E Test Listing ${i}`,
            askingPrice: 100 + i * 50,
            estimatedValue: 200 + i * 50,
            profitPotential: 50 + i * 10,
            valueScore: 60 + i * 5,
            status: i % 2 === 0 ? 'NEW' : 'OPPORTUNITY',
            location: 'Tampa, FL',
            url: `https://craigslist.org/e2e/${i}`,
            category: 'electronics',
          },
        }),
      );
    }
    return await Promise.all(listings);
  } finally {
    await prisma.$disconnect();
  }
}

export async function seedTestOpportunities(count = 3) {
  const prisma = await getPrisma();
  try {
    const listings = await seedTestListings(count);
    const opportunities = listings.map((listing, i) =>
      prisma.opportunity.create({
        data: {
          listingId: listing.id,
          status: ['IDENTIFIED', 'CONTACTED', 'PURCHASED'][i % 3],
          purchasePrice: i % 3 === 2 ? listing.askingPrice : null,
          notes: `E2E test opportunity ${i}`,
        },
      }),
    );
    return await Promise.all(opportunities);
  } finally {
    await prisma.$disconnect();
  }
}

export async function cleanupTestData() {
  const prisma = await getPrisma();
  try {
    // Delete opportunities first (FK constraint)
    await prisma.opportunity.deleteMany({
      where: { listing: { url: { startsWith: 'https://craigslist.org/e2e/' } } },
    });
    await prisma.listing.deleteMany({
      where: { url: { startsWith: 'https://craigslist.org/e2e/' } },
    });
  } finally {
    await prisma.$disconnect();
  }
}

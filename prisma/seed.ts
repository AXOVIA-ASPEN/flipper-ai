/**
 * Prisma Seed Script for Flipper AI
 * Populates 50+ realistic demo listings across 5 marketplaces
 * @author Stephen Boyett
 */
import { PrismaClient } from '../src/generated/prisma';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// Demo listing templates across categories and platforms
const PLATFORMS = ['CRAIGSLIST', 'FACEBOOK_MARKETPLACE', 'EBAY', 'OFFERUP', 'MERCARI'] as const;
const LOCATIONS = ['Austin, TX', 'Dallas, TX', 'Houston, TX', 'San Antonio, TX', 'Denver, CO', 'Phoenix, AZ', 'Portland, OR', 'Seattle, WA'];
const STATUSES = ['NEW', 'OPPORTUNITY', 'ANALYZING', 'PURCHASED', 'LISTED', 'SOLD', 'SKIPPED'] as const;

interface SeedListing {
  title: string;
  description: string;
  askingPrice: number;
  estimatedValue: number;
  category: string;
  condition: string;
  brand?: string;
  model?: string;
  variant?: string;
  demandLevel?: string;
  sellabilityScore?: number;
  expectedDaysToSell?: number;
}

const SEED_LISTINGS: SeedListing[] = [
  // Electronics (15)
  { title: 'iPhone 14 Pro Max 256GB - Like New', description: 'Barely used iPhone 14 Pro Max. Original box and charger.', askingPrice: 450, estimatedValue: 750, category: 'Electronics', condition: 'Like New', brand: 'Apple', model: 'iPhone 14 Pro Max', variant: '256GB', demandLevel: 'very_high', sellabilityScore: 92, expectedDaysToSell: 3 },
  { title: 'MacBook Pro M2 14" 16GB - Mint', description: 'Perfect condition MacBook Pro. AppleCare+ until 2025.', askingPrice: 1200, estimatedValue: 1800, category: 'Electronics', condition: 'Like New', brand: 'Apple', model: 'MacBook Pro M2', variant: '14" 16GB', demandLevel: 'very_high', sellabilityScore: 95, expectedDaysToSell: 2 },
  { title: 'Samsung Galaxy S24 Ultra 512GB', description: 'Unlocked, titanium black, includes case.', askingPrice: 600, estimatedValue: 950, category: 'Electronics', condition: 'Good', brand: 'Samsung', model: 'Galaxy S24 Ultra', variant: '512GB', demandLevel: 'high', sellabilityScore: 88, expectedDaysToSell: 5 },
  { title: 'iPad Air M1 64GB WiFi', description: 'Selling because I upgraded. Screen perfect.', askingPrice: 250, estimatedValue: 420, category: 'Electronics', condition: 'Good', brand: 'Apple', model: 'iPad Air M1', variant: '64GB WiFi', demandLevel: 'high', sellabilityScore: 85, expectedDaysToSell: 5 },
  { title: 'Sony WH-1000XM5 Headphones', description: 'Best noise canceling. Received as gift, already have a pair.', askingPrice: 150, estimatedValue: 300, category: 'Electronics', condition: 'New', brand: 'Sony', model: 'WH-1000XM5', demandLevel: 'high', sellabilityScore: 90, expectedDaysToSell: 3 },
  { title: 'DJI Mini 3 Pro Fly More Combo', description: 'Complete drone kit with extra batteries and ND filters.', askingPrice: 400, estimatedValue: 700, category: 'Electronics', condition: 'Good', brand: 'DJI', model: 'Mini 3 Pro', variant: 'Fly More Combo', demandLevel: 'high', sellabilityScore: 82, expectedDaysToSell: 7 },
  { title: 'Canon EOS R6 Body Only', description: 'Low shutter count, just upgraded to R5.', askingPrice: 900, estimatedValue: 1500, category: 'Electronics', condition: 'Excellent', brand: 'Canon', model: 'EOS R6', demandLevel: 'medium', sellabilityScore: 78, expectedDaysToSell: 10 },
  { title: 'Apple Watch Ultra 2 49mm', description: 'Barely worn, includes extra bands.', askingPrice: 450, estimatedValue: 700, category: 'Electronics', condition: 'Like New', brand: 'Apple', model: 'Watch Ultra 2', variant: '49mm', demandLevel: 'high', sellabilityScore: 87, expectedDaysToSell: 4 },
  { title: 'Bose SoundLink Flex Speaker', description: 'Great portable speaker. Too many speakers already.', askingPrice: 60, estimatedValue: 120, category: 'Electronics', condition: 'Good', brand: 'Bose', model: 'SoundLink Flex', demandLevel: 'medium', sellabilityScore: 75, expectedDaysToSell: 7 },
  { title: 'Dell XPS 15 i7 32GB 1TB', description: 'Work laptop, company provided new one.', askingPrice: 700, estimatedValue: 1200, category: 'Electronics', condition: 'Good', brand: 'Dell', model: 'XPS 15', variant: 'i7/32GB/1TB', demandLevel: 'medium', sellabilityScore: 80, expectedDaysToSell: 8 },
  { title: 'AirPods Pro 2nd Gen USB-C', description: 'Sealed in box. Won at company raffle.', askingPrice: 120, estimatedValue: 220, category: 'Electronics', condition: 'New', brand: 'Apple', model: 'AirPods Pro 2', variant: 'USB-C', demandLevel: 'very_high', sellabilityScore: 94, expectedDaysToSell: 1 },
  { title: 'Nintendo Switch OLED + 5 Games', description: 'Moving sale, need gone ASAP.', askingPrice: 200, estimatedValue: 380, category: 'Electronics', condition: 'Good', brand: 'Nintendo', model: 'Switch OLED', demandLevel: 'high', sellabilityScore: 86, expectedDaysToSell: 4 },
  { title: 'Sonos Beam Gen 2 Soundbar', description: 'Downsizing apartment, too big for new place.', askingPrice: 200, estimatedValue: 380, category: 'Electronics', condition: 'Excellent', brand: 'Sonos', model: 'Beam Gen 2', demandLevel: 'medium', sellabilityScore: 80, expectedDaysToSell: 7 },
  { title: 'GoPro Hero 12 Black Bundle', description: 'Used once on vacation. Includes mounts and case.', askingPrice: 200, estimatedValue: 350, category: 'Electronics', condition: 'Like New', brand: 'GoPro', model: 'Hero 12 Black', demandLevel: 'medium', sellabilityScore: 76, expectedDaysToSell: 10 },
  { title: 'Meta Quest 3 128GB', description: 'VR isn\'t for me. Includes elite strap.', askingPrice: 250, estimatedValue: 450, category: 'Electronics', condition: 'Like New', brand: 'Meta', model: 'Quest 3', variant: '128GB', demandLevel: 'high', sellabilityScore: 84, expectedDaysToSell: 5 },

  // Furniture (10)
  { title: 'Herman Miller Aeron Chair Size B', description: 'Office closing sale. Fully loaded, great condition.', askingPrice: 350, estimatedValue: 800, category: 'Furniture', condition: 'Good', brand: 'Herman Miller', model: 'Aeron', variant: 'Size B Fully Loaded', demandLevel: 'high', sellabilityScore: 88, expectedDaysToSell: 7 },
  { title: 'Steelcase Leap V2 Office Chair', description: 'Ergonomic office chair, black fabric.', askingPrice: 200, estimatedValue: 500, category: 'Furniture', condition: 'Good', brand: 'Steelcase', model: 'Leap V2', demandLevel: 'high', sellabilityScore: 85, expectedDaysToSell: 7 },
  { title: 'West Elm Mid-Century Desk', description: 'Solid walnut, beautiful piece. Moving overseas.', askingPrice: 300, estimatedValue: 600, category: 'Furniture', condition: 'Excellent', brand: 'West Elm', model: 'Mid-Century Desk', demandLevel: 'medium', sellabilityScore: 72, expectedDaysToSell: 14 },
  { title: 'IKEA Kallax 4x4 Shelf Unit White', description: 'Perfect condition, disassembled for easy transport.', askingPrice: 40, estimatedValue: 90, category: 'Furniture', condition: 'Good', brand: 'IKEA', model: 'Kallax 4x4', demandLevel: 'high', sellabilityScore: 80, expectedDaysToSell: 3 },
  { title: 'Standing Desk - FlexiSpot E7 Pro', description: 'Electric standing desk, 60x30, bamboo top.', askingPrice: 250, estimatedValue: 500, category: 'Furniture', condition: 'Good', brand: 'FlexiSpot', model: 'E7 Pro', demandLevel: 'high', sellabilityScore: 82, expectedDaysToSell: 7 },
  { title: 'CB2 Leather Sofa - 3 Seat', description: 'Genuine leather, cognac color. Minor wear.', askingPrice: 600, estimatedValue: 1400, category: 'Furniture', condition: 'Good', brand: 'CB2', model: 'Leather Sofa', demandLevel: 'medium', sellabilityScore: 70, expectedDaysToSell: 14 },
  { title: 'Pottery Barn Dining Table + 6 Chairs', description: 'Solid wood, seats 6-8. Excellent condition.', askingPrice: 500, estimatedValue: 1200, category: 'Furniture', condition: 'Excellent', brand: 'Pottery Barn', model: 'Dining Set', demandLevel: 'medium', sellabilityScore: 68, expectedDaysToSell: 21 },
  { title: 'Article Timber Sofa - Charme Tan', description: 'Premium leather, 1 year old. Moving sale.', askingPrice: 800, estimatedValue: 1600, category: 'Furniture', condition: 'Like New', brand: 'Article', model: 'Timber', variant: 'Charme Tan', demandLevel: 'medium', sellabilityScore: 74, expectedDaysToSell: 14 },
  { title: 'Restoration Hardware Cloud Couch Sections', description: '2 corner + 1 armless sections. Gray linen.', askingPrice: 2000, estimatedValue: 5000, category: 'Furniture', condition: 'Good', brand: 'RH', model: 'Cloud Modular', demandLevel: 'high', sellabilityScore: 82, expectedDaysToSell: 10 },
  { title: 'UPLIFT V2 Standing Desk Frame', description: 'Frame only, black. Works perfectly.', askingPrice: 150, estimatedValue: 350, category: 'Furniture', condition: 'Good', brand: 'UPLIFT', model: 'V2', demandLevel: 'medium', sellabilityScore: 75, expectedDaysToSell: 10 },

  // Gaming (8)
  { title: 'PS5 Disc Edition + 3 Games', description: 'Perfect condition. Games: Spider-Man 2, FF7, GOW.', askingPrice: 350, estimatedValue: 550, category: 'Gaming', condition: 'Excellent', brand: 'Sony', model: 'PS5', variant: 'Disc Edition', demandLevel: 'very_high', sellabilityScore: 92, expectedDaysToSell: 2 },
  { title: 'Xbox Series X 1TB', description: 'Barely used, prefer PC gaming.', askingPrice: 280, estimatedValue: 430, category: 'Gaming', condition: 'Like New', brand: 'Microsoft', model: 'Xbox Series X', variant: '1TB', demandLevel: 'high', sellabilityScore: 85, expectedDaysToSell: 5 },
  { title: 'Steam Deck OLED 1TB', description: 'Bought last month, not using enough. Includes case.', askingPrice: 400, estimatedValue: 600, category: 'Gaming', condition: 'Like New', brand: 'Valve', model: 'Steam Deck OLED', variant: '1TB', demandLevel: 'very_high', sellabilityScore: 90, expectedDaysToSell: 3 },
  { title: 'Razer Huntsman V3 Pro Keyboard', description: 'Analog switches, magnetic. Like new.', askingPrice: 100, estimatedValue: 200, category: 'Gaming', condition: 'Like New', brand: 'Razer', model: 'Huntsman V3 Pro', demandLevel: 'medium', sellabilityScore: 75, expectedDaysToSell: 10 },
  { title: 'Secretlab Titan Evo 2022 Chair', description: 'Leatherette, dark knight edition. Great condition.', askingPrice: 250, estimatedValue: 450, category: 'Gaming', condition: 'Good', brand: 'Secretlab', model: 'Titan Evo 2022', demandLevel: 'medium', sellabilityScore: 72, expectedDaysToSell: 14 },
  { title: 'Elgato Stream Deck MK.2', description: 'Perfect for streaming setup. All buttons work.', askingPrice: 60, estimatedValue: 120, category: 'Gaming', condition: 'Good', brand: 'Elgato', model: 'Stream Deck MK.2', demandLevel: 'medium', sellabilityScore: 78, expectedDaysToSell: 7 },
  { title: 'LG 27GP850-B 27" Gaming Monitor', description: '165Hz IPS, 1440p. Upgrading to OLED.', askingPrice: 200, estimatedValue: 350, category: 'Gaming', condition: 'Good', brand: 'LG', model: '27GP850-B', variant: '27" 1440p 165Hz', demandLevel: 'high', sellabilityScore: 83, expectedDaysToSell: 5 },
  { title: 'SteelSeries Arctis Nova Pro Wireless', description: 'Multi-system wireless headset. Excellent sound.', askingPrice: 150, estimatedValue: 280, category: 'Gaming', condition: 'Good', brand: 'SteelSeries', model: 'Arctis Nova Pro', variant: 'Wireless', demandLevel: 'medium', sellabilityScore: 77, expectedDaysToSell: 8 },

  // Sports & Outdoors (8)
  { title: 'Peloton Bike+ with Accessories', description: 'Moving, can\'t take it. Includes mat, weights, shoes.', askingPrice: 800, estimatedValue: 1500, category: 'Sports', condition: 'Good', brand: 'Peloton', model: 'Bike+', demandLevel: 'medium', sellabilityScore: 70, expectedDaysToSell: 14 },
  { title: 'Trek Domane SL 5 Road Bike 56cm', description: 'Carbon frame, Shimano 105. 2000 miles.', askingPrice: 1200, estimatedValue: 2200, category: 'Sports', condition: 'Good', brand: 'Trek', model: 'Domane SL 5', variant: '56cm', demandLevel: 'medium', sellabilityScore: 72, expectedDaysToSell: 14 },
  { title: 'Yeti Tundra 65 Cooler', description: 'Used twice camping. Basically new.', askingPrice: 150, estimatedValue: 300, category: 'Sports', condition: 'Like New', brand: 'Yeti', model: 'Tundra 65', demandLevel: 'high', sellabilityScore: 85, expectedDaysToSell: 5 },
  { title: 'Garmin Fenix 7X Solar', description: 'Titanium, sapphire lens. Switching to Apple Watch.', askingPrice: 350, estimatedValue: 600, category: 'Sports', condition: 'Excellent', brand: 'Garmin', model: 'Fenix 7X Solar', demandLevel: 'high', sellabilityScore: 82, expectedDaysToSell: 7 },
  { title: 'REI Co-op Half Dome 2+ Tent', description: 'Used 3x. Clean, no damage. Includes footprint.', askingPrice: 100, estimatedValue: 220, category: 'Sports', condition: 'Good', brand: 'REI', model: 'Half Dome 2+', demandLevel: 'medium', sellabilityScore: 74, expectedDaysToSell: 10 },
  { title: 'Bowflex SelectTech 552 Dumbbells (Pair)', description: 'Adjustable 5-52.5 lbs. Garage gym clearing.', askingPrice: 150, estimatedValue: 320, category: 'Sports', condition: 'Good', brand: 'Bowflex', model: 'SelectTech 552', demandLevel: 'high', sellabilityScore: 86, expectedDaysToSell: 4 },
  { title: 'Hydrow Rower - Like New', description: 'Under warranty. Moving to smaller apartment.', askingPrice: 800, estimatedValue: 1600, category: 'Sports', condition: 'Like New', brand: 'Hydrow', model: 'Rower', demandLevel: 'medium', sellabilityScore: 68, expectedDaysToSell: 21 },
  { title: 'Osprey Atmos AG 65 Backpack', description: 'Medium. Used for one thru-hike. Great condition.', askingPrice: 100, estimatedValue: 230, category: 'Sports', condition: 'Good', brand: 'Osprey', model: 'Atmos AG 65', variant: 'Medium', demandLevel: 'medium', sellabilityScore: 76, expectedDaysToSell: 10 },

  // Collectibles & Misc (9)
  { title: 'LEGO Star Wars UCS Millennium Falcon 75192', description: 'Sealed! Won at charity raffle.', askingPrice: 600, estimatedValue: 1000, category: 'Collectibles', condition: 'New', brand: 'LEGO', model: '75192', variant: 'UCS Millennium Falcon', demandLevel: 'very_high', sellabilityScore: 95, expectedDaysToSell: 2 },
  { title: 'Dyson V15 Detect Absolute', description: 'Best cordless vacuum. Upgrading to robot vac.', askingPrice: 300, estimatedValue: 550, category: 'Home', condition: 'Good', brand: 'Dyson', model: 'V15 Detect', variant: 'Absolute', demandLevel: 'high', sellabilityScore: 85, expectedDaysToSell: 5 },
  { title: 'KitchenAid Artisan Stand Mixer - Red', description: '5-qt, barely used. Moving gift.', askingPrice: 150, estimatedValue: 330, category: 'Home', condition: 'Like New', brand: 'KitchenAid', model: 'Artisan', variant: '5-qt Red', demandLevel: 'high', sellabilityScore: 88, expectedDaysToSell: 4 },
  { title: 'Vintage 1960s Fender Stratocaster', description: 'Original pickups, some wear. Plays beautifully.', askingPrice: 3000, estimatedValue: 8000, category: 'Musical Instruments', condition: 'Fair', brand: 'Fender', model: 'Stratocaster', variant: '1960s', demandLevel: 'high', sellabilityScore: 80, expectedDaysToSell: 14 },
  { title: 'Breville Barista Express Espresso Machine', description: 'Makes cafe-quality coffee. All accessories included.', askingPrice: 300, estimatedValue: 550, category: 'Home', condition: 'Good', brand: 'Breville', model: 'Barista Express', demandLevel: 'high', sellabilityScore: 84, expectedDaysToSell: 5 },
  { title: 'Pokemon Base Set Charizard - PSA 7', description: 'Graded PSA 7. Classic card.', askingPrice: 200, estimatedValue: 400, category: 'Collectibles', condition: 'Good', brand: 'Pokemon', model: 'Base Set Charizard', variant: 'PSA 7', demandLevel: 'very_high', sellabilityScore: 93, expectedDaysToSell: 2 },
  { title: 'Roomba j7+ Self-Emptying Robot Vacuum', description: '6 months old. Works perfectly. Just don\'t need it.', askingPrice: 250, estimatedValue: 450, category: 'Home', condition: 'Good', brand: 'iRobot', model: 'Roomba j7+', demandLevel: 'high', sellabilityScore: 82, expectedDaysToSell: 5 },
  { title: 'Weber Genesis II E-335 Gas Grill', description: '3-burner, side burner. One season of use.', askingPrice: 400, estimatedValue: 750, category: 'Home', condition: 'Good', brand: 'Weber', model: 'Genesis II E-335', demandLevel: 'medium', sellabilityScore: 70, expectedDaysToSell: 14 },
  { title: 'Vitamix Professional Series 750', description: 'Commercial grade blender. Smoothie king at home.', askingPrice: 200, estimatedValue: 400, category: 'Home', condition: 'Good', brand: 'Vitamix', model: 'Professional 750', demandLevel: 'high', sellabilityScore: 83, expectedDaysToSell: 5 },
];

function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysBack: number): Date {
  return new Date(Date.now() - Math.random() * daysBack * 86400000);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo users
  const hashedPassword = await hash('demo123', 12);

  const demoUser = await prisma.user.upsert({
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

  const powerUser = await prisma.user.upsert({
    where: { email: 'pro@flipper.ai' },
    update: {},
    create: {
      email: 'pro@flipper.ai',
      name: 'Pro Flipper',
      password: hashedPassword,
      emailVerified: new Date(),
      settings: {
        create: {
          llmModel: 'gpt-4o',
          discountThreshold: 30,
          autoAnalyze: true,
        },
      },
    },
  });

  console.log(`  ✅ Users: ${demoUser.email}, ${powerUser.email}`);

  // Create all 50 listings
  let created = 0;
  for (let i = 0; i < SEED_LISTINGS.length; i++) {
    const item = SEED_LISTINGS[i];
    const platform = PLATFORMS[i % PLATFORMS.length];
    const location = randomElement(LOCATIONS);
    const user = i % 3 === 0 ? powerUser : demoUser;
    const externalId = `demo-${String(i + 1).padStart(3, '0')}`;

    const discountPercent = Math.round(((item.estimatedValue - item.askingPrice) / item.estimatedValue) * 100);
    const profitPotential = item.estimatedValue - item.askingPrice;

    // Assign varied statuses based on position
    let status: string;
    if (i < 10) status = 'OPPORTUNITY';
    else if (i < 15) status = 'ANALYZING';
    else if (i < 25) status = 'NEW';
    else if (i < 35) status = 'PURCHASED';
    else if (i < 42) status = 'LISTED';
    else if (i < 48) status = 'SOLD';
    else status = 'SKIPPED';

    const listing = await prisma.listing.upsert({
      where: {
        platform_externalId_userId: {
          platform,
          externalId,
          userId: user.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        externalId,
        platform,
        url: `https://example.com/listing/${externalId}`,
        title: item.title,
        description: item.description,
        askingPrice: item.askingPrice,
        condition: item.condition,
        location,
        category: item.category,
        estimatedValue: item.estimatedValue,
        estimatedLow: Math.round(item.estimatedValue * 0.9),
        estimatedHigh: Math.round(item.estimatedValue * 1.1),
        profitPotential,
        valueScore: Math.min(100, Math.round(discountPercent * 1.8)),
        discountPercent,
        status,
        llmAnalyzed: i < 40,
        identifiedBrand: item.brand,
        identifiedModel: item.model,
        identifiedVariant: item.variant,
        identifiedCondition: item.condition,
        sellabilityScore: item.sellabilityScore,
        demandLevel: item.demandLevel,
        expectedDaysToSell: item.expectedDaysToSell,
        authenticityRisk: item.askingPrice > 1000 ? 'medium' : 'low',
        recommendedOffer: Math.round(item.askingPrice * 0.85),
        recommendedList: Math.round(item.estimatedValue * 0.9),
        postedAt: randomDate(30),
      },
    });

    // Create opportunities for purchased/listed/sold items
    if (['PURCHASED', 'LISTED', 'SOLD'].includes(status)) {
      const purchaseDate = randomDate(60);
      const isSold = status === 'SOLD';
      const resaleDate = isSold ? new Date(purchaseDate.getTime() + (item.expectedDaysToSell || 7) * 86400000) : undefined;

      await prisma.opportunity.upsert({
        where: { listingId: listing.id },
        update: {},
        create: {
          userId: user.id,
          listingId: listing.id,
          purchasePrice: item.askingPrice,
          purchaseDate,
          resalePrice: isSold ? item.estimatedValue * 0.9 : undefined,
          resaleDate,
          fees: isSold ? Math.round(item.estimatedValue * 0.1) : undefined,
          actualProfit: isSold ? Math.round(item.estimatedValue * 0.8 - item.askingPrice) : undefined,
          status: status === 'PURCHASED' ? 'PURCHASED' : status === 'LISTED' ? 'LISTED_FOR_SALE' : 'SOLD',
        },
      });
    }

    created++;
  }
  console.log(`  ✅ Listings: ${created} created across ${PLATFORMS.length} platforms`);

  // Create search configs
  const configs = await Promise.all([
    prisma.searchConfig.create({
      data: { userId: demoUser.id, name: 'Austin Electronics Deals', platform: 'CRAIGSLIST', location: 'Austin, TX', category: 'Electronics', keywords: 'iphone,macbook,airpods,ipad', minPrice: 50, maxPrice: 1000, enabled: true },
    }),
    prisma.searchConfig.create({
      data: { userId: demoUser.id, name: 'DFW Furniture Deals', platform: 'FACEBOOK_MARKETPLACE', location: 'Dallas, TX', category: 'Furniture', keywords: 'herman miller,steelcase,west elm', minPrice: 100, maxPrice: 2000, enabled: true },
    }),
    prisma.searchConfig.create({
      data: { userId: powerUser.id, name: 'Gaming Deals Nationwide', platform: 'EBAY', category: 'Gaming', keywords: 'ps5,xbox,steam deck,nintendo', minPrice: 100, maxPrice: 800, enabled: true },
    }),
    prisma.searchConfig.create({
      data: { userId: powerUser.id, name: 'Collectibles Scanner', platform: 'MERCARI', category: 'Collectibles', keywords: 'lego,pokemon,vintage', minPrice: 50, maxPrice: 5000, enabled: true },
    }),
  ]);
  console.log(`  ✅ Search configs: ${configs.length} created`);

  // Create scraper job history
  for (let i = 0; i < 10; i++) {
    await prisma.scraperJob.create({
      data: {
        userId: i % 2 === 0 ? demoUser.id : powerUser.id,
        platform: PLATFORMS[i % PLATFORMS.length],
        location: randomElement(LOCATIONS),
        category: ['Electronics', 'Furniture', 'Gaming', 'Sports', 'Collectibles'][i % 5],
        status: i < 8 ? 'COMPLETED' : i === 8 ? 'RUNNING' : 'FAILED',
        listingsFound: Math.floor(Math.random() * 50) + 10,
        opportunitiesFound: Math.floor(Math.random() * 8) + 1,
        startedAt: new Date(Date.now() - (i + 1) * 3600000),
        completedAt: i < 8 ? new Date(Date.now() - i * 3600000) : undefined,
        errorMessage: i === 9 ? 'Rate limit exceeded on marketplace API' : undefined,
      },
    });
  }
  console.log('  ✅ Scraper jobs: 10 created (8 completed, 1 running, 1 failed)');

  console.log(`\n🎉 Seed complete! ${created} listings, 2 users, 4 search configs, 10 scraper jobs`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

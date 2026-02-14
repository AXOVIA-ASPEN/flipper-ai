export interface MockListing {
  id: string;
  platform: string;
  title: string;
  askingPrice: number;
  estimatedValue: number | null;
  profitPotential: number | null;
  valueScore: number | null;
  status: string;
  location: string | null;
  url: string;
  scrapedAt: string;
  imageUrls: string | null;
  category?: string | null;
  condition?: string | null;
  description?: string | null;
  sellerName?: string | null;
  sellerContact?: string | null;
  comparableUrls?: string | null;
  priceReasoning?: string | null;
  notes?: string | null;
  shippable?: boolean | null;
  negotiable?: boolean | null;
  tags?: string | null;
  requestToBuy?: string | null;
}

export interface MockOpportunity {
  id: string;
  listingId: string;
  status: string;
  purchasePrice: number | null;
  purchaseDate: string | null;
  resalePrice: number | null;
  resalePlatform: string | null;
  resaleUrl: string | null;
  resaleDate: string | null;
  actualProfit: number | null;
  fees: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  listing: MockListing;
}

export interface MockScraperJob {
  id: string;
  platform: string;
  location: string;
  category: string;
  status: string;
  listingsFound: number;
  opportunitiesFound: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

let counter = 0;
const uid = () => `test-${++counter}`;

export function createMockListing(overrides: Partial<MockListing> = {}): MockListing {
  const id = uid();
  return {
    id,
    platform: 'CRAIGSLIST',
    title: `Test Listing ${id}`,
    askingPrice: 500,
    estimatedValue: 700,
    profitPotential: 150,
    valueScore: 78,
    status: 'NEW',
    location: 'Tampa, FL',
    url: `https://craigslist.org/item/${id}`,
    scrapedAt: new Date().toISOString(),
    imageUrls: null,
    ...overrides,
  };
}

export function createMockOpportunity(overrides: Partial<MockOpportunity> = {}): MockOpportunity {
  const id = uid();
  const listing = createMockListing(overrides.listing as Partial<MockListing>);
  return {
    id,
    listingId: listing.id,
    status: 'IDENTIFIED',
    purchasePrice: null,
    purchaseDate: null,
    resalePrice: null,
    resalePlatform: null,
    resaleUrl: null,
    resaleDate: null,
    actualProfit: null,
    fees: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
    listing,
  };
}

export function createMockScraperJob(overrides: Partial<MockScraperJob> = {}): MockScraperJob {
  const id = uid();
  return {
    id,
    platform: 'craigslist',
    location: 'tampa',
    category: 'electronics',
    status: 'COMPLETED',
    listingsFound: 10,
    opportunitiesFound: 3,
    errorMessage: null,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockListingsResponse(listings?: MockListing[], total?: number) {
  const items = listings ?? [createMockListing(), createMockListing()];
  return { listings: items, total: total ?? items.length, limit: 50, offset: 0 };
}

export function createMockOpportunitiesResponse(opportunities?: MockOpportunity[]) {
  const items = opportunities ?? [createMockOpportunity()];
  return {
    opportunities: items,
    stats: {
      totalOpportunities: items.length,
      totalProfit: items.reduce((s, o) => s + (o.actualProfit ?? 0), 0),
      totalInvested: items.reduce((s, o) => s + (o.purchasePrice ?? 0), 0),
      totalRevenue: items.reduce((s, o) => s + (o.resalePrice ?? 0), 0),
    },
  };
}

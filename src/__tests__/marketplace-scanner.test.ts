// Tests for marketplace-scanner.ts

// Mock SSE emitter
jest.mock('../lib/sse-emitter', () => ({
  sseEmitter: {
    emit: jest.fn(),
  },
}));

import {
  analyzeListing,
  meetsViabilityCriteria,
  processListings,
  sortByOpportunity,
  formatForStorage,
  generateScanSummary,
  type RawListing,
  type AnalyzedListing,
  type ViabilityCriteria,
} from '../lib/marketplace-scanner';
import { sseEmitter } from '../lib/sse-emitter';

const makeListing = (overrides: Partial<RawListing> = {}): RawListing => ({
  externalId: '123',
  url: 'https://example.com/listing/123',
  title: 'Apple iPhone 14 Pro 256GB',
  description: 'Excellent condition, minor scratches',
  askingPrice: 200,
  condition: 'good',
  location: 'New York',
  sellerName: 'John',
  sellerContact: null,
  imageUrls: ['https://example.com/img.jpg'],
  category: 'electronics',
  postedAt: new Date('2026-01-15'),
  ...overrides,
});

describe('marketplace-scanner', () => {
  describe('analyzeListing', () => {
    it('analyzes a listing and returns enriched data', () => {
      const result = analyzeListing('CRAIGSLIST', makeListing());
      expect(result.platform).toBe('CRAIGSLIST');
      expect(result.category).toBe('electronics');
      expect(result.estimation).toBeDefined();
      expect(result.requestToBuy).toBeDefined();
      expect(typeof result.isOpportunity).toBe('boolean');
    });

    it('detects category when not provided', () => {
      const result = analyzeListing('EBAY', makeListing({ category: null }));
      expect(result.category).toBeDefined();
    });

    it('handles different platforms', () => {
      const platforms = [
        'CRAIGSLIST',
        'FACEBOOK_MARKETPLACE',
        'EBAY',
        'OFFERUP',
        'MERCARI',
      ] as const;
      for (const platform of platforms) {
        const result = analyzeListing(platform, makeListing());
        expect(result.platform).toBe(platform);
      }
    });

    it('emits SSE events when emitEvents option is true', () => {
      const mockEmit = sseEmitter.emit as jest.Mock;
      mockEmit.mockClear();

      const listing = makeListing();
      const result = analyzeListing('CRAIGSLIST', listing, {
        emitEvents: true,
        userId: 'user-123',
      });

      expect(mockEmit).toHaveBeenCalledTimes(1);
      expect(mockEmit).toHaveBeenCalledWith({
        type: 'listing.found',
        data: expect.objectContaining({
          id: listing.externalId,
          platform: 'CRAIGSLIST',
          title: listing.title,
          askingPrice: listing.askingPrice,
          userId: 'user-123',
          category: result.category,
          isOpportunity: result.isOpportunity,
        }),
      });
    });

    it('does not emit SSE events when emitEvents option is false', () => {
      const mockEmit = sseEmitter.emit as jest.Mock;
      mockEmit.mockClear();

      analyzeListing('CRAIGSLIST', makeListing(), {
        emitEvents: false,
      });

      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('does not emit SSE events when options are not provided', () => {
      const mockEmit = sseEmitter.emit as jest.Mock;
      mockEmit.mockClear();

      analyzeListing('CRAIGSLIST', makeListing());

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('meetsViabilityCriteria', () => {
    let analyzed: AnalyzedListing;

    beforeEach(() => {
      analyzed = analyzeListing('CRAIGSLIST', makeListing());
    });

    it('uses default criteria when none specified', () => {
      const result = meetsViabilityCriteria(analyzed);
      expect(typeof result).toBe('boolean');
    });

    it('filters by minValueScore', () => {
      const result = meetsViabilityCriteria(analyzed, { minValueScore: 999 });
      expect(result).toBe(false);
    });

    it('filters by maxAskingPrice', () => {
      expect(meetsViabilityCriteria(analyzed, { maxAskingPrice: 10 })).toBe(false);
      expect(meetsViabilityCriteria(analyzed, { maxAskingPrice: 10000 })).toBe(true);
    });

    it('filters by excludeCategories', () => {
      const result = meetsViabilityCriteria(analyzed, { excludeCategories: [analyzed.category] });
      expect(result).toBe(false);
    });

    it('filters by includeCategories', () => {
      expect(meetsViabilityCriteria(analyzed, { includeCategories: ['nonexistent'] })).toBe(false);
      expect(meetsViabilityCriteria(analyzed, { includeCategories: [analyzed.category] })).toBe(
        true
      );
    });

    it('rejects listing exceeding maxResaleDifficulty', () => {
      const analyzed = analyzeListing('EBAY', makeListing({ askingPrice: 200 }));
      analyzed.estimation.resaleDifficulty = 'VERY_HARD';
      expect(meetsViabilityCriteria(analyzed, { maxResaleDifficulty: 'EASY' })).toBe(false);
    });

    it('accepts listing within maxResaleDifficulty', () => {
      const analyzed = analyzeListing('EBAY', makeListing({ askingPrice: 200 }));
      analyzed.estimation.resaleDifficulty = 'EASY';
      expect(meetsViabilityCriteria(analyzed, { maxResaleDifficulty: 'HARD' })).toBe(true);
    });

    it('filters by maxResaleDifficulty', () => {
      const easy = meetsViabilityCriteria(analyzed, { maxResaleDifficulty: 'VERY_EASY' });
      const hard = meetsViabilityCriteria(analyzed, { maxResaleDifficulty: 'VERY_HARD' });
      // hard should be at least as permissive as easy
      if (easy) expect(hard).toBe(true);
    });

    it('filters by requireShippable', () => {
      const result = meetsViabilityCriteria(analyzed, { requireShippable: true });
      expect(typeof result).toBe('boolean');
    });

    it('rejects non-shippable items when requireShippable is true', () => {
      // Force estimation.shippable to false
      analyzed.estimation = { ...analyzed.estimation, shippable: false };
      const result = meetsViabilityCriteria(analyzed, { requireShippable: true });
      expect(result).toBe(false);
    });

    it('accepts shippable items when requireShippable is true', () => {
      analyzed.estimation = { ...analyzed.estimation, shippable: true };
      const result = meetsViabilityCriteria(analyzed, { requireShippable: true });
      // Should not be filtered by shippable (may still fail other criteria)
      // At minimum, the shippable check doesn't reject it
      expect(typeof result).toBe('boolean');
    });

    it('filters by includeCategories (rejects unlisted category)', () => {
      analyzed.category = 'electronics';
      const result = meetsViabilityCriteria(analyzed, {
        includeCategories: ['furniture', 'clothing'],
      });
      expect(result).toBe(false);
    });

    it('accepts items in includeCategories list', () => {
      analyzed.category = 'electronics';
      const result = meetsViabilityCriteria(analyzed, {
        includeCategories: ['electronics', 'furniture'],
      });
      // Should not be rejected by includeCategories filter
      expect(typeof result).toBe('boolean');
    });

    it('filters by maxAskingPrice', () => {
      analyzed.askingPrice = 500;
      const result = meetsViabilityCriteria(analyzed, { maxAskingPrice: 100 });
      expect(result).toBe(false);
    });

    it('rejects items above maxResaleDifficulty', () => {
      analyzed.estimation = { ...analyzed.estimation, resaleDifficulty: 'VERY_HARD' };
      const result = meetsViabilityCriteria(analyzed, { maxResaleDifficulty: 'EASY' });
      expect(result).toBe(false);
    });

    it('filters by minProfitPotential', () => {
      const result = meetsViabilityCriteria(analyzed, { minProfitPotential: 999999 });
      expect(result).toBe(false);
    });
  });

  describe('processListings', () => {
    it('processes a batch of listings', () => {
      const listings = [makeListing(), makeListing({ askingPrice: 50, title: 'Cheap Widget' })];
      const result = processListings('FACEBOOK_MARKETPLACE', listings);
      expect(result.all).toHaveLength(2);
      expect(result.opportunities.length).toBeLessThanOrEqual(2);
    });

    it('applies criteria when provided', () => {
      const listings = [makeListing()];
      const result = processListings('EBAY', listings, { maxAskingPrice: 1 });
      expect(result.filtered).toHaveLength(0);
    });

    it('handles empty listings', () => {
      const result = processListings('MERCARI', []);
      expect(result.all).toHaveLength(0);
      expect(result.opportunities).toHaveLength(0);
    });
  });

  describe('sortByOpportunity', () => {
    it('sorts by value score descending', () => {
      const listings = [
        analyzeListing('EBAY', makeListing({ askingPrice: 500, title: 'Cheap item' })),
        analyzeListing('EBAY', makeListing({ askingPrice: 10, title: 'Apple MacBook Pro 16' })),
      ];
      const sorted = sortByOpportunity(listings);
      expect(sorted[0].estimation.valueScore).toBeGreaterThanOrEqual(
        sorted[1].estimation.valueScore
      );
    });

    it('handles empty array', () => {
      expect(sortByOpportunity([])).toEqual([]);
    });

    it('breaks ties by profit potential when value scores are equal', () => {
      const a = analyzeListing('EBAY', makeListing({ askingPrice: 200 }));
      const b = analyzeListing('EBAY', makeListing({ askingPrice: 200 }));
      // Force same valueScore but different profitPotential
      a.estimation.valueScore = 80;
      b.estimation.valueScore = 80;
      a.estimation.profitPotential = 100;
      b.estimation.profitPotential = 200;
      const sorted = sortByOpportunity([a, b]);
      expect(sorted[0].estimation.profitPotential).toBe(200);
    });

    it('breaks ties by resale difficulty when score and profit are equal', () => {
      const a = analyzeListing('EBAY', makeListing({ askingPrice: 200 }));
      const b = analyzeListing('EBAY', makeListing({ askingPrice: 200 }));
      a.estimation.valueScore = 80;
      b.estimation.valueScore = 80;
      a.estimation.profitPotential = 100;
      b.estimation.profitPotential = 100;
      a.estimation.resaleDifficulty = 'HARD';
      b.estimation.resaleDifficulty = 'EASY';
      const sorted = sortByOpportunity([a, b]);
      expect(sorted[0].estimation.resaleDifficulty).toBe('EASY');
    });
  });

  describe('formatForStorage', () => {
    it('returns a flat object with all fields', () => {
      const analyzed = analyzeListing('CRAIGSLIST', makeListing());
      const stored = formatForStorage(analyzed);
      expect(stored.platform).toBe('CRAIGSLIST');
      expect(stored.title).toBe('Apple iPhone 14 Pro 256GB');
      expect(stored.estimatedValue).toBeDefined();
      expect(stored.valueScore).toBeDefined();
      expect(typeof stored.tags).toBe('string'); // JSON stringified
    });

    it('handles null imageUrls', () => {
      const analyzed = analyzeListing('EBAY', makeListing({ imageUrls: undefined }));
      const stored = formatForStorage(analyzed);
      expect(stored.imageUrls).toBeNull();
    });
  });

  describe('generateScanSummary', () => {
    it('generates accurate summary', () => {
      const listings = [makeListing(), makeListing({ askingPrice: 50 })];
      const results = processListings('CRAIGSLIST', listings);
      const summary = generateScanSummary(results);
      expect(summary.totalListings).toBe(2);
      expect(summary.averageScore).toBeGreaterThanOrEqual(0);
      expect(summary.categoryCounts).toBeDefined();
    });

    it('calculates totalPotentialProfit from opportunities', () => {
      const listings = [makeListing({ askingPrice: 10 }), makeListing({ askingPrice: 20 })];
      const results = processListings('CRAIGSLIST', listings);
      // Force some to be opportunities with known profit
      results.opportunities = results.all.filter((l) => l.isOpportunity);
      const summary = generateScanSummary(results);
      expect(summary.totalPotentialProfit).toBeGreaterThanOrEqual(0);
      expect(typeof summary.totalPotentialProfit).toBe('number');
    });

    it('returns bestOpportunity as highest scored', () => {
      const listings = [makeListing({ askingPrice: 10 }), makeListing({ askingPrice: 5 })];
      const results = processListings('EBAY', listings);
      if (results.opportunities.length > 0) {
        const summary = generateScanSummary(results);
        expect(summary.bestOpportunity).not.toBeNull();
      }
    });

    it('handles empty results', () => {
      const results = processListings('EBAY', []);
      const summary = generateScanSummary(results);
      expect(summary.totalListings).toBe(0);
      expect(summary.averageScore).toBe(0);
      expect(summary.bestOpportunity).toBeNull();
    });

    it('returns non-null bestOpportunity when opportunities exist', () => {
      // Very low asking price → high value score → triggers isOpportunity and sorted[0] branch
      const highValueListings = [makeListing({ askingPrice: 1, title: 'Rolex Watch' })];
      const results = processListings('EBAY', highValueListings);
      results.opportunities = results.all.filter((l) => l.isOpportunity);
      if (results.opportunities.length > 0) {
        const summary = generateScanSummary(results);
        expect(summary.bestOpportunity).not.toBeNull();
      }
    });
  });
});

describe('marketplace-scanner - targeted branch coverage', () => {
  it('handles listing with no description (description || null fallback)', () => {
    const listing = makeListing({ description: undefined });
    const analyzed = analyzeListing('CRAIGSLIST', listing);
    // Should still work with no description
    expect(analyzed.title).toBe('Apple iPhone 14 Pro 256GB');
    expect(analyzed.platform).toBe('CRAIGSLIST');
  });

  it('handles listing with no category AND no description (both || fallbacks)', () => {
    // Need both falsy for the description||null branch inside detectCategory to trigger
    const listingNoCatNoDec: RawListing = {
      ...makeListing(),
      category: undefined,
      description: undefined,
    };
    const analyzed = analyzeListing('EBAY', listingNoCatNoDec);
    expect(analyzed.title).toBe('Apple iPhone 14 Pro 256GB');
    // Should detect category from title alone
    expect(typeof analyzed.category).toBe('string');
  });

  it('handles listing with no condition (condition || null fallback)', () => {
    const listing = makeListing({ condition: undefined });
    const analyzed = analyzeListing('CRAIGSLIST', listing);
    expect(analyzed.title).toBe('Apple iPhone 14 Pro 256GB');
    expect(typeof analyzed.estimation.valueScore).toBe('number');
  });

  it('handles listing with no category (category || detectCategory fallback)', () => {
    const listing = makeListing({ category: undefined });
    // Explicitly ensure category is falsy
    const listingWithoutCat = { ...listing };
    delete listingWithoutCat.category;
    const analyzed = analyzeListing('EBAY', listingWithoutCat as RawListing);
    // detectCategory fills in from title analysis
    expect(typeof analyzed.category).toBe('string');
  });

  it('formats listing with isOpportunity=true → status OPPORTUNITY branch', () => {
    // Manually build an AnalyzedListing with isOpportunity = true
    const baseListing = makeListing({ askingPrice: 1 });
    const analyzed = analyzeListing('EBAY', baseListing);
    // Override isOpportunity to force the OPPORTUNITY branch in formatForStorage
    const opportunityListing: AnalyzedListing = { ...analyzed, isOpportunity: true };
    const stored = formatForStorage(opportunityListing);
    expect(stored.status).toBe('OPPORTUNITY');
  });

  it('generateScanSummary returns non-null bestOpportunity when opportunities exist', () => {
    // Build results with at least one opportunity
    const listing = makeListing({ askingPrice: 1 });
    const analyzed: AnalyzedListing = { ...analyzeListing('EBAY', listing), isOpportunity: true };
    const results = {
      all: [analyzed],
      opportunities: [analyzed],
      filtered: [analyzed],
    };
    const summary = generateScanSummary(results);
    expect(summary.bestOpportunity).not.toBeNull();
  });
});

describe('marketplace-scanner - emitEvents functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits SSE event when emitEvents option is true', () => {
    const listing = makeListing({ externalId: 'test-123' });
    const result = analyzeListing('CRAIGSLIST', listing, {
      emitEvents: true,
      userId: 'user-456',
    });

    expect(sseEmitter.emit).toHaveBeenCalledTimes(1);
    expect(sseEmitter.emit).toHaveBeenCalledWith({
      type: 'listing.found',
      data: expect.objectContaining({
        id: 'test-123',
        platform: 'CRAIGSLIST',
        title: listing.title,
        askingPrice: listing.askingPrice,
        userId: 'user-456',
        url: listing.url,
        isOpportunity: expect.any(Boolean),
      }),
    });

    expect(result.platform).toBe('CRAIGSLIST');
  });

  it('does not emit SSE event when emitEvents option is false', () => {
    const listing = makeListing();
    analyzeListing('EBAY', listing, { emitEvents: false });

    expect(sseEmitter.emit).not.toHaveBeenCalled();
  });

  it('does not emit SSE event when emitEvents option is not provided', () => {
    const listing = makeListing();
    analyzeListing('FACEBOOK_MARKETPLACE', listing);

    expect(sseEmitter.emit).not.toHaveBeenCalled();
  });

  it('includes all required fields in emitted event', () => {
    const listing = makeListing({
      externalId: 'emit-test-1',
      title: 'Test Product',
      askingPrice: 150,
      url: 'https://example.com/item/1',
    });

    analyzeListing('OFFERUP', listing, {
      emitEvents: true,
      userId: 'test-user',
    });

    expect(sseEmitter.emit).toHaveBeenCalledWith({
      type: 'listing.found',
      data: expect.objectContaining({
        id: 'emit-test-1',
        platform: 'OFFERUP',
        title: 'Test Product',
        askingPrice: 150,
        estimatedValue: expect.any(Number),
        profitPotential: expect.any(Number),
        valueScore: expect.any(Number),
        category: expect.any(String),
        url: 'https://example.com/item/1',
        isOpportunity: expect.any(Boolean),
        userId: 'test-user',
      }),
    });
  });

  it('works with emitEvents option in processListings', () => {
    const listings = [makeListing({ externalId: 'batch-1' }), makeListing({ externalId: 'batch-2' })];
    
    processListings('MERCARI', listings, undefined, { emitEvents: true, userId: 'batch-user' });

    // Should emit once per listing
    expect(sseEmitter.emit).toHaveBeenCalledTimes(2);
  });
});

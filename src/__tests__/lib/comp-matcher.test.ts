/**
 * Unit tests for src/lib/comp-matcher.ts
 * Story 5.2: Comparable Sold Item Matching (FR-SCORE-17)
 */

import {
  filterByBrandModel,
  calcConfidence,
  findComparableSales,
  type CompMatchResult,
} from '@/lib/comp-matcher';
import type { SoldListing } from '@/lib/market-price';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeSoldListing(overrides: Partial<SoldListing> = {}): SoldListing {
  return {
    title: 'Sony WH-1000XM5 Wireless Headphones',
    price: 180,
    soldDate: new Date('2024-10-15'),
    condition: 'Used',
    url: 'https://www.ebay.com/itm/1234',
    shippingCost: 0,
    ...overrides,
  };
}

// ─── filterByBrandModel ──────────────────────────────────────────────────────

describe('filterByBrandModel()', () => {
  it('returns true when both brand and model are null (no filter)', () => {
    expect(filterByBrandModel('Some Random Item Title', null, null)).toBe(true);
  });

  it('returns true when title contains both brand and model (case-insensitive)', () => {
    expect(filterByBrandModel('Sony WH-1000XM5 Headphones Used', 'Sony', 'WH-1000XM5')).toBe(true);
  });

  it('returns false when title is missing the brand', () => {
    expect(filterByBrandModel('WH-1000XM5 Headphones', 'Sony', 'WH-1000XM5')).toBe(false);
  });

  it('returns false when title is missing the model', () => {
    expect(filterByBrandModel('Sony Headphones Used', 'Sony', 'WH-1000XM5')).toBe(false);
  });

  it('is case-insensitive for brand', () => {
    expect(filterByBrandModel('SONY WH-1000XM5', 'sony', 'WH-1000XM5')).toBe(true);
  });

  it('is case-insensitive for model', () => {
    expect(filterByBrandModel('Sony wh-1000xm5', 'Sony', 'WH-1000XM5')).toBe(true);
  });

  it('returns true when brand is null and model matches', () => {
    expect(filterByBrandModel('WH-1000XM5 Headphones', null, 'WH-1000XM5')).toBe(true);
  });

  it('returns true when model is null and brand matches', () => {
    expect(filterByBrandModel('Sony Headphones', 'Sony', null)).toBe(true);
  });

  it('returns false when model is null but brand does not match', () => {
    expect(filterByBrandModel('Bose Headphones', 'Sony', null)).toBe(false);
  });

  it('returns false when brand is null but model does not match', () => {
    expect(filterByBrandModel('Generic Item', null, 'WH-1000XM5')).toBe(false);
  });
});

// ─── calcConfidence ──────────────────────────────────────────────────────────

describe('calcConfidence()', () => {
  it('returns "insufficient" for 0 comps', () => {
    expect(calcConfidence(0)).toBe('insufficient');
  });

  it('returns "low" for 1 comp', () => {
    expect(calcConfidence(1)).toBe('low');
  });

  it('returns "low" for 2 comps', () => {
    expect(calcConfidence(2)).toBe('low');
  });

  it('returns "medium" for 3 comps', () => {
    expect(calcConfidence(3)).toBe('medium');
  });

  it('returns "medium" for 4 comps', () => {
    expect(calcConfidence(4)).toBe('medium');
  });

  it('returns "high" for 5 comps', () => {
    expect(calcConfidence(5)).toBe('high');
  });

  it('returns "high" for many comps', () => {
    expect(calcConfidence(20)).toBe('high');
  });
});

// ─── findComparableSales ─────────────────────────────────────────────────────

jest.mock('@/lib/market-price', () => ({
  fetchMarketPrice: jest.fn(),
}));

import { fetchMarketPrice } from '@/lib/market-price';
const mockFetchMarketPrice = fetchMarketPrice as jest.MockedFunction<typeof fetchMarketPrice>;

describe('findComparableSales()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rawComps path (avoids duplicate Playwright call)', () => {
    it('filters rawComps by brand and model and returns matched comps', async () => {
      const rawComps: SoldListing[] = [
        makeSoldListing({ title: 'Sony WH-1000XM5 Headphones', price: 200 }),
        makeSoldListing({ title: 'Bose QuietComfort 45', price: 150 }), // different brand
        makeSoldListing({ title: 'Sony WH-1000XM5 Noise Canceling', price: 175 }),
      ];

      const result = await findComparableSales('Sony WH-1000XM5', 'Sony', 'WH-1000XM5', 'electronics', rawComps);

      expect(result).not.toBeNull();
      expect(result!.comps).toHaveLength(2);
      expect(result!.comps[0].soldPrice).toBe(200);
      expect(result!.comps[1].soldPrice).toBe(175);
      expect(result!.confidence).toBe('low');
      expect(result!.insufficientData).toBe(false);
      expect(result!.totalFetched).toBe(3);
      expect(result!.searchQuery).toBe('Sony WH-1000XM5');
      expect(fetchMarketPrice).not.toHaveBeenCalled(); // no extra Playwright call
    });

    it('returns insufficient when no comps match the brand/model filter', async () => {
      const rawComps: SoldListing[] = [
        makeSoldListing({ title: 'Bose QuietComfort 45', price: 150 }),
        makeSoldListing({ title: 'Apple AirPods Pro', price: 180 }),
      ];

      const result = await findComparableSales('Sony WH-1000XM5', 'Sony', 'WH-1000XM5', undefined, rawComps);

      expect(result).not.toBeNull();
      expect(result!.comps).toHaveLength(0);
      expect(result!.confidence).toBe('insufficient');
      expect(result!.insufficientData).toBe(true);
      expect(fetchMarketPrice).not.toHaveBeenCalled();
    });

    it('accepts all comps when brand and model are both null', async () => {
      const rawComps: SoldListing[] = [
        makeSoldListing({ title: 'Item A', price: 50 }),
        makeSoldListing({ title: 'Item B', price: 80 }),
        makeSoldListing({ title: 'Item C', price: 60 }),
        makeSoldListing({ title: 'Item D', price: 70 }),
        makeSoldListing({ title: 'Item E', price: 90 }),
      ];

      const result = await findComparableSales('generic item', null, null, undefined, rawComps);

      expect(result).not.toBeNull();
      expect(result!.comps).toHaveLength(5);
      expect(result!.confidence).toBe('high');
    });
  });

  describe('fetch path (rawComps not provided)', () => {
    it('calls fetchMarketPrice when rawComps is not provided', async () => {
      const mockListings: SoldListing[] = [
        makeSoldListing({ title: 'Sony WH-1000XM5 Headphones', price: 200 }),
        makeSoldListing({ title: 'Sony WH-1000XM5 Used', price: 160 }),
      ];
      mockFetchMarketPrice.mockResolvedValue({
        source: 'ebay_scrape',
        soldListings: mockListings,
        medianPrice: 180,
        lowPrice: 160,
        highPrice: 200,
        avgPrice: 180,
        salesCount: 2,
        avgDaysToSell: null,
        searchQuery: 'Sony WH-1000XM5',
        fetchedAt: new Date(),
      });

      const result = await findComparableSales('Sony WH-1000XM5', 'Sony', 'WH-1000XM5', 'electronics');

      expect(fetchMarketPrice).toHaveBeenCalledWith('Sony WH-1000XM5', 'electronics');
      expect(result).not.toBeNull();
      expect(result!.comps).toHaveLength(2);
      expect(result!.confidence).toBe('low');
    });

    it('returns null when fetchMarketPrice returns null', async () => {
      mockFetchMarketPrice.mockResolvedValue(null);

      const result = await findComparableSales('unknown item', null, null);

      expect(result).toBeNull();
    });

    it('calls fetchMarketPrice when rawComps is empty array', async () => {
      mockFetchMarketPrice.mockResolvedValue(null);

      await findComparableSales('item', null, null, undefined, []);

      expect(fetchMarketPrice).toHaveBeenCalled();
    });
  });

  describe('ComparableSale shape', () => {
    it('maps SoldListing fields correctly to ComparableSale', async () => {
      const soldDate = new Date('2024-10-15');
      const rawComps: SoldListing[] = [
        {
          title: 'Sony WH-1000XM5',
          price: 200,
          soldDate,
          condition: 'Like New',
          url: 'https://www.ebay.com/itm/9999',
          shippingCost: 10,
        },
      ];

      const result = await findComparableSales('Sony WH-1000XM5', 'Sony', 'WH-1000XM5', undefined, rawComps);

      expect(result!.comps[0]).toEqual({
        title: 'Sony WH-1000XM5',
        soldPrice: 200,
        soldDate,
        condition: 'Like New',
        platform: 'ebay',
        url: 'https://www.ebay.com/itm/9999',
      });
    });
  });

  describe('error handling', () => {
    it('returns null when fetchMarketPrice throws', async () => {
      mockFetchMarketPrice.mockRejectedValue(new Error('Network error'));

      const result = await findComparableSales('item', null, null);

      expect(result).toBeNull();
    });
  });
});

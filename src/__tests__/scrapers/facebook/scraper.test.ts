/**
 * Facebook Marketplace Scraper Tests
 * Tests for utility functions and convertToRawListing
 */

import { convertToRawListing } from '@/scrapers/facebook/scraper';
import type { FacebookListingDetail } from '@/scrapers/facebook/types';
import {
  FACEBOOK_CATEGORIES,
  FacebookListingPreviewSchema,
  FacebookListingDetailSchema,
} from '@/scrapers/facebook/types';

describe('Facebook Scraper', () => {
  describe('convertToRawListing', () => {
    it('converts a full listing to RawListing format', () => {
      const listing: FacebookListingDetail = {
        title: 'iPhone 14 Pro Max',
        price: '$899',
        description: 'Like new condition',
        condition: 'Like New',
        location: 'Sarasota, FL',
        sellerName: 'John Doe',
        postedDate: '2026-02-10',
        images: ['https://img1.jpg', 'https://img2.jpg'],
        category: 'electronics',
      };

      const result = convertToRawListing(listing, 0);

      expect(result.title).toBe('iPhone 14 Pro Max');
      expect(result.askingPrice).toBe(899);
      expect(result.description).toBe('Like new condition');
      expect(result.condition).toBe('Like New');
      expect(result.location).toBe('Sarasota, FL');
      expect(result.sellerName).toBe('John Doe');
      expect(result.imageUrls).toEqual(['https://img1.jpg', 'https://img2.jpg']);
      expect(result.category).toBe('electronics');
      expect(result.sellerContact).toBeNull();
      expect(result.externalId).toBeDefined();
      expect(result.url).toBe('https://www.facebook.com/marketplace');
    });

    it('uses baseUrl when provided', () => {
      const listing: FacebookListingDetail = {
        title: 'Test Item',
        price: '$50',
      };
      const result = convertToRawListing(listing, 0, 'https://facebook.com/item/123');
      expect(result.url).toBe('https://facebook.com/item/123');
    });

    it('handles missing optional fields', () => {
      const listing: FacebookListingDetail = {
        title: 'Basic Item',
        price: '$25',
      };

      const result = convertToRawListing(listing, 0);

      expect(result.description).toBeNull();
      expect(result.condition).toBeNull();
      expect(result.location).toBeNull();
      expect(result.sellerName).toBeNull();
      expect(result.imageUrls).toEqual([]);
      expect(result.category).toBeNull();
      expect(result.postedAt).toBeNull();
    });

    it('parses various price formats', () => {
      expect(convertToRawListing({ title: 'A', price: '$1,299.99' }, 0).askingPrice).toBe(1299.99);
      expect(convertToRawListing({ title: 'B', price: 'Free' }, 0).askingPrice).toBe(0);
      expect(convertToRawListing({ title: 'C', price: '$0' }, 0).askingPrice).toBe(0);
      expect(convertToRawListing({ title: 'D', price: '50' }, 0).askingPrice).toBe(50);
      expect(convertToRawListing({ title: 'E', price: '$25.00 each' }, 0).askingPrice).toBe(25);
    });

    it('generates unique external IDs for different listings', () => {
      const id1 = convertToRawListing({ title: 'Item A', price: '$10' }, 0).externalId;
      const id2 = convertToRawListing({ title: 'Item B', price: '$20' }, 1).externalId;
      expect(id1).not.toBe(id2);
    });

    it('generates consistent IDs for same listing', () => {
      const listing: FacebookListingDetail = { title: 'Same Item', price: '$100' };
      const id1 = convertToRawListing(listing, 0).externalId;
      const id2 = convertToRawListing(listing, 0).externalId;
      expect(id1).toBe(id2);
    });

    it('parses valid postedDate into Date object', () => {
      const listing: FacebookListingDetail = {
        title: 'Item',
        price: '$10',
        postedDate: '2026-02-10T12:00:00Z',
      };
      const result = convertToRawListing(listing, 0);
      expect(result.postedAt).toBeInstanceOf(Date);
    });
  });

  describe('FACEBOOK_CATEGORIES', () => {
    it('maps known categories', () => {
      expect(FACEBOOK_CATEGORIES['electronics']).toBe('electronics');
      expect(FACEBOOK_CATEGORIES['vehicles']).toBe('vehicles');
      expect(FACEBOOK_CATEGORIES['video games']).toBe('videogames');
      expect(FACEBOOK_CATEGORIES['free']).toBe('free');
    });

    it('has reasonable number of categories', () => {
      expect(Object.keys(FACEBOOK_CATEGORIES).length).toBeGreaterThan(5);
    });
  });

  describe('FacebookListingPreviewSchema', () => {
    it('validates correct preview data', () => {
      const data = {
        listings: [
          { title: 'Test', price: '$50', location: 'FL' },
          { title: 'Test 2', price: '$100' },
        ],
      };
      const result = FacebookListingPreviewSchema.parse(data);
      expect(result.listings).toHaveLength(2);
    });

    it('rejects missing required fields', () => {
      expect(() =>
        FacebookListingPreviewSchema.parse({ listings: [{ title: 'No price' }] })
      ).toThrow();
    });

    it('allows optional fields to be omitted', () => {
      const data = { listings: [{ title: 'Minimal', price: '$10' }] };
      const result = FacebookListingPreviewSchema.parse(data);
      expect(result.listings[0].location).toBeUndefined();
    });
  });

  describe('FacebookListingDetailSchema', () => {
    it('validates full detail data', () => {
      const data = {
        title: 'iPhone',
        price: '$500',
        description: 'Great phone',
        condition: 'Good',
        location: 'NYC',
        sellerName: 'Jane',
        postedDate: '2026-01-01',
        images: ['img1.jpg'],
        category: 'electronics',
      };
      const result = FacebookListingDetailSchema.parse(data);
      expect(result.title).toBe('iPhone');
    });

    it('validates minimal detail data', () => {
      const result = FacebookListingDetailSchema.parse({ title: 'Item', price: '$10' });
      expect(result.description).toBeUndefined();
    });
  });
});

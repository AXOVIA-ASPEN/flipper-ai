import { test, expect } from '@playwright/test';

/**
 * E2E: Data Export Flow
 *
 * BDD Scenarios for exporting listings and opportunities data
 * as CSV and JSON files. Covers export triggers, file format
 * validation, filtering exports, and empty-state handling.
 */

test.describe('Data Export', () => {
  test.describe('Given a user with listings wants to export data', () => {
    test('When they request a CSV export of all listings, Then they receive a valid CSV file', async ({
      request,
    }) => {
      const response = await request.get('/api/listings/export', {
        params: { format: 'csv', userId: 'test-user-1' },
      });

      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'] ?? '';
      expect(contentType).toContain('text/csv');

      const body = await response.text();
      const lines = body.trim().split('\n');
      // Should have a header row at minimum
      expect(lines.length).toBeGreaterThanOrEqual(1);

      // Validate CSV header contains expected columns
      const header = lines[0].toLowerCase();
      expect(header).toContain('title');
      expect(header).toContain('price');
      expect(header).toContain('marketplace');
    });

    test('When they request a JSON export of all listings, Then they receive a valid JSON array', async ({
      request,
    }) => {
      const response = await request.get('/api/listings/export', {
        params: { format: 'json', userId: 'test-user-1' },
      });

      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'] ?? '';
      expect(contentType).toContain('application/json');

      const body = await response.json();
      expect(Array.isArray(body.listings ?? body)).toBeTruthy();
    });

    test('When they export with a marketplace filter, Then only matching listings are included', async ({
      request,
    }) => {
      const response = await request.get('/api/listings/export', {
        params: { format: 'json', userId: 'test-user-1', marketplace: 'ebay' },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      const listings = body.listings ?? body;

      if (Array.isArray(listings) && listings.length > 0) {
        for (const listing of listings) {
          expect(listing.marketplace?.toLowerCase()).toBe('ebay');
        }
      }
    });

    test('When they export with a date range filter, Then only listings within that range are included', async ({
      request,
    }) => {
      const response = await request.get('/api/listings/export', {
        params: {
          format: 'json',
          userId: 'test-user-1',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      const listings = body.listings ?? body;

      if (Array.isArray(listings) && listings.length > 0) {
        for (const listing of listings) {
          const created = new Date(listing.createdAt ?? listing.dateAdded);
          expect(created.getTime()).toBeGreaterThanOrEqual(new Date('2026-01-01').getTime());
          expect(created.getTime()).toBeLessThanOrEqual(new Date('2026-02-01').getTime());
        }
      }
    });
  });

  test.describe('Given a user wants to export opportunities data', () => {
    test('When they request a CSV export of opportunities, Then they receive a valid CSV file', async ({
      request,
    }) => {
      const response = await request.get('/api/opportunities/export', {
        params: { format: 'csv', userId: 'test-user-1' },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.text();
      const lines = body.trim().split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(1);

      const header = lines[0].toLowerCase();
      expect(header).toContain('title');
      expect(header).toContain('profit');
    });

    test('When they request a JSON export of opportunities, Then they receive valid JSON data', async ({
      request,
    }) => {
      const response = await request.get('/api/opportunities/export', {
        params: { format: 'json', userId: 'test-user-1' },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      const opportunities = body.opportunities ?? body;
      expect(Array.isArray(opportunities)).toBeTruthy();
    });
  });

  test.describe('Given edge cases in data export', () => {
    test('When a user with no listings exports, Then they receive an empty result', async ({
      request,
    }) => {
      const response = await request.get('/api/listings/export', {
        params: { format: 'json', userId: 'nonexistent-user-999' },
      });

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      const listings = body.listings ?? body;
      expect(Array.isArray(listings)).toBeTruthy();
      expect(listings.length).toBe(0);
    });

    test('When an invalid format is requested, Then the API returns an error', async ({
      request,
    }) => {
      const response = await request.get('/api/listings/export', {
        params: { format: 'xml', userId: 'test-user-1' },
      });

      // Should reject unsupported formats
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('When export is requested without userId, Then the API returns 400', async ({
      request,
    }) => {
      const response = await request.get('/api/listings/export', {
        params: { format: 'csv' },
      });

      expect(response.status()).toBe(400);
    });
  });
});

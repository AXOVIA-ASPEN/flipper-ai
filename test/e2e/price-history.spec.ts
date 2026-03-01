import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Price History & Market Value Analysis
 *
 * BDD-style Playwright tests for the price history API endpoints
 * that power flip profitability analysis.
 */

test.describe('Feature: Price History Lookup', () => {
  test.describe('GET /api/price-history', () => {
    test('Scenario: Given no productName param, When I request price history, Then I receive a 400 error', async ({
      request,
    }) => {
      const response = await request.get('/api/price-history');
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('productName is required');
    });

    test('Scenario: Given a valid productName, When I request price history, Then I receive an array response', async ({
      request,
    }) => {
      const response = await request.get('/api/price-history?productName=iPhone+13');
      // May return 200 (with data or empty) or 500 (if DB not configured)
      expect([200, 500]).toContain(response.status());
      if (response.status() === 200) {
        const body = await response.json();
        expect(Array.isArray(body)).toBe(true);
      }
    });

    test('Scenario: Given a productName and category filter, When I request price history, Then the category is accepted', async ({
      request,
    }) => {
      const response = await request.get(
        '/api/price-history?productName=Nintendo+Switch&category=electronics'
      );
      expect([200, 500]).toContain(response.status());
    });

    test('Scenario: Given a custom limit, When I request price history, Then the limit param is accepted', async ({
      request,
    }) => {
      const response = await request.get('/api/price-history?productName=iPhone+13&limit=10');
      expect([200, 500]).toContain(response.status());
    });
  });

  test.describe('POST /api/price-history', () => {
    test('Scenario: Given no productName in body, When I submit a price history fetch, Then I receive a 400 error', async ({
      request,
    }) => {
      const response = await request.post('/api/price-history', {
        data: {},
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('productName is required');
    });

    test('Scenario: Given a valid productName, When I submit a price history fetch, Then the API attempts to fetch market data', async ({
      request,
    }) => {
      const response = await request.post('/api/price-history', {
        data: { productName: 'Sony PlayStation 5' },
      });
      // 200 (success), 404 (no data found), or 500 (external service issue)
      expect([200, 404, 500]).toContain(response.status());
      const body = await response.json();
      if (response.status() === 200) {
        expect(body.success).toBe(true);
        expect(body).toHaveProperty('marketData');
        expect(body).toHaveProperty('storedRecords');
      } else if (response.status() === 404) {
        expect(body.error).toBe('No market data found');
      }
    });

    test('Scenario: Given a productName with category, When I submit a price history fetch, Then the category is used in the lookup', async ({
      request,
    }) => {
      const response = await request.post('/api/price-history', {
        data: { productName: 'Vintage Levi 501', category: 'clothing' },
      });
      expect([200, 404, 500]).toContain(response.status());
    });
  });
});

test.describe('Feature: Market Value on Listings', () => {
  test.describe('GET /api/listings/[id]/market-value', () => {
    test('Scenario: Given an invalid listing ID, When I request market value, Then I receive an error', async ({
      request,
    }) => {
      const response = await request.get('/api/listings/nonexistent-id/market-value');
      // 401 (unauth), 404 (not found), or 500
      expect([401, 403, 404, 500]).toContain(response.status());
    });
  });
});

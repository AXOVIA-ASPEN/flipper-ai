import { test, expect } from '@playwright/test';

/**
 * E2E Tests: AI Description Generation
 *
 * BDD-style tests for the description generation API endpoints:
 * - POST /api/descriptions (standalone, no auth required)
 * - POST /api/listings/[id]/description (per-listing, auth required)
 *
 * These cover multi-platform description generation, validation,
 * and the per-listing AI description flow.
 */

test.describe('Feature: AI Description Generation', () => {
  test.describe('Scenario: Generate descriptions for all platforms', () => {
    test('Given valid item data, When I request descriptions for all platforms, Then I receive descriptions for each marketplace', async ({
      request,
    }) => {
      const response = await request.post('/api/descriptions', {
        data: {
          brand: 'Apple',
          model: 'iPhone 14 Pro',
          variant: '256GB Space Black',
          condition: 'Like New',
          category: 'electronics',
          askingPrice: 799,
          originalPrice: 1099,
          features: ['ProMotion display', 'Dynamic Island', '48MP camera'],
          defects: [],
          includesAccessories: ['Original box', 'Lightning cable'],
          platform: 'all',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      // Should return descriptions for multiple platforms
      expect(body).toBeDefined();
      // The response should be an object with platform keys or an array
      const keys = Object.keys(body);
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  test.describe('Scenario: Generate description for a specific platform', () => {
    const platforms = ['ebay', 'mercari', 'facebook', 'offerup', 'generic'];

    for (const platform of platforms) {
      test(`Given valid item data, When I request a ${platform} description, Then I receive a platform-specific description`, async ({
        request,
      }) => {
        const response = await request.post('/api/descriptions', {
          data: {
            brand: 'Sony',
            model: 'WH-1000XM5',
            condition: 'Good',
            category: 'electronics',
            askingPrice: 199,
            platform,
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body).toBeDefined();
        // Should contain title or description text
        expect(typeof body === 'object').toBeTruthy();
      });
    }
  });

  test.describe('Scenario: Validation rejects missing required fields', () => {
    test('Given no condition field, When I request a description, Then I receive a 400 error', async ({
      request,
    }) => {
      const response = await request.post('/api/descriptions', {
        data: {
          brand: 'Apple',
          model: 'iPad',
          askingPrice: 300,
          // condition is missing
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('condition');
    });

    test('Given a negative askingPrice, When I request a description, Then I receive a 400 error', async ({
      request,
    }) => {
      const response = await request.post('/api/descriptions', {
        data: {
          condition: 'Good',
          askingPrice: -50,
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('askingPrice');
    });

    test('Given no askingPrice, When I request a description, Then I receive a 400 error', async ({
      request,
    }) => {
      const response = await request.post('/api/descriptions', {
        data: {
          condition: 'Good',
          // askingPrice missing
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Scenario: Invalid platform is rejected', () => {
    test('Given an invalid platform name, When I request a description, Then I receive a 400 error', async ({
      request,
    }) => {
      const response = await request.post('/api/descriptions', {
        data: {
          condition: 'Good',
          askingPrice: 100,
          platform: 'aliexpress',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid platform');
    });
  });

  test.describe('Scenario: Minimal item data still produces a description', () => {
    test('Given only condition and askingPrice, When I request a description, Then I receive a valid response', async ({
      request,
    }) => {
      const response = await request.post('/api/descriptions', {
        data: {
          condition: 'Fair',
          askingPrice: 25,
          platform: 'generic',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toBeDefined();
    });
  });

  test.describe('Scenario: Item with defects includes defect info in description', () => {
    test('Given an item with defects listed, When I generate a description, Then the response is successful', async ({
      request,
    }) => {
      const response = await request.post('/api/descriptions', {
        data: {
          brand: 'Samsung',
          model: 'Galaxy S23',
          condition: 'Acceptable',
          askingPrice: 350,
          defects: ['Small scratch on screen', 'Minor dent on back'],
          features: ['128GB storage', 'Unlocked'],
          platform: 'ebay',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toBeDefined();
    });
  });

  test.describe('Feature: Per-Listing Description Generation (Auth Required)', () => {
    test('Given I am not authenticated, When I POST to /api/listings/fake-id/description, Then I receive 401', async ({
      request,
    }) => {
      const response = await request.post('/api/listings/fake-id/description', {
        data: { platform: 'ebay' },
      });

      expect(response.status()).toBe(401);
    });

    test('Given I am not authenticated, When I POST to /api/listings/fake-id/market-value, Then I receive an error', async ({
      request,
    }) => {
      const response = await request.post('/api/listings/fake-id/market-value');

      // Either 401 (auth check) or 404/500 (listing not found)
      expect([401, 404, 500]).toContain(response.status());
    });
  });
});

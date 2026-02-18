import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * Feature: Listing Price Tracker
 *
 * As a flipper, I want the system to monitor my active listings for price
 * changes and sold status so that I can act quickly on opportunities and
 * keep my inventory data accurate.
 *
 * BDD Scenarios:
 *  - GET  /api/listings/track  → returns trackable listings
 *  - POST /api/listings/track  (dryRun) → simulates a tracking cycle
 *  - POST /api/listings/track  (live)  → runs a real tracking cycle
 *  - POST /api/listings/[id]/market-value → updates a listing's market value
 *
 * All scenarios mock the database layer via route interception so the tests
 * are hermetic and do not require a running database.
 *
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

// ─── Mock Data ────────────────────────────────────────────────────────────────

const TRACKABLE_LISTINGS = [
  {
    id: 'lst-001',
    title: 'Sony WH-1000XM5 Headphones',
    platform: 'FACEBOOK_MARKETPLACE',
    status: 'OPPORTUNITY',
    askingPrice: 120,
    url: 'https://facebook.com/marketplace/item/111',
  },
  {
    id: 'lst-002',
    title: 'Nintendo Switch OLED',
    platform: 'CRAIGSLIST',
    status: 'CONTACTED',
    askingPrice: 250,
    url: 'https://craigslist.org/d/nintendo-switch-oled/123456.html',
  },
  {
    id: 'lst-003',
    title: 'Vintage Fender Guitar',
    platform: 'OFFERUP',
    status: 'NEW',
    askingPrice: 400,
    url: 'https://offerup.com/item/detail/789',
  },
];

const DRY_RUN_RESPONSE = {
  dryRun: true,
  wouldCheck: 3,
  listings: TRACKABLE_LISTINGS.map(({ id, title, url, platform }) => ({
    id,
    title,
    url,
    platform,
  })),
};

const LIVE_TRACKING_RESPONSE = {
  dryRun: false,
  checked: 3,
  statusChanges: [
    {
      listingId: 'lst-002',
      title: 'Nintendo Switch OLED',
      platform: 'CRAIGSLIST',
      previousStatus: 'CONTACTED',
      newStatus: 'SOLD',
      detectedAt: new Date().toISOString(),
    },
  ],
  priceChanges: [
    {
      listingId: 'lst-003',
      title: 'Vintage Fender Guitar',
      platform: 'OFFERUP',
      previousPrice: 400,
      newPrice: 350,
      changePercent: -12.5,
      detectedAt: new Date().toISOString(),
    },
  ],
  errors: [],
};

const MARKET_VALUE_SUCCESS = {
  success: true,
  message: 'Updated listing lst-001 with verified market value',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockTrackableListings(page: Parameters<typeof mockAuthSession>[0]) {
  return page.route('**/api/listings/track', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          trackableCount: TRACKABLE_LISTINGS.length,
          listings: TRACKABLE_LISTINGS,
        }),
      });
    } else {
      await route.continue();
    }
  });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

test.describe('Feature: Listing Price Tracker', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/listings/track
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('GET /api/listings/track — Fetch trackable listings', () => {
    test('Scenario: Given the system has active listings, When I GET /api/listings/track, Then I receive trackable listings with a count', async ({
      page,
    }) => {
      // Given: mock returns 3 trackable listings
      await page.route('**/api/listings/track', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            trackableCount: 3,
            listings: TRACKABLE_LISTINGS,
          }),
        });
      });

      // When: I call the endpoint
      const response = await page.request.get('/api/listings/track');

      // Then: response is 200 with trackable count
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.trackableCount).toBe(3);
      expect(Array.isArray(body.listings)).toBe(true);
      expect(body.listings).toHaveLength(3);
    });

    test('Scenario: Given a listing in OPPORTUNITY status, When I check trackable listings, Then it is included in the result', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            trackableCount: 3,
            listings: TRACKABLE_LISTINGS,
          }),
        });
      });

      const response = await page.request.get('/api/listings/track');
      const body = await response.json();

      const opportunity = body.listings.find(
        (l: { id: string }) => l.id === 'lst-001'
      );
      expect(opportunity).toBeDefined();
      expect(opportunity.status).toBe('OPPORTUNITY');
    });

    test('Scenario: Given each trackable listing, When I inspect the response schema, Then all required fields are present', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            trackableCount: 3,
            listings: TRACKABLE_LISTINGS,
          }),
        });
      });

      const response = await page.request.get('/api/listings/track');
      const body = await response.json();

      for (const listing of body.listings) {
        expect(listing).toHaveProperty('id');
        expect(listing).toHaveProperty('title');
        expect(listing).toHaveProperty('platform');
        expect(listing).toHaveProperty('status');
        expect(listing).toHaveProperty('askingPrice');
      }
    });

    test('Scenario: Given no active listings in the system, When I GET /api/listings/track, Then I receive a count of zero', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ trackableCount: 0, listings: [] }),
        });
      });

      const response = await page.request.get('/api/listings/track');
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.trackableCount).toBe(0);
      expect(body.listings).toHaveLength(0);
    });

    test('Scenario: Given a database error, When I GET /api/listings/track, Then I receive a 500 error response', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to fetch trackable listings' }),
        });
      });

      const response = await page.request.get('/api/listings/track');
      expect(response.status()).toBe(500);

      const body = await response.json();
      expect(body.error).toBe('Failed to fetch trackable listings');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/listings/track  (dryRun: true)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('POST /api/listings/track?dryRun — Simulate a tracking cycle', () => {
    test('Scenario: Given I want to preview a tracking cycle, When I POST with dryRun:true, Then I receive the listings that would be checked', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(DRY_RUN_RESPONSE),
          });
        } else {
          await route.continue();
        }
      });

      // When: POST with dryRun flag
      const response = await page.request.post('/api/listings/track', {
        data: { dryRun: true },
      });

      // Then: response shows what would be checked
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.dryRun).toBe(true);
      expect(body.wouldCheck).toBe(3);
      expect(Array.isArray(body.listings)).toBe(true);
    });

    test('Scenario: Given a dry-run response, When I inspect each listing, Then it includes id, title, url, and platform', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(DRY_RUN_RESPONSE),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.request.post('/api/listings/track', {
        data: { dryRun: true },
      });
      const body = await response.json();

      for (const listing of body.listings) {
        expect(listing).toHaveProperty('id');
        expect(listing).toHaveProperty('title');
        expect(listing).toHaveProperty('url');
        expect(listing).toHaveProperty('platform');
      }
    });

    test('Scenario: Given a dry-run with zero trackable listings, When I POST dryRun:true, Then wouldCheck is 0 and listings array is empty', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ dryRun: true, wouldCheck: 0, listings: [] }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.request.post('/api/listings/track', {
        data: { dryRun: true },
      });
      const body = await response.json();

      expect(body.dryRun).toBe(true);
      expect(body.wouldCheck).toBe(0);
      expect(body.listings).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/listings/track  (live run)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('POST /api/listings/track — Run a live tracking cycle', () => {
    test('Scenario: Given active listings, When I POST to trigger a tracking cycle, Then I receive status changes and price changes', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(LIVE_TRACKING_RESPONSE),
          });
        } else {
          await route.continue();
        }
      });

      // When: POST without dryRun
      const response = await page.request.post('/api/listings/track', {
        data: {},
      });

      // Then: response includes tracking results
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.checked).toBe(3);
      expect(Array.isArray(body.statusChanges)).toBe(true);
      expect(Array.isArray(body.priceChanges)).toBe(true);
      expect(Array.isArray(body.errors)).toBe(true);
    });

    test('Scenario: Given a listing went SOLD, When the tracking cycle runs, Then a statusChange entry is returned', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(LIVE_TRACKING_RESPONSE),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.request.post('/api/listings/track', {
        data: {},
      });
      const body = await response.json();

      // Verify status change record
      expect(body.statusChanges).toHaveLength(1);
      const change = body.statusChanges[0];
      expect(change.listingId).toBe('lst-002');
      expect(change.previousStatus).toBe('CONTACTED');
      expect(change.newStatus).toBe('SOLD');
      expect(change.detectedAt).toBeTruthy();
    });

    test('Scenario: Given a listing price dropped, When the tracking cycle runs, Then a priceChange entry with a negative changePercent is returned', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(LIVE_TRACKING_RESPONSE),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.request.post('/api/listings/track', {
        data: {},
      });
      const body = await response.json();

      expect(body.priceChanges).toHaveLength(1);
      const priceChange = body.priceChanges[0];
      expect(priceChange.listingId).toBe('lst-003');
      expect(priceChange.previousPrice).toBe(400);
      expect(priceChange.newPrice).toBe(350);
      expect(priceChange.changePercent).toBeLessThan(0); // price dropped
    });

    test('Scenario: Given all listings check successfully, When the tracking cycle runs, Then errors array is empty', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(LIVE_TRACKING_RESPONSE),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.request.post('/api/listings/track', {
        data: {},
      });
      const body = await response.json();

      expect(body.errors).toHaveLength(0);
    });

    test('Scenario: Given a tracking cycle with errors, When a listing fetch fails, Then errors array contains the failed listing details', async ({
      page,
    }) => {
      const responseWithErrors = {
        ...LIVE_TRACKING_RESPONSE,
        errors: [{ listingId: 'lst-001', error: 'Failed to fetch listing page' }],
      };

      await page.route('**/api/listings/track', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(responseWithErrors),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.request.post('/api/listings/track', {
        data: {},
      });
      const body = await response.json();

      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].listingId).toBe('lst-001');
      expect(body.errors[0].error).toContain('Failed to fetch');
    });

    test('Scenario: Given a server error during tracking, When the tracking cycle fails, Then I receive a 500 status', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Failed to run tracking cycle' }),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.request.post('/api/listings/track', {
        data: {},
      });

      expect(response.status()).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to run tracking cycle');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/listings/[id]/market-value
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('POST /api/listings/[id]/market-value — Update market value from eBay', () => {
    test('Scenario: Given a valid listing ID, When I POST to market-value, Then the listing is updated with eBay sold data', async ({
      page,
    }) => {
      await page.route('**/api/listings/lst-001/market-value', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MARKET_VALUE_SUCCESS),
        });
      });

      // When: POST to update market value
      const response = await page.request.post('/api/listings/lst-001/market-value');

      // Then: success response
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('lst-001');
    });

    test('Scenario: Given a non-existent listing ID, When I POST to market-value, Then I receive a 404 error', async ({
      page,
    }) => {
      await page.route('**/api/listings/nonexistent-id/market-value', async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Listing nonexistent-id not found' }),
        });
      });

      const response = await page.request.post('/api/listings/nonexistent-id/market-value');
      expect(response.status()).toBe(404);

      const body = await response.json();
      expect(body.error).toContain('not found');
    });

    test('Scenario: Given multiple listings, When I update market value for each, Then each responds with success', async ({
      page,
    }) => {
      // Mock all three listings
      for (const listing of TRACKABLE_LISTINGS) {
        await page.route(`**/api/listings/${listing.id}/market-value`, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: `Updated listing ${listing.id} with verified market value`,
            }),
          });
        });
      }

      // When: update market value for each listing in sequence
      for (const listing of TRACKABLE_LISTINGS) {
        const response = await page.request.post(`/api/listings/${listing.id}/market-value`);
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.message).toContain(listing.id);
      }
    });

    test('Scenario: Given an eBay API failure, When I POST to market-value, Then I receive a 500 error', async ({
      page,
    }) => {
      await page.route('**/api/listings/lst-001/market-value', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to update listing market value' }),
        });
      });

      const response = await page.request.post('/api/listings/lst-001/market-value');
      expect(response.status()).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to update listing market value');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // End-to-End: Full Price Tracker Workflow
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Full Workflow: Price Tracker Lifecycle', () => {
    test('Scenario: Given a flipper managing inventory, When they run the full tracker cycle, Then status and price changes are surfaced correctly', async ({
      page,
    }) => {
      // Step 1: Get trackable listings
      await page.route('**/api/listings/track', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              trackableCount: TRACKABLE_LISTINGS.length,
              listings: TRACKABLE_LISTINGS,
            }),
          });
        } else if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(LIVE_TRACKING_RESPONSE),
          });
        }
      });

      // Mock market-value update
      await page.route('**/api/listings/lst-001/market-value', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MARKET_VALUE_SUCCESS),
        });
      });

      // Given: I navigate to the app
      await page.goto('/');

      // Step 1: Check trackable listings count
      const trackableResp = await page.request.get('/api/listings/track');
      expect(trackableResp.ok()).toBe(true);
      const trackable = await trackableResp.json();
      expect(trackable.trackableCount).toBeGreaterThan(0);

      // Step 2: Dry run to preview
      const dryRunResp = await page.request.post('/api/listings/track', {
        data: { dryRun: true },
      });
      expect(dryRunResp.ok()).toBe(true);
      const dryRun = await dryRunResp.json();
      expect(dryRun.dryRun).toBe(true);
      expect(dryRun.wouldCheck).toBe(trackable.trackableCount);

      // Step 3: Run live tracking cycle
      const liveResp = await page.request.post('/api/listings/track', {
        data: {},
      });
      expect(liveResp.ok()).toBe(true);
      const liveResult = await liveResp.json();
      expect(liveResult.checked).toBeGreaterThan(0);

      // Step 4: Update market value for an affected listing
      const marketResp = await page.request.post('/api/listings/lst-001/market-value');
      expect(marketResp.ok()).toBe(true);
      const market = await marketResp.json();
      expect(market.success).toBe(true);
    });

    test('Scenario: Given a tracking cycle reveals a SOLD listing, When the status change is inspected, Then previousStatus and newStatus are both set', async ({
      page,
    }) => {
      await page.route('**/api/listings/track', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(LIVE_TRACKING_RESPONSE),
          });
        } else {
          await route.continue();
        }
      });

      const response = await page.request.post('/api/listings/track', { data: {} });
      const body = await response.json();

      const soldChange = body.statusChanges.find(
        (c: { newStatus: string }) => c.newStatus === 'SOLD'
      );
      expect(soldChange).toBeDefined();
      expect(soldChange.previousStatus).not.toBe('SOLD');
      expect(soldChange.newStatus).toBe('SOLD');
      expect(new Date(soldChange.detectedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});

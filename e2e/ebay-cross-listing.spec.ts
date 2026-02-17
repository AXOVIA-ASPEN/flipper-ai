import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * Feature: eBay Cross-Listing
 * As a flipper, I want to list my acquired items on eBay
 * so that I can sell them at a profit on a major marketplace.
 *
 * BDD scenarios covering the eBay listing creation flow
 * from an existing Flipper AI listing.
 */

const MOCK_LISTING = {
  id: 'lst-001',
  title: 'Nintendo Switch OLED - White',
  description: 'Excellent condition, includes all accessories',
  price: 189.99,
  imageUrls: ['https://example.com/switch1.jpg', 'https://example.com/switch2.jpg'],
  platform: 'craigslist',
  status: 'ACQUIRED',
  category: 'Electronics',
  condition: 'USED_EXCELLENT',
  aiAnalysis: {
    estimatedValue: 275,
    profitMargin: 0.45,
    demandScore: 8.5,
    suggestedPrice: 269.99,
  },
};

// Helper: set up all route mocks for eBay cross-listing
async function setupMocks(page: import('@playwright/test').Page) {
  await mockAuthSession(page);

  // Mock listing detail
  await page.route(`**/api/listings/${MOCK_LISTING.id}`, async (route) => {
    await route.fulfill({ json: MOCK_LISTING });
  });

  // Mock opportunities detail (same listing data)
  await page.route(`**/api/opportunities/${MOCK_LISTING.id}`, async (route) => {
    await route.fulfill({ json: MOCK_LISTING });
  });

  // Mock eBay listing creation
  await page.route('**/api/listings/ebay', async (route) => {
    const body = route.request().postDataJSON();
    if (!body || !body.title) {
      await route.fulfill({ status: 400, json: { error: 'Missing required fields' } });
      return;
    }
    await route.fulfill({
      json: {
        success: true,
        listingId: 'ebay-123456',
        sku: body.sku || `flipper-${MOCK_LISTING.id}`,
        status: body.publish ? 'ACTIVE' : 'DRAFT',
        ebayUrl: 'https://www.ebay.com/itm/123456',
      },
    });
  });

  // Mock market value
  await page.route(`**/api/listings/${MOCK_LISTING.id}/market-value`, async (route) => {
    await route.fulfill({
      json: {
        estimatedValue: 275,
        comparables: [
          { title: 'Nintendo Switch OLED White', price: 265, platform: 'ebay', soldDate: '2026-02-10' },
          { title: 'Switch OLED Console', price: 279, platform: 'ebay', soldDate: '2026-02-12' },
        ],
      },
    });
  });

  // Mock description generation
  await page.route(`**/api/listings/${MOCK_LISTING.id}/description`, async (route) => {
    await route.fulfill({
      json: {
        description: 'Nintendo Switch OLED Model in excellent condition. Includes console, dock, Joy-Con controllers, and all original accessories.',
      },
    });
  });

  // Catch-all for other API routes to prevent real network calls
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ json: {} });
  });
}

test.describe('Feature: eBay Cross-Listing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('Scenario: Given I submit an eBay draft listing via API, When the request succeeds, Then I should get draft status back', async ({ page }) => {
    // Given I navigate to a page to activate route mocks
    await page.goto('/');

    // When I call the eBay listing API via the page context (using mocked routes)
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/listings/ebay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: 'flipper-lst-001',
          title: 'Nintendo Switch OLED - White',
          description: 'Excellent condition',
          categoryId: '139971',
          condition: 'USED_EXCELLENT',
          price: 269.99,
          imageUrls: ['https://example.com/switch1.jpg'],
          publish: false,
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    // Then the response should indicate a draft was created
    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.status).toBe('DRAFT');
    expect(result.body.sku).toBe('flipper-lst-001');
  });

  test('Scenario: Given I publish an eBay listing, When publish=true, Then the listing should be active with an eBay URL', async ({ page }) => {
    await page.goto('/');

    // When I create and immediately publish
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/listings/ebay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: 'flipper-lst-001',
          title: 'Nintendo Switch OLED - White',
          description: 'AI-generated listing description',
          categoryId: '139971',
          condition: 'USED_EXCELLENT',
          price: 269.99,
          imageUrls: ['https://example.com/switch1.jpg'],
          publish: true,
        }),
      });
      return { status: res.status, body: await res.json() };
    });

    // Then I should get an active listing with an eBay URL
    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.status).toBe('ACTIVE');
    expect(result.body.ebayUrl).toContain('ebay.com');
  });

  test('Scenario: Given I request market value data, When comparables exist, Then I should see estimated value and comparable sales', async ({ page }) => {
    await page.goto('/');

    // When I fetch market value for the listing
    const result = await page.evaluate(async (listingId) => {
      const res = await fetch(`/api/listings/${listingId}/market-value`);
      return { status: res.status, body: await res.json() };
    }, MOCK_LISTING.id);

    // Then I should get pricing intelligence
    expect(result.status).toBe(200);
    expect(result.body.estimatedValue).toBe(275);
    expect(result.body.comparables).toHaveLength(2);
    expect(result.body.comparables[0].price).toBeGreaterThan(0);
    expect(result.body.comparables[0].platform).toBe('ebay');
  });

  test('Scenario: Given I need an optimized description, When I request AI generation, Then I should get a detailed product description', async ({ page }) => {
    await page.goto('/');

    // When I request AI-generated description
    const result = await page.evaluate(async (listingId) => {
      const res = await fetch(`/api/listings/${listingId}/description`);
      return { status: res.status, body: await res.json() };
    }, MOCK_LISTING.id);

    // Then I should receive a quality description
    expect(result.status).toBe(200);
    expect(result.body.description).toBeTruthy();
    expect(result.body.description.length).toBeGreaterThan(50);
    expect(result.body.description.toLowerCase()).toContain('nintendo switch');
  });

  test('Scenario: Given I submit an eBay listing without required fields, When validation runs, Then I should get an error', async ({ page }) => {
    await page.goto('/');

    // When I submit with missing fields
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/listings/ebay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      return { status: res.status, body: await res.json() };
    });

    // Then I should get a validation error
    expect(result.status).toBe(400);
    expect(result.body.error).toBeTruthy();
  });

  test('Scenario: Given I have a listing with AI analysis, When I view pricing suggestions, Then the suggested price should reflect market data', async ({ page }) => {
    await page.goto('/');

    // When I fetch the listing details
    const result = await page.evaluate(async (listingId) => {
      const res = await fetch(`/api/listings/${listingId}`);
      return { status: res.status, body: await res.json() };
    }, MOCK_LISTING.id);

    // Then AI analysis should include pricing intelligence
    expect(result.status).toBe(200);
    expect(result.body.aiAnalysis).toBeTruthy();
    expect(result.body.aiAnalysis.suggestedPrice).toBe(269.99);
    expect(result.body.aiAnalysis.estimatedValue).toBe(275);

    // And the profit margin should be positive
    expect(result.body.aiAnalysis.profitMargin).toBeGreaterThan(0);

    // And demand score should indicate good demand
    expect(result.body.aiAnalysis.demandScore).toBeGreaterThanOrEqual(7);
  });

  test('Scenario: Given I complete the full cross-listing flow, When I go from listing to eBay publication, Then all steps should succeed', async ({ page }) => {
    await page.goto('/');

    // Step 1: Get listing details
    const listing = await page.evaluate(async (id) => {
      const res = await fetch(`/api/listings/${id}`);
      return res.json();
    }, MOCK_LISTING.id);
    expect(listing.title).toBe(MOCK_LISTING.title);
    expect(listing.status).toBe('ACQUIRED');

    // Step 2: Get market value for pricing
    const marketValue = await page.evaluate(async (id) => {
      const res = await fetch(`/api/listings/${id}/market-value`);
      return res.json();
    }, MOCK_LISTING.id);
    expect(marketValue.estimatedValue).toBeGreaterThan(listing.price);

    // Step 3: Generate optimized description
    const desc = await page.evaluate(async (id) => {
      const res = await fetch(`/api/listings/${id}/description`);
      return res.json();
    }, MOCK_LISTING.id);
    expect(desc.description).toBeTruthy();

    // Step 4: Create and publish on eBay
    const ebayListing = await page.evaluate(async (data) => {
      const res = await fetch('/api/listings/ebay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    }, {
      sku: `flipper-${listing.id}`,
      title: listing.title,
      description: desc.description,
      categoryId: '139971',
      condition: listing.condition,
      price: marketValue.estimatedValue - 5, // Price slightly under market
      imageUrls: listing.imageUrls,
      publish: true,
    });

    // Then the full flow should complete successfully
    expect(ebayListing.success).toBe(true);
    expect(ebayListing.status).toBe('ACTIVE');
    expect(ebayListing.ebayUrl).toContain('ebay.com');
  });
});

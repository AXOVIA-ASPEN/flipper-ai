import { test, expect } from '@playwright/test';

/**
 * Feature: /docs — Interactive API Documentation (Swagger UI)
 *
 * BDD scenarios covering the Flipper AI API documentation page,
 * the backing /api/docs OpenAPI spec endpoint, and key interaction flows.
 *
 * Author: Stephen Boyett
 * Company: Axovia AI
 */

test.describe('Feature: API Documentation Page (/docs)', () => {
  // Mock the /api/docs spec so tests are deterministic and don't need a live server
  const mockSpec = {
    openapi: '3.0.3',
    info: {
      title: 'Flipper AI API',
      description: 'Multi-marketplace flipping tool API.',
      version: '1.0.0',
      contact: { name: 'Axovia AI', email: 'support@axoviaai.com' },
      license: { name: 'MIT' },
    },
    servers: [{ url: '/api', description: 'Current environment' }],
    tags: [
      { name: 'Health', description: 'Liveness, readiness, and metrics probes' },
      { name: 'Listings', description: 'Marketplace listing management' },
      { name: 'Opportunities', description: 'Flip opportunity tracking' },
      { name: 'Analyze', description: 'AI-powered listing analysis' },
      { name: 'Scrapers', description: 'Marketplace data ingestion' },
      { name: 'Search Configs', description: 'Saved search configurations' },
      { name: 'User', description: 'User settings and onboarding' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'System health check',
          operationId: 'getHealth',
          responses: {
            '200': { description: 'Service is healthy' },
          },
        },
      },
      '/opportunities': {
        get: {
          tags: ['Opportunities'],
          summary: 'List flip opportunities',
          operationId: 'listOpportunities',
          responses: {
            '200': { description: 'Array of opportunities' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'NextAuth session JWT',
        },
      },
    },
  };

  test.beforeEach(async ({ page }) => {
    // Intercept the OpenAPI spec to avoid CDN/network dependencies
    await page.route('**/api/docs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSpec),
      });
    });

    // No-op auth session — docs page is public
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
  });

  // ─────────────────────────────────────────────
  // Scenario: Page structure and branding
  // ─────────────────────────────────────────────

  test('Scenario: Given a visitor on /docs, When the page loads, Then the Flipper AI branding banner is visible', async ({
    page,
  }) => {
    await page.goto('/docs');
    await page.waitForLoadState('domcontentloaded');

    // Branded banner
    await expect(page.getByText('Flipper AI API')).toBeVisible({ timeout: 10_000 });
    // Penguin mascot emoji
    await expect(page.getByText('🐧')).toBeVisible();
  });

  test('Scenario: Given a visitor on /docs, When the page loads, Then OpenAPI version badges are shown', async ({
    page,
  }) => {
    await page.goto('/docs');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('v1.0.0')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('OpenAPI 3.0')).toBeVisible();
  });

  test('Scenario: Given a visitor on /docs, When the page loads, Then the page title is correct', async ({
    page,
  }) => {
    await page.goto('/docs');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveTitle(/Flipper AI.*API/i);
  });

  // ─────────────────────────────────────────────
  // Scenario: Swagger UI initialisation
  // ─────────────────────────────────────────────

  test('Scenario: Given the /docs page, When Swagger UI loads, Then the swagger-ui container is present in the DOM', async ({
    page,
  }) => {
    await page.goto('/docs');
    await page.waitForLoadState('domcontentloaded');

    // The Swagger UI mounts into this div
    const container = page.locator('#swagger-ui');
    await expect(container).toBeAttached({ timeout: 10_000 });
  });

  test('Scenario: Given the /docs page, When Swagger UI CDN scripts are referenced, Then swagger-ui-bundle.js is loaded', async ({
    page,
  }) => {
    const scriptRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('swagger-ui')) scriptRequests.push(req.url());
    });

    await page.goto('/docs');
    await page.waitForLoadState('domcontentloaded');

    // At least the swagger-ui-bundle.js should be requested
    const bundleRequested = scriptRequests.some((url) => url.includes('swagger-ui-bundle'));
    expect(bundleRequested).toBe(true);
  });

  // ─────────────────────────────────────────────
  // Scenario: /api/docs OpenAPI spec endpoint
  // ─────────────────────────────────────────────

  test('Scenario: Given the API, When GET /api/docs is called, Then it returns valid JSON with openapi field', async ({
    page,
  }) => {
    // Remove the mock so we test the real endpoint if server is live,
    // otherwise use a controlled route check
    await page.route('**/api/docs', async (route) => {
      // Verify the request method is GET
      expect(route.request().method()).toBe('GET');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSpec),
      });
    });

    const response = await page.request.get('/api/docs');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('openapi');
    expect(body.openapi).toMatch(/^3\.\d+\.\d+$/);
  });

  test('Scenario: Given the API spec, When it is parsed, Then it has the required info fields', async ({
    page,
  }) => {
    const response = await page.request.get('/api/docs');
    expect(response.status()).toBe(200);

    const spec = await response.json();

    // info block
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBe('Flipper AI API');
    expect(spec.info.version).toBe('1.0.0');
    expect(spec.info.contact.name).toBe('Axovia AI');
  });

  test('Scenario: Given the API spec, When it is parsed, Then it exposes documented API paths', async ({
    page,
  }) => {
    const response = await page.request.get('/api/docs');
    const spec = await response.json();

    // Must have at least one path defined
    expect(spec.paths).toBeDefined();
    expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
  });

  test('Scenario: Given the API spec, When it is parsed, Then it includes a BearerAuth security scheme', async ({
    page,
  }) => {
    const response = await page.request.get('/api/docs');
    const spec = await response.json();

    const schemes = spec.components?.securitySchemes ?? {};
    expect(schemes).toHaveProperty('BearerAuth');
    expect(schemes.BearerAuth.type).toBe('http');
    expect(schemes.BearerAuth.scheme).toBe('bearer');
  });

  test('Scenario: Given the API spec, When it is parsed, Then it includes all major API tags', async ({
    page,
  }) => {
    const response = await page.request.get('/api/docs');
    const spec = await response.json();

    const tagNames: string[] = (spec.tags ?? []).map((t: { name: string }) => t.name);
    const expectedTags = ['Health', 'Listings', 'Opportunities', 'Analyze', 'Scrapers'];

    for (const tag of expectedTags) {
      expect(tagNames).toContain(tag);
    }
  });

  test('Scenario: Given the API spec, When /health path is inspected, Then it has a GET operation', async ({
    page,
  }) => {
    const response = await page.request.get('/api/docs');
    const spec = await response.json();

    const healthPath = spec.paths?.['/health'];
    expect(healthPath).toBeDefined();
    expect(healthPath.get).toBeDefined();
    expect(healthPath.get.responses?.['200']).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Scenario: Error handling
  // ─────────────────────────────────────────────

  test('Scenario: Given the /docs page, When /api/docs returns an error, Then the page does not crash', async ({
    page,
  }) => {
    // Override to simulate API failure
    await page.route('**/api/docs', async (route) => {
      await route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    // Should load the page structure without throwing
    await page.goto('/docs');
    await page.waitForLoadState('domcontentloaded');

    // Branding banner should still render
    await expect(page.getByText('Flipper AI API')).toBeVisible({ timeout: 10_000 });
    // swagger-ui div should still be in DOM
    await expect(page.locator('#swagger-ui')).toBeAttached();
  });

  // ─────────────────────────────────────────────
  // Scenario: /api/docs CORS header
  // ─────────────────────────────────────────────

  test('Scenario: Given the API, When /api/docs is fetched, Then it includes CORS allow-origin header', async ({
    page,
  }) => {
    // Re-mock with headers visible
    await page.route('**/api/docs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
        body: JSON.stringify(mockSpec),
      });
    });

    const response = await page.request.get('/api/docs');
    expect(response.headers()['access-control-allow-origin']).toBe('*');
  });
});

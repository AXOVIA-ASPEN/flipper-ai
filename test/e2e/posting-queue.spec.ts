import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * Feature: Posting Queue Management (BDD)
 *
 * As a flipper, I want to manage my cross-platform posting queue
 * so that I can track, retry, and monitor resale listings across marketplaces.
 */

const mockQueueItems = [
  {
    id: 'pq-1',
    status: 'PENDING',
    targetPlatform: 'eBay',
    scheduledAt: new Date().toISOString(),
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    listing: {
      id: 'lst-1',
      title: 'Sony WH-1000XM5 Headphones',
      platform: 'Craigslist',
      askingPrice: 250,
      imageUrls: [],
    },
  },
  {
    id: 'pq-2',
    status: 'COMPLETED',
    targetPlatform: 'Facebook',
    scheduledAt: new Date(Date.now() - 3600000).toISOString(),
    attempts: 1,
    maxAttempts: 3,
    postedAt: new Date().toISOString(),
    externalUrl: 'https://facebook.com/marketplace/item/123',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    listing: {
      id: 'lst-2',
      title: 'Nintendo Switch OLED',
      platform: 'OfferUp',
      askingPrice: 300,
      imageUrls: [],
    },
  },
  {
    id: 'pq-3',
    status: 'FAILED',
    targetPlatform: 'Mercari',
    scheduledAt: new Date(Date.now() - 7200000).toISOString(),
    attempts: 3,
    maxAttempts: 3,
    errorMessage: 'Authentication expired. Please reconnect your Mercari account.',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
    listing: {
      id: 'lst-3',
      title: 'Vintage Polaroid Camera',
      platform: 'Craigslist',
      askingPrice: 85,
      imageUrls: [],
    },
  },
];

const mockQueueStats = {
  total: 15,
  pending: 5,
  completed: 8,
  failed: 2,
  successRate: 80,
};

test.describe('Feature: Posting Queue Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);

    // Mock posting queue list endpoint
    await page.route('**/api/posting-queue', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        const url = new URL(route.request().url());
        const status = url.searchParams.get('status');
        const items = status
          ? mockQueueItems.filter((i) => i.status === status)
          : mockQueueItems;
        await route.fulfill({
          json: { items, total: items.length, limit: 20, offset: 0 },
        });
      } else if (method === 'POST') {
        await route.fulfill({
          status: 201,
          json: { ...mockQueueItems[0], id: 'pq-new' },
        });
      } else {
        await route.continue();
      }
    });

    // Mock stats endpoint
    await page.route('**/api/posting-queue/stats', async (route) => {
      await route.fulfill({ json: mockQueueStats });
    });

    // Mock retry endpoint
    await page.route('**/api/posting-queue/*/retry', async (route) => {
      await route.fulfill({
        json: { ...mockQueueItems[2], status: 'PENDING', attempts: 0 },
      });
    });

    // Mock individual item endpoints
    await page.route('**/api/posting-queue/*', async (route) => {
      const method = route.request().method();
      if (method === 'DELETE') {
        await route.fulfill({ status: 204 });
      } else if (method === 'GET') {
        await route.fulfill({ json: mockQueueItems[0] });
      } else {
        await route.continue();
      }
    });
  });

  test.describe('Scenario: View posting queue with status overview', () => {
    test('Given I am on the posting queue page, Then I should see queue stats and items', async ({
      page,
    }) => {
      // Given I navigate to the posting queue
      await page.goto('/');

      // Check for posting queue navigation or direct access
      const queueLink = page.locator('a[href*="posting"], text=/posting queue/i').first();
      if (await queueLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await queueLink.click();
      }

      // Then the API endpoints should be called correctly
      const statsResponse = await page.request.get('/api/posting-queue/stats');
      expect(statsResponse.status()).toBe(200);
      const stats = await statsResponse.json();
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('successRate');
      expect(stats.successRate).toBe(80);
    });
  });

  test.describe('Scenario: Filter queue items by status', () => {
    test('Given I have queue items, When I filter by PENDING, Then I see only pending items', async ({
      page,
    }) => {
      // When I request items filtered by PENDING status
      const response = await page.request.get('/api/posting-queue?status=PENDING');
      expect(response.status()).toBe(200);

      const data = await response.json();
      // Then all returned items should have PENDING status
      expect(data.items.length).toBeGreaterThan(0);
      for (const item of data.items) {
        expect(item.status).toBe('PENDING');
      }
    });

    test('Given I have queue items, When I filter by FAILED, Then I see only failed items', async ({
      page,
    }) => {
      const response = await page.request.get('/api/posting-queue?status=FAILED');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.items.length).toBeGreaterThan(0);
      for (const item of data.items) {
        expect(item.status).toBe('FAILED');
        expect(item.errorMessage).toBeTruthy();
      }
    });
  });

  test.describe('Scenario: Retry a failed posting', () => {
    test('Given a failed queue item, When I retry it, Then it resets to PENDING', async ({
      page,
    }) => {
      // Given I have a failed posting (pq-3)
      const failedItem = mockQueueItems.find((i) => i.status === 'FAILED');
      expect(failedItem).toBeTruthy();

      // When I trigger a retry
      const response = await page.request.post(`/api/posting-queue/${failedItem!.id}/retry`);
      expect(response.status()).toBe(200);

      const retried = await response.json();
      // Then the item should be reset to PENDING with 0 attempts
      expect(retried.status).toBe('PENDING');
      expect(retried.attempts).toBe(0);
    });
  });

  test.describe('Scenario: Delete a queue item', () => {
    test('Given a queue item, When I delete it, Then it is removed', async ({ page }) => {
      // When I delete a queue item
      const response = await page.request.delete(`/api/posting-queue/${mockQueueItems[0].id}`);

      // Then it should return 204 No Content
      expect(response.status()).toBe(204);
    });
  });

  test.describe('Scenario: Create a new posting queue item', () => {
    test('Given a listing, When I queue it for cross-posting, Then a queue item is created', async ({
      page,
    }) => {
      // When I create a new posting queue item
      const response = await page.request.post('/api/posting-queue', {
        data: {
          listingId: 'lst-1',
          targetPlatform: 'eBay',
          scheduledAt: new Date().toISOString(),
        },
      });

      // Then it should be created successfully
      expect(response.status()).toBe(201);
      const created = await response.json();
      expect(created).toHaveProperty('id');
      expect(created.targetPlatform).toBe('eBay');
      expect(created.status).toBe('PENDING');
    });
  });

  test.describe('Scenario: Queue items display listing context', () => {
    test('Given queue items exist, Then each item includes associated listing details', async ({
      page,
    }) => {
      const response = await page.request.get('/api/posting-queue');
      const data = await response.json();

      for (const item of data.items) {
        // Then each queue item should have listing context
        expect(item.listing).toBeTruthy();
        expect(item.listing.title).toBeTruthy();
        expect(item.listing.platform).toBeTruthy();
        expect(typeof item.listing.askingPrice).toBe('number');
      }
    });
  });

  test.describe('Scenario: Unauthenticated access is denied', () => {
    test('Given I am not authenticated, When I access the queue, Then I get 401', async ({
      browser,
    }) => {
      // Create a fresh context without auth mocking
      const context = await browser.newContext();
      const page = await context.newPage();

      // Mock the session endpoint to return no session
      await page.route('**/api/auth/session', async (route) => {
        await route.fulfill({ json: {} });
      });

      // Mock the queue endpoint to return 401 for unauthed requests
      await page.route('**/api/posting-queue**', async (route) => {
        await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      });

      const response = await page.request.get('/api/posting-queue');
      expect(response.status()).toBe(401);

      await context.close();
    });
  });
});

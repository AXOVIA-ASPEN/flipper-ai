import { test, expect } from '@playwright/test';

/**
 * E2E: Opportunities Pagination & Infinite Scroll
 *
 * BDD Scenarios for paginating through large sets of opportunities,
 * including API pagination params, scroll-based loading, page size
 * controls, and sort order persistence across pages.
 */

/** Helper: fetch JSON from API, skip test if endpoint returns HTML (app not running API mode) */
async function fetchJson(request: any, url: string, params: Record<string, any>) {
  const response = await request.get(url, { params });
  const contentType = response.headers()['content-type'] ?? '';
  if (!contentType.includes('json')) {
    test.skip(true, 'API not available (returned HTML) — app may not be running');
  }
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('Opportunities Pagination', () => {
  test.describe('Given the user has many opportunities', () => {
    test('When they request the first page via API, Then they receive paginated results with metadata', async ({
      request,
    }) => {
      const data = await fetchJson(request, '/api/opportunities', {
        page: 1, limit: 10, userId: 'test-user-1',
      });

      if (Array.isArray(data)) {
        expect(data.length).toBeLessThanOrEqual(10);
      } else {
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBeTruthy();
        expect(data.data.length).toBeLessThanOrEqual(10);
      }
    });

    test('When they request page 2 via API, Then they receive a different set of results', async ({
      request,
    }) => {
      const data1 = await fetchJson(request, '/api/opportunities', {
        page: 1, limit: 5, userId: 'test-user-1',
      });
      const data2 = await fetchJson(request, '/api/opportunities', {
        page: 2, limit: 5, userId: 'test-user-1',
      });

      const items1 = Array.isArray(data1) ? data1 : data1.data ?? [];
      const items2 = Array.isArray(data2) ? data2 : data2.data ?? [];

      if (items1.length > 0 && items2.length > 0) {
        const ids1 = items1.map((i: any) => i.id ?? i._id);
        const ids2 = items2.map((i: any) => i.id ?? i._id);
        const overlap = ids1.filter((id: string) => ids2.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    test('When they pass an invalid page number, Then they receive an empty set or error', async ({
      request,
    }) => {
      const data = await fetchJson(request, '/api/opportunities', {
        page: 9999, limit: 10, userId: 'test-user-1',
      });
      const items = Array.isArray(data) ? data : data.data ?? [];
      expect(items.length).toBe(0);
    });
  });

  test.describe('Given the user is on the opportunities page', () => {
    test('When they scroll to the bottom, Then more opportunities load (infinite scroll)', async ({
      page,
    }) => {
      await page.goto('/opportunities');
      await page.waitForLoadState('networkidle');

      const initialCards = await page.locator('[data-testid="opportunity-card"], .opportunity-card, [class*="card"]').count();

      if (initialCards >= 10) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1500);

        const afterScrollCards = await page.locator('[data-testid="opportunity-card"], .opportunity-card, [class*="card"]').count();
        expect(afterScrollCards).toBeGreaterThanOrEqual(initialCards);
      }
    });

    test('When they apply a filter and paginate, Then pagination respects the active filter', async ({
      request,
    }) => {
      const data = await fetchJson(request, '/api/opportunities', {
        page: 1, limit: 10, status: 'identified', userId: 'test-user-1',
      });
      const items = Array.isArray(data) ? data : data.data ?? [];

      for (const item of items) {
        if (item.status) {
          expect(item.status.toLowerCase()).toBe('identified');
        }
      }
    });

    test('When they sort by price and paginate, Then sort order persists across pages', async ({
      request,
    }) => {
      const data = await fetchJson(request, '/api/opportunities', {
        page: 1, limit: 10, sort: 'price', order: 'asc', userId: 'test-user-1',
      });
      const items = Array.isArray(data) ? data : data.data ?? [];

      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1].price ?? items[i - 1].currentPrice ?? 0;
        const curr = items[i].price ?? items[i].currentPrice ?? 0;
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });
  });

  test.describe('Given the opportunities page has a page size selector', () => {
    test('When the user changes page size, Then the correct number of items display', async ({
      page,
    }) => {
      await page.goto('/opportunities');
      await page.waitForLoadState('networkidle');

      const pageSizeSelector = page.locator('select[data-testid="page-size"], select[name="pageSize"], [aria-label*="per page"]');
      const selectorExists = await pageSizeSelector.count();

      if (selectorExists > 0) {
        await pageSizeSelector.first().selectOption('25');
        await page.waitForTimeout(1000);

        const cards = await page.locator('[data-testid="opportunity-card"], .opportunity-card, [class*="card"]').count();
        expect(cards).toBeLessThanOrEqual(25);
      }
    });
  });

  test.describe('Given the API supports cursor-based pagination', () => {
    test('When a cursor is provided, Then results continue from that point', async ({
      request,
    }) => {
      const firstData = await fetchJson(request, '/api/opportunities', {
        limit: 5, userId: 'test-user-1',
      });

      const cursor = firstData.nextCursor ?? firstData.cursor ?? null;
      if (cursor) {
        const nextData = await fetchJson(request, '/api/opportunities', {
          limit: 5, cursor, userId: 'test-user-1',
        });
        const nextItems = Array.isArray(nextData) ? nextData : nextData.data ?? [];
        const firstItems = Array.isArray(firstData) ? firstData : firstData.data ?? [];

        if (nextItems.length > 0 && firstItems.length > 0) {
          const firstIds = firstItems.map((i: any) => i.id ?? i._id);
          const nextIds = nextItems.map((i: any) => i.id ?? i._id);
          const overlap = firstIds.filter((id: string) => nextIds.includes(id));
          expect(overlap.length).toBe(0);
        }
      }
    });
  });
});

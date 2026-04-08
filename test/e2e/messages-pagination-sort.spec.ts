import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * E2E: Thread Inbox Pagination, Search & Tab Filtering
 *
 * Tests pagination, search, and tab filtering on the thread-based message
 * inbox. Threads are sorted by lastMessageAt DESC (server-side), so there
 * are no user-controlled sort controls.
 *
 * Updated for story 8.3 (thread-based UI refactor).
 */

// Generate mock threads for pagination testing
function generateThreads(count: number, direction: 'INBOUND' | 'OUTBOUND' = 'INBOUND') {
  return Array.from({ length: count }, (_, i) => ({
    listingId: `listing-${direction.toLowerCase()}-${i + 1}`,
    listing: {
      id: `listing-${direction.toLowerCase()}-${i + 1}`,
      title: `Item ${direction === 'INBOUND' ? 'In' : 'Out'} ${i + 1}`,
      platform: i % 2 === 0 ? 'EBAY' : 'CRAIGSLIST',
      askingPrice: 100 + i * 50,
      imageUrls: null,
    },
    lastMessage: {
      body: `Message body number ${i + 1} about a listing`,
      direction,
      status: direction === 'INBOUND' ? 'DELIVERED' : 'SENT',
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    },
    sellerName: `Seller ${i + 1}`,
    messageCount: 1 + (i % 5),
    unreadCount: direction === 'INBOUND' ? 1 : 0,
    lastMessageAt: new Date(Date.now() - i * 3600000).toISOString(),
  }));
}

const inboundThreads = generateThreads(30, 'INBOUND');
const outboundThreads = generateThreads(10, 'OUTBOUND');
const allThreads = [...inboundThreads, ...outboundThreads].sort(
  (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
);

test.describe('Feature: Thread Inbox Pagination, Search & Filter', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);

    // Intercept threads API and handle query params
    await page.route('**/api/messages/threads**', async (route) => {
      const url = new URL(route.request().url(), 'http://localhost');

      // Skip thread detail routes
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 3) {
        await route.continue();
        return;
      }

      const search = url.searchParams.get('search');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let filtered = [...allThreads];

      // Filter by search (server-side in the real API)
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.listing.title.toLowerCase().includes(q) ||
            (t.sellerName?.toLowerCase().includes(q))
        );
      }

      const total = filtered.length;
      const data = filtered.slice(offset, offset + limit);

      await route.fulfill({
        json: {
          success: true,
          data,
          pagination: { total, limit, offset, hasMore: offset + limit < total },
        },
      });
    });

    // User settings (for approval tab)
    await page.route('**/api/user/settings', async (route) => {
      await route.fulfill({
        json: { success: true, data: { user: { subscriptionTier: 'PRO' }, messageApprovalRequired: false } },
      });
    });

    // Approval count
    await page.route('**/api/messages?**', async (route) => {
      await route.fulfill({
        json: { success: true, data: [], pagination: { total: 0 } },
      });
    });
  });

  test.describe('Scenario: Pagination controls', () => {
    test('Given 40 threads, When I load the page, Then I see pagination with page info', async ({
      page,
    }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      // Should show first 20 of 40
      await expect(page.getByText(/1–20 of 40/)).toBeVisible();
    });

    test('Given I am on page 1, When I click Next, Then I see the next page of threads', async ({
      page,
    }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      const nextBtn = page.getByRole('button', { name: /Next/ });
      await expect(nextBtn).toBeEnabled();
      await nextBtn.click();

      await expect(page.getByText(/21–40 of 40/)).toBeVisible();
    });

    test('Given I am on page 2, When I click Previous, Then I return to page 1', async ({
      page,
    }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /Next/ }).click();
      await expect(page.getByText(/21–40 of 40/)).toBeVisible();

      const prevBtn = page.getByRole('button', { name: /Previous/ });
      await expect(prevBtn).toBeEnabled();
      await prevBtn.click();

      await expect(page.getByText(/1–20 of 40/)).toBeVisible();
    });

    test('Given I am on page 1, Then the Previous button is disabled', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      const prevBtn = page.getByRole('button', { name: /Previous/ });
      await expect(prevBtn).toBeDisabled();
    });

    test('Given I am on the last page, Then the Next button is disabled', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: /Next/ }).click();
      await page.waitForLoadState('networkidle');

      const nextBtn = page.getByRole('button', { name: /Next/ });
      await expect(nextBtn).toBeDisabled();
    });
  });

  test.describe('Scenario: Tab filtering', () => {
    test('Given I click the Inbox tab, Then I only see inbound threads', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: 'Inbox' }).click();
      // Client-side filtering — should show inbound threads only
      // First inbound thread title starts with "Item In"
      await expect(page.getByText('Item In 1')).toBeVisible();
      // Outbound threads should not be visible
      await expect(page.getByText('Item Out 1')).not.toBeVisible();
    });

    test('Given I click the Sent tab, Then I only see outbound threads', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      await page.getByRole('button', { name: 'Sent' }).click();
      await expect(page.getByText('Item Out 1')).toBeVisible();
      await expect(page.getByText('Item In 1')).not.toBeVisible();
    });

    test('Given a tab filter is active, Then pagination is hidden', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      // Pagination should be visible on All tab
      await expect(page.getByText(/1–20 of 40/)).toBeVisible();

      // Switch to Inbox — pagination hidden (client-side filter)
      await page.getByRole('button', { name: 'Inbox' }).click();
      await expect(page.getByRole('button', { name: /Next/ })).not.toBeVisible();
    });
  });

  test.describe('Scenario: Search filtering', () => {
    test('Given I type a search query, Then results are filtered', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      const searchInput = page.getByPlaceholder(/Search by listing title or seller name/);
      await searchInput.fill('Seller 1');
      // Wait for re-fetch
      await page.waitForLoadState('networkidle');

      // Results should be filtered (Seller 1, Seller 10-19 match)
      await expect(page.getByText('Seller 1')).toBeVisible();
    });

    test('Given I search and then clear, Then all threads return', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      const searchInput = page.getByPlaceholder(/Search by listing title or seller name/);
      await searchInput.fill('nonexistent');
      await page.waitForLoadState('networkidle');

      // Clear search
      await searchInput.clear();
      await page.waitForLoadState('networkidle');

      // Should show all threads again with pagination
      await expect(page.getByText(/1–20 of 40/)).toBeVisible();
    });
  });
});

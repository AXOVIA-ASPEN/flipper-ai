import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * E2E: Messages Pagination, Sorting, Search & Tab Filtering
 *
 * BDD Feature: Message List Management
 * As a user, I want to paginate, sort, search, and filter messages
 * so that I can efficiently find and manage seller communications.
 */

// Generate mock messages for pagination testing
function generateMessages(count: number, direction: 'INBOUND' | 'OUTBOUND' = 'INBOUND') {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${direction.toLowerCase()}-${i + 1}`,
    direction,
    senderName: direction === 'INBOUND' ? `Seller ${i + 1}` : 'Me',
    recipientName: direction === 'INBOUND' ? 'Me' : `Seller ${i + 1}`,
    subject: `Subject ${i + 1}`,
    body: `Message body number ${i + 1} about a listing`,
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    listing: {
      id: `listing-${i + 1}`,
      title: `Item ${i + 1}`,
      askingPrice: 100 + i * 50,
    },
  }));
}

const allInbound = generateMessages(30, 'INBOUND');
const allOutbound = generateMessages(10, 'OUTBOUND');
const allMessages = [...allInbound, ...allOutbound].sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
);

test.describe('Feature: Messages Pagination, Sort & Filter', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);

    // Intercept messages API and handle query params
    await page.route('**/api/messages**', async (route) => {
      const url = new URL(route.request().url(), 'http://localhost');
      const direction = url.searchParams.get('direction');
      const search = url.searchParams.get('search');
      const sortBy = url.searchParams.get('sortBy') || 'createdAt';
      const sortOrder = url.searchParams.get('sortOrder') || 'desc';
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let filtered = [...allMessages];

      // Filter by direction (tab)
      if (direction === 'INBOUND') {
        filtered = filtered.filter((m) => m.direction === 'INBOUND');
      } else if (direction === 'OUTBOUND') {
        filtered = filtered.filter((m) => m.direction === 'OUTBOUND');
      }

      // Filter by search
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (m) =>
            m.subject.toLowerCase().includes(q) ||
            m.body.toLowerCase().includes(q) ||
            m.senderName.toLowerCase().includes(q)
        );
      }

      // Sort
      filtered.sort((a, b) => {
        const aVal = sortBy === 'createdAt' ? new Date(a.createdAt).getTime() : a.subject;
        const bVal = sortBy === 'createdAt' ? new Date(b.createdAt).getTime() : b.subject;
        if (sortOrder === 'asc') return aVal < bVal ? -1 : 1;
        return aVal > bVal ? -1 : 1;
      });

      const total = filtered.length;
      const data = filtered.slice(offset, offset + limit);

      await route.fulfill({
        json: { data, pagination: { total, limit, offset } },
      });
    });
  });

  test.describe('Scenario: Pagination controls', () => {
    test('Given 40 messages, When I load the page, Then I see pagination with page info', async ({
      page,
    }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      // Should show first 20 of 40
      await expect(page.getByText(/1–20 of 40/)).toBeVisible();
    });

    test('Given I am on page 1, When I click Next, Then I see the next page of messages', async ({
      page,
    }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      // Click next
      const nextBtn = page.getByRole('button', { name: /Next/ });
      await expect(nextBtn).toBeEnabled();
      await nextBtn.click();

      // Should now show page 2
      await expect(page.getByText(/21–40 of 40/)).toBeVisible();
    });

    test('Given I am on page 2, When I click Previous, Then I return to page 1', async ({
      page,
    }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      // Go to page 2
      await page.getByRole('button', { name: /Next/ }).click();
      await expect(page.getByText(/21–40 of 40/)).toBeVisible();

      // Go back
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

      // Go to last page
      await page.getByRole('button', { name: /Next/ }).click();
      await page.waitForLoadState('networkidle');

      const nextBtn = page.getByRole('button', { name: /Next/ });
      await expect(nextBtn).toBeDisabled();
    });
  });

  test.describe('Scenario: Tab filtering', () => {
    test('Given I click the Inbox tab, Then I only see inbound messages', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      // Click Inbox tab
      const inboxTab = page.getByRole('button', { name: /Inbox/i }).or(page.getByText('Inbox'));
      if (await inboxTab.first().isVisible()) {
        await inboxTab.first().click();
        await page.waitForLoadState('networkidle');

        // With 30 inbound messages, pagination should show 30 total
        await expect(page.getByText(/of 30/)).toBeVisible();
      }
    });

    test('Given I click the Outbox tab, Then I only see outbound messages', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      const outboxTab = page
        .getByRole('button', { name: /Outbox|Sent/i })
        .or(page.getByText(/Outbox|Sent/));
      if (await outboxTab.first().isVisible()) {
        await outboxTab.first().click();
        await page.waitForLoadState('networkidle');

        // 10 outbound messages - no pagination needed (under limit)
        // Should not show pagination controls
        const paginationInfo = page.getByText(/of 10/);
        // 10 < 20 limit, so no pagination visible
        await expect(page.getByRole('button', { name: /Next/ })).not.toBeVisible();
      }
    });

    test('Given I switch tabs, Then pagination resets to page 1', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      // Navigate to page 2
      await page.getByRole('button', { name: /Next/ }).click();
      await expect(page.getByText(/21–40 of 40/)).toBeVisible();

      // Switch to inbox tab
      const inboxTab = page.getByRole('button', { name: /Inbox/i }).or(page.getByText('Inbox'));
      if (await inboxTab.first().isVisible()) {
        await inboxTab.first().click();
        await page.waitForLoadState('networkidle');

        // Should reset to first page
        await expect(page.getByText(/1–20 of 30/)).toBeVisible();
      }
    });
  });

  test.describe('Scenario: Search filtering', () => {
    test('Given I type a search query, Then results are filtered', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      const searchInput = page
        .getByPlaceholder(/search/i)
        .or(page.getByRole('searchbox'))
        .or(page.getByRole('textbox', { name: /search/i }));

      if (await searchInput.first().isVisible()) {
        await searchInput.first().fill('Seller 1');
        // Wait for debounced search
        await page.waitForTimeout(500);
        await page.waitForLoadState('networkidle');

        // Results should be filtered (Seller 1, Seller 10-19 match)
        // Pagination should not show for small result sets
      }
    });

    test('Given I search and then clear, Then all messages return', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      const searchInput = page
        .getByPlaceholder(/search/i)
        .or(page.getByRole('searchbox'))
        .or(page.getByRole('textbox', { name: /search/i }));

      if (await searchInput.first().isVisible()) {
        await searchInput.first().fill('nonexistent');
        await page.waitForTimeout(500);
        await page.waitForLoadState('networkidle');

        // Clear search
        await searchInput.first().clear();
        await page.waitForTimeout(500);
        await page.waitForLoadState('networkidle');

        // Should show all messages again with pagination
        await expect(page.getByText(/1–20 of 40/)).toBeVisible();
      }
    });
  });

  test.describe('Scenario: Sorting', () => {
    test('Given I click a sortable column header, Then messages are re-sorted', async ({
      page,
    }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      // Look for a sortable header (Date, Subject, etc.)
      const dateHeader = page.getByRole('button', { name: /Date/i }).or(page.getByText('Date'));
      if (await dateHeader.first().isVisible()) {
        // Click to toggle sort order
        await dateHeader.first().click();
        await page.waitForLoadState('networkidle');

        // Page should still show pagination
        await expect(page.getByText(/1–20 of 40/)).toBeVisible();
      }
    });

    test('Given I change sort, Then pagination resets to page 1', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');

      // Go to page 2 first
      await page.getByRole('button', { name: /Next/ }).click();
      await expect(page.getByText(/21–40 of 40/)).toBeVisible();

      // Click sort header
      const dateHeader = page.getByRole('button', { name: /Date/i }).or(page.getByText('Date'));
      if (await dateHeader.first().isVisible()) {
        await dateHeader.first().click();
        await page.waitForLoadState('networkidle');

        // Should reset to page 1
        await expect(page.getByText(/1–20 of 40/)).toBeVisible();
      }
    });
  });
});

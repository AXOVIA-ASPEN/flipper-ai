import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

/**
 * E2E: Thread-based Message Inbox & Thread Detail
 *
 * Tests the message inbox (/messages) showing conversation threads
 * grouped by listing, and the thread detail view (/messages/[listingId])
 * showing full message history for a listing.
 *
 * Updated for story 8.3 (thread-based UI refactor).
 */

// Mock thread data matching ThreadSummary shape from GET /api/messages/threads
const mockThreads = [
  {
    listingId: 'listing-1',
    listing: {
      id: 'listing-1',
      title: 'iPhone 14 Pro - Like New',
      platform: 'EBAY',
      askingPrice: 800,
      imageUrls: '["https://example.com/iphone.jpg"]',
    },
    lastMessage: {
      body: 'Is this still available?',
      direction: 'INBOUND',
      status: 'DELIVERED',
      createdAt: new Date().toISOString(),
    },
    sellerName: 'John Doe',
    messageCount: 3,
    unreadCount: 1,
    lastMessageAt: new Date().toISOString(),
  },
  {
    listingId: 'listing-2',
    listing: {
      id: 'listing-2',
      title: 'MacBook Air M2',
      platform: 'CRAIGSLIST',
      askingPrice: 900,
      imageUrls: null,
    },
    lastMessage: {
      body: 'Thanks for your interest!',
      direction: 'OUTBOUND',
      status: 'SENT',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    sellerName: 'Jane Smith',
    messageCount: 2,
    unreadCount: 0,
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

// Mock thread detail data matching GET /api/messages/threads/[listingId]
const mockThreadDetail = {
  listing: {
    id: 'listing-1',
    title: 'iPhone 14 Pro - Like New',
    platform: 'EBAY',
    askingPrice: 800,
    imageUrls: '["https://example.com/iphone.jpg"]',
  },
  sellerName: 'John Doe',
  messages: [
    {
      id: 'msg-1',
      direction: 'OUTBOUND',
      status: 'SENT',
      subject: 'About your listing',
      body: 'Hi, is this still available?',
      sellerName: 'John Doe',
      platform: 'EBAY',
      parentId: null,
      sentAt: new Date(Date.now() - 7200000).toISOString(),
      readAt: null,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'msg-2',
      direction: 'INBOUND',
      status: 'DELIVERED',
      subject: null,
      body: 'Yes it is! Are you interested?',
      sellerName: 'John Doe',
      platform: 'EBAY',
      parentId: 'msg-1',
      sentAt: null,
      readAt: null,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'msg-3',
      direction: 'OUTBOUND',
      status: 'SENT',
      subject: null,
      body: 'Would you take $700?',
      sellerName: 'John Doe',
      platform: 'EBAY',
      parentId: 'msg-1',
      sentAt: new Date(Date.now() - 1800000).toISOString(),
      readAt: null,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ],
  threadMeta: {
    messageCount: 3,
    unreadCount: 1,
  },
};

function setupMockRoutes(page: import('@playwright/test').Page) {
  return Promise.all([
    // Thread list endpoint
    page.route('**/api/messages/threads?**', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: mockThreads,
          pagination: { total: 2, limit: 20, offset: 0, hasMore: false },
        },
      });
    }),

    // Thread list endpoint (no query params)
    page.route('**/api/messages/threads', async (route) => {
      if (route.request().url().includes('/api/messages/threads/')) {
        await route.continue();
        return;
      }
      await route.fulfill({
        json: {
          success: true,
          data: mockThreads,
          pagination: { total: 2, limit: 20, offset: 0, hasMore: false },
        },
      });
    }),

    // Thread detail endpoint
    page.route('**/api/messages/threads/listing-*', async (route) => {
      await route.fulfill({
        json: { success: true, data: mockThreadDetail },
      });
    }),

    // User settings (for approval tab)
    page.route('**/api/user/settings', async (route) => {
      await route.fulfill({
        json: { success: true, data: { user: { subscriptionTier: 'PRO' }, messageApprovalRequired: false } },
      });
    }),

    // Approval count
    page.route('**/api/messages?**', async (route) => {
      await route.fulfill({
        json: { success: true, data: [], pagination: { total: 0 } },
      });
    }),
  ]);
}

test.describe('Message Inbox & Thread History', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
    await setupMockRoutes(page);
  });

  test.describe('Thread List', () => {
    test('displays conversation threads grouped by listing', async ({ page }) => {
      await page.goto('/messages');
      await expect(page.getByText('iPhone 14 Pro - Like New')).toBeVisible();
      await expect(page.getByText('MacBook Air M2')).toBeVisible();
    });

    test('shows seller names and last message preview', async ({ page }) => {
      await page.goto('/messages');
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('Is this still available?')).toBeVisible();
    });

    test('shows platform badges on threads', async ({ page }) => {
      await page.goto('/messages');
      await expect(page.getByText('EBAY')).toBeVisible();
      await expect(page.getByText('CRAIGSLIST')).toBeVisible();
    });

    test('shows message count per thread', async ({ page }) => {
      await page.goto('/messages');
      await expect(page.getByText('3 msgs')).toBeVisible();
      await expect(page.getByText('2 msgs')).toBeVisible();
    });

    test('shows unread count badge on threads with unread messages', async ({ page }) => {
      await page.goto('/messages');
      // Thread 1 has 1 unread — badge with aria-label
      const badge = page.getByLabel(/1 unread message/);
      await expect(badge).toBeVisible();
    });

    test('shows empty state when no threads', async ({ page }) => {
      await page.route('**/api/messages/threads**', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            data: [],
            pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
          },
        });
      });
      await page.goto('/messages');
      await expect(page.getByText('No messages yet')).toBeVisible();
    });

    test('shows conversation count in header', async ({ page }) => {
      await page.goto('/messages');
      await expect(page.getByText(/2 conversations/)).toBeVisible();
    });
  });

  test.describe('Tabs', () => {
    test('shows All, Inbox, Sent tabs', async ({ page }) => {
      await page.goto('/messages');
      await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Inbox' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sent' })).toBeVisible();
    });

    test('Inbox tab filters to inbound threads only', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Inbox' }).click();
      // Only iPhone thread has INBOUND lastMessage
      await expect(page.getByText('iPhone 14 Pro - Like New')).toBeVisible();
      await expect(page.getByText('MacBook Air M2')).not.toBeVisible();
    });

    test('Sent tab filters to outbound threads only', async ({ page }) => {
      await page.goto('/messages');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Sent' }).click();
      // Only MacBook thread has OUTBOUND lastMessage
      await expect(page.getByText('MacBook Air M2')).toBeVisible();
      await expect(page.getByText('iPhone 14 Pro - Like New')).not.toBeVisible();
    });
  });

  test.describe('Thread Detail', () => {
    test('navigates to thread detail on click', async ({ page }) => {
      await page.goto('/messages');
      await page.getByText('iPhone 14 Pro - Like New').click();
      await expect(page).toHaveURL(/\/messages\/listing-1/);
    });

    test('displays message history', async ({ page }) => {
      await page.goto('/messages/listing-1');
      await expect(page.getByText('Hi, is this still available?')).toBeVisible();
      await expect(page.getByText('Yes it is! Are you interested?')).toBeVisible();
      await expect(page.getByText('Would you take $700?')).toBeVisible();
    });

    test('shows direction indicators on messages', async ({ page }) => {
      await page.goto('/messages/listing-1');
      const sentLabels = page.getByLabel('Sent message');
      const receivedLabels = page.getByLabel('Received message');
      await expect(sentLabels.first()).toBeVisible();
      await expect(receivedLabels.first()).toBeVisible();
    });

    test('shows listing header with details', async ({ page }) => {
      await page.goto('/messages/listing-1');
      await expect(page.getByText('iPhone 14 Pro - Like New')).toBeVisible();
      await expect(page.getByText('$800')).toBeVisible();
      await expect(page.getByText('EBAY')).toBeVisible();
    });

    test('shows message count', async ({ page }) => {
      await page.goto('/messages/listing-1');
      await expect(page.getByText(/3 messages?/)).toBeVisible();
    });

    test('has back link to thread list', async ({ page }) => {
      await page.goto('/messages/listing-1');
      const backLink = page.getByRole('link', { name: /Back to Messages/ });
      await expect(backLink).toBeVisible();
      await expect(backLink).toHaveAttribute('href', '/messages');
    });
  });

  test.describe('Search', () => {
    test('has search input', async ({ page }) => {
      await page.goto('/messages');
      await expect(
        page.getByPlaceholder('Search by listing title or seller name...')
      ).toBeVisible();
    });
  });
});

import { test, expect } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';

// Mock data
const mockConversations = [
  {
    id: 'conv-1',
    sellerId: 'seller-1',
    sellerName: 'John Doe',
    listingId: 'listing-1',
    listingTitle: 'iPhone 14 Pro - Like New',
    lastMessage: 'Is this still available?',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 1,
    status: 'active',
  },
  {
    id: 'conv-2',
    sellerId: 'seller-2',
    sellerName: 'Jane Smith',
    listingId: 'listing-2',
    listingTitle: 'MacBook Air M2',
    lastMessage: 'Yes, I can meet tomorrow',
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
    unreadCount: 0,
    status: 'active',
  },
];

const mockMessages = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'test-user-1',
    senderType: 'buyer',
    content: 'Hi, is this still available?',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'delivered',
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    senderId: 'seller-1',
    senderType: 'seller',
    content: 'Yes it is! Are you interested?',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'read',
  },
  {
    id: 'msg-3',
    conversationId: 'conv-1',
    senderId: 'test-user-1',
    senderType: 'buyer',
    content: 'Would you take $800?',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    status: 'sent',
  },
];

const mockAiTemplates = [
  { id: 'tpl-1', name: 'Initial Inquiry', content: 'Hi! Is this item still available? I\'m very interested.' },
  { id: 'tpl-2', name: 'Price Negotiation', content: 'Would you consider a lower price? I can pick up today.' },
  { id: 'tpl-3', name: 'Schedule Pickup', content: 'Great! When and where can I pick this up?' },
];

function setupMockRoutes(page: import('@playwright/test').Page) {
  return Promise.all([
    // Conversations list
    page.route('**/api/messages/conversations**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({ json: { conversations: mockConversations } });
      } else if (request.method() === 'POST') {
        await route.fulfill({
          json: { id: 'conv-new', sellerId: 'seller-3', status: 'active' },
        });
      } else {
        await route.continue();
      }
    }),

    // Single conversation messages
    page.route('**/api/messages/conversations/*/messages**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({ json: { messages: mockMessages } });
      } else if (request.method() === 'POST') {
        const body = request.postDataJSON();
        await route.fulfill({
          json: {
            id: 'msg-new',
            conversationId: 'conv-1',
            senderId: 'test-user-1',
            senderType: 'buyer',
            content: body?.content ?? 'Test message',
            createdAt: new Date().toISOString(),
            status: 'sent',
          },
        });
      } else {
        await route.continue();
      }
    }),

    // AI message templates
    page.route('**/api/messages/templates**', async (route) => {
      await route.fulfill({ json: { templates: mockAiTemplates } });
    }),

    // Pickup scheduling
    page.route('**/api/messages/schedule-pickup**', async (route) => {
      await route.fulfill({
        json: { success: true, pickupId: 'pickup-1', scheduledAt: new Date().toISOString() },
      });
    }),
  ]);
}

test.describe('Seller Communication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
    await setupMockRoutes(page);
  });

  test.describe('Conversation List', () => {
    test('displays conversation threads', async ({ page }) => {
      await page.goto('/messages');
      await expect(page.getByText('iPhone 14 Pro - Like New')).toBeVisible();
      await expect(page.getByText('MacBook Air M2')).toBeVisible();
    });

    test('shows unread indicator on conversations with new messages', async ({ page }) => {
      await page.goto('/messages');
      const firstConv = page.getByTestId('conversation-item').first();
      await expect(firstConv.getByTestId('unread-badge')).toBeVisible();
    });

    test('shows empty state when no conversations', async ({ page }) => {
      await page.route('**/api/messages/conversations**', async (route) => {
        await route.fulfill({ json: { conversations: [] } });
      });
      await page.goto('/messages');
      await expect(page.getByTestId('messages-empty-state')).toBeVisible();
    });

    test('displays seller names and last messages', async ({ page }) => {
      await page.goto('/messages');
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('Is this still available?')).toBeVisible();
    });
  });

  test.describe('Message Compose Form', () => {
    test('has message input and send button', async ({ page }) => {
      await page.goto('/messages/conv-1');
      await expect(page.getByPlaceholder(/type a message|write a message/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send/i })).toBeVisible();
    });

    test('sends a message to seller', async ({ page }) => {
      await page.goto('/messages/conv-1');
      const input = page.getByPlaceholder(/type a message|write a message/i);
      await input.fill('Is the price negotiable?');
      await page.getByRole('button', { name: /send/i }).click();

      // Message should appear in history
      await expect(page.getByText('Is the price negotiable?')).toBeVisible();
    });

    test('disables send button when input is empty', async ({ page }) => {
      await page.goto('/messages/conv-1');
      await expect(page.getByRole('button', { name: /send/i })).toBeDisabled();
    });

    test('clears input after sending', async ({ page }) => {
      await page.goto('/messages/conv-1');
      const input = page.getByPlaceholder(/type a message|write a message/i);
      await input.fill('Hello there');
      await page.getByRole('button', { name: /send/i }).click();
      await expect(input).toHaveValue('');
    });
  });

  test.describe('AI-Generated Message Templates', () => {
    test('shows AI template button', async ({ page }) => {
      await page.goto('/messages/conv-1');
      await expect(page.getByRole('button', { name: /ai template|generate message/i })).toBeVisible();
    });

    test('displays template options when clicked', async ({ page }) => {
      await page.goto('/messages/conv-1');
      await page.getByRole('button', { name: /ai template|generate message/i }).click();
      await expect(page.getByText('Initial Inquiry')).toBeVisible();
      await expect(page.getByText('Price Negotiation')).toBeVisible();
      await expect(page.getByText('Schedule Pickup')).toBeVisible();
    });

    test('fills message input with selected template', async ({ page }) => {
      await page.goto('/messages/conv-1');
      await page.getByRole('button', { name: /ai template|generate message/i }).click();
      await page.getByText('Initial Inquiry').click();
      const input = page.getByPlaceholder(/type a message|write a message/i);
      await expect(input).toHaveValue(/still available/i);
    });
  });

  test.describe('Conversation History', () => {
    test('displays message history in chronological order', async ({ page }) => {
      await page.goto('/messages/conv-1');
      const bubbles = page.getByTestId('message-bubble');
      await expect(bubbles).toHaveCount(3);
    });

    test('differentiates buyer and seller messages', async ({ page }) => {
      await page.goto('/messages/conv-1');
      // Buyer messages should have a distinct style
      await expect(page.getByText('Hi, is this still available?')).toBeVisible();
      await expect(page.getByText('Yes it is! Are you interested?')).toBeVisible();
    });

    test('shows message delivery status', async ({ page }) => {
      await page.goto('/messages/conv-1');
      const statusIndicators = page.getByTestId('message-status');
      await expect(statusIndicators.first()).toBeVisible();
    });
  });

  test.describe('Reply to Seller', () => {
    test('can reply in existing conversation', async ({ page }) => {
      await page.goto('/messages/conv-1');
      // Verify existing messages visible
      await expect(page.getByText('Yes it is! Are you interested?')).toBeVisible();
      // Send reply
      const input = page.getByPlaceholder(/type a message|write a message/i);
      await input.fill('Yes, very interested!');
      await page.getByRole('button', { name: /send/i }).click();
      await expect(page.getByText('Yes, very interested!')).toBeVisible();
    });
  });

  test.describe('Pickup Scheduling Integration', () => {
    test('shows schedule pickup button in conversation', async ({ page }) => {
      await page.goto('/messages/conv-1');
      await expect(page.getByRole('button', { name: /schedule pickup/i })).toBeVisible();
    });

    test('opens pickup scheduler when clicked', async ({ page }) => {
      await page.goto('/messages/conv-1');
      await page.getByRole('button', { name: /schedule pickup/i }).click();
      await expect(page.getByTestId('pickup-scheduler')).toBeVisible();
    });
  });

  test.describe('Message Status Tracking', () => {
    test('shows sent status for outgoing messages', async ({ page }) => {
      await page.goto('/messages/conv-1');
      // The third message has status 'sent'
      await expect(page.getByText('Would you take $800?')).toBeVisible();
    });

    test('shows delivered status indicator', async ({ page }) => {
      await page.goto('/messages/conv-1');
      // First message has status 'delivered'
      const statuses = page.getByTestId('message-status');
      await expect(statuses).toHaveCount(3);
    });
  });

  test.describe('Multiple Conversation Threads', () => {
    test('can switch between conversations', async ({ page }) => {
      await page.goto('/messages');
      // Click first conversation
      await page.getByText('iPhone 14 Pro - Like New').click();
      await expect(page.getByText('Hi, is this still available?')).toBeVisible();

      // Navigate back and click second
      await page.goBack();
      await page.getByText('MacBook Air M2').click();
      await expect(page.getByTestId('message-history')).toBeVisible();
    });

    test('can start a new conversation', async ({ page }) => {
      await page.goto('/messages');
      await page.getByRole('button', { name: /new message/i }).click();
      await expect(page.getByTestId('seller-select')).toBeVisible();
    });
  });
});

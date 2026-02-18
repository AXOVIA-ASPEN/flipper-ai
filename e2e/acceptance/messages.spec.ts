import { test, expect } from '@playwright/test';

/**
 * Messages - Acceptance Tests
 * 
 * Critical user flow: Communicating with sellers
 * - View conversations
 * - Read messages
 * - Send messages
 * - Use AI templates
 * - Track conversation status
 */

// Mock data
const mockConversations = [
  {
    id: 'conv-1',
    sellerId: 'seller-1',
    sellerName: 'John Doe',
    listingId: 'listing-1',
    listingTitle: 'iPhone 14 Pro - Like New',
    listingPrice: 899,
    lastMessage: 'Is this still available?',
    lastMessageAt: new Date().toISOString(),
    unreadCount: 2,
    status: 'active',
  },
  {
    id: 'conv-2',
    sellerId: 'seller-2',
    sellerName: 'Jane Smith',
    listingId: 'listing-2',
    listingTitle: 'MacBook Air M2',
    listingPrice: 1099,
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
  {
    id: 'tpl-1',
    name: 'Initial Inquiry',
    content: "Hi! Is this item still available? I'm very interested.",
  },
  {
    id: 'tpl-2',
    name: 'Price Negotiation',
    content: 'Would you consider a lower price? I can pick up today.',
  },
  {
    id: 'tpl-3',
    name: 'Schedule Pickup',
    content: 'Great! When and where can I pick this up?',
  },
];

test.describe('Messages - Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated session
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: 'test-user-1',
            name: 'Test User',
            email: 'test@example.com',
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        },
      });
    });

    // Mock conversations API
    await page.route('**/api/messages/conversations**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({ json: { conversations: mockConversations } });
      } else if (request.method() === 'POST') {
        await route.fulfill({
          json: { id: 'conv-new', sellerId: 'seller-3', status: 'active' },
        });
      } else {
        await route.continue();
      }
    });

    // Mock messages API
    await page.route('**/api/messages/conversations/*/messages**', async (route, request) => {
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
            content: body.content,
            createdAt: new Date().toISOString(),
            status: 'sent',
          },
        });
      } else {
        await route.continue();
      }
    });

    // Mock AI templates API
    await page.route('**/api/messages/ai-templates**', async (route) => {
      await route.fulfill({ json: { templates: mockAiTemplates } });
    });

    // Mock mark as read API
    await page.route('**/api/messages/conversations/*/mark-read', async (route) => {
      await route.fulfill({ json: { success: true } });
    });

    await page.goto('/messages');
  });

  test.describe('Given user is on messages page', () => {
    test('Then should display conversations list', async ({ page }) => {
      // Should show page title
      await expect(page.getByRole('heading', { name: /messages/i })).toBeVisible();

      // Should show conversations
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('Jane Smith')).toBeVisible();
    });

    test('Then should display conversation details', async ({ page }) => {
      // Should show listing titles
      await expect(page.getByText('iPhone 14 Pro - Like New')).toBeVisible();
      await expect(page.getByText('MacBook Air M2')).toBeVisible();

      // Should show last message
      await expect(page.getByText('Is this still available?')).toBeVisible();
    });

    test('Then should display unread message badge', async ({ page }) => {
      // Should show unread count
      const unreadBadge = page.getByText('2');
      await expect(unreadBadge).toBeVisible();
    });

    test('Then should show empty state when no conversations', async ({ page }) => {
      // Mock empty conversations
      await page.route('**/api/messages/conversations**', async (route) => {
        await route.fulfill({ json: { conversations: [] } });
      });

      await page.reload();

      // Should show empty state
      await expect(page.getByText(/no conversations yet/i)).toBeVisible();
    });
  });

  test.describe('When user selects a conversation', () => {
    test('Then should display conversation messages', async ({ page }) => {
      // Click on first conversation
      await page.getByText('iPhone 14 Pro - Like New').click();

      // Should show messages
      await expect(page.getByText('Hi, is this still available?')).toBeVisible();
      await expect(page.getByText('Yes it is! Are you interested?')).toBeVisible();
      await expect(page.getByText('Would you take $800?')).toBeVisible();
    });

    test('Then should display seller info', async ({ page }) => {
      // Click on first conversation
      await page.getByText('iPhone 14 Pro - Like New').click();

      // Should show seller name
      await expect(page.getByText('John Doe')).toBeVisible();
    });

    test('Then should mark messages as read', async ({ page }) => {
      let markReadCalled = false;

      await page.route('**/api/messages/conversations/*/mark-read', async (route) => {
        markReadCalled = true;
        await route.fulfill({ json: { success: true } });
      });

      // Click on conversation with unread messages
      await page.getByText('iPhone 14 Pro - Like New').click();

      // Wait a bit for mark-read API call
      await page.waitForTimeout(500);

      // Should have called mark-read API
      expect(markReadCalled).toBe(true);
    });
  });

  test.describe('When user sends a message', () => {
    test.beforeEach(async ({ page }) => {
      // Open conversation
      await page.getByText('iPhone 14 Pro - Like New').click();
    });

    test('Then should send message successfully', async ({ page }) => {
      const messageInput = page.getByPlaceholder(/type a message/i);
      const sendButton = page.getByRole('button', { name: /send/i });

      // Type message
      await messageInput.fill('Hello, can we meet today?');

      // Send message
      await sendButton.click();

      // Should clear input after sending
      await expect(messageInput).toHaveValue('');
    });

    test('Then should disable send button when input is empty', async ({ page }) => {
      const sendButton = page.getByRole('button', { name: /send/i });

      // Send button should be disabled when empty
      await expect(sendButton).toBeDisabled();
    });

    test('Then should enable send button when input has text', async ({ page }) => {
      const messageInput = page.getByPlaceholder(/type a message/i);
      const sendButton = page.getByRole('button', { name: /send/i });

      // Type message
      await messageInput.fill('Hello');

      // Send button should be enabled
      await expect(sendButton).toBeEnabled();
    });

    test('Then should handle send errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/messages/conversations/*/messages', async (route, request) => {
        if (request.method() === 'POST') {
          await route.fulfill({
            status: 500,
            json: { error: 'Failed to send message' },
          });
        } else {
          await route.continue();
        }
      });

      const messageInput = page.getByPlaceholder(/type a message/i);
      const sendButton = page.getByRole('button', { name: /send/i });

      // Type and send message
      await messageInput.fill('Test message');
      await sendButton.click();

      // Should show error message
      await expect(page.getByText(/failed to send/i)).toBeVisible();
    });

    test('Then should allow sending with Enter key', async ({ page }) => {
      const messageInput = page.getByPlaceholder(/type a message/i);

      // Type message
      await messageInput.fill('Quick message');

      // Press Enter
      await messageInput.press('Enter');

      // Should clear input after sending
      await expect(messageInput).toHaveValue('');
    });
  });

  test.describe('When user uses AI templates', () => {
    test.beforeEach(async ({ page }) => {
      // Open conversation
      await page.getByText('iPhone 14 Pro - Like New').click();
    });

    test('Then should display AI template button', async ({ page }) => {
      // Should show AI template button/icon
      const aiButton = page.getByRole('button', { name: /ai template/i }).or(
        page.getByRole('button', { name: /template/i })
      );
      await expect(aiButton).toBeVisible();
    });

    test('Then should display template options when clicked', async ({ page }) => {
      // Click AI template button
      const aiButton = page.getByRole('button', { name: /ai template/i }).or(
        page.getByRole('button', { name: /template/i })
      );
      await aiButton.click();

      // Should show template options
      await expect(page.getByText('Initial Inquiry')).toBeVisible();
      await expect(page.getByText('Price Negotiation')).toBeVisible();
      await expect(page.getByText('Schedule Pickup')).toBeVisible();
    });

    test('Then should populate message input when template selected', async ({ page }) => {
      const messageInput = page.getByPlaceholder(/type a message/i);

      // Click AI template button
      const aiButton = page.getByRole('button', { name: /ai template/i }).or(
        page.getByRole('button', { name: /template/i })
      );
      await aiButton.click();

      // Select a template
      await page.getByText('Price Negotiation').click();

      // Should populate input with template content
      await expect(messageInput).toHaveValue('Would you consider a lower price? I can pick up today.');
    });

    test('Then should allow editing template before sending', async ({ page }) => {
      const messageInput = page.getByPlaceholder(/type a message/i);

      // Use template
      const aiButton = page.getByRole('button', { name: /ai template/i }).or(
        page.getByRole('button', { name: /template/i })
      );
      await aiButton.click();
      await page.getByText('Initial Inquiry').click();

      // Edit the template text
      await messageInput.fill("Hi! Is this item still available? I'm very interested. Can you do $750?");

      // Should have edited text
      await expect(messageInput).toHaveValue(/Can you do \$750/);
    });
  });

  test.describe('Responsive Design', () => {
    test('Then should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Should show conversations list
      await expect(page.getByText('John Doe')).toBeVisible();

      // On mobile, clicking conversation might navigate differently
      await page.getByText('iPhone 14 Pro - Like New').click();

      // Should show messages
      await expect(page.getByText('Hi, is this still available?')).toBeVisible();
    });

    test('Then should show mobile-friendly message input', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Open conversation
      await page.getByText('iPhone 14 Pro - Like New').click();

      // Message input should be visible and usable
      const messageInput = page.getByPlaceholder(/type a message/i);
      await expect(messageInput).toBeVisible();

      await messageInput.fill('Mobile test message');
      await expect(messageInput).toHaveValue('Mobile test message');
    });
  });

  test.describe('Accessibility', () => {
    test('Then should have proper ARIA labels', async ({ page }) => {
      // Check for accessible conversation list
      const conversationList = page.getByRole('list').or(page.getByRole('region', { name: /conversations/i }));
      await expect(conversationList).toBeVisible();
    });

    test('Then should support keyboard navigation', async ({ page }) => {
      // Tab through conversations
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to select conversation with Enter
      await page.keyboard.press('Enter');

      // Should show messages
      await expect(page.getByText('Hi, is this still available?')).toBeVisible();
    });

    test('Then should have focus indicators', async ({ page }) => {
      // Tab to conversation
      await page.keyboard.press('Tab');

      // Check for focus styles (usually outline or border)
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('Then should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/messages/conversations**', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Server error' },
        });
      });

      await page.reload();

      // Should show error message
      await expect(page.getByText(/error loading conversations/i).or(
        page.getByText(/something went wrong/i)
      )).toBeVisible();
    });

    test('Then should handle network errors', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/messages/conversations**', async (route) => {
        await route.abort('failed');
      });

      await page.reload();

      // Should show error or retry option
      await expect(page.getByText(/error/i).or(
        page.getByText(/retry/i)
      )).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('Then should load conversations quickly', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/messages');
      await page.waitForSelector('text=John Doe');

      const loadTime = Date.now() - startTime;

      // Should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('Then should not have console errors', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/messages');
      await page.getByText('iPhone 14 Pro - Like New').click();

      // Should not have console errors
      expect(consoleErrors).toEqual([]);
    });
  });
});
